#!/usr/bin/env python3
"""Edição de vídeo da Martt: corta pausas, legenda e renderiza.

Fluxo em duas etapas, para dar espaço à revisão editorial entre elas:

    python video/editar.py transcrever <video> [--nome NOME] [--modelo small]
        Cria video/projetos/<nome>/ com:
          transcricao.json  palavras com índice e tempo (não editar)
          transcricao.txt   leitura humana, com os índices das palavras
          edicao.json       decisões editoriais (editar à vontade)

    python video/editar.py renderizar <nome>
        Lê edicao.json e gera final.mp4 e legendas.srt na pasta do projeto.

O edicao.json aceita:
  correcoes          {"índice": "texto corrigido"}  ("" apaga a palavra da legenda)
  remover            [[ini, fim], ...] faixas de índices cortadas do vídeo (inclusivas)
  palavras_chave     ["texto", ...] entram com fade-in e cor de destaque
  palavras_chave_indices  [índice, ...] o mesmo, para uma ocorrência específica
  elementos          [{"tipo": "titulo"|"destaque"|"nome", "palavra": índice,
                       "duracao": s, "texto": "...", "subtexto": "..."}]
  estilo             cor_destaque, cor_texto, fonte, maiusculas, posicao (auto|baixo|meio)
  corte              pausa_max, margem_antes, margem_depois (segundos)
  audio              normalizar (bool), reduzir_ruido (bool)
"""

import argparse
import json
import math
import re
import subprocess
import sys
import unicodedata
from pathlib import Path

RAIZ = Path(__file__).resolve().parent
PROJETOS = RAIZ / "projetos"

# Hesitações que nunca carregam sentido. "é" fica de fora: é verbo.
# "um", "a" e "e" também ficam: são artigo, número e conjunção.
HESITACOES = {"ah", "ãh", "ahn", "eh", "éh", "hã", "hum", "hm", "hmm", "mm", "uh", "uhm"}

ESTILO_PADRAO = {
    "fonte": "Inter",
    "cor_texto": "#FFFFFF",
    "cor_destaque": "#FFD400",
    "maiusculas": False,
    "posicao": "auto",
    "max_palavras": 5,
    "max_caracteres": 30,
}
CORTE_PADRAO = {"pausa_max": 0.30, "margem_antes": 0.06, "margem_depois": 0.12}
AUDIO_PADRAO = {"normalizar": True, "reduzir_ruido": True}

FADE_MS = 280


# ---------- utilidades ----------

def rodar(cmd, **kw):
    r = subprocess.run(cmd, capture_output=True, text=True, **kw)
    if r.returncode != 0:
        sys.exit(f"Falhou: {' '.join(map(str, cmd[:6]))} ...\n{r.stderr[-3000:]}")
    return r.stdout


def normalizar(txt):
    txt = unicodedata.normalize("NFKD", txt.lower())
    txt = "".join(c for c in txt if not unicodedata.combining(c))
    return re.sub(r"[^\w%$]", "", txt)


def eh_hesitacao(txt):
    t = re.sub(r"[^\wãé]", "", txt.lower())
    return t in HESITACOES or re.fullmatch(r"h+m+|u+h+m*|a+h+n?|e+h+|ã{2,}h*", t) is not None


def sondar(video):
    info = json.loads(rodar(["ffprobe", "-v", "error", "-print_format", "json",
                             "-show_streams", "-show_format", str(video)]))
    v = next(s for s in info["streams"] if s["codec_type"] == "video")
    w, h = int(v["width"]), int(v["height"])
    rot = 0
    for sd in v.get("side_data_list", []):
        if "rotation" in sd:
            rot = int(sd["rotation"])
    rot = int(v.get("tags", {}).get("rotate", rot))
    if abs(rot) % 180 == 90:
        w, h = h, w
    num, den = (v.get("avg_frame_rate") or v["r_frame_rate"]).split("/")
    fps = float(num) / float(den) if float(den) else 30.0
    if not 1 <= fps <= 120:
        fps = 30.0
    tem_audio = any(s["codec_type"] == "audio" for s in info["streams"])
    return {"largura": w, "altura": h, "fps": fps,
            "duracao": float(info["format"]["duration"]), "tem_audio": tem_audio}


