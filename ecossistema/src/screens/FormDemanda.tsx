import { useState, type FormEvent } from 'react'
import { Campo, Chip, Modal, Rodape, Texto, corPapel } from '../components/ui'
import { normalizarDemanda } from '../lib/backend'
import { novoId } from '../lib/backend'
import { useApp } from '../lib/app'
import { deIso, diaMes, segundaDe, somarDias } from '../lib/datas'
import { ESTADOS, type Demanda, type DemandaInput, type Estado, type ModeloDemanda, type TipoDemanda } from '../lib/types'

interface Rascunho {
  titulo: string
  data: string
  dia: number
  horario: string
  local: string
  tipo: TipoDemanda
  estado: Estado
  etapa_id: number | null
  papeis: string[]
  pessoas: string[]
  clientes: string[]
  concluida_em: string | null
  ordem: number
}

type Props =
  | { modo: 'demanda'; demanda?: Demanda; preset?: Partial<DemandaInput>; onFechar: () => void }
  | { modo: 'modelo'; item?: ModeloDemanda; dia?: number; onFechar: () => void }

const alterna = (lista: string[], v: string) => (lista.includes(v) ? lista.filter((x) => x !== v) : [...lista, v])

export function FormDemanda(props: Props) {
  const { base, backend, executar, ehDirecao, eu } = useApp()
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  const [r, setR] = useState<Rascunho>(() => {
    if (props.modo === 'modelo') {
      const m = props.item
      return {
        titulo: m?.titulo ?? '', data: '', dia: m?.dia ?? props.dia ?? 1, horario: m?.horario ?? '', local: m?.local ?? '',
        tipo: m?.tipo ?? 'tarefa', estado: 'a_fazer', etapa_id: m?.etapa_id ?? null, papeis: m?.papeis ?? [], pessoas: [],
        clientes: m?.clientes ?? [], concluida_em: null, ordem: m?.ordem ?? 0,
      }
    }
    const d: Partial<DemandaInput> = props.demanda ?? props.preset ?? {}
    const resp = d.responsaveis ?? (eu.papel_id && !ehDirecao ? [{ papel_id: eu.papel_id, pessoa_id: null }] : [])
    return {
      titulo: d.titulo ?? '', data: d.data ?? '', dia: 1, horario: d.horario ?? '', local: d.local ?? '',
      tipo: d.tipo ?? 'tarefa', estado: d.estado ?? 'a_fazer', etapa_id: d.etapa_id ?? null,
      papeis: resp.filter((x) => x.papel_id).map((x) => x.papel_id!),
      pessoas: resp.filter((x) => x.pessoa_id).map((x) => x.pessoa_id!),
      clientes: d.clientes ?? [], concluida_em: d.concluida_em ?? null, ordem: d.ordem ?? 0,
    }
  })
  const set = <K extends keyof Rascunho>(k: K, v: Rascunho[K]) => setR((x) => ({ ...x, [k]: v }))

  const editando = props.modo === 'demanda' ? !!props.demanda : !!props.item
  const todos = base.papeis.length > 0 && base.papeis.every((p) => r.papeis.includes(p.id))
  const clientesAtivos = base.clientes.filter((c) => c.ativo || r.clientes.includes(c.id))
  const pessoasAtivas = base.pessoas.filter((p) => p.ativo || r.pessoas.includes(p.id))
  const segunda = r.data ? segundaDe(r.data) : ''

  async function salvar(e: FormEvent) {
    e.preventDefault()
    setErro('')
    if (!r.titulo.trim()) return setErro('Dê um título para a demanda.')
    if (props.modo === 'demanda' && !r.data) return setErro('Escolha o dia.')
    if (!r.papeis.length && !r.pessoas.length) return setErro('Escolha pelo menos um responsável.')
    setSalvando(true)
    let ok: unknown
    if (props.modo === 'demanda') {
      const input: DemandaInput = normalizarDemanda({
        id: props.demanda?.id,
        titulo: r.titulo.trim(), data: r.data, horario: r.horario || null, local: r.local.trim(), tipo: r.tipo,
        estado: r.tipo === 'conteudo' ? r.estado : props.demanda?.estado ?? 'a_fazer',
        etapa_id: r.etapa_id, concluida_em: r.concluida_em, ordem: r.ordem, clientes: r.clientes,
        responsaveis: [
          ...r.papeis.map((papel_id) => ({ papel_id, pessoa_id: null })),
          ...r.pessoas.map((pessoa_id) => ({ papel_id: null, pessoa_id })),
        ],
      })
      ok = await executar(() => backend.salvarDemanda(input), editando ? 'Demanda salva' : 'Demanda criada')
    } else {
      const item: ModeloDemanda = {
        id: props.item?.id ?? novoId(), dia: r.dia, horario: r.horario || null, titulo: r.titulo.trim(), local: r.local.trim(),
        tipo: r.tipo, etapa_id: r.etapa_id, papeis: r.papeis, clientes: r.clientes, ordem: r.ordem,
      }
      ok = await executar(() => backend.salvar('modelo_demandas', item, !editando).then(() => true), 'Modelo salvo')
    }
    setSalvando(false)
    if (ok !== undefined) props.onFechar()
  }

  async function excluir() {
    if (!window.confirm('Excluir esta demanda?')) return
    setSalvando(true)
    const ok =
      props.modo === 'demanda'
        ? await executar(() => backend.excluirDemanda(props.demanda!.id).then(() => true), 'Demanda excluída')
        : await executar(() => backend.excluir('modelo_demandas', props.item!.id).then(() => true), 'Removida do modelo')
    setSalvando(false)
    if (ok) props.onFechar()
  }

  const titulo =
    props.modo === 'modelo' ? (editando ? 'Editar item do modelo' : 'Novo item do modelo') : editando ? 'Editar demanda' : 'Nova demanda'

  return (
    <Modal titulo={titulo} onFechar={props.onFechar}>
      <form className="form" onSubmit={salvar} noValidate>
        <Texto rotulo="O que fazer" valor={r.titulo} onChange={(v) => set('titulo', v)} placeholder="Ex.: Gravar 3 Reels do Cliente A" longo />

        {props.modo === 'demanda' ? (
          <fieldset className="field">
            <legend>Dia</legend>
            {segunda && (
              <div className="seg" style={{ marginBottom: 8 }}>
                {base.modelo_dias.map((d) => {
                  const iso = somarDias(segunda, d.dia - 1)
                  return (
                    <Chip key={d.dia} ativo={iso === r.data} onClick={() => set('data', iso)}>
                      {d.sigla} {deIso(iso).getDate()}
                    </Chip>
                  )
                })}
              </div>
            )}
            <input className="input" type="date" value={r.data} onChange={(e) => set('data', e.target.value)} aria-label="Data" />
            {r.data && <small style={{ color: 'var(--muted)', fontSize: '.76rem' }}>{diaMes(r.data)} · para mover, escolha outro dia</small>}
          </fieldset>
        ) : (
          <fieldset className="field">
            <legend>Dia da semana</legend>
            <div className="seg">
              {base.modelo_dias.map((d) => (
                <Chip key={d.dia} ativo={d.dia === r.dia} onClick={() => set('dia', d.dia)}>
                  {d.sigla}
                </Chip>
              ))}
            </div>
          </fieldset>
        )}

        <div className="cols">
          <Texto rotulo="Horário" tipo="time" valor={r.horario} onChange={(v) => set('horario', v)} />
          <Texto rotulo="Local" valor={r.local} onChange={(v) => set('local', v)} placeholder="Chamada, escritório..." />
        </div>

        <fieldset className="field">
          <legend>Responsáveis por papel</legend>
          <div className="seg">
            <Chip ativo={todos} onClick={() => set('papeis', todos ? [] : base.papeis.map((p) => p.id))}>
              <i style={{ background: 'var(--fg)' }} />
              Todos
            </Chip>
            {base.papeis.map((p) => (
              <Chip key={p.id} className="rcor" style={corPapel(p)} ativo={r.papeis.includes(p.id)} onClick={() => set('papeis', alterna(r.papeis, p.id))}>
                <i />
                {p.nome}
              </Chip>
            ))}
          </div>
        </fieldset>

        {props.modo === 'demanda' && pessoasAtivas.length > 0 && (
          <fieldset className="field">
            <legend>Responsáveis por pessoa</legend>
            <div className="seg">
              {pessoasAtivas.map((p) => (
                <Chip key={p.id} ativo={r.pessoas.includes(p.id)} onClick={() => set('pessoas', alterna(r.pessoas, p.id))}>
                  {p.nome}
                </Chip>
              ))}
            </div>
          </fieldset>
        )}

        {clientesAtivos.length > 0 && (
          <fieldset className="field">
            <legend>Clientes</legend>
            <div className="seg">
              {clientesAtivos.map((c) => (
                <Chip key={c.id} ativo={r.clientes.includes(c.id)} onClick={() => set('clientes', alterna(r.clientes, c.id))}>
                  {c.nome}
                </Chip>
              ))}
            </div>
          </fieldset>
        )}

        <fieldset className="field">
          <legend>Tipo</legend>
          <div className="seg">
            <Chip ativo={r.tipo === 'tarefa'} onClick={() => set('tipo', 'tarefa')}>Tarefa</Chip>
            <Chip ativo={r.tipo === 'conteudo'} onClick={() => set('tipo', 'conteudo')}>Conteúdo</Chip>
          </div>
          <small style={{ color: 'var(--muted)', fontSize: '.76rem' }}>
            Tarefa: o check encerra. Conteúdo: segue os estados do método e conta como concluído quando é publicado.
          </small>
        </fieldset>

        <div className="cols">
          {props.modo === 'demanda' && r.tipo === 'conteudo' && (
            <Campo rotulo="Estado">
              <select value={r.estado} onChange={(e) => set('estado', e.target.value as Estado)}>
                {ESTADOS.map((s) => (
                  <option key={s.id} value={s.id}>{s.nome}</option>
                ))}
              </select>
            </Campo>
          )}
          <Campo rotulo="Etapa do método">
            <select value={r.etapa_id ?? ''} onChange={(e) => set('etapa_id', e.target.value ? Number(e.target.value) : null)}>
              <option value="">Nenhuma</option>
              {base.etapas.map((s) => (
                <option key={s.id} value={s.id}>{String(s.ordem).padStart(2, '0')} · {s.nome}</option>
              ))}
            </select>
          </Campo>
        </div>

        {erro && <p className="err" role="alert">{erro}</p>}
        <Rodape onCancelar={props.onFechar} onExcluir={editando ? excluir : undefined} salvando={salvando} />
      </form>
    </Modal>
  )
}
