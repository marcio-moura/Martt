"""Prepara um vídeo novo no padrão MARTT: baixa, transcreve, detecta cortes e preços e
gera um rascunho de plano.json para revisar.

Uso:
  python3 preparar.py <pasta_do_video> <link_ou_id_do_drive | caminho_local> "<Nome da loja>"

Saídas na pasta:
  bruto.mov (ou .mp4)   vídeo original
  words.json            transcrição palavra por palavra
  roteiro.txt           transcrição com tempos, frases e cortes (para revisar)
  plano.json            rascunho: trechos, preços, títulos, destaques (revisar nomes e caixas!)
  conferir/             folhas de quadros: geral e um quadro com grade em cada preço
"""
import json, os, re, subprocess, sys, wave
import numpy as np, cv2

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
from editor import juntar_moeda  # noqa: E402

SR = 16000


def baixar(origem, pasta):
    if os.path.exists(origem):
        destino = os.path.join(pasta, "bruto" + os.path.splitext(origem)[1].lower())
        if not os.path.exists(destino): os.symlink(os.path.abspath(origem), destino)
        return destino
    m = re.search(r"/d/([\w-]+)", origem) or re.search(r"id=([\w-]+)", origem)
    fid = m.group(1) if m else origem
    tmp = os.path.join(pasta, "bruto.download")
    subprocess.run(["curl", "-sSL", "-o", tmp,
                    f"https://drive.usercontent.google.com/download?id={fid}&export=download&confirm=t"], check=True)
    tipo = subprocess.run(["file", "-b", tmp], capture_output=True, text=True).stdout
    if "QuickTime" in tipo: ext = ".mov"
    elif "MP4" in tipo or "ISO Media" in tipo: ext = ".mp4"
    else: raise SystemExit(f"o download não é um vídeo ({tipo.strip()}). O link está público?")
    destino = os.path.join(pasta, "bruto" + ext); os.replace(tmp, destino)
    return destino


def transcrever(video, pasta):
    wav = os.path.join(pasta, "a16k.wav")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", video, "-ac", "1", "-ar", str(SR), wav], check=True)
    w = wave.open(wav); a = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
    from faster_whisper import WhisperModel
    m = WhisperModel("medium", device="cpu", compute_type="int8")
    segs, _ = m.transcribe(a, language="pt", word_timestamps=True)
    palavras = [dict(w=x.word.strip(), s=round(x.start, 2), e=round(x.end, 2)) for s in segs for x in s.words]
    json.dump(palavras, open(os.path.join(pasta, "words.json"), "w"), ensure_ascii=False)
    return palavras, a


def cortes(video):
    c = cv2.VideoCapture(video); fps = c.get(cv2.CAP_PROP_FPS); p = None; i = 0; cs = []
    while True:
        ok, f = c.read()
        if not ok: break
        g = cv2.resize(cv2.cvtColor(f, cv2.COLOR_BGR2GRAY), (60, 107)).astype(float)
        if p is not None and abs(g - p).mean() > 18:
            t = round(i / fps, 2)
            if not cs or t - cs[-1] > 0.3: cs.append(t)
            else: cs[-1] = t      # rajada de cortes (transição/tremida): fica o último
        p = g; i += 1
    return cs, i / fps


def inicio_fala(a, t0, t1, limiar=0.05):
    """primeiro instante com fala forte (ignora o 'foi' baixinho de quem filma)"""
    j = int(t0 * SR); n = int(0.02 * SR)
    while j + n < int(t1 * SR):
        if np.sqrt((a[j:j + n] ** 2).mean()) > limiar: return max(t0, j / SR - 0.06)
        j += n
    return t0


def fim_fala(a, t0, t1, limiar=0.03):
    j = int(t1 * SR); n = int(0.02 * SR)
    while j - n > int(t0 * SR):
        if np.sqrt((a[j - n:j] ** 2).mean()) > limiar: return min(t1, j / SR + 0.12)
        j -= n
    return t1


def trechos(palavras, a, cs, dur):
    """cenas pelos cortes; dentro de cada cena corta o começo/fim sem fala e pausas > 1.2 s"""
    limites = [0.0] + cs + [dur]; out = []
    for c0, c1 in zip(limites, limites[1:]):
        ws = [w for w in palavras if c0 - 0.1 <= w["s"] < c1]
        if not ws: continue
        blocos, cur = [], [ws[0]]
        for w in ws[1:]:
            g0, g1 = int(cur[-1]["e"] * SR), int(w["s"] * SR)
            pausa_real = g1 - g0 > 1.2 * SR and np.sqrt((a[g0:g1] ** 2).mean()) < 0.02
            if pausa_real: blocos.append(cur); cur = []
            elif w["s"] - cur[-1]["e"] > 1.2:
                print(f"ATENÇÃO: {cur[-1]['e']:.1f}-{w['s']:.1f}s tem som mas nenhuma palavra transcrita — conferir")
            cur.append(w)
        blocos.append(cur)
        for b in blocos:
            s = inicio_fala(a, max(c0, b[0]["s"] - 0.8), c1)
            e = max(fim_fala(a, s, min(c1, b[-1]["e"] + 0.5)), min(c1, b[-1]["e"] + 0.15))   # nunca corta a última palavra
            if e - s > 0.4: out.append([round(float(s), 2), round(float(e), 2)])
    return out


