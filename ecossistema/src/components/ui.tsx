import { useEffect, useId, useRef, type CSSProperties, type ReactNode } from 'react'
import { useApp } from '../lib/app'
import { eDeTodos } from '../lib/semana'
import type { Papel, Responsavel } from '../lib/types'

export const corPapel = (p?: Pick<Papel, 'cor' | 'cor_escura'>): CSSProperties =>
  (p ? { '--cl': p.cor, '--cd': p.cor_escura } : {}) as CSSProperties

export function Modal(props: { titulo: string; sub?: string; onFechar: () => void; largo?: boolean; children: ReactNode }) {
  const id = useId()
  const ref = useRef<HTMLDivElement>(null)
  const { onFechar } = props
  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && onFechar()
    document.addEventListener('keydown', tecla)
    document.body.style.overflow = 'hidden'
    ref.current?.focus()
    return () => {
      document.removeEventListener('keydown', tecla)
      document.body.style.overflow = ''
      anterior?.focus?.()
    }
  }, [onFechar])
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onFechar()}>
      <div className={props.largo ? 'modal wide' : 'modal'} role="dialog" aria-modal="true" aria-labelledby={id} tabIndex={-1} ref={ref}>
        <div className="modal-head">
          <div>
            <h2 id={id}>{props.titulo}</h2>
            {props.sub && <p className="lead">{props.sub}</p>}
          </div>
          <button type="button" className="close" aria-label="Fechar" onClick={onFechar} />
        </div>
        {props.children}
      </div>
    </div>
  )
}

export function Campo(props: { rotulo: string; dica?: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{props.rotulo}</span>
      {props.children}
      {props.dica && <small>{props.dica}</small>}
    </label>
  )
}

export function Texto(props: { rotulo: string; valor: string; onChange: (v: string) => void; dica?: string; placeholder?: string; longo?: boolean; tipo?: string; obrigatorio?: boolean }) {
  return (
    <Campo rotulo={props.rotulo} dica={props.dica}>
      {props.longo ? (
        <textarea value={props.valor} placeholder={props.placeholder} onChange={(e) => props.onChange(e.target.value)} required={props.obrigatorio} />
      ) : (
        <input type={props.tipo ?? 'text'} value={props.valor} placeholder={props.placeholder} onChange={(e) => props.onChange(e.target.value)} required={props.obrigatorio} />
      )}
    </Campo>
  )
}

export function Chip(props: { ativo: boolean; onClick: () => void; children: ReactNode; style?: CSSProperties; className?: string }) {
  return (
    <button type="button" className={`chip ${props.className ?? ''}`} aria-pressed={props.ativo} onClick={props.onClick} style={props.style}>
      {props.children}
    </button>
  )
}

export function PapelChip({ papel }: { papel: Papel }) {
  return (
    <span className="rc rcor" style={corPapel(papel)}>
      <i />
      {papel.nome}
    </span>
  )
}

/** Chips de responsáveis com a cor do papel. Todos os papéis viram "Todos". */
export function Responsaveis({ lista }: { lista: Responsavel[] }) {
  const { base } = useApp()
  if (eDeTodos({ responsaveis: lista }, base.papeis)) {
    return (
      <span className="rc">
        <i style={{ background: 'var(--fg)' }} />
        Todos
      </span>
    )
  }
  return (
    <>
      {base.papeis
        .filter((p) => lista.some((r) => r.papel_id === p.id))
        .map((p) => (
          <PapelChip key={p.id} papel={p} />
        ))}
      {lista
        .filter((r) => r.pessoa_id)
        .map((r) => {
          const pessoa = base.pessoas.find((p) => p.id === r.pessoa_id)
          if (!pessoa) return null
          const papel = base.papeis.find((p) => p.id === pessoa.papel_id)
          return (
            <span key={pessoa.id} className="rc rcor" style={corPapel(papel)}>
              <i style={{ borderRadius: 0, outline: '1px solid var(--c, var(--muted))', outlineOffset: 1 }} />
              {pessoa.nome}
            </span>
          )
        })}
    </>
  )
}

export function Editar({ onClick, rotulo = 'Editar' }: { onClick: () => void; rotulo?: string }) {
  return (
    <button type="button" className="mini" onClick={onClick}>
      {rotulo}
    </button>
  )
}

export function Rodape(props: { onExcluir?: () => void; onCancelar: () => void; salvando?: boolean; rotuloSalvar?: string }) {
  return (
    <div className="form-foot">
      {props.onExcluir && (
        <button type="button" className="btn danger" onClick={props.onExcluir} disabled={props.salvando}>
          Excluir
        </button>
      )}
      <div className="end">
        <button type="button" className="btn ghost" onClick={props.onCancelar}>
          Cancelar
        </button>
        <button type="submit" className="btn primary" disabled={props.salvando}>
          {props.rotuloSalvar ?? 'Salvar'}
        </button>
      </div>
    </div>
  )
}
