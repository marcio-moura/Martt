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
    textos = [w["w"].strip(".!?") if "$" in w["w"] else w["w"].strip(".,!?").lower() for w in pag]
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


def juntar_moeda(ws, correcoes):
    """'R' '$' '169' ',90' -> 'R$169,90' e aplica correções de nomes"""
    out, i = [], 0
    while i < len(ws):
        w = ws[i]
        if w["w"] == "R" and i + 2 < len(ws) and ws[i + 1]["w"] == "$":
            num = ws[i + 2]; txt = "R$" + num["w"]; e = num["e"]; j = i + 3
            if j < len(ws) and ws[j]["w"].startswith(","):
                txt += ws[j]["w"].rstrip("."); e = ws[j]["e"]; j += 1
            out.append(dict(w=txt, s=w["s"], e=e)); i = j
        else:
            ww = dict(w); chave = ww["w"].strip(".,!?")
            if chave in correcoes: ww["w"] = ww["w"].replace(chave, correcoes[chave])
            out.append(ww); i += 1
    return out


def rastrear(video, box, t_init, t_fim):
    """segue o produto (CSRT) a partir de uma caixa inicial; devolve lista (t, caixa suavizada)"""
    cap = cv2.VideoCapture(video); fps = cap.get(cv2.CAP_PROP_FPS)
    cap.set(cv2.CAP_PROP_POS_FRAMES, int(round(t_init * fps)))
    ok, f = cap.read(); tr = cv2.TrackerCSRT_create(); tr.init(f, tuple(int(v) for v in box))
    sm = np.array(box, float); res = [(t_init, sm.copy())]; t = t_init
    while t < t_fim:
        ok, f = cap.read(); t += 1 / fps
        if not ok: break
        ok, b = tr.update(f)
        if ok: sm = 0.75 * sm + 0.25 * np.array(b, float)
        res.append((t, sm.copy()))
    return res


def caixa_em(trilha, t):
    if t <= trilha[0][0]: return trilha[0][1]
    for tt, b in trilha:
        if tt >= t: return b
    return trilha[-1][1]


def zoom_em(t, zooms):
    for z in zooms:
        if z["de"] <= t < z["ate"]:
            k = min(ease_out((t - z["de"]) / 0.15), ease_out((z["ate"] - t) / 0.2))
            return 1 + (z["escala"] - 1) * k, z.get("cx", W / 2), z.get("cy", H * 0.4)
    return 1.0, W / 2, H / 2


def aplica_zoom(rgb, s, cx, cy):
    if s <= 1.001: return rgb, (0.0, 0.0)
    cw, ch = W / s, H / s
    x0 = min(max(cx - cw / 2, 0), W - cw); y0 = min(max(cy - ch / 2, 0), H - ch)
    M = np.float32([[s, 0, -x0 * s], [0, s, -y0 * s]])
    return cv2.warpAffine(rgb, M, (W, H), flags=cv2.INTER_LINEAR), (x0, y0)