def tempo(s):
    m, s = divmod(max(s, 0), 60)
    return f"{int(m):02d}:{s:04.1f}"


# ---------- etapa 1: transcrever ----------

def transcrever(args):
    video = Path(args.video).resolve()
    if not video.exists():
        sys.exit(f"Vídeo não encontrado: {video}")
    nome = args.nome or re.sub(r"[^\w-]+", "-", video.stem).strip("-").lower()
    pasta = PROJETOS / nome
    pasta.mkdir(parents=True, exist_ok=True)
    info = sondar(video)

    audio = pasta / "audio16k.wav"
    rodar(["ffmpeg", "-y", "-i", str(video), "-vn", "-ac", "1", "-ar", "16000", str(audio)])

    try:
        from faster_whisper import WhisperModel
    except ImportError:
        sys.exit("Instale o transcritor: pip install faster-whisper")
    print(f"Transcrevendo com o modelo '{args.modelo}' (pode levar alguns minutos)...")
    modelo = WhisperModel(args.modelo, device="cpu", compute_type="int8")
    segmentos, _ = modelo.transcribe(
        str(audio), language=args.idioma, word_timestamps=True, vad_filter=True,
        beam_size=5, condition_on_previous_text=False,
        initial_prompt=args.contexto or None)

    palavras = []
    for seg in segmentos:
        for w in seg.words or []:
            t = w.word.strip()
            if t:
                palavras.append({"i": len(palavras), "t": t,
                                 "ini": round(w.start, 3), "fim": round(w.end, 3)})
    audio.unlink(missing_ok=True)

    (pasta / "transcricao.json").write_text(json.dumps(
        {"video": str(video), "info": info, "palavras": palavras},
        ensure_ascii=False, indent=1))
    escrever_txt(pasta / "transcricao.txt", palavras)

    edicao = pasta / "edicao.json"
    if not edicao.exists():
        edicao.write_text(json.dumps({
            "correcoes": {},
            "remover": [],
            "palavras_chave": sugerir_chaves(palavras),
            "palavras_chave_indices": [],
            "elementos": [],
            "estilo": ESTILO_PADRAO,
            "corte": CORTE_PADRAO,
            "audio": AUDIO_PADRAO,
        }, ensure_ascii=False, indent=2))
    print(f"Pronto: {pasta}\n{len(palavras)} palavras, {tempo(info['duracao'])} de vídeo, "
          f"{info['largura']}x{info['altura']} a {info['fps']:.2f} fps")


def escrever_txt(caminho, palavras):
    linhas, bloco = [], []
    for p in palavras:
        if bloco and (p["ini"] - bloco[-1]["fim"] > 0.7 or len(bloco) >= 14):
            linhas.append(bloco)
            bloco = []
        bloco.append(p)
    if bloco:
        linhas.append(bloco)
    with open(caminho, "w") as f:
        f.write("# [índice inicial-final] tempo | texto (cada palavra: texto·índice)\n")
        for b in linhas:
            corpo = " ".join(f"{p['t']}·{p['i']}" for p in b)
            f.write(f"[{b[0]['i']}-{b[-1]['i']}] {tempo(b[0]['ini'])} | {corpo}\n")


def sugerir_chaves(palavras):
    """Ponto de partida: números e valores. A escolha final é editorial."""
    vistos = []
    for p in palavras:
        if re.search(r"\d", p["t"]) and p["t"] not in vistos:
            vistos.append(re.sub(r"[.,!?;:]+$", "", p["t"]))
    return vistos[:12]


# ---------- etapa 2: renderizar ----------

