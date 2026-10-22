import json
import re

with open('scripts/all_cat_questions.json', 'r', encoding='utf-8') as f:
    questions = json.load(f)

print(f"Total questions: {len(questions)}")

# Check Perbandingan Nilai
perbandingan_anomalies = []
for q in questions:
    if q['category'] == 'Perbandingan Nilai':
        # Text usually:
        # Bandingkan nilai pada kolom A dan kolom B.
        # Kolom A: ...
        # Kolom B: ...
        # Pilih A jika A lebih besar, B jika B lebih besar, atau C jika keduanya sama.
        # Options: ['A', 'B', 'C', ...]
        m_a = re.search(r'Kolom A:\s*(.+)', q['question'])
        m_b = re.search(r'Kolom B:\s*(.+)', q['question'])
        if m_a and m_b:
            raw_a = m_a.group(1).split('\n')[0].strip()
            raw_b = m_b.group(1).split('\n')[0].strip()
            correct_opt = q['options'][q['correctIndex']].strip()

            # evaluate raw_a and raw_b
            val_a = None
            val_b = None
            try:
                # fraction a/b
                if '/' in raw_a:
                    num, den = raw_a.split('/')
                    val_a = float(num) / float(den)
                elif '%' in raw_a:
                    val_a = float(raw_a.replace('%', '')) / 100.0
                elif ':' in raw_a:
                    num, den = raw_a.split(':')
                    val_a = float(num) / float(den)
                elif '²' in raw_a:
                    num = raw_a.replace('²', '')
                    val_a = float(num) ** 2
                
                if '/' in raw_b:
                    num, den = raw_b.split('/')
                    val_b = float(num) / float(den)
                elif '%' in raw_b:
                    val_b = float(raw_b.replace('%', '')) / 100.0
                elif ':' in raw_b:
                    num, den = raw_b.split(':')
                    val_b = float(num) / float(den)
                elif '²' in raw_b:
                    num = raw_b.replace('²', '')
                    val_b = float(num) ** 2

                if val_a is not None and val_b is not None:
                    expected = "A" if val_a > val_b else ("B" if val_b > val_a else "C")
                    if correct_opt != expected:
                        perbandingan_anomalies.append({
                            'id': q['id'],
                            'col_a': raw_a,
                            'val_a': val_a,
                            'col_b': raw_b,
                            'val_b': val_b,
                            'expected': expected,
                            'marked': correct_opt,
                            'explanation': q.get('explanation')
                        })
            except Exception as e:
                pass

print(f"\n--- PERBANDINGAN NILAI ANOMALIES: {len(perbandingan_anomalies)} found ---")
for a in perbandingan_anomalies[:10]:
    print(f"[{a['id']}] Kolom A: {a['col_a']} ({a['val_a']:.4f}) vs Kolom B: {a['col_b']} ({a['val_b']:.4f})")
    print(f"   Expected: {a['expected']}, but Marked Correct: {a['marked']}")
    print(f"   Explanation: {a['explanation']}")

# Check Aritmatika & Hitung Cepat
hitung_anomalies = []
for q in questions:
    if q['category'] == 'Aritmatika & Hitung Cepat':
        # Berapakah hasil dari ...?
        m = re.search(r'Berapakah hasil dari\s*([0-9\+\-\*×−\(\)\s]+)\?', q['question'])
        if m:
            expr_str = m.group(1).replace('×', '*').replace('−', '-')
            try:
                # safe eval for simple arithmetic
                actual_val = eval(expr_str, {"__builtins__": None}, {})
                correct_opt_str = q['options'][q['correctIndex']].strip()
                # parse float or int from correct_opt_str
                correct_opt_num = float(re.search(r'[-+]?\d*\.?\d+', correct_opt_str).group(0))
                if abs(actual_val - correct_opt_num) > 1e-4:
                    hitung_anomalies.append({
                        'id': q['id'],
                        'expr': m.group(1),
                        'actual': actual_val,
                        'marked': correct_opt_str,
                        'explanation': q.get('explanation')
                    })
            except Exception as e:
                pass

print(f"\n--- ARITMATIKA & HITUNG CEPAT ANOMALIES: {len(hitung_anomalies)} found ---")
for h in hitung_anomalies[:10]:
    print(f"[{h['id']}] Expr: {h['expr']} -> Math Result: {h['actual']} != Marked: {h['marked']}")
