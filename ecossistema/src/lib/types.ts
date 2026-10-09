// Tipos espelham as tabelas do banco (supabase/migrations/0001_esquema.sql).

export type Nivel = 'direcao' | 'time' | 'leitura'
export type Estado = 'a_fazer' | 'em_producao' | 'em_revisao' | 'com_o_cliente' | 'aprovado' | 'publicado'
export type TipoDemanda = 'tarefa' | 'conteudo'

export interface Papel {
  id: string
  nome: string
  sigla: string
  cor: string
  cor_escura: string
  missao: string
  entrega: string
  recebe_de: string
  passa_para: string
  metrica: string
  ordem: number
}

export interface Pessoa {
  id: string
  user_id: string | null
  nome: string
  email: string | null
  papel_id: string | null
  nivel: Nivel
  ativo: boolean
}

export interface FichaCliente {
  segmento: string
  perfil_canais: string
  responsavel: string
  objetivo_mes: string
  publico: string
  posicionamento: string
  frequencia: string
  gravacao: string
  formatos: string
  aprovador: string
  prazo_resposta: string
  pasta: string
  quadro: string
  canal: string
  indicador: string
  fonte_metrica: string
}

export interface Cliente extends FichaCliente {
  id: string
  nome: string
  ativo: boolean
}

export interface Responsavel {
  papel_id: string | null
  pessoa_id: string | null
}

export interface Demanda {
  id: string
  titulo: string
  data: string // AAAA-MM-DD
  horario: string | null // HH:MM
  local: string
  tipo: TipoDemanda
  estado: Estado
  etapa_id: number | null
  concluida_em: string | null
  criada_por: string | null
  ordem: number
  responsaveis: Responsavel[]
  clientes: string[]
}

/** O que o formulário envia para criar ou salvar uma demanda. */
export type DemandaInput = Omit<Demanda, 'id' | 'criada_por'> & { id?: string }

export interface ModeloDia {
  dia: number // 1 = segunda ... 7 = domingo
  nome: string
  sigla: string
  funcao: string
}

export interface ModeloDemanda {
  id: string
  dia: number
  horario: string | null
  titulo: string
  local: string
  tipo: TipoDemanda
  etapa_id: number | null
  papeis: string[]
  clientes: string[]
  ordem: number
}

export interface Etapa {
  id: number
  ordem: number
  nome: string
  descricao: string
  responsaveis: string[]
  quando: string
  pronto_quando: string
}

export interface Ritual {
  id: string
  nome: string
  quando: string
  duracao: string
  participantes: string
  saida: string
  ordem: number
}

export type GrupoRegra =
  | 'comunicacao'
  | 'padroes'
  | 'primeira_semana'
  | 'metodo'
  | 'cliente'
  | 'martt'

export interface Regra {
  id: string
  grupo: GrupoRegra
  texto: string
  detalhe: string
  ordem: number
}

export interface Base {
  papeis: Papel[]
  pessoas: Pessoa[]
  clientes: Cliente[]
  modelo_dias: ModeloDia[]
  modelo_demandas: ModeloDemanda[]
  etapas: Etapa[]
  rituais: Ritual[]
  regras: Regra[]
}

/** Tabelas de configuração editáveis pelo CRUD genérico. */
export type TabelaBase = keyof Base

export const ESTADOS: { id: Estado; nome: string }[] = [
  { id: 'a_fazer', nome: 'A fazer' },
  { id: 'em_producao', nome: 'Em produção' },
  { id: 'em_revisao', nome: 'Em revisão' },
  { id: 'com_o_cliente', nome: 'Com o cliente' },
  { id: 'aprovado', nome: 'Aprovado' },
  { id: 'publicado', nome: 'Publicado' },
]

export const NIVEIS: { id: Nivel; nome: string; descricao: string }[] = [
  { id: 'direcao', nome: 'Direção', descricao: 'Edita tudo' },
  { id: 'time', nome: 'Time', descricao: 'Cria e edita as próprias demandas' },
  { id: 'leitura', nome: 'Leitura', descricao: 'Só consulta' },
]
