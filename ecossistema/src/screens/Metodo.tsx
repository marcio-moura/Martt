import { useState, type FormEvent } from 'react'
import { Chip, Editar, Modal, Rodape, Texto, corPapel } from '../components/ui'
import { useApp } from '../lib/app'
import { ESTADOS, type Etapa } from '../lib/types'
import { ListaRegras } from './Regras'

function FormEtapa({ etapa, onFechar }: { etapa?: Etapa; onFechar: () => void }) {
  const { base, backend, executar } = useApp()
  const proximo = Math.max(0, ...base.etapas.map((e) => e.id)) + 1
  const [e, setE] = useState<Etapa>(etapa ?? { id: proximo, ordem: proximo, nome: '', descricao: '', responsaveis: [], quando: '', pronto_quando: '' })
  const [salvando, setSalvando] = useState(false)
  const set = (k: keyof Etapa) => (v: string) => setE((x) => ({ ...x, [k]: v }))

  async function salvar(ev: FormEvent) {
    ev.preventDefault()
    if (!e.nome.trim()) return
    setSalvando(true)
    const ok = await executar(() => backend.salvar('etapas', { ...e, nome: e.nome.trim() }, !etapa).then(() => true), 'Etapa salva')
    setSalvando(false)
    if (ok) onFechar()
  }
  async function excluir() {
    if (!window.confirm(`Excluir a etapa ${etapa!.nome}?`)) return
    const ok = await executar(() => backend.excluir('etapas', etapa!.id).then(() => true), 'Etapa excluída')
    if (ok) onFechar()
  }

  return (
    <Modal titulo={etapa ? `Editar ${etapa.nome}` : 'Nova etapa'} onFechar={onFechar}>
      <form className="form" onSubmit={salvar}>
        <div className="cols">
          <Texto rotulo="Nome" valor={e.nome} onChange={set('nome')} obrigatorio />
          <Texto rotulo="Ordem" tipo="number" valor={String(e.ordem)} onChange={(v) => setE({ ...e, ordem: Number(v) || 0 })} />
        </div>
        <Texto rotulo="Descrição" valor={e.descricao} onChange={set('descricao')} longo />
        <fieldset className="field">
          <legend>Responsável</legend>
          <div className="seg">
            {base.papeis.map((p) => (
              <Chip
                key={p.id}
                className="rcor"
                style={corPapel(p)}
                ativo={e.responsaveis.includes(p.id)}
                onClick={() =>
                  setE({ ...e, responsaveis: e.responsaveis.includes(p.id) ? e.responsaveis.filter((x) => x !== p.id) : [...e.responsaveis, p.id] })
                }
              >
                <i />
                {p.nome}
              </Chip>
            ))}
          </div>
        </fieldset>
        <Texto rotulo="Na semana" valor={e.quando} onChange={set('quando')} placeholder="Segunda e terça" />
        <Texto rotulo="Pronto quando" valor={e.pronto_quando} onChange={set('pronto_quando')} longo />
        <Rodape onCancelar={onFechar} onExcluir={etapa ? excluir : undefined} salvando={salvando} />
      </form>
    </Modal>
  )
}

export function Metodo() {
  const { base, ehDirecao } = useApp()
  const [aberta, setAberta] = useState<Etapa | 'nova' | null>(null)
  const etapas = [...base.etapas].sort((a, b) => a.ordem - b.ordem)
  const nomes = (ids: string[]) =>
    base.papeis.filter((p) => ids.includes(p.id)).map((p) => p.nome).join(' e ') || 'A definir'

  return (
    <section className="panel" aria-labelledby="t-metodo">
      <p className="eyebrow">Fluxo de demanda</p>
      <h2 id="t-metodo">O Método Martt</h2>
      <p className="lead">Da ideia à análise. É o caminho de toda demanda em qualquer conta. O que muda de cliente para cliente é o objetivo, o público e a frequência.</p>

      <ol className="flow">
        {etapas.map((m) => (
          <li key={m.id}>
            <div>
              <h3>
                {m.nome}
                {ehDirecao && <Editar onClick={() => setAberta(m)} />}
              </h3>
              <p className="desc">{m.descricao}</p>
              <div className="facts">
                <div><span>Responsável</span><b>{nomes(m.responsaveis)}</b></div>
                <div><span>Na semana</span><b>{m.quando}</b></div>
                <div><span>Pronto quando</span><b>{m.pronto_quando}</b></div>
              </div>
            </div>
          </li>
        ))}
      </ol>
      {ehDirecao && (
        <div className="actions" style={{ marginBottom: 14 }}>
          <button type="button" className="btn small ghost" onClick={() => setAberta('nova')}>Nova etapa</button>
        </div>
      )}
      <p className="loop">A análise alimenta a ideação do ciclo seguinte.</p>

      <div className="block">
        <h3>Estados de cada demanda</h3>
        <div className="status">
          {ESTADOS.map((s) => <span key={s.id}>{s.nome}</span>)}
        </div>
        <ListaRegras grupo="metodo" classe="rules" />
      </div>

      <div className="block two">
        <div className="card">
          <h3>O cliente</h3>
          <ListaRegras grupo="cliente" />
        </div>
        <div className="card">
          <h3>A Martt</h3>
          <ListaRegras grupo="martt" />
        </div>
      </div>

      {aberta && <FormEtapa etapa={aberta === 'nova' ? undefined : aberta} onFechar={() => setAberta(null)} />}
    </section>
  )
}
