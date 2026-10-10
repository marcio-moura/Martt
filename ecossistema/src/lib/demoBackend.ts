// Modo demonstração: sem Supabase configurado, os dados ficam no localStorage
// deste navegador. Abas abertas se atualizam entre si (BroadcastChannel).
import type { Backend } from './backend'
import { CHAVE, novoId } from './backend'
import { hoje, segundaDe } from './datas'
import { ID_MARCIO, SEED } from './seed'
import { itemDoModelo } from './semana'
import type { Base, Demanda, DemandaInput, TabelaBase } from './types'

const CHAVE_LS = 'martt-demo-v1'
const USUARIO = { id: 'demo', email: 'demo@martt.local' }

interface Estado {
  base: Base
  demandas: Demanda[]
}

const copia = <T>(v: T): T => JSON.parse(JSON.stringify(v))

function inicial(): Estado {
  const base = copia(SEED)
  base.pessoas = base.pessoas.map((p) => (p.id === ID_MARCIO ? { ...p, user_id: USUARIO.id } : p))
  const segunda = segundaDe(hoje())
  const demandas = base.modelo_demandas.map((m) => ({ ...itemDoModelo(m, segunda), id: novoId(), criada_por: ID_MARCIO }))
  return { base, demandas }
}

export function criarDemoBackend(): Backend {
  const ler = (): Estado => {
    try {
      const salvo = localStorage.getItem(CHAVE_LS)
      if (salvo) return JSON.parse(salvo)
    } catch {
      /* sem armazenamento: segue em memória */
    }
    return inicial()
  }
  let estado = ler()
  const ouvintes = new Set<() => void>()
  let canal: BroadcastChannel | null = null
  try {
    canal = new BroadcastChannel('martt-demo')
    canal.onmessage = () => {
      estado = ler()
      ouvintes.forEach((cb) => cb())
    }
  } catch {
    /* navegador sem BroadcastChannel */
  }

  const gravar = () => {
    try {
      localStorage.setItem(CHAVE_LS, JSON.stringify(estado))
    } catch {
      /* ignora */
    }
    canal?.postMessage('mudou')
  }

  const salvarUma = (d: DemandaInput) => {
    const id = d.id || novoId()
    const atual = estado.demandas.find((x) => x.id === id)
    const nova: Demanda = { ...copia(d), id, criada_por: atual?.criada_por ?? ID_MARCIO, horario: d.horario || null }
    estado.demandas = atual ? estado.demandas.map((x) => (x.id === id ? nova : x)) : [...estado.demandas, nova]
    return id
  }

  let primeiraVez = false
  try {
    primeiraVez = !localStorage.getItem(CHAVE_LS)
  } catch {
    /* ignora */
  }
  if (primeiraVez) gravar()

  return {
    modo: 'demo',
    usuarioAtual: async () => USUARIO,
    aoMudarLogin: () => () => {},
    entrar: async () => {},
    criarConta: async () => ({ confirmarEmail: false }),
    sair: async () => {
      // No modo demonstração "sair" restaura os dados de exemplo.
      estado = inicial()
      gravar()
      ouvintes.forEach((cb) => cb())
    },

    carregarBase: async () => copia(estado.base),
    carregarDemandas: async (de, ate) => copia(estado.demandas.filter((d) => d.data >= de && d.data <= ate)),
    carregarDemandasDoCliente: async (id) =>
      copia(estado.demandas.filter((d) => d.clientes.includes(id))).sort((a, b) => b.data.localeCompare(a.data)),

    async salvarDemanda(d) {
      const id = salvarUma(d)
      gravar()
      return id
    },
    async gerarSemana(itens) {
      itens.forEach((i) => salvarUma({ ...i, id: undefined }))
      gravar()
      return itens.length
    },
    async marcarConcluida(id, patch) {
      estado.demandas = estado.demandas.map((d) => (d.id === id ? { ...d, ...patch } : d))
      gravar()
    },
    async excluirDemanda(id) {
      estado.demandas = estado.demandas.filter((d) => d.id !== id)
      gravar()
    },

    async salvar(tabela, linha, novo) {
      const chave = CHAVE[tabela] as keyof typeof linha
      const lista = estado.base[tabela] as (typeof linha)[]
      const atualizada = novo ? [...lista, copia(linha)] : lista.map((l) => (l[chave] === linha[chave] ? copia(linha) : l))
      ;(estado.base as Record<TabelaBase, unknown[]>)[tabela] = atualizada
      gravar()
    },
    async excluir(tabela, id) {
      const chave = CHAVE[tabela]
      const lista = estado.base[tabela] as unknown as Record<string, unknown>[]
      ;(estado.base as Record<TabelaBase, unknown[]>)[tabela] = lista.filter((l) => l[chave] !== id)
      if (tabela === 'clientes') {
        estado.demandas = estado.demandas.map((d) => ({ ...d, clientes: d.clientes.filter((c) => c !== id) }))
      }
      if (tabela === 'pessoas') {
        estado.demandas = estado.demandas.map((d) => ({ ...d, responsaveis: d.responsaveis.filter((r) => r.pessoa_id !== id) }))
      }
      gravar()
    },

    escutar(cb) {
      ouvintes.add(cb)
      return () => ouvintes.delete(cb)
    },
  }
}
