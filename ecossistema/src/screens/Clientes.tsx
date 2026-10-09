import { useEffect, useState, type FormEvent } from 'react'
import { Modal, Rodape, Texto } from '../components/ui'
import { novoId } from '../lib/backend'
import { useApp } from '../lib/app'
import { diaMes } from '../lib/datas'
import { FICHA, FICHA_VAZIA } from '../lib/ficha'
import type { Cliente, Demanda } from '../lib/types'
import { FormDemanda } from './FormDemanda'

function FormCliente({ cliente, onFechar }: { cliente?: Cliente; onFechar: (id?: string) => void }) {
  const { backend, executar } = useApp()
  const [c, setC] = useState<Cliente>(cliente ?? { id: novoId(), nome: '', ativo: true, ...FICHA_VAZIA })
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  async function salvar(e: FormEvent) {
    e.preventDefault()
    if (!c.nome.trim()) return setErro('Informe o nome do cliente.')
    setSalvando(true)
    const limpo = Object.fromEntries(Object.entries(c).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v])) as unknown as Cliente
    const ok = await executar(() => backend.salvar('clientes', limpo, !cliente).then(() => true), cliente ? 'Ficha salva' : 'Cliente criado')
    setSalvando(false)
    if (ok) onFechar(c.id)
  }
  async function excluir() {
    if (!window.confirm(`Excluir ${cliente!.nome}? As demandas continuam, só perdem o vínculo. Para guardar o histórico, prefira arquivar.`)) return
    const ok = await executar(() => backend.excluir('clientes', cliente!.id).then(() => true), 'Cliente excluído')
    if (ok) onFechar('')
  }

  return (
    <Modal titulo={cliente ? `Ficha de ${cliente.nome}` : 'Novo cliente'} sub="Os exemplos em cinza mostram o que preencher." onFechar={() => onFechar()} largo>
      <form className="form" onSubmit={salvar} noValidate>
        {FICHA.map((g) => (
          <div className="form-group" key={g.grupo}>
            <h3>{g.grupo}</h3>
            <div className="form" style={{ marginTop: 8 }}>
              {g.campos.map((f) => (
                <Texto
                  key={f.key}
                  rotulo={f.rotulo}
                  dica={f.dica}
                  placeholder={f.exemplo}
                  valor={c[f.key] as string}
                  onChange={(v) => setC((x) => ({ ...x, [f.key]: v }))}
                />
              ))}
            </div>
          </div>
        ))}
        {cliente && (
          <label className="field" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="checkbox" style={{ width: 20, height: 20 }} checked={c.ativo} onChange={(e) => setC({ ...c, ativo: e.target.checked })} />
            <span>Conta ativa (desmarque para arquivar)</span>
          </label>
        )}
        {erro && <p className="err" role="alert">{erro}</p>}
        <Rodape onCancelar={() => onFechar()} onExcluir={cliente ? excluir : undefined} salvando={salvando} />
      </form>
    </Modal>
  )
}

