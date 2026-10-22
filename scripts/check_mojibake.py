import json
import re

with open('bank_soal_pancasila_cat.json', 'r', encoding='utf-8') as f:
    raw_json = json.load(f)

mojibake_hits = []
mojibake_patterns = [r'ΓÇ', r'â€', r'Â', r'\ufffd', r'\?{2,}', r'6\?+8']

for q in raw_json:
    full_str = f"{q['question']} {' '.join(q['options'])} {q.get('explanation', '')}"
    hits = []
    for pat in mojibake_patterns:
        m = re.findall(pat, full_str)
        if m:
            hits.append((pat, len(m)))
    if hits:
        mojibake_hits.append((q['id'], q['type'], hits, q['question'][:70]))

print(f"Total mojibake/corrupted questions in bank_soal_pancasila_cat.json: {len(mojibake_hits)}")
for qid, qtype, hits, text in mojibake_hits[:15]:
    print(f"[{qid}] ({qtype}) {hits} -> {text}")
