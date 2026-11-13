"""Editor de vídeo no estilo "legendas dinâmicas".

Uso:
  python3 editor.py plano.json

plano.json:
{
  "video": "bruto.mp4", "palavras": "words.json", "estilo": "clientes/natura/estilo.json",
  "inicio": 29.5, "fim": 33.85, "saida": "saida.mp4",
  "crop_topo": 0.0,                  # fração da altura a cortar no topo (ex.: gravação de tela)
  "titulos": [{"texto": "MESES", "de": 29.6, "ate": 31.1, "y": 0.17}],
  "destaques": ["meses", "clique"],  # palavras que ficam em laranja mesmo depois de faladas
  "musica": null, "volume_original": 1.0
}
"""
import json, os, subprocess, sys, wave
import numpy as np, cv2, mediapipe as mp
from PIL import Image, ImageDraw, ImageFont, ImageFilter

AQUI = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.dirname(AQUI)
W, H, FPS = 1080, 1920, 30
SR = 48000


def hexrgb(h):
    h = h.lstrip("#"); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def fonte(nome, tam, peso):
    f = ImageFont.truetype(os.path.join(BASE, "fontes", nome), tam)
    try:
        f.set_variation_by_axes([14, peso] if "DMSans" in nome else [peso])
    except Exception:
        pass
    return f


def ease_out_back(x):
    x = min(max(x, 0), 1); c = 1.6
    return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2


def ease_out(x):
    x = min(max(x, 0), 1); return 1 - (1 - x) ** 3


class Segmentador:
    def __init__(self):
        m = os.environ.get("SEG_MODEL", os.path.join(BASE, "modelos", "selfie_multiclass_256x256.tflite"))
        o = mp.tasks.vision.ImageSegmenterOptions(
            base_options=mp.tasks.BaseOptions(model_asset_path=m), output_category_mask=True)
        self.s = mp.tasks.vision.ImageSegmenter.create_from_options(o); self.prev = None

    def __call__(self, rgb):
        r = self.s.segment(mp.Image(image_format=mp.ImageFormat.SRGB, data=np.ascontiguousarray(rgb)))
        m = (np.squeeze(r.category_mask.numpy_view()) > 0).astype(np.float32)
        m = cv2.resize(m, (W, H), interpolation=cv2.INTER_LINEAR)
        m = cv2.GaussianBlur(m, (0, 0), 2.5)
        if self.prev is not None and self.prev.shape == m.shape:
            m = 0.6 * m + 0.4 * self.prev   # suaviza tremor entre quadros
        self.prev = m
        return m


def grade(rgb, est):
    a = rgb.astype(np.float32)
    g = a.mean(axis=2, keepdims=True); s = est.get("imagem", {}).get("saturacao", 1.0)
    a = g + (a - g) * s
    a[..., 0] *= 1.04; a[..., 2] *= 0.96
    return np.clip(a, 0, 255).astype(np.uint8)


def camada_titulo(t, tit, cores, est):
    """letras sobem uma a uma com leve overshoot; saem descendo com fade"""
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
    texto = tit["texto"]; tam = tit.get("tamanho", 300)
    f = fonte("DMSans.ttf", tam, 800)
    while d.textlength(texto, font=f) > W * 1.02 and tam > 120:
        tam -= 10; f = fonte("DMSans.ttf", tam, 800)
    larg = d.textlength(texto, font=f); x = (W - larg) / 2; y0 = tit.get("y", 0.17) * H
    if "cor" in tit:
        cor = cores[tit["cor"]]
    else:  # cor automática pelo brilho do fundo atrás do título
        lum = tit.get("_lum", 100)
        cor = cores["marrom"] if lum > 140 else cores["creme"]
    fim = tit["ate"] - t
    for i, ch in enumerate(texto):
        k = (t - tit["de"] - i * 0.045) / 0.38
        p = ease_out_back(k); alpha = min(1, max(0, k * 2.2))
        if fim < 0.25:  # saída
            alpha *= max(0, fim / 0.25); p += (1 - fim / 0.25) * 0.4
        dy = (1 - p) * tam * 0.55
        if alpha > 0:
            d.text((x, y0 + dy), ch, font=f, fill=cor + (int(235 * alpha),))
        x += d.textlength(ch, font=f)
    return img


def paginas(palavras, maxp=3):
    pags, cur = [], []
    for w in palavras:
        if cur and (len(cur) >= maxp or w["s"] - cur[-1]["e"] > 0.35):
            pags.append(cur); cur = []
        cur.append(w)
    if cur: pags.append(cur)
    return pags


def camada_legenda(t, pag, cores, destaques):
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    f = fonte("DMSans.ttf", 84, 800)
    tmp = ImageDraw.Draw(img)
    textos = [w["w"].strip(".,!?").lower() for w in pag]
    esp = 84 * 0.32
    larg = sum(tmp.textlength(s, font=f) for s in textos) + esp * (len(textos) - 1)
    x = (W - larg) / 2; y = H * 0.70
    som = Image.new("RGBA", (W, H), (0, 0, 0, 0)); ds = ImageDraw.Draw(som)
    for w, s in zip(pag, textos):
        lw = tmp.textlength(s, font=f)
        if t >= w["s"] - 0.05:
            prox = pag[pag.index(w) + 1]["s"] - 0.05 if w is not pag[-1] else w["e"] + 0.3
            falando = w["s"] - 0.05 <= t < prox
            k = ease_out_back((t - w["s"] + 0.05) / 0.16)
            esc = 0.75 + 0.25 * k + (0.04 if falando else 0)
            cor = cores["laranja"] if (falando or s in destaques) else cores["branco"]
            fw = fonte("DMSans.ttf", max(10, int(84 * esc)), 800)
            lw2 = tmp.textlength(s, font=fw); xx = x + (lw - lw2) / 2; yy = y + (84 - 84 * esc) * 0.6
            ds.text((xx + 3, yy + 6), s, font=fw, fill=cores["marrom"] + (150,))
            ImageDraw.Draw(img).text((xx, yy), s, font=fw, fill=cor + (255,))
        x += lw + esp
    som = som.filter(ImageFilter.GaussianBlur(7))
    return Image.alpha_composite(som, img)


