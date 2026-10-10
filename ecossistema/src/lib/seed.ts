// Dados iniciais (modelo). Clientes, horários e locais são exemplos fictícios.
// Esta é a fonte única do seed: o modo demonstração usa este arquivo e
// `npm run seed:sql` gera supabase/seed.sql a partir dele.
import type { Base, Cliente, ModeloDemanda, Regra, Ritual } from './types'

const uid = (bloco: string, n: number) =>
  `00000000-0000-4000-8000-${bloco}${String(n).padStart(12 - bloco.length, '0')}`

export const ID_MARCIO = uid('1', 1)
export const CLI_A = uid('a', 1)
export const CLI_B = uid('b', 1)
export const CLI_C = uid('c', 1)

const TODOS = ['dir', 'soc', 'vid', 'des', 'tra']

const vazio = {
  segmento: '', perfil_canais: '', responsavel: '', objetivo_mes: '', publico: '', posicionamento: '',
  frequencia: '', gravacao: '', formatos: '', aprovador: '', prazo_resposta: '', pasta: '', quadro: '',
  canal: '', indicador: '', fonte_metrica: '',
}

const clientes: Cliente[] = [
  {
    ...vazio,
    id: CLI_A,
    nome: 'Cliente A',
    ativo: true,
    segmento: 'Clínica odontológica',
    perfil_canais: '@clientea · Instagram',
    responsavel: 'Direção',
    objetivo_mes: '20 pedidos de avaliação',
    publico: 'Moradores do bairro, 30 a 55 anos',
    posicionamento: 'Cuidado próximo, linguagem simples',
    frequencia: '4 posts, 3 Reels, 10 stories',
    gravacao: 'Domingo, na clínica',
    formatos: 'Reels, carrossel, stories',
    aprovador: 'Dra. Ana (exemplo)',
    prazo_resposta: 'Até 24 horas úteis',
    pasta: 'Drive / Cliente A',
    quadro: 'Quadro / Cliente A',
    canal: 'Grupo Cliente A',
    indicador: 'Mensagens recebidas',
    fonte_metrica: 'Insights do Instagram, toda sexta',
  },
  { ...vazio, id: CLI_B, nome: 'Cliente B', ativo: true, segmento: 'Exemplo de conta com tráfego pago', responsavel: 'Direção' },
  { ...vazio, id: CLI_C, nome: 'Cliente C', ativo: true, segmento: 'Exemplo de conta com gravação mensal', responsavel: 'Direção' },
]

type M = [string | null, string, string[], string[]?, string?, number?]
const semana: Record<number, M[]> = {
  1: [
    ['08:30', 'Reunião de alinhamento semanal', TODOS, [], 'Escritório ou chamada'],
    ['09:30', 'Distribuir as demandas da semana no quadro', ['dir'], [], '', 1],
    ['10:30', 'Roteirizar os conteúdos da semana', ['soc'], [CLI_A, CLI_B], '', 2],
    ['14:00', 'Briefing de artes e criativos', ['soc', 'des'], [CLI_A], '', 2],
    ['15:00', 'Ler métricas da semana anterior e ajustar campanhas', ['tra'], [CLI_B], '', 7],
  ],
  2: [
    ['09:00', 'Aprovar os roteiros da semana', ['dir'], [], '', 2],
    ['10:00', 'Checklist de equipamento e roteiro de gravação', ['vid'], [], '', 3],
    ['10:30', 'Confirmar a gravação de domingo com os clientes', ['soc'], [CLI_A, CLI_C], '', 3],
    ['14:00', 'Produzir as artes de feed', ['des'], [CLI_A], '', 4],
    ['16:00', 'Criar os criativos de anúncio', ['des', 'tra'], [CLI_B], '', 4],
  ],
  3: [
    ['09:00', 'Editar os vídeos da última gravação', ['vid'], [CLI_A], '', 4],
    ['11:00', 'Check-in rápido de 15 minutos', TODOS, [], 'Chamada'],
    ['14:00', 'Artes de stories e capas de Reels', ['des'], [], '', 4],
    ['15:30', 'Escrever legendas e agendar os posts', ['soc'], [], '', 6],
    ['16:30', 'Subir os criativos novos nas campanhas', ['tra'], [CLI_B], '', 6],
  ],
  4: [
    ['09:00', 'Revisão de direção: vídeos, artes e legendas', ['dir'], [], '', 4],
    ['11:00', 'Enviar o material para aprovação do cliente', ['soc'], [CLI_A, CLI_B]],
    ['14:00', 'Aplicar os ajustes pedidos', ['vid', 'des'], [], '', 4],
    ['16:00', 'Decupagem: separar cortes extras para a próxima semana', ['vid', 'soc'], [], '', 5],
  ],
  5: [
    ['09:00', 'Publicar e conferir os agendamentos', ['soc'], [], '', 6],
    ['11:00', 'Relatório semanal de tráfego', ['tra'], [CLI_B], '', 7],
    ['14:00', 'Organizar arquivos e pastas dos clientes', ['soc', 'vid', 'des']],
    ['16:00', 'Reunião de fechamento', TODOS, [], 'Chamada'],
    ['16:45', 'Planejar a próxima semana e preparar os briefings', ['dir'], [], '', 1],
  ],
  6: [['10:00', 'Plantão: conferir se as publicações agendadas foram ao ar', ['soc'], [], 'Rodízio entre o time', 6]],
  7: [
    ['07:30', 'Conferir equipamento e sair', ['vid'], [], '', 3],
    ['08:30', 'Chegada, alinhamento com o cliente e ordem de cenas', ['dir', 'vid'], [CLI_A], 'Local X (exemplo)', 3],
    ['09:00', 'Gravação', ['dir', 'vid'], [CLI_A], 'Local X (exemplo)', 3],
    ['11:30', 'Gravação', ['dir', 'vid'], [CLI_C], 'Local Y (exemplo)', 3],
    ['13:00', 'Backup do material bruto na pasta do cliente', ['vid'], [], '', 3],
  ],
}

