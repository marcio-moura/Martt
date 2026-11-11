"""Trilha original do vídeo, composta no tempo exato das cenas (roteiro.js).

Ré maior, ~100 BPM. Começo leve e caloroso (piano, celesta, pizzicato suave);
a partir de "a Dra. Simone seguiu sozinha" ganha pulso e energia (piano em ostinato,
pizzicato, cordas, taiko e tímpano), com um respiro curto em 2020 e ápice na logo.
Amostras reais MusyngKite (gleitz/midi-js-soundfonts). Uso:
    python3 compor.py <pasta-das-amostras> <saida.wav>
A pasta precisa ter piano/, cordas/, pizz/, celesta/, taiko/ e timpani/ com <Nota><Oitava>.mp3 (ex.: Db4.mp3).
"""
import sys, subprocess, numpy as np

SR = 44100
AMOSTRAS, SAIDA = sys.argv[1], sys.argv[2]
TOTAL = 159.5
NOMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"]
FAIXA = {"piano": (24, 95), "cordas": (24, 95), "pizz": (36, 83), "celesta": (60, 95), "taiko": (24, 59), "timpani": (24, 59)}
rng = np.random.default_rng(11)

_cache = {}
def amostra(inst, midi):
    lo, hi = FAIXA[inst]
    while midi > hi: midi -= 12
    while midi < lo: midi += 12
    k = (inst, midi)
    if k not in _cache:
        nome = f"{NOMES[midi % 12]}{midi // 12 - 1}"
        raw = subprocess.run(["ffmpeg", "-v", "error", "-i", f"{AMOSTRAS}/{inst}/{nome}.mp3", "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"],
                             capture_output=True, check=True).stdout
        x = np.frombuffer(raw, np.float32).reshape(-1, 2).copy()
        i = int(np.argmax(np.abs(x).max(1) > 1e-3)); x = x[i:]
        f = int(0.4 * SR); x[-f:] *= np.linspace(1, 0, f)[:, None] ** 2
        _cache[k] = x
    return _cache[k]

N = int(SR * (TOTAL + 6))
mix = {k: np.zeros((N, 2), np.float32) for k in ("piano", "cordas", "pizz", "celesta", "perc", "fx")}

def pan(x, p):
    a = (p + 1) * np.pi / 4
    return x * np.array([np.cos(a), np.sin(a)], np.float32) * 1.41

def soma(bus, t, x):
    i = int(max(0, t) * SR); x = x[: N - i]; mix[bus][i:i + len(x)] += x

def toca(inst, t, midi, vel, dur=None, p=None, bus=None):
    x = amostra(inst, midi).copy()
    if dur is not None:
        n = int(dur * SR); rel = int(0.25 * SR)
        if n + rel < len(x):
            x = x[: n + rel]; x[n:] *= np.linspace(1, 0, len(x) - n)[:, None]
    if p is None: p = (midi - 62) / 40
    if bus is None: bus = "perc" if inst in ("taiko", "timpani") else inst
    soma(bus, t + rng.uniform(-0.008, 0.008), pan(x, p) * vel)

def corda(t, midi, dur, vel, ataque=0.5):
    s = amostra("cordas", midi)
    l0, l1, xf = int(0.7 * SR), int(2.5 * SR), int(0.35 * SR)
    n = int(dur * SR); rel = int(1.2 * SR)
    out, seg, fade, tot = [s[:l0].copy()], s[l0:l1], np.linspace(0, 1, int(0.35 * SR))[:, None], l0
    while tot < n + rel:
        out[-1][-xf:] = out[-1][-xf:] * (1 - fade) + seg[:xf] * fade
        out.append(seg[xf:].copy()); tot += len(seg) - xf
    x = np.concatenate(out)[: n + rel].copy()
    x[n:] *= np.linspace(1, 0, len(x) - n)[:, None] ** 2
    a = int(ataque * SR); x[:a] *= np.linspace(0, 1, a)[:, None] ** 1.3
    soma("cordas", t, pan(x, rng.uniform(-0.6, 0.6)) * vel)

def bumbo(t, vel):  # batida grave sintetizada (coração)
    n = int(0.5 * SR); tt = np.arange(n) / SR
    f = 48 + 70 * np.exp(-tt * 28)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 7)
    soma("perc", t, np.repeat(x[:, None], 2, 1).astype(np.float32) * vel)

