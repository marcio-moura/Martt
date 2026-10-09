import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { Backend } from './backend'
import type { Base, Demanda, Pessoa } from './types'

export interface AppCtx {
  backend: Backend
  base: Base
  eu: Pessoa
  /** Muda a cada alteração no banco: telas que carregam dados próprios recarregam. */
  versao: number
  ehDirecao: boolean
  podeCriarDemanda: boolean
  podeEditarDemanda(d: Pick<Demanda, 'criada_por' | 'responsaveis'>): boolean
  avisar(msg: string, erro?: boolean): void
  /** Roda uma ação no banco, mostra erro amigável e atualiza a tela. */
  executar<T>(fn: () => Promise<T>, ok?: string): Promise<T | undefined>
}

export const Ctx = createContext<AppCtx | null>(null)

export function useApp() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useApp fora do provedor')
  return c
}

/** Mesma regra do banco (pode_editar_demanda). */
export function regraEdicao(eu: Pessoa) {
  return (d: Pick<Demanda, 'criada_por' | 'responsaveis'>) =>
    eu.nivel === 'direcao' ||
    (eu.nivel === 'time' &&
      (d.criada_por === eu.id || d.responsaveis.some((r) => r.pessoa_id === eu.id || (!!eu.papel_id && r.papel_id === eu.papel_id))))
}

export function useDemandas(de: string, ate: string) {
  const { backend, versao, avisar } = useApp()
  const [lista, setLista] = useState<Demanda[] | null>(null)
  const carregar = useCallback(() => {
    let vivo = true
    backend
      .carregarDemandas(de, ate)
      .then((l) => vivo && setLista(l))
      .catch((e: Error) => avisar(e.message, true))
    return () => {
      vivo = false
    }
  }, [backend, de, ate, avisar])
  useEffect(() => carregar(), [carregar, versao])
  return { lista, setLista }
}