def camada_preco(t, pr, cores, caixa):
    """etiqueta presa ao produto: nome, preço antigo riscado e preço novo com pop"""
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
    fl = fonte("DMSans.ttf", 30, 600); fo = fonte("DMSans.ttf", 50, 600); fn = fonte("DMSans.ttf", 104, 800)
    nome = "  ".join(pr["nome"].upper()); velho = "de " + pr["de"]; novo = pr["por"]
    cw = max(d.textlength(nome, font=fl), d.textlength(velho, font=fo), d.textlength(novo, font=fn)) + 64
    chh = 40 + 30 + 62 + 120
    k = ease_out((t - pr["t_de"]) / 0.3); sai = max(0, min(1, (pr["ate"] - t) / 0.25))
    alpha = min(1, k) * sai
    if alpha <= 0: return img
    bx, by, bw, bh = caixa
    x = bx + bw + 40
    if x + cw > W - 30: x = bx - 40 - cw
    x = min(max(x, 30), W - 30 - cw); y = min(max(by + bh * 0.1, 120), H * 0.62)
    y += (1 - k) * 50
    A = lambda c, a=255: c + (int(a * alpha),)
    # linha do produto até a etiqueta
    px, py = bx + bw * 0.5, by + bh * 0.25
    ex = x if px < x else x + cw
    d.line((px, py, ex, y + 60), fill=A(cores["creme"], 230), width=3)
    d.ellipse((px - 9, py - 9, px + 9, py + 9), fill=A(cores["creme"]), outline=A(cores["laranja"]), width=3)
    d.rounded_rectangle((x, y, x + cw, y + chh), 28, fill=A(cores["marrom"], 238))
    d.text((x + 32, y + 26), nome, font=fl, fill=A(cores["creme"], 210))
    d.text((x + 32, y + 66), velho, font=fo, fill=A(cores["creme"], 200))
    if t >= pr["t_risco"]:
        r = ease_out((t - pr["t_risco"]) / 0.25); vw = d.textlength(velho, font=fo)
        yy = y + 66 + 34; d.line((x + 28, yy, x + 32 + (vw + 8) * r, yy - 4), fill=A(cores["laranja"]), width=6)
    if t >= pr["t_por"]:
        kp = ease_out_back((t - pr["t_por"]) / 0.28); tam = max(10, int(104 * (0.55 + 0.45 * kp)))
        fz = fonte("DMSans.ttf", tam, 800)
        d.text((x + 32, y + 132 + (104 - tam) * 0.5), novo, font=fz, fill=A(cores["laranja"]))
    return img


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
    palavras = juntar_moeda(json.load(open(rel(P["palavras"]))), P.get("correcoes", {}))
    palavras = [w for w in palavras if t0 <= w["s"] < t1]
    pr_jan = [(pr["t_de"] - 0.05, pr["ate"]) for pr in P.get("precos", [])]
    pags = paginas([w for w in palavras if not any(a <= w["s"] < b for a, b in pr_jan)]); destaques = set(P.get("destaques", []))
    titulos = P.get("titulos", []); precos = P.get("precos", []); zooms = P.get("zooms", [])
    for pr in precos:
        a = pr["rastrear"]; pr["_trilha"] = rastrear(rel(P["video"]), a["caixa"], a["t"], pr["ate"])
    tmpdir = rel(P["saida"]) + ".tmp"; os.makedirs(tmpdir, exist_ok=True)
    seg = Segmentador()
    cap = cv2.VideoCapture(rel(P["video"])); vfps = cap.get(cv2.CAP_PROP_FPS)
    cap.set(cv2.CAP_PROP_POS_FRAMES, int(round(t0 * vfps)))
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
        zs, zcx, zcy = zoom_em(t, zooms); rgb, (zx0, zy0) = aplica_zoom(rgb, zs, zcx, zcy)
        sx, sy = W / cw, H / ch   # fonte -> saída (antes do zoom)
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
        preco_ativo = False
        for pr in precos:
            if pr["t_de"] - 0.05 <= t < pr["ate"]:
                bx, by, bw, bh = caixa_em(pr["_trilha"], t)
                bx, by = (bx - x0) * sx, (by - top) * sy; bw, bh = bw * sx, bh * sy
                bx, by, bw, bh = (bx - zx0) * zs, (by - zy0) * zs, bw * zs, bh * zs
                base = Image.alpha_composite(base, camada_preco(t, pr, cores, (bx, by, bw, bh))); preco_ativo = True
        for pg in ([] if preco_ativo else pags):
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
    for pr in precos:
        poe("whoosh_curto", pr["t_de"] - 0.08, 0.5); poe("tick", pr["t_risco"], 0.4); poe("ding", pr["t_por"], 0.45)
    for z in zooms:
        poe("impacto_suave", z["de"], 0.3)
    for pg in pags:
        if any(pr["t_de"] - 0.05 <= pg[0]["s"] < pr["ate"] for pr in precos): continue
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
