"""Efeitos visuais do padrão: tela dividida com lista, alerta e cartão de apresentação.

Elementos aceitos no edicao.json (todos ancorados em índices de palavras):

  {"tipo": "lista", "de": i, "ate": j, "titulo": "Sinais de alarme", "cor": "#FF4D4D",
   "itens": [{"texto": "Crise convulsiva", "palavra": k}, ...]}
      Tela dividida: quem fala no alto, painel escuro embaixo com o título e os itens
      numerados entrando no instante em que são ditos. "cor" pinta os marcadores
      (padrão: a cor de destaque).

  {"tipo": "alerta", "de": i, "ate": j, "cor": "#FF3B30"}
      Bordas da tela pulsando em vermelho e um impacto grave no início.

  {"tipo": "cartao", "de": i, "ate": j, "texto": "Dra. Raquel", "subtexto": "Médica pediatra"}
      Cartão de apresentação que desliza da esquerda; esconde as palavras soltas no trecho.

Estilo dinâmico (segunda referência do cliente):

  {"tipo": "capitulo", "numero": "1", "texto": "o objetivo", "de": i, "ate": j}
      Zoom bem fechado no rosto, imagem em preto e branco com granulação, número enorme
      na cor de destaque com "º" e o título embaixo. Impacto grave na entrada.

  {"tipo": "gigante", "palavra": i, "texto": "NÃO É UM", "duracao": 0.8, "cor": "#FFFFFF"}
      Palavra que ocupa a largura da tela, entrando com escala e desfoque.

  {"tipo": "flash", "palavra": i}
      Clarão branco (explosão de luz) com whoosh: transição entre partes do vídeo.

  {"tipo": "cena", "arquivo": "video/entrada/drone.mp4", "de": i, "ate": j, "inicio_clip": 0}
      A cena (vídeo ou imagem, que ganha zoom lento) ocupa a metade de cima com degradê,
      e quem fala desce na tela. Para ilustrar o que está sendo dito.
      Opcionais "foco": [x, y] (fração do clipe onde está o assunto, ex. o aparelho tocando
      o rosto) e "zoom" (1 a 2): aproxima e centraliza o assunto na parte opaca da cena.
"""

from padrao import FONTES, FONTE_GRANDE, FONTE_PALAVRA, calibrar, cor_ass, esc, largura, ts

FONTE_GIGANTE = ("Poppins ExtraBold", FONTES / "Poppins-ExtraBold.ttf", 0)
ZOOM_CAPITULO = 1.6
DESCIDA_CENA = 0.30           # quanto quem fala desce na tela durante uma cena no topo
TOPO_CENA = 0.47              # altura da cena no topo (com o degradê)

PAINEL = "0x0E0E10"
TOPO_DIVIDIDO = 0.55          # fração da altura ocupada por quem fala na tela dividida


def _circulo(r):
    k = 0.5523 * r
    return (f"m {r:.1f} 0 b {r + k:.1f} 0 {2 * r:.1f} {r - k:.1f} {2 * r:.1f} {r:.1f} "
            f"b {2 * r:.1f} {r + k:.1f} {r + k:.1f} {2 * r:.1f} {r:.1f} {2 * r:.1f} "
            f"b {r - k:.1f} {2 * r:.1f} 0 {r + k:.1f} 0 {r:.1f} b 0 {r - k:.1f} {r - k:.1f} 0 {r:.1f} 0")


def _retangulo(x0, y0, x1, y1):
    return f"m {x0:.0f} {y0:.0f} l {x1:.0f} {y0:.0f} l {x1:.0f} {y1:.0f} l {x0:.0f} {y1:.0f}"


