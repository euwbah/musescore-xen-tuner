"""
Generates EDOs for sagittal tunings.

Methodology:

We start with the Evolutionary (Evo) symbols first.

The Pyth accidentals (sharps and flats) are in the first accidental chain, and Sagittal edostep
shifts are in the second accidental chain.

The Revo symbols are ligatures of the Evo symbols. These are important ligatures that prevent
non-ligatured accidentals from being used, so that only Revo symbols can be obtained from pitch
up/down or enharmonic cycling operations.
"""

import math
import json

# ============ LOOKUP TABLES ======================

"""
The "|" upward shaft can be substituted in place to:

- "!" downward shaft (negative direction)
- "|||" triple upward shaft (+1 apotome)
- "!!!" triple downward shaft (negative and -1 apotome)

The "||" double upward shaft comes are the apotome and apotome complements, and can be substituted
in place for:

- "!!" double downward shaft (negative direction)
- "X" upward X-shaft (+2 apotome)
- "Y" double downward X-shaft (Y-shaft) (negative and -2 apotome)

In REVO mode, the apotome and double apotome symbols & complements are used instead of sharps and
flats.

The `COMPLEMENTS` table contains the apotome complements for each symbol, e.g.

The complement of ")|" is "(||~", which means that

")!#" is the Evo variant of "(||~"

I am referring to https://sagittal.org/sagittal.pdf
"""

COMPLEMENTS = {
    "n": "/||\\",
    ")|": "(||~",
    "|(": "/||)",
    "~|": ")//||",
    ")|(": "//||",
    ")~|": "~||\\",
    "~|(": "(||(",
    "|~": "/||~",
    "~~|": "~||)",
    ")|~": "(||",
    "/|": "||\\",
    ")/|": ")||)",
    "|)": "||)",
    ")|)": ")/||",
    "|\\": "/||",
    "(|": ")||~",
    "~|)": "~~||",
    "/|~": "||~",
    "(|(": "~||(",
    "~|\\": ")~||",
    "//|": ")||(",
    ")//|": ")|\\\\",  # from here on, both are single-shaft
    "/|)": "(|\\",
    "(|~": "|\\\\",
    "/|\\": "(|)",
    "(/|": "|\\)",
    ")/|\\": ")/|\\",  # complement is itself
}
"""
Apotome complements of upward single-shaft Sagittal symbols.

Reverse-lookup is added automatically by the loop below, don't manually enter the reverse mapping.
"""

for k, v in COMPLEMENTS.copy().items():
    COMPLEMENTS[v] = k  # add the reverse mapping

PROMETHEAN = {
    ")|": 1.194465453,
    "|(": 4.567073791,
    "~|": 6.534428655,
    ")|(": 9.063884908,
    ")~|": 11.03123977,
    "~|(": 13.42017068,
    "|~": 15.38752554,
    "~~|": 17.35488041,
    ")|~": 18.76013388,
    "/|": 20.3059127,
    ")/|": 22.69484361,
    "|)": 26.06745195,
    ")|)": 28.5969082,
    "|\\": 30.9858391,
    "(|": 32.39109258,
    "~|)": 34.35844744,
    "/|~": 37.30947974,
    "(|(": 38.06194035,
    "~|\\": 39.69841064,
    "//|": 41.66576551,
    ")//|": 44.6167978,
    "/|)": 47.5678301,
    "(|~": 49.53518496,
    "/|\\": 51.92411587,
    "(/|": 53.89147073,
    ")/|\\": 55.8588256,  # this is the symbol whose complement is itself
    # beyond this point, both original and complements and single-shaft
    "|\\)": 57.82618046,  # 1200*log2(apotome)/2 = 56.8425...
    "(|)": 59.79353532,
    "|\\\\": 61.76089019,
    "(|\\": 64.14982109,
    ")|\\\\": 66.11717596,
}
"""
Promethean capture zones as per George Secor's Sagittal-JI.xls spreadsheet.

NOTE: The keys are raw Sagittal ASCII and not yet escaped for use in Tuning Configs.

See: https://forum.sagittal.org/viewtopic.php?t=86

My backup:
https://1drv.ms/x/c/925e8233dc0bb988/Eb7HCKrJHQNDtjVgH8LS8VsBOzzhE9BWcJ9rfCle7xsVzw?e=BiREnp

The cent values are lower bounds.
"""

