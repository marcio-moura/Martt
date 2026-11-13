"""Gera a biblioteca de efeitos sonoros (48 kHz, mono, WAV) por síntese."""
import sys, wave, numpy as np
SR = 48000
rng = np.random.default_rng(7)

def env(n, a, d):  # ataque/decay em amostras, curva suave
    e = np.ones(n); a = max(1, int(a)); e[:a] = np.linspace(0, 1, a) ** 2
    e[a:] = np.exp(-np.linspace(0, d, n - a)); return e

def bandsweep(x, f0, f1, q=2.5):
    """filtro passa-banda varrendo de f0 a f1 (biquad recalculado por bloco)"""
    out = np.zeros_like(x); z1 = z2 = 0.0; B = 64
    fs = np.geomspace(f0, f1, len(x) // B + 1)
    for i, f in enumerate(fs):
        w = 2 * np.pi * f / SR; al = np.sin(w) / (2 * q); a0 = 1 + al
        b0, b2 = al / a0, -al / a0; a1, a2 = -2 * np.cos(w) / a0, (1 - al) / a0
        for j in range(i * B, min((i + 1) * B, len(x))):
            y = b0 * x[j] + z1; z1 = -a1 * y + z2; z2 = b2 * x[j] - a2 * y; out[j] = y
    return out

def whoosh(dur=0.45, f0=300, f1=3500):
    n = int(SR * dur); t = np.linspace(0, 1, n)
    x = bandsweep(rng.standard_normal(n), f0, f1) * np.sin(np.pi * t) ** 1.5
    return x

def pop(dur=0.09, f0=900, f1=250):
    n = int(SR * dur); t = np.arange(n) / SR
    ph = 2 * np.pi * np.cumsum(np.geomspace(f0, f1, n)) / SR
    return np.sin(ph) * env(n, SR * 0.002, 9)

def tick(dur=0.03):
    n = int(SR * dur); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 2400 * t) + 0.4 * rng.standard_normal(n)) * env(n, 20, 14)

def thump(dur=0.35):
    n = int(SR * dur); t = np.arange(n) / SR
    ph = 2 * np.pi * np.cumsum(np.geomspace(120, 45, n)) / SR
    return np.sin(ph) * env(n, SR * 0.003, 7) + 0.15 * bandsweep(rng.standard_normal(n), 2000, 400) * env(n, 10, 12)

def riser(dur=1.2):
    n = int(SR * dur); t = np.linspace(0, 1, n)
    return bandsweep(rng.standard_normal(n), 200, 6000, 4) * t ** 2

def save(path, x, peak=0.8):
    x = x / (np.abs(x).max() + 1e-9) * peak
    with wave.open(path, "w") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((x * 32767).astype(np.int16).tobytes())

if __name__ == "__main__":
    d = sys.argv[1]
    save(f"{d}/whoosh.wav", whoosh()); save(f"{d}/whoosh_curto.wav", whoosh(0.25, 600, 5000))
    save(f"{d}/pop.wav", pop()); save(f"{d}/tick.wav", tick(), 0.5)
    save(f"{d}/impacto_suave.wav", thump()); save(f"{d}/riser.wav", riser(), 0.6)
