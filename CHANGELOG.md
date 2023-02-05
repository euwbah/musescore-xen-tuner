# Changelog

## 0.2.1

- Add important ligatures (for better enharmonic cycling)
- Make secondary lig/aux/sec declaration parsing cleaner & order-independent
- Fix `accidentalsHash` mutating original `SymbolCode[]` array
- Fix 0-cent accidental chain stepsize breaking tuning config parsing.
- Improved chooseNextNote algorithm to use prior acc context & apply different ligature priority levels.
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
