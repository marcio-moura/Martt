// Gera supabase/seed.sql a partir de src/lib/seed.ts (fonte única dos dados iniciais).
// Uso: npm run seed:sql
import { writeFileSync } from 'node:fs'
import { SEED } from '../src/lib/seed.ts'

const lit = (v: unknown): string => {
  if (v === null || v === undefined) return 'null'
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  if (Array.isArray(v)) return `'{${v.map((x) => `"${String(x).replace(/"/g, '\\"')}"`).join(',')}}'`
  return `'${String(v).replace(/'/g, "''")}'`
}

const insert = (tabela: string, linhas: object[], omitir: string[] = []) => {
  if (!linhas.length) return ''
  const cols = Object.keys(linhas[0]).filter((c) => !omitir.includes(c))
  const valores = linhas
    .map((l) => `  (${cols.map((c) => lit((l as Record<string, unknown>)[c])).join(', ')})`)
    .join(',\n')
  return `insert into ${tabela} (${cols.join(', ')}) values\n${valores};\n`
}

const sql = [
  '-- Gerado por scripts/gerar-seed-sql.ts a partir de src/lib/seed.ts. Não edite à mão.',
  '-- Dados de exemplo (fictícios). Rode depois de supabase/migrations/0001_esquema.sql.',
  'begin;',
  insert('papeis', SEED.papeis),
  insert('pessoas', SEED.pessoas, ['user_id']),
  insert('clientes', SEED.clientes),
  insert('etapas', SEED.etapas),
  insert('modelo_dias', SEED.modelo_dias),
  insert('modelo_demandas', SEED.modelo_demandas),
  insert('rituais', SEED.rituais),
  insert('regras', SEED.regras),
  'commit;',
  '',
].join('\n')

writeFileSync(new URL('../supabase/seed.sql', import.meta.url), sql)
console.log('supabase/seed.sql gerado')
