// Cenas 3D do vídeo: a logo da Intraface e a fachada da unidade Setor Maysa.
// Tudo é desenhado a partir de logo3d/logo.svg (a logo vetorizada), então o nome sai sempre certo.
// window.__cena3d.desenha(nome, u, d) desenha a cena "logo" ou "maysa" no instante u (s) de um trecho de d segundos.
import * as THREE from "three";
import { SVGLoader } from "./vendor/three/addons/SVGLoader.js";
import { RoomEnvironment } from "./vendor/three/addons/RoomEnvironment.js";

const W = 1920, H = 1080;
const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.pow(1 - x, 3));
const io = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

export async function iniciar(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const svgTxt = await (await fetch("logo3d/logo.svg")).text();
  const svg = new SVGLoader().parse(svgTxt);
  const vb = svgTxt.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  const VW = +vb[1], VH = +vb[2];
  const disco = svgTxt.match(/<circle id="disco" cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)"/).slice(1).map(Number);
  const formas = {};
  svg.paths.forEach((p) => { formas[p.userData.node.id] = SVGLoader.createShapes(p); });

  // ---------- a logo como objeto 3D ----------
  function montaLogo({ prof = 1, cores = {} } = {}) {
    const S = 8.6 / VW;                 // largura total ~8.6 unidades
    const g = new THREE.Group();
    // espelha Y (SVG desce, 3D sobe) e Z junto, para não inverter as faces; depois apoia em z = 0
    const toWorld = (geo) => {
      geo.scale(S, -S, -S); geo.translate(-VW * S / 2, VH * S / 2, 0);
      geo.computeBoundingBox(); geo.translate(0, 0, -geo.boundingBox.min.z); return geo;
    };
    const laranja = new THREE.MeshPhysicalMaterial({ color: cores.laranja || 0xf2961c, metalness: 0.55, roughness: 0.26, clearcoat: 1, clearcoatRoughness: 0.15, envMapIntensity: 1.2 });
    const branco = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0.05, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.1 });
    const texto = new THREE.MeshPhysicalMaterial({ color: cores.texto || 0xf1e8d8, metalness: cores.textoMetal ?? 0.35, roughness: 0.3, clearcoat: 0.6 });
    const sub = new THREE.MeshStandardMaterial({ color: cores.sub || 0xe9dfcd, metalness: 0.1, roughness: 0.55 });
    const ext = (shapes, d, bev) => toWorld(new THREE.ExtrudeGeometry(shapes, {
      depth: d / S, bevelEnabled: true, bevelThickness: bev / S, bevelSize: (bev * 0.8) / S, bevelSegments: 3, curveSegments: 10,
    }));
    const add = (geo, mat, z) => { const m = new THREE.Mesh(geo, mat); m.position.z = z; m.castShadow = true; g.add(m); return m; };

    // disco: círculo perfeito, com borda arredondada
    const [cx, cy, r] = disco;
    const circ = new THREE.Shape(); circ.absarc(cx, cy, r, 0, Math.PI * 2, false);
    add(toWorld(new THREE.ExtrudeGeometry(circ, { depth: (0.42 * prof) / S, bevelEnabled: true, bevelThickness: 0.09 / S, bevelSize: 0.08 / S, bevelSegments: 6, curveSegments: 96 })), laranja, 0);
    add(ext(formas.branco, 0.07 * prof, 0.025), branco, 0.42 * prof + 0.18 + 0.004);
    add(ext(formas.tra, 0.34 * prof, 0.03), laranja, 0.04);
    add(ext(formas.face, 0.34 * prof, 0.03), texto, 0.04);
    add(ext(formas.sub, 0.06 * prof, 0.012), sub, 0.04);

    // ondas: três crescentes geométricos, concêntricos ao disco
    const ondas = [[1.29, 13, 0.10], [1.53, 19, 0.115], [1.80, 25, 0.12]];
    ondas.forEach(([k, graus, esp]) => {
      const R = r * k, th = (graus * Math.PI) / 180, N = 48, sh = new THREE.Shape();
      const pts = [];
      for (let i = 0; i <= N; i++) {
        const f = i / N, a = Math.PI - th + 2 * th * f, w = r * esp * Math.pow(Math.sin(Math.PI * f), 0.7);
        pts.push([a, R + w / 2, R - w / 2]);
      }
      pts.forEach(([a, ro], i) => { const x = cx + ro * Math.cos(a), y = cy + ro * Math.sin(a); i ? sh.lineTo(x, y) : sh.moveTo(x, y); });
      for (let i = pts.length - 1; i >= 0; i--) { const [a, , ri] = pts[i]; sh.lineTo(cx + ri * Math.cos(a), cy + ri * Math.sin(a)); }
      add(toWorld(new THREE.ExtrudeGeometry(sh, { depth: (0.3 * prof) / S, bevelEnabled: true, bevelThickness: 0.03 / S, bevelSize: 0.025 / S, bevelSegments: 3 })), laranja, 0.04);
    });
    return g;
  }

  // textura de brilho suave (glow e partículas)
  const brilho = (() => {
    const c = document.createElement("canvas"); c.width = c.height = 128;
    const x = c.getContext("2d"), gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.3, "rgba(255,255,255,.35)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();

  // ---------- cena 1: logo ----------
  const cLogo = new THREE.Scene();
  cLogo.background = new THREE.Color(0x07050a);
  cLogo.environment = env;
  const camLogo = new THREE.PerspectiveCamera(28, W / H, 0.1, 200);
  const logo = montaLogo();
  cLogo.add(logo);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: brilho, color: 0xb86a1a, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.scale.set(22, 9, 1); halo.position.set(0, 0, -3); cLogo.add(halo);
  const key = new THREE.DirectionalLight(0xffe3bd, 2.2); key.position.set(-6, 6, 10); cLogo.add(key);
  const rim = new THREE.DirectionalLight(0xffb060, 2.0); rim.position.set(8, 3, -6); cLogo.add(rim);
  const varre = new THREE.PointLight(0xfff1dc, 0, 14, 1.5); cLogo.add(varre);
  cLogo.add(new THREE.AmbientLight(0xffffff, 0.15));
  // poeira dourada
  const nP = 260, pg = new THREE.BufferGeometry(), pp = new Float32Array(nP * 3), semente = [];
  for (let i = 0; i < nP; i++) { const s = [Math.random(), Math.random(), Math.random(), Math.random()]; semente.push(s); }
  pg.setAttribute("position", new THREE.BufferAttribute(pp, 3));
  const poeira = new THREE.Points(pg, new THREE.PointsMaterial({ map: brilho, color: 0xffc77a, size: 0.12, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending }));
  cLogo.add(poeira);

  function desenhaLogo(u, d) {
    const e = ease(u / 3.2);
    logo.rotation.y = -0.75 * (1 - e) + 0.06 * Math.sin(u * 0.6);
    logo.rotation.x = 0.12 * (1 - e) + 0.02 * Math.sin(u * 0.45);
    logo.position.set(0, 0.35 + (1 - e) * -0.4, -2.5 * (1 - e));
    camLogo.position.set(0.0, 0.2, 17.5 - 1.6 * io(u / d));
    camLogo.lookAt(0, 0.15, 0);
    const v = io((u - 1.6) / 2.6);
    varre.position.set(-9 + 18 * v, 1.5, 3.2);
    varre.intensity = 60 * Math.sin(Math.PI * Math.min(1, Math.max(0, v)));
    for (let i = 0; i < nP; i++) {
      const [a, b, c, s] = semente[i];
      pp[i * 3] = (a - 0.5) * 26 + Math.sin(u * 0.3 + s * 6) * 0.4;
      pp[i * 3 + 1] = ((b + u * 0.012 * (0.5 + s)) % 1 - 0.5) * 14;
      pp[i * 3 + 2] = (c - 0.6) * 12;
    }
    pg.attributes.position.needsUpdate = true;
    renderer.render(cLogo, camLogo);
  }

  // ---------- cena 2: fachada Setor Maysa ----------
  const cM = new THREE.Scene();
  cM.environment = env;
  {
    const c = document.createElement("canvas"); c.width = 16; c.height = 512;
    const x = c.getContext("2d"), gr = x.createLinearGradient(0, 0, 0, 512);
    gr.addColorStop(0, "#141c33"); gr.addColorStop(0.45, "#3b3f5c"); gr.addColorStop(0.72, "#b9785a"); gr.addColorStop(0.86, "#f0b27a"); gr.addColorStop(1, "#f6cf9c");
    x.fillStyle = gr; x.fillRect(0, 0, 16, 512);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; cM.background = t;
  }
  cM.fog = new THREE.Fog(0x5a4a55, 40, 110);
  const camM = new THREE.PerspectiveCamera(32, W / H, 0.1, 300);
  const mat = (c, r = 0.85, m = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
  const caixa = (w, h, d, m, x, y, z, sombra = true) => {
    const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z);
    o.castShadow = sombra; o.receiveShadow = true; cM.add(o); return o;
  };
  // chão: asfalto, meio-fio, calçada
  caixa(120, 0.2, 60, mat(0x2a2a2e, 0.95), 0, -0.1, 18, false);
  caixa(40, 0.18, 7, mat(0x8f8a84, 0.9), 0, 0.09, 3.5, false);
  for (let i = -3; i <= 3; i++) caixa(0.08, 0.01, 4.6, mat(0xe8d9a0, 0.6), i * 2.6, 0.19, 3.6, false);
  // prédio
  const texCanvas = (w, h, fn, rep) => { const c = document.createElement("canvas"); c.width = w; c.height = h; fn(c.getContext("2d"), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; if (rep) t.repeat.set(...rep); t.anisotropy = 8; return t; };
  const tijolo = texCanvas(256, 256, (x, w, h) => {
    x.fillStyle = "#cdb08a"; x.fillRect(0, 0, w, h);
    for (let j = 0; j < 8; j++) for (let i = -1; i < 3; i++) {
      const v = 190 + ((i * 37 + j * 53) % 30); x.fillStyle = `rgb(${v + 20},${v},${v - 40})`;
      x.fillRect(i * 128 + (j % 2) * 64 + 3, j * 32 + 3, 122, 26);
    }
  }, [1, 3]);
  const reboco = texCanvas(512, 512, (x, w, h) => {
    x.fillStyle = "#e4dccf"; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 4000; i++) { x.fillStyle = `rgba(120,100,80,${Math.random() * 0.05})`; x.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
  }, [3, 1]);
  const bege = new THREE.MeshStandardMaterial({ map: reboco, roughness: 0.92 }), pedra = new THREE.MeshStandardMaterial({ map: tijolo, roughness: 0.85 }), alu = mat(0x2a2c30, 0.35, 0.8);
  caixa(15, 5.2, 7.2, bege, 0, 2.78, -5.4);            // corpo, recuado: a vitrine fica num vão
  caixa(15, 0.3, 2.2, bege, 0, 3.55, -0.8);             // forro do vão
  [-7.55, 7.55].forEach((x) => caixa(0.3, 3.4, 2.2, bege, x, 1.88, -0.8));
  caixa(15.6, 0.25, 9.4, mat(0xefe8dc, 0.7), 0, 5.5, -4.4);
  // letreiro (fachada superior)
  caixa(15.4, 1.9, 0.35, mat(0xf5f2ec, 0.45), 0, 4.45, 0.2);
  caixa(15.4, 0.08, 0.4, mat(0xf2961c, 0.4, 0.3), 0, 3.47, 0.2);
  const logoPlaca = montaLogo({ prof: 0.35, cores: { texto: 0x4a4744, textoMetal: 0.1, sub: 0x5a5652 } });
  logoPlaca.scale.setScalar(0.6); logoPlaca.position.set(-2.3, 4.5, 0.4); cM.add(logoPlaca);
  // "UNIDADE SETOR MAYSA" na placa
  const placaTxt = (() => {
    const c = document.createElement("canvas"); c.width = 1024; c.height = 256;
    const x = c.getContext("2d"); x.fillStyle = "#4a4744";
    x.font = "600 64px Montserrat, sans-serif"; x.textBaseline = "middle"; x.textAlign = "center";
    x.letterSpacing = "10px"; x.fillText("UNIDADE", 512, 80);
    x.font = "700 92px Montserrat, sans-serif"; x.fillStyle = "#f2961c"; x.fillText("SETOR MAYSA", 512, 175);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
  })();
  const pt = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 1.1), new THREE.MeshStandardMaterial({ map: placaTxt, transparent: true, roughness: 0.6 }));
  pt.position.set(4.6, 4.45, 0.39); cM.add(pt);
  // pilares e vitrines
  const interiorTex = texCanvas(512, 384, (x, w, h) => {
    const g = x.createRadialGradient(w / 2, h * 0.35, 10, w / 2, h * 0.4, w * 0.7);
    g.addColorStop(0, "#fff0d6"); g.addColorStop(0.5, "#e9c08a"); g.addColorStop(1, "#7a5a3c"); x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.fillStyle = "rgba(60,40,25,.55)"; x.fillRect(w * 0.18, h * 0.62, w * 0.64, h * 0.2);   // balcão
    x.fillStyle = "rgba(255,250,240,.9)"; for (let i = 0; i < 3; i++) x.fillRect(w * (0.25 + i * 0.25) - 30, 8, 60, 6); // luminárias
  });
  const interior = new THREE.MeshBasicMaterial({ map: interiorTex, color: 0xffe6c8 });
  const vidro = new THREE.MeshPhysicalMaterial({ color: 0x1f2a33, roughness: 0.04, metalness: 0.6, transparent: true, opacity: 0.5, envMapIntensity: 0.9 });
  const vaos = [-5.2, 0, 5.2];
  [-7.4, -2.6, 2.6, 7.4].forEach((x) => caixa(0.6, 3.3, 0.6, pedra, x, 1.83, -0.1));
  vaos.forEach((x) => {
    const fundo = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 3.3), interior); fundo.position.set(x, 1.85, -1.7); cM.add(fundo);
    caixa(4.2, 3.2, 0.02, vidro, x, 1.8, -0.2, false);
    caixa(4.2, 0.08, 0.12, alu, x, 3.38, -0.2); caixa(4.2, 0.12, 0.12, alu, x, 0.24, -0.2);
    caixa(0.07, 3.2, 0.12, alu, x, 1.8, -0.2);
    const luz = new THREE.PointLight(0xffc27a, 3, 7, 1.8); luz.position.set(x, 1.6, 1.2); cM.add(luz);
  });
  // floreiras
  const verde = mat(0x3f5a34, 0.9);
  [-2.6, 2.6].forEach((x) => {
    caixa(1.6, 0.6, 0.7, mat(0xf3efe8, 0.7), x, 0.48, 1.0);
    for (let i = 0; i < 7; i++) {
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.28 + 0.08 * (i % 3), 16, 12), verde);
      f.position.set(x - 0.6 + i * 0.2, 0.95 + 0.12 * ((i * 7) % 3), 1.0 + 0.1 * ((i * 5) % 3 - 1)); f.castShadow = true; cM.add(f);
    }
  });
  // arandelas
  [-7.4, 7.4].forEach((x) => { const a = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), new THREE.MeshStandardMaterial({ emissive: 0xffd9a8, emissiveIntensity: 3, color: 0 })); a.position.set(x, 3.0, 0.3); cM.add(a); });
  // vizinhança e árvore
  caixa(10, 3.2, 8, mat(0x8a7b6c, 0.95), -13, 1.6, -5);
  caixa(9, 2.6, 8, mat(0x9a8a78, 0.95), 12.6, 1.3, -5);
  const tronco = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 3.2, 12), mat(0x4a3628, 0.9)); tronco.position.set(10.2, 1.6, 4.6); tronco.castShadow = true; cM.add(tronco);
  const copa = mat(0x2f4a2c, 0.95);
  for (let i = 0; i < 14; i++) { const f = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9 + (i % 3) * 0.25, 1), copa); f.position.set(10.2 + Math.sin(i * 2.4) * 1.1, 3.6 + Math.cos(i * 1.7) * 0.7, 4.6 + Math.sin(i * 3.1) * 0.9); f.castShadow = true; cM.add(f); }
  const poste = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 6, 8), alu); poste.position.set(-10, 3, 6.6); cM.add(poste);
  const lamp = new THREE.Sprite(new THREE.SpriteMaterial({ map: brilho, color: 0xffd29a, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending })); lamp.scale.set(2.2, 2.2, 1); lamp.position.set(-10, 6, 6.6); cM.add(lamp);
  const luzPoste = new THREE.PointLight(0xffc98a, 10, 14, 1.6); luzPoste.position.set(-10, 5.6, 6.6); cM.add(luzPoste);
  // luz do fim de tarde
  cM.add(new THREE.HemisphereLight(0x8a94c0, 0x3a2a20, 0.55));
  const sol = new THREE.DirectionalLight(0xffb070, 2.4); sol.position.set(-18, 9, 14); sol.castShadow = true;
  sol.shadow.mapSize.set(2048, 2048); Object.assign(sol.shadow.camera, { left: -16, right: 16, top: 12, bottom: -6, near: 1, far: 60 }); sol.shadow.bias = -0.0004; sol.shadow.radius = 4;
  cM.add(sol);
  const reflexo = new THREE.Sprite(new THREE.SpriteMaterial({ map: brilho, color: 0xffb46a, transparent: true, opacity: 0.25, depthWrite: false, blending: THREE.AdditiveBlending }));
  reflexo.scale.set(40, 12, 1); reflexo.position.set(0, 1, -25); cM.add(reflexo);

  function desenhaMaysa(u, d) {
    const k = io(u / d);
    camM.position.set(-9 + 6 * k, 2.4 + 0.3 * k, 17 - 2.5 * k);
    camM.lookAt(0.5 * k, 2.9, -1);
    renderer.render(cM, camM);
  }

  return {
    desenha(nome, u, d) { (nome === "maysa" ? desenhaMaysa : desenhaLogo)(u, d); },
  };
}
