import json

with open('scripts/base_tiu_dump.json', 'r', encoding='utf-8') as f:
    base_tiu = json.load(f)

# Let's inspect Sinonim & Antonim
print("=== SINONIM & ANTONIM (tiu-0001 s.d. tiu-0015) ===")
for q in base_tiu[:15]:
    c_idx = q['correctIndex']
    ans = q['options'][c_idx]
    print(f"[{q['id']}] Q: {q['question']}")
    print(f"       Ans ({chr(65+c_idx)}): {ans}")
    print(f"       Exp: {q['explanation']}")

# Let's inspect Analogi (tiu-0016 s.d. tiu-0030)
print("\n=== ANALOGI KATA (tiu-0016 s.d. tiu-0030) ===")
for q in base_tiu[15:30]:
    c_idx = q['correctIndex']
    ans = q['options'][c_idx]
    print(f"[{q['id']}] Q: {q['question']}")
    print(f"       Ans ({chr(65+c_idx)}): {ans}")
    print(f"       Exp: {q['explanation']}")
