# Changelog

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
