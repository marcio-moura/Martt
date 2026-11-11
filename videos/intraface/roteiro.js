// Roteiro do vídeo "Intraface Radiologia — 20 anos" (versão curta, ~3 min).
//
// Cada item aparece na tela, fica um tempo e sai, na ordem da lista.
//   foto: arquivo de fotos/ que fica ao fundo A PARTIR deste item (continua até outra
//         foto ser indicada). foto: null = tela preta. "3d:logo" = logo em 3D (cena3d.js).
//   tom:  "antigo" (memória, levemente sépia) ou "cor" (presente). Acompanha a foto.
//   tipo: "frase" (padrão), "ano", "titulo", "lista", "final", "respiro" (só a imagem, sem texto)
//   dur:  segundos (opcional; se faltar, é calculado pelo tamanho da frase)
//
// As fotos de fotos/ são geradas por preparar-fotos.py a partir de fotos/originais/.

window.LOGO = "";      // a logo do fechamento agora é a cena 3D
window.TRILHA = "trilha.mp3";    // música em trilha/ (vazio = sem som)

const A = "antigo", C = "cor";
const r = (foto, tom = C, dur = 2) => ({ foto, tom, tipo: "respiro", dur });

window.ROTEIRO = [
  // ABERTURA
  { foto: null, t: "Toda grande história começa com um sonho.", dur: 4.5 },
  { tipo: "titulo", t: "INTRAFACE RADIOLOGIA", sub: "Uma história de sonhos, coragem, amor e superação", dur: 6 },

  // 2004
  { tipo: "ano", t: "2004", dur: 3.5 },
  r("22.jpg", A, 2.2),
  { t: "Três sócias.<br>Um sonho compartilhado.", dur: 4 },
  r("19.jpg", A),
  { t: "Nascia a primeira clínica de radiologia<br>odontológica de Trindade.", dur: 4.8 },
  r("14.jpg", A),
  { t: "Sem secretária, sem técnico.<br>Elas mesmas recebiam, examinavam e laudavam.", dur: 5 },
  r("07.jpg", A),
  { t: "Mas nunca faltou a vontade de fazer dar certo.", dur: 4.2 },

  // A DRA. SIMONE SEGUE
  r("13.jpg", A),
  { t: "Quando a sociedade chegou ao fim,<br><em>a Dra. Simone seguiu sozinha.</em>", dur: 5 },
  r("11.jpg", C),
  { t: "Nova equipe. Nova estrutura.<br>Novas tecnologias.", dur: 4.2 },
  r("18.jpg", C),
  { t: "E o trabalho sério virou reconhecimento.", dur: 4 },
  r("17.jpg", C, 2.6),

  // 2020
  { foto: null, tipo: "ano", t: "2020", dur: 3.5 },
  { t: "O mundo parou.", dur: 3 },
  { t: "Ela decidiu avançar.", dur: 3.2 },
  { t: "Em plena pandemia, nascia a segunda unidade:<br><em>Setor Maysa.</em>", dur: 5.2 },

  // FAMÍLIA E EQUIPE
  r("03.jpg", C),
  { t: "Nenhuma grande história é construída sozinha.", dur: 4.2 },
  r("05.jpg", C),
  { t: "Por trás de uma mulher determinada,<br>existem abraços que fortalecem.", dur: 4.8 },
  r("15.jpg", C),
  { t: "Uma empresa não é feita de paredes.", dur: 3.8 },
  r("06.jpg", C, 1.6),
  { t: "<em>É feita de pessoas.</em>", dur: 3.4 },
  r("09.jpg", C, 1.7),
  r("16.jpg", C, 1.7),
  r("21.jpg", C, 1.7),

  // HOJE E HOMENAGEM
  r("20.jpg", C),
  { t: "Mais de 20 anos de confiança,<br>credibilidade e respeito.", dur: 4.6 },
  { foto: null, t: "<em>Dra. Simone...</em>", dur: 3.5 },
  r("08.jpg", C),
  { t: "Talvez o seu maior legado esteja<br>nas pessoas que você inspirou.", dur: 5.2 },
  { foto: "02.jpg", tom: C, tipo: "lista", titulo: "Gratidão", linhas: [
    "Às sócias fundadoras.",
    "À família.",
    "Aos colaboradores.",
    "Aos parceiros da odontologia.",
    "A cada paciente.",
  ], dur: 8.5 },

  // ENCERRAMENTO
  r("3d:logo", C, 3.4),
  { t: "<em>Mais de 20 anos de história, inovação e confiança.</em>", dur: 4.4 },
  { foto: null, t: "E essa história...<br><em>ainda está sendo escrita.</em>", dur: 5 },
  { tipo: "respiro", dur: 1.8 },
  r("01.jpg", C, 1.8),
  { tipo: "final", linhas: [
    "Há histórias que construímos.",
    "E há histórias que nos transformam.",
    "<em>Obrigado, Dra. Simone, por fazer parte da nossa.</em>",
  ], dur: 9 },
  { tipo: "respiro", dur: 2.5 },
];
