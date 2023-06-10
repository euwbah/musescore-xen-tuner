import math

PRIME_LIMIT = 61 # The highest prime used in the TUNING_CONFIG text below
EDO = 41
OUT_FILE_NAME = f"{EDO}edo.txt"

list_of_primes = []

for i in range(2, PRIME_LIMIT + 1):
    is_prime = True
    for j in list_of_primes:
        if i % j == 0:
            is_prime = False
            break
    
    if is_prime:
        list_of_primes.append(i)
        

def prime_factors(n):
    assert n > 0
    
    factors = []
    for p in list_of_primes:
        while n % p == 0:
            n /= p
            factors.append(p)
        
        if n == 1:
            break
    return factors


mapping = {} # contains cents of each prime

for p in list_of_primes:
    # MODIFY THIS
    # adjust this to produce required interval of each prime
    # this example calculates prime mappings for the patent val of
    # 311 edo.
    mapping[p] = round(math.log2(p) * EDO) / EDO * 1200

def t(num, den):
    """
    Retrieve tempered interval from mapped ratio in cents.
    Outputs cents as a decimal.
    """
    cents = 0
    for p in prime_factors(num):
        cents += mapping[p]
    
    for p in prime_factors(den):
        cents -= mapping[p]
    
    return cents


TUNING_CONFIG = f"""
// {EDO}edo notated as tempered HEWM using text-based accidentals
// Main accidental chains consist of:
// 3 standard sharps/flats
// 3 syntonic commas up/down notated as + -
// 2 septimal commas up/down notated as > <
//
// Higher limit accidentals are entered using secondary accidentals
// and are represented as various HEWM text-based accidentals

C4: 440 * {2 ** (t(16,27)/1200)}
0 {t(9,8)}c {t(81,64)}c {t(4,3)}c {t(3,2)}c {t(27,16)}c {t(243,128)}c 2/1
bbb bb b ({t(2187,2048)}c) # x #x
'-'.'-'.'-' '-'.'-' '-' ({t(81,80)}c) '+' '+'.'+' '+'.'+'.'+'
'<'.'<' '<' ({t(64,63)}c) '>' '>'.'>'

displaysteps({EDO}, below)

aux(0)
aux(1)
aux(2)
aux(3)

sec()
// 3 limit
'bbb' bbb 3*{t(2048,2187)}c
'bb' bb 2*{t(2048,2187)}c
'b' b {t(2048,2187)}c
'###' #x 3*{t(2187,2048)}c
'#x' #x 3*{t(2187,2048)}c
'##' x 2*{t(2187,2048)}c
'x' x 2*{t(2187,2048)}c
'#' # {t(2187,2048)}c

// 5 & 7 limit
'+' {t(81,80)}c
'-' {t(80,81)}c
'<' {t(63,64)}c
'>' {t(64,63)}c

'^' {t(33,32)}c // 11
'v' {t(32,33)}c
'}}' {t(27,26)}c // 13
'{{' {t(26,27)}c
'/' {t(18,17)}c // 17
'\\\\' {t(17,18)}c
')' {t(19,18)}c // 19
'(' {t(18,19)}c
']' {t(24,23)}c // 23
'[' {t(23,24)}c
'!' {t(261,256)}c // 29
';' {t(256,261)}c
'"' {t(32,31)}c // 31
'?' {t(31,32)}c
'%' {t(37,36)}c // 37
'&' {t(36,37)}c
'$' {t(82,81)}c // 41
'@' {t(81,82)}c
'\\'' {t(129,128)}c // 43
',' {t(128,129)}c
'*' {t(48,47)}c // 47
':' {t(47,48)}c
'|' {t(54,53)}c // 53
'.' {t(53,54)}c
'z' {t(243,236)}c // 59
's' {t(236,243)}c
'k' {t(244,243)}c // 61
'y' {t(243,244)}c
""".strip()

with open(OUT_FILE_NAME, 'w') as f:
    f.write(TUNING_CONFIG)