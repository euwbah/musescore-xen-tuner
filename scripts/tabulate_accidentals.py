"""
Code generator for CODE_TO_LABELS, TEXT_TO_CODE, SYMBOL_LAYOUT, lookup objects for tabulating accidental symbols.

Downloads .csv from Google Sheets (HTTP GET) and generates generated-tables.js
"""

import csv
import urllib.request

SHEET_URL = "https://docs.google.com/spreadsheets/d/1kRBJNl-jdvD9BBgOMJQPcVOHjdXurx5UFWqsPf46Ffw/gviz/tq?tqx=out:csv&sheet=CSV+export"

with urllib.request.urlopen(SHEET_URL) as csv_download:
    with open('generated-tables.js', 'w') as f:
        csv_data = csv_download.read().decode('utf-8')
        
        # Remove the first 5 lines of the csv
        # If CSV export format is changed, this may have to be changed to a different number
        csv_data = csv_data.split('\n', 5)[5]
        
        print('downloaded + trimmed csv data: \n' + csv_data)
        
        reader = csv.reader(csv_data.splitlines(), delimiter=',', quotechar='"', quoting=csv.QUOTE_ALL, skipinitialspace=True)
        
        text_code_map = {}
        
        # Only contains non-default layout settings
        # The default layout setting is in the Google Sheet
        layout_map = {}
        
        f.write('var CODE_TO_LABELS = [\n')
        # SymCode 0 should be null.
        # to premptively prevent dumb js falsey errors.
        f.write('    null,\n')
        
        for row in reader:
            sym_code = int(row[0].strip())
            text_code = row[1].strip()
            layout = []
            
            try:
                layout = [float(x) for x in row[2].strip().split(' ')]
            except:
                pass
            
            ids = [f'{repr(x.strip())}' for x 
                in row[3:] if len(x.strip()) != 0]
            
            if len(text_code) != 0:
                text_code_map[text_code] = sym_code
            
            if len(layout) == 4:
                for id in ids:
                    layout_map[id] = layout
            
            if len(ids) != 0:
                f.write(f'    [{",".join(ids)}],\n')
            
        f.write('];\n\n\n')
        
        f.write('var TEXT_TO_CODE = {\n')
        
        for k, v in text_code_map.items():
            f.write(f'    {repr(k)}: {v},\n')
        
        f.write('};\n\n\n')
        
        f.write('var SYMBOL_LAYOUT = {\n')
        
        for k, v in layout_map.items():
            f.write(f'    {k}: [{",".join([str(x) for x in v])}],\n')
        
        f.write('};\n')
        
        f.write("""
function ImportGenerated() {
    return {
        CODE_TO_LABELS: CODE_TO_LABELS,
        TEXT_TO_CODE: TEXT_TO_CODE,
        SYMBOL_LAYOUT: SYMBOL_LAYOUT
    };
}
""")

print('Exported to generated-tables.js')