PALAVRAS_POR = ("por", "para")
LIGACOES = ("e", "com", "o", "a", "os", "as", "no", "na", "hidratante", "também", "temos", "de")


def nome_antes(ws, i):
    """palavras antes da posição i, até pontuação, pausa, preço ou 7 palavras"""
    k = i
    while k > 0 and i - k < 7 and not re.search(r"[.!?]$", ws[k - 1]["w"]) \
            and not re.search(r"\d", ws[k - 1]["w"]) and ws[k - 1]["w"].lower().strip(",") not in ("apenas", "por", "para") \
            and ws[k]["s"] - ws[k - 1]["e"] < 0.45:
        k -= 1
    while k < i and ws[k]["w"].lower().strip(",") in LIGACOES:
        k += 1
    return k


def fmt(v):
    n = v["w"][2:].strip(".,")
    return "R$ " + (n if "," in n else n + ",00")


def precos(ws):
    """'de R$X ... por/para (apenas) R$Y' e preço único '... (saindo) por apenas R$Y'"""
    achados, usados = [], set()
    for i, w in enumerate(ws):
        if w["w"].lower() != "de" or i + 1 >= len(ws) or not ws[i + 1]["w"].startswith("R$"): continue
        por = next((j for j in range(i + 2, min(i + 7, len(ws))) if ws[j]["w"].lower().strip(".,") in PALAVRAS_POR), None)
        if por is None: continue
        novo = next((j for j in range(por + 1, min(por + 4, len(ws))) if ws[j]["w"].startswith("R$")), None)
        if novo is None: continue
        k = nome_antes(ws, i); usados.add(novo)
        prox = ws[novo + 1]["s"] if novo + 1 < len(ws) else ws[novo]["e"] + 1
        achados.append(dict(nome=" ".join(x["w"].strip(".,") for x in ws[k:i]) or "PRODUTO", de=fmt(ws[i + 1]), por=fmt(ws[novo]),
                            t_nome=ws[k]["s"] if k < i else None, t_de=w["s"], t_risco=ws[por]["s"],
                            t_por=ws[novo]["s"], ate=round(min(ws[novo]["e"] + 0.8, prox - 0.05), 2)))
    for j, w in enumerate(ws):   # preço único
        if j in usados or not w["w"].startswith("R$") or j < 2: continue
        if ws[j - 1]["w"].lower() != "apenas" or ws[j - 2]["w"].lower() not in PALAVRAS_POR: continue
        if any(ws[x]["w"].startswith("R$") for x in range(max(0, j - 7), j)): continue
        ini = j - 2
        if ini > 0 and ws[ini - 1]["w"].lower() in ("saindo", "está"): ini -= 1
        if ini > 0 and ws[ini - 1]["w"].lower() == "está": ini -= 1
        k = nome_antes(ws, ini)
        prox = ws[j + 1]["s"] if j + 1 < len(ws) else w["e"] + 1
        achados.append(dict(nome=" ".join(x["w"].strip(".,") for x in ws[k:ini]) or "PRODUTO", de=None, por=fmt(w),
                            t_nome=ws[k]["s"] if k < ini else None, t_de=ws[ini]["s"], t_risco=ws[ini]["s"],
                            t_por=w["s"], ate=round(min(w["e"] + 0.8, prox - 0.05), 2)))
    return sorted(achados, key=lambda p: p["t_de"])


def quadros(video, pasta, tempos, nome, grade=True):
    c = cv2.VideoCapture(video); fps = c.get(cv2.CAP_PROP_FPS); fs = []
    for t in tempos:
        c.set(cv2.CAP_PROP_POS_FRAMES, int(t * fps)); ok, f = c.read()
        if not ok: continue
        f = cv2.resize(f, (1080, 1920))
        if grade:
            for y in range(0, 1920, 100): cv2.line(f, (0, y), (1080, y), (0, 255, 0), 3 if y % 200 == 0 else 1)
            for x in range(0, 1080, 100): cv2.line(f, (x, 0), (x, 1920), (0, 255, 0), 3 if x % 200 == 0 else 1)
            for y in range(200, 1920, 200): cv2.putText(f, str(y), (5, y + 45), 0, 1.5, (0, 255, 0), 4)
            for x in range(200, 1080, 200): cv2.putText(f, str(x), (x + 5, 1890), 0, 1.5, (0, 255, 0), 4)
        cv2.putText(f, f"{t:.1f}s", (360, 140), 0, 3, (0, 0, 255), 7)
        fs.append(cv2.resize(f, (360, 640)))
    if not fs: return
    linhas = [cv2.hconcat(fs[i:i + 4] + [np.zeros_like(fs[0])] * (4 - len(fs[i:i + 4]))) for i in range(0, len(fs), 4)]
    os.makedirs(os.path.join(pasta, "conferir"), exist_ok=True)
    cv2.imwrite(os.path.join(pasta, "conferir", nome), cv2.vconcat(linhas))


