// Estúdio de design MARTT: transforma uma peça (JSON) em HTML de prévia + PNGs prontos para postar.
//
// Uso:  node design/gerar.mjs design/clientes/<cliente>/pecas/<AAAA-MM-DD-nome>/peca.json
// Saída (na pasta da peça): previa.html (todas as telas lado a lado) e 01.png, 02.png...
//
// A identidade vem de design/clientes/<cliente>/marca.json. Para mudar o visual de um cliente,
// altere só a marca.json e gere de novo.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const FORMATOS = {
  feed: [1080, 1350],      // post e carrossel do Instagram (4:5)
  quadrado: [1080, 1080],
  stories: [1080, 1920],   // stories e capa de reels (9:16)
  paisagem: [1920, 1080],  // capa de YouTube, apresentação
};
const LAYOUTS = ["capa", "texto", "lista", "numero", "citacao", "foto", "cta", "foto-frase", "bloco", "horario", "atos"];
// layouts "menos é mais": sem rodapé de @ e numeração, salvo pedido explícito
const MINIMOS = ["foto-frase", "bloco", "horario", "atos"];

const esc = (s = "") => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// *palavra* vira destaque na cor da marca; quebra de linha vira <br>
// **palavra** fica em negrito (mesma cor); *palavra* sai na cor de destaque; quebra de linha vira <br>
const rico = (s = "") => esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>").replace(/\n/g, "<br>");

function carregar(arquivo) {
  const peca = JSON.parse(fs.readFileSync(arquivo, "utf8"));
  const pastaPeca = path.dirname(path.resolve(arquivo));
  const pastaCliente = path.resolve(pastaPeca, "..", "..");
  const marca = JSON.parse(fs.readFileSync(path.join(pastaCliente, "marca.json"), "utf8"));
  const erros = [];
  if (!FORMATOS[peca.formato]) erros.push(`formato "${peca.formato}" (use: ${Object.keys(FORMATOS).join(", ")})`);
  if (!Array.isArray(peca.telas) || !peca.telas.length) erros.push("telas (lista vazia)");
  (peca.telas || []).forEach((t, i) => {
    if (!LAYOUTS.includes(t.layout)) erros.push(`tela ${i + 1}: layout "${t.layout}" (use: ${LAYOUTS.join(", ")})`);
  });
  if (erros.length) throw new Error("Peça inválida:\n- " + erros.join("\n- "));
  return { peca, marca, pastaPeca, pastaCliente };
}

