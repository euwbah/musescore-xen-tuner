from typing import Dict


nominals = [
    (0, 'A'),
    (203.91, 'B'),
    (294.13, 'C'),
    (498.04, 'D'),
    (701.96, 'E'),
    (792.18, 'F'),
    (996.09, 'G'),
]

apotome_map: Dict[int, str] = {
    -4: 'bbbb',
    -3: 'bbb',
    -2: 'bb',
    -1: 'b',
    0: '',
    1: '#',
    2: 'x',
    3: 'x#',
    4: 'xx',
}

syntonic_map: Dict[int, str] = {
    -2: '\\\\',
    -1: '\\',
    0: '',
    1: '/',
    2: '//',
}

notes_in_equave = []

for (cents, letter) in nominals:
    for apotome in range(-4, 5):
        for syntonic in range(-2, 3):
            notes_in_equave.append((letter + apotome_map[apotome] + syntonic_map[syntonic], cents + apotome * 113.685 + syntonic * 21.506))

notes_in_equave.sort(key=lambda x: x[1])

for (note, cents) in notes_in_equave:
    print(f'{note} {cents:.2f}c')