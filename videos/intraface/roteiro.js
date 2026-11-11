// Roteiro do vídeo "Intraface Radiologia — 20 anos".
//
// Cada bloco é um trecho com UMA foto de fundo e uma sequência de textos.
//   foto:  nome do espaço de foto (veja FOTOS abaixo). null = tela preta.
//   tom:   "antigo" (memória, levemente sépia) ou "cor" (presente).
//   textos: cada item aparece, fica um tempo e sai.
//     tipo: "frase" (padrão), "capitulo", "ano", "titulo", "lista", "final"
//     dur:  segundos na tela (opcional; se faltar, é calculado pelo tamanho)
//
// Para trocar uma foto, coloque o arquivo em fotos/ e escreva o nome em FOTOS.
// Pode listar mais de um arquivo no mesmo espaço: eles se alternam no trecho.

window.FOTOS = {
  trindade: [],            // Trindade antiga
  fundadoras: [],          // as três sócias fundadoras
  primeiraClinica: [],     // a primeira clínica (2004)
  primeirosAnos: [],       // equipamentos antigos, registros dos primeiros anos
  simoneTrajetoria: [],    // Dra. Simone ao longo dos anos
  evolucao: [],            // estrutura ampliada, equipamentos novos
  maysa: [],               // 2020: fachada e inauguração do Setor Maysa
  familia: [],             // Dra. Simone com a família
  equipe: [],              // colaboradores, antigos e atuais
  hoje: [],                // instalações atuais, parceiros, pacientes
  simoneEspecial: [],      // fotos especiais da Dra. Simone (homenagem)
  gratidao: [],            // fundadoras, família, colaboradores, parceiros
  fachada: [],             // fachada atual da Intraface
  finalTodos: [],          // Dra. Simone com a família e os colaboradores
};

// Arquivo de logomarca da Intraface (coloque em fotos/). Vazio = nome em texto.
window.LOGO = "";

// Trilha (coloque em trilha/). Vazio = vídeo sem som.
window.TRILHA = "";

