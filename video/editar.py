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
  estilo             cor_destaque, cor_texto, fonte, maiusculas, posicao (auto|baixo|meio),
                     altura_legenda (fração da altura, medida de baixo; ex. 0.22)
  corte              pausa_max, margem_antes, margem_depois (segundos), limiar_voz (0-1)
  audio              normalizar (bool), reduzir_ruido (bool)

Modo "padrao" (estilo.modo, o padrão; ver padrao.py) acrescenta:
  blocos             [{"de": i, "ate": j, "aspas": bool,
                       "linhas": [[i, j], ...] e "tipos": ["grande"|"pequeno"|"destaque", ...]
                       ou "destaque": [i, j]}]  frases de impacto; sem "linhas" o
                     bloco é montado sozinho (última palavra em amarelo letra por letra)
  padrao             ajustes visuais: cor_destaque, palavra_y, bloco_y, palavra_em...
  zoom               ativo, niveis [1.22, 1.0], plano_min, plano_max (segundos)
  sfx                ticks, impacto, volume_tick_db, volume_impacto_db,
                     impactos_palavras [índices] (padrão: logo depois do primeiro bloco)
  cor                ativo, contraste, saturacao, calor
  elementos tipo "broll": {"arquivo": caminho, "palavra": i, "ate": j, "inicio_clip": s}
                     cobre a imagem com outra cena entre as palavras i e j (voz continua)
