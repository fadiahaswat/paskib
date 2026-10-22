import json
import re

with open('scripts/all_cat_questions.json', 'r', encoding='utf-8') as f:
    questions = json.load(f)

base_qs = [q for q in questions if (q['type'] == 'pip' and int(q['id'].split('-')[1]) <= 1039) or (q['type'] == 'tiu' and int(q['id'].split('-')[1]) <= 150)]
print(f"Base questions count: {len(base_qs)}")

# 1. Check TIU 1-150
base_tiu = [q for q in base_qs if q['type'] == 'tiu']
print(f"Base TIU questions count: {len(base_tiu)}")

with open('scripts/base_tiu_dump.json', 'w', encoding='utf-8') as f:
    json.dump(base_tiu, f, indent=2, ensure_ascii=False)

# Let's inspect categories of base TIU
tiu_cats = {}
for q in base_tiu:
    tiu_cats[q['category']] = tiu_cats.get(q['category'], 0) + 1
print("Base TIU categories:", tiu_cats)

# 2. Check Sila and Lambang consistency in PIP
sila_lambang_map = {
    'pertama': ('bintang', 'ketuhanan'),
    'kedua': ('rantai', 'kemanusiaan'),
    'ketiga': ('pohon beringin', 'persatuan'),
    'keempat': ('kepala banteng', 'kerakyatan|permusyawaratan|hikmat'),
    'kelima': ('padi dan kapas', 'keadilan')
}

sila_anomalies = []
for q in base_qs:
    if q['type'] == 'pip':
        text = f"{q['question']} {q.get('explanation', '')} {q['options'][q['correctIndex']]}".lower()
        for sila, (lambang, keyword) in sila_lambang_map.items():
            if f"sila {sila}" in text or f"sila ke-{sila}" in text or f"sila k{sila}" in text:
                # check if other lambang is mistakenly mentioned in explanation or answer
                for other_sila, (other_lambang, _) in sila_lambang_map.items():
                    if other_sila != sila and other_lambang in text:
                        # might be talking about both or mismatch
                        pass

# 3. Check Pasal UUD in PIP
pasal_anomalies = []
for q in base_qs:
    if q['type'] == 'pip':
        m_q = re.findall(r'pasal\s+(\d+[a-z]?(?:\s+ayat\s+\(\d+\))?)', q['question'].lower())
        m_exp = re.findall(r'pasal\s+(\d+[a-z]?(?:\s+ayat\s+\(\d+\))?)', q.get('explanation', '').lower())
        m_ans = re.findall(r'pasal\s+(\d+[a-z]?(?:\s+ayat\s+\(\d+\))?)', q['options'][q['correctIndex']].lower())
        # check if question asks about pasal X but answer or explanation is pasal Y
        if m_q and m_ans:
            if m_q[0] != m_ans[0] and 'hubungan' not in q['question'].lower():
                pasal_anomalies.append((q['id'], m_q, m_ans, q['question'][:70]))

print(f"Pasal anomalies: {len(pasal_anomalies)}")
for pa in pasal_anomalies[:5]:
    print(pa)
