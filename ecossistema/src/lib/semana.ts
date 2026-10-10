import { somarDias } from './datas'
import type { Base, Demanda, DemandaInput, ModeloDemanda, Papel, Pessoa } from './types'

/** Ordena por horário (sem horário vai para o fim) e depois pela ordem manual. */
export const porHorario = <T extends { horario: string | null; ordem: number }>(a: T, b: T) =>
  (a.horario ?? '99:99').localeCompare(b.horario ?? '99:99') || a.ordem - b.ordem

export function itemDoModelo(m: ModeloDemanda, segunda: string): DemandaInput {
  return {
    titulo: m.titulo,
    data: somarDias(segunda, m.dia - 1),
    horario: m.horario,
    local: m.local,
    tipo: m.tipo,
    estado: 'a_fazer',
    etapa_id: m.etapa_id,
    concluida_em: null,
    ordem: m.ordem,
    responsaveis: m.papeis.map((papel_id) => ({ papel_id, pessoa_id: null })),
    clientes: m.clientes,
  }
}

/** A demanda envolve este papel? (direto ou por uma pessoa daquele papel) */
export function temPapel(d: Pick<Demanda, 'responsaveis'>, papelId: string, pessoas: Pessoa[]) {
  return d.responsaveis.some(
    (r) => r.papel_id === papelId || (r.pessoa_id && pessoas.find((p) => p.id === r.pessoa_id)?.papel_id === papelId),
  )
}

export function eDeTodos(d: Pick<Demanda, 'responsaveis'>, papeis: Papel[]) {
  return papeis.length > 1 && papeis.every((p) => d.responsaveis.some((r) => r.papel_id === p.id))
}

/** Nomes dos responsáveis em texto puro: "Todos" ou "Social media, Designer, Ana". */
export function nomesResponsaveis(d: Pick<Demanda, 'responsaveis'>, base: Pick<Base, 'papeis' | 'pessoas'>) {
  const pessoas = d.responsaveis
    .map((r) => base.pessoas.find((p) => p.id === r.pessoa_id)?.nome)
    .filter((n): n is string => !!n)
  const papeis = eDeTodos(d, base.papeis)
    ? ['Todos']
    : base.papeis.filter((p) => d.responsaveis.some((r) => r.papel_id === p.id)).map((p) => p.nome)
  return [...papeis, ...pessoas]
}

/** Texto da ordem do dia para colar no grupo. */
export function textoOrdemDoDia(
  titulo: { nome: string; funcao: string },
  demandas: Demanda[],
  base: Pick<Base, 'papeis' | 'pessoas' | 'clientes'>,
) {
  const linhas = [['ORDEM DO DIA', titulo.nome, titulo.funcao].filter(Boolean).join(' · ')]
  for (const d of demandas) {
    const clientes = d.clientes
      .map((id) => base.clientes.find((c) => c.id === id)?.nome)
      .filter(Boolean)
      .join(', ')
    const extra = [nomesResponsaveis(d, base).join(', '), clientes, d.local].filter(Boolean).join(' · ')
    linhas.push(`${d.horario ?? '--:--'}  ${d.titulo}${extra ? ` (${extra})` : ''}`)
  }
  return linhas.join('\n')
}