def _ret_arredondado(lg, al, r):
    r = min(r, al / 2, lg / 2)
    k = 0.5523 * r
    return (f"m {r:.0f} 0 l {lg - r:.0f} 0 b {lg - r + k:.0f} 0 {lg:.0f} {r - k:.0f} {lg:.0f} {r:.0f} "
            f"l {lg:.0f} {al - r:.0f} b {lg:.0f} {al - r + k:.0f} {lg - r + k:.0f} {al:.0f} {lg - r:.0f} {al:.0f} "
            f"l {r:.0f} {al:.0f} b {r - k:.0f} {al:.0f} 0 {al - r + k:.0f} 0 {al - r:.0f} "
            f"l 0 {r:.0f} b 0 {r - k:.0f} {r - k:.0f} 0 {r:.0f} 0")


def _lista_sobreposta(el, a, b, rosto_em, w, h, k, base, amarelo):
    """Lista sobre o próprio vídeo, sem dividir a tela: título num cartão amarelo e
    cada item num cartão escuro translúcido, entrando no instante em que é dito.
    Fica abaixo da legenda (que segue logo abaixo do queixo), acima da área do Instagram."""
    linhas = []
    itens = el.get("itens", [])
    fx, fy, fh = rosto_em((a + b) / 2)
    queixo = fy + 0.55 * fh
    topo = min(max(queixo + 0.11 * h, 0.42 * h), 0.55 * h)
    limite = 0.80 * h
    passo = min(0.078 * h, (limite - topo) / (len(itens) + 1.15))
    em = min(0.048 * w, passo * 0.50)
    maior = max([largura(it["texto"], FONTE_GRANDE, 1) for it in itens] or [1])
    em = min(em, (0.80 * w) / (maior + 1.6))
    fs = em / k
    x = 0.07 * w
    pad_x, alt = em * 0.55, em * 1.55
    marca = cor_ass(el.get("cor", amarelo))
    # Título: cartão amarelo com texto escuro.
    titulo = esc(el.get("titulo", ""))
    em_t = em * 1.05
    fs_t = em_t / k
    lg_t = largura(titulo, FONTE_GRANDE, em_t) + 2 * pad_x
    alt_t = em_t * 1.55
    mov = "\\move({x0:.0f},{y:.0f},{x1:.0f},{y:.0f},0,240)"
    linhas.append(f"Dialogue: 6,{ts(a)},{ts(b)},Base,,0,0,0,,{{\\an7\\p1"
                  + mov.format(x0=x - 40, x1=x, y=topo) +
                  f"\\1c{cor_ass(amarelo)}\\fad(200,150)}}{_ret_arredondado(lg_t, alt_t, alt_t * 0.28)}")
    yb = topo + alt_t / 2 + em_t * 0.36
    linhas.append(f"Dialogue: 7,{ts(a)},{ts(b)},Base,,0,0,0,,{{\\an7"
                  + mov.format(x0=x + pad_x - 40, x1=x + pad_x, y=yb - base * fs_t) +
                  f"\\fn{FONTE_GRANDE[0]}\\b1\\fs{fs_t:.1f}\\1c&H141414&\\fad(200,150)}}{titulo}")
    for n, it in enumerate(itens):
        ti = it["_t"] if "_t" in it else None
        ti = a + 0.2 + n * 0.3 if ti is None else ti
        y = topo + alt_t + 0.018 * h + n * passo
        r = em * 0.42
        texto = esc(it["texto"])
        lg = 2 * r + em * 0.45 + largura(texto, FONTE_GRANDE, em) + 2 * pad_x
        linhas.append(f"Dialogue: 6,{ts(ti)},{ts(b)},Base,,0,0,0,,{{\\an7\\p1"
                      + mov.format(x0=x - 40, x1=x, y=y) +
                      f"\\1c&H101010&\\alpha&H58&\\fad(200,150)}}{_ret_arredondado(lg, alt, alt * 0.28)}")
        cy = y + alt / 2
        cx = x + pad_x
        linhas.append(f"Dialogue: 7,{ts(ti)},{ts(b)},Base,,0,0,0,,{{\\an7\\p1"
                      + mov.format(x0=cx - 40, x1=cx, y=cy - r) +
                      f"\\1c{marca}\\fad(200,150)}}{_circulo(r)}")
        num = str(n + 1)
        em_n = em * 0.62
        fs_n = em_n / k
        nx = cx + r - largura(num, FONTE_GRANDE, em_n) / 2
        linhas.append(f"Dialogue: 8,{ts(ti)},{ts(b)},Base,,0,0,0,,{{\\an7"
                      + mov.format(x0=nx - 40, x1=nx, y=cy + 0.35 * em_n - base * fs_n) +
                      f"\\fn{FONTE_GRANDE[0]}\\b1\\fs{fs_n:.1f}\\1c&H101010&\\fad(200,150)}}{num}")
        tx = cx + 2 * r + em * 0.45
        ybt = cy + em * 0.36
        linhas.append(f"Dialogue: 8,{ts(ti)},{ts(b)},Base,,0,0,0,,{{\\an7"
                      + mov.format(x0=tx - 40, x1=tx, y=ybt - base * fs) +
                      f"\\fn{FONTE_GRANDE[0]}\\b1\\fs{fs:.1f}\\1c&HFFFFFF&\\fad(200,150)}}{texto}")
    return linhas


