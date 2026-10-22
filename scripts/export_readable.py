import json

with open('scripts/base_tiu_dump.json', 'r', encoding='utf-8') as f:
    base_tiu = json.load(f)

with open('scripts/base_tiu_human_readable.txt', 'w', encoding='utf-8') as out:
    for q in base_tiu:
        out.write(f"ID: {q['id']} | Category: {q['category']}\n")
        out.write(f"Question: {q['question']}\n")
        for i, opt in enumerate(q['options']):
            marker = " [CORRECT]" if i == q['correctIndex'] else ""
            out.write(f"  ({chr(65+i)}) {opt}{marker}\n")
        out.write(f"Explanation: {q['explanation']}\n")
        out.write("-" * 70 + "\n")

print("Exported base_tiu_human_readable.txt successfully.")
