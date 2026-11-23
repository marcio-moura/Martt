// Post de feed da Black da Infinity (4:5). Uso: node post-feed.mjs  → feed-01.png
import fs from "node:fs"; import path from "node:path"; import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const aqui = path.dirname(new URL(import.meta.url).pathname);
const c = JSON.parse(fs.readFileSync(path.join(aqui, "feed.json"), "utf8"));
const esc = (s = "") => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
const fita = (txt, n = 8) => Array(n).fill(`<span>${esc(txt)}</span><i>✦</i>`).join("");
const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Anton&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@500;600;800&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
.p{width:1080px;height:1350px;position:relative;overflow:hidden;background:#0b0b0c;color:#fff;font-family:'Inter',sans-serif}
.foto{position:absolute;left:0;right:0;bottom:0;height:1000px;background:url('${c.foto}') center ${c.foco || "60%"}/cover}
.foto::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,#0b0b0c 0%,rgba(11,11,12,.6) 18%,rgba(11,11,12,0) 40%,rgba(11,11,12,0) 80%,rgba(11,11,12,.7) 100%)}
.logo{position:absolute;top:64px;left:50%;transform:translateX(-50%);height:84px}
.titulo{position:absolute;top:190px;left:0;right:0;text-align:center;font-family:'Anton',sans-serif;text-transform:uppercase;line-height:.84}
.rot{font:600 26px 'Inter',sans-serif;letter-spacing:.42em;color:#cfcfd1;margin-bottom:22px;padding-left:.42em}
.l1{font-size:250px;letter-spacing:-.005em}
.l2{margin-top:22px;font-size:132px;color:#F5C400;letter-spacing:.02em}
.fita{position:absolute;left:-200px;right:-200px;height:76px;display:flex;align-items:center;gap:26px;white-space:nowrap;
  font:400 40px 'Anton',sans-serif;text-transform:uppercase;letter-spacing:.06em}
.fita i{font-style:normal;font-size:26px}
.f1{bottom:210px;transform:rotate(-8deg);background:#F5C400;color:#0b0b0c;box-shadow:0 18px 40px rgba(0,0,0,.6)}
.f2{bottom:150px;transform:rotate(5deg);background:#2a2b2d;color:#8a8b8d;filter:blur(1.5px)}
.rod{position:absolute;bottom:52px;left:0;right:0;text-align:center;font:500 26px 'Inter',sans-serif;letter-spacing:.2em;color:#cfcfd1;text-transform:uppercase}
.rod b{color:#fff;font-weight:800}
</style></head><body><section class="p">
<div class="foto"></div>
<img class="logo" src="../../marca/logo-fundo-escuro.png">
<h1 class="titulo"><div class="rot">${esc(c.rotulo)}</div><div class="l1">${esc(c.linha1)}</div><div class="l2">${esc(c.linha2)}</div></h1>
<div class="fita f2">${fita(c.fita)}</div>
<div class="fita f1">${fita(c.fita)}</div>
<p class="rod">${c.rodape}</p>
</section></body></html>`;
fs.writeFileSync(path.join(aqui, "feed-01.html"), html);
const { chromium } = require("playwright");
const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1080, height: 1350 } });
await pg.goto("file://" + path.join(aqui, "feed-01.html")); await pg.evaluate(() => document.fonts.ready); await pg.waitForLoadState("networkidle");
await pg.locator(".p").screenshot({ path: path.join(aqui, "feed-01.png") }); await b.close();
console.log(path.join(aqui, "feed-01.png"));
