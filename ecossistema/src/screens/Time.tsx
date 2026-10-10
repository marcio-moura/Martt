import { useState, type FormEvent } from 'react'
import { Campo, Editar, Modal, Rodape, Texto, corPapel } from '../components/ui'
import { novoId } from '../lib/backend'
import { useApp } from '../lib/app'
import { NIVEIS, type Nivel, type Papel, type Pessoa } from '../lib/types'
import { ListaRegras } from './Regras'

const slug = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'papel'

function FormPapel({ papel, onFechar }: { papel?: Papel; onFechar: () => void }) {
  const { base, backend, executar } = useApp()
  const [p, setP] = useState<Papel>(
    papel ?? { id: '', nome: '', sigla: '', cor: '#8D8B82', cor_escura: '#A3A198', missao: '', entrega: '', recebe_de: '', passa_para: '', metrica: '', ordem: base.papeis.length },
  )
  const [salvando, setSalvando] = useState(false)
  const set = (k: keyof Papel) => (v: string) => setP((x) => ({ ...x, [k]: v }))

  async function salvar(e: FormEvent) {
    e.preventDefault()
    if (!p.nome.trim()) return
    setSalvando(true)
    let id = p.id
    if (!papel) {
      id = slug(p.nome)
      while (base.papeis.some((x) => x.id === id)) id += '-2'
    }
    const ok = await executar(() => backend.salvar('papeis', { ...p, id, nome: p.nome.trim() }, !papel).then(() => true), 'Papel salvo')
    setSalvando(false)
    if (ok) onFechar()
  }
  async function excluir() {
    if (!window.confirm(`Excluir o papel ${papel!.nome}? Ele sai das demandas e do modelo.`)) return
    const ok = await executar(() => backend.excluir('papeis', papel!.id).then(() => true), 'Papel excluído')
    if (ok) onFechar()
  }

  return (
    <Modal titulo={papel ? `Editar ${papel.nome}` : 'Novo papel'} onFechar={onFechar}>
      <form className="form" onSubmit={salvar}>
        <div className="cols">
          <Texto rotulo="Nome" valor={p.nome} onChange={set('nome')} obrigatorio />
          <Texto rotulo="Sigla" valor={p.sigla} onChange={set('sigla')} placeholder="SOC" />
        </div>
        <div className="cols">
          <Texto rotulo="Cor (tema claro)" tipo="color" valor={p.cor} onChange={set('cor')} />
          <Texto rotulo="Cor (tema escuro)" tipo="color" valor={p.cor_escura} onChange={set('cor_escura')} />
        </div>
        <Texto rotulo="Missão" valor={p.missao} onChange={set('missao')} longo />
        <Texto rotulo="Entrega" valor={p.entrega} onChange={set('entrega')} longo />
        <Texto rotulo="Recebe de" valor={p.recebe_de} onChange={set('recebe_de')} longo />
        <Texto rotulo="Passa para" valor={p.passa_para} onChange={set('passa_para')} longo />
        <Texto rotulo="Como mede" valor={p.metrica} onChange={set('metrica')} longo />
        <Rodape onCancelar={onFechar} onExcluir={papel ? excluir : undefined} salvando={salvando} />
      </form>
    </Modal>
  )
}

