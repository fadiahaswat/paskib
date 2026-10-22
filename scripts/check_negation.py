import json

with open('scripts/all_cat_questions.json', 'r', encoding='utf-8') as f:
    questions = json.load(f)

pip_qs = [q for q in questions if q['type'] == 'pip']
negation_qs = [q for q in pip_qs if any(k in q['question'].lower() for k in ['kecuali', 'bukan', 'tidak termasuk', 'keliru', 'salah'])]

print(f"Checking {len(negation_qs)} negation questions...")
for q in negation_qs:
    c_idx = q['correctIndex']
    ans = q['options'][c_idx]
    exp = q['explanation']
    print(f"\n[{q['id']}] Q: {q['question']}")
    print(f"  Key ({chr(65+c_idx)}): {ans}")
    print(f"  Exp: {exp}")
