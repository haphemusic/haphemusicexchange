# -*- coding: utf-8 -*-
import csv

with open('datos/Camarero catálogo - Hoja 1.csv', mode='r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    categories = set()
    rows = []
    for r in reader:
        categories.add(r['Categoría de Scoring'])
        rows.append(r)

print("Unique categories in CSV:")
for c in sorted(categories):
    print(f"  - {c}")

print(f"\nTotal rows in CSV: {len(rows)}")
