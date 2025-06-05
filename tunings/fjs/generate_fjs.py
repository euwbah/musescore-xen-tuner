"""
Generate a Functional Just System (FJS) tuning config.

See: https://misotanni.github.io/fjs/en/rules.html

This script assumes 3 primary accidental chains

- Pythagorean (aux 2)
- 5-limit     (aux 3)
- 7-limit     (aux 4)

The first auxiliary operation will only affect nominal.

USAGE: this script does not automatically write to a file, you have to redirect the output to a file
using the command line:

```
python3 tunings/fjs/generate_fjs.py > tunings/fjs/<name here>.txt
```

On Windows, use `py` instead of `python3`.
"""

import math
from fractions import Fraction

# ---------------------------------------------
#
#              CHOOSE OPTIONS HERE
#
# ---------------------------------------------

RADIUS_OF_TOLERANCE = math.sqrt(2187 / 2048)
"""
The "FJS Master Algorithm" `find_fifth()` decides whether the g-th fifth is assigned as the fifth
for prime p based on whether the distance between the g-th fifth 3^g and prime p/1, when balanced
octave reduced (between the intervals 1/sqrt(2) and sqrt(2)), is within +/- `RADIUS_OF_TOLERANCE`.

The original FJS uses 65/63 as the radius of tolerance, whereas Flora Canou uses +/- sqrt(2187/2048)
which is one apotome wide.

Following @Aumuse's suggestion I use the latter.
"""

ODD_LIMIT = 1023
"""
This tells the script how many secondary FJS accidentals to generate. Generates a FJS comma shift
for every odd integer that is not a multiple of 3 up to `ODD_LIMIT`.

E.g.,
- 5 represents the downwards syntonic comma
- 7 represents the downwards septimal comma
- 25 represents two downwards syntonic commas
- 35 represents one 5 and one 7 downwards comma
"""
assert ODD_LIMIT >= 7, "The odd limit must be at least 7 to support the 7-limit chain."

USE_INDEPENDENT = True
"""
Whether or not Pythagorean accidentals should be propagated independently from the FJS numeric
accidentals.

Neither of these are implemented exactly the same as the original FJS specification, which says that
FJS number accidentals don't reset prior Pythagorean accidentals (sharp/flat/nautral), but
Pythagorean accidentals reset FJS number accidentals. `True` behaves closer to original FJS.

If `False`:

- The natural accidental will reset both FJS and Pythagorean accidentals

- FJS number accidentals will also reset Pythagorean accidentals

- Pythagorean accidentals will reset FJS number accidentals

If `True`:

- FJS number accidental will not reset prior Pythagorean accidentals (sharp/flat/natural)

- Pythagorean (Natural/Sharp/Flat) accidentals will not reset FJS number accidentals
    - NOTE: This behavior is different from the original FJS, which says that pyth accidentals reset
      FJS number accidentals.

- The naturalizing symbol for FJS numbers is the fingering symbol '1', which only resets FJS accidentals
  but not Pythagorean accidentals.
"""

# The following options control which accidentals are included in the Primary Tuning Space.
#
# These are the accidentals that can be accessed using up/down arrows.
#
# Positive end of range refers to the direction of the accidental where the pitch increases.
#
# E.g., for the 5-comma, `5` is actually downwards (80/81), so the positive range that increases the
# pitch (81/80) is `/5`, `/25`, etc...

RANGE_3 = (-3, 3)
"""How many 3-limit accidentals to include in the Primary Tuning Space"""

RANGE_5 = (-2, 2)
"""How many 5-limit accidentals to include in the Primary Tuning Space"""

RANGE_7 = (-1, 1)
"""How many 7-limit accidentals to include in the Primary Tuning Space"""

assert RANGE_3[0] <= 0 and RANGE_3[1] >= 0, "RANGE_3 must include 0."
assert RANGE_5[0] <= 0 and RANGE_5[1] >= 0, "RANGE_5 must include 0."
assert RANGE_7[0] <= 0 and RANGE_7[1] >= 0, "RANGE_7 must include 0."

# ---------------------------------------------
#
#               Generator code
#
# ---------------------------------------------

def factorize(n: int) -> list[int]:
    """
    Factorize a number into its prime factors.

    Returns a list of prime factors
    """
    factors = []
    for i in range(2, int(math.sqrt(n)) + 1):
        while n % i == 0:
            factors.append(i)
            n //= i
    if n > 1:
        factors.append(n)
    return factors


def red(ji_interval: float) -> float:
    """
    Regular reduced form, octave reduces a JI n/d interval between 1/1 and 2/1.
    """
    return ji_interval * (2 ** (-math.floor(math.log2(ji_interval))))


