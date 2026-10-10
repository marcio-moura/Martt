import { useState, type FormEvent } from 'react'
import { Editar, Modal, Rodape, Texto } from '../components/ui'
import { novoId } from '../lib/backend'
import { useApp } from '../lib/app'
import type { GrupoRegra, Regra } from '../lib/types'

/** Lista editável de regras de um grupo (comunicação, padrões, primeira semana...). */
export function useRegras(grupo: GrupoRegra) {
  const { base } = useApp()
  return base.regras.filter((r) => r.grupo === grupo).sort((a, b) => a.ordem - b.ordem)
}

export function FormRegra(props: { grupo: GrupoRegra; regra?: Regra; comDetalhe?: string; onFechar: () => void }) {
  const { base, backend, executar } = useApp()
  const [texto, setTexto] = useState(props.regra?.texto ?? '')
  const [detalhe, setDetalhe] = useState(props.regra?.detalhe ?? '')
  const [salvando, setSalvando] = useState(false)

  async function salvar(e: FormEvent) {
    e.preventDefault()
    if (!texto.trim()) return
    setSalvando(true)
    const ordem = props.regra?.ordem ?? Math.max(-1, ...base.regras.filter((r) => r.grupo === props.grupo).map((r) => r.ordem)) + 1
    const linha: Regra = { id: props.regra?.id ?? novoId(), grupo: props.grupo, texto: texto.trim(), detalhe: detalhe.trim(), ordem }
    const ok = await executar(() => backend.salvar('regras', linha, !props.regra).then(() => true), 'Salvo')
    setSalvando(false)
    if (ok) props.onFechar()
  }
  async function excluir() {
    if (!window.confirm('Excluir este item?')) return
    const ok = await executar(() => backend.excluir('regras', props.regra!.id).then(() => true), 'Excluído')
    if (ok) props.onFechar()
  }

  return (
    <Modal titulo={props.regra ? 'Editar item' : 'Novo item'} onFechar={props.onFechar}>
      <form className="form" onSubmit={salvar}>
        <Texto rotulo="Texto" valor={texto} onChange={setTexto} longo obrigatorio />
        {props.comDetalhe && <Texto rotulo={props.comDetalhe} valor={detalhe} onChange={setDetalhe} />}
        <Rodape onCancelar={props.onFechar} onExcluir={props.regra ? excluir : undefined} salvando={salvando} />
      </form>
    </Modal>
  )
}

/** Renderiza uma lista simples de regras com edição para a Direção. */
export function ListaRegras(props: { grupo: GrupoRegra; classe?: string; ordenada?: boolean; comDetalhe?: string }) {
  const { ehDirecao } = useApp()
  const regras = useRegras(props.grupo)
  const [aberto, setAberto] = useState<Regra | 'nova' | null>(null)
  const Tag = props.ordenada ? 'ol' : 'ul'
  return (
    <>
      <Tag className={props.classe ?? 'plain'}>
        {regras.map((r) => (
          <li key={r.id}>
            <span>{r.texto}</span>
            {ehDirecao && <Editar onClick={() => setAberto(r)} />}
          </li>
        ))}
      </Tag>
      {ehDirecao && (
        <button type="button" className="btn small ghost" style={{ marginTop: 8 }} onClick={() => setAberto('nova')}>
          Adicionar
        </button>
      )}
      {aberto && (
        <FormRegra
          grupo={props.grupo}
          regra={aberto === 'nova' ? undefined : aberto}
          comDetalhe={props.comDetalhe}
          onFechar={() => setAberto(null)}
        />
      )}
    </>
  )
}
