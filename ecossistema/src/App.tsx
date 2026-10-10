import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Ctx, regraEdicao, type AppCtx } from './lib/app'
import type { Backend, Usuario } from './lib/backend'
import type { Base } from './lib/types'
import { Clientes } from './screens/Clientes'
import { Metodo } from './screens/Metodo'
import { Rituais } from './screens/Rituais'
import { Semana } from './screens/Semana'
import { Time } from './screens/Time'

const ABAS = [
  { id: 'semana', nome: 'Semana', Tela: Semana },
  { id: 'time', nome: 'Time', Tela: Time },
  { id: 'metodo', nome: 'Método', Tela: Metodo },
  { id: 'clientes', nome: 'Clientes', Tela: Clientes },
  { id: 'rituais', nome: 'Rituais', Tela: Rituais },
] as const
type AbaId = (typeof ABAS)[number]['id']

type Tema = 'auto' | 'claro' | 'escuro'
const TEMAS: Record<Tema, string> = { auto: 'Tema automático', claro: 'Tema claro', escuro: 'Tema escuro' }

function useTema() {
  const [tema, setTema] = useState<Tema>(() => {
    try {
      return (localStorage.getItem('martt-tema') as Tema) || 'auto'
    } catch {
      return 'auto'
    }
  })
  useEffect(() => {
    const raiz = document.documentElement
    if (tema === 'auto') delete raiz.dataset.theme
    else raiz.dataset.theme = tema === 'escuro' ? 'dark' : 'light'
    try {
      localStorage.setItem('martt-tema', tema)
    } catch {
      /* ignora */
    }
  }, [tema])
  const proximo = () => setTema((t) => (t === 'auto' ? 'claro' : t === 'claro' ? 'escuro' : 'auto'))
  return { tema, proximo }
}

function abaDoHash(): AbaId {
  const h = location.hash.replace('#', '')
  return (ABAS.find((a) => a.id === h)?.id ?? 'semana') as AbaId
}

function Marca() {
  return (
    <div className="brand">
      <span className="wm">MARTT</span>
      <i className="tip" />
      <span className="sub">Ecossistema</span>
    </div>
  )
}

function Rodape() {
  return (
    <footer>
      <span>MARTT · direção antes de marketing</span>
      <span>Modelo inicial, ajuste à vontade</span>
    </footer>
  )
}

function Login({ backend }: { backend: Backend }) {
  const [modo, setModo] = useState<'entrar' | 'criar'>('entrar')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [msg, setMsg] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setErro('')
    setMsg('')
    setEnviando(true)
    try {
      if (modo === 'entrar') await backend.entrar(email.trim(), senha)
      else {
        const r = await backend.criarConta(email.trim(), senha)
        if (r.confirmarEmail) setMsg('Conta criada. Abra o link que enviamos para o seu e-mail e depois entre.')
      }
    } catch (err) {
      setErro((err as Error).message)
    }
    setEnviando(false)
  }

  return (
    <div className="center">
      <form className="login" onSubmit={enviar}>
        <Marca />
        <p className="slogan">Crescimento não é sorte. É estrutura.</p>
        <h2>{modo === 'entrar' ? 'Entrar' : 'Criar conta'}</h2>
        <div className="form">
          <label className="field">
            <span>E-mail</span>
            <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label className="field">
            <span>Senha</span>
            <input type="password" autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'} minLength={6} value={senha} onChange={(e) => setSenha(e.target.value)} required />
          </label>
          {erro && <p className="err" role="alert">{erro}</p>}
          {msg && <p className="banner">{msg}</p>}
          <button type="submit" className="btn primary" disabled={enviando}>{modo === 'entrar' ? 'Entrar' : 'Criar conta'}</button>
          <p className="det">
            {modo === 'entrar' ? 'Primeiro acesso? ' : 'Já tem conta? '}
            <button type="button" className="linkbtn" onClick={() => setModo(modo === 'entrar' ? 'criar' : 'entrar')}>
              {modo === 'entrar' ? 'Criar conta com o e-mail cadastrado pela Direção' : 'Entrar'}
            </button>
          </p>
        </div>
      </form>
    </div>
  )
}

function Avisos({ texto, erro }: { texto: string; erro: boolean }) {
  if (!texto) return null
  return (
    <div className={erro ? 'toast erro' : 'toast'} role="status" aria-live="polite">
      {texto}
    </div>
  )
}

