import json

with open('scripts/base_tiu_dump.json', 'r', encoding='utf-8') as f:
    base_tiu = json.load(f)

for q in base_tiu:
    qid = q['id']
    cat = q['category']
    qtext = q['question']
    c_idx = q['correctIndex']
    ans = q['options'][c_idx]
    exp = q['explanation']
    
    # Let's inspect Aritmatika, Perbandingan, Kecepatan, Aritmatika Sosial, Deret, Silogisme, Analitis
    if cat in ['Aritmatika & Hitung Cepat', 'Perbandingan Nilai', 'Kecepatan, Jarak & Waktu', 'Aritmatika Sosial', 'Deret Angka & Huruf', 'Silogisme', 'Penalaran Analitis']:
        print(f"[{qid}] ({cat})")
        print(f"  Q: {qtext.replace(chr(10), ' | ')}")
        print(f"  Ans ({chr(65+c_idx)}): {ans}")
        print(f"  Exp: {exp}")
        print("-" * 50)
