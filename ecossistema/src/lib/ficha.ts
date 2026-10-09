import type { FichaCliente } from './types'

export interface CampoFicha {
  key: keyof FichaCliente | 'nome'
  rotulo: string
  dica: string
  exemplo: string
}

/** Estrutura da ficha de cliente. Mudar aqui muda a ficha inteira. */
export const FICHA: { grupo: string; campos: CampoFicha[] }[] = [
  {
    grupo: 'Identidade',
    campos: [
      { key: 'nome', rotulo: 'Nome', dica: 'Como o time chama a conta', exemplo: 'Cliente A' },
      { key: 'segmento', rotulo: 'Segmento', dica: 'O que o cliente vende e para quem', exemplo: 'Clínica odontológica' },
      { key: 'perfil_canais', rotulo: 'Perfil e canais', dica: 'Onde a marca aparece', exemplo: '@clientea · Instagram' },
      { key: 'responsavel', rotulo: 'Responsável na Martt', dica: 'Quem responde pela conta', exemplo: 'Direção' },
    ],
  },
  {
    grupo: 'Estratégia',
    campos: [
      { key: 'objetivo_mes', rotulo: 'Objetivo do mês', dica: 'Um resultado só, mensurável', exemplo: '20 pedidos de avaliação' },
      { key: 'publico', rotulo: 'Público', dica: 'Quem precisamos alcançar', exemplo: 'Moradores do bairro, 30 a 55 anos' },
      { key: 'posicionamento', rotulo: 'Posicionamento e tom de voz', dica: 'Como o cliente quer ser percebido', exemplo: 'Cuidado próximo, linguagem simples' },
    ],
  },
  {
    grupo: 'Operação',
    campos: [
      { key: 'frequencia', rotulo: 'Frequência semanal', dica: 'Posts, Reels e stories por semana', exemplo: '4 posts, 3 Reels, 10 stories' },
      { key: 'gravacao', rotulo: 'Dia e local de gravação', dica: 'Quando e onde captamos', exemplo: 'Domingo, na clínica' },
      { key: 'formatos', rotulo: 'Formatos', dica: 'O que produzimos para esta conta', exemplo: 'Reels, carrossel, stories' },
    ],
  },
  {
    grupo: 'Aprovação',
    campos: [
      { key: 'aprovador', rotulo: 'Quem aprova no cliente', dica: 'Uma pessoa só', exemplo: 'Dra. Ana (exemplo)' },
      { key: 'prazo_resposta', rotulo: 'Prazo de resposta', dica: 'Quanto o cliente tem para responder', exemplo: 'Até 24 horas úteis' },
    ],
  },
  {
    grupo: 'Acessos e pastas',
    campos: [
      { key: 'pasta', rotulo: 'Pasta de arquivos', dica: 'Onde ficam bruto, editado e artes', exemplo: 'Drive / Cliente A' },
      { key: 'quadro', rotulo: 'Quadro de demandas', dica: 'Onde os cards vivem', exemplo: 'Quadro / Cliente A' },
      { key: 'canal', rotulo: 'Canal do grupo', dica: 'Conversa do time sobre esta conta', exemplo: 'Grupo Cliente A' },
    ],
  },
  {
    grupo: 'Métricas',
    campos: [
      { key: 'indicador', rotulo: 'Indicador principal', dica: 'O número que mostra se o objetivo avançou', exemplo: 'Mensagens recebidas' },
      { key: 'fonte_metrica', rotulo: 'Fonte e periodicidade', dica: 'De onde vem e quando olhamos', exemplo: 'Insights do Instagram, toda sexta' },
    ],
  },
]

export const FICHA_VAZIA: FichaCliente = {
  segmento: '', perfil_canais: '', responsavel: '', objetivo_mes: '', publico: '', posicionamento: '',
  frequencia: '', gravacao: '', formatos: '', aprovador: '', prazo_resposta: '', pasta: '', quadro: '',
  canal: '', indicador: '', fonte_metrica: '',
}
