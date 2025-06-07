# Changelog

## 0.4.0

- #13: Support `independent()` declarations for independently acting accidental symbols.
  - Each independent symbol group will persist until end of bar, and other symbols in other groups will not affect accidental state for those symbols in the group.
  - Declaring symbol groups will re-configure left-to-right order of symbols in the group. Originally, the accidental chains determine order, first accidental chain is on the right, closest to the notehead, and secondary accidentals are on the left of the last declared accidental chain. However, when symbol groups are declared, the first declared symbol group will be on the right, and the last declared symbol group will be on the left, regardless of accidental chain order. Symbols not declared as part of any symbol group will be assumed to be in the first symbol group, placing them on the right. Within a single symbol group, the symbols will follow order according to order of declaration of accidental chains.

- Fix fingering formatting issue when two noteheads on adjacent staff lines in the same chord or when multiple voices are present.
  - The default fingering text uses "Fingering" Style (`subStyle`) which in MuseScore 3.6.2 is assigned to the enum constant 33 (**but this changes depending on MuseScore version, so it has to be kept updated especially when porting to MS4**).
  - However, this subStyle uses chord stem as X position anchor instead of notehead, and has special vertical alignment rules when multiple voices are present.
  - To attach the fingering text directly to the notehead with no extra formatting rules, we change `subStyle = 45` which is the "User-1" style in MS 3.6.2 (**also needs to be kept updated**)

- Space-separated data in the tuning config can now have arbitrarily many spaces/tabs between each entry to allow better readability (e.g., aligning vertical columns in tabular format).

- Added support for Functional Just System (thanks to @Aumuse for the inspiration & initial implementation)

- Added `Shift + J` shortcut for enharmonic cycling in reverse (opposite order of `J` cycling)

## 0.3.6

- Fix not able to enter natural accidental as a fingering.

## 0.3.5

- Fix floating point errors/small inaccuracies causing enharmonics of the reference pitch to be mapped one equave higher (because the cents are just shy of the equave). The added `EPSILON` user config variable controls the condition `equave - cents < EPSILON`, which when true, sets `cents = 0` and corrects the equave.

## 0.3.4

- Added [generate-edo-updown.py](tunings/updown/generate-edo-updown.py) script to automatically generate tuning configs for EDOs/EDs with ups & downs notation (Kite) with fully configurable parameters.

## 0.3.3

- Change logging method (got debug logging to work for MS4)
- Fix key signatures:
  - `0` for natural breaks key signatures
  - Unnecessary natural accidentals are incorrectly registered as not necessary if key signature is specified.
- Fix symbols not auto-positioned if accidentals are created/modified by notes in other bars due to forward/backward ties in `explicit()` accidental mode.
- Add [userspace tunings folder](/tunings/user)

## 0.3.2

- Huge performance improvements for tuning & up/down/enharmonic cycle for large scores
  - Use `Cursor.rewindToTick()` introduced in MS3.5 instead of old method which was very slow.
  - Improve `getBarBoundaries()` from O(n) to O(log n).
  - Reduce unnecessary repeated calls to `getBarBoundaries()`, and `removeUnnecessaryAccidentals`
- Added reference tuning change to change reference nominal without changing the tuning (e.g. `D4:`).

## 0.3.1

- Added Display Cents and Display Steps plugins to create fingerings to display cent offsets and edo/neji steps of notes in the score.
- Fix enharmonics incorrect due to floating point errors causing two enharmonically equivalent notes to wrap around the equave.

## 0.3.0

- Implement `override()` declaration to support NEJIs, Johnston, etc...
- Fix: accidentals added via fingerings affecting subsequent notes.

## 0.2.3

- Reference tuning changes no longer change the nominals mode my default. Added `!<midinote>: <freq>` syntax to change mode of the nominals.
- Fixed nominals not showing up in enharmonic cycle when no important ligatures are in the enharmonic group.
- Fix 'j' cannot be entered into tempo and expression and fingerings.

## 0.2.2

- Improve `chooseNextNote` again. Tested & guaranteed consistency of behavior across HEWM JI, HEWM 72edo, HEJI, ups & downs 22edo & 12edo.
- Default fingering text-based accidentals to bold fontStyle. Added `nobold()` option in tuning config to use non-bold fontStyle.
- Added `explicit()` option in tuning config for atonal music / no accidental carry over
- Fix broken ligatures
- Fix ties not working
- Fix multiple ligature matches on one accidental not working
- Fix accidentals entered using fingerings not using optimum ligatured spelling.

## 0.2.1

- Add important ligatures (for better enharmonic cycling)
- Make secondary lig/aux/sec declaration parsing cleaner & order-independent
- Fix `accidentalsHash` mutating original `SymbolCode[]` array
- Fix 0-cent accidental chain stepsize breaking tuning config parsing.
- Improved chooseNextNote algorithm to use prior acc context & apply different ligature priority levels + log reason why note was chosen.
- Better XenNote not found error log messages explaining how the parsing was attempted and how it failed.

## 0.2.0

- Text accidentals (fingerings)
- Weak ligatures
- Secondary accidentals that extend accidental chains indefinitely.
- Entering accidentals using fingerings & text representation of accidentals
- Proper HEJI (2020) & HEWM support

## 0.1.2

- Add support for multiple differently-tuned notes on the same staff line within the same chord & voice.

## 0.1.1

- Implement transpose & enharmonic function
- Renamed project to 'Xen Tuner'
- Run plugin as docked window, add tuning cache for better performance

## 0.1.0

- Initial commit & project design
- Support tune function
