import json

with open('scripts/base_tiu_dump.json', 'r', encoding='utf-8') as f:
    base_tiu = json.load(f)

print(f"Loaded {len(base_tiu)} base TIU questions.")

for q in base_tiu:
    qid = q['id']
    cat = q['category']
    qtext = q['question']
    c_idx = q['correctIndex']
    ans = q['options'][c_idx]
    exp = q['explanation']
    
    # Check for:
    # 1. Negative indices or out of bounds
    if not (0 <= c_idx < len(q['options'])):
        print(f"ANOMALY: Out of bounds index in {qid}")
    
    # 2. Check if answer matches explanation
    # Let's print out all 150 to a clean text file for audit
