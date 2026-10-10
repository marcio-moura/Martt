import { useState, type FormEvent } from 'react'
import { Editar, Modal, Rodape, Texto } from '../components/ui'
import { novoId } from '../lib/backend'
import { useApp } from '../lib/app'
import type { Regra, Ritual } from '../lib/types'
import { FormRegra, ListaRegras, useRegras } from './Regras'

function FormRitual({ ritual, onFechar }: { ritual?: Ritual; onFechar: () => void }) {
  const { base, backend, executar } = useApp()
  const [r, setR] = useState<Ritual>(
    ritual ?? { id: novoId(), nome: '', quando: '', duracao: '', participantes: '', saida: '', ordem: base.rituais.length },
  )
  const [salvando, setSalvando] = useState(false)
  const set = (k: keyof Ritual) => (v: string) => setR((x) => ({ ...x, [k]: v }))

  async function salvar(e: FormEvent) {
    e.preventDefault()
    if (!r.nome.trim()) return
    setSalvando(true)
    const ok = await executar(() => backend.salvar('rituais', { ...r, nome: r.nome.trim() }, !ritual).then(() => true), 'Ritual salvo')
    setSalvando(false)
    if (ok) onFechar()
  }
  async function excluir() {
    if (!window.confirm(`Excluir o ritual ${ritual!.nome}?`)) return
    const ok = await executar(() => backend.excluir('rituais', ritual!.id).then(() => true), 'Ritual excluído')
    if (ok) onFechar()
  }

  return (
    <Modal titulo={ritual ? `Editar ${ritual.nome}` : 'Novo ritual'} onFechar={onFechar}>
      <form className="form" onSubmit={salvar}>
        <Texto rotulo="Nome" valor={r.nome} onChange={set('nome')} obrigatorio />
        <div className="cols">
          <Texto rotulo="Quando" valor={r.quando} onChange={set('quando')} placeholder="Segunda, 08:30" />
          <Texto rotulo="Duração" valor={r.duracao} onChange={set('duracao')} placeholder="45 min" />
        </div>
        <Texto rotulo="Quem participa" valor={r.participantes} onChange={set('participantes')} placeholder="Todos" />
        <Texto rotulo="Saída esperada" valor={r.saida} onChange={set('saida')} longo />
        <Rodape onCancelar={onFechar} onExcluir={ritual ? excluir : undefined} salvando={salvando} />
      </form>
    </Modal>
  )
}

export function Rituais() {
  const { base, ehDirecao } = useApp()
  const [aberto, setAberto] = useState<Ritual | 'novo' | null>(null)
  const [padrao, setPadrao] = useState<Regra | 'novo' | null>(null)
  const padroes = useRegras('padroes')

  return (
    <section className="panel" aria-labelledby="t-rituais">
      <p className="eyebrow">Ritmo e comunicação</p>
      <h2 id="t-rituais">Rituais do time</h2>
      <p className="lead">Poucas reuniões, curtas e com saída definida.</p>

      <div style={{ marginTop: 14 }}>
        {[...base.rituais].sort((a, b) => a.ordem - b.ordem).map((r) => (
          <div className="rit" key={r.id}>
            <h3>
              {r.nome}
              {ehDirecao && <Editar onClick={() => setAberto(r)} />}
            </h3>
            <span className="when">{[r.quando, r.duracao, r.participantes].filter(Boolean).join(' · ')}</span>
            <p>{r.saida}</p>
          </div>
        ))}
      </div>
      {ehDirecao && (
        <div className="actions">
          <button type="button" className="btn small ghost" onClick={() => setAberto('novo')}>Novo ritual</button>
        </div>
      )}

      <div className="block two">
        <div className="card">
          <h3>Comunicação</h3>
          <ListaRegras grupo="comunicacao" />
        </div>
        <div className="card">
          <h3>Padrões de arquivo</h3>
          <div style={{ marginTop: 8 }}>
            {padroes.map((p) => (
              <div className="pattern" key={p.id}>
                <p style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span>{p.texto}</span>
                  {ehDirecao && <Editar onClick={() => setPadrao(p)} />}
                </p>
                {p.detalhe && <p><code>{p.detalhe}</code></p>}
              </div>
            ))}
          </div>
          {ehDirecao && (
            <button type="button" className="btn small ghost" style={{ marginTop: 8 }} onClick={() => setPadrao('novo')}>Adicionar</button>
          )}
        </div>
      </div>

      {aberto && <FormRitual ritual={aberto === 'novo' ? undefined : aberto} onFechar={() => setAberto(null)} />}
      {padrao && (
        <FormRegra grupo="padroes" regra={padrao === 'novo' ? undefined : padrao} comDetalhe="Exemplo" onFechar={() => setPadrao(null)} />
      )}
    </section>
  )
}
