import json
import re

with open('scripts/base_tiu_dump.json', 'r', encoding='utf-8') as f:
    base_tiu = json.load(f)

print("=== CHECKING BASE TIU 1-150 ===")
for q in base_tiu:
    qid = q['id']
    cat = q['category']
    qtext = q['question']
    c_idx = q['correctIndex']
    ans = q['options'][c_idx]
    exp = q['explanation']

    # 1. Aritmatika & Hitung Cepat
    if cat == 'Aritmatika & Hitung Cepat':
        print(f"\n[{qid}] {qtext}")
        print(f"Options: {q['options']}")
        print(f"Key: {chr(65+c_idx)} -> {ans}")
        print(f"Exp: {exp}")

    # 2. Perbandingan Nilai
    if cat == 'Perbandingan Nilai':
        print(f"\n[{qid}] {qtext}")
        print(f"Options: {q['options']}")
        print(f"Key: {chr(65+c_idx)} -> {ans}")
        print(f"Exp: {exp}")

    # 3. Deret Angka & Huruf
    if cat == 'Deret Angka & Huruf':
        print(f"\n[{qid}] {qtext}")
        print(f"Options: {q['options']}")
        print(f"Key: {chr(65+c_idx)} -> {ans}")
        print(f"Exp: {exp}")
