import json
import re

with open('scripts/all_cat_questions.json', 'r', encoding='utf-8') as f:
    questions = json.load(f)

filler_qs = []
for q in questions:
    for opt in q['options']:
        if re.search(r'\(\d+\)$', opt.strip()):
            filler_qs.append((q['id'], q['category'], q['options'], q['question'][:70]))
            break

print(f"Questions with filler options like '... (1)': {len(filler_qs)}")
for fid, fcat, fopts, fq in filler_qs[:15]:
    print(f"[{fid}] ({fcat}): {fopts}")
    print(f"   Q: {fq}")
