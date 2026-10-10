import { useMemo, useRef, useState } from 'react'
import { Chip, Responsaveis, corPapel } from '../components/ui'
import { regraConcluida } from '../lib/backend'
import { useApp, useDemandas } from '../lib/app'
import { deIso, diaDaSemana, hoje, rotuloSemana, segundaDe, somarDias } from '../lib/datas'
import { porHorario, temPapel, textoOrdemDoDia } from '../lib/semana'
import { ESTADOS, type Demanda } from '../lib/types'
import { FormDemanda } from './FormDemanda'
import { GerarSemana, ModeloSemana } from './Modelo'

type Filtro = 'todos' | 'minhas' | string
type Aberto = { tipo: 'nova' } | { tipo: 'editar'; d: Demanda } | { tipo: 'gerar' } | { tipo: 'modelo' } | null

export function Semana() {
  const app = useApp()
  const { base, eu, backend, executar, podeEditarDemanda, podeCriarDemanda, ehDirecao } = app
  const hojeIso = hoje()
  const [segunda, setSegunda] = useState(segundaDe(hojeIso))
  const [dia, setDia] = useState(diaDaSemana(hojeIso))
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [aberto, setAberto] = useState<Aberto>(null)
  const [copiado, setCopiado] = useState<'' | 'ok' | 'manual'>('')
  const [textoManual, setTextoManual] = useState('')
  const fallback = useRef<HTMLTextAreaElement>(null)
  const { lista, setLista } = useDemandas(segunda, somarDias(segunda, 6))

  const dataDia = somarDias(segunda, dia - 1)
  const modeloDia = base.modelo_dias.find((d) => d.dia === dia)
  const ehHoje = dataDia === hojeIso

  const doDia = useMemo(
    () =>
      (lista ?? [])
        .filter((d) => d.data === dataDia)
        .filter((d) => {
          if (filtro === 'todos') return true
          if (filtro === 'minhas')
            return d.responsaveis.some((r) => r.pessoa_id === eu.id || (!!eu.papel_id && r.papel_id === eu.papel_id))
          return temPapel(d, filtro, base.pessoas)
        })
        .sort(porHorario),
    [lista, dataDia, filtro, eu, base.pessoas],
  )
  const concluidas = doDia.filter((d) => d.concluida_em).length

  function mudarSemana(n: number) {
    setSegunda(somarDias(segunda, 7 * n))
    setCopiado('')
  }
  function irParaHoje() {
    setSegunda(segundaDe(hojeIso))
    setDia(diaDaSemana(hojeIso))
  }

  async function marcar(d: Demanda) {
    const patch = regraConcluida(d, !d.concluida_em)
    setLista((l) => l && l.map((x) => (x.id === d.id ? { ...x, ...patch } : x)))
    await executar(() => backend.marcarConcluida(d.id, patch))
  }

  function copiar() {
    const texto = textoOrdemDoDia(
      { nome: modeloDia?.nome ?? '', funcao: modeloDia?.funcao ?? '' },
      doDia,
      base,
    )
    const manual = () => {
      setTextoManual(texto)
      setCopiado('manual')
      setTimeout(() => fallback.current?.select(), 30)
    }
    try {
      navigator.clipboard.writeText(texto).then(() => {
        setCopiado('ok')
        setTimeout(() => setCopiado((c) => (c === 'ok' ? '' : c)), 1800)
      }, manual)
    } catch {
      manual()
    }
  }

  const semanaVazia = lista !== null && lista.length === 0

  return (
    <section className="panel" aria-labelledby="t-semana">
      <p className="eyebrow">Ordem do dia</p>
      <h2 id="t-semana">A semana da Martt</h2>
      <p className="lead">Cada dia tem uma função fixa. Quem entra no time abre esta aba e sabe o que fazer, onde e com quem.</p>

      <div className="weeknav">
        <span className="label">Semana de {rotuloSemana(segunda)}</span>
        <span className="arrows">
          {segunda !== segundaDe(hojeIso) && (
            <button type="button" className="btn small ghost" onClick={irParaHoje}>Hoje</button>
          )}
          <button type="button" className="arrow" aria-label="Semana anterior" onClick={() => mudarSemana(-1)} />
          <button type="button" className="arrow next" aria-label="Próxima semana" onClick={() => mudarSemana(1)} />
        </span>
      </div>

      <div className="days" role="group" aria-label="Dia da semana">
        {base.modelo_dias.map((d) => {
          const iso = somarDias(segunda, d.dia - 1)
          const eHoje = iso === hojeIso
          return (
            <button
              key={d.dia}
              type="button"
              className="day"
              aria-pressed={d.dia === dia}
              aria-label={`${d.nome}, ${deIso(iso).getDate()}${eHoje ? ' (hoje)' : ''}`}
              onClick={() => {
                setDia(d.dia)
                setCopiado('')
              }}
            >
              {d.sigla}
              <small>{deIso(iso).getDate()}</small>
              {eHoje && <span className="dot" />}
            </button>
          )
        })}
      </div>

      <div className="filters" role="group" aria-label="Filtrar por papel">
        <Chip ativo={filtro === 'todos'} onClick={() => setFiltro('todos')}>Todos</Chip>
        {eu.nivel !== 'leitura' && (
          <Chip ativo={filtro === 'minhas'} onClick={() => setFiltro('minhas')}>Minhas</Chip>
        )}
        {base.papeis.map((p) => (
          <Chip key={p.id} className="rcor" style={corPapel(p)} ativo={filtro === p.id} onClick={() => setFiltro(p.id)}>
            <i />
            {p.nome}
          </Chip>
        ))}
      </div>

      <div className="dayhead">
        <div>
          <h3>
            {[modeloDia?.nome, modeloDia?.funcao].filter(Boolean).join(' · ')}
            {ehHoje && ' (hoje)'}
          </h3>
          <p className="meta">
            {doDia.length} {doDia.length === 1 ? 'demanda' : 'demandas'} · {concluidas} {concluidas === 1 ? 'concluída' : 'concluídas'}
          </p>
        </div>
        <div className="btns">
          {podeCriarDemanda && (
            <button type="button" className="btn ghost" onClick={() => setAberto({ tipo: 'nova' })}>Nova demanda</button>
          )}
          <button type="button" className="btn" onClick={copiar} disabled={!doDia.length}>
            {copiado === 'ok' ? 'Copiado' : copiado === 'manual' ? 'Selecione e copie abaixo' : 'Copiar para o grupo'}
          </button>
        </div>
      </div>

      {lista === null ? (
        <p className="empty">Carregando…</p>
      ) : semanaVazia ? (
        <div className="empty">
          <p>Esta semana ainda está vazia.</p>
          {ehDirecao ? (
            <button type="button" className="btn accent" onClick={() => setAberto({ tipo: 'gerar' })}>Gerar a semana a partir do modelo</button>
          ) : (
            <p>A Direção gera a semana a partir do modelo.</p>
          )}
        </div>
      ) : (
        <ul className="sheet">
          {!doDia.length && <li className="empty">{filtro === 'todos' ? 'Sem demandas neste dia.' : 'Sem demandas deste filtro neste dia.'}</li>}
          {doDia.map((d) => {
            const pode = podeEditarDemanda(d)
            const det = [
              d.clientes.map((id) => base.clientes.find((c) => c.id === id)?.nome).filter(Boolean).join(', '),
              d.local,
            ].filter(Boolean)
            return (
              <li key={d.id} className="task" data-done={!!d.concluida_em}>
                <span className="time">{d.horario ?? '--:--'}</span>
                <button type="button" className="task-body" disabled={!pode} onClick={() => setAberto({ tipo: 'editar', d })} aria-label={pode ? `Editar: ${d.titulo}` : undefined}>
                  <div className="what">{d.titulo}</div>
                  {det.length > 0 && <div className="det">{det.join(' · ')}</div>}
                  <div className="rcs">
                    <Responsaveis lista={d.responsaveis} />
                    {d.tipo === 'conteudo' && <span className="badge">{ESTADOS.find((s) => s.id === d.estado)?.nome}</span>}
                  </div>
                </button>
                <button
                  type="button"
                  className="ck"
                  disabled={!pode}
                  aria-pressed={!!d.concluida_em}
                  aria-label={`Marcar como concluída: ${d.titulo}`}
                  onClick={() => marcar(d)}
                />
              </li>
            )
          })}
        </ul>
      )}

      {copiado === 'manual' && (
        <textarea ref={fallback} className="fallback" readOnly value={textoManual} aria-label="Texto da ordem do dia" />
      )}

      <div className="foot-note">
        <span>As marcações ficam salvas para todo o time.</span>
        {ehDirecao && !semanaVazia && (
          <button type="button" className="linkbtn" onClick={() => setAberto({ tipo: 'gerar' })}>Gerar a partir do modelo</button>
        )}
        {ehDirecao && (
          <button type="button" className="linkbtn" onClick={() => setAberto({ tipo: 'modelo' })}>Editar modelo de semana</button>
        )}
      </div>

      {aberto?.tipo === 'nova' && (
        <FormDemanda modo="demanda" preset={{ data: dataDia }} onFechar={() => setAberto(null)} />
      )}
      {aberto?.tipo === 'editar' && <FormDemanda modo="demanda" demanda={aberto.d} onFechar={() => setAberto(null)} />}
      {aberto?.tipo === 'gerar' && (
        <GerarSemana
          segundaInicial={segunda}
          onFechar={(nova) => {
            setAberto(null)
            if (nova) setSegunda(nova)
          }}
        />
      )}
      {aberto?.tipo === 'modelo' && <ModeloSemana onFechar={() => setAberto(null)} />}
    </section>
  )
}