function css(marca, [w, h]) {
  const c = marca.cores, f = marca.fontes;
  const u = w / 1080; // escala: tudo foi desenhado em 1080 de largura
  return `
  :root{--escuro:${c.escuro};--claro:${c.claro};--tx-e:${c.texto_escuro};--tx-c:${c.texto_claro};
    --dest:${c.destaque};--dest-f:${c.destaque_forte};--apoio:${c.apoio};--suave:${c.suave};--u:${u}px}
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#2a2b29;font-family:'${f.texto}',system-ui,sans-serif;font-weight:${f.texto_peso}}
  .grade{display:flex;flex-wrap:wrap;gap:40px;padding:40px;justify-content:center}
  .grade .tela{zoom:.4}
  .tela{width:${w}px;height:${h}px;position:relative;overflow:hidden;display:flex;flex-direction:column;
    padding:calc(96*var(--u)) calc(88*var(--u)) calc(84*var(--u))}
  ${h / w > 1.6 ? ".tela{padding-top:calc(220*var(--u));padding-bottom:calc(260*var(--u))}" : ""}  /* stories: área livre da interface do Instagram */
  .tema-escuro{background:var(--escuro);color:var(--tx-c)}
  .tema-claro{background:var(--claro);color:var(--tx-e)}
  .tema-destaque{background:var(--dest);color:var(--tx-e)}
  .tema-destaque em{color:var(--claro)!important}
  .tema-destaque .aspas{color:var(--escuro)}
  h1,h2,.num{font-family:'${f.titulo}',sans-serif;font-weight:${f.titulo_peso};letter-spacing:-.025em;line-height:1.04}
  h1{font-size:calc(118*var(--u))}
  h2{font-size:calc(80*var(--u));margin-bottom:calc(36*var(--u))}
  em{font-style:normal;color:var(--dest)}
  .tema-claro em{color:var(--dest-f)}
  .rotulo{font-weight:600;font-size:calc(24*var(--u));letter-spacing:.22em;text-transform:uppercase;
    display:flex;align-items:center;gap:calc(18*var(--u));margin-bottom:calc(40*var(--u));opacity:.85}
  .rotulo i{width:calc(46*var(--u));height:calc(4*var(--u));background:var(--dest)}
  .texto{font-size:calc(40*var(--u));line-height:1.45;max-width:calc(860*var(--u))}
  .meio{flex:1;display:flex;flex-direction:column;justify-content:center}
  .base{flex:1;display:flex;flex-direction:column;justify-content:flex-end}
  ul{list-style:none;display:flex;flex-direction:column;gap:calc(34*var(--u))}
  li{display:flex;gap:calc(28*var(--u));font-size:calc(42*var(--u));line-height:1.35}
  li b{font-family:'${f.titulo}',sans-serif;font-weight:${f.titulo_peso};color:var(--dest);min-width:calc(64*var(--u))}
  .tema-claro li b{color:var(--dest-f)}
  .num{font-size:calc(300*var(--u));color:var(--dest);line-height:.9;margin-bottom:calc(30*var(--u))}
  .tema-claro .num{color:var(--dest-f)}
  .aspas{font-family:'${f.titulo}',sans-serif;font-weight:800;font-size:calc(220*var(--u));line-height:.6;color:var(--dest);height:calc(110*var(--u))}
  .citacao{font-family:'${f.titulo}',sans-serif;font-weight:700;font-size:calc(64*var(--u));line-height:1.2;letter-spacing:-.02em}
  .autor{margin-top:calc(40*var(--u));font-size:calc(30*var(--u));opacity:.75}
  .foto-bg{position:absolute;inset:0;background-size:cover;background-position:center}
  .foto-veu{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0) 35%,rgba(0,0,0,.78) 100%)}
  .tela.layout-foto{color:#fff}
  .tela>*:not(.foto-bg):not(.foto-veu){position:relative}
  .botao{display:inline-block;margin-top:calc(54*var(--u));padding:calc(30*var(--u)) calc(46*var(--u));
    font-weight:600;font-size:calc(34*var(--u));background:var(--dest);color:var(--tx-e);align-self:flex-start}
  .tema-destaque .botao{background:var(--escuro);color:var(--tx-c)}
  .rodape{display:flex;justify-content:space-between;align-items:center;margin-top:calc(48*var(--u));
    font-size:calc(24*var(--u));font-weight:600;letter-spacing:.14em;text-transform:uppercase;opacity:.7}
  .rodape .barra{display:inline-block;width:calc(40*var(--u));height:calc(10*var(--u));background:var(--dest);margin-right:calc(14*var(--u));vertical-align:middle}
  .tema-destaque .rodape .barra{background:var(--escuro)}
  .logo{mix-blend-mode:lighten;height:calc(110*var(--u));align-self:flex-start;margin-bottom:calc(20*var(--u))}
  .logo.sem-mistura{mix-blend-mode:normal}
  .seta{font-size:calc(30*var(--u))}

  /* ---- menos é mais ---- */
  .serifa{font-family:'${f.serifa || "Cormorant Garamond"}',serif;font-weight:500;letter-spacing:-.01em}
  .fio{width:calc(110*var(--u));height:calc(4*var(--u));background:currentColor;margin:calc(44*var(--u)) 0}
  .layout-foto-frase,.layout-horario,.layout-atos{color:#fff;background:#111}
  .layout-foto-frase .foto-veu{background:linear-gradient(180deg,rgba(0,0,0,.55) 0%,rgba(0,0,0,.08) 45%,rgba(0,0,0,.08) 60%,rgba(0,0,0,.6) 100%)}
  .frase{font-family:'${f.texto}',sans-serif;font-weight:300;text-transform:uppercase;font-size:calc(66*var(--u));line-height:1.12;letter-spacing:.005em}
  .frase strong{font-family:'${f.titulo}',sans-serif;font-weight:800;letter-spacing:-.01em}
  .frase em{color:inherit}
  .bloco-txt{display:flex;flex-direction:column;max-width:calc(860*var(--u))}
  .al-centro{align-self:center;align-items:center;text-align:center}
  .al-direita{align-self:flex-end;max-width:calc(440*var(--u))}
  .frase.est-fino{text-transform:none;font-weight:300;font-size:calc(84*var(--u));line-height:1.08;letter-spacing:-.01em}
  .frase.est-fino strong{font-weight:700}
  .frase.est-espacado{font-weight:400;font-size:calc(40*var(--u));letter-spacing:.24em;line-height:1.5}
  .frase.est-espacado strong{font-family:'${f.texto}',sans-serif;font-weight:700;letter-spacing:.24em}
  .arraste{margin-top:calc(40*var(--u));font-size:calc(24*var(--u));font-weight:600;letter-spacing:.18em}
  .seta-fio{display:block;height:calc(2*var(--u));background:currentColor;margin-bottom:calc(22*var(--u));position:relative;width:calc(300*var(--u))}
  .seta-fio::after{content:'';position:absolute;right:0;top:calc(-6*var(--u));border:calc(7*var(--u)) solid transparent;border-left-color:currentColor;border-right:0}
  .al-centro .seta-fio{margin-left:auto;margin-right:auto}
  .layout-foto-frase .veu-meio{background:rgba(0,0,0,.28)}
  .layout-foto-frase .veu-base{background:linear-gradient(180deg,rgba(0,0,0,.35) 0%,rgba(0,0,0,0) 30%,rgba(0,0,0,0) 50%,rgba(0,0,0,.65) 100%)}
  .marca-topo{height:calc(150*var(--u));object-fit:contain;align-self:flex-start;mix-blend-mode:lighten}
  .marca-txt{font-family:'${f.titulo}',sans-serif;font-weight:800;font-size:calc(40*var(--u))}
  .assinatura{font-family:'${f.titulo}',sans-serif;font-weight:700;font-style:italic;font-size:calc(52*var(--u));line-height:1.15}
  .layout-bloco{align-items:center;text-align:center}
  .bloco-frase{font-size:calc(124*var(--u));line-height:1.08;text-transform:uppercase}
  .bloco-assin{font-size:calc(24*var(--u));text-decoration:underline;opacity:.8;font-family:'${f.serifa || "Cormorant Garamond"}',serif}
  .hora{font-family:'${f.texto}',sans-serif;font-weight:300;font-size:calc(170*var(--u));letter-spacing:-.02em;text-shadow:0 2px 24px rgba(0,0,0,.35)}
  .layout-horario .foto-veu{background:rgba(0,0,0,.18)}
  .layout-atos{padding:0}
  .ato{flex:1;position:relative;background-size:cover;background-position:center;display:flex;padding:calc(56*var(--u)) calc(70*var(--u))}
  .ato::before{content:'';position:absolute;inset:0;background:linear-gradient(90deg,rgba(0,0,0,.3),rgba(0,0,0,.05) 50%,rgba(0,0,0,.3))}
  .ato>div{position:relative}
  .ato+.ato{border-top:calc(4*var(--u)) solid #111}
  .ato p{font-style:italic;font-size:calc(84*var(--u));line-height:1;text-shadow:0 2px 20px rgba(0,0,0,.4)}
  .ato .fio{height:calc(2*var(--u));width:calc(220*var(--u));margin:calc(16*var(--u)) 0 0}
  .ato-dir{margin-left:auto;text-align:right;align-self:flex-end}.ato-dir .fio{margin-left:auto}
  .ato-esq{align-self:flex-start}
  `;
}

