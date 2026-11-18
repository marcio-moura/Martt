import json, sys
d = json.load(open(sys.argv[1]))
ws = [dict(w=w["w"].strip(), s=w["s"], e=w["e"]) for s in d for w in s["words"]]
def t(x):
    h=int(x//3600); m=int(x%3600//60); s=x%60
    return f"{h}:{m:02d}:{s:05.2f}"
# blocos de até 3 palavras / 18 caracteres, quebrando em pontuação
blocos=[]; cur=[]
for w in ws:
    cur.append(w)
    txt=" ".join(x["w"] for x in cur)
    if len(cur)>=3 or len(txt)>=16 or w["w"][-1] in ".,?!":
        blocos.append(cur); cur=[]
if cur: blocos.append(cur)
head = """[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 2

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Leg,Inter Display,78,&H00FFFFFF,&H00FFFFFF,&H00222524,&H64000000,-1,0,0,0,100,100,0,0,1,6,2,2,80,80,560,1
Style: Gancho,Inter Display,64,&H00222524,&H00222524,&H00F2F7F8,&H00F2F7F8,-1,0,0,0,100,100,0,0,3,26,0,8,90,90,250,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
lines=[]
for i,b in enumerate(blocos):
    st=b[0]["s"]; en=b[-1]["e"]
    if i+1<len(blocos): en=min(max(en,st+0.5), blocos[i+1][0]["s"])
    txt=" ".join(x["w"] for x in b).rstrip(".,").upper()
    lines.append(f"Dialogue: 0,{t(st)},{t(en)},Leg,,0,0,0,,{txt}")
gancho = sys.argv[3] if len(sys.argv)>3 else ""
if gancho:
    lines.append(f"Dialogue: 1,{t(0)},{t(3.5)},Gancho,,0,0,0,,{{\\fad(150,250)}}{gancho}")
open(sys.argv[2],"w").write(head+"\n".join(lines)+"\n")
print(len(blocos),"blocos")
