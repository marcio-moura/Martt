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
const LAYOUTS = ["capa", "texto", "lista", "numero", "citacao", "foto", "cta"];

const esc = (s = "") => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// *palavra* vira destaque na cor da marca; quebra de linha vira <br>
const rico = (s = "") => esc(s).replace(/\*(.+?)\*/g, "<em>$1</em>").replace(/\n/g, "<br>");

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
    case "cta":
      corpo = `<div class="meio">${rotulo}<h2>${rico(t.titulo)}</h2>${texto}${t.botao ? `<span class="botao">${esc(t.botao)}</span>` : ""}</div>`;
      break;
  }
  const carrossel = total > 1 && formato !== "stories";
  const dir = carrossel && i < total - 1 ? `<span class="seta">${i + 1}/${total} &nbsp;→</span>` : carrossel ? `<span>${i + 1}/${total}</span>` : "";
  const rodape = t.rodape === false ? "" :
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
  const fam = [marca.fontes.titulo, marca.fontes.texto]
    .map((n) => `family=${n.replace(/ /g, "+")}:wght@400;600;700;800`).join("&");
  const telas = peca.telas.map((t, i) => tela(t, i, peca.telas.length, ctx)).join("\n");
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(peca.titulo || "Peça")} · ${esc(marca.nome)}</title>
<link href="https://fonts.googleapis.com/css2?${fam}&display=swap" rel="stylesheet">
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
