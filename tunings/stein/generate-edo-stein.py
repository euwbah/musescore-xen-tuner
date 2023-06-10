"""
Generates tuning config for EDOs/EDx using Stein-Zimmermann notation

HOW TO USE:

1. Install Python 3
2. Modify the configurable options below in the CONFIG SECTION.
3. Run this script in the command line/IDE of choice using python.

This script creates an <N>edo.txt file (<N> is the number of divisions of the octave.)

This script generates tuning configs identical to the ups and downs notation generated
by generate-edo-updown.py with ligatures turned on by default.

The generated tuning config will be in up/downs notation (Kite), which is based of
a chain of fifths i.e. (...-Bb-F-C-G-D-A-E-B-F#-...) which can be extended as little as
0 flats/sharps or as many as needed.

Then, to fill in the gaps between those notes (if needed), the necessary amount of up/down
arrows are calculated to populate the second accidental chain, plus additional arrows of
specified below.

Then, if the EDO has even sharpness (e.g. 31 edo has sharpness 2, where the sharp symbol
raises the pitch by 2 edosteps), the half-sharpness value is written as semi/sesqui sharps/flats
using Stein-Zimmermann quarter-tone accidentals.

The tuning config will have up to two accidental chains: one for the apotomes (pyth accidentals)
and one for the arrows.

Ligatures are available up to 2 sharps/flats and 3 up/down arrows. Any spelling beyond that will
spill over to standard pythagorean accidentals and non-ligatured up/down arrows. 
(e.g. triple flat and 4 down arrows will be notated as down arrow + bbv3 ligature + flat symbol,
additional arrows are prefixed and additional pythagorean accidentals are suffixed).

A4: 440 used by default, can be changed by editing the generated .txt file directly.

Assumes 7-nominal notation systems corresponding to the chain of fifths F C G D A E B.
The first nominal is set to A.
"""

import sys
import math

""" 
_______________________________________________________________

CONFIG SECTION

MODIFY THESE VALUES AS NECESSARY
_______________________________________________________________
"""

EDO = 31
"""
Any positive integer 2 and above is valid. (Don't go too high though)
"""

EQUAVE_SIZE = 1200
"""
Size of the equave in cents.
Use 1200 for default octave size.

To convert a ratio into cents, use 1200 * math.log2(<ratio>),
e.g. for ED3s, type: 1200 * math.log2(3/1).

This value can be positive or negative, but must be non-zero.

The generated filename will still end with 'edo' so it's recommended to
change the filename to reflect the octave stretch/alternate equave size.
"""

NTH_BEST_FIFTH = 1
"""
1 is best fifth, 2 is second best fifth, etc...
If non-best fifth is used the filename generated will be in wart notation
E.g. if NTH_BEST_FIFTH = 2 and EDO = 18, then the generated file will be 18bedo.txt

See https://en.xen.wiki/w/Val#Shorthand_notation
for info on wart notation of edos. 

If unsure, always set to 1. Do not set less than 1 or too high.
"""

NUM_SHARPS_FLATS = 2
"""
The number of sharps/flats that the chain of fifths extends to.
E.g. if 0, then only F-C-G-D-A-E-B will be provided, and all other remaining
notes can only be accessed using up/down arrows.

If 2, then pythagorean accidentals up to double flats and double sharps are provided.
"""

NUM_ADDITIONAL_ARROWS = 1
"""
If 0, then only the minimum necessary amount of up/down arrows are provided
in the arrows accidental chain, otherwise it will add the specified amount
of additional arrows to the tuning config, for enharmonic spelling purposes.

E.g. there are no required arrows for 31 edo given NUM_SHARPS_FLATS = 2,
additional arrows have to be specified if arrows are required.
"""

"""
_______________________________________________________________

SCRIPT LOGIC

DO NOT MODIFY ANYTHING BELOW THIS LINE
_______________________________________________________________
"""

PYTH_SYMBOLS = {
    -3: 'bbb',
    -2: 'bb',
    -1: 'b',
    0: '',
    1: '#',
    2: 'x',
    3: '#x'
}

