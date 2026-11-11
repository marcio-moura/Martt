"""Trilha original do vídeo, composta no tempo exato das cenas (roteiro.js).

Piano e cordas com amostras reais (MusyngKite, via gleitz/midi-js-soundfonts),
em Ré maior, com reverb de sala. Uso:
    python3 compor.py <pasta-das-amostras> <saida.wav>
A pasta precisa ter piano/<Nota><Oitava>.mp3 e cordas/<Nota><Oitava>.mp3 (ex.: piano/Db4.mp3).
"""
import sys, subprocess, numpy as np

SR = 44100
AMOSTRAS, SAIDA = sys.argv[1], sys.argv[2]
TOTAL = 159.5
NOMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"]
rng = np.random.default_rng(7)

_cache = {}
def amostra(inst, midi):
    k = (inst, midi)
    if k not in _cache:
        nome = f"{NOMES[midi % 12]}{midi // 12 - 1}"
        raw = subprocess.run(["ffmpeg", "-v", "error", "-i", f"{AMOSTRAS}/{inst}/{nome}.mp3", "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"],
                             capture_output=True, check=True).stdout
        x = np.frombuffer(raw, np.float32).reshape(-1, 2).copy()
        # tira o silêncio inicial do decodificador
        i = int(np.argmax(np.abs(x).max(1) > 1e-3)); x = x[i:]
        f = int(0.4 * SR); x[-f:] *= np.linspace(1, 0, f)[:, None] ** 2   # fim suave, sem estalo
        _cache[k] = x
    return _cache[k]

mix = {"piano": np.zeros((int(SR * (TOTAL + 6)), 2), np.float32), "cordas": np.zeros((int(SR * (TOTAL + 6)), 2), np.float32)}

def pan(x, p):  # p em -1..1
    a = (p + 1) * np.pi / 4
    return x * np.array([np.cos(a), np.sin(a)], np.float32) * 1.41

def piano(t, midi, vel, dur=None):
    while midi > 95: midi -= 12
    x = amostra("piano", midi).copy()
    if dur is not None:
        n = int(dur * SR); rel = int(0.35 * SR)
        if n + rel < len(x):
            x = x[: n + rel]; x[n:] *= np.linspace(1, 0, len(x) - n)[:, None]
    # nota mais suave = mais escura (média móvel simples)
    if vel < 0.55:
        k = int(2 + (0.55 - vel) * 14)
        x = np.apply_along_axis(lambda c: np.convolve(c, np.ones(k) / k, "same"), 0, x)
    x = pan(x, (midi - 60) / 40) * (vel ** 1.6)
    i = int(t * SR); mix["piano"][i:i + len(x)] += x[: len(mix["piano"]) - i]

def corda(t, midi, dur, vel):
    """Nota sustentada: ataque da amostra + laço com crossfade + soltura longa."""
    s = amostra("cordas", midi)
    a0, l0, l1, xf = int(0.5 * SR), int(0.7 * SR), int(2.5 * SR), int(0.35 * SR)
    n = int(dur * SR); rel = int(1.6 * SR)
    out = [s[:l0].copy()]
    seg = s[l0:l1]
    fade = np.linspace(0, 1, xf)[:, None]
    tot = l0
    while tot < n + rel:
        prev = out[-1]
        prev[-xf:] = prev[-xf:] * (1 - fade) + seg[:xf] * fade
        out.append(seg[xf:].copy()); tot += len(seg) - xf
    x = np.concatenate(out)[: n + rel].copy()
    x[n:] *= np.linspace(1, 0, len(x) - n)[:, None] ** 2   # soltura contínua, sem emenda
    att = min(a0, len(x)); x[:att] *= np.linspace(0, 1, att)[:, None] ** 1.5
    x = pan(x, rng.uniform(-0.5, 0.5)) * vel
    i = int(t * SR); mix["cordas"][i:i + len(x)] += x[: len(mix["cordas"]) - i]

