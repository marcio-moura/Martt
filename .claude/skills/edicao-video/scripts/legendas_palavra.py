# legenda palavra por palavra: uma palavra por vez, simples, sem contorno
import json, sys
d = json.load(open(sys.argv[1]))
ws = [dict(w=w["w"].strip(), s=w["s"], e=w["e"]) for s in d for w in s["words"]]
def t(x): return f"{int(x//3600)}:{int(x%3600//60):02d}:{x%60:05.2f}"
mv = sys.argv[3] if len(sys.argv) > 3 else "740"
head = f"""[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 2

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Leg,Inter Display SemiBold,84,&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,1,0,3,2,90,90,{mv},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
out = []
for i, w in enumerate(ws):
    st = w["s"]; en = w["e"]
    if i + 1 < len(ws):
        nx = ws[i+1]["s"]
        en = nx if nx - en < 0.6 else en + 0.25   # cola na próxima, menos em pausa
    else: en += 0.3
    en = max(en, st + 0.12)
    txt = w["w"].strip(".,;:")
    out.append(f"Dialogue: 0,{t(st)},{t(en)},Leg,,0,0,0,,{{\\fscx92\\fscy92\\t(0,90,\\fscx100\\fscy100)}}{txt}")
open(sys.argv[2], "w").write(head + "\n".join(out) + "\n")
print(len(out), "palavras")