def renderizar(args):
    pasta = PROJETOS / args.nome
    trans = json.loads((pasta / "transcricao.json").read_text())
    ed = json.loads((pasta / "edicao.json").read_text())
    estilo = {**ESTILO_PADRAO, **ed.get("estilo", {})}
    corte = {**CORTE_PADRAO, **ed.get("corte", {})}
    audio_cfg = {**AUDIO_PADRAO, **ed.get("audio", {})}
    video = Path(args.video or trans["video"])
    info = sondar(video)

    palavras = [dict(p) for p in trans["palavras"]]
    for i, txt in ed.get("correcoes", {}).items():
        palavras[int(i)]["t"] = txt
    removidos = set()
    for a, b in ed.get("remover", []):
        removidos.update(range(int(a), int(b) + 1))
    mantidas = [p for p in palavras
                if p["i"] not in removidos and p["t"] != "" and not eh_hesitacao(p["t"])
                and p["ini"] < info["duracao"]]
    if not mantidas:
        sys.exit("Nenhuma palavra restou depois dos cortes.")

    trechos = montar_trechos(mantidas, corte, info)
    dur_final = sum(b - a for a, b in trechos)

    def remap(t):
        acum = 0.0
        for a, b in trechos:
            if t < a:
                return acum
            if t <= b:
                return acum + (t - a)
            acum += b - a
        return acum

    for p in mantidas:
        p["ini2"], p["fim2"] = remap(p["ini"]), remap(p["fim"])

    chaves_txt = {normalizar(k) for k in ed.get("palavras_chave", []) if k.strip()}
    chaves_idx = {int(i) for i in ed.get("palavras_chave_indices", [])}
    for p in mantidas:
        p["chave"] = p["i"] in chaves_idx or normalizar(p["t"]) in chaves_txt

    frases = agrupar_frases(mantidas, estilo)
    por_indice = {p["i"]: p for p in palavras}
    ass = pasta / "legendas.ass"
    ass.write_text(gerar_ass(frases, ed.get("elementos", []), por_indice, remap,
                             info, estilo, dur_final))
    (pasta / "legendas.srt").write_text(gerar_srt(frases, estilo, dur_final))

    saida = pasta / ("final.mp4" if not args.saida else args.saida)
    script = pasta / "filtro.txt"
    script.write_text(filtro(trechos, ass, info, audio_cfg))
    cmd = ["ffmpeg", "-y", "-i", str(video), "-filter_complex_script", str(script),
           "-map", "[vout]"]
    if info["tem_audio"]:
        cmd += ["-map", "[aout]", "-c:a", "aac", "-b:a", "192k", "-ar", "48000"]
    cmd += ["-c:v", "libx264", "-preset", args.preset, "-crf", str(args.crf),
            "-pix_fmt", "yuv420p", "-r", f"{info['fps']:.5f}",
            "-movflags", "+faststart", str(saida)]
    print(f"Renderizando {len(trechos)} trechos: {tempo(info['duracao'])} -> {tempo(dur_final)}")
    rodar(cmd)
    print(f"Pronto: {saida}")


def montar_trechos(mantidas, corte, info):
    quadro = 1.0 / info["fps"]
    trechos = []
    for p in mantidas:
        a = max(0.0, p["ini"] - corte["margem_antes"])
        b = min(info["duracao"], p["fim"] + corte["margem_depois"])
        if trechos and a - trechos[-1][1] <= corte["pausa_max"]:
            trechos[-1][1] = max(trechos[-1][1], b)
        elif trechos and a < trechos[-1][1]:
            trechos[-1][1] = max(trechos[-1][1], b)
        else:
            trechos.append([a, b])
    # Alinha ao quadro para o áudio não escorregar em relação ao vídeo a cada corte.
    alinhados = []
    for a, b in trechos:
        a = math.floor(a / quadro + 1e-6) * quadro
        b = math.ceil(b / quadro - 1e-6) * quadro
        if alinhados and a <= alinhados[-1][1]:
            alinhados[-1][1] = b
        elif b - a >= quadro:
            alinhados.append([round(a, 6), round(b, 6)])
    return alinhados