def subida(t0, t1, vel):  # "swell" de ruído filtrado antes das viradas
    n = int((t1 - t0) * SR); env = np.linspace(0, 1, n) ** 3
    x = rng.standard_normal((n, 2)).astype(np.float32)
    for k in (64, 32, 16):
        x = np.apply_along_axis(lambda c: np.convolve(c, np.ones(k) / k, "same"), 0, x)
    soma("fx", t0, x * env[:, None] * vel * 6)

# ---------- grade de tempo ----------
# compasso de 4 tempos ajustado para a logo (131.6 s) cair num tempo forte, contando de 40.2 s
BAR = (131.6 - 40.2) / 38
BEAT = BAR / 4
def bar(k): return 40.2 + k * BAR      # k negativo = introdução

D, E, Fs, G, A, B, Cs = 62, 64, 66, 67, 69, 71, 73
AC = {
    "D": (38, [D, Fs, A]), "Dadd9": (38, [D, Fs, A, E + 12]), "A": (33, [Cs - 12, E, A]), "Asus": (33, [D, E, A]),
    "Bm": (35, [D, Fs, B]), "G": (31, [D, G, B]), "Gadd9": (31, [D, G, A]), "Em": (40, [E, G, B]),
    "D/F#": (30, [D, Fs, A]), "A/C#": (37, [Cs - 12, E, A]),
}
# (compasso inicial, acorde, seção)
INTRO = ["D", "D", "Gadd9", "G", "D/F#", "D/F#", "Asus", "A", "D", "D", "Gadd9", "G", "Bm", "A", "G", "Asus"]
PLANO = [(-16 + i, c, "intro") for i, c in enumerate(INTRO)]
EN = [  # a partir de 40.2 s
    "D", "A", "Bm", "G", "D", "A", "G", "Asus",                 # 0-7   Simone segue, nova equipe, reconhecimento
    "G",                                                         # 8     respira antes de 2020
    "Bm", "Gadd9", "Asus",                                       # 9-11  2020: o mundo parou / ela decidiu avançar
    "D", "A", "G",                                               # 12-14 Setor Maysa: volta com tudo
    "D", "A", "Bm", "G", "D", "A", "G", "A",                     # 15-22 família e equipe
    "Bm", "G", "D", "A",                                         # 23-26 montagem da equipe
    "G", "A", "Bm", "Gadd9", "G", "A", "Asus",                   # 27-33 20 anos, Dra. Simone, legado
    "D", "A", "Bm", "G",                                         # 34-37 gratidão
    "D", "G", "A",                                               # 38-40 logo
    "Bm", "G", "D/F#", "Asus", "G", "A", "D", "D",               # 41-48 "essa história..." e final
]
SEC = {}
for k in range(0, 8): SEC[k] = "energia"
SEC[8] = "prepara"
for k in (9, 10): SEC[k] = "pausa"
SEC[11] = "virada"
for k in range(12, 27): SEC[k] = "energia"
SEC[27] = "energia"; SEC[28] = "energia"
for k in (29, 30): SEC[k] = "intimo"
for k in (31, 32, 33): SEC[k] = "virada2"
for k in range(34, 41): SEC[k] = "apice"
for k in range(41, 46): SEC[k] = "calma"
for k in range(46, 49): SEC[k] = "fim"
PLANO += [(k, c, SEC[k]) for k, c in enumerate(EN)]

CURVA = [(0, .5), (40, .55), (42, .66), (60, .72), (61.8, .6), (62, .45), (69, .5), (69.5, .72), (76, .74),
         (100, .8), (105, .82), (110, .74), (112, .62), (116, .66), (121, .84), (131.6, 1.0), (139, .9), (140, .6), (159.5, .5)]
def I(t):
    ts, vs = zip(*CURVA); return float(np.interp(t, ts, vs))