def montar(elementos, por_indice, remap, info, cfg, dur_final, rosto_em):
    """Devolve dict com: linhas ASS, tics, impactos, divisoes [(a, b, crop)],
    y_fixo [(a, b, yfrac)] e ocultar [(a, b)] para as palavras soltas."""
    w, h = info["largura"], info["altura"]
    k, base = calibrar()
    amarelo = cfg["cor_destaque"]
    saida = {"linhas": [], "tics": [], "impactos": [], "whooshes": [], "divisoes": [],
             "y_fixo": [], "ocultar": [], "pos_zoom": [], "cenas": [], "queixo_fixo": []}

    def t_ini(i):
        return remap(por_indice[int(i)]["ini"])

    def t_fim(i):
        fim = min(dur_final, remap(por_indice[int(i)]["fim"]) + 0.35)
        # Não invade a fala seguinte (evita dois capítulos ou cartões ao mesmo tempo).
        prox = por_indice.get(int(i) + 1)
        if prox and prox.get("t"):
            fim = min(fim, max(remap(prox["ini"]) - 0.03, remap(por_indice[int(i)]["fim"])))
        return fim

    for el in elementos:
        tipo = el.get("tipo")
        if tipo == "lista" and el.get("modo", "sobreposta") == "sobreposta":
            a, b = t_ini(el["de"]) - 0.05, t_fim(el["ate"])
            for it in el.get("itens", []):
                it["_t"] = t_ini(it["palavra"]) - 0.08
            saida["linhas"] += _lista_sobreposta(el, a, b, rosto_em, w, h, k, base, amarelo)
            for it in el.get("itens", []):
                saida["tics"].append(t_ini(it["palavra"]) - 0.06)
        elif tipo == "lista":
            a, b = t_ini(el["de"]) - 0.05, t_fim(el["ate"])
            # Recorte do alto: rosto centralizado, um pouco acima do meio.
            fx, fy, fh = rosto_em((a + b) / 2)
            topo_h = round(h * TOPO_DIVIDIDO / 2) * 2
            cw = min(w, fh * 4.2)
            ch = cw * topo_h / w
            x0 = min(max(fx - cw / 2, 0), w - cw)
            y0 = min(max(fy - 0.40 * ch, 0), h - ch)
            saida["divisoes"].append((a, b, (cw, ch, x0, y0, topo_h)))
            saida["y_fixo"].append((a, b, (topo_h - 0.045 * h) / h))
            marca = el.get("cor", amarelo)
            itens = el.get("itens", [])
            em_t = 0.066 * w
            # Itens grandes, mas todos cabendo na largura do painel.
            maior = max([largura(it["texto"], FONTE_GRANDE, 1) for it in itens] or [1])
            em_i = min(0.066 * w, (w * 0.80) / (maior + 1.0))
            x = 0.08 * w
            y = topo_h + 0.05 * h
            fs_t = em_t / k
            saida["linhas"].append(
                f"Dialogue: 6,{ts(a)},{ts(b)},Base,,0,0,0,,{{\\an7\\p1\\pos(0,{topo_h})"
                f"\\1c{cor_ass(amarelo)}\\fad(150,150)}}{_retangulo(0, 0, w, 6)}")
            saida["linhas"].append(
                f"Dialogue: 7,{ts(a + 0.1)},{ts(b)},Base,,0,0,0,,"
                f"{{\\an7\\fn{FONTE_GRANDE[0]}\\b1\\fs{fs_t:.1f}\\1c{cor_ass(amarelo)}"
                f"\\move({x + 50:.0f},{y - base * fs_t:.0f},{x:.0f},{y - base * fs_t:.0f},0,260)"
                f"\\fad(220,150)}}{esc(el.get('titulo', ''))}")
            y += 0.085 * h
            r = em_i * 0.46
            for n, it in enumerate(el.get("itens", [])):
                ti = t_ini(it["palavra"]) - 0.08
                fs_i = em_i / k
                yb = y + n * 0.095 * h                 # linha de base do texto do item
                cx = x
                cy = yb - 0.36 * em_i                  # centro do círculo na altura do x
                saida["linhas"].append(
                    f"Dialogue: 7,{ts(ti)},{ts(b)},Base,,0,0,0,,{{\\an7\\p1"
                    f"\\move({cx + 50:.0f},{cy - r:.0f},{cx:.0f},{cy - r:.0f},0,220)"
                    f"\\1c{cor_ass(marca)}\\fad(200,150)}}{_circulo(r)}")
                num = str(n + 1)
                em_n = em_i * 0.62
                fs_n = em_n / k
                nx = cx + r - largura(num, FONTE_GRANDE, em_n) / 2
                ny = cy + 0.35 * em_n - base * fs_n
                saida["linhas"].append(
                    f"Dialogue: 8,{ts(ti)},{ts(b)},Base,,0,0,0,,"
                    f"{{\\an7\\fn{FONTE_GRANDE[0]}\\b1\\fs{fs_n:.1f}\\1c&H101010&"
                    f"\\move({nx + 50:.0f},{ny:.0f},{nx:.0f},{ny:.0f},0,220)\\fad(200,150)}}{num}")
                tx = cx + 2 * r + 0.035 * w
                saida["linhas"].append(
                    f"Dialogue: 8,{ts(ti)},{ts(b)},Base,,0,0,0,,"
                    f"{{\\an7\\fn{FONTE_GRANDE[0]}\\b1\\fs{fs_i:.1f}\\1c&HFFFFFF&"
                    f"\\move({tx + 50:.0f},{yb - base * fs_i:.0f},{tx:.0f},{yb - base * fs_i:.0f},0,220)"
                    f"\\blur6\\t(0,200,\\blur0)\\fad(200,150)}}{esc(it['texto'])}")
                saida["tics"].append(ti + 0.02)
        elif tipo == "alerta":
            a, b = t_ini(el["de"]) - 0.05, t_fim(el["ate"])
            cor = cor_ass(el.get("cor", "#FF3B30"))
            e = 0.035 * w
            borda = " ".join([_retangulo(0, 0, w, e), _retangulo(0, h - e, w, h),
                              _retangulo(0, 0, e, h), _retangulo(w - e, 0, w, h)])
            pulsos, t, forte = [], 0, True
            while t < (b - a) * 1000:
                alvo = "&H20&" if forte else "&H90&"
                pulsos.append(f"\\t({t:.0f},{t + 380:.0f},\\alpha{alvo})")
                t += 380
                forte = not forte
            saida["linhas"].append(
                f"Dialogue: 9,{ts(a)},{ts(b)},Base,,0,0,0,,{{\\an7\\p1\\pos(0,0)\\1c{cor}"
                f"\\blur{e * 0.9:.0f}\\alpha&HFF&{''.join(pulsos)}\\fad(0,250)}}{borda}")
            saida["impactos"].append(a + 0.05)
        elif tipo == "cartao":
            a, b = t_ini(el["de"]) - 0.05, t_fim(el["ate"])
            saida["ocultar"].append((a, b))
            em_n, em_s = 0.068 * w, 0.040 * w
            nome, sub = esc(el.get("texto", "")), esc(el.get("subtexto", ""))
            larg = max(largura(nome, FONTE_GRANDE, em_n), largura(sub, FONTE_PALAVRA, em_s))
            fx, fy, fh = rosto_em(a + 0.3)
            x = 0.07 * w
            topo = min(fy + fh * 0.75 + 0.04 * h, 0.66 * h)
            pad = 0.03 * w
            alt = em_n * 1.05 + em_s * 1.2 + pad * 1.6
            saida["linhas"].append(
                f"Dialogue: 6,{ts(a)},{ts(b)},Base,,0,0,0,,{{\\an7\\p1"
                f"\\move({x - 80:.0f},{topo:.0f},{x:.0f},{topo:.0f},0,300)\\1c&H101010&\\alpha&H30&"
                f"\\fad(250,250)}}{_retangulo(0, 0, larg + pad * 2.6, alt)}")
            saida["linhas"].append(
                f"Dialogue: 7,{ts(a + 0.08)},{ts(b)},Base,,0,0,0,,{{\\an7\\p1"
                f"\\move({x - 80:.0f},{topo:.0f},{x:.0f},{topo:.0f},0,300)\\1c{cor_ass(amarelo)}"
                f"\\fad(250,250)}}{_retangulo(0, 0, pad * 0.35, alt)}")
            yn = topo + pad * 0.8 + em_n * 0.95
            fs_n = em_n / k
            saida["linhas"].append(
                f"Dialogue: 8,{ts(a + 0.15)},{ts(b)},Base,,0,0,0,,"
                f"{{\\an7\\fn{FONTE_GRANDE[0]}\\b1\\fs{fs_n:.1f}\\1c&HFFFFFF&"
                f"\\move({x + pad * 1.2 - 60:.0f},{yn - base * fs_n:.0f},{x + pad * 1.2:.0f},"
                f"{yn - base * fs_n:.0f},0,300)\\fad(250,250)}}{nome}")
            ys = yn + em_s * 1.25
            fs_s = em_s / k
            saida["linhas"].append(
                f"Dialogue: 8,{ts(a + 0.3)},{ts(b)},Base,,0,0,0,,"
                f"{{\\an7\\fn{FONTE_PALAVRA[0]}\\b0\\fs{fs_s:.1f}\\1c{cor_ass(amarelo)}"
                f"\\move({x + pad * 1.2 - 60:.0f},{ys - base * fs_s:.0f},{x + pad * 1.2:.0f},"
                f"{ys - base * fs_s:.0f},0,300)\\fad(250,250)}}{sub}")
            saida["tics"].append(a + 0.1)
        elif tipo == "capitulo":
            a, b = t_ini(el["de"]) - 0.05, t_fim(el["ate"])
            saida["ocultar"].append((a, b))
            saida["pos_zoom"].append(f"hue=s=0:enable='between(t,{a:.3f},{b:.3f})'")
            saida["pos_zoom"].append(f"noise=alls=14:allf=t:enable='between(t,{a:.3f},{b:.3f})'")
            saida["impactos"].append(a + 0.05)
            fx, fy, fh = rosto_em((a + b) / 2)
            queixo = fy + 0.55 * fh * ZOOM_CAPITULO
            em_n = 0.30 * w
            em_o = em_n * 0.42
            num = esc(str(el.get("numero", "1")))
            larg_n = largura(num, FONTE_GIGANTE, em_n) + largura("º", FONTE_GIGANTE, em_o)
            xn = (w - larg_n) / 2
            yb_n = min(queixo + 0.03 * h + em_n * 0.72, 0.70 * h)
            fs_n, fs_o = em_n / k, em_o / k
            cor = cor_ass(el.get("cor", amarelo))
            saida["linhas"].append(
                f"Dialogue: 8,{ts(a)},{ts(b)},Base,,0,0,0,,{{\\an7\\pos({xn:.0f},{yb_n - base * fs_n:.0f})"
                f"\\fn{FONTE_GIGANTE[0]}\\b0\\fs{fs_n:.1f}\\1c{cor}\\fscx160\\fscy160\\blur25"
                f"\\t(0,220,0.5,\\fscx100\\fscy100\\blur0)\\fad(60,150)}}{num}")
            # "º" como expoente: alinhado ao topo do número.
            xo = xn + largura(num, FONTE_GIGANTE, em_n) + em_n * 0.03
            topo_num = yb_n - em_n * 0.70
            saida["linhas"].append(
                f"Dialogue: 8,{ts(a + 0.12)},{ts(b)},Base,,0,0,0,,{{\\an7"
                f"\\pos({xo:.0f},{topo_num - (base - 0.70) * fs_o * k / k * 0 - base * fs_o + em_o * 0.70:.0f})"
                f"\\fn{FONTE_GIGANTE[0]}\\b0\\fs{fs_o:.1f}\\1c{cor}\\blur15\\t(0,160,\\blur0)"
                f"\\fad(100,150)}}º")
            titulo = esc(el.get("texto", ""))
            em_t = min(0.10 * w, 0.86 * w / max(largura(titulo, FONTE_GRANDE, 1), 1e-6))
            fs_t = em_t / k
            xt = (w - largura(titulo, FONTE_GRANDE, em_t)) / 2
            yt = yb_n + em_t * 1.05
            saida["linhas"].append(
                f"Dialogue: 8,{ts(a + 0.25)},{ts(b)},Base,,0,0,0,,{{\\an7\\pos({xt:.0f},{yt - base * fs_t:.0f})"
                f"\\fn{FONTE_GRANDE[0]}\\b1\\fs{fs_t:.1f}\\1c&HFFFFFF&\\blur12\\t(0,180,\\blur0)"
                f"\\fad(150,150)}}{titulo}")
        elif tipo == "gigante":
            a = t_ini(el["palavra"]) - 0.03
            b = min(dur_final, a + float(el.get("duracao", 0.8)))
            saida["ocultar"].append((a, b))
            texto = esc(el.get("texto", "").upper())
            em = min(0.30 * w, 0.92 * w / max(largura(texto, FONTE_GIGANTE, 1), 1e-6))
            fs = em / k
            fx, fy, fh = rosto_em(a)
            yb = min(fy + 0.55 * fh + 0.05 * h + em * 0.72, 0.72 * h)
            x = (w - largura(texto, FONTE_GIGANTE, em)) / 2
            cor = cor_ass(el.get("cor", "#FFFFFF"))
            saida["linhas"].append(
                f"Dialogue: 8,{ts(a)},{ts(b)},Base,,0,0,0,,{{\\an7\\pos({x:.0f},{yb - base * fs:.0f})"
                f"\\fn{FONTE_GIGANTE[0]}\\b0\\fs{fs:.1f}\\fsp-2\\1c{cor}\\fscx135\\fscy135\\blur22"
                f"\\t(0,170,0.5,\\fscx100\\fscy100\\blur0)\\fad(0,140)}}{texto}")
            saida["whooshes"].append(a)
        elif tipo == "flash":
            t = t_ini(el["palavra"])
            a = max(0.0, t - 0.10)
            r = 0.14 * w
            saida["linhas"].append(
                f"Dialogue: 9,{ts(a)},{ts(a + 0.55)},Base,,0,0,0,,{{\\an5\\p1\\pos({w / 2:.0f},{h * 0.45:.0f})"
                f"\\1c&HFFFFFF&\\blur40\\fscx10\\fscy10\\t(0,260,\\fscx900\\fscy900)"
                f"\\fad(40,260)}}{_circulo(r)}")
            saida["linhas"].append(
                f"Dialogue: 9,{ts(a + 0.08)},{ts(a + 0.55)},Base,,0,0,0,,{{\\an7\\p1\\pos(0,0)"
                f"\\1c&HFFFFFF&\\alpha&HFF&\\t(0,90,\\alpha&H00&)\\t(110,450,\\alpha&HFF&)}}"
                f"{_retangulo(0, 0, w, h)}")
            saida["whooshes"].append(a)
        elif tipo == "cena":
            a, b = t_ini(el["de"]) - 0.05, t_fim(el["ate"])
            fx, fy, fh = rosto_em((a + b) / 2)
            desce = DESCIDA_CENA * h
            enq = (el.get("foco", [0.5, 0.5]), float(el.get("zoom", 1)))
            saida["cenas"].append((a, b, el["arquivo"], float(el.get("inicio_clip", 0)), desce, enq))
            queixo = fy + 0.55 * fh + desce
            saida["y_fixo"].append((a, b, min(queixo / h + cfg.get("queixo_palavra", 0.05), 0.80)))
            saida["queixo_fixo"].append((a, b, queixo / h))
    return saida


