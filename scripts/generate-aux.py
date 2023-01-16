"""
Generates auxiliary up/down scripts based on the main up.qml and down.qml files.
"""

# 5 additional up/down operations should be more than enough...

NUM_AUX = 5

english_ordinals = ['', 'first', 'second', 'third', 'fourth', 'fifth']

with open('up.qml', 'r') as file:
    up_dog = file.read()

with open('down.qml', 'r') as file:
    down_dog = file.read()

for aux in range(1, NUM_AUX + 1):
    with open(f'up aux{aux}.qml', 'w') as file:
        new_code = up_dog\
            .replace('"Raise selection/selected note(s) up to a higher step"', 
                     f'"Raise selection/selected note(s) up to a higher step. Steps sizes are determined by the {english_ordinals[aux]} aux() declaration."')\
            .replace('"Plugins.xen.Pitch Up"', f'"Plugins.xen.Pitch Up (aux{aux})"')\
            .replace('property var stepwiseAux: 1', f'property var stepwiseAux: {aux}')
        
        file.write(new_code)
    
    with open(f'down aux{aux}.qml', 'w') as file:
        new_code = down_dog\
            .replace('"Lower selection/selected note(s) down to a lower step"', 
                     f'"Lower selection/selected note(s) down to a lower step. Steps sizes are determined by the {english_ordinals[aux]} aux() declaration."')\
            .replace('"Plugins.xen.Pitch Down"', f'"Plugins.xen.Pitch Down (aux{aux})"')\
            .replace('property var stepwiseAux: 1', f'property var stepwiseAux: {aux}')
        
        file.write(new_code)
    
            