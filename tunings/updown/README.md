# Ups and Downs notation

Contains tuning configs based on [Ups and Downs notation (Kite Giedraitis)](https://en.xen.wiki/w/Ups_and_downs_notation).

In summary, this notation method uses the best available fifth interval of the EDO to map to all Pythagorean fifth spellings
(i.e. C-G is the same interval as Bb-F and B-F#), and uses up/down arrows to fill in the rest.

- [22edo.txt](22edo.txt) was written manually
- [31edo.txt](31edo.txt) was generated with [`generate-edo-updown.py`](./generate-edo-updown.py)

-----

🟢 **HIGHLY RECOMMENDED: Use the provided [`generate-edo-updown.py`](./generate-edo-updown.py) python script to generate tuning configs for new/custom EDOs.**

This script allows configuring:
- whether to use the second-best, third-best, etc. fifth interval, so tunings configs like 18b edo (see [wart notation](https://en.xen.wiki/w/Val#Shorthand_notation)) can be generated.
- how large the generated chain of fifths is. (E.g. it's possible to generate only 7 nominals without any pythagorean accidentals and fill in the missing spaces with up and down arrows)
- octave stretching/other equave sizes like 13ed3 (will be notated as 13 edo)
- and more...

> Note: When declaring textual representations/secondary accidentals for ligatured notations, it suffices to declare text representations for each accidental chain separately. It's not necessary to have a text representation for every single combination of pythagorean accidental and arrows. See [22edo.txt](./22edo.txt)'s `sec()` declaration` for example.
> 
> Best to leave this up to the [python script](./generate-edo-updown.py).