def filtro(trechos, ass, info, audio_cfg):
    partes, rotulos = [], []
    caminho_ass = str(ass).replace("\\", "/").replace(":", "\\:").replace("'", "\\'")
    for n, (a, b) in enumerate(trechos):
        partes.append(f"[0:v]trim=start={a}:end={b},setpts=PTS-STARTPTS[v{n}];")
        rotulos.append(f"[v{n}]")
        if info["tem_audio"]:
            d = b - a
            f = min(0.012, d / 4)
            partes.append(
                f"[0:a]atrim=start={a}:end={b},asetpts=PTS-STARTPTS,"
                f"afade=t=in:d={f:.4f},afade=t=out:st={d - f:.4f}:d={f:.4f}[a{n}];")
            rotulos.append(f"[a{n}]")
    a_flag = 1 if info["tem_audio"] else 0
    partes.append(f"{''.join(rotulos)}concat=n={len(trechos)}:v=1:a={a_flag}[vc]" +
                  ("[ac];" if a_flag else ";"))
    partes.append(f"[vc]ass='{caminho_ass}'[vout]" + (";" if a_flag else ""))
    if a_flag:
        cadeia = []
        if audio_cfg["reduzir_ruido"]:
            cadeia.append("highpass=f=70,afftdn=nf=-28")
        if audio_cfg["normalizar"]:
            cadeia.append("loudnorm=I=-14:TP=-1.5:LRA=11")
        cadeia.append("aresample=48000")
        partes.append(f"[ac]{','.join(cadeia)}[aout]")
    return "\n".join(partes)


# ---------- legendas ----------

def agrupar_frases(palavras, estilo):
    frases, atual = [], []
    for p in palavras:
        if atual:
            texto = " ".join(x["t"] for x in atual + [p])
            quebra = (len(atual) >= estilo["max_palavras"]
                      or len(texto) > estilo["max_caracteres"]
                      or p["ini2"] - atual[-1]["fim2"] > 0.6
                      or re.search(r"[.!?;:]$", atual[-1]["t"]))
            if quebra:
                frases.append(atual)
                atual = []
        atual.append(p)
    if atual:
        frases.append(atual)
    return frases


def cor_ass(hexa, alfa="00"):
    h = hexa.lstrip("#")
    return f"&H{alfa}{h[4:6]}{h[2:4]}{h[0:2]}".upper()


def ts_ass(t):
    t = max(t, 0)
    h, r = divmod(t, 3600)
    m, s = divmod(r, 60)
    return f"{int(h)}:{int(m):02d}:{s:05.2f}"


def esc(txt):
    return txt.replace("\\", "").replace("{", "(").replace("}", ")")


def gerar_ass(frases, elementos, por_indice, remap, info, estilo, dur_final):
    w, h = info["largura"], info["altura"]
    base = min(w, h)
    vertical = h > w
    pos = estilo["posicao"]
    if pos == "auto":
        pos = "meio" if vertical else "baixo"
    fs = round(base * (0.068 if vertical else 0.058))
    margem_v = round(h * (0.30 if pos == "meio" else 0.08))
    contorno = max(2, round(fs * 0.075))
    branco, destaque = cor_ass(estilo["cor_texto"]), cor_ass(estilo["cor_destaque"])
    fonte = estilo["fonte"]
    cab = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {w}
