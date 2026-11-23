// Semana Black Infinity: story de abertura + arte-mãe de oferta (layout fixo; troca só foto e dados).
// Uso: node semana-black.mjs   (lê ofertas.json e gera abertura.png e oferta-01.png, oferta-02.png...)
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const aqui = path.dirname(new URL(import.meta.url).pathname);
const cfg = JSON.parse(fs.readFileSync(path.join(aqui, "ofertas.json"), "utf8"));
const esc = (s = "") => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const existe = (f) => f && fs.existsSync(path.join(aqui, f));

// logo original: se o arquivo não existir, aparece um espaço marcado para não passar despercebido
const logo = existe(cfg.logo)
  ? `<img class="logo" src="${cfg.logo}">`
  : `<div class="logo logo-falta">LOGO INFINITY<br><small>(enviar arquivo original)</small></div>`;

const css = `
*{margin:0;padding:0;box-sizing:border-box}
body{background:#000}
.st{width:1080px;height:1920px;position:relative;overflow:hidden;color:#fff;font-family:'Inter',sans-serif;
  background:radial-gradient(120% 70% at 100% 40%,#3a3b3d 0%,#1a1b1c 38%,#0a0a0a 70%,#000 100%)}
.foto{position:absolute;inset:0;background-size:cover;background-position:center}
.veu{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.78) 0%,rgba(0,0,0,.25) 34%,rgba(0,0,0,0) 55%,rgba(0,0,0,.55) 100%)}
.logo{position:absolute;top:220px;left:90px;height:96px;max-width:420px;object-fit:contain}
.logo-falta{border:3px dashed #F5C400;color:#F5C400;font:700 26px/1.25 'Inter',sans-serif;padding:14px 22px;height:auto;text-align:center}
.logo-falta small{font-weight:400;font-size:18px}
/* abertura */
.titulo{position:absolute;left:90px;right:90px;top:360px;font-family:'Anton',sans-serif;font-size:300px;line-height:.86;
  text-transform:uppercase;letter-spacing:-.005em}
.titulo .barra{display:block;width:180px;height:22px;background:#F5C400;margin:0 0 34px 6px}
.ponto{position:absolute;width:14px;height:14px;background:#F5C400;border-radius:50%}
/* oferta */
.selo{position:absolute;top:214px;right:90px;width:220px;height:110px;background:#F5C400;color:#000;
  clip-path:polygon(0 0,100% 0,100% 72%,50% 100%,0 72%);display:flex;flex-direction:column;align-items:center;justify-content:center;
  font-family:'Anton',sans-serif;text-transform:uppercase;line-height:.92;padding-bottom:16px}
.selo b{font-size:38px;font-weight:400}.selo span{font-size:46px}
.palco{position:absolute;left:0;right:0;top:380px;height:880px;display:flex;align-items:center;justify-content:center}
.palco::before{content:'';position:absolute;width:760px;height:760px;border-radius:50%;
  background:radial-gradient(circle,rgba(255,255,255,.16) 0%,rgba(255,255,255,.05) 45%,rgba(255,255,255,0) 70%)}
.aparelho{position:relative;max-height:820px;max-width:760px;object-fit:contain;
  filter:drop-shadow(0 40px 50px rgba(0,0,0,.75)) drop-shadow(0 0 2px rgba(255,255,255,.55)) drop-shadow(-14px 0 26px rgba(255,255,255,.14))}
.aparelho-falta{position:relative;width:420px;height:780px;border:3px dashed #777;border-radius:60px;color:#999;
  display:flex;align-items:center;justify-content:center;text-align:center;font:600 30px/1.3 'Inter',sans-serif;padding:30px}
.dados{position:absolute;left:90px;right:90px;top:1310px}
.modelo{font-family:'Inter',sans-serif;font-weight:800;font-size:64px;line-height:1.05;letter-spacing:-.02em}
.fio{width:100%;height:2px;background:rgba(255,255,255,.22);margin:34px 0 26px}
.preco{font-family:'Anton',sans-serif;font-size:150px;line-height:.95;color:#F5C400}
.cond{margin-top:34px;font-size:38px;font-weight:500;color:#fff}
`;

const pagina = (corpo) => `<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Anton&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>${css}</style></head><body>${corpo}</body></html>`;

const abertura = pagina(`<section class="st">
  ${existe(cfg.abertura.foto) ? `<div class="foto" style="background-image:url('${cfg.abertura.foto}');background-position:${cfg.abertura.foco || "center"}"></div>` : ""}
  <div class="veu"></div>
  ${logo}
  <h1 class="titulo"><span class="barra"></span>Semana<br>Black</h1>
</section>`);

const oferta = (o) => pagina(`<section class="st">
  ${logo}
  <div class="selo"><b>Semana</b><span>Black</span></div>
  <div class="palco">${existe(o.foto) ? `<img class="aparelho" src="${o.foto}">` : `<div class="aparelho-falta">FOTO DO APARELHO<br>${esc(o.modelo)}</div>`}</div>
  <div class="dados">
    <p class="modelo">${esc(o.modelo)}</p>
    <div class="fio"></div>
    <p class="preco">${esc(o.preco)}</p>
    ${o.condicao ? `<p class="cond">${esc(o.condicao)}</p>` : ""}
  </div>
</section>`);

const { chromium } = require("playwright");
const nav = await chromium.launch();
const pg = await nav.newPage({ viewport: { width: 1080, height: 1920 } });
async function salvar(html, nome) {
  const arq = path.join(aqui, nome.replace(".png", ".html"));
  fs.writeFileSync(arq, html);
  await pg.goto("file://" + arq);
  await pg.evaluate(() => document.fonts.ready);
  await pg.waitForLoadState("networkidle");
  await pg.locator(".st").screenshot({ path: path.join(aqui, nome) });
  console.log(path.join(aqui, nome));
}
await salvar(abertura, "abertura.png");
for (const [i, o] of cfg.ofertas.entries()) await salvar(oferta(o), `oferta-${String(i + 1).padStart(2, "0")}.png`);
await nav.close();