# ---------- intensidade ao longo do vídeo ----------
CURVA = [(0, .46), (10.5, .5), (40, .52), (55, .58), (61, .55), (62, .3), (68.5, .26), (72, .5), (76.9, .58),
         (100, .7), (105.8, .74), (112, .62), (112.4, .42), (116, .55), (123, .82), (131.6, 1.0), (135, .82),
         (139.4, .42), (148, .38), (159.5, .28)]
def I(t):
    ts, vs = zip(*CURVA); return float(np.interp(t, ts, vs))

# ---------- harmonia (tempo em segundos, acorde) ----------
# acordes como (baixo, notas) em graus MIDI relativos; Ré maior
D, E, Fs, G, A, B, Cs = 62, 64, 66, 67, 69, 71, 73
AC = {
    "D": (38, [D, Fs, A]), "Dadd9": (38, [D, Fs, A, E + 12]), "A/C#": (37, [Cs - 12, E, A]), "Bm": (35, [B - 12, D, Fs]),
    "G": (31, [G - 12, B - 12, D]), "Gmaj7": (31, [G - 12, B - 12, D, Fs]), "Em": (40, [E - 12, G - 12, B - 12]),
    "A": (33, [A - 12, Cs - 12, E]), "Asus": (33, [A - 12, D, E]), "D/F#": (30, [Fs - 12, A - 12, D]), "Bm7": (35, [B - 12, D, Fs, A]),
}
PLANO = [
    (0, "Dadd9"), (5.2, "Bm7"),
    (10.5, "D"), (14.2, "A/C#"), (18.0, "Bm"), (21.7, "G"), (25.4, "D"), (29.0, "A/C#"), (32.8, "Gmaj7"), (36.5, "Asus"),
    (40.2, "Bm"), (42.9, "G"), (45.7, "D"), (48.4, "A"), (51.2, "Bm"), (53.9, "G"), (56.7, "Em"), (59.4, "Asus"),
    (62.0, "Bm"), (65.5, "Gmaj7"),
    (68.5, "Em"), (70.1, "Asus"), (71.7, "D"), (74.3, "A"),
    (76.9, "G"), (80.5, "D/F#"), (84.1, "Em"), (87.7, "D"), (91.3, "G"), (94.9, "D/F#"), (98.5, "Bm"), (102.1, "A"),
    (105.8, "G"), (109.1, "A"), (112.4, "Bm7"), (115.9, "Gmaj7"), (119.5, "Asus"),
    (123.1, "D"), (125.2, "A/C#"), (127.4, "Bm"), (129.5, "G"), (131.6, "D"), (135.0, "G"), (137.2, "A"),
    (139.4, "Bm"), (141.6, "Gmaj7"), (143.8, "D/F#"), (146.0, "Asus"),
    (148.0, "G"), (151.0, "A"), (154.0, "Dadd9"),
]
FIM = 159.5