let n = 0
const modelo_demandas: ModeloDemanda[] = Object.entries(semana).flatMap(([dia, itens]) =>
  itens.map(([horario, titulo, papeis, cli = [], local = '', etapa], i) => ({
    id: uid('2', ++n),
    dia: Number(dia),
    horario,
    titulo,
    local,
    tipo: 'tarefa' as const,
    etapa_id: etapa ?? null,
    papeis,
    clientes: cli,
    ordem: i,
  })),
)

const rituais: Ritual[] = [
  ['Alinhamento semanal', 'Segunda, 08:30', '45 min', 'Todos', 'Resultados da semana, demandas e prazos. Sai com o quadro atualizado.'],
  ['Check-in', 'Quarta, 11:00', '15 min', 'Todos', 'Só bloqueios. Quem precisa de mais tempo marca à parte.'],
  ['Revisão de direção', 'Quinta, 09:00', '2 h', 'Direção e autores', 'Cada peça é aprovada ou devolvida com uma nota objetiva.'],
  ['Fechamento', 'Sexta, 16:00', '30 min', 'Todos', 'O que saiu, o que ficou e o que entra na próxima semana.'],
  ['Estratégia por cliente', 'Uma vez por mês', '', 'Direção', 'Objetivo do mês seguinte e ajustes na ficha do cliente.'],
  ['Relatório ao cliente', 'Primeira semana do mês', '', 'Tráfego, Social e Direção', 'Resultados do mês e próximos passos, em uma página. Sempre com enquadramento positivo, sem sugerir queda ou baixo desempenho.'],
].map(([nome, quando, duracao, participantes, saida], i) => ({ id: uid('3', i + 1), nome, quando, duracao, participantes, saida, ordem: i }))

let r = 0
const regra = (grupo: Regra['grupo'], textos: [string, string?][]): Regra[] =>
  textos.map(([texto, detalhe = ''], i) => ({ id: uid('4', ++r), grupo, texto, detalhe, ordem: i }))

const regras: Regra[] = [
  ...regra('comunicacao', [
    ['Um canal por cliente e um canal geral do time'],
    ['Pedido novo só vale depois de virar card no quadro'],
    ['Resposta interna em até 4 horas úteis'],
    ['Urgência de verdade vai por ligação'],
    ['Quem aprova no cliente é sempre uma pessoa só'],
  ]),
  ...regra('padroes', [
    ['Nome do arquivo: AAAA-MM-DD_cliente_formato_vN', '2026-10-12_clientea_reel_v2'],
    ['Pasta do cliente', 'Cliente / AAAA-MM / Bruto, Editado, Artes, Aprovado'],
  ]),
  ...regra('primeira_semana', [
    ['Dia 1: ler o Método Martt e o ecossistema inteiro. Entrar nos canais do time.'],
    ['Dia 2: ler a ficha dos clientes que vai atender.'],
    ['Dia 3: acompanhar uma demanda do início ao fim ao lado da Direção.'],
    ['Dia 4: executar uma demanda pequena, com revisão.'],
    ['Dia 5: participar do fechamento e sugerir um ajuste na estrutura.'],
  ]),
  ...regra('metodo', [
    ['Nada vai ao cliente sem passar pela revisão da Direção.'],
    ['Toda demanda vira card antes de ser executada.'],
  ]),
  ...regra('cliente', [['Conhece o próprio negócio'], ['Transmite o que sabe e vive'], ['Participa das gravações e das aprovações']]),
  ...regra('martt', [['Pensa e estrutura'], ['Direciona e produz'], ['Organiza e acompanha']]),
]