mel = 78
for idx, (k, nome, sec) in enumerate(PLANO):
    t0 = bar(k); t1 = bar(k + 1) if idx + 1 < len(PLANO) else TOTAL
    if t0 >= TOTAL: break
    if t1 > TOTAL: t1 = TOTAL
    L = t1 - t0
    baixo, notas = AC[nome]
    v = I(t0)
    beats = [t0 + b * BEAT for b in range(4)]
    eighths = [t0 + e * BEAT / 2 for e in range(8)]

    if sec == "intro":
        # piano leve em colcheias, registro médio-agudo, balanço suave
        toca("piano", t0, baixo + 12, 0.42 * v + 0.12)
        padrao = [0, 1, 2, 1, 2, 1, 0, 1] if len(notas) == 3 else [0, 1, 2, 3, 2, 1, 0, 1]
        for e, te in enumerate(eighths):
            if t0 < 1.5 and e < 2: continue
            n = notas[padrao[e % len(padrao)] % len(notas)] + 12
            toca("piano", te, n, (0.30 + 0.25 * v) * (1.1 if e in (0, 3, 6) else 0.85))
        if k >= -12:  # pizzicato nos tempos 1 e 3
            toca("pizz", beats[0], baixo + 12, 0.35 * v); toca("pizz", beats[2], baixo + 19, 0.28 * v)
        if k >= -8:  # celesta: pequena melodia luminosa a cada compasso
            topo = sorted(n + 24 for n in notas)
            toca("celesta", beats[0] + BEAT * 0.5, topo[-1], 0.32 * v, dur=BEAT * 1.4)
            toca("celesta", beats[2], topo[1], 0.26 * v, dur=BEAT)
            toca("celesta", beats[3], topo[0 if k % 2 else 2], 0.24 * v, dur=BEAT)
        if k >= -4: corda(t0, notas[0], L + 0.2, 0.10 + 0.08 * v, ataque=0.9)
        continue

    forte = sec in ("energia", "apice", "virada2")
    # --- piano: ostinato em colcheias com oitavas (energia) ---
    if sec in ("energia", "apice", "virada2", "prepara", "virada"):
        toca("piano", t0, baixo, 0.5 + 0.35 * v); toca("piano", t0, baixo + 12, 0.4 + 0.3 * v)
        figura = [0, 2, 1, 2, 0, 2, 1, 2]
        for e, te in enumerate(eighths):
            n = notas[figura[e] % len(notas)] + 12 + (12 if e in (2, 6) and v > 0.7 else 0)
            acento = 1.15 if e in (0, 3, 6) else 0.85
            toca("piano", te, n, (0.32 + 0.3 * v) * acento)
        if sec == "apice":
            for b in (0, 2): [toca("piano", beats[b], n + 24, 0.45 + 0.3 * v, dur=BEAT * 1.8) for n in notas]
    elif sec == "pausa":
        toca("piano", t0, baixo + 12, 0.45); [toca("piano", beats[b], notas[b % 3] + 12, 0.38) for b in (0, 1, 2, 3)]
    elif sec == "intimo":
        toca("piano", t0, baixo + 12, 0.5)
        for e, te in enumerate(eighths): toca("piano", te, notas[[0, 1, 2, 1][e % 4]] + 12, 0.36 + 0.1 * (e % 4 == 0))
    elif sec in ("calma", "fim"):
        toca("piano", t0, baixo + 12, 0.5)
        for e, te in enumerate(eighths):
            if sec == "fim" and k == 48 and e > 0: break
            toca("piano", te, notas[[0, 1, 2, 1][e % 4]] + 12 + (12 if e % 4 == 2 else 0), 0.34 + 0.08 * (e % 4 == 0))

    # --- pizzicato em colcheias (motor rítmico) ---
    if forte or sec == "virada":
        for e, te in enumerate(eighths):
            n = baixo + 12 if e % 2 == 0 else notas[(e // 2) % len(notas)]
            toca("pizz", te, n, (0.32 + 0.3 * v) * (1.15 if e % 2 == 0 else 0.8))

    # --- cordas sustentadas, com crescendo no compasso ---
    if forte or sec in ("prepara", "virada", "intimo", "calma"):
        g = (0.16 + 0.42 * v ** 1.4) * (0.6 if sec in ("intimo", "calma") else 1)
        for n in notas: corda(t0, n, L + 0.15, g, ataque=0.25 if forte else 0.6)
        corda(t0, baixo + 12, L + 0.15, g * 0.8, ataque=0.25)
        if v > 0.78: [corda(t0, n + 12, L + 0.15, g * 0.55, ataque=0.3) for n in notas]
    if sec == "pausa": corda(t0, baixo + 12, L + 0.3, 0.16, ataque=1.0)
    if sec == "fim" and k == 48:
        for n in notas + [baixo + 12]: corda(t0, n, 6.0, 0.22, ataque=0.4)
        toca("celesta", t0 + 0.05, notas[-1] + 24, 0.3, dur=3)

    # --- melodia (cordas/piano agudo) nas partes de energia ---
    if sec in ("energia", "apice") and k >= 15:
        alvo = sorted({n + o for n in notas for o in (12, 24) if 74 <= n + o <= 88})
        mel = min(alvo, key=lambda n: abs(n - mel) + (2 if n == mel else 0))
        toca("piano", beats[0], mel, 0.55 + 0.35 * v, dur=BEAT * 1.6)
        passo = min(alvo, key=lambda n: abs(n - (mel + (2 if k % 4 < 2 else -2))))
        toca("piano", beats[2] + BEAT * 0.5, passo, 0.45 + 0.3 * v, dur=BEAT * 1.2)
        if sec == "apice": toca("celesta", beats[0], mel + 12, 0.3, dur=BEAT * 1.5)

    # --- percussão ---
    if forte:
        bumbo(beats[0], 0.55 * v); bumbo(beats[2], 0.42 * v)
        toca("taiko", beats[0], 38, 0.45 * v, p=0); toca("taiko", beats[2] + BEAT / 2, 41, 0.32 * v, p=0.2)
        if sec == "apice" or (sec == "energia" and k >= 15):
            toca("taiko", beats[3] + BEAT / 2, 45, 0.28 * v, p=-0.2)
    if sec in ("prepara", "virada", "virada2"):
        for e in range(8): toca("timpani", eighths[e], baixo + 12 if e % 2 == 0 else baixo + 19, 0.18 + 0.06 * e, p=0)
    if sec == "intimo": bumbo(beats[0], 0.3)

# viradas: "swell" antes de voltar com tudo
subida(bar(11), bar(12), 0.05)
subida(bar(33), bar(34), 0.06)
subida(bar(37) + BAR / 2, bar(38), 0.07)
toca("timpani", bar(38), 38, 0.7, p=0); toca("taiko", bar(38), 36, 0.7, p=0)
toca("timpani", bar(12), 38, 0.55, p=0); toca("timpani", bar(15), 38, 0.5, p=0)

# ---------- mixagem ----------
dry = (mix["piano"] * 0.85 + mix["cordas"] * 0.5 + mix["pizz"] * 0.55 + mix["celesta"] * 0.5 + mix["perc"] * 0.9 + mix["fx"] * 0.6)
def reverb(x, seg=2.2):
    n = int(seg * SR); t = np.arange(n) / SR
    ir = rng.standard_normal((n, 2)).astype(np.float32) * np.exp(-t * 6.9 / seg)[:, None]
    k = 16; ir = np.apply_along_axis(lambda c: np.convolve(c, np.ones(k) / k, "same"), 0, ir)
    ir[: int(0.018 * SR)] = 0; ir /= np.sqrt((ir ** 2).sum(0))
    m = 1 << int(np.ceil(np.log2(len(x) + n))); out = np.zeros_like(x)
    for c in range(2): out[:, c] = np.fft.irfft(np.fft.rfft(x[:, c], m) * np.fft.rfft(ir[:, c], m), m)[: len(x)]
    return out
# equilíbrio por trecho: introdução "média" (nem sumida nem forte) e final presente
tt = np.arange(len(dry)) / SR
dry *= np.interp(tt, [0, 38.5, 41.5, 139, 146, TOTAL + 6], [2.3, 2.3, 1.0, 1.0, 1.6, 1.6]).astype(np.float32)[:, None]
y = dry * 0.8 + reverb(dry - mix["perc"] * 0.6) * 0.42
y = y[: int(SR * TOTAL)]
f = int(3.5 * SR); y[-f:] *= np.linspace(1, 0, f)[:, None] ** 1.5
y[: int(0.2 * SR)] *= np.linspace(0, 1, int(0.2 * SR))[:, None]
# compressão leve (soft-knee) para o começo não sumir e o ápice não estourar
mono = np.abs(y).mean(1)
w = int(0.5 * SR); env = np.sqrt(np.convolve(mono ** 2, np.ones(w) / w, "same")) + 1e-6
ref = np.percentile(env, 90)
ganho = np.clip((env / ref) ** -0.35, 0.6, 2.2)          # sobe as partes baixas, segura as altas
g2 = int(0.3 * SR); ganho = np.convolve(ganho, np.ones(g2) / g2, "same")
y = y * ganho[:, None]
y /= np.abs(y).max() / 0.85
pcm = (np.clip(y, -1, 1) * 32767).astype("<i2")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "s16le", "-ar", str(SR), "-ac", "2", "-i", "-", SAIDA],
               input=pcm.tobytes(), check=True)
print("ok", SAIDA, "BPM", round(60 / BEAT, 1))
