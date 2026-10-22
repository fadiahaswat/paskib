import json
import re

with open('scripts/all_cat_questions.json', 'r', encoding='utf-8') as f:
    questions = json.load(f)

print(f"Total questions: {len(questions)}")

# Let's inspect sources by ID prefix
prefix_counts = {}
for q in questions:
    prefix = q['id'].split('-')[0] + '-' + q['id'].split('-')[1][:2]
    prefix_counts[prefix] = prefix_counts.get(prefix, 0) + 1

print("ID prefix clusters:", prefix_counts)

# Let's inspect TIU math/arithmetic questions
tiu_math = [q for q in questions if any(k in q['category'] for k in ['Aritmatika', 'Hitung Cepat', 'Deret', 'Kecepatan', 'Perbandingan'])]
print(f"TIU math-related questions: {len(tiu_math)}")

# Let's inspect some samples from each category
samples_by_cat = {}
for q in questions:
    cat = q['category']
    if cat not in samples_by_cat:
        samples_by_cat[cat] = []
    if len(samples_by_cat[cat]) < 2:
        samples_by_cat[cat].append(q)

with open('scripts/samples_by_category.json', 'w', encoding='utf-8') as f:
    json.dump(samples_by_cat, f, indent=2, ensure_ascii=False)
print("Saved samples to scripts/samples_by_category.json")
