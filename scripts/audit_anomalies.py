import json
import re

with open('scripts/all_cat_questions.json', 'r', encoding='utf-8') as f:
    questions = json.load(f)

corrupted = []
for q in questions:
    has_bad = False
    details = []
    for field in ['question', 'explanation'] + [f'option_{i}' for i in range(len(q['options']))]:
        text = q['question'] if field == 'question' else (q.get('explanation', '') if field == 'explanation' else q['options'][int(field.split('_')[1])])
        if '\ufffd' in text:
            has_bad = True
            details.append((field, text))
    if has_bad:
        corrupted.append((q['id'], q['type'], details))

print(f"Total questions containing replacement character (\\ufffd): {len(corrupted)}")
for cid, ctype, details in corrupted[:10]:
    print(f"\nID: {cid} ({ctype})")
    for f, text in details:
        # show where \ufffd occurs
        pos = text.find('\ufffd')
        start = max(0, pos - 25)
        end = min(len(text), pos + 25)
        print(f"  Field {f}: ...{text[start:end]}...")