ATHENIAN = {
    "|(": 2.740244275,
    ")|(": 8.080207476,
    "~|(": 13.42017068,
    "/|": 18.76013388,
    "|)": 24.66219847,
    "(|": 30.00216167,
    "(|(": 35.11809146,
    "//|": 40.26051203,
    "/|)": 45.60047524,
    "/|\\": 51.21954025,
    "(|)": 56.84250303,
    "(|\\": 62.46546581,
}
"""
Athenian capture zones as per George Secor's Sagittal-JI.xls spreadsheet.

NOTE: The keys are raw Sagittal ASCII and not yet escaped for use in Tuning Configs.

See: https://forum.sagittal.org/viewtopic.php?t=86

My backup:
https://1drv.ms/x/c/925e8233dc0bb988/Eb7HCKrJHQNDtjVgH8LS8VsBOzzhE9BWcJ9rfCle7xsVzw?e=BiREnp

The cent values are lower bounds.
"""

UPPER_BOUND = 68.08453082
"""
Cents value of the upper bound of the capture zone of the last sagittal symbol in any accuracy level
tuning.
"""

PROMETHEAN_CHAR_WHITELIST = set([
    '(',
    ')',
    '~',
    '|',
    '\\',
    '/',
    '!',
    'X',
    'Y',
])
"""
Only generate edos that use these symbols. The other symbols (e.g., . `) for 5s and other
Olympian/Herculean symbols are not supported in the plugin.
"""

def escape_symbol_code(symbol_code: str) -> str:
    return symbol_code.replace("\\", "\\\\").replace("'", "\\'").replace("//", "\\/\\/")


def flip(sagittal: str) -> str:
    """
    Flips a sagittal symbol to the negated version.
    """

    FLIP_LOOKUP = {
        "/": "\\",
        "\\": "/",
        "|": "!",
        "!": "|",
        "X": "Y",
        "Y": "X",
    }

    # for downward shaft, the hook direction is also flipped
    flipped = ""
    for c in sagittal:
        if c in FLIP_LOOKUP:
            flipped += FLIP_LOOKUP[c]
        else:
            flipped += c

    return flipped



class ShaftExceededException(Exception):
    """
    Exception raised when the number of shafts exceeds the maximum allowed (4) for a sagittal
    symbol.

    This usually happens when taking the complement of a double sharp/flat symbol.

    In this case, do not create the ligature for this symbol.
    """

    def __init__(self, message: str = ""):
        super().__init__(message)
        self.message = message

    def __str__(self):
        return f"ShaftExceededException: {self.message}"