def reb(ji_interval: float) -> float:
    """
    Balanced reduced form, octave reduces a JI n/d interval between 1/sqrt(2) and sqrt(2)/1 note
    that sqrt(2) is the tritone that divides the octave into two equal parts.
    """
    return 1 / math.sqrt(2) * red(red(ji_interval) * math.sqrt(2))


def reb_nd(n: int, d: int) -> tuple[int, int]:
    """
    Balanced reduced form, octave reduces a JI n/d interval between 1/sqrt(2) and sqrt(2)/1 note
    that sqrt(2) is the tritone that divides the octave into two equal parts.

    Returns (n, d) in balanced reduced form.

    NOTE: In order for the returned interval to be reduced, `n` and `d` must be coprime, and neither
    should contain factors of 2.
    """
    if n / d > math.sqrt(2):
        d = d * 2 ** math.floor(math.log2(n / d) + 0.5)
    elif n / d < 1 / math.sqrt(2):
        n = n * 2 ** math.floor(0.5 - math.log2(n / d))

    return n, d


def test_reb_nd():
    assert (
        reb_nd(5, 3),
        reb_nd(5, 9),
        reb_nd(5, 27),
        reb_nd(5, 81),
        reb_nd(7, 3),
        reb_nd(3, 7),
        reb_nd(11, 3),
        reb_nd(17, 3),
        reb_nd(33, 3),
    ) == ((5, 6), (10, 9), (20, 27), (80, 81), (7, 6), (6, 7), (11, 12), (17, 24), (33, 24))


def find_fifth(p: int) -> int:
    """
    This is the FJS Master Algorithm which finds the appropriate fifth in the chain of Pythagorean
    fifths where a given prime `p` should be based on. (e.g., the 7th harmonic w.r.t. C should be
    Bb^7)

    Returns the number of fifths (3/2) to multiply by to get the 3-limit note associated with prime
    `p`.
    """
    k = 0
    while True:
        pyth_interval = 3**k
        distance = reb(p / pyth_interval)
        if 1 / RADIUS_OF_TOLERANCE < distance < RADIUS_OF_TOLERANCE:
            return k

        # set k to the next value in the sequence (0, 1, -1, 2, -2, 3, -3, ...)
        if k == 0:
            k = 1
        elif k > 0:
            k = -k
        else:
            k = -k + 1


def obtain_formal_prime_comma(p: int) -> tuple[int, int]:
    """
    Obtain the formal comma for a given prime `p`.

    Returns (numerator, denominator) of the formal comma.
    """
    fifth_shift = find_fifth(p)
    if fifth_shift >= 0:
        return reb_nd(p, 3**fifth_shift)
    else:
        return reb_nd(p * 3**(-fifth_shift), 1)


def generate_pyth_accidental_code(sharps: int) -> str:
    """
    Generate accidental code for the specified number of sharps. Negative sharps are flat.
    """
    s = ''

    while sharps > 0:
        if sharps >= 2:
            s = 'x.' + s
            sharps -= 2
        elif sharps == 1:
            s = '#.' + s
            sharps -= 1

    while sharps < 0:
        if sharps <= -3:
            s = 'bbb.' + s
            sharps += 3
        elif sharps == -2:
            s = 'bb.' + s
            sharps += 2
        elif sharps == -1:
            s = 'b.' + s
            sharps += 1

    if s.endswith('.'):
        s = s[:-1]

    return s

ODD_LIMIT_LOOKUP = {}
"""
Key: FJS accidental, odd integers that are not multiples of 3

Value: Tuple of (numerator, denominator) of the formal comma for that odd integer.
"""

for n in range(5, ODD_LIMIT + 1, 2):

    # if n is a multiple of 3 we skip, since multiples of 3 are handled by chain of fifths.
    if n % 3 == 0:
        continue
    prime_factors = factorize(n)

    formal_comma = (1, 1)

    for p in prime_factors:
        if p not in ODD_LIMIT_LOOKUP:
            ODD_LIMIT_LOOKUP[p] = obtain_formal_prime_comma(p)
        formal_comma = (formal_comma[0] * ODD_LIMIT_LOOKUP[p][0], formal_comma[1] * ODD_LIMIT_LOOKUP[p][1])

    reduced = reb_nd(*formal_comma)
    red_frac = Fraction(reduced[0], reduced[1])
    reduced = (red_frac.numerator, red_frac.denominator)

    # print(f"DEBUG: {n}: {reduced}, unreduced: {formal_comma}")

    ODD_LIMIT_LOOKUP[n] = reduced

chain_3_str = ''
"""Text for 3-limit primary accidental chain"""

chain_5_str = ''
"""Text for 5-limit primary accidental chain"""