def get_fifth(edo, nth_best):
    """
    Gets the fifth size of choice in edosteps.
    """
    fifth_steps = math.log2(3/2) * edo # unquantized
    
    if round(fifth_steps) == math.ceil(fifth_steps):
        # the second, fourth, sixth, ... best fifth is lower.
        # the third, fifth, seventh ... best fifth is higher.
        if nth_best % 2 == 0:
            # even, go lower
            return math.floor(fifth_steps) - ((nth_best // 2) - 1)
        else:
            # odd, go up
            return math.ceil(fifth_steps) + (nth_best // 2)
    else:
        # the even-th best fifths are higher.
        # the odd-th best fifths are lower.
        if nth_best % 2 == 0:
            # even, go higher
            return math.ceil(fifth_steps) + (nth_best // 2) - 1
        else:
            return math.floor(fifth_steps) - (nth_best // 2)


def get_minimum_req_arrows(edo, fifth_size, num_apotomes):
    """
    Gets the minimumal number of up/down arrows so that the entire edo
    is mapped.
    num_apotomes refers to the number of flats/sharps in the chain of fifths.
    """
    fifth_chain_size = 7 * (num_apotomes * 2 + 1)
    # note: modulo in python is always positive
    mapped_steps = list(dict.fromkeys([(x * fifth_size) % edo for x in range(0, fifth_chain_size)]))
    mapped_steps.sort()
    
    max_gap = 0 # stores largest gap between two mapped notes
    for i in range(0, len(mapped_steps) - 1):
        gap = mapped_steps[i + 1] - mapped_steps[i]
        if gap > max_gap:
            max_gap = gap
    
    last_gap = mapped_steps[0] + edo - mapped_steps[-1]
    
    if last_gap > max_gap:
        max_gap = last_gap
    
    # if max gap is 1, no arrows needed (every edostep is sequential)
    # if 2 or 3, 1 arrow needed, (from either direction)
    # if 4 or 5, 2 arrows needed, etc..
    
    return max_gap // 2


def construct_ligatured_textcode(apotomes, arrows):
    """
    Converts [apotomes, arrows] accidental vector into the textcode
    representing the HEJI ligature.
    
    Returns (textcode string, remaining apotomes, remaining arrows)
    """
    apotome_symb = {
        -2: "bb",
        -1: "b",
        0: "",
        1: "#",
        2: "x"
    }
    arrow_symb = {
        -3: "v3",
        -2: "v2",
        -1: "v",
        0: "",
        1: "^",
        2: "^2",
        3: "^3"
    }
    textcode = ""
    if apotomes <= -2:
        textcode += 'bb'
        apotomes += 2
    elif apotomes >= 2:
        textcode += 'x'
        apotomes -= 2
    else:
        textcode += apotome_symb[apotomes]
        apotomes = 0
    
    if arrows <= -3:
        textcode += 'v3'
        arrows += 3
    elif arrows >= 3:
        textcode += '^3'
        arrows -= 3
    else:
        textcode += arrow_symb[arrows]
        arrows = 0
    
    return (textcode, apotomes, arrows)


def construct_pyth_symbols(apotomes):
    if apotomes == 0:
        return ""
    
    symbols = []
    if apotomes < 0:
        symbols += ['bbb'] * ((-apotomes) // 3)
        apotomes = -(-apotomes % 3)
        if apotomes != 0:
            symbols.append(PYTH_SYMBOLS[apotomes])
    else:
        symbols += ['#x'] * (apotomes // 3)
        apotomes = apotomes % 3
        if apotomes != 0:
            symbols.append(PYTH_SYMBOLS[apotomes])
    
    return '.'.join(symbols)


def construct_ligatured_symbols(apotomes, arrows):
    """
    Constructs ligatured symbols, suffixing additional pyth accidentals and 
    prefixing additional arrows.
    """
    lig, apotomes, arrows = construct_ligatured_textcode(apotomes, arrows)
    if arrows < 0:
        lig = ('\\\\.' * (-arrows)) + lig
    elif arrows > 0:
        lig = ('/.' * arrows) + lig
    
    if apotomes < 0:
        lig += '.' + construct_pyth_symbols(apotomes)
    elif apotomes > 0:
        lig += '.' + construct_pyth_symbols(apotomes)
    
    return lig


def cardinal_number(n):
    return str(n) + ('th' if 4 <= n % 100 <= 20 else {1: 'st', 2: 'nd', 3: 'rd'}.get(n % 10, 'th'))


def unit_tests():
    """
    Run this to make sure everything is running fine.
    """
    assert EDO >= 2, 'EDO must be at least 2'
    assert EQUAVE_SIZE != 0, 'Equave size must be non-zero'
    assert NTH_BEST_FIFTH >= 1, 'Nth best fifth must be at least 1'
    assert NUM_SHARPS_FLATS >= 0, 'Number of apotomes cannot be negative'
    assert NUM_ADDITIONAL_ARROWS >= 0, 'Number of additional arrows cannot be negative'
    
    assert get_fifth(12, 1) == 7
    assert get_fifth(12, 2) == 8
    assert get_fifth(12, 3) == 6
    assert get_fifth(12, 4) == 9
    assert get_fifth(12, 5) == 5
    assert get_fifth(31, 1) == 18
    assert get_fifth(22, 1) == 13

    assert get_minimum_req_arrows(12, 7, 1) == 0
    assert get_minimum_req_arrows(12, 7, 0) == 1
    assert get_minimum_req_arrows(19, get_fifth(19, 1), 1) == 0
    assert get_minimum_req_arrows(22, get_fifth(22, 1), 1) == 1
    assert get_minimum_req_arrows(31, get_fifth(31, 1), 2) == 0
    
    assert construct_ligatured_textcode(0, 0) == ('', 0, 0)
    assert construct_ligatured_textcode(3, 2) == ('x^2', 1, 0)
    assert construct_ligatured_textcode(-1, -4) == ('bv3', 0, -1)
    
    assert construct_pyth_symbols(0) == ''
    assert construct_pyth_symbols(1) == '#'
    assert construct_pyth_symbols(-2) == 'bb'
    assert construct_pyth_symbols(3) == '#x'
    assert construct_pyth_symbols(-4) == 'bbb.b'
    assert construct_pyth_symbols(5) == '#x.x'
    
    assert construct_ligatured_symbols(2, 1) == 'x^'
    assert construct_ligatured_symbols(-5, -4) == '\\\\.bbv3.bbb'
    assert construct_ligatured_symbols(5, 5) == '/./.x^3.#x'
    assert construct_ligatured_symbols(2, 0) == 'x'
    assert construct_ligatured_symbols(0, -2) == 'v2'
    
    print('Unit tests passed.')
    print('Running ups & downs tuning config generator for edos.')


unit_tests()

file_name = f'{EDO}{"b"*(NTH_BEST_FIFTH - 1)}edo.txt'

fifth_steps = get_fifth(EDO, NTH_BEST_FIFTH) # in edosteps
min_req_arrows = get_minimum_req_arrows(EDO, fifth_steps, NUM_SHARPS_FLATS)
num_arrows = min_req_arrows + NUM_ADDITIONAL_ARROWS
apotome_steps = (7 * fifth_steps - EDO * 4)
apotome_cents = apotome_steps / EDO * EQUAVE_SIZE
step_cents = EQUAVE_SIZE / EDO

if (apotome_steps / 2) % 1 != 0:
    print(f'{EDO}edo has sharpness {apotome_steps}, which is not even.')
    print('This tuning config should go in the updown/ folder instead')
    exit()

# F C G D A E B, F is 0
nominal_steps = [(x * fifth_steps) % EDO for x in range(0, 7)]

# set A to step 0.
nominal_steps = [(x - nominal_steps[4]) % EDO for x in nominal_steps]

# reorder to A B C D E F G
nominal_steps = [nominal_steps[i] for i in [4, 6, 1, 3, 5, 0, 2]]

# convert to cents, add the equave
nominal_tuning = [s / EDO * EQUAVE_SIZE for s in nominal_steps] + [EQUAVE_SIZE]

nominal_string = ' '.join([f'{round(s, 6)}c' for s in nominal_tuning])

lines = []
lines.append(f"""
// {file_name} generated by generate-edo-stein.py
//
// Equave size: {EQUAVE_SIZE}c
// Fifth mapped to {fifth_steps} steps ({(cardinal_number(NTH_BEST_FIFTH) + ' ') if NTH_BEST_FIFTH > 2 else ''}best fifth)
// Apotome mapped to {apotome_steps} steps
// Chain of fifths ranges {NUM_SHARPS_FLATS} flats to {NUM_SHARPS_FLATS} sharps
// Generated with {num_arrows} up/down arrows ({min_req_arrows} arrows are required to fully map tuning)
""".strip())
lines.append('')

lines.append('A4: 440')
lines.append(nominal_string)

if NUM_SHARPS_FLATS != 0:
    pyth_symbols = [construct_pyth_symbols(apt) for apt in range(-NUM_SHARPS_FLATS, NUM_SHARPS_FLATS + 1)]
    pyth_symbols[NUM_SHARPS_FLATS] = f'({round(apotome_cents, 7)}c)'
    lines.append(' '.join(pyth_symbols))

else:
    if apotome_steps > 0:
        print('WARNING! Apotome size is 0 steps (perfect edo), but chain of fifths has pythagorean accidentals')

if num_arrows != 0:
    # the exact symbol used here doesn't really matter as a strong ligature will be used
    arrow_symbols = []
    for a in range(-num_arrows, num_arrows + 1):
        if a > 0:
            arrow_symbols.append('.'.join(['/']*a))
        else:
            arrow_symbols.append('.'.join(['\\\\']*(-a)))

    arrow_symbols[num_arrows] = f'({round(step_cents, 7)}c)'
    
    lines.append(' '.join(arrow_symbols))

lines.append('')
lines.append(f'displaysteps({EDO}, below)')

lines.append('')
lines.append('lig(1,2)!')

for apotomes in range(-NUM_SHARPS_FLATS, NUM_SHARPS_FLATS + 1):
    for arrows in range(-num_arrows, num_arrows + 1):
        if apotomes == 0 and arrows == 0:
            continue
        
        # TODO: Don't hard code the semi/sesquisharps
        
        step_offset = apotomes * apotome_steps + arrows
        if step_offset == apotome_steps / 2:
            lines.append(f'{apotomes} {arrows} +')
        elif step_offset == apotome_steps * 3/2:
            lines.append(f'{apotomes} {arrows} #+')
        elif step_offset == -apotome_steps / 2:
            lines.append(f'{apotomes} {arrows} d')
        elif step_offset == -apotome_steps * 3/2:
            lines.append(f'{apotomes} {arrows} db')
        else:
            symbols = construct_ligatured_symbols(apotomes, arrows)
            lines.append(f'{apotomes} {arrows} {symbols}')

    
lines.append('')
lines.append('sec()')

if NUM_SHARPS_FLATS >= 3:
    lines.append(f"'bbb' bbb {round(-3 * apotome_cents, 7)}c")
    lines.append(f"'###' #x {round(3 * apotome_cents, 7)}c")
    lines.append(f"'#x' #x {round(3 * apotome_cents, 7)}c")
if NUM_SHARPS_FLATS >= 2:
    lines.append(f"'bb' bb {round(-2 * apotome_cents, 7)}c")
    lines.append(f"'##' x {round(2 * apotome_cents, 7)}c")
    lines.append(f"'x' x {round(2 * apotome_cents, 7)}c")
if NUM_SHARPS_FLATS >= 1:    
    lines.append(f"'b' b {round(-apotome_cents, 7)}c")
    lines.append(f"'#' # {round(apotome_cents, 7)}c")
if num_arrows >= 1:
    lines.append(f"'v' \\\\ {round(-step_cents, 7)}c")
    lines.append(f"'^' / {round(step_cents, 7)}c")

with open(file_name, 'w') as f:
    f.write('\n'.join(lines))
    
print(f'Created {file_name}')