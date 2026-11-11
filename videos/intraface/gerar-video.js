// Gera o MP4 a partir de index.html.
// Uso: node gerar-video.js [saida.mp4] [--fps 30] [--largura 1920] [--ate 30] [--quadros 10,60,120]
//   --quadros salva só esses segundos como PNG (para conferir), sem gerar vídeo.
const { chromium } = require("playwright");
const { spawn } = require("child_process");
const http = require("http");
const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf("--" + n); return i >= 0 ? args[i + 1] : d; };
const saida = args[0] && !args[0].startsWith("--") ? args[0] : "intraface-20-anos.mp4";
const fps = +opt("fps", 30);
const W = +opt("largura", 1920), H = Math.round(W * 9 / 16);
const raiz = __dirname;

const tipos = { ".html": "text/html", ".js": "text/javascript", ".ttf": "font/ttf", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };
const srv = http.createServer((q, r) => {
  const f = path.join(raiz, decodeURIComponent(q.url.split("?")[0]));
  if (!f.startsWith(raiz) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { "Content-Type": tipos[path.extname(f).toLowerCase()] || "application/octet-stream" });
  fs.createReadStream(f).pipe(r);
});

(async () => {
  await new Promise((r) => srv.listen(0, r));
  const porta = srv.address().port;
  const nav = await chromium.launch();
  const pg = await nav.newPage({ viewport: { width: W, height: H } });
  await pg.goto(`http://localhost:${porta}/index.html?render=1`);
  await pg.evaluate(() => window.__pronto);
  const total = await pg.evaluate(() => window.__TOTAL);
  const quadros = opt("quadros");

  if (quadros) {
    for (const s of quadros.split(",").map(Number)) {
      await pg.evaluate((x) => window.__seek(x), s);
      await pg.screenshot({ path: path.join(raiz, `quadro-${s}.png`) });
    }
  } else {
    const fim = Math.min(total, +opt("ate", total));
    const n = Math.ceil(fim * fps);
    const trilha = await pg.evaluate(() => window.TRILHA);
    const ff = ["-y", "-f", "image2pipe", "-framerate", String(fps), "-c:v", "mjpeg", "-i", "-"];
    if (trilha) ff.push("-i", path.join(raiz, "trilha", trilha), "-af", `afade=t=out:st=${(fim - 4).toFixed(2)}:d=4`, "-shortest");
    ff.push("-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart");
    if (trilha) ff.push("-c:a", "aac", "-b:a", "192k");
    ff.push(path.resolve(saida));
    const enc = spawn("ffmpeg", ff, { stdio: ["pipe", "ignore", "inherit"] });
    console.log(`Duração ${fim.toFixed(1)}s, ${n} quadros a ${fps} fps, ${W}x${H}`);
    for (let i = 0; i < n; i++) {
      await pg.evaluate((x) => window.__seek(x), i / fps);
      const buf = await pg.screenshot({ type: "jpeg", quality: 92 });
      if (!enc.stdin.write(buf)) await new Promise((r) => enc.stdin.once("drain", r));
      if (i % (fps * 10) === 0) console.log(`${Math.round(i / fps)}s / ${Math.round(fim)}s`);
    }
    enc.stdin.end();
    await new Promise((r) => enc.on("close", r));
    console.log("Pronto:", path.resolve(saida));
  }
  await nav.close(); srv.close();
})();
