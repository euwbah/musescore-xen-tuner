# HEJI tuning configs

Contains JI notation systems that uses: [extended Helmholtz-Ellis just intonation notation (2020 edition)](https://marsbat.space/pdfs/HEJI2_legend+series.pdf)

## Text representation reference

For [entering accidentals using fingering text](../../README.md#entering-accidentals-directly-using-fingerings)

Symbols can be repeated to stack multiple accidentals.

| Text repr             | Symbol                        |
| --------------------- | ----------------------------- |
| `~b^`/`b^~`           | Flat up schisma enharmonic    |
| `~#v`/`#v~`           | Sharp down schisma enharmonic |
| `b`/`bb`/...          | n-flats                       |
| `#`/`x`/`##`/`#x`/... | n-sharps                      |
| `^`/`v`               | 81/80 comma up/down           |
| `/7`/`\7`             | 64/63 comma up/down           |
| `/11`/`\11`/`t`/`d`   | 33/32 11-quartertone up/down  |
| `/13` / `\13`         | 27/26 up/down                 |
| `/17` / `\17`         | 2187/2176                     |
| `/19`/`\19`           | 513/512                       |
| `/23`/`\23`           | 736/729                       |
| `/29`/`\29`           | 261/256                       |
| `/31`/`\31`           | 32/31                         |
| `/39`/`\39`           | 37/36                         |
| `/41`/`\41`           | 82/81                         |

Sadly, the newer higher limit accidentals are not available as SMuFL symbols in MuseScore yet. However, you can use [fingering annotations](../../README.md#3-use-fingering-text-ratioscent-offsets) to denote JI ratios/cent offsets on individual notes (though theese symbols don't carry-over unlike accidentals).