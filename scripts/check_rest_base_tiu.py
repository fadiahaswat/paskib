import json

with open('scripts/base_tiu_dump.json', 'r', encoding='utf-8') as f:
    base_tiu = json.load(f)

print("=== CHECKING TIU 31-150 ===")
for q in base_tiu[30:]:
    c_idx = q['correctIndex']
    ans = q['options'][c_idx]
    print(f"[{q['id']}] ({q['category']})")
    print(f"  Q: {q['question']}")
    print(f"  Ans ({chr(65+c_idx)}): {ans}")
    print(f"  Exp: {q['explanation']}")
    print("-" * 50)