def add_shafts(sagittal: str, shafts: int) -> str:
    """
    Adds/subtracts the given number of shafts to the sagittal symbol.

    NOTE: In most cases, it only makes sense to add/subtract 2 shafts at a time (representing an
    apotome). The only time the number of shafts changes by 1 is when apotome complements are used.

    ## Parameters:

    - sagittal: The sagittal symbol to modify.
    - shafts: The number of shafts to add (positive) or subtract (negative). NOTE: you cannot
      subtract shafts below 1. To flip the direction of the symbol, use the `flip` function.

    ## Raises:

    - ShaftExceededException: If the number of shafts exceeds 4, or goes below 1.
    """
    if shafts == 0:
        # no change, just return the original symbol
        return sagittal

    upward_sagittal = sagittal
    is_downward = False

    if "!" in sagittal or "Y" in sagittal:
        # downward shaft or Y-shaft, so we need to flip it first
        upward_sagittal = flip(sagittal)
        is_downward = True

    # There's so few cases, we can just brute force them.

    if "X" in upward_sagittal:
        if shafts < -3:
            raise ShaftExceededException(f"Detected 4 shafts, cannot subtract {shafts} shafts from {sagittal}.")
        if shafts > 0:
            raise ShaftExceededException(f"Detected 4 shafts, cannot add {shafts} shafts to {sagittal}.")
        match shafts:
            case -3:
                upward_sagittal = upward_sagittal.replace("X", "|")
            case -2:
                upward_sagittal = upward_sagittal.replace("X", "||")
            case -1:
                upward_sagittal = upward_sagittal.replace("X", "|||")
    elif "|||" in upward_sagittal:
        if shafts < -2:
            raise ShaftExceededException(f"Detected 3 shafts, cannot subtract {shafts} shafts from {sagittal}.")
        if shafts > 1:
            raise ShaftExceededException(f"Detected 3 shafts, cannot add {shafts} shafts to {sagittal}.")
        match shafts:
            case -2:
                upward_sagittal = upward_sagittal.replace("|||", "|")
            case -1:
                upward_sagittal = upward_sagittal.replace("|||", "||")
            case 1:
                upward_sagittal = upward_sagittal.replace("|||", "X")
    elif "||" in upward_sagittal:
        if shafts < -1:
            raise ShaftExceededException(f"Detected 2 shafts, cannot subtract {shafts} shafts from {sagittal}.")
        if shafts > 2:
            raise ShaftExceededException(f"Detected 2 shafts, cannot add {shafts} shafts to {sagittal}.")
        match shafts:
            case -1:
                upward_sagittal = upward_sagittal.replace("||", "|")
            case 1:
                upward_sagittal = upward_sagittal.replace("||", "|||")
            case 2:
                upward_sagittal = upward_sagittal.replace("||", "X")
    elif "|" in upward_sagittal:
        if shafts < 0:
            raise ShaftExceededException(f"Detected 1 shaft, cannot subtract {shafts} shafts from {sagittal}.")
        if shafts > 3:
            raise ShaftExceededException(f"Detected 1 shaft, cannot add {shafts} shafts to {sagittal}.")
        match shafts:
            case 1:
                upward_sagittal = upward_sagittal.replace("|", "||")
            case 2:
                upward_sagittal = upward_sagittal.replace("|", "|||")
            case 3:
                upward_sagittal = upward_sagittal.replace("|", "X")

    if is_downward:
        return flip(upward_sagittal)

    return upward_sagittal


def make_revo(apotomes: int, edosteps: int, step_symbols: list[str], apotome_size: int) -> str:
    """
    Generates the revo Sagittal ASCII config based on the number of apotomes and edosteps.

    Method:

    - Early return for 0 `edosteps` (just return Revo pyth equivalent)
    - Start by searching for the appropriate single upward shaft symbol (assume `apotomes == 0`)
    - Early return for 0 `apotomes` (just return the single shaft upward/downward symbol)
    - Now both `edosteps` and `apotomes` are nonzero.
    - Record final accidental symbol direction. It's upward when apotomes > 0, downward when
      apotomes < 0.
    - Assume for now that accidental symbol direction is upward.
    - If `edosteps` is opposite sign of `apotomes`, we take the apotome complement symbol of that
      many `edosteps` (now there will either be 2 or 4 shafts)
        - Otherwise, use the single shaft upward symbol.
    - For each **extra** apotome, add 2 shafts. If shaft exceeds 4, raise `ShaftExceededException`.
        - When apotome complement is taken (e.g., apotome = 2, edosteps = -1), there is only one
          **extra** apotome --- the complement already accounts for the first apotome.
        - We cannot create a ligature for apotomes = 2 and edosteps >= 1, or likewise, for apotomes
          = -2 and edosteps <= -1.
    - Finally, if apotomes < 0, flip the symbol.

    ## Parameters

    - apotomes: number of apotomes on the accidental
    - edosteps: number of edosteps on the accidental (must not be more than `2 * len(step_symbols)`)
    - step_symbols: list of upward single-shaft step symbols to use for the accidental, sorted in
      increasing edosteps.
    - apotome_size: size of the apotome in edosteps.

    NOTE: By convention, `len(step_symbols) == max(abs(apotome_size), abs(limma_size)) // 2`

    For rose edos (`apotome_size == 0`), apotomes should be always 0.
    """

    abs_apotome = abs(apotomes)
    abs_edosteps = abs(edosteps)

    if abs_edosteps > len(step_symbols):
        raise ValueError(
            f"Only {len(step_symbols)} step symbols provided, but requested {edosteps} edosteps.\n" +
            "Use an apotome complement instead."
        )

    if abs_apotome > 2:
        raise ValueError(f"Apotome {apotomes} out of range. Only -2 to 2 are supported.")

    if edosteps == 0:
        # early return if no edostep offset, simply return the Revo equivalent of the pyth
        # accidental
        return ["\\Y/", "\\!!/", "", "/||\\", "/X\\"][apotomes + 2]

    assert apotome_size > 0 or apotomes == 0, "For rose (sharp-0) edos, apotomes must be 0."


    single_shaft_upward = step_symbols[abs_edosteps - 1] # default upward single shaft symbol
    """
    Contains the upward single-shaft symbol for 0 apotomes and the given `edosteps`.
    """

    if abs_apotome == 0:
        # Early return for 0 apotome, only 1 shaft needed.
        if edosteps > 0:
            return single_shaft_upward
        else:
            return flip(single_shaft_upward)

    use_complement = apotomes * edosteps < 0
    """
    If edostep offset doesn't match apotome direction, we need to take the apotome complement
    (either 2 or 4 shafts)
    """
    should_flip = apotomes < 0
    """True if should flip before returning"""

    upward_symbol = ""

    # NOTE: The "add shaft" abstraction below is extraneous for now... however in the future when
    #       sagittals have more than 4 shafts, this would come in handy.
    if use_complement:
        # either 2 or 4 shafts (either 1 or 2 apotomes up/down and opposing direction edostep offset)
        upward_symbol = add_shafts(
            COMPLEMENTS[single_shaft_upward], (abs_apotome - 1) * 2
        )
    else:
        # only 3 shafts (one apotome up/down and matching direction edostep offset)
        upward_symbol = add_shafts(single_shaft_upward, abs_apotome * 2)

    if should_flip:
        return flip(upward_symbol)
    else:
        return upward_symbol