function tela(t, i, total, ctx) {
  const { marca, logos, formato } = ctx;
  const tema = t.tema || (t.layout === "capa" || t.layout === "cta" ? "escuro" : "claro");
  const rotulo = t.rotulo ? `<div class="rotulo"><i></i>${esc(t.rotulo)}</div>` : "";
  const texto = t.texto ? `<p class="texto">${rico(t.texto)}</p>` : "";
  let corpo = "";
  switch (t.layout) {
    case "capa":
      const logo = tema === "escuro" ? logos.escuro : logos.claro;
      corpo = `${logo && t.logo !== false ? `<img class="logo${tema === "escuro" ? "" : " sem-mistura"}" src="${logo}">` : ""}
        <div class="base">${rotulo}<h1>${rico(t.titulo)}</h1>${t.texto ? `<p class="texto" style="margin-top:calc(36*var(--u))">${rico(t.texto)}</p>` : ""}</div>`;
      break;
    case "texto":
      corpo = `<div class="meio">${rotulo}<h2>${rico(t.titulo)}</h2>${texto}</div>`;
      break;
    case "lista":
      corpo = `<div class="meio">${rotulo}<h2>${rico(t.titulo)}</h2><ul>${(t.itens || [])
        .map((it, k) => `<li><b>${String(k + 1).padStart(2, "0")}</b><span>${rico(it)}</span></li>`).join("")}</ul></div>`;
      break;
    case "numero":
      corpo = `<div class="meio">${rotulo}<div class="num">${esc(t.numero)}</div><h2>${rico(t.titulo)}</h2>${texto}</div>`;
      break;
    case "citacao":
      corpo = `<div class="meio"><div class="aspas">“</div><p class="citacao">${rico(t.titulo)}</p>${t.autor ? `<p class="autor">${esc(t.autor)}</p>` : ""}</div>`;
      break;
    case "foto":
      corpo = `<div class="foto-bg" style="background-image:url('${esc(t.imagem)}')"></div><div class="foto-veu"></div>
        <div class="base">${rotulo}<h2 style="margin-bottom:calc(20*var(--u))">${rico(t.titulo || "")}</h2>${texto}</div>`;
      break;
    case "foto-frase": {
      // posicao: topo | meio | base · alinhar: esquerda | centro | direita · estilo: caixa-alta | fino | espacado
      const pos = t.posicao || "topo";
      const al = t.alinhar || "esquerda";
      const est = t.estilo || "caixa-alta";
      const marcaTopo = t.logo === false ? "" : logos.escuro ? `<img class="marca-topo" src="${logos.escuro}">` : `<div class="marca-txt">${esc(marca.nome)}</div>`;
      const fio = t.fio === false ? "" : `<div class="fio"></div>`;
      const arraste = t.arraste ? `<div class="arraste"><span class="seta-fio"></span><span>${esc(t.arraste)}</span></div>` : "";
      const bloco = `<div class="bloco-txt al-${al}">${est === "caixa-alta" ? fio : ""}<p class="frase est-${est}">${rico(t.titulo)}</p>${arraste}</div>`;
      const assin = t.assinatura ? `<div class="bloco-txt al-${al}"><div class="fio"></div><p class="assinatura">${rico(t.assinatura)}</p></div>` : "";
      corpo = `<div class="foto-bg" style="background-image:url('${esc(t.imagem)}');background-position:${esc(t.foco || "center")}"></div><div class="foto-veu veu-${pos}"></div>
        ${marcaTopo}${pos === "topo" ? bloco : ""}
        ${pos === "meio" ? `<div class="meio">${bloco}</div>` : ""}
        ${pos === "base" || assin ? `<div class="base" style="${pos === "meio" ? "flex:0" : ""}">${pos === "base" ? bloco : ""}${assin}</div>` : ""}`;
      break;
    }
    case "bloco":
      corpo = `<div class="meio"><p class="serifa bloco-frase">${rico(t.titulo)}</p></div>
        <div class="bloco-assin">${esc(t.assinatura || marca.arroba || "")}</div>`;
      break;
    case "horario":
      corpo = `<div class="foto-bg" style="background-image:url('${esc(t.imagem)}');background-position:${esc(t.foco || "center")}"></div><div class="foto-veu"></div>
        <div class="meio" style="align-items:center"><div class="hora">${esc(t.titulo)}</div>${t.texto ? `<p class="texto" style="text-align:center">${rico(t.texto)}</p>` : ""}</div>`;
      break;
    case "atos":
      corpo = (t.atos || []).map((a, k) => `<div class="ato" style="background-image:url('${esc(a.imagem)}');background-position:${esc(a.foco || "center")}">
        <div class="${k % 2 ? "ato-esq" : "ato-dir"}"><p class="serifa">${rico(a.texto)}</p><div class="fio"></div></div></div>`).join("");
      break;
    case "cta":
      corpo = `<div class="meio">${rotulo}<h2>${rico(t.titulo)}</h2>${texto}${t.botao ? `<span class="botao">${esc(t.botao)}</span>` : ""}</div>`;
      break;
  }
  const carrossel = total > 1 && formato !== "stories";
  const dir = carrossel && i < total - 1 ? `<span class="seta">${i + 1}/${total} &nbsp;→</span>` : carrossel ? `<span>${i + 1}/${total}</span>` : "";
  const rodape = t.rodape === false || (MINIMOS.includes(t.layout) && t.rodape !== true) ? "" :
    `<div class="rodape"><span><span class="barra"></span>${esc(marca.arroba || marca.nome)}</span>${dir}</div>`;
  return `<section class="tela tema-${tema} layout-${t.layout}" id="t${i + 1}">${corpo}${rodape}</section>`;
}

