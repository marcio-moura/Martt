import { useEffect, useState } from 'react'
import { Editar, Modal, Responsaveis } from '../components/ui'
import { useApp } from '../lib/app'
import { rotuloSemana, somarDias } from '../lib/datas'
import { itemDoModelo, porHorario } from '../lib/semana'
import type { ModeloDemanda, ModeloDia } from '../lib/types'
import { FormDemanda } from './FormDemanda'

interface ItemGerado {
  m: ModeloDemanda
  incluir: boolean
  horario: string
  titulo: string
}

/** Pré-visualiza a semana-modelo, permite ajustar e cria as demandas de uma vez. */
export function GerarSemana({ segundaInicial, onFechar }: { segundaInicial: string; onFechar: (segunda?: string) => void }) {
  const { base, backend, executar } = useApp()
  const [segunda, setSegunda] = useState(segundaInicial)
  const [existentes, setExistentes] = useState<number | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [itens, setItens] = useState<ItemGerado[]>(() =>
    [...base.modelo_demandas]
      .sort((a, b) => a.dia - b.dia || porHorario(a, b))
      .map((m) => ({ m, incluir: true, horario: m.horario ?? '', titulo: m.titulo })),
  )

  useEffect(() => {
    let vivo = true
    setExistentes(null)
    backend.carregarDemandas(segunda, somarDias(segunda, 6)).then((l) => vivo && setExistentes(l.length), () => vivo && setExistentes(0))
    return () => {
      vivo = false
    }
  }, [backend, segunda])

  const muda = (i: number, patch: Partial<ItemGerado>) => setItens((l) => l.map((x, j) => (j === i ? { ...x, ...patch } : x)))
  const escolhidos = itens.filter((i) => i.incluir && i.titulo.trim())

  async function confirmar() {
    setSalvando(true)
    const payload = escolhidos.map((i) => ({ ...itemDoModelo(i.m, segunda), horario: i.horario || null, titulo: i.titulo.trim() }))
    const n = await executar(() => backend.gerarSemana(payload), `${escolhidos.length} demandas criadas`)
    setSalvando(false)
    if (n !== undefined) onFechar(segunda)
  }

  return (
    <Modal titulo="Gerar a semana" sub="Ajuste o que precisar antes de confirmar. Depois tudo continua editável na Semana." onFechar={() => onFechar()} largo>
      <div className="weeknav">
        <span className="label">Semana de {rotuloSemana(segunda)}</span>
        <span className="arrows">
          <button type="button" className="arrow" aria-label="Semana anterior" onClick={() => setSegunda(somarDias(segunda, -7))} />
          <button type="button" className="arrow next" aria-label="Próxima semana" onClick={() => setSegunda(somarDias(segunda, 7))} />
        </span>
      </div>
      {!!existentes && (
        <p className="banner" style={{ marginTop: 10 }}>
          Esta semana já tem {existentes} {existentes === 1 ? 'demanda' : 'demandas'}. As do modelo serão adicionadas às que já existem.
        </p>
      )}

      {base.modelo_dias.map((d) => {
        const doDia = itens.map((x, i) => ({ x, i })).filter(({ x }) => x.m.dia === d.dia)
        if (!doDia.length) return null
        return (
          <div className="gen-day" key={d.dia}>
            <h3>{d.nome} · {d.funcao}</h3>
            {doDia.map(({ x, i }) => (
              <div className="gen-item" key={x.m.id} data-off={!x.incluir}>
                <input type="checkbox" checked={x.incluir} onChange={(e) => muda(i, { incluir: e.target.checked })} aria-label={`Incluir: ${x.titulo}`} />
                <input className="input" type="time" value={x.horario} onChange={(e) => muda(i, { horario: e.target.value })} aria-label="Horário" />
                <input className="input gen-title" value={x.titulo} onChange={(e) => muda(i, { titulo: e.target.value })} aria-label="Título" />
                <div className="rcs">
                  <Responsaveis lista={x.m.papeis.map((papel_id) => ({ papel_id, pessoa_id: null }))} />
                  {x.m.clientes.length > 0 && (
                    <span className="det" style={{ margin: 0 }}>
                      {x.m.clientes.map((id) => base.clientes.find((c) => c.id === id)?.nome).filter(Boolean).join(', ')}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      })}

      <div className="form-foot">
        <span className="det">{escolhidos.length} de {itens.length} selecionadas</span>
        <div className="end">
          <button type="button" className="btn ghost" onClick={() => onFechar()}>Cancelar</button>
          <button type="button" className="btn primary" disabled={salvando || !escolhidos.length || existentes === null} onClick={confirmar}>
            Criar demandas
          </button>
        </div>
      </div>
    </Modal>
  )
}

/** Edita a semana-modelo: função de cada dia e as demandas-padrão. */
export function ModeloSemana({ onFechar }: { onFechar: () => void }) {
  const { base, backend, executar } = useApp()
  const [editando, setEditando] = useState<{ item?: ModeloDemanda; dia: number } | null>(null)
  const [funcoes, setFuncoes] = useState(() => Object.fromEntries(base.modelo_dias.map((d) => [d.dia, d.funcao])))

  if (editando) {
    return <FormDemanda modo="modelo" item={editando.item} dia={editando.dia} onFechar={() => setEditando(null)} />
  }

  const salvarFuncao = (d: ModeloDia) => {
    if (funcoes[d.dia] === d.funcao) return
    void executar(() => backend.salvar('modelo_dias', { ...d, funcao: funcoes[d.dia].trim() }, false), 'Função do dia salva')
  }

  return (
    <Modal titulo="Modelo de semana" sub="A semana-padrão usada para gerar as próximas. Mudanças aqui não alteram semanas já geradas." onFechar={onFechar} largo>
      {base.modelo_dias.map((d) => (
        <div className="gen-day" key={d.dia}>
          <h3>{d.nome}</h3>
          <label className="field" style={{ marginTop: 10 }}>
            <span>Função do dia</span>
            <input value={funcoes[d.dia] ?? ''} onChange={(e) => setFuncoes((f) => ({ ...f, [d.dia]: e.target.value }))} onBlur={() => salvarFuncao(d)} />
          </label>
          <ul className="plain">
            {base.modelo_demandas
              .filter((m) => m.dia === d.dia)
              .sort(porHorario)
              .map((m) => (
                <li key={m.id}>
                  <span>
                    <b style={{ fontVariantNumeric: 'tabular-nums' }}>{m.horario ?? '--:--'}</b> {m.titulo}
                  </span>
                  <Editar onClick={() => setEditando({ item: m, dia: d.dia })} />
                </li>
              ))}
          </ul>
          <button type="button" className="btn small ghost" style={{ marginTop: 6 }} onClick={() => setEditando({ dia: d.dia })}>
            Adicionar item
          </button>
        </div>
      ))}
      <div className="form-foot">
        <div className="end">
          <button type="button" className="btn primary" onClick={onFechar}>Pronto</button>
        </div>
      </div>
    </Modal>
  )
}
