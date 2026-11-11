// Cena 3D do vídeo: a logo da Intraface.
// Tudo é desenhado a partir de logo3d/logo.svg (a logo vetorizada), então o nome sai sempre certo.
// desenha("logo", u, d) desenha a cena no instante u (s) de um trecho de d segundos.
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

  return {
    desenha(nome, u, d) { desenhaLogo(u, d); },
  };
}
