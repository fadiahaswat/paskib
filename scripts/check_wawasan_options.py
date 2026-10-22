import json

with open('scripts/all_cat_questions.json', 'r', encoding='utf-8') as f:
    questions = json.load(f)

wawasan_qs = [q for q in questions if 2151 <= int(q['id'].split('-')[1]) <= 2450]
print(f"Total tiuWawasan questions: {len(wawasan_qs)}")

for q in wawasan_qs[:10]:
    print(f"\nID: {q['id']} ({q['category']})")
    print(f"Question: {q['question']}")
    for i, opt in enumerate(q['options']):
        marker = " [CORRECT]" if i == q['correctIndex'] else ""
        print(f"  ({chr(65+i)}) {opt}{marker}")