PlayResY: {h}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Legenda,{fonte},{fs},{branco},{branco},&H00000000,&H64000000,-1,0,0,0,100,100,0,0,1,{contorno},{max(1, contorno // 2)},2,{round(w * 0.08)},{round(w * 0.08)},{margem_v},1
Style: Titulo,{fonte},{round(fs * 1.15)},{branco},{branco},&H00000000,&H64000000,-1,0,0,0,100,100,0,0,1,{contorno},{max(1, contorno // 2)},8,{round(w * 0.08)},{round(w * 0.08)},{round(h * 0.09)},1
Style: Destaque,{fonte},{round(fs * 2.1)},{destaque},{destaque},&H00000000,&H64000000,-1,0,0,0,100,100,0,0,1,{round(contorno * 1.4)},{contorno},5,{round(w * 0.06)},{round(w * 0.06)},0,1
Style: Nome,{fonte},{round(fs * 0.8)},{branco},{branco},&H00000000,&H96000000,-1,0,0,0,100,100,0,0,3,{round(fs * 0.25)},0,1,{round(w * 0.06)},{round(w * 0.06)},{round(h * (0.18 if vertical else 0.20))},1
Style: Cargo,{fonte},{round(fs * 0.55)},{destaque},{destaque},&H00000000,&H96000000,0,0,0,0,100,100,0,0,3,{round(fs * 0.2)},0,1,{round(w * 0.06)},{round(w * 0.06)},{round(h * (0.18 if vertical else 0.20) - fs * 0.85)},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    linhas = []
    for n, fr in enumerate(frases):
        ini = fr[0]["ini2"]
        prox = frases[n + 1][0]["ini2"] if n + 1 < len(frases) else dur_final
        fim = min(prox, fr[-1]["fim2"] + 0.5)
        fim = max(fim, ini + 0.35)
        partes = []
        for p in fr:
            txt = esc(p["t"].upper() if estilo["maiusculas"] else p["t"])
            if p["chave"]:
                t1 = max(0, round((p["ini2"] - ini) * 1000))
                partes.append(
                    f"{{\\alpha&HFF&\\1c{destaque}\\blur6"
                    f"\\t({t1},{t1 + FADE_MS},\\alpha&H00&\\blur0)}}{txt}{{\\r}}")
            else:
                partes.append(txt)
        linhas.append(f"Dialogue: 1,{ts_ass(ini)},{ts_ass(fim)},Legenda,,0,0,0,,"
                      f"{{\\fad(90,60)}}{' '.join(partes)}")

    for el in elementos:
        p = por_indice.get(int(el.get("palavra", 0)))
        ini = remap(p["ini"]) if p else float(el.get("inicio", 0))
        fim = min(dur_final, ini + float(el.get("duracao", 2.5)))
        txt = esc(el.get("texto", ""))
        sub = esc(el.get("subtexto", ""))
        tipo = el.get("tipo", "titulo")
        if tipo == "destaque":
            linhas.append(f"Dialogue: 3,{ts_ass(ini)},{ts_ass(fim)},Destaque,,0,0,0,,"
                          f"{{\\fad(220,220)\\fscx80\\fscy80\\t(0,260,\\fscx100\\fscy100)}}{txt}")
        elif tipo == "nome":
            linhas.append(f"Dialogue: 2,{ts_ass(ini)},{ts_ass(fim)},Nome,,0,0,0,,"
                          f"{{\\fad(300,300)}}{txt}")
            if sub:
                linhas.append(f"Dialogue: 2,{ts_ass(ini + 0.15)},{ts_ass(fim)},Cargo,,0,0,0,,"
                              f"{{\\fad(300,300)}}{sub}")
        else:
            corpo = txt + (f"\\N{{\\fs{round(fs * 0.7)}\\1c{destaque}}}{sub}" if sub else "")
            linhas.append(f"Dialogue: 2,{ts_ass(ini)},{ts_ass(fim)},Titulo,,0,0,0,,"
                          f"{{\\fad(350,300)}}{corpo}")
    return cab + "\n".join(linhas) + "\n"


def gerar_srt(frases, estilo, dur_final):
    def ts(t):
        ms = round(max(t, 0) * 1000)
        h, ms = divmod(ms, 3600000)
        m, ms = divmod(ms, 60000)
        s, ms = divmod(ms, 1000)
        return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"
    blocos = []
    for n, fr in enumerate(frases):
        prox = frases[n + 1][0]["ini2"] if n + 1 < len(frases) else dur_final
        fim = min(prox, fr[-1]["fim2"] + 0.5)
        texto = " ".join(p["t"] for p in fr)
        blocos.append(f"{n + 1}\n{ts(fr[0]['ini2'])} --> {ts(fim)}\n"
                      f"{texto.upper() if estilo['maiusculas'] else texto}\n")
    return "\n".join(blocos)


# ---------- linha de comando ----------

def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    t = sub.add_parser("transcrever")
    t.add_argument("video")
    t.add_argument("--nome")
    t.add_argument("--modelo", default="small",
                   help="tiny, base, small, medium, large-v3 (mais lento e mais preciso)")
    t.add_argument("--idioma", default="pt")
    t.add_argument("--contexto", help="nomes e termos que o transcritor deve conhecer")
    t.set_defaults(func=transcrever)
    r = sub.add_parser("renderizar")
    r.add_argument("nome")
    r.add_argument("--video", help="outro arquivo de origem (padrão: o transcrito)")
    r.add_argument("--saida")
    r.add_argument("--crf", type=int, default=18)
    r.add_argument("--preset", default="medium")
    r.set_defaults(func=renderizar)
    args = ap.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
