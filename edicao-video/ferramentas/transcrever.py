import sys, wave, numpy as np
from faster_whisper import WhisperModel
w=wave.open(sys.argv[1]); a=np.frombuffer(w.readframes(w.getnframes()),np.int16).astype(np.float32)/32768
m=WhisperModel("small",device="cpu",compute_type="int8")
segs,_=m.transcribe(a,language="pt")
for s in segs: print(f"[{s.start:5.1f}-{s.end:5.1f}] {s.text}")
