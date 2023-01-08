"""
Code generator for CODE_TO_LABELS and TEXT_TO_CODE lookup objects for tabulating accidental symbols.

Parses accidentals.csv into js.
"""

import csv

with open('./accidentals.csv') as f:
    reader = csv.reader(f, delimiter=',')
    headers = next(reader)
    
    text_code_map = {}
    
    print('CODE_TO_LABELS = [')
    # SymCode 0 should be null.
    # to premptively prevent dumb js falsey errors.
    print('    null,')
    
    for row in reader:
        sym_code = int(row[0].strip())
        text_code = row[1].strip()
        ids = [f'{repr(x.strip())}' for x in row[2:] if len(x.strip()) != 0]
        
        if len(text_code) != 0:
            text_code_map[text_code] = sym_code
        
        print(f'    [{",".join(ids)}]')
        
    print('];\n\n')
    
    print('TEXT_TO_CODE = {')
    
    for k, v in text_code_map.items():
        print(f'    {repr(k)}: {v},')
    
    print('};')