def ler_wav(p):
    with wave.open(p) as w:
        x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
        if w.getnchannels() == 2: x = x.reshape(-1, 2).mean(1)
        return x


def main(plano_path):
    P = json.load(open(plano_path)); dirp = os.path.dirname(os.path.abspath(plano_path))
    rel = lambda p: p if os.path.isabs(p) else os.path.join(dirp, p)
    est = json.load(open(rel(P["estilo"])))
    cores = {k: hexrgb(v) for k, v in est["cores"].items()}
    t0, t1 = P["inicio"], P["fim"]
    palavras = [w for w in json.load(open(rel(P["palavras"]))) if t0 <= w["s"] < t1]
    pags = paginas(palavras); destaques = set(P.get("destaques", []))
    titulos = P.get("titulos", [])
    tmpdir = rel(P["saida"]) + ".tmp"; os.makedirs(tmpdir, exist_ok=True)
    seg = Segmentador()
    cap = cv2.VideoCapture(rel(P["video"])); cap.set(cv2.CAP_PROP_POS_MSEC, t0 * 1000)
    vfps = cap.get(cv2.CAP_PROP_FPS)
    enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24",
                            "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-crf", "18",
                            "-preset", "medium", "-pix_fmt", "yuv420p", f"{tmpdir}/v.mp4"], stdin=subprocess.PIPE)
    n = int(round((t1 - t0) * FPS)); frame = None; vt = t0
    for i in range(n):
        t = t0 + i / FPS
        while vt <= t + 1e-6:
            ok, fr = cap.read()
            if not ok: break
            frame = fr; vt += 1 / vfps
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        hh, ww = rgb.shape[:2]; top = int(hh * P.get("crop_topo", 0))
        ch = min(hh - top, int(ww * 16 / 9)); cw = int(ch * 9 / 16); x0 = (ww - cw) // 2
        rgb = cv2.resize(rgb[top:top + ch, x0:x0 + cw], (W, H), interpolation=cv2.INTER_LANCZOS4)
        rgb = grade(rgb, est)
        base = Image.fromarray(rgb).convert("RGBA")
        ativos = [tt for tt in titulos if tt["de"] <= t < tt["ate"]]
        if ativos:
            m = seg(rgb)
            comp = base
            for tt in ativos:
                if "_lum" not in tt:
                    y0 = int(tt.get("y", 0.17) * H); tt["_lum"] = float(rgb[y0:y0 + 300].mean())
                comp = Image.alpha_composite(comp, camada_titulo(t, tt, cores, est))
            a = np.asarray(comp).astype(np.float32); b = np.asarray(base).astype(np.float32)
            a = b * m[..., None] + a * (1 - m[..., None])   # pessoa na frente do texto
            base = Image.fromarray(a.astype(np.uint8), "RGBA")
        for pg in pags:
            if pg[0]["s"] - 0.05 <= t < (pg[-1]["e"] + 0.15):
                base = Image.alpha_composite(base, camada_legenda(t, pg, cores, destaques)); break
        enc.stdin.write(np.asarray(base.convert("RGB")).tobytes())
    enc.stdin.close(); enc.wait()

    # --- áudio: original + efeitos sonoros
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(t0), "-t", str(t1 - t0), "-i", rel(P["video"]),
                    "-ac", "1", "-ar", str(SR), f"{tmpdir}/a.wav"], check=True)
    mix = ler_wav(f"{tmpdir}/a.wav") * P.get("volume_original", 1.0)
    sfxd = os.path.join(BASE, "sfx")
    def poe(nome, quando, vol):
        x = ler_wav(os.path.join(sfxd, nome + ".wav")) * vol; i = int((quando - t0) * SR)
        if i < 0: x = x[-i:]; i = 0
        j = min(len(mix), i + len(x)); mix[i:j] += x[:j - i]
    for tt in titulos:
        poe("whoosh", tt["de"] - 0.12, 0.55); poe("impacto_suave", tt["de"] + 0.05, 0.35)
    for pg in pags:
        poe("pop", pg[0]["s"] - 0.03, 0.28)
    for w in palavras:
        if w["w"].strip(".,!?").lower() in destaques: poe("tick", w["s"], 0.35)
    if P.get("musica"):
        mu = ler_wav(rel(P["musica"]))[:len(mix)]
        voz = np.convolve(np.abs(mix), np.ones(4800) / 4800, "same")
        duck = np.where(voz > 0.02, 0.35, 1.0); duck = np.convolve(duck, np.ones(9600) / 9600, "same")
        mix[:len(mu)] += mu * 0.25 * duck[:len(mu)]
    mix = mix / max(1.0, np.abs(mix).max() / 0.95)
    with wave.open(f"{tmpdir}/mix.wav", "w") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((mix * 32767).astype(np.int16).tobytes())
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", f"{tmpdir}/v.mp4", "-i", f"{tmpdir}/mix.wav",
                    "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-af", "loudnorm=I=-14:TP=-1",
                    "-shortest", rel(P["saida"])], check=True)
    print("ok:", rel(P["saida"]))


if __name__ == "__main__":
    main(sys.argv[1])
