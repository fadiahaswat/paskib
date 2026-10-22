import json
import re

with open('scripts/all_cat_questions.json', 'r', encoding='utf-8') as f:
    questions = json.load(f)

true_neg = []
for q in questions:
    qtext = q['question']
    if re.search(r'\b(kecuali|bukan merupakan|tidak termasuk|yang bukan)\b', qtext, re.IGNORECASE):
        true_neg.append(q)

print(f"True negation questions found: {len(true_neg)}")
for q in true_neg:
    print(f"\n[{q['id']}] ({q['type']} / {q['category']})")
    print(f"Q: {q['question']}")
    c_idx = q['correctIndex']
    print(f"Key ({chr(65+c_idx)}): {q['options'][c_idx]}")
    print(f"Exp: {q['explanation']}")
