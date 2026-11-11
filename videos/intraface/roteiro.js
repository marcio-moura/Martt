// Roteiro do vídeo "Intraface Radiologia — 20 anos".
//
// Cada item aparece na tela, fica um tempo e sai, na ordem da lista.
//   foto: arquivo de fotos/ que fica ao fundo A PARTIR deste item (continua até outra
//         foto ser indicada). foto: null = tela preta.
//   tom:  "antigo" (memória, levemente sépia) ou "cor" (presente). Acompanha a foto.
//   tipo: "frase" (padrão), "capitulo", "ano", "titulo", "lista", "final", "respiro"
//         ("respiro" = só a foto, sem texto)
//   dur:  segundos (opcional; se faltar, é calculado pelo tamanho da frase)
//
// As fotos de fotos/ são geradas por preparar-fotos.py a partir de fotos/originais/.

window.LOGO = "";      // logomarca em fotos/ (vazio = nome em texto)
window.TRILHA = "";    // música em trilha/ (vazio = sem som)

const A = "antigo", C = "cor";

window.ROTEIRO = [
  // ABERTURA
  { foto: null, t: "Toda grande história começa com um sonho.", dur: 5.5 },
  { t: "Mas algumas vão além dos sonhos.", dur: 4.5 },
  { t: "São construídas com coragem, renúncias<br>e amor pelo que se faz.", dur: 6 },
  { tipo: "titulo", t: "INTRAFACE RADIOLOGIA", sub: "Uma história de sonhos, coragem, amor e superação", dur: 7 },

  // I — ONDE TUDO COMEÇOU
  { tipo: "capitulo", n: "I", t: "Onde tudo começou", dur: 4.5 },
  { tipo: "ano", t: "2004", dur: 4 },
  { t: "Três sócias.<br>Um sonho compartilhado." },
  { t: "Conhecimento, determinação e coragem<br>para trazer a Trindade algo que a cidade ainda não tinha." },
  { t: "Nascia a primeira clínica de radiologia<br>odontológica de Trindade." },
  { t: "Pequena na estrutura.<br><em>Grande no propósito.</em>" },

  // II — OS PRIMEIROS DESAFIOS
  { tipo: "capitulo", n: "II", t: "Os primeiros desafios", dur: 4.5 },
  { foto: "14.jpg", tom: A, tipo: "respiro", dur: 3 },
  { t: "Não havia secretária.<br>Nem técnico em saúde bucal." },
  { t: "Elas mesmas recebiam os pacientes,<br>faziam os exames e escreviam os laudos." },
  { foto: "07.jpg", tom: A, tipo: "respiro", dur: 3 },
  { t: "Eram muitos papéis.<br>Mas nunca faltou a vontade de fazer dar certo." },
  { foto: "12.jpg", tom: A, tipo: "respiro", dur: 3 },
  { t: "Ano após ano, a Intraface foi conquistando<br>espaço e a confiança da cidade." },

  // III — UMA NOVA ETAPA
  { foto: null, tipo: "capitulo", n: "III", t: "Uma nova etapa", dur: 4.5 },
  { t: "O tempo passou, e a sociedade chegou ao fim." },
  { foto: "13.jpg", tom: A, tipo: "respiro", dur: 2.5 },
  { t: "A Dra. Simone assumiu, sozinha,<br>a missão de continuar aquele sonho." },
  { foto: "11.jpg", tom: C, tipo: "respiro", dur: 3 },
  { t: "Novos colaboradores. Estrutura ampliada.<br>Novas tecnologias." },
  { foto: "08.jpg", tom: C, tipo: "respiro", dur: 3 },
  { t: "Mais do que acompanhar o tempo,<br><em>a Intraface quis estar à frente dele.</em>" },

  // IV — CORAGEM EM TEMPOS DE INCERTEZA
  { foto: null, tipo: "ano", t: "2020", dur: 4 },
  { t: "O mundo parou.", dur: 3.5 },
  { t: "Medo. Incerteza. Sonhos adiados.", dur: 4.5 },
  { t: "Foi aí que ela decidiu avançar.", dur: 4.5 },
  { t: "Em plena pandemia, nascia a segunda unidade:<br><em>Setor Maysa.</em>", dur: 6 },
  { t: "Acreditar em um sonho também é<br>ter coragem para seguir em frente.", dur: 6 },

  // V — O AMOR QUE SUSTENTA OS SONHOS
  { tipo: "capitulo", n: "IV", t: "O amor que sustenta os sonhos", dur: 4.5 },
  { foto: "03.jpg", tom: C, tipo: "respiro", dur: 3 },
  { t: "Nenhuma grande história é construída sozinha." },
  { foto: "04.jpg", tom: C, tipo: "respiro", dur: 2.5 },
  { t: "Uma família que compreendeu as ausências,<br>apoiou nos dias difíceis e celebrou cada vitória." },
  { foto: "05.jpg", tom: C, tipo: "respiro", dur: 2.5 },
  { t: "Por trás de uma mulher determinada,<br>existem abraços que fortalecem." },

  // VI — UMA EQUIPE, MUITAS HISTÓRIAS
  { foto: null, tipo: "capitulo", n: "V", t: "Uma equipe, muitas histórias", dur: 4.5 },
  { foto: "15.jpg", tom: C, tipo: "respiro", dur: 3 },
  { t: "Alguns estão aqui desde os primeiros capítulos." },
  { foto: "09.jpg", tom: C, tipo: "respiro", dur: 2.5 },
  { t: "Uma empresa não é feita de paredes<br>nem de equipamentos." },
  { foto: "16.jpg", tom: C, tipo: "respiro", dur: 2.5 },
  { t: "<em>É feita de pessoas.</em>", dur: 4 },
  { foto: "06.jpg", tom: C, tipo: "respiro", dur: 3 },
  { t: "De mãos que trabalham juntas<br>e corações que acreditam no mesmo propósito." },

  // VII — MAIS DE DUAS DÉCADAS DE CONFIANÇA
  { foto: "10.jpg", tom: C, tipo: "respiro", dur: 3 },
  { t: "Mais de duas décadas de pioneirismo,<br>inovação e ética." },
  { foto: "02.jpg", tom: C, tipo: "respiro", dur: 3 },
  { t: "E algo que não se compra:", dur: 3.5 },
  { tipo: "lista", linhas: ["Confiança.", "Credibilidade.", "Respeito.", "Relações verdadeiras."], dur: 7 },

  // HOMENAGEM
  { foto: null, t: "<em>Dra. Simone...</em>", dur: 4.5 },
  { foto: "08.jpg", tom: C, tipo: "respiro", dur: 3 },
  { t: "Hoje é tempo de olhar para trás." },
  { foto: "14.jpg", tom: A, tipo: "lista", linhas: ["O começo.", "As noites de preocupação.", "As decisões difíceis."], dur: 7 },
  { foto: "12.jpg", tom: A, t: "E todas as conquistas<br>que um dia foram apenas sonhos." },
  { foto: "01.jpg", tom: C, tipo: "respiro", dur: 3 },
  { t: "Talvez o seu maior legado esteja<br>nas pessoas que você inspirou.", dur: 6.5 },

  // GRATIDÃO
  { foto: "02.jpg", tom: C, tipo: "lista", titulo: "Gratidão", linhas: [
    "Às sócias fundadoras.",
    "À família.",
    "Aos colaboradores.",
    "Aos profissionais da odontologia.",
    "A cada paciente.",
  ], dur: 10 },

  // ENCERRAMENTO
  { foto: "06.jpg", tom: C, tipo: "lista", linhas: ["Começou com um sonho.", "Cresceu com trabalho.", "Superou desafios com coragem.", "E continua com amor."], dur: 9 },
  { foto: "03.jpg", tom: C, t: "Dra. Simone,<br><em>que orgulho de tudo o que foi construído até aqui.</em>", dur: 6.5 },
  { foto: null, tipo: "titulo", logo: true, t: "INTRAFACE RADIOLOGIA", sub: "Mais de 20 anos de história, inovação e confiança", dur: 7 },
  { t: "Algumas histórias são contadas pelo tempo...", dur: 4.5 },
  { t: "As mais bonitas permanecem<br>no coração das pessoas.", dur: 5 },
  { t: "E essa história...<br><em>ainda está sendo escrita.</em>", dur: 6 },
  { tipo: "respiro", dur: 2.5 },
  { foto: "05.jpg", tom: C, tipo: "respiro", dur: 3 },
  { tipo: "final", linhas: [
    "Há histórias que construímos.",
    "E há histórias que nos transformam.",
    "<em>Obrigado, Dra. Simone, por fazer parte da nossa.</em>",
  ], dur: 11 },
  { foto: "01.jpg", tom: C, tipo: "respiro", dur: 5 },
];
