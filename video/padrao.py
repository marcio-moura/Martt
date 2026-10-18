"""Padrão Martt de edição, modelado a partir do vídeo de referência do cliente.

- Legenda palavra por palavra: Poppins SemiBold branca, pequena, na altura do peito,
  sem sombra e sem contorno (decisão do cliente).
- Frases de impacto em bloco: linha grande, linha pequena logo abaixo (entrelinha
  apertada) e a palavra final em amarelo, surgindo letra por letra com um "tic"
  a cada letra. As palavras brancas entram com desfoque no instante em que são ditas.
- Punch-in: alterna plano aberto e fechado nos cortes, centrado no rosto.
- Impacto grave na virada do gancho, cor levemente mais quente e contrastada.
"""

import re
import subprocess
import tempfile
from pathlib import Path

import numpy as np

FONTES = Path(__file__).resolve().parent / "fontes"
FONTE_PALAVRA = ("Poppins SemiBold", FONTES / "Poppins-SemiBold.ttf", 0)
FONTE_GRANDE = ("Poppins", FONTES / "Poppins-Bold.ttf", 1)

PADRAO = {
    "cor_texto": "#FFFFFF",
    "cor_destaque": "#F5D968",
    "palavra_em": 0.051,        # tamanho da palavra solta, em fração da largura
    "ancorar_queixo": True,     # legenda logo abaixo do queixo, acompanhando cada plano
    "queixo_palavra": 0.05,     # distância do queixo ao centro da palavra solta (fração da altura)
    "queixo_bloco": 0.025,      # distância do queixo ao topo do bloco
    "palavra_y": 0.675,         # posição fixa, sem rosto detectado ou com ancorar_queixo falso
    "bloco_y": 0.62,
    "bloco_em_grande": 0.110,
    "bloco_em_pequeno": 0.051,
    "letra_ms": 45,
    "sombra": "nenhuma",        # nenhuma (padrão do cliente) | auto | suave | forte
}
ZOOM_PADRAO = {"ativo": True, "niveis": [1.22, 1.0], "plano_min": 3.0, "plano_max": 8.0}
SFX_PADRAO = {"ticks": True, "impacto": True, "volume_tick_db": -21, "volume_impacto_db": -9}
COR_PADRAO = {"ativo": True, "contraste": 1.04, "saturacao": 1.08, "calor": 0.03}


# ---------- medidas de fonte ----------

_calibracao = {}


def calibrar():
    """libass desenha a fonte em escala diferente da nominal. Mede uma vez, renderizando
    um "H": devolve (em por unidade de tamanho ASS, deslocamento da linha de base)."""
    if _calibracao:
        return _calibracao["k"], _calibracao["base"]
    from PIL import Image, ImageFont
    with tempfile.TemporaryDirectory() as tmp:
        ass = Path(tmp) / "c.ass"
        png = Path(tmp) / "c.png"
        ass.write_text(cabecalho(800, 800) + "Dialogue: 0,0:00:00.00,0:00:01.00,Base,,0,0,0,,"
                       "{\\an7\\pos(100,200)\\fnPoppins\\b1\\fs200}HHHH\n")
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i",
                        "color=black:s=800x800:d=1", "-vf",
                        f"ass={ass}:fontsdir={FONTES}", "-frames:v", "1", str(png)], check=True)
        a = np.array(Image.open(png).convert("L")) > 128
    ys, xs = np.nonzero(a)
    largura_libass = xs.max() - xs.min()
    f = ImageFont.truetype(str(FONTE_GRANDE[1]), 1000)
    x0, _, x1, _ = f.getbbox("HHHH")
    k = largura_libass / ((x1 - x0) / 1000 * 200)
    _calibracao.update(k=k, base=(ys.max() + 1 - 200) / 200)
    return _calibracao["k"], _calibracao["base"]


def largura(txt, fonte, em):
    from PIL import ImageFont
    return ImageFont.truetype(str(fonte[1]), 1000).getlength(txt) * em / 1000