def generate_tuning_config(
    edo: int, n_th_best_fifth: int, revo: bool, step_symbols: list[str]
) -> str:
    """
    Generates a tuning configuration for a given EDO and the nth best fifth.

    ## Parameters:

    - edo (int): The number of equal divisions of the octave.
    - n_th_best_fifth (int): The nth best fifth approximation. 1 = best fifth, 2 = second best, etc.
    - revo (bool): `True` to use Revo, otherwise use Evo (mixed sharps/flats instead of complements)
    - step_symbols (list[str]): The sagittal symbols as ASCII sorted in increasing edosteps. Only
      single-shaft upward symbols need to be provided. If empty list, all notes of the edo should be
      reachable using only sharps and flats.

    ## Returns:

    A tuning configuration string
    """

    edo_name = str(edo) + 'b' * (n_th_best_fifth - 1)

    print(
        '\n---------------------------\n' +
        f'Generating tuning config for {edo_name} edo. {"Revo" if revo else "Evo"} variant.'
    )
    print(f"     symbols: {' '.join(step_symbols)}")

    fifth_edosteps = edo * math.log2(3 / 2)
    if fifth_edosteps % 1 < 0.5:
        # best fifth is rounded down, after that, the sequence from 2nd best fifth onwards is +1, -1, +2, -2, +3, -3, ...
        fifth_edosteps = round(
            fifth_edosteps + (n_th_best_fifth // 2) * (((n_th_best_fifth - 1) % 2) * 2 - 1)
        )
    else:
        # best fifth is rounded up, after that, the sequence from 2nd best fifth onwards is -1, +1, -2, +2, -3, +3, ...
        fifth_edosteps = round(
            fifth_edosteps + (n_th_best_fifth // 2) * ((n_th_best_fifth % 2) * 2 - 1)
        )

    print(f"Using fifth stepsize: {fifth_edosteps}\\{edo}")

    APOTOME = 7 * fifth_edosteps - edo * 4
    LIMMA = edo * 3 - 5 * fifth_edosteps

    is_rose = APOTOME <= 0
    """
    Rose edos (very flat fifths) have zero/negative apotome.

    For these, the first accidental chain should contain no Pyth symbols

    (It's ok to leave the first empty chain as a placeholder, so that we don't have to completely
    reimplement everything below)
    """

    is_gold = LIMMA <= 0
    """
    Gold edos have the property that F <= E (and C <= B). The Sagittal specification says to skip
    nominals B and F and only use pentatonic C D E G A.

    TODO: As of yet, Xen Tuner doesn't have an explicit way to skip nominals...
    """

    print(f"Apotome: {APOTOME}\\{edo}, Limma: {LIMMA}\\{edo}")

    assert 5 * APOTOME + 7 * LIMMA == edo, "5 apotomes and 7 limmas do not sum up to 1 octave!"

    # Tune to A4: 440 by default, Aeolian mode.

    # in edosteps
    nominals = [
        0,                        # A
        APOTOME + LIMMA,          # B
        APOTOME + 2 * LIMMA,      # C
        2 * APOTOME + 3 * LIMMA,  # D
        3 * APOTOME + 4 * LIMMA,  # E
        3 * APOTOME + 5 * LIMMA,  # F
        4 * APOTOME + 6 * LIMMA,  # G
        edo,                      # equave
    ]

    # TODO: This doesn't work. Implement a way to skip nominals in Xen Tuner first.
    # if is_gold:
    #     # try to skip B and F setting them to -999 edosteps.
    #     nominals[1] = -999
    #     nominals[5] = -999

    secondary_symbols: list[tuple[str, str, float]] = []
    """
    List of used symbols and their cent values to be registered as secondary symbols for ASCII
    fingering entry.

    Tuple is (**Unescaped** Sagittal ASCII, Escaped Sagittal, cents)

    NOTE:
    - Secondary symbols should be sorted longest **unescaped** text representation to shortest so
      that text is parsed with correct precedence.
    - Text representation should be escaped before using in Tuning Config.
    """

    NOMINAL_STR = " ".join(f"1200*{nominals[i]}/{edo}c" for i in range(len(nominals)))
    print(f"Nominals: {NOMINAL_STR}")

    # First accidental chain is always standard, Revo is implemented using ligatures. Only double
    # flat to double sharp.

    ACC1_STR = f"bb b (1200*{APOTOME}/{edo}c) # x"

    if is_rose:
        # Rose edos have no Pyth accidentals, so we skip the first accidental chain.
        ACC1_STR = "(0c)                    // Rose edos have no Pyth accidentals"

    secondary_symbols += [
        ("bb", "bb", -2 * APOTOME / edo * 1200),
        ("b", "b", - APOTOME / edo * 1200),
        ("#", "#", APOTOME / edo * 1200),
        ("x", "x", 2 * APOTOME / edo * 1200),
    ]

    # Second accidental chain should contain as many symbols as the max number of edosteps in either
    # apotome or limma in both directions.

    acc2_edosteps = len(step_symbols)

    if acc2_edosteps == 0:
        ACC2_STR = ""
    else:
        acc2_words = []
        for i in range(-acc2_edosteps, acc2_edosteps + 1):
            if i == 0:
                acc2_words.append(f"(1200*1/{edo}c)")
                continue
            elif i < 0:
                sagittal = flip(step_symbols[-i-1])
            else:
                sagittal = step_symbols[i-1]

            escaped_sagittal = escape_symbol_code(sagittal)
            acc2_words.append(escaped_sagittal)
            secondary_symbols.append(
                (sagittal, escaped_sagittal, i * 1200 / edo)
            )

        ACC2_STR = " ".join(acc2_words)

    # For Revo we need ligatures.

    LIG = ""
    """
    Tuning config string for Revo ligature declarations.

    Also includes the header text `lig(1,2)!` if `revo` is `True`.
    """

    if revo:
        LIG += "// Ligatures for Revo variant\n"
        LIG += "lig(1,2)!\n"

        apotome_range = [0] if is_rose else range(-2, 3)

        for apotome in apotome_range:
            for edostep in range(-acc2_edosteps, acc2_edosteps + 1):
                if apotome == 0 and edostep == 0:
                    # no need for symbols
                    #
                    # TODO: Check if the new independent naturalizing symbols feature
                    # affects the need to specify "natural" as an important ligature.
                    continue

                if (apotome == 2 and edostep >= 1) or (apotome == -2 and edostep <= -1):
                    # No valid ligature/symbol for accidentals above/below double sharp/flat
                    # /X\ and \Y/ are the limits of Promethean Sagittal.
                    continue

                revo_symbol = make_revo(
                    apotome, edostep, step_symbols, APOTOME
                )

                assert revo_symbol != "", "Revo symbol cannot be empty."

                revo_symbol_escaped = escape_symbol_code(revo_symbol)

                LIG += f"{apotome:<4} {edostep:<4} {revo_symbol_escaped:<10}\n"

                secondary_symbols.append(
                    (revo_symbol, revo_symbol_escaped, (apotome * APOTOME + edostep) * 1200 / edo)
                )

    # Add secondary symbols

    SEC = ""
    """
    For `sec()` declaration.
    """

    secondary_symbols.sort(key=lambda x: len(x[0]), reverse=True)

    for (sagittal, escaped_sagittal, cents) in secondary_symbols:
        SEC += f"{'\'' + escaped_sagittal + '\'':<13} {escaped_sagittal:<13} {cents:<.10f}c\n" # EPSILON > 5e-9

    tuning_config = f"""
// Sagittal notation for {edo_name} EDO ({"Revo" if revo else "Evo"} variant)
//
// Generated by tunings/sagittal/generate_edo.py, based on the EDO definitions in
// tunings/sagittal/edo_definitions.json taken from
// https://github.com/Sagittal/sagittal-system/blob/main/src/notations/edo/definitions.ts
//
// Apotome: {APOTOME:4} steps
// Limma:   {LIMMA:4} steps
// Fifth:   {fifth_edosteps:4} steps

A4: 440
{NOMINAL_STR}
{ACC1_STR}
{ACC2_STR}

displaycents(nominal, 3, below)
displaysteps({edo}, above)

aux(0) // Alt + Up/Down for nominals
aux(1) // Ctrl + Alt + Up/Down for Pyth sharps/flats
aux(2) // Ctrl + Shift + Up/Down for edosteps

{LIG}

sec()
{SEC}
""".strip()


    return tuning_config


def main():
    with open("tunings/sagittal/edo_definitions.json", "r") as f:
        edo_definitions = json.load(f)
        for edo_notation_name, edo_notation_definition in edo_definitions.items():
            superset_edo_name = edo_notation_definition.get("supersetEdoNotationName")
            if superset_edo_name is not None:
                # If not provided, this edo is a subset edo, don't autogenerate it.
                #
                # if stepDefinitions is an empty list, it means that pyth accidentals are sufficient.
                print(f"Skipping {edo_notation_name} as it is a subset edo of {superset_edo_name}")
                continue
            edo_str: str = edo_notation_name
            nth_best_fifth = 1
            while edo_str.endswith("b"):
                nth_best_fifth += 1
                edo_str = edo_str[:-1]
            edo = int(edo_str)

            step_definition: list[dict] = edo_notation_definition.get("stepDefinitions")

            if step_definition is None:
                raise ValueError(
                    f"Step definitions for {edo_notation_name} are not provided in the edo_definitions.json file."
                )

            step_symbols: list[str] = []

            for step_def in step_definition:
                sagitype = step_def.get("sagitype")

                if sagitype is None:
                    raise ValueError(
                        f"Sagittal ASCII for step definition {step_def} in {edo_notation_name} is not provided in the edo_definitions.json file."
                    )

                step_symbols.append(sagitype)

            # Check that step symbols are supported by Promethean Sagittal (e.g., 581 edo uses
            # accent symbols not available in MuseScore)

            if not all(c in PROMETHEAN_CHAR_WHITELIST for c in "".join(step_symbols)):
                print(
                    f"Skipping {edo_notation_name} edo as it contains Sagittal symbols outside of Promethean: {step_symbols}"
                )
                continue


            revo_tuning_config = generate_tuning_config(edo, nth_best_fifth, True, step_symbols)
            evo_tuning_config = generate_tuning_config(edo, nth_best_fifth, False, step_symbols)

            with open(f"tunings/sagittal/{edo_notation_name}edo revo.txt", "w") as revo_file:
                print(f"Writing sagittal/{edo_notation_name}edo revo.txt...")
                revo_file.write(revo_tuning_config)

            with open(f"tunings/sagittal/{edo_notation_name}edo.txt", "w") as evo_file:
                # Evo variant is default without "revo" in the filename
                print(f"Writing sagittal/{edo_notation_name}edo.txt...")
                evo_file.write(evo_tuning_config)

if __name__ == "__main__":
    main()