function montar({ peca, marca, pastaPeca, pastaCliente }) {
  const tamanho = FORMATOS[peca.formato];
  const rel = (c) => {
    const abs = c ? path.resolve(pastaCliente, c) : null;
    return abs && fs.existsSync(abs) ? path.relative(pastaPeca, abs) : null;
  };
  const logos = { escuro: rel(marca.logo_fundo_escuro), claro: rel(marca.logo_fundo_claro) };
  if (marca.pendente) console.error(`Aviso: a marca de ${marca.nome} ainda está pendente (${marca.pendente}). Peça só para prévia.`);
  const ctx = { marca, logos, formato: peca.formato };
  // um <link> por fonte: se uma família não tiver um peso/itálico, as outras carregam mesmo assim
  const q = (n) => n.replace(/ /g, "+");
  const links = [
    `family=${q(marca.fontes.titulo)}:ital,wght@0,300;0,400;0,600;0,700;0,800;1,700`,
    `family=${q(marca.fontes.titulo)}:wght@300;400;600;700;800`,
    `family=${q(marca.fontes.texto)}:wght@300;400;600;700;800`,
    `family=${q(marca.fontes.serifa || "Cormorant Garamond")}:ital,wght@0,500;1,500`,
  ].map((f) => `<link href="https://fonts.googleapis.com/css2?${f}&display=swap" rel="stylesheet">`).join("\n");
  const telas = peca.telas.map((t, i) => tela(t, i, peca.telas.length, ctx)).join("\n");
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(peca.titulo || "Peça")} · ${esc(marca.nome)}</title>
${links}
<style>${css(marca, tamanho)}</style></head>
<body><div class="grade">${telas}</div></body></html>`;
}

async function exportar(arquivo) {
  const dados = carregar(arquivo);
  const html = montar(dados);
  const previa = path.join(dados.pastaPeca, "previa.html");
  fs.writeFileSync(previa, html);

  const { chromium } = require("playwright");
  const [w, h] = FORMATOS[dados.peca.formato];
  const nav = await chromium.launch();
  const pagina = await nav.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await pagina.goto("file://" + previa);
  await pagina.addStyleTag({ content: ".grade{display:block;padding:0}.grade .tela{zoom:1}body{background:none}" });
  await pagina.evaluate(() => document.fonts.ready);
  await pagina.waitForLoadState("networkidle");
  const saidas = [];
  for (let i = 0; i < dados.peca.telas.length; i++) {
    const nome = path.join(dados.pastaPeca, String(i + 1).padStart(2, "0") + ".png");
    await pagina.locator(`#t${i + 1}`).screenshot({ path: nome });
    saidas.push(nome);
  }
  await nav.close();
  console.log([previa, ...saidas].join("\n"));
}

if (process.argv.length !== 3) {
  console.error("Uso: node design/gerar.mjs design/clientes/<cliente>/pecas/<pasta>/peca.json");
  process.exit(1);
}
exportar(process.argv[2]).catch((e) => { console.error(e.message || e); process.exit(1); });
