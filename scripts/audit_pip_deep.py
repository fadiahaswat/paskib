import json
import re

with open('scripts/all_cat_questions.json', 'r', encoding='utf-8') as f:
    questions = json.load(f)

pip_qs = [q for q in questions if q['type'] == 'pip']
print(f"Total PIP questions: {len(pip_qs)}")

# 1. Check for "kecuali" / "bukan" questions
negation_qs = []
for q in pip_qs:
    qtext = q['question'].lower()
    if any(k in qtext for k in ['kecuali', 'bukan', 'tidak termasuk', 'keliru', 'salah']):
        negation_qs.append(q)

print(f"Negation questions in PIP: {len(negation_qs)}")

# 2. Check for identical question text across PIP
seen_text = {}
duplicate_stems = {}
for q in pip_qs:
    # clean stem
    stem = re.sub(r'\s+', ' ', q['question'].strip().lower())
    if stem in seen_text:
        duplicate_stems.setdefault(stem, [seen_text[stem]]).append(q)
    else:
        seen_text[stem] = q

print(f"Duplicate question stems in PIP: {len(duplicate_stems)}")
for stem, qlist in list(duplicate_stems.items())[:5]:
    print(f"\nStem ({len(qlist)} times): {stem[:90]}...")
    for item in qlist:
        print(f"  [{item['id']}] Key: {item['options'][item['correctIndex']]} | Exp: {item['explanation'][:60]}...")
