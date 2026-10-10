import type { Base, Demanda, DemandaInput, TabelaBase } from './types'

export interface Usuario {
  id: string
  email: string
}

/**
 * Tudo o que o app pede ao banco passa por aqui. Há duas implementações:
 * Supabase (uso real) e demonstração (localStorage, quando não há .env).
 */
export interface Backend {
  modo: 'supabase' | 'demo'
  usuarioAtual(): Promise<Usuario | null>
  aoMudarLogin(cb: (u: Usuario | null) => void): () => void
  entrar(email: string, senha: string): Promise<void>
  criarConta(email: string, senha: string): Promise<{ confirmarEmail: boolean }>
  sair(): Promise<void>

  carregarBase(): Promise<Base>
  carregarDemandas(de: string, ate: string): Promise<Demanda[]>
  carregarDemandasDoCliente(clienteId: string): Promise<Demanda[]>

  salvarDemanda(d: DemandaInput): Promise<string>
  gerarSemana(itens: DemandaInput[]): Promise<number>
  marcarConcluida(id: string, patch: Pick<Demanda, 'concluida_em' | 'estado'>): Promise<void>
  excluirDemanda(id: string): Promise<void>

  /** CRUD das tabelas de configuração (a coluna de id de cada uma está em CHAVE). */
  salvar<T extends TabelaBase>(tabela: T, linha: Base[T][number], novo: boolean): Promise<void>
  excluir(tabela: TabelaBase, id: string | number): Promise<void>

  /** Avisa quando algo muda no banco (outra pessoa ou outra aba). */
  escutar(cb: () => void): () => void
}

export const CHAVE: Record<TabelaBase, string> = {
  papeis: 'id',
  pessoas: 'id',
  clientes: 'id',
  modelo_dias: 'dia',
  modelo_demandas: 'id',
  etapas: 'id',
  rituais: 'id',
  regras: 'id',
}

export const novoId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => ((Math.random() * 16) | 0).toString(16))

/**
 * Regra do "concluído" (a mesma do trigger no banco):
 *  - Tarefa: o check encerra a demanda.
 *  - Conteúdo: concluída = Publicado. Marcar publica; desmarcar volta para Aprovado.
 */
export function regraConcluida(d: Pick<Demanda, 'tipo' | 'estado'>, concluir: boolean): Pick<Demanda, 'concluida_em' | 'estado'> {
  const concluida_em = concluir ? new Date().toISOString() : null
  if (d.tipo !== 'conteudo') return { concluida_em, estado: d.estado }
  if (concluir) return { concluida_em, estado: 'publicado' }
  return { concluida_em, estado: d.estado === 'publicado' ? 'aprovado' : d.estado }
}

/** Ao salvar pelo formulário: mantém estado e check coerentes para conteúdo. */
export function normalizarDemanda(d: DemandaInput): DemandaInput {
  if (d.tipo !== 'conteudo') return d
  if (d.estado === 'publicado') return { ...d, concluida_em: d.concluida_em ?? new Date().toISOString() }
  return { ...d, concluida_em: null }
}