def main(pasta, origem, loja):
    os.makedirs(pasta, exist_ok=True)
    modelo = json.load(open(os.path.join(os.path.dirname(os.path.abspath(pasta)), "modelo-plano.json")))
    ja = [f for f in os.listdir(pasta) if f.startswith("bruto.") and not f.endswith("download")]
    video = os.path.join(pasta, ja[0]) if ja else baixar(origem, pasta); print("vídeo:", video)
    if os.path.exists(os.path.join(pasta, "words.json")) and os.path.exists(os.path.join(pasta, "a16k.wav")):
        palavras = json.load(open(os.path.join(pasta, "words.json")))
        w = wave.open(os.path.join(pasta, "a16k.wav")); a = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
    else:
        palavras, a = transcrever(video, pasta)
    print("palavras:", len(palavras))
    cs, dur = cortes(video); print("cortes:", cs)
    ws = juntar_moeda(palavras, modelo["correcoes_base"])
    segs = trechos(palavras, a, cs, dur)
    prs = precos(ws)
    cidade = loja.replace("Natura", "").strip()
    destaques = modelo["destaques_base"] + [p.lower() for p in cidade.split()]
    destaques += [w["w"].strip(".,") for w in ws if "%" in w["w"]]
    titulos = []
    for i, w in enumerate(ws):
        if w["w"].lower() == "esquenta" and i + 1 < len(ws) and ws[i + 1]["w"].lower().startswith("black"):
            if not titulos or w["s"] - titulos[-1]["de"] > 3:
                titulos.append({"texto": "Esquenta\nBlack", "de": round(w["s"] - 0.05, 2), "ate": round(w["s"] + 1.8, 2), "y": 0.03})
        if "%" in w["w"]:
            titulos.append({"texto": "Até\n" + w["w"].strip(".,") + " OFF", "de": round(w["s"] - 0.1, 2), "ate": round(w["s"] + 2.2, 2), "y": 0.03})
    plano = {k: v for k, v in modelo.items() if k not in ("destaques_base", "correcoes_base", "zoom_preco", "titulo_padrao")}
    plano.update({
        "loja": loja, "video": os.path.basename(video), "saida": "saida/esquenta-black-" + cidade.lower().replace(" ", "-") + ".mp4",
        "segmentos": segs, "correcoes": modelo["correcoes_base"], "titulos": titulos,
        "precos": [dict(p, rastrear={"t": p["t_de"], "caixa": [0, 0, 100, 100], "_REVISAR": True})
                   for p in prs],
        "zooms": [{"de": p["t_por"], "ate": p["ate"], "escala": modelo["zoom_preco"]["escala"], "cx": 540, "cy": 850} for p in prs],
        "destaques": sorted(set(destaques)),
    })
    for p in plano["precos"]:
        if p["t_nome"] is None: del p["t_nome"]
    json.dump(plano, open(os.path.join(pasta, "plano.json"), "w"), ensure_ascii=False, indent=1)
    # roteiro para revisar
    with open(os.path.join(pasta, "roteiro.txt"), "w") as f:
        f.write(f"{loja}  —  duração {dur:.1f}s  —  cortes: {cs}\n\nTRECHOS: {segs}\n\nFALA:\n")
        linha, st = [], None
        for i, w in enumerate(ws):
            st = w["s"] if st is None else st; linha.append(w["w"])
            if i == len(ws) - 1 or ws[i + 1]["s"] - w["e"] > 0.5 or len(linha) > 14:
                f.write(f"[{st:6.2f}-{w['e']:6.2f}] {' '.join(linha)}\n"); linha, st = [], None
        f.write("\nPREÇOS DETECTADOS (conferir nome e preço com a lista da loja):\n")
        for p in prs: f.write(f"  {p['t_de']:6.2f}s  {p['nome']}: {p['de']} -> {p['por']}\n")
    quadros(video, pasta, list(np.arange(0.5, dur, max(1.0, dur / 24))), "geral.jpg", grade=False)
    quadros(video, pasta, [p["t_de"] for p in prs] + [p["t_por"] for p in prs], "precos-grade.jpg")
    print(open(os.path.join(pasta, "roteiro.txt")).read())


if __name__ == "__main__":
    main(*sys.argv[1:4])