chain_7_str = ''
"""Text for 7-limit primary accidental chain"""

for pow3 in range(RANGE_3[0], RANGE_3[1] + 1):
    if pow3 == 0:
        chain_3_str += f'(2187/2048) ' # Apotome
        continue

    chain_3_str += f"{generate_pyth_accidental_code(pow3)} "

chain_3_str = chain_3_str.strip()

for pow in range(RANGE_5[0], RANGE_5[1] + 1):
    if pow == 0:
        n, d = ODD_LIMIT_LOOKUP[5]
        # we have to take the reciprocal since 5 is 80/81 and /5 is 81/80
        chain_5_str += f'({d}/{n}) '
        continue

    if pow < 0:
        chain_5_str += f"'{5**(-pow)}' "
    else:
        chain_5_str += f"'\\/{5**pow}' " # the slash must be escaped even in a text symbol


chain_5_str = chain_5_str.strip()

for pow in range(RANGE_7[0], RANGE_7[1] + 1):
    if pow == 0:
        n, d = ODD_LIMIT_LOOKUP[7]
        # take reciprocal
        chain_7_str += f'({d}/{n}) '
        continue

    if pow < 0:
        chain_7_str += f"'{7**(-pow)}' "
    else:
        chain_7_str += f"'\\/{7**pow}' "


ligatures = ''
"""Text for ligature declarations"""

for chain_5 in range(RANGE_5[0], RANGE_5[1] + 1):
    for chain_7 in range(RANGE_7[0], RANGE_7[1] + 1):
        if chain_5 == 0 and chain_7 == 0:
            continue

        n, d = (1, 1)

        # remember that upward 5-limit and 7-limit comma pitch direction is utonal
        # so for +ve accidental chain_5, we multiply **denominator** by 5.
        if chain_5 > 0:
            d *= 5 ** chain_5
        elif chain_5 < 0:
            n *= 5 ** (-chain_5)
        if chain_7 > 0:
            d *= 7 ** chain_7
        elif chain_7 < 0:
            n *= 7 ** (-chain_7)
        # NOTE: If we want to add 11-limit in the future, the unique 11 limit comma, 33/32, has +ve
        # orientation so +ve chain_11 should multiply the numerator, not denominator.

        lig_str = ''
        if n == 1:
            lig_str = f'/{d}'
        elif d == 1:
            lig_str = f'{n}'
        else:
            lig_str = f'{n}/{d}'

        ligatures += f"{chain_5:4} {chain_7:4}   '{lig_str}'\n"


secondary = """
'bbb'   bbb     Math.pow(2048/2187,3)
'bb'    bb      Math.pow(2048/2187,2)
'b'     b       2048/2187
'###'   #x      Math.pow(2187/2048,3)
'#x'    #x      Math.pow(2187/2048,3)
'##'    x       Math.pow(2187/2048,2)
'x'     x       Math.pow(2187/2048,2)
'#'     #       2187/2048
"""
"""Secondary accidental declarations"""

for fjs_acc in sorted(ODD_LIMIT_LOOKUP.keys(), reverse=True):
    n, d = ODD_LIMIT_LOOKUP[fjs_acc]
    fjs_acc_str = f"'/{fjs_acc}'"
    secondary += f"{fjs_acc_str:<8} {d:>10}/{n:<10}\n"

for fjs_acc in sorted(ODD_LIMIT_LOOKUP.keys(), reverse=True):
    n, d = ODD_LIMIT_LOOKUP[fjs_acc]
    fjs_acc_str = f"'{fjs_acc}'"
    secondary += f"{fjs_acc_str:<8} {n:>10}/{d:<10}\n"


independent = ''
"""Independent symbol group declarations"""

if USE_INDEPENDENT:
    independent += 'independent()\n'
    independent += 'n #x x # b bb bbb\n'
    independent += "'1'" # '1' is the naturalizing symbol for FJS accidentals
    for num in ODD_LIMIT_LOOKUP.keys():
        independent += f" '{num}' '/{num}'"

TUNING_CONFIG = f"""
// Functional Just System (FJS) {ODD_LIMIT}-odd-limit
//
// Generated by generate_fjs.py

C4: 440 * 16/27
0 9/8 81/64 4/3 3/2 27/16 243/128 2/1
{chain_3_str}
{chain_5_str}
{chain_7_str}

aux(0)
aux(1)
aux(2)
aux(3)

displaycents(absolute, 3, below)

// Ligatures do not apply to pythagorean accidentals, only FJS accidentals.
lig(2,3)!
{ligatures}

sec()
{secondary}

{independent}
"""

if __name__ == "__main__":
    print(TUNING_CONFIG)