export function App({ backend }: { backend: Backend }) {
  const { tema, proximo } = useTema()
  const [usuario, setUsuario] = useState<Usuario | null | undefined>(undefined)
  const [base, setBase] = useState<Base | null>(null)
  const [falha, setFalha] = useState('')
  const [versao, setVersao] = useState(0)
  const [aba, setAba] = useState<AbaId>(abaDoHash)
  const [toast, setToast] = useState({ texto: '', erro: false })
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const avisar = useCallback((texto: string, erro = false) => {
    clearTimeout(timer.current)
    setToast({ texto, erro })
    timer.current = setTimeout(() => setToast({ texto: '', erro: false }), erro ? 5000 : 2200)
  }, [])

  const recarregar = useCallback(async () => {
    try {
      setBase(await backend.carregarBase())
      setFalha('')
    } catch (e) {
      setFalha((e as Error).message)
    }
    setVersao((v) => v + 1)
  }, [backend])

  // login
  useEffect(() => {
    backend.usuarioAtual().then(setUsuario)
    return backend.aoMudarLogin((u) => setUsuario((atual) => (atual?.id === u?.id ? atual : u)))
  }, [backend])

  // dados + tempo real + atualização ao voltar para o app
  useEffect(() => {
    if (!usuario) {
      setBase(null)
      return
    }
    void recarregar()
    const parar = backend.escutar(() => void recarregar())
    const aoVoltar = () => document.visibilityState === 'visible' && void recarregar()
    document.addEventListener('visibilitychange', aoVoltar)
    return () => {
      parar()
      document.removeEventListener('visibilitychange', aoVoltar)
    }
  }, [usuario, backend, recarregar])

  useEffect(() => {
    const h = () => setAba(abaDoHash())
    window.addEventListener('hashchange', h)
    return () => window.removeEventListener('hashchange', h)
  }, [])

  const eu = base && usuario ? base.pessoas.find((p) => p.user_id === usuario.id && p.ativo) : undefined

  const ctx = useMemo<AppCtx | null>(() => {
    if (!base || !eu) return null
    return {
      backend,
      base,
      eu,
      versao,
      ehDirecao: eu.nivel === 'direcao',
      podeCriarDemanda: eu.nivel !== 'leitura',
      podeEditarDemanda: regraEdicao(eu),
      avisar,
      async executar(fn, ok) {
        try {
          const r = await fn()
          if (ok) avisar(ok)
          await recarregar()
          return r
        } catch (e) {
          avisar((e as Error).message || 'Algo deu errado. Tente de novo.', true)
          await recarregar()
          return undefined
        }
      },
    }
  }, [backend, base, eu, versao, avisar, recarregar])

  function irPara(id: AbaId) {
    setAba(id)
    try {
      history.replaceState(null, '', `#${id}`)
    } catch {
      /* ignora */
    }
    window.scrollTo(0, 0)
  }

  if (usuario === undefined) return <div className="center"><Marca /></div>
  if (usuario === null) return <Login backend={backend} />
  if (falha && !base) {
    return (
      <div className="center">
        <div className="login">
          <Marca />
          <p className="err" style={{ marginTop: 16 }}>Não foi possível carregar os dados: {falha}</p>
          <div className="actions"><button type="button" className="btn" onClick={() => void recarregar()}>Tentar de novo</button></div>
        </div>
      </div>
    )
  }
  if (!base) return <div className="center"><Marca /></div>
  if (!ctx) {
    return (
      <div className="center">
        <div className="login">
          <Marca />
          <h2 style={{ marginTop: 18 }}>Acesso ainda não liberado</h2>
          <p className="lead">Peça à Direção para cadastrar o e-mail <b>{usuario.email}</b> na aba Time. Depois disso, é só entrar de novo.</p>
          <div className="actions">
            <button type="button" className="btn" onClick={() => void recarregar()}>Já foi liberado</button>
            <button type="button" className="btn ghost" onClick={() => void backend.sair()}>Sair</button>
          </div>
        </div>
      </div>
    )
  }

  const Tela = ABAS.find((a) => a.id === aba)!.Tela
  const nivelNome = { direcao: 'Direção', time: 'Time', leitura: 'Leitura' }[ctx.eu.nivel]

  return (
    <Ctx.Provider value={ctx}>
      <div className="wrap">
        <header className="top">
          <Marca />
          <div className="tools">
            <span className="who-am-i">{ctx.eu.nome} · {nivelNome}</span>
            <button type="button" className="btn small ghost" onClick={proximo} title="Trocar tema">{TEMAS[tema]}</button>
            <button
              type="button"
              className="btn small ghost"
              onClick={() => {
                if (backend.modo === 'demo' && !window.confirm('Restaurar os dados de exemplo? O que foi editado nesta demonstração será apagado.')) return
                void backend.sair()
              }}
            >
              {backend.modo === 'demo' ? 'Restaurar exemplo' : 'Sair'}
            </button>
          </div>
        </header>
        <p className="slogan" style={{ marginTop: -8, marginBottom: 12 }}>Crescimento não é sorte. É estrutura.</p>
        {backend.modo === 'demo' && (
          <p className="banner">Modo demonstração: os dados ficam só neste navegador. Configure o Supabase para usar com o time (veja o README).</p>
        )}
      </div>

      <nav className="tabs" aria-label="Seções">
        <div className="tabs-in" role="tablist">
          {ABAS.map((a) => (
            <button key={a.id} type="button" className="tab" role="tab" aria-selected={a.id === aba} onClick={() => irPara(a.id)}>
              {a.nome}
            </button>
          ))}
        </div>
      </nav>

      <main className="wrap">
        <Tela />
        <Rodape />
      </main>
      <Avisos texto={toast.texto} erro={toast.erro} />
    </Ctx.Provider>
  )
}
