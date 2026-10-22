import json
import re

with open('scripts/base_tiu_dump.json', 'r', encoding='utf-8') as f:
    base_tiu = json.load(f)

# Let's inspect Silogisme (tiu-0121 to tiu-0135)
print("=== CHECKING SILOGISME (tiu-0121 s.d. tiu-0135) ===")
for q in base_tiu[120:135]:
    c_idx = q['correctIndex']
    ans = q['options'][c_idx]
    print(f"\n[{q['id']}]")
    print(f"Premis: {q['question']}")
    print(f"Kunci ({chr(65+c_idx)}): {ans}")
    print(f"Exp: {q['explanation']}")

# Let's inspect Penalaran Analitis (tiu-0136 to tiu-0150)
print("\n=== CHECKING ANALITIS (tiu-0136 s.d. tiu-0150) ===")
for q in base_tiu[135:150]:
    c_idx = q['correctIndex']
    ans = q['options'][c_idx]
    print(f"\n[{q['id']}]")
    print(f"Premis: {q['question']}")
    print(f"Kunci ({chr(65+c_idx)}): {ans}")
    print(f"Exp: {q['explanation']}")
