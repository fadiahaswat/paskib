import json
import re
from collections import Counter, defaultdict

def main():
    with open('scripts/all_cat_questions.json', 'r', encoding='utf-8') as f:
        questions = json.load(f)

    print(f"Total questions loaded: {len(questions)}")

    pip_qs = [q for q in questions if q.get('type') == 'pip']
    tiu_qs = [q for q in questions if q.get('type') == 'tiu']

    print(f"PIP Questions: {len(pip_qs)}")
    print(f"TIU Questions: {len(tiu_qs)}")

    # 1. Duplicates
    print("\n" + "="*60)
    print("1. DUPLICATE QUESTION TEXTS")
    print("="*60)
    text_to_qs = defaultdict(list)
    for q in questions:
        t = re.sub(r'\s+', ' ', q['question'].strip().lower())
        text_to_qs[t].append(q)

    dups = {k: v for k, v in text_to_qs.items() if len(v) > 1}
    print(f"Found {len(dups)} duplicate question texts:")
    for i, (t, qs) in enumerate(dups.items(), 1):
        print(f"\nDuplicate Group #{i} ({len(qs)} occurrences):")
        print(f"Question preview: {qs[0]['question'][:100]}...")
        for q in qs:
            print(f"  - [{q['id']}] ({q['type']} / {q['category']}) correctIndex={q['correctIndex']}: '{q['options'][q['correctIndex']]}'")

    # 2. Encoding / Mojibake / Corrupted text
    print("\n" + "="*60)
    print("2. ENCODING & CHARACTER CORRUPTION ANOMALIES")
    print("="*60)
    corrupted_patterns = [
        r'\ufffd',          # replacement char
        r'',               # replacement char literal
        r'\?{2,}',          # two or more question marks (often corrupted quotes/em-dashes)
        r'Ã[¡-ÿ]',          # utf-8 double encoded
        r'â[€œ”’–—]',       # utf-8 double encoded curly quotes / dashes
        r'\bNaN\b',
        r'\bundefined\b',
        r'\[object Object\]'
    ]
    corrupted_qs = []
    for q in questions:
        all_text = f"{q['question']} {' '.join(q['options'])} {q.get('explanation', '')}"
        found = []
        for pat in corrupted_patterns:
            matches = re.findall(pat, all_text)
            if matches:
                found.append((pat, len(matches), matches[0]))
        if found:
            corrupted_qs.append((q['id'], q['type'], found, q['question'][:70], q.get('explanation', '')[:70]))

    print(f"Found {len(corrupted_qs)} questions with encoding/corruption issues.")
    for cid, ctype, found, qtext, exp in corrupted_qs[:15]:
        print(f"  - [{cid}] ({ctype}) Issues: {found}")
        print(f"      Q: {qtext}")
        print(f"      Exp: {exp}")

    # 3. Discrepancy between Explanation and correctIndex
    print("\n" + "="*60)
    print("3. EXPLANATION VS CORRECT INDEX / OPTION MISMATCH")
    print("="*60)
    letter_mismatches = []
    letters = ['A', 'B', 'C', 'D', 'E']
    for q in questions:
        exp = q.get('explanation', '')
        c_idx = q['correctIndex']
        expected_letter = letters[c_idx] if 0 <= c_idx < 5 else '?'
        
        # Look for phrases like "Jawaban yang benar adalah (A|B|C|D|E)" or "Kunci: A" or "Jawaban: B"
        # or "(A)" at the start of explanation
        m = re.search(r'(?:jawaban(?: yang benar)?|kunci(?:\s+jawaban)?|pilihan(?:\s+yang benar)?|opsi)\s*(?:adalah|:|\s)\s*\(?([A-E])\)?', exp, re.IGNORECASE)
        if m:
            stated_letter = m.group(1).upper()
            if stated_letter != expected_letter:
                letter_mismatches.append({
                    'id': q['id'],
                    'type': q['type'],
                    'category': q['category'],
                    'stated': stated_letter,
                    'expected': expected_letter,
                    'correctIndex': c_idx,
                    'correctOption': q['options'][c_idx],
                    'explanation': exp[:120]
                })

    print(f"Found {len(letter_mismatches)} explicit letter mismatches in explanation:")
    for lm in letter_mismatches:
        print(f"  - [{lm['id']}] Stated letter in explanation: '{lm['stated']}', but correctIndex is {lm['correctIndex']} ({lm['expected']})!")
        print(f"      Option selected: '{lm['correctOption']}'")
        print(f"      Explanation: '{lm['explanation']}...'")

    # 4. Check for options that look like "A. ...", "B. ..."
    print("\n" + "="*60)
    print("4. PREFIX REDUNDANCY IN OPTIONS")
    print("="*60)
    prefix_anomalies = []
    for q in questions:
        has_prefix = [bool(re.match(r'^[A-Ea-e][\.\)]\s*', opt)) for opt in q['options']]
        if any(has_prefix):
            prefix_anomalies.append((q['id'], has_prefix, q['options']))
    print(f"Questions with 'A.', 'B.' prefixes inside option strings: {len(prefix_anomalies)}")
    if prefix_anomalies:
        for pa in prefix_anomalies[:5]:
            print(f"  - [{pa[0]}]: {pa[2]}")

    # 5. Check TIU questions by category and logical integrity
    print("\n" + "="*60)
    print("5. TIU BREAKDOWN & MATH/LOGIC INTEGRITY CHECK")
    print("="*60)
    tiu_categories = Counter(q['category'] for q in tiu_qs)
    print("TIU Categories distribution:")
    for cat, cnt in tiu_categories.most_common():
        print(f"  - {cat}: {cnt}")

    # 6. Check PIP questions by category
    print("\n" + "="*60)
    print("6. PIP BREAKDOWN & INTEGRITY CHECK")
    print("="*60)
    pip_categories = Counter(q['category'] for q in pip_qs)
    print("PIP Categories distribution:")
    for cat, cnt in pip_categories.most_common():
        print(f"  - {cat}: {cnt}")

if __name__ == '__main__':
    main()