function Ficha({ cliente, onVoltar }: { cliente: Cliente; onVoltar: () => void }) {
  const { backend, versao, ehDirecao, podeCriarDemanda, base } = useApp()
  const [editar, setEditar] = useState(false)
  const [nova, setNova] = useState(false)
  const [demandas, setDemandas] = useState<Demanda[] | null>(null)

  useEffect(() => {
    let vivo = true
    backend.carregarDemandasDoCliente(cliente.id).then((l) => vivo && setDemandas(l), () => vivo && setDemandas([]))
    return () => {
      vivo = false
    }
  }, [backend, cliente.id, versao])

  return (
    <>
      <button type="button" className="back" onClick={onVoltar}>Clientes</button>
      <div className="head-row">
        <div>
          <p className="eyebrow">Ficha de cliente{!cliente.ativo && ' · arquivado'}</p>
          <h2>{cliente.nome}</h2>
          {cliente.segmento && <p className="lead">{cliente.segmento}</p>}
        </div>
        <div className="tools">
          {podeCriarDemanda && <button type="button" className="btn ghost" onClick={() => setNova(true)}>Nova demanda</button>}
          {ehDirecao && <button type="button" className="btn" onClick={() => setEditar(true)}>Editar ficha</button>}
        </div>
      </div>

      {FICHA.map((g) => (
        <div className="group" key={g.grupo}>
          <h3>{g.grupo}</h3>
          {g.campos
            .filter((f) => f.key !== 'nome')
            .map((f) => {
              const v = cliente[f.key] as string
              return (
                <div className="row" key={f.key}>
                  <b>{f.rotulo}</b>
                  <span className="hint">{f.dica}</span>
                  <span className={v ? 'val' : 'val vazio'}>{v || 'A preencher'}</span>
                </div>
              )
            })}
        </div>
      ))}

      <div className="block">
        <h3>Demandas ligadas</h3>
        {demandas === null ? (
          <p className="empty">Carregando…</p>
        ) : !demandas.length ? (
          <p className="empty">Nenhuma demanda ligada a este cliente ainda.</p>
        ) : (
          <ul className="linked">
            {demandas.slice(0, 30).map((d) => (
              <li key={d.id} data-done={!!d.concluida_em}>
                <span className="when">{diaMes(d.data)}{d.horario ? ` · ${d.horario}` : ''}</span>
                <span className="t">
                  {d.titulo}
                  {d.local && <span className="det"> · {d.local}</span>}
                  {d.responsaveis.length > 0 && (
                    <span className="det">
                      {' · '}
                      {base.papeis.filter((p) => d.responsaveis.some((r) => r.papel_id === p.id)).map((p) => p.nome).join(', ')}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {editar && <FormCliente cliente={cliente} onFechar={(id) => { setEditar(false); if (id === '') onVoltar() }} />}
      {nova && <FormDemanda modo="demanda" preset={{ clientes: [cliente.id] }} onFechar={() => setNova(false)} />}
    </>
  )
}

function ModeloFicha() {
  return (
    <>
      {FICHA.map((g) => (
        <div className="group" key={g.grupo}>
          <h3>{g.grupo}</h3>
          {g.campos.map((f) => (
            <div className="row" key={f.key}>
              <b>{f.rotulo}</b>
              <span className="hint">{f.dica}</span>
              <span className="ex">{f.exemplo}</span>
            </div>
          ))}
        </div>
      ))}
    </>
  )
}

export function Clientes() {
  const { base, ehDirecao } = useApp()
  const [aberto, setAberto] = useState<string | null>(null)
  const [novo, setNovo] = useState(false)
  const [verModelo, setVerModelo] = useState(false)
  const [arquivados, setArquivados] = useState(false)

  const cliente = base.clientes.find((c) => c.id === aberto)
  if (cliente) {
    return (
      <section className="panel">
        <Ficha cliente={cliente} onVoltar={() => setAberto(null)} />
      </section>
    )
  }

  const lista = base.clientes.filter((c) => arquivados || c.ativo).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  const temArquivados = base.clientes.some((c) => !c.ativo)

  return (
    <section className="panel" aria-labelledby="t-clientes">
      <p className="eyebrow">Ficha de cliente</p>
      <div className="head-row">
        <h2 id="t-clientes">Uma ficha por cliente</h2>
        {ehDirecao && <button type="button" className="btn primary" onClick={() => setNovo(true)}>Novo cliente</button>}
      </div>
      <p className="lead">Toda a conta cabe em uma página. Quem assume um cliente lê a ficha e já tem o contexto.</p>

      <div className="clients">
        {lista.map((c) => (
          <button key={c.id} type="button" className="client" data-off={!c.ativo} onClick={() => setAberto(c.id)}>
            <b>{c.nome}{!c.ativo && <span className="badge" style={{ marginLeft: 8 }}>arquivado</span>}</b>
            <span className="go" />
            <span className="info">{[c.segmento, c.objetivo_mes && `Objetivo: ${c.objetivo_mes}`].filter(Boolean).join(' · ') || 'Ficha a preencher'}</span>
          </button>
        ))}
        {!lista.length && <p className="empty">Nenhum cliente cadastrado.</p>}
      </div>
      <div className="foot-note">
        <button type="button" className="linkbtn" onClick={() => setVerModelo(!verModelo)}>
          {verModelo ? 'Esconder o modelo da ficha' : 'Ver o modelo da ficha em branco'}
        </button>
        {temArquivados && (
          <button type="button" className="linkbtn" onClick={() => setArquivados(!arquivados)}>
            {arquivados ? 'Esconder arquivados' : 'Mostrar arquivados'}
          </button>
        )}
      </div>
      {verModelo && (
        <div className="block">
          <p className="lead">O texto em verde é um exemplo fictício.</p>
          <ModeloFicha />
        </div>
      )}

      {novo && (
        <FormCliente
          onFechar={(id) => {
            setNovo(false)
            if (id) setAberto(id)
          }}
        />
      )}
    </section>
  )
}
