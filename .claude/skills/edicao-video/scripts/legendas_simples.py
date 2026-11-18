# legenda simples: frase em caixa normal, sem contorno, sombra leve; blocos de até ~26 caracteres
import json, sys
d = json.load(open(sys.argv[1]))
ws = [dict(w=w["w"].strip(), s=w["s"], e=w["e"]) for s in d for w in s["words"]]
def t(x): return f"{int(x//3600)}:{int(x%3600//60):02d}:{x%60:05.2f}"
blocos, cur = [], []
for w in ws:
    prox = " ".join(x["w"] for x in cur + [w])
    if cur and len(prox) > 26: blocos.append(cur); cur = []
    cur.append(w)
    if w["w"][-1] in ".?!": blocos.append(cur); cur = []
if cur: blocos.append(cur)
# palavra sozinha no fim da frase gruda no bloco anterior
m = []
for b in blocos:
    if m and len(b) == 1 and len(" ".join(x["w"] for x in m[-1] + b)) <= 32 and m[-1][-1]["w"][-1] not in ".?!":
        m[-1] = m[-1] + b
    else: m.append(b)
blocos = m
head = """[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 2

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Leg,Inter Display SemiBold,62,&H00FFFFFF,&H00FFFFFF,&H00000000,&HA0000000,0,0,0,0,100,100,0,0,1,0,2,2,90,90,%s,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
""" % (sys.argv[3] if len(sys.argv) > 3 else "560")
out = []
for i, b in enumerate(blocos):
    st, en = b[0]["s"], b[-1]["e"]
    if i + 1 < len(blocos): en = min(max(en + 0.15, st + 0.6), blocos[i+1][0]["s"])
    txt = " ".join(x["w"] for x in b).rstrip(".,")
    out.append(f"Dialogue: 0,{t(st)},{t(en)},Leg,,0,0,0,,{{\\fad(80,80)}}{txt}")
open(sys.argv[2], "w").write(head + "\n".join(out) + "\n")
print(len(blocos), "blocos")