"""

import argparse
import json
import math
import re
import subprocess
import sys
import unicodedata
from pathlib import Path

import padrao

RAIZ = Path(__file__).resolve().parent
PROJETOS = RAIZ / "projetos"

# Hesitações que nunca carregam sentido. "é" fica de fora: é verbo.
# "um", "a" e "e" também ficam: são artigo, número e conjunção.
HESITACOES = {"ah", "ãh", "ahn", "eh", "éh", "hã", "hum", "hm", "hmm", "mm", "uh", "uhm"}

ESTILO_PADRAO = {
    "modo": "padrao",
    "fonte": "Inter",
    "cor_texto": "#FFFFFF",
    "cor_destaque": "#FFD400",
    "maiusculas": False,
    "posicao": "auto",
    "max_palavras": 5,
    "max_caracteres": 30,
}
CORTE_PADRAO = {"pausa_max": 0.30, "margem_antes": 0.06, "margem_depois": 0.12,
                "limiar_voz": 0.30}
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
    # Passa as amostras prontas: o decodificador interno quebra com algumas versões do PyAV.
    import numpy as np
    import wave
    with wave.open(str(audio)) as wav:
        amostras = np.frombuffer(wav.readframes(wav.getnframes()), np.int16).astype(np.float32) / 32768
    segmentos, _ = modelo.transcribe(
        amostras, language=args.idioma, word_timestamps=True, vad_filter=True,
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
            "blocos": [],
            "elementos": [],
            "estilo": ESTILO_PADRAO,
            "corte": CORTE_PADRAO,
            "audio": AUDIO_PADRAO,
            "zoom": padrao.ZOOM_PADRAO,
            "sfx": padrao.SFX_PADRAO,
            "cor": padrao.COR_PADRAO,
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
    # 4K e afins descem para no máximo 1920 no lado maior logo na entrada: as redes
    # entregam nessa resolução e o zoom e as legendas ficam muito mais rápidos.
    info_orig, fator = dict(info), 1.0
    if max(info["largura"], info["altura"]) > 1920:
        fator = 1920 / max(info["largura"], info["altura"])
        info["largura"] = round(info["largura"] * fator / 2) * 2
        info["altura"] = round(info["altura"] * fator / 2) * 2

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

    if info["tem_audio"]:
        refinar_pela_voz(mantidas, energia(video), corte)
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
    elementos = ed.get("elementos", [])
    ass = pasta / "legendas.ass"
    extra_v, brolls, sfx = [], [], None
    if fator != 1.0:
        extra_v.append(f"scale={info['largura']}:{info['altura']}:flags=lanczos")
    if estilo["modo"] == "padrao":
        cfg = {**padrao.PADRAO, **ed.get("padrao", {})}
        if cfg["sombra"] == "auto":  # sombra só quando pedida: o padrão do cliente é sem
            amostras = [padrao.novo_para_original(dur_final * f, trechos) for f in (.1, .3, .5, .7, .9)]
            luz = padrao.claridade(video, amostras, info, cfg["palavra_y"])
            cfg["sombra"] = "forte" if luz > 115 else "suave"
            print(f"Fundo da legenda: luminância {luz:.0f} -> sombra {cfg['sombra']}")
        zcfg = {**padrao.ZOOM_PADRAO, **ed.get("zoom", {})}
        scfg = {**padrao.SFX_PADRAO, **ed.get("sfx", {})}
        ccfg = {**padrao.COR_PADRAO, **ed.get("cor", {})}
        # Primeira passada só para saber onde caem os blocos (o fim do gancho decide o corte).
        _, _, faixas = padrao.eventos(mantidas, ed.get("blocos", []), info, cfg, dur_final)
        extra_v += padrao.filtro_cor(ccfg)
        if zcfg["ativo"]:
            # Gancho em plano fechado e corte seco para o aberto logo depois dele.
            forcados = [faixas[0][1]] if faixas and faixas[0][0] < 3 else []
            planos = padrao.planejar_planos(trechos, mantidas, dur_final, zcfg, forcados)
        else:
            planos = [(0.0, dur_final, 1.0)]
        rostos = [padrao.rosto(video, [padrao.novo_para_original(a + (b - a) * f, trechos)
                                       for f in (0.2, 0.5, 0.8)], info_orig)
                  for a, b, _ in planos]
        rostos = [tuple(v * fator for v in r) for r in rostos]
        if zcfg["ativo"]:
            extra_v.append(padrao.filtro_zoom(planos, rostos, info))
        cfg["queixos"] = padrao.queixos(planos, rostos, info)
        linhas, tics, faixas = padrao.eventos(mantidas, ed.get("blocos", []), info, cfg, dur_final)
        estilos, linhas_el = estilos_e_elementos(
            [e for e in elementos if e.get("tipo") != "broll"], por_indice, remap, info,
            {**estilo, "fonte": "Poppins", "cor_destaque": cfg["cor_destaque"]}, dur_final)
        ass.write_text(padrao.ass_completo(info, linhas + linhas_el, estilos))
        impactos = [remap(por_indice[int(i)]["ini"]) for i in scfg.get("impactos_palavras", [])]
        if not scfg.get("impactos_palavras") and faixas and len(planos) > 1:
            depois = [a for a, _, _ in planos if a >= faixas[0][1] - 0.3]
            if depois and faixas[0][0] < 8:
                impactos = [depois[0]]
        if info["tem_audio"] and (tics or impactos):
            sfx = pasta / "sfx.wav"
            padrao.trilha_sfx(dur_final, tics, impactos, scfg, sfx)
        for el in elementos:
            if el.get("tipo") == "broll":
                a = remap(por_indice[int(el["palavra"])]["ini"])
                b = (remap(por_indice[int(el["ate"])]["fim"]) if "ate" in el
                     else a + float(el.get("duracao", 3)))
                brolls.append((Path(el["arquivo"]), float(el.get("inicio_clip", 0)), a, b))
    else:
        estilos, linhas_el = estilos_e_elementos(elementos, por_indice, remap, info, estilo,
                                                 dur_final)
        ass.write_text(padrao.ass_completo(info, linhas_frases(frases, estilo, dur_final)
                                           + linhas_el, estilos))
    (pasta / "legendas.srt").write_text(gerar_srt(frases, estilo, dur_final))

    saida = pasta / ("final.mp4" if not args.saida else args.saida)
    script = pasta / "filtro.txt"
    script.write_text(filtro(trechos, ass, info, audio_cfg, extra_v, brolls, sfx is not None))
    cmd = ["ffmpeg", "-y", "-i", str(video)]
    if sfx:
        cmd += ["-i", str(sfx)]
    for arq, ini_clip, _, _ in brolls:
        cmd += ["-ss", f"{ini_clip:.3f}", "-i", str(arq)]
    cmd += ["-filter_complex_script", str(script), "-map", "[vout]"]
    if info["tem_audio"]:
        cmd += ["-map", "[aout]", "-c:a", "aac", "-b:a", "192k", "-ar", "48000"]
    cmd += ["-c:v", "libx264", "-preset", args.preset, "-crf", str(args.crf),
            "-pix_fmt", "yuv420p", "-r", f"{info['fps']:.5f}",
            "-movflags", "+faststart", str(saida)]
    print(f"Renderizando {len(trechos)} trechos: {tempo(info['duracao'])} -> {tempo(dur_final)}")
    rodar(cmd)
    print(f"Pronto: {saida}")


def energia(video):
    """Volume em dB a cada 10 ms."""
    import numpy as np
    bruto = subprocess.run(["ffmpeg", "-v", "error", "-i", str(video), "-vn", "-ac", "1",
                            "-ar", "16000", "-f", "s16le", "-"], capture_output=True).stdout
    a = np.frombuffer(bruto, np.int16).astype(np.float32) / 32768
    n = len(a) // 160
    return 20 * np.log10(np.sqrt((a[:n * 160].reshape(n, 160) ** 2).mean(1)) + 1e-6)


def refinar_pela_voz(palavras, e, corte):
    """O transcritor estica palavras sobre pausas e vogais arrastadas ("ééé").
    Mantém só os pedaços com voz dentro de cada palavra e encurta o arraste
    de palavras de uma ou duas letras."""
    import numpy as np
    piso, fala = np.percentile(e, 10), np.percentile(e, 95)
    voz = e > piso + corte["limiar_voz"] * (fala - piso)
    for p in palavras:
        a, b = int(p["ini"] * 100), max(int(p["fim"] * 100), int(p["ini"] * 100) + 1)
        m = voz[a:b].copy()
        # Junta buracos curtos (consoantes surdas) e descarta estalos isolados.
        partes, k = [], 0
        while k < len(m):
            if m[k]:
                j = k
                while j < len(m) and m[j]:
                    j += 1
                partes.append([k, j])
                k = j
            else:
                k += 1
        juntas = []
        for x, y in partes:
            if juntas and x - juntas[-1][1] <= 12:
                juntas[-1][1] = y
            else:
                juntas.append([x, y])
        juntas = [q for q in juntas if q[1] - q[0] >= 5]
        if not juntas:
            p["partes"] = [(p["ini"], p["fim"])]
            continue
        curta = len(re.sub(r"\W", "", p["t"])) <= 2
        if curta and sum(y - x for x, y in juntas) > 45:
            juntas = [[juntas[0][0], juntas[0][0] + 28]]
        p["partes"] = [((a + x) / 100, (a + y) / 100) for x, y in juntas]
        p["ini"], p["fim"] = p["partes"][0][0], p["partes"][-1][1]


def montar_trechos(mantidas, corte, info):
    quadro = 1.0 / info["fps"]
    trechos = []
    pedacos = [q for p in mantidas for q in p.get("partes", [(p["ini"], p["fim"])])]
    for ini, fim in sorted(pedacos):
        a = max(0.0, ini - corte["margem_antes"])
        b = min(info["duracao"], fim + corte["margem_depois"])
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


def filtro(trechos, ass, info, audio_cfg, extra_v=(), brolls=(), com_sfx=False):
    # Um fluxo só, com select: cortar em N ramos de trim obriga o ffmpeg a guardar
    # quadros de todos os ramos na memória e estoura em vídeos longos ou 4K.
    caminho_ass = str(ass).replace("\\", "/").replace(":", "\\:").replace("'", "\\'")
    expr = "+".join(f"between(t\\,{a:.6f}\\,{b - 0.0005:.6f})" for a, b in trechos)
    cadeia_v = [f"select='{expr}'", "setpts=N/FRAME_RATE/TB", *extra_v]
    partes = [f"[0:v]{','.join(cadeia_v)}[v0]"]
    atual = "v0"
    w, h = info["largura"], info["altura"]
    for n, (_, _, a, b) in enumerate(brolls):
        entrada = n + (2 if com_sfx else 1)
        partes.append(f"[{entrada}:v]scale={w}:{h}:force_original_aspect_ratio=increase,"
                      f"crop={w}:{h},fps={info['fps']:.5f},setpts=PTS-STARTPTS+{a:.3f}/TB[b{n}]")
        partes.append(f"[{atual}][b{n}]overlay=enable='between(t,{a:.3f},{b:.3f})'"
                      f":eof_action=pass[v{n + 1}]")
        atual = f"v{n + 1}"
    partes.append(f"[{atual}]ass='{caminho_ass}':fontsdir='{padrao.FONTES}'[vout]")
    if info["tem_audio"]:
        cadeia = ["asetnsamples=n=64:p=0", f"aselect='{expr}'", "asetpts=N/SR/TB"]
        if audio_cfg["reduzir_ruido"]:
            cadeia.append("highpass=f=70,afftdn=nf=-28")
        if audio_cfg["normalizar"]:
            cadeia.append("loudnorm=I=-14:TP=-1.5:LRA=11")
        cadeia.append("aresample=48000")
        if com_sfx:
            partes.append(f"[0:a]{','.join(cadeia)}[voz]")
            partes.append("[1:a]aresample=48000,aformat=channel_layouts=mono[fx]")
            partes.append("[voz][fx]amix=inputs=2:duration=first:normalize=0,"
                          "alimiter=limit=0.95:level=disabled[aout]")
        else:
            partes.append(f"[0:a]{','.join(cadeia)}[aout]")
    return ";\n".join(partes)


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


def medidas(info, estilo):
    w, h = info["largura"], info["altura"]
    vertical = h > w
    pos = estilo["posicao"]
    if pos == "auto":
        pos = "meio" if vertical else "baixo"
    fs = round(min(w, h) * (0.068 if vertical else 0.058))
    margem_v = round(h * float(estilo.get("altura_legenda") or (0.30 if pos == "meio" else 0.08)))
    return fs, margem_v, max(2, round(fs * 0.075))


def estilos_e_elementos(elementos, por_indice, remap, info, estilo, dur_final):
    w, h = info["largura"], info["altura"]
    fs, margem_v, contorno = medidas(info, estilo)
    margem_nome = round(margem_v + fs * 2.0)
    branco, destaque = cor_ass(estilo["cor_texto"]), cor_ass(estilo["cor_destaque"])
    fonte = estilo["fonte"]
    estilos = f"""Style: Legenda,{fonte},{fs},{branco},{branco},&H00000000,&H64000000,-1,0,0,0,100,100,0,0,1,{contorno},{max(1, contorno // 2)},2,{round(w * 0.08)},{round(w * 0.08)},{margem_v},1
Style: Titulo,{fonte},{round(fs * 1.15)},{branco},{branco},&H00000000,&H64000000,-1,0,0,0,100,100,0,0,1,{contorno},{max(1, contorno // 2)},8,{round(w * 0.08)},{round(w * 0.08)},{round(h * 0.09)},1
Style: Destaque,{fonte},{round(fs * 2.1)},{destaque},{destaque},&H00000000,&H64000000,-1,0,0,0,100,100,0,0,1,{round(contorno * 1.4)},{contorno},5,{round(w * 0.06)},{round(w * 0.06)},0,1
Style: Nome,{fonte},{round(fs * 0.8)},{branco},{branco},&H00000000,&H96000000,-1,0,0,0,100,100,0,0,3,{round(fs * 0.25)},0,1,{round(w * 0.06)},{round(w * 0.06)},{margem_nome},1
Style: Cargo,{fonte},{round(fs * 0.55)},{destaque},{destaque},&H00000000,&H96000000,0,0,0,0,100,100,0,0,3,{round(fs * 0.2)},0,1,{round(w * 0.06)},{round(w * 0.06)},{round(margem_nome + fs * 0.85)},1
"""
    linhas = []
    for el in elementos:
        p = por_indice.get(int(el.get("palavra", 0)))
        ini = remap(p["ini"]) if p else float(el.get("inicio", 0))
        fim = min(dur_final, ini + float(el.get("duracao", 2.5)))
        txt = esc(el.get("texto", ""))
        sub = esc(el.get("subtexto", ""))
        tipo = el.get("tipo", "titulo")
        if tipo == "destaque":
            linhas.append(f"Dialogue: 5,{ts_ass(ini)},{ts_ass(fim)},Destaque,,0,0,0,,"
                          f"{{\\fad(220,220)\\fscx80\\fscy80\\t(0,260,\\fscx100\\fscy100)}}{txt}")
        elif tipo == "nome":
            linhas.append(f"Dialogue: 4,{ts_ass(ini)},{ts_ass(fim)},Nome,,0,0,0,,"
                          f"{{\\fad(300,300)}}{txt}")
            if sub:
                linhas.append(f"Dialogue: 4,{ts_ass(ini + 0.15)},{ts_ass(fim)},Cargo,,0,0,0,,"
                              f"{{\\fad(300,300)}}{sub}")
        else:
            corpo = txt + (f"\\N{{\\fs{round(fs * 0.7)}\\1c{destaque}}}{sub}" if sub else "")
            linhas.append(f"Dialogue: 4,{ts_ass(ini)},{ts_ass(fim)},Titulo,,0,0,0,,"
                          f"{{\\fad(350,300)}}{corpo}")
    return estilos, linhas


def linhas_frases(frases, estilo, dur_final):
    destaque = cor_ass(estilo["cor_destaque"])
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
    return linhas


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
