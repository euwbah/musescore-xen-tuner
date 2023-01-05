# Microtonal/Xenharmonic MuseScore plugin suite

**Work in progress.**

A rewrite of the n-edo plugin.

## HELP NEEDED

See [this post](https://www.facebook.com/groups/497105067092502/permalink/2700729770063343/)

## Goals:

- [ ] The user should not need to manually retune cents offset of notes. Support for many tuning systems as possible while allowing maximum flexibility of choice of accidentals.

- [ ] The user should not need to open up the symbols palette and manually search for the accidental the user needs. Every unique accidental and note in the equave should be accessible with just up/down arrows and 'J' to cycle through enharmonics.

- [ ] Proper transposition by any interval of choice for all regular mappings.

## Target features

- Multiple accidentals (using symbols attached to a note)
- any number of nominals + custom nominal tuning
- equave stretching (1 equave = 1 cycle of nominals)
- custom accidental tuning
- declare a finite number of accidental permutations
- rank-N tunings/JI subgroups of dim-N with N different chains of accidentals
- transpose up/down to the nearest pitch
- enharmonic respell
- a list of copyable tuning configs of commonly used tunings for beginner users.

## List of Supported Accidentals

https://docs.google.com/spreadsheets/d/1kRBJNl-jdvD9BBgOMJQPcVOHjdXurx5UFWqsPf46Ffw/edit?usp=sharing

This is still a work in progress. Free for all to edit, and in need of community contribution! (Read [this post](https://www.facebook.com/groups/497105067092502/permalink/2700729770063343/))

## Caveats

- Does not intend to support having the same symbols in two different accidental chains (I am unaware of any notation system that requires this)
- Does not regard the order of appearance of accidentals.
- Could be very laggy...

## Dev Notes

### Example

This tuning system/staff text specifies a 2.3.5 JI subset:

```
A4: 440
0 203.91 294.13 498.04 701.96 792.18 996.09 1200
bb.bb 7 bb b (113.685) # x 2 x.x
\.\ \ (21.506) / /./
```

- `A4: 440`
  - Sets tuning note to MIDI note A4, sets A4 to 440hz.
  - Because of how this plugin works, the tuning note must be without accidental.
- `0 203.91 294.13 498.04 701.96 792.18 996.09 1200`
  - Sets a cycle of 7 nominals extending upwards/downwards from A4.
  - Tunes 7 nominals to 203.91cents, 294.13c, 498.04c, 701.96c, etc... respectively, representing the note names A, B, C, etc... (3-limit JI)
  - The last number sets equave to 1200c.
- `bb.bb 7 bb b (113.685) # x 2 x.x`
  - Declares a chain of accidentals that goes: two double-flats, triple-flat (accidental code `7` according to the [spreadsheet](https://docs.google.com/spreadsheets/d/1kRBJNl-jdvD9BBgOMJQPcVOHjdXurx5UFWqsPf46Ffw/edit?usp=sharing)), double-flat, flat, natural/none, sharp, double-sharp, triple-sharp (accidental code `2`), two double-sharps.
  - Each step in the flat/sharp direction lowers/raises the pitch by 113.685 cents respectively.
  - Accidentals in a one chain are mutually exclusive. That is, you cannot have two different accidentals within the same chain applied to the same note.
  - Declaring the chain of accidentals limits the search space of the 'transpose up/down to nearest pitch' function such that only the declared accidentals are regarded. (too many accidentals / nominals will cause lag.)
- `\.\ \ (21.506) / /./`
  - Declares a second chain of accidentals that go double-syntonic down, syntonic down, natural/none, syntonic up, double-syntonic up --- where each adjacent step in the accidental chain is 21.506 cents apart.
  - You can combine accidentals from different chains.


### Implementation Details

Upon parsing the above tuning config, the plugin should generate all permutations of nominals and accidentals within an equave and sort it in ascending pitch order like so:

```
... omitted for brevity
A 0.00c
Dbbbb\\ 0.29c
Bbb// 19.55c
A/ 21.51c
Dbbbb\ 21.79c
Cbb\\ 23.75c
A// 43.01c
Dbbbb 43.30c
Cbb\ 45.25c
Bb\\ 47.21c
Dbbbb/ 64.81c
Cbb 66.76c
Bb\ 68.72c
A#\\ 70.67c
Dbbbb// 86.31c
Cbb/ 88.27c
Bb 90.22c
A#\ 92.18c
Cbb// 109.77c
Bb/ 111.73c
A# 113.69c
Dbbb\\ 113.97c
Bb// 133.24c
A#/ 135.19c
Dbbb\ 135.48c
Cb\\ 137.43c
A#// 156.70c
Dbbb 156.99c
Cb\ 158.94c
B\\ 160.90c
Dbbb/ 178.49c
Cb 180.44c
B\ 182.40c
Ax\\ 184.36c
Dbbb// 200.00c
Cb/ 201.95c
B 203.91c
Ebbbb\\ 204.21c
... omitted for brevity
```

For O(1) lookup purposes, the plugin should store:

- a mapping of index to note name (which is the unique permutation of nominal and accidental)
- a mapping of note name to index
- a mapping of note name to cents
- a mapping of cents to note name

#### Behavior of accidentals

Before we can do anything, we need to address how MuseScore handles accidentals.

There are 3 categories of accidentals, and for the sake of this plugin, let's call them:

1. **Fully supported**
2. **Half supported**
3. **Symbolic**

Fully supported accidentals are the result an internal property of the Note element called `tpc` (tonal pitch class), which is a number that ranges from -8 to 40. This represents a cycle of 49 fifths ranging from Fbbb (3ple flat) to Bx# (3ple sharp). Any of these accidentals will affect playback in steps of 100 cents as it registers a different MIDI note.

Half supported accidentals are accidentals that exist in the `accidental` property of the Note element, but they do not affect the `tpc` nor playback, and they are treated like the 'natural' accidental (cancelling all prior accidentals). Only a fraction of SMuFL accidental symbols are available as half-supported accidentals. These accidentals are identifiable with UPPER_CAMEL_CASE IDs.

Symbolic accidentals are accidentals that are the result of the `elements` array property of the Note element. This property includes **all** elements attached to the Note head. Accidental symbols will have the `symbol` property set to the SMuFL ID of the symbol. These accidentals are identifiable with lowerCamelCase IDs. E.g. if a note only has one symbol element attached to it, then you can access it with `note.elements[0].symbol`.


Because of this mess, we need to keep track of which accidentals are fully supported and which ones are not, because we need to account for the fact that fully supported accidentals affect playback.

#### Parsing of accidentals

Let's say we have the above tuning system with two accidental chains defined.

Here's an example of the parsing of `Ebbbb\\`.

First, note that this plugin does not factor the order of appearance of accidentals. That is, `Ebbbb\\` is the same as `E\bb\bb`.

The `NoteName` object is tokenized from the MuseScore Note element and outputs this data structure:

```js
// NoteName
{
  "nominal": 4, // A is the 0th nominal, E is the 4th
  "accidentals": {
    ""
  }
}
```

### Data Structures
