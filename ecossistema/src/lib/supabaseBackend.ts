import { createClient, type User } from '@supabase/supabase-js'
import type { Backend, Usuario } from './backend'
import { CHAVE } from './backend'
import type { Base, Demanda, DemandaInput, TabelaBase } from './types'

interface LinhaDemanda extends Omit<Demanda, 'responsaveis' | 'clientes'> {
  demanda_responsaveis: { papel_id: string | null; pessoa_id: string | null }[]
  demanda_clientes: { cliente_id: string }[]
}

const SELECT_DEMANDA = '*, demanda_responsaveis(papel_id, pessoa_id), demanda_clientes(cliente_id)'

const paraDemanda = ({ demanda_responsaveis, demanda_clientes, ...d }: LinhaDemanda): Demanda => ({
  ...d,
  responsaveis: demanda_responsaveis ?? [],
  clientes: (demanda_clientes ?? []).map((c) => c.cliente_id),
})

const paraUsuario = (u: User | null | undefined): Usuario | null => (u ? { id: u.id, email: u.email ?? '' } : null)

function erro(e: { message: string; code?: string } | null): void {
  if (!e) return
  if (e.code === '42501' || /row-level security/i.test(e.message)) throw new Error('Você não tem permissão para esta ação.')
  if (/Invalid login credentials/i.test(e.message)) throw new Error('E-mail ou senha incorretos.')
  if (/Email not confirmed/i.test(e.message)) throw new Error('Confirme o e-mail pelo link que enviamos antes de entrar.')
  if (/already registered/i.test(e.message)) throw new Error('Este e-mail já tem conta. Use Entrar.')
  if (/Password should be/i.test(e.message)) throw new Error('A senha precisa ter pelo menos 6 caracteres.')
  throw new Error(e.message)
}

export function criarSupabaseBackend(url: string, chave: string): Backend {
  const sb = createClient(url, chave)

  const tabela = async <T>(nome: string, ordem: string) => {
    const { data, error } = await sb.from(nome).select('*').order(ordem)
    erro(error)
    return (data ?? []) as T
  }

  const paraJson = (d: DemandaInput) => ({ ...d, horario: d.horario || null })

  return {
    modo: 'supabase',

    async usuarioAtual() {
      const { data } = await sb.auth.getSession()
      return paraUsuario(data.session?.user)
    },
    aoMudarLogin(cb) {
      const { data } = sb.auth.onAuthStateChange((_e, s) => cb(paraUsuario(s?.user)))
      return () => data.subscription.unsubscribe()
    },
    async entrar(email, senha) {
      const { error } = await sb.auth.signInWithPassword({ email, password: senha })
      erro(error)
    },
    async criarConta(email, senha) {
      const { data, error } = await sb.auth.signUp({ email, password: senha })
      erro(error)
      return { confirmarEmail: !data.session }
    },
    async sair() {
      await sb.auth.signOut()
    },

    async carregarBase() {
      const [papeis, pessoas, clientes, modelo_dias, modelo_demandas, etapas, rituais, regras] = await Promise.all([
        tabela<Base['papeis']>('papeis', 'ordem'),
        tabela<Base['pessoas']>('pessoas', 'nome'),
        tabela<Base['clientes']>('clientes', 'nome'),
        tabela<Base['modelo_dias']>('modelo_dias', 'dia'),
        tabela<Base['modelo_demandas']>('modelo_demandas', 'horario'),
        tabela<Base['etapas']>('etapas', 'ordem'),
        tabela<Base['rituais']>('rituais', 'ordem'),
        tabela<Base['regras']>('regras', 'ordem'),
      ])
      return { papeis, pessoas, clientes, modelo_dias, modelo_demandas, etapas, rituais, regras }
    },

    async carregarDemandas(de, ate) {
      const { data, error } = await sb.from('demandas').select(SELECT_DEMANDA).gte('data', de).lte('data', ate)
      erro(error)
      return ((data ?? []) as LinhaDemanda[]).map(paraDemanda)
    },

    async carregarDemandasDoCliente(clienteId) {
      const { data: links, error: e1 } = await sb.from('demanda_clientes').select('demanda_id').eq('cliente_id', clienteId)
      erro(e1)
      const ids = (links ?? []).map((l) => l.demanda_id as string)
      if (!ids.length) return []
      const { data, error } = await sb.from('demandas').select(SELECT_DEMANDA).in('id', ids).order('data', { ascending: false }).limit(60)
      erro(error)
      return ((data ?? []) as LinhaDemanda[]).map(paraDemanda)
    },

    async salvarDemanda(d) {
      const { data, error } = await sb.rpc('salvar_demanda', { p: paraJson(d) })
      erro(error)
      return data as string
    },
    async gerarSemana(itens) {
      const { data, error } = await sb.rpc('gerar_semana', { itens: itens.map(paraJson) })
      erro(error)
      return data as number
    },
    async marcarConcluida(id, patch) {
      const { data, error } = await sb.from('demandas').update(patch).eq('id', id).select('id')
      erro(error)
      if (!data?.length) throw new Error('Você não tem permissão para esta ação.')
    },
    async excluirDemanda(id) {
      const { data, error } = await sb.from('demandas').delete().eq('id', id).select('id')
      erro(error)
      if (!data?.length) throw new Error('Você não tem permissão para esta ação.')
    },

    async salvar(nome, linha, novo) {
      const t = sb.from(nome as TabelaBase)
      const chave: string = CHAVE[nome]
      const registro = { ...(linha as unknown as Record<string, unknown>) }
      if (nome === 'pessoas') delete registro.user_id // o vínculo com o login é feito pelo banco
      const { error } = novo
        ? await t.insert(registro)
        : await t.update(registro).eq(chave, registro[chave] as string)
      erro(error)
    },
    async excluir(nome, id) {
      const { error } = await sb.from(nome).delete().eq(CHAVE[nome], id)
      erro(error)
    },

    escutar(cb) {
      let timer: ReturnType<typeof setTimeout> | undefined
      const aviso = () => {
        clearTimeout(timer)
        timer = setTimeout(cb, 250)
      }
      const canal = sb
        .channel('martt')
        .on('postgres_changes', { event: '*', schema: 'public' }, aviso)
        .subscribe()
      return () => {
        clearTimeout(timer)
        void sb.removeChannel(canal)
      }
    },
  }
}
