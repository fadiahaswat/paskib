import json
import re

with open('scripts/all_cat_questions.json', 'r', encoding='utf-8') as f:
    questions = json.load(f)

# 1. Kecepatan, Jarak & Waktu
kecepatan_anomalies = []
for q in questions:
    if q['category'] == 'Kecepatan, Jarak & Waktu':
        # Form 0: Kendaraan melaju dengan kecepatan X km/jam selama Y jam. Berapa jarak yang ditempuh?
        m0 = re.search(r'kecepatan (\d+) km/jam selama (\d+) jam\. Berapa jarak', q['question'])
        if m0:
            v = int(m0.group(1))
            t = int(m0.group(2))
            expected = v * t
            marked = int(re.search(r'\d+', q['options'][q['correctIndex']]).group(0))
            if expected != marked:
                kecepatan_anomalies.append((q['id'], 'Form 0', f"v={v}, t={t}, expected={expected}, marked={marked}"))
        # Form 1: Jarak X km ditempuh dengan kecepatan Y km/jam. Berapa lama waktu perjalanannya?
        m1 = re.search(r'Jarak (\d+) km ditempuh dengan kecepatan (\d+) km/jam\. Berapa lama waktu', q['question'])
        if m1:
            s = int(m1.group(1))
            v = int(m1.group(2))
            expected = s // v
            marked = int(re.search(r'\d+', q['options'][q['correctIndex']]).group(0))
            if expected != marked:
                kecepatan_anomalies.append((q['id'], 'Form 1', f"s={s}, v={v}, expected={expected}, marked={marked}"))
        # Form 2: Sebuah kendaraan menempuh X km dalam Y jam. Berapa kecepatan rata-ratanya?
        m2 = re.search(r'menempuh (\d+) km dalam (\d+) jam\. Berapa kecepatan', q['question'])
        if m2:
            s = int(m2.group(1))
            t = int(m2.group(2))
            expected = s // t
            marked = int(re.search(r'\d+', q['options'][q['correctIndex']]).group(0))
            if expected != marked:
                kecepatan_anomalies.append((q['id'], 'Form 2', f"s={s}, t={t}, expected={expected}, marked={marked}"))

print(f"Kecepatan anomalies: {len(kecepatan_anomalies)}")

# 2. Aritmatika Sosial
sosial_anomalies = []
for q in questions:
    if q['category'] == 'Aritmatika Sosial':
        m_base = re.search(r'Rp([0-9\.]+)', q['question'])
        m_pct = re.search(r'(\d+)%', q['question'])
        if m_base and m_pct:
            base = int(m_base.group(1).replace('.', ''))
            pct = int(m_pct.group(1))
            correct_val = int(re.search(r'Rp([0-9\.]+)', q['options'][q['correctIndex']]).group(1).replace('.', ''))
            
            if 'diskon' in q['question'] and 'setelah diskon' in q['question']:
                expected = int(base * (100 - pct) / 100)
            elif 'keuntungan' in q['question'] and 'harga jual' in q['question']:
                expected = int(base * (100 + pct) / 100)
            elif 'Berapa besar' in q['question'] or 'jumlah potongan' in q['question']:
                expected = int(base * pct / 100)
            else:
                expected = None

            if expected is not None and expected != correct_val:
                sosial_anomalies.append((q['id'], q['question'], f"expected={expected}, marked={correct_val}"))

print(f"Aritmatika sosial anomalies: {len(sosial_anomalies)}")
for a in sosial_anomalies[:5]:
    print(a)

# 3. Deret Angka & Huruf
deret_anomalies = []
for q in questions:
    if q['category'] == 'Deret Angka & Huruf':
        # Let's inspect the pattern in tiuExpansion.ts for deret:
        # const form = n % 4
        # form === 0: a, a+d, a+2d, a+3d, a+4d, ? -> answer a+5d
        # form === 1: a, a*r, a*r^2, a*r^3, ? -> answer a*r^4
        # form === 2: a, a+2, a+6, a+12, a+20, ? -> answer a+30
        # form === 3: a, a+d, a, a+d, a, ? -> answer a+d
        # Let's check if the marked option is actually correct according to explanation
        pass
