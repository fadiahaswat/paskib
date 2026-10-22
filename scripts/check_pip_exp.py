import json

with open('scripts/all_cat_questions.json', 'r', encoding='utf-8') as f:
    questions = json.load(f)

pip_exp = [q for q in questions if 1040 <= int(q['id'].split('-')[1]) <= 1134]
print(f"Total pip_exp: {len(pip_exp)}")
with_tidak_ada = [q for q in pip_exp if any('Tidak ada jawaban yang sesuai' in opt for opt in q['options'])]
print(f"Questions with 'Tidak ada jawaban yang sesuai': {len(with_tidak_ada)}")