# ---------- arranjo ----------
mel = 74  # nota da melodia (Ré 5)
for idx, (t0, nome) in enumerate(PLANO):
    t1 = PLANO[idx + 1][0] if idx + 1 < len(PLANO) else FIM
    L = t1 - t0
    baixo, notas = AC[nome]
    v = I(t0)
    silencio2020 = 62.0 <= t0 < 68.5
    # baixo (piano, oitava grave)
    piano(t0, baixo, 0.5 + 0.4 * v)
    if v > 0.55 and not silencio2020: piano(t0, baixo + 12, 0.35 + 0.3 * v)
    # arpejo da mão direita
    if not silencio2020:
        passo = 0.43 if v < 0.75 else 0.215 * 2
        ordem = [0, 1, 2, 1] if len(notas) == 3 else [0, 1, 2, 3]
        pad = [n + 12 for n in notas]
        k, t = 0, t0 + (0.43 if t0 > 0 else 0.2)
        while t < t1 - 0.1:
            nota = pad[ordem[k % len(ordem)]] + (12 if (k // len(ordem)) % 2 and v > 0.5 else 0)
            piano(t + rng.uniform(-0.012, 0.012), nota, (0.28 + 0.32 * v) * (1.08 if k % 4 == 0 else 0.92))
            k += 1; t += passo
    else:
        # 2020: só notas graves, espaçadas
        piano(t0 + 0.05, notas[0], 0.35); piano(t0 + L * 0.5, notas[-1] + 12, 0.3)
    # melodia (a partir da família e no ápice), notas do acorde perto da anterior
    if 76.9 <= t0 < 139.4 and not (112.4 <= t0 < 115.9):
        alvos = sorted({n + o for n in notas for o in (0, 12, 24) if 69 <= n + o <= 86})
        sobe = 1 if t0 < 131.6 else -1
        cand = [n for n in alvos if (n - mel) * sobe >= 0] or alvos
        mel = min(cand, key=lambda n: abs(n - mel) + (0 if n != mel else 3))
        piano(t0 + 0.02, mel, 0.55 + 0.4 * v, dur=L * 0.6)
        if L > 2.6:
            viz = min(alvos, key=lambda n: abs(n - (mel - 2 * sobe)))
            piano(t0 + L * 0.62, viz, 0.45 + 0.35 * v, dur=L * 0.35)
        if v > 0.8: piano(t0 + 0.02, mel - 12, 0.4 + 0.3 * v, dur=L * 0.6)
    # cordas
    if t0 >= 42.9 and not (62.0 <= t0 < 68.5) and t0 < 148.0:
        g = 0.12 + 0.55 * v ** 1.5
        if 139.4 <= t0: g *= 0.55
        for n in notas: corda(t0, n, L + 0.25, g)
        if v > 0.6: corda(t0, baixo + 12, L + 0.25, g * 0.8)
        if v > 0.85: [corda(t0, n + 12, L + 0.25, g * 0.55) for n in notas]
    if 65.5 <= t0 < 68.5:  # nota longa e baixa no "O mundo parou" -> prepara a virada
        corda(t0 + 0.5, 43, L + 0.5, 0.18)
    if t0 == 154.0:
        for n in notas: corda(t0 + 0.2, n, 5.0, 0.12)

# ---------- mixagem, reverb, master ----------
dry = mix["piano"] * 0.9 + mix["cordas"] * 0.55
def reverb(x, seg=2.8):
    n = int(seg * SR)
    t = np.arange(n) / SR
    ir = rng.standard_normal((n, 2)).astype(np.float32) * np.exp(-t * 6.9 / seg)[:, None]
    k = 24; ir = np.apply_along_axis(lambda c: np.convolve(c, np.ones(k) / k, "same"), 0, ir)  # escurece
    ir[: int(0.02 * SR)] = 0
    ir /= np.sqrt((ir ** 2).sum(0))
    m = 1 << int(np.ceil(np.log2(len(x) + n)))
    out = np.zeros_like(x)
    for c in range(2):
        out[:, c] = np.fft.irfft(np.fft.rfft(x[:, c], m) * np.fft.rfft(ir[:, c], m), m)[: len(x)]
    return out
wet = reverb(dry)
y = dry * 0.78 + wet * 0.5
y = y[: int(SR * TOTAL)]
f = int(3.0 * SR); y[-f:] *= np.linspace(1, 0, f)[:, None] ** 1.5
y[: int(0.3 * SR)] *= np.linspace(0, 1, int(0.3 * SR))[:, None]
# nível: pico em -1.5 dBFS, sem compressão (mantém o contraste entre o começo suave e o ápice)
y /= np.abs(y).max() / 0.84
pcm = (np.clip(y, -1, 1) * 32767).astype("<i2")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "s16le", "-ar", str(SR), "-ac", "2", "-i", "-", SAIDA],
               input=pcm.tobytes(), check=True)
print("ok", SAIDA)