def filtro_divisoes(divisoes, info):
    """Ramos de filtro que compõem a tela dividida sobre o fluxo principal."""
    w, h = info["largura"], info["altura"]
    ramos = []
    for cw, ch, x0, y0, topo_h in (d[2] for d in divisoes):
        ramos.append(f"crop={cw:.0f}:{ch:.0f}:{x0:.0f}:{y0:.0f},scale={w}:{topo_h}:flags=lanczos,"
                     f"pad={w}:{h}:0:0:color={PAINEL}")
    return ramos


# O primeiro quadro do clipe chega um pouco antes da janela da cena: sem isso, no quadro
# em que quem fala já desceu, o topo ainda aparece vazio (escuro).
ANTECIPA_CENA = 0.15


def filtro_cena(desce, info):
    """Quem fala, deslocado para baixo (o alto vira fundo escuro para a cena)."""
    w, h = info["largura"], info["altura"]
    d = round(desce / 2) * 2
    return f"crop={w}:{h - d}:0:0,pad={w}:{h}:0:{d}:color=0x101010"


def filtro_clipe_topo(eh_imagem, a, b, info, enq=((0.5, 0.5), 1.0)):
    """A cena do topo: preenche a largura, ganha zoom lento se for foto e se dissolve
    para baixo num degradê de transparência. `enq` = (foco [x, y] em fração do clipe, zoom):
    o ponto de foco fica no meio da parte opaca da faixa (o assunto principal, não a borda)."""
    w, h = info["largura"], info["altura"]
    th = round(h * TOPO_CENA / 2) * 2
    fps = info["fps"]
    # Clipe mais curto que a fala: segura o último quadro em vez de deixar o topo vazio.
    (fx, fy), z = enq
    passos = [f"scale={round(w * z / 2) * 2}:{round(th * z / 2) * 2}:force_original_aspect_ratio=increase",
              f"crop={w}:{th}:'min(max(0,iw*{fx:.3f}-ow/2),iw-ow)':'min(max(0,ih*{fy:.3f}-oh*0.38),ih-oh)'",
              f"fps={fps:.5f}", f"tpad=stop_mode=clone:stop_duration={b - a + 1:.2f}",
              f"trim=duration={b - a + ANTECIPA_CENA + 0.2:.3f}"]
    if eh_imagem:
        quadros = max(1, int((b - a) * fps))
        passos = [f"scale={w * 2}:{th * 2}:force_original_aspect_ratio=increase",
                  f"crop={w * 2}:{th * 2}",
                  f"zoompan=z='1+0.12*on/{quadros}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'"
                  f":d=1:s={w}x{th}:fps={fps:.5f}"]
    # Entrada e saída secas (corte tradicional): um fade deixaria ver o fundo escuro
    # que fica atrás da cena enquanto quem fala está deslocado para baixo.
    passos += ["format=rgba",
               f"geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='255*min(1,(H-Y)/(H*0.32))'",
               f"setpts=PTS-STARTPTS+{a - ANTECIPA_CENA:.3f}/TB"]
    return ",".join(passos)