function FormPessoa({ pessoa, onFechar }: { pessoa?: Pessoa; onFechar: () => void }) {
  const { base, backend, executar, eu } = useApp()
  const [p, setP] = useState<Pessoa>(pessoa ?? { id: novoId(), user_id: null, nome: '', email: '', papel_id: base.papeis[0]?.id ?? null, nivel: 'time', ativo: true })
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const souEu = pessoa?.id === eu.id

  async function salvar(e: FormEvent) {
    e.preventDefault()
    setErro('')
    if (!p.nome.trim()) return setErro('Informe o nome.')
    const email = (p.email ?? '').trim().toLowerCase()
    if (email && !/^\S+@\S+\.\S+$/.test(email)) return setErro('E-mail inválido.')
    if (email && base.pessoas.some((x) => x.id !== p.id && x.email?.toLowerCase() === email)) return setErro('Já existe alguém com este e-mail.')
    setSalvando(true)
    const ok = await executar(
      () => backend.salvar('pessoas', { ...p, nome: p.nome.trim(), email: email || null }, !pessoa).then(() => true),
      'Pessoa salva',
    )
    setSalvando(false)
    if (ok) onFechar()
  }
  async function excluir() {
    if (!window.confirm(`Excluir ${pessoa!.nome}? Para só tirar o acesso, desmarque "Ativo".`)) return
    const ok = await executar(() => backend.excluir('pessoas', pessoa!.id).then(() => true), 'Pessoa excluída')
    if (ok) onFechar()
  }

  return (
    <Modal titulo={pessoa ? `Editar ${pessoa.nome}` : 'Nova pessoa'} sub="A pessoa cria a conta com este e-mail e entra já com o acesso definido aqui." onFechar={onFechar}>
      <form className="form" onSubmit={salvar} noValidate>
        <Texto rotulo="Nome" valor={p.nome} onChange={(v) => setP({ ...p, nome: v })} obrigatorio />
        <Texto rotulo="E-mail de login" tipo="email" valor={p.email ?? ''} onChange={(v) => setP({ ...p, email: v })} />
        <div className="cols">
          <Campo rotulo="Papel principal">
            <select value={p.papel_id ?? ''} onChange={(e) => setP({ ...p, papel_id: e.target.value || null })}>
              <option value="">Nenhum</option>
              {base.papeis.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
            </select>
          </Campo>
          <Campo rotulo="Nível de acesso" dica={NIVEIS.find((n) => n.id === p.nivel)?.descricao}>
            <select value={p.nivel} disabled={souEu} onChange={(e) => setP({ ...p, nivel: e.target.value as Nivel })}>
              {NIVEIS.map((n) => <option key={n.id} value={n.id}>{n.nome}</option>)}
            </select>
          </Campo>
        </div>
        <label className="field" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="checkbox" style={{ width: 20, height: 20 }} checked={p.ativo} disabled={souEu} onChange={(e) => setP({ ...p, ativo: e.target.checked })} />
          <span>Ativo (pode entrar no app)</span>
        </label>
        {erro && <p className="err" role="alert">{erro}</p>}
        <Rodape onCancelar={onFechar} onExcluir={pessoa && !souEu ? excluir : undefined} salvando={salvando} />
      </form>
    </Modal>
  )
}

export function Time() {
  const { base, ehDirecao, backend } = useApp()
  const [papel, setPapel] = useState<Papel | 'novo' | null>(null)
  const [pessoa, setPessoa] = useState<Pessoa | 'nova' | null>(null)

  return (
    <section className="panel" aria-labelledby="t-time">
      <p className="eyebrow">Papéis</p>
      <h2 id="t-time">Quem faz o quê</h2>
      <p className="lead">Cada papel com entrega clara, de quem recebe e para quem passa. Os papéis sem pessoa já estão desenhados para quando alguém entrar.</p>

      <div className="grid">
        {base.papeis.map((r) => {
          const nomes = base.pessoas.filter((p) => p.ativo && p.papel_id === r.id).map((p) => p.nome)
          return (
            <article key={r.id} className="card rcor" style={corPapel(r)}>
              <h3>
                <i />
                {r.nome}
                {ehDirecao && <span className="edit"><Editar onClick={() => setPapel(r)} /></span>}
              </h3>
              <p className="who">Responsável: {nomes.length ? nomes.join(', ') : 'a definir'}</p>
              <dl>
                <dt>Missão</dt><dd>{r.missao}</dd>
                <dt>Entrega</dt><dd>{r.entrega}</dd>
                <dt>Recebe de</dt><dd>{r.recebe_de}</dd>
                <dt>Passa para</dt><dd>{r.passa_para}</dd>
                <dt>Como mede</dt><dd>{r.metrica}</dd>
              </dl>
            </article>
          )
        })}
      </div>
      {ehDirecao && (
        <div className="actions">
          <button type="button" className="btn ghost" onClick={() => setPapel('novo')}>Novo papel</button>
        </div>
      )}

      <div className="block">
        <div className="block-head">
          <h3>Pessoas</h3>
          {ehDirecao && <button type="button" className="btn small ghost" onClick={() => setPessoa('nova')}>Adicionar pessoa</button>}
        </div>
        <div className="people">
          {base.pessoas.map((p) => {
            const pp = base.papeis.find((x) => x.id === p.papel_id)
            return (
              <div key={p.id} className="person">
                <div>
                  <b>{p.nome}</b>{' '}
                  {!p.ativo ? <span className="badge">inativo</span> : backend.modo === 'supabase' && !p.user_id ? <span className="badge">aguardando cadastro</span> : null}
                  <p className="info">
                    {[pp?.nome, NIVEIS.find((n) => n.id === p.nivel)?.nome, p.email].filter(Boolean).join(' · ')}
                  </p>
                </div>
                {ehDirecao && <Editar onClick={() => setPessoa(p)} />}
              </div>
            )
          })}
        </div>
      </div>

      <div className="block">
        <h3>Primeira semana de quem entra</h3>
        <ListaRegras grupo="primeira_semana" classe="steps" ordenada />
      </div>

      {papel && <FormPapel papel={papel === 'novo' ? undefined : papel} onFechar={() => setPapel(null)} />}
      {pessoa && <FormPessoa pessoa={pessoa === 'nova' ? undefined : pessoa} onFechar={() => setPessoa(null)} />}
    </section>
  )
}