window.ROTEIRO = [
  // ABERTURA
  { foto: null, textos: [
    { t: "Toda grande história começa com um sonho.", dur: 5.5 },
    { t: "Mas algumas vão além dos sonhos.", dur: 4.5 },
    { t: "São construídas com coragem, renúncias<br>e amor pelo que se faz.", dur: 6 },
  ]},
  { foto: "trindade", tom: "antigo", textos: [
    { tipo: "titulo", t: "INTRAFACE RADIOLOGIA", sub: "Uma história de sonhos, coragem, amor e superação", dur: 7 },
  ]},

  // I — ONDE TUDO COMEÇOU
  { foto: "trindade", tom: "antigo", textos: [
    { tipo: "capitulo", n: "I", t: "Onde tudo começou", dur: 4.5 },
    { tipo: "ano", t: "2004", dur: 4 },
  ]},
  { foto: "fundadoras", tom: "antigo", textos: [
    { t: "Três sócias.<br>Um sonho compartilhado." },
    { t: "Conhecimento, determinação e coragem<br>para trazer a Trindade algo que a cidade ainda não tinha." },
  ]},
  { foto: "primeiraClinica", tom: "antigo", textos: [
    { t: "Nascia a primeira clínica de radiologia<br>odontológica de Trindade." },
    { t: "Pequena na estrutura.<br><em>Grande no propósito.</em>" },
  ]},

  // II — OS PRIMEIROS DESAFIOS
  { foto: "primeirosAnos", tom: "antigo", textos: [
    { tipo: "capitulo", n: "II", t: "Os primeiros desafios", dur: 4.5 },
    { t: "Não havia secretária.<br>Nem técnico em saúde bucal." },
    { t: "Elas mesmas recebiam os pacientes,<br>faziam os exames e escreviam os laudos." },
    { t: "Eram muitos papéis.<br>Mas nunca faltou a vontade de fazer dar certo." },
  ]},

  // III — UMA NOVA ETAPA
  { foto: "simoneTrajetoria", tom: "antigo", textos: [
    { tipo: "capitulo", n: "III", t: "Uma nova etapa", dur: 4.5 },
    { t: "O tempo passou, e a sociedade chegou ao fim." },
    { t: "A Dra. Simone assumiu, sozinha,<br>a missão de continuar aquele sonho." },
  ]},
  { foto: "evolucao", tom: "cor", textos: [
    { t: "Novos colaboradores. Estrutura ampliada.<br>Novas tecnologias." },
    { t: "Mais do que acompanhar o tempo,<br><em>a Intraface quis estar à frente dele.</em>" },
  ]},

  // IV — CORAGEM EM TEMPOS DE INCERTEZA
  { foto: null, textos: [
    { tipo: "ano", t: "2020", dur: 4 },
    { t: "O mundo parou.", dur: 3.5 },
    { t: "Medo. Incerteza. Sonhos adiados.", dur: 4.5 },
    { t: "Foi aí que ela decidiu avançar.", dur: 4.5 },
  ]},
  { foto: "maysa", tom: "cor", textos: [
    { t: "Em plena pandemia, nascia a segunda unidade:<br><em>Setor Maysa.</em>", dur: 6 },
    { t: "Um passo ousado, feito de coragem,<br>planejamento e determinação." },
    { t: "Acreditar em um sonho também é<br>ter coragem para seguir em frente." },
  ]},

  // V — O AMOR QUE SUSTENTA OS SONHOS
  { foto: "familia", tom: "cor", textos: [
    { tipo: "capitulo", n: "IV", t: "O amor que sustenta os sonhos", dur: 4.5 },
    { t: "Nenhuma grande história é construída sozinha." },
    { t: "Uma família que compreendeu as ausências,<br>apoiou nos dias difíceis e celebrou cada vitória." },
    { t: "Por trás de uma mulher determinada,<br>existem abraços que fortalecem." },
  ]},

  // VI — UMA EQUIPE, MUITAS HISTÓRIAS
  { foto: "equipe", tom: "cor", textos: [
    { tipo: "capitulo", n: "V", t: "Uma equipe, muitas histórias", dur: 4.5 },
    { t: "Alguns estão aqui desde os primeiros capítulos." },
    { t: "Uma empresa não é feita de paredes<br>nem de equipamentos." },
    { t: "<em>É feita de pessoas.</em>", dur: 4 },
    { t: "De mãos que trabalham juntas<br>e corações que acreditam no mesmo propósito." },
  ]},

  // VII — MAIS DE DUAS DÉCADAS DE CONFIANÇA
  { foto: "hoje", tom: "cor", textos: [
    { t: "Mais de duas décadas de pioneirismo,<br>inovação e ética." },
    { t: "E algo que não se compra:", dur: 3.5 },
    { tipo: "lista", linhas: ["Confiança.", "Credibilidade.", "Respeito.", "Relações verdadeiras."], dur: 7 },
  ]},

  // HOMENAGEM
  { foto: "simoneEspecial", tom: "cor", textos: [
    { t: "<em>Dra. Simone...</em>", dur: 4.5 },
    { t: "Hoje é tempo de olhar para trás." },
    { tipo: "lista", linhas: ["O começo.", "As noites de preocupação.", "As decisões difíceis."], dur: 7 },
    { t: "E todas as conquistas<br>que um dia foram apenas sonhos." },
    { t: "Talvez o seu maior legado esteja<br>nas pessoas que você inspirou.", dur: 6.5 },
  ]},

  // GRATIDÃO
  { foto: "gratidao", tom: "cor", textos: [
    { tipo: "lista", titulo: "Gratidão", linhas: [
      "Às sócias fundadoras.",
      "À família.",
      "Aos colaboradores.",
      "Aos profissionais da odontologia.",
      "A cada paciente.",
    ], dur: 10 },
  ]},

  // ENCERRAMENTO
  { foto: "fachada", tom: "cor", textos: [
    { tipo: "lista", linhas: ["Começou com um sonho.", "Cresceu com trabalho.", "Superou desafios com coragem.", "E continua com amor."], dur: 9 },
    { t: "Dra. Simone,<br><em>que orgulho de tudo o que foi construído até aqui.</em>", dur: 6.5 },
  ]},
  { foto: null, textos: [
    { tipo: "titulo", logo: true, t: "INTRAFACE RADIOLOGIA", sub: "Mais de 20 anos de história, inovação e confiança", dur: 7 },
    { t: "Algumas histórias são contadas pelo tempo...", dur: 4.5 },
    { t: "As mais bonitas permanecem<br>no coração das pessoas.", dur: 5 },
    { t: "E essa história...<br><em>ainda está sendo escrita.</em>", dur: 6 },
    { tipo: "pausa", dur: 2.5 },
  ]},
  { foto: "finalTodos", tom: "cor", textos: [
    { tipo: "final", linhas: [
      "Há histórias que construímos.",
      "E há histórias que nos transformam.",
      "<em>Obrigado, Dra. Simone, por fazer parte da nossa.</em>",
    ], dur: 11 },
    { tipo: "pausa", dur: 3 },
  ]},
];
