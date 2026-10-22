import json

with open('scripts/all_cat_questions.json', 'r', encoding='utf-8') as f:
    questions = json.load(f)

rpul_qs = [q for q in questions if 2421 <= int(q['id'].split('-')[1]) <= 2630]
for q in rpul_qs:
    if 'alat yang dipukul' in q['question']:
        print(f"ID: {q['id']}")
        print(f"Q: {q['question']}")
        for i, opt in enumerate(q['options']):
            marker = ' [CORRECT]' if i == q['correctIndex'] else ''
            print(f"  ({chr(65+i)}) {opt}{marker}")
