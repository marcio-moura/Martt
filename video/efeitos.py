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
"""

from padrao import FONTE_GRANDE, FONTE_PALAVRA, calibrar, cor_ass, esc, largura, ts

PAINEL = "0x0E0E10"
TOPO_DIVIDIDO = 0.55          # fração da altura ocupada por quem fala na tela dividida


def _circulo(r):
    k = 0.5523 * r
    return (f"m {r:.1f} 0 b {r + k:.1f} 0 {2 * r:.1f} {r - k:.1f} {2 * r:.1f} {r:.1f} "
            f"b {2 * r:.1f} {r + k:.1f} {r + k:.1f} {2 * r:.1f} {r:.1f} {2 * r:.1f} "
            f"b {r - k:.1f} {2 * r:.1f} 0 {r + k:.1f} 0 {r:.1f} b 0 {r - k:.1f} {r - k:.1f} 0 {r:.1f} 0")


def _retangulo(x0, y0, x1, y1):
    return f"m {x0:.0f} {y0:.0f} l {x1:.0f} {y0:.0f} l {x1:.0f} {y1:.0f} l {x0:.0f} {y1:.0f}"


def montar(elementos, por_indice, remap, info, cfg, dur_final, rosto_em):
    """Devolve dict com: linhas ASS, tics, impactos, divisoes [(a, b, crop)],
    y_fixo [(a, b, yfrac)] e ocultar [(a, b)] para as palavras soltas."""
    w, h = info["largura"], info["altura"]
    k, base = calibrar()
    amarelo = cfg["cor_destaque"]
    saida = {"linhas": [], "tics": [], "impactos": [], "divisoes": [], "y_fixo": [], "ocultar": []}

    def t_ini(i):
        return remap(por_indice[int(i)]["ini"])

    def t_fim(i):
        return min(dur_final, remap(por_indice[int(i)]["fim"]) + 0.35)

    for el in elementos:
        tipo = el.get("tipo")
        if tipo == "lista":
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
    return saida


def filtro_divisoes(divisoes, info):
    """Ramos de filtro que compõem a tela dividida sobre o fluxo principal."""
    w, h = info["largura"], info["altura"]
    ramos = []
    for cw, ch, x0, y0, topo_h in (d[2] for d in divisoes):
        ramos.append(f"crop={cw:.0f}:{ch:.0f}:{x0:.0f}:{y0:.0f},scale={w}:{topo_h}:flags=lanczos,"
                     f"pad={w}:{h}:0:0:color={PAINEL}")
    return ramos
