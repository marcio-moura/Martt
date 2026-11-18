// uso: node render.js <outdir> <fps> <dur> [t1,t2,...]
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const [out, fps, dur, lista] = [process.argv[2], +process.argv[3], +process.argv[4], process.argv[5]];
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1080, height: 720 } });
  p.on('pageerror', e => console.log('ERR', e.message)); p.on('console', m => m.type()==='error' && console.log('CONSOLE', m.text()));
  await p.goto('http://127.0.0.1:8765/' + (process.env.PAGINA || 'anim.html') + ''); await p.waitForFunction('window.ready === true', null, { timeout: 60000 });
  const ts = lista ? lista.split(',').map(Number) : [...Array(Math.round(fps * dur)).keys()].map(i => i / fps);
  let n = 0;
  for (let i = 0; i < ts.length; i++) {
    const vis = await p.evaluate(t => window.renderAt(t), ts[i]);
    const name = `${out}/${String(lista ? i : i).padStart(5, '0')}.png`;
    if (!vis && !lista) { fs.copyFileSync(`${out}/../vazio.png`, name); continue; }
    const data = await p.evaluate(() => document.querySelector('canvas').toDataURL('image/png'));
    fs.writeFileSync(name, Buffer.from(data.split(',')[1], 'base64')); n++;
  }
  console.log('renderizados', n, 'de', ts.length); await b.close();
})();