# ---------- legendas ASS ----------

def cor_ass(hexa):
    h = hexa.lstrip("#")
    return f"&H{h[4:6]}{h[2:4]}{h[0:2]}&".upper()


def ts(t):
    t = max(t, 0)
    h, r = divmod(t, 3600)
    m, s = divmod(r, 60)
    return f"{int(h)}:{int(m):02d}:{s:05.2f}"


def esc(txt):
    return txt.replace("\\", "").replace("{", "(").replace("}", ")")


def cabecalho(w, h, estilos_extra=""):
    return f"""[Script Info]
ScriptType: v4.00+
PlayResX: {w}
PlayResY: {h}
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Base,Poppins,50,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,7,0,0,0,1
{estilos_extra}
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""


def montar_blocos(specs, mantidas):
    """Transforma {"de", "ate", "linhas"?, "destaque"?, "aspas"?} em linhas prontas.
    Sem "linhas": a palavra final (estendida até ter 6 letras) vira destaque; o resto
    vira uma linha pequena ou, se for longo, uma grande seguida de uma pequena."""
    por_i = {p["i"]: p for p in mantidas}
    blocos = []
    for sp in specs:
        ws = [por_i[i] for i in range(int(sp["de"]), int(sp["ate"]) + 1) if i in por_i]
        if not ws:
            continue
        if sp.get("linhas"):
            linhas = []
            for n, (a, b) in enumerate(sp["linhas"]):
                grupo = [p for p in ws if a <= p["i"] <= b]
                tipo = "destaque" if n == len(sp["linhas"]) - 1 else (
                    "grande" if n == 0 and len(sp["linhas"]) == 3 else "pequeno")
                linhas.append((tipo, grupo))
            tipos = sp.get("tipos")
            if tipos:
                linhas = [(t, g) for t, (_, g) in zip(tipos, linhas)]
        else:
            if sp.get("destaque"):
                a, b = sp["destaque"]
                dest = [p for p in ws if a <= p["i"] <= b]
            else:
                dest = [ws[-1]]
                while len(ws) > len(dest) and len(re.sub(r"\W", "", " ".join(
                        p["t"] for p in dest))) < 6:
                    dest.insert(0, ws[len(ws) - len(dest) - 1])
            resto = [p for p in ws if p not in dest]
            texto_resto = " ".join(p["t"] for p in resto)
            if not resto:
                linhas = [("destaque", dest)]
            elif len(texto_resto) <= 16:
                linhas = [("pequeno", resto), ("destaque", dest)]
            else:
                um = [resto[0]]
                for p in resto[1:]:
                    if len(" ".join(x["t"] for x in um + [p])) > 16 or len(um) >= 3:
                        break
                    um.append(p)
                dois = resto[len(um):]
                linhas = [("grande", um), ("pequeno", dois), ("destaque", dest)]
        blocos.append({"linhas": [(t, g) for t, g in linhas if g],
                       "aspas": bool(sp.get("aspas")), "palavras": ws})
    return blocos


def eventos(mantidas, specs_blocos, info, cfg, dur_final):
    """Devolve (linhas Dialogue, tempos dos tics, intervalos dos blocos)."""
    w, h = info["largura"], info["altura"]
    k, base = calibrar()
    branco, amarelo = cor_ass(cfg["cor_texto"]), cor_ass(cfg["cor_destaque"])
    blocos = montar_blocos(specs_blocos, mantidas)
    em_bloco = {}
    for b in blocos:
        for p in b["palavras"]:
            em_bloco[p["i"]] = b
    linhas, tics, faixas = [], [], []

    def queixo(t):
        if not cfg.get("ancorar_queixo") or not cfg.get("queixos"):
            return None
        for a, b, y in cfg["queixos"]:
            if a <= t < b:
                return y
        return cfg["queixos"][-1][2]

    def y_palavra(t):
        for a0, b0, yf in cfg.get("y_fixo", []):
            if a0 <= t < b0:
                return yf * h
        q = queixo(t)
        y = cfg["palavra_y"] if q is None else q + cfg["queixo_palavra"]
        return min(max(y, 0.35), 0.80) * h
    sem_sombra = cfg.get("sombra") == "nenhuma"
    forte = cfg.get("sombra") == "forte"
    sombra_alfa = "&H38&" if forte else "&H90&"
    sombra_blur = 10 if forte else 7
    # Contorno escuro quase transparente: só aparece contra fundo claro.
    reforco = "\\bord{b:.1f}\\3c&H000000&\\3a&HA8&" if forte else ""

    # Janelas de cada bloco: do início da primeira palavra até a próxima fala depois dele.
    seguinte = {}
    for n, p in enumerate(mantidas):
        seguinte[p["i"]] = mantidas[n + 1] if n + 1 < len(mantidas) else None
    for b in blocos:
        ws = b["palavras"]
        ini = max(0.0, ws[0]["ini2"] - 0.03)
        letras = sum(len(re.sub(r"\s", "", " ".join(p["t"] for p in g)))
                     for t, g in b["linhas"] if t == "destaque")
        t_dest = next((g[0]["ini2"] for t, g in b["linhas"] if t == "destaque"), ws[-1]["ini2"])
        fim_min = t_dest + letras * cfg["letra_ms"] / 1000 + 0.45
        prox = seguinte[ws[-1]["i"]]
        fim = min(ws[-1]["fim2"] + 0.6, prox["ini2"] - 0.02 if prox else dur_final)
        b["ini"], b["fim"] = ini, min(max(fim, fim_min), dur_final)
        faixas.append((b["ini"], b["fim"]))

    # Palavras soltas.
    em_p = cfg["palavra_em"] * w
    fs_p = em_p / k
    soltas = [p for p in mantidas if p["i"] not in em_bloco]
    for n, p in enumerate(soltas):
        ini = p["ini2"] - 0.02
        prox = soltas[n + 1]["ini2"] - 0.02 if n + 1 < len(soltas) else dur_final
        fim = prox if prox - p["fim2"] < 0.7 else p["fim2"] + 0.25
        for b0, b1 in list(faixas) + list(cfg.get("ocultar", [])):
            if ini < b0 < fim:
                fim = b0
            if b0 <= ini < b1:
                ini = b1
        if fim - ini < 0.04:
            continue
        txt = esc(p["t"])
        cor = branco
        pop = "\\fscx112\\fscy112\\t(0,120,\\fscx100\\fscy100)" if p.get("chave") else ""
        pos = f"\\an5\\pos({w / 2:.0f},{y_palavra(ini):.0f})"
        pos_s = f"\\an5\\pos({w / 2:.0f},{y_palavra(ini) + em_p * 0.06:.0f})"
        fonte = f"\\fn{FONTE_PALAVRA[0]}\\b0\\fs{fs_p:.1f}"
        if not sem_sombra:
            linhas.append(f"Dialogue: 0,{ts(ini)},{ts(fim)},Base,,0,0,0,,"
                          f"{{{pos_s}{fonte}\\1c&H000000&\\alpha{sombra_alfa}\\blur{sombra_blur}{pop}}}{txt}")
        linhas.append(f"Dialogue: 1,{ts(ini)},{ts(fim)},Base,,0,0,0,,"
                      f"{{{pos}{fonte}\\1c{cor}{reforco.format(b=em_p * 0.035)}{pop}}}{txt}")

    # Blocos de impacto.
    for b in blocos:
        partes = []
        for n, (tipo, grupo) in enumerate(b["linhas"]):
            textos = [p["t"] for p in grupo]
            if b["aspas"] and n == 0:
                textos[0] = "“" + textos[0]
            if b["aspas"] and n == len(b["linhas"]) - 1:
                textos[-1] = textos[-1] + "”"
            frase = " ".join(textos)
            fonte = FONTE_PALAVRA if tipo == "pequeno" else FONTE_GRANDE
            alvo = {"grande": (cfg["bloco_em_grande"], 0.66), "pequeno":
                    (cfg["bloco_em_pequeno"], 0.80), "destaque": (cfg["bloco_em_grande"], 0.80)}
            em_max, larg_max = alvo[tipo]
            em = min(em_max * w, larg_max * w / max(largura(frase, fonte, 1), 1e-6))
            partes.append({"tipo": tipo, "grupo": grupo, "textos": textos, "fonte": fonte,
                           "em": em, "larg": largura(frase, fonte, em)})
        # Linhas de base: entrelinha apertada, como na referência.
        y = 0.0
        for n, pt in enumerate(partes):
            if n:
                antes = partes[n - 1]
                if pt["tipo"] == "pequeno":
                    y += 0.80 * pt["em"]
                elif antes["tipo"] == "pequeno":
                    y += 0.70 * pt["em"]
                else:
                    y += 0.80 * pt["em"]
            pt["base"] = y
        topo = partes[0]["base"] - 0.74 * partes[0]["em"]
        fundo = partes[-1]["base"] + 0.12 * partes[-1]["em"]
        q = queixo(b["ini"])
        if q is None:
            desloc_y = cfg["bloco_y"] * h - (topo + fundo) / 2
        else:
            alvo = min(max(q + cfg["queixo_bloco"], 0.30), 0.86 - (fundo - topo) / h)
            desloc_y = alvo * h - topo
        # Escada: pequena levemente recuada, destaque alinhado à direita da primeira linha.
        x = 0.0
        for n, pt in enumerate(partes):
            if n == 0:
                pt["x"] = 0.0
            elif pt["tipo"] == "pequeno":
                pt["x"] = (-0.03 if partes[0]["tipo"] == "grande" else 0.0) * w
            elif pt["tipo"] == "destaque" and partes[0]["tipo"] == "grande" \
                    and pt["larg"] < partes[0]["larg"]:
                pt["x"] = partes[0]["larg"] - pt["larg"]
            else:
                pt["x"] = 0.03 * w if partes[0]["tipo"] == "pequeno" else 0.0
        minx = min(pt["x"] for pt in partes)
        maxx = max(pt["x"] + pt["larg"] for pt in partes)
        desloc_x = (w - (maxx - minx)) / 2 - minx
        for pt in partes:
            pt["x"] = max(0.05 * w, pt["x"] + desloc_x)

        for pt in partes:
            fs = pt["em"] / k
            y_ass = pt["base"] + desloc_y - base * fs
            fonte = f"\\fn{pt['fonte'][0]}\\b{pt['fonte'][2]}\\fs{fs:.1f}"
            for sombra in ((False,) if sem_sombra else (True, False)):
                cab = (f"\\an7\\pos({pt['x']:.0f},{y_ass + (pt['em'] * 0.05 if sombra else 0):.0f})"
                       f"{fonte}\\fad(0,120)")
                if sombra:
                    cab += f"\\1c&H000000&\\blur{sombra_blur + 1}"
                else:
                    cab += reforco.format(b=pt["em"] * 0.03)
                # Anima só o preenchimento: \\alpha mexeria também no contorno.
                if sombra:
                    some, aparece = "\\alpha&HFF&", f"\\alpha{sombra_alfa}"
                elif forte:
                    some, aparece = "\\1a&HFF&\\3a&HFF&", "\\1a&H00&\\3a&HA8&"
                else:
                    some, aparece = "\\alpha&HFF&", "\\alpha&H00&"
                corpo = []
                if pt["tipo"] == "destaque":
                    t0 = (pt["grupo"][0]["ini2"] - b["ini"]) * 1000
                    n_letra = 0
                    texto = " ".join(pt["textos"])
                    dur_tracking = len(re.sub(r"\s", "", texto)) * cfg["letra_ms"] + 150
                    cab += (f"\\fsp{pt['em'] * 0.30:.0f}"
                            f"\\t({t0:.0f},{t0 + dur_tracking:.0f},0.6,\\fsp0)")
                    if not sombra:
                        cab += f"\\1c{amarelo}"
                    for c in texto:
                        if c == " ":
                            corpo.append(" ")
                            continue
                        tk = t0 + n_letra * cfg["letra_ms"]
                        n_letra += 1
                        corpo.append(f"{{{some}\\t({tk:.0f},{tk + 100:.0f},{aparece})}}{esc(c)}")
                        if not sombra and c.isalnum():
                            tics.append(b["ini"] + tk / 1000)
                else:
                    if not sombra:
                        cab += f"\\1c{cor_ass(cfg['cor_texto'])}"
                    for p, txt in zip(pt["grupo"], pt["textos"]):
                        tw = max(0.0, (p["ini2"] - b["ini"]) * 1000)
                        blur = "" if sombra else "\\blur10"
                        volta = "" if sombra else "\\blur0"
                        corpo.append(f"{{{some}{blur}\\t({tw:.0f},{tw + 160:.0f},"
                                     f"{aparece}{volta})}}{esc(txt)}")
                    corpo = [" ".join(corpo)]
                linhas.append(f"Dialogue: {2 if sombra else 3},{ts(b['ini'])},{ts(b['fim'])},Base,,"
                              f"0,0,0,,{{{cab}}}{''.join(corpo)}")
    return linhas, tics, faixas


# ---------- punch-in ----------

def rosto(video, instantes, info):
    """(x, y, altura) do rosto: mediana de algumas amostras, ou um palpite no alto do quadro."""
    palpite = (info["largura"] / 2, info["altura"] * 0.33, info["altura"] * 0.10)
    try:
        import cv2
        cc = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    except Exception:
        return palpite
    cap = cv2.VideoCapture(str(video))
    achados = []
    for t in instantes:
        cap.set(cv2.CAP_PROP_POS_MSEC, t * 1000)
        ok, fr = cap.read()
        if not ok:
            continue
        esc_ = 540 / fr.shape[1]
        g = cv2.cvtColor(cv2.resize(fr, None, fx=esc_, fy=esc_), cv2.COLOR_BGR2GRAY)
        f = cc.detectMultiScale(g, 1.1, 6, minSize=(40, 40))
        if len(f):
            x, y, fw, fh = max(f, key=lambda r: r[2])
            achados.append(((x + fw / 2) / esc_, (y + fh / 2) / esc_, fh / esc_))
    cap.release()
    if not achados:
        return palpite
    return tuple(float(np.median([a[k] for a in achados])) for k in range(3))


def recorte(fx, fy, z, info):
    """Canto superior esquerdo do recorte do punch-in (o rosto mantém a altura relativa)."""
    w, h = info["largura"], info["altura"]
    zw, zh = w / z, h / z
    return min(max(fx - zw / 2, 0), w - zw), min(max(fy * (1 - 1 / z), 0), h - zh)


def queixos(planos, rostos, info):
    """Altura do queixo (fração da altura) em cada plano, já com o zoom aplicado."""
    h = info["altura"]
    saida = []
    for (a, b, z), (fx, fy, fh) in zip(planos, rostos):
        _, y0 = recorte(fx, fy, z, info)
        queixo = fy + 0.55 * fh
        saida.append((a, b, (queixo - y0) * z / h))
    return saida


def planejar_planos(trechos, mantidas, dur_final, zcfg, forcados=()):
    """Troca de plano nos cortes e nos fins de frase; passou de plano_max, troca na
    próxima pausa entre palavras. Cortes forçados (fim do gancho) sempre entram."""
    cortes = []
    acum = 0.0
    for a, b in trechos[:-1]:
        acum += b - a
        cortes.append(acum)
    finais = [p["fim2"] + 0.02 for p in mantidas if re.search(r"[.!?]$", p["t"])]
    virgulas = [p["fim2"] + 0.02 for p in mantidas if re.search(r"[,;:]$", p["t"])]
    pausas = [p["fim2"] + 0.02 for p in mantidas]
    candidatos = sorted(set(round(c, 3) for c in cortes + finais + virgulas + pausas
                            + list(forcados)))
    planos, ini = [], 0.0
    for c in candidatos:
        dur = c - ini
        if dur < 0.8 or dur_final - c < 1.2:
            continue
        forte = any(abs(c - f) < 0.05 for f in list(forcados))
        frase = any(abs(c - f) < 0.35 for f in finais + cortes)
        virgula = any(abs(c - f) < 0.05 for f in virgulas)
        if (forte or (dur >= zcfg["plano_min"] and frase)
                or (dur >= zcfg["plano_min"] + 1.5 and virgula) or dur >= zcfg["plano_max"]):
            planos.append([ini, c])
            ini = c
    planos.append([ini, dur_final])
    niveis = zcfg["niveis"]
    return [(a, b, niveis[n % len(niveis)]) for n, (a, b) in enumerate(planos)]


def sobrepor_planos(planos, forcados):
    """Insere trechos com zoom fixo (capítulos) por cima do plano de cortes."""
    for fa, fb, fz in sorted(forcados):
        novos = []
        for a, b, z in planos:
            if b <= fa or a >= fb:
                novos.append((a, b, z))
                continue
            if a < fa:
                novos.append((a, fa, z))
            if b > fb:
                novos.append((fb, b, z))
        novos.append((fa, fb, fz))
        planos = sorted(novos)
    return [p for p in planos if p[1] - p[0] > 0.04]


def claridade(video, instantes, info, y_frac):
    """Luminância média (0-255) da faixa onde ficam as legendas."""
    try:
        import cv2
    except Exception:
        return 0.0
    cap = cv2.VideoCapture(str(video))
    vals = []
    for t in instantes:
        cap.set(cv2.CAP_PROP_POS_MSEC, t * 1000)
        ok, fr = cap.read()
        if not ok:
            continue
        g = cv2.cvtColor(fr, cv2.COLOR_BGR2GRAY)
        hh, ww = g.shape
        y0, y1 = int(hh * (y_frac - 0.07)), int(hh * (y_frac + 0.07))
        vals.append(float(g[y0:y1, int(ww * 0.2):int(ww * 0.8)].mean()))
    cap.release()
    return float(np.median(vals)) if vals else 0.0


def filtro_zoom(planos, centros, info):
    w, h = info["largura"], info["altura"]
    zs, xs, ys = [], [], []
    for (a, b, z), (fx, fy, *_) in zip(planos, centros):
        x0, y0 = recorte(fx, fy, z, info)
        zs.append((b, z))
        xs.append((b, x0))
        ys.append((b, y0))

    def escada(pares):
        expr = f"{pares[-1][1]:.4f}"
        for fim, v in reversed(pares[:-1]):
            expr = f"if(lt(it\\,{fim:.4f})\\,{v:.4f}\\,{expr})"
        return expr
    return (f"zoompan=z='{escada(zs)}':x='{escada(xs)}':y='{escada(ys)}'"
            f":d=1:s={w}x{h}:fps={info['fps']:.5f}")


# ---------- efeitos sonoros ----------

SR = 48000


def _tic():
    n = int(0.014 * SR)
    t = np.arange(n) / SR
    ruido = np.random.default_rng(7).standard_normal(n)
    espectro = np.fft.rfft(ruido)
    f = np.fft.rfftfreq(n, 1 / SR)
    ruido = np.fft.irfft(espectro * ((f > 2500) & (f < 8000)), n)
    som = ruido / np.abs(ruido).max() * np.exp(-t / 0.0022) + \
        0.6 * np.sin(2 * np.pi * 3400 * t) * np.exp(-t / 0.0035)
    return som / np.abs(som).max()


def _impacto():
    """Whoosh curto subindo até o corte e um grave descendo depois dele."""
    pre, pos = 0.35, 0.9
    t1 = np.arange(int(pre * SR)) / SR
    ruido = np.random.default_rng(3).standard_normal(len(t1))
    esp = np.fft.rfft(ruido)
    f = np.fft.rfftfreq(len(ruido), 1 / SR)
    ruido = np.fft.irfft(esp * ((f > 250) & (f < 3500)), len(ruido))
    whoosh = ruido / np.abs(ruido).max() * (t1 / pre) ** 2.2 * 0.35
    t2 = np.arange(int(pos * SR)) / SR
    freq = 42 + 70 * np.exp(-t2 / 0.12)
    grave = np.sin(2 * np.pi * np.cumsum(freq) / SR) * np.exp(-t2 / 0.28)
    grave[: int(0.004 * SR)] *= np.linspace(0, 1, int(0.004 * SR))
    return np.concatenate([whoosh, grave]), pre


def _whoosh():
    """Ruído com filtro varrendo do grave ao agudo e de volta, em ~0,45 s."""
    n = int(0.45 * SR)
    ruido = np.random.default_rng(11).standard_normal(n)
    janelas, passo = [], 1024
    saida = np.zeros(n)
    for i in range(0, n, passo):
        pedaco = ruido[i:i + passo]
        f = np.fft.rfftfreq(len(pedaco), 1 / SR)
        fase = i / n
        centro = 300 + 3500 * np.sin(np.pi * fase)
        filtro = np.exp(-((f - centro) / (centro * 0.6)) ** 2)
        saida[i:i + passo] = np.fft.irfft(np.fft.rfft(pedaco) * filtro, len(pedaco))
    env = np.sin(np.pi * np.linspace(0, 1, n)) ** 1.5
    som = saida * env
    return som / np.abs(som).max()


def trilha_sfx(dur, tics, impactos, scfg, caminho, whooshes=()):
    import wave
    faixa = np.zeros(int((dur + 1.5) * SR))
    if whooshes:
        wh = _whoosh() * 10 ** (scfg.get("volume_whoosh_db", -16) / 20)
        for t in whooshes:
            i = max(0, int((t - 0.2) * SR))
            faixa[i:i + len(wh)] += wh[: len(faixa) - i]
    if scfg["ticks"]:
        tic = _tic() * 10 ** (scfg["volume_tick_db"] / 20)
        for t in tics:
            i = int(t * SR)
            faixa[i:i + len(tic)] += tic[: len(faixa) - i]
    if scfg["impacto"]:
        som, pre = _impacto()
        som = som * 10 ** (scfg["volume_impacto_db"] / 20)
        for t in impactos:
            i = max(0, int((t - pre) * SR))
            faixa[i:i + len(som)] += som[: len(faixa) - i]
    faixa = np.clip(faixa, -1, 1)
    with wave.open(str(caminho), "w") as wv:
        wv.setnchannels(1)
        wv.setsampwidth(2)
        wv.setframerate(SR)
        wv.writeframes((faixa * 32767).astype(np.int16).tobytes())


def filtro_cor(ccfg):
    if not ccfg.get("ativo", True):
        return []
    c = ccfg["calor"]
    return [f"eq=contrast={ccfg['contraste']}:saturation={ccfg['saturacao']}",
            f"colorbalance=rm={c:.3f}:bm={-c:.3f}:rh={c / 2:.3f}:bh={-c / 2:.3f}"]


def novo_para_original(t, trechos):
    acum = 0.0
    for a, b in trechos:
        if t <= acum + (b - a):
            return a + (t - acum)
        acum += b - a
    return trechos[-1][1]


def ass_completo(info, linhas, estilos_extra=""):
    return cabecalho(info["largura"], info["altura"], estilos_extra) + "\n".join(linhas) + "\n"