export const SEED: Base = {
  papeis: [
    { id: 'dir', nome: 'Direção', sigla: 'DIR', cor: '#5E8C77', cor_escura: '#8FB5A3', ordem: 0,
      missao: 'Definir como o cliente é percebido e garantir que tudo o que sai entregue isso.',
      entrega: 'Estratégia por cliente, pauta da semana, revisão final.',
      recebe_de: 'Objetivo do cliente e a análise do ciclo anterior.',
      passa_para: 'Pauta aprovada, briefings e feedbacks para o time.',
      metrica: 'Conteúdos aprovados na primeira revisão.' },
    { id: 'soc', nome: 'Social media', sigla: 'SOC', cor: '#5F7FA6', cor_escura: '#8FA9CC', ordem: 1,
      missao: 'Transformar a pauta em conteúdo organizado e publicado.',
      entrega: 'Calendário editorial, roteiros, legendas, agendamento e respostas.',
      recebe_de: 'Pauta da Direção e cortes da decupagem.',
      passa_para: 'Roteiro ao videomaker, briefing ao designer, posts finais à Direção.',
      metrica: 'Posts publicados no prazo.' },
    { id: 'vid', nome: 'Videomaker', sigla: 'VID', cor: '#A47C2A', cor_escura: '#D2A94F', ordem: 2,
      missao: 'Captar e editar o material que sustenta o conteúdo.',
      entrega: 'Gravação, edição e decupagem com cortes extras.',
      recebe_de: 'Roteiro, local e horário da gravação.',
      passa_para: 'Vídeos editados na pasta do cliente e cortes extras à Social.',
      metrica: 'Entregas no prazo e material reaproveitado por gravação.' },
    { id: 'des', nome: 'Designer', sigla: 'DES', cor: '#94699A', cor_escura: '#BE93C4', ordem: 3,
      missao: 'Dar forma visual consistente à marca de cada cliente.',
      entrega: 'Artes de feed, capas de Reels, stories e criativos de anúncio.',
      recebe_de: 'Briefing da Social e do Tráfego.',
      passa_para: 'Arquivos finais nomeados na pasta do cliente.',
      metrica: 'Artes aprovadas sem retrabalho.' },
    { id: 'tra', nome: 'Gestor de tráfego', sigla: 'TRA', cor: '#B0675A', cor_escura: '#D58C7F', ordem: 4,
      missao: 'Colocar o conteúdo certo diante de quem pode comprar.',
      entrega: 'Campanhas, verba, testes de criativo e relatórios.',
      recebe_de: 'Objetivo da Direção e peças da Social e do Designer.',
      passa_para: 'Relatório semanal e recomendações à Direção.',
      metrica: 'Custo por resultado e relatório no prazo.' },
  ],
  pessoas: [
    { id: ID_MARCIO, user_id: null, nome: 'Marcio', email: null, papel_id: 'dir', nivel: 'direcao', ativo: true },
  ],
  clientes,
  modelo_dias: [
    { dia: 1, nome: 'Segunda', sigla: 'Seg', funcao: 'Planejamento e demandas' },
    { dia: 2, nome: 'Terça', sigla: 'Ter', funcao: 'Pré-produção' },
    { dia: 3, nome: 'Quarta', sigla: 'Qua', funcao: 'Produção' },
    { dia: 4, nome: 'Quinta', sigla: 'Qui', funcao: 'Revisão e aprovação' },
    { dia: 5, nome: 'Sexta', sigla: 'Sex', funcao: 'Publicação e fechamento' },
    { dia: 6, nome: 'Sábado', sigla: 'Sáb', funcao: 'Livre e plantão' },
    { dia: 7, nome: 'Domingo', sigla: 'Dom', funcao: 'Gravação' },
  ],
  modelo_demandas,
  etapas: [
    [1, 'Ideação', 'Transformar conhecimento, experiências, dúvidas e oportunidades em ideias.', ['dir', 'soc'], 'Segunda', 'Ideias da semana no quadro, ligadas ao objetivo do cliente.'],
    [2, 'Roteirização', 'Transformar a ideia em roteiro e direcionamento simples para gravação.', ['soc'], 'Segunda e terça', 'Roteiro simples aprovado pela Direção.'],
    [3, 'Gravação', 'O cliente transmite o que sabe e vive, sem precisar parar para criar conteúdo.', ['vid', 'dir'], 'Domingo', 'Material bruto salvo e com backup na pasta do cliente.'],
    [4, 'Edição', 'Transformar a gravação em conteúdo claro e adequado ao digital.', ['vid', 'des'], 'Quarta', 'Vídeo e arte finais na pasta, nomeados no padrão.'],
    [5, 'Decupagem', 'Identificar cortes, frases e novos assuntos para aproveitar ao máximo o material.', ['vid', 'soc'], 'Quinta', 'Cortes extras e novas ideias listados para o próximo ciclo.'],
    [6, 'Publicação', 'Conteúdo organizado e publicado no canal e no formato certos.', ['soc', 'tra'], 'Sexta', 'No ar, com o link registrado no card.'],
    [7, 'Análise', 'Observar respostas e resultados para gerar novos insights.', ['tra', 'dir'], 'Sexta e todo mês', 'Números lidos e um aprendizado levado à próxima ideação.'],
  ].map(([id, nome, descricao, responsaveis, quando, pronto_quando]) => ({
    id: id as number, ordem: id as number, nome: nome as string, descricao: descricao as string,
    responsaveis: responsaveis as string[], quando: quando as string, pronto_quando: pronto_quando as string,
  })),
  rituais,
  regras,
}
