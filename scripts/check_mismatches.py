import json

with open('scripts/all_cat_questions.json', 'r', encoding='utf-8') as f:
    questions = {q['id']: q for q in json.load(f)}

print("=== CHECKING 5 LETTER MISMATCHES ===")
mismatch_ids = ['pip-0656', 'pip-0657', 'pip-0707', 'tiu-0531', 'tiu-0536']
letters = ['A', 'B', 'C', 'D', 'E']

for qid in mismatch_ids:
    q = questions[qid]
    print(f"\nID: {qid} ({q['type']})")
    print(f"Question: {q['question']}")
    for idx, opt in enumerate(q['options']):
        marker = "==> [CORRECT]" if idx == q['correctIndex'] else "   "
        print(f" {marker} ({letters[idx]}) {opt}")
    print(f"correctIndex: {q['correctIndex']} ({letters[q['correctIndex']]})")
    print(f"Explanation: {q['explanation']}")

print("\n" + "="*60)
print("=== CHECKING DUPLICATE QUESTION STEMS (pip-0076 to pip-0081) ===")
for qid in ['pip-0076', 'pip-0077', 'pip-0078']:
    q = questions[qid]
    print(f"\nID: {qid}")
    print(f"Question: {q['question']}")
    for idx, opt in enumerate(q['options']):
        marker = "==> [CORRECT]" if idx == q['correctIndex'] else "   "
        print(f" {marker} ({letters[idx]}) {opt}")
    print(f"Explanation: {q['explanation']}")
