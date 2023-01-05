# Microtonal/Xenharmonic MuseScore plugin suite

**Work in progress.**

A rewrite of the n-edo plugin.

## HELP NEEDED

See [this post](https://www.facebook.com/groups/497105067092502/permalink/2700729770063343/)

## Goals:

- [ ] The user should not need to manually retune cents offset of notes. Support for many tuning systems as possible while allowing maximum flexibility of choice of accidentals.

- [ ] The user should not need to open up the symbols palette and manually search for the accidental the user needs. Every unique accidental and note in the equave should be accessible with just up/down arrows and 'J' to cycle through enharmonics.

- [ ] In large tuning systems, the user should not need to press the up arrow one [gongulus](https://googology.fandom.com/wiki/Gongulus) times to get to the desired note. An auxiliary up/down operation should be provided that transposes to the next nearest note that considers a smaller subset of accidentals and leaves the other accidentals unchanged.

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

# Dev Notes

## Case Study/Example

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


## Implementation Details

### Overview

`tune.qml`:

1. Parse tuning text annotation to construct a 'tuning system'.
2. Using key signature annotations, implicit & explicit accidentals, calculate the effective accidental applied on to a note. Explicit > implicit > key signature.
3. Calculate cents interval (from tuning note) of the original 12edo note.
4. Calculate cents interval (from tuning note) of the note with the effective accidental applied.
5. Subtract the xen tuning cents from the original cents to get the cents offset.
6. Apply cents offset.

`up/down.qml`:

1. Parse tuning text annotation to construct a 'tuning system'.
2. Exhaust all permutations of accidentals & nominals and sort in order of ascending pitch (in cents)
3. Some permutations may exceed the range of the equave, and they should be wrapped around modulo the equave. These equave-wrapped spellings should have a flag attributed to them to signify how many equaves up/down it has been transposed.
4. If two notes differ by less than some threshold interval (e.g. 0.01 cents), group them together as enharmonic equivalents.
5. The resulting memoized structure is called `tuningTable` and should be a list of lists of triples. Each triple contains a `NoteName` data structure, cents offset, and equave offset. Each list of triples represent enharmonic spellings of one distinct pitch.
6. The lists of tuple-pairs in the `tuningTable` is indexed two-ways in order of increasing pitch.
7. The up/down operation should move the current selected note(s) stepwise to the nearest `NoteName` in the `tuningTable` that is **not** enharmonically equivalent. It should also choose the enharmonic spelling with the minimal number of required explicit accidentals.
8. Run through a series of checks:
   - If the newly adjusted note has a side-effect of adjusting the effective accidental of a succeeding note/grace note, apply the effective accidental of the succeeding note as explicit accidental(s), **before** the current note is adjusted.
   - If the newly adjusted note has a side-effect of making explicit accidentals of a succeeding note/grace redundant, remove the explicit accidental(s) of the succeeding note.
   - If the newly adjusted note agrees with the prior effective accidental context, then simply remove explicit accidentals of the current note.
9. Finally, apply/remove explicit accidentals as needed on the adjusted note.
10. Apply the same method as `tune.qml` to tune the newly adjusted note.

In some edge cases, the newly adjusted note may cause succeeding notes to sound off-pitch (because of how symbolic accidentals allow standard accidental pitch offsets to pass through). **Recommend the user to always manually run `tune.qml` on the whole score after moving notes around.**

`enharmonic.qml`:

1. Repeat steps 1-6 of `up/down.qml`.
2. All enharmonically equivalent spellings are grouped together in the `tuningTable`. One at a time, for each note in the selection, construct a lookup table mapping the note's enharmonic `NoteName`s to an index indexed by the order of appearance in the `tuningTable`.
3. Cycle enharmonic spellings by index using the lookup table.

No checks on subsequent notes are needed because enharmonically equivalent notes/accidentals should always result in the same pitch.

For the same reason as `up/down.qml`, recommend the user to **always manually run `tune.qml` after this operation.**

`aux up/down.qml`:

1. Repeat steps 1-6 of `up/down.qml`.
2. Take note of the special auxiliary step config annotation which specifies which accidental cycles/sets to regard/disregard for the auxiliary up/down operation.
3. For this aux up/down operation, instead of using the nearest adjacent non-equivalent pitch. Skip to the nearest non-equivalent `NoteName` spelling such that accidentals present in disregarded accidental cycles remain unchanged. This is effectively forms a 'quotient group' (ish).
4. Continue with steps 8-10 of `up/down.qml`.

Let's use the current 2.3.5 JI subset example:

Assume we configure aux up/down to disregard the syntonic comma accidental chain and only regard the sharps/flats chain.

Then, upon executing 'aux up' on the note `A/`, it should skip all the way to `Dbbbb/`, followed by `Cbb/`, `Bb/`, `A#/`... because those are the next nearest `NoteName`s in the `tuningTable` which have an identical syntonic comma accidental. This way, the user can move a note up/down in bigger increments to save time.

We can also make clones `aux2 up/down.qml` etc... which work the same way with individually configurable accidental chains.

### `tuningTable`

Upon parsing the above example of the 2.3.5 JI subset tuning config, the plugin should generate all permutations of nominals and accidentals within an equave and sort it in ascending pitch order like so:

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
- ~~a mapping of cents to note name~~ (no use case yet) 

### Behavior of accidentals

Before we can do anything, we need to address how MuseScore handles accidentals.

There are 3 categories of accidentals, and for the sake of this plugin, let's call them:

1. **Fully supported** aka 'full accidentals'
2. **Half supported** aka 'half accidentals'
3. **Symbolic** accidentals

Full accidentals are the result an internal property of the Note element called `tpc` (tonal pitch class), which is a number that ranges from -8 to 40. This represents a cycle of 49 fifths ranging from Fbbb (3ple flat) to Bx# (3ple sharp). Any of these standard accidentals will affect playback in steps of 100 cents as it registers a different MIDI note.

Half accidentals are accidentals that exist in the `accidental` property of the Note element, but they do not affect the `tpc` nor playback, and they are treated like the 'natural' accidental (cancelling all prior accidentals). Only a fraction of SMuFL accidental symbols are available as half-supported accidentals. These accidentals are identifiable with UPPER_CAMEL_CASE IDs.

Symbolic accidentals are accidentals that are from of the `elements` array property of the Note element. This property includes **all** elements attached to the Note head (including articulations & fingering), but accidental symbols will have the `symbol` property set to the SMuFL ID of the symbol. These accidentals are identifiable with lowerCamelCase IDs. E.g. if a note only has one symbol element attached to it, then you can access it with `note.elements[0].symbol`.


Because of this mess, we need to take caution of notes which have non-natural `tpc`s, because we need to account for the fact that fully supported accidentals affect playback.

A half accidental naturalizes any prior accidentals, but a symbolic accidental does not. This means that any prior full accidental will cause a succeeding note with only a symbolic accidental to appear with the same offset applied to the prior full accidental, and we need to account for that.

Thankfully all we need to do is check the `tpc` of each note, and take into account the semitone offsets of the `tpc`. There is no need for handling all edge cases.


### Parsing of explicit accidentals

Let's say we have the above tuning system with two accidental chains defined.

Here's an example of the parsing of `Ebbbb\\`. Let's assume that the first double flat is a Full Accidental, and the second double flat is a Symbolic Accidental. (You cannot have more than one Full/Half Accidentals on the same note) The double flat is accidental code 6.

Let's also assume that the comma down is the `accidentalArrowDown` SMuFL (Gould arrow) symbol, which looks like an arrow pointing straight down. Let's say for example this is represented by accidental code 34.

Hence, this note's `tpc` is 3 (E double flat), and it has three Symbolic Accidental attached under the `elements` property. In no particular order: double flat, comma down, comma down.

Note that this plugin does not factor the order of appearance of accidentals. That is, `Ebbbb\\` is the same as `E\bb\bb`.

The `readNote()` function 'tokenizes' the MuseScore Note element to output the following `NoteName` object:

```js
// NoteName
{
  nominal: 4, // A is the 0th nominal, E is the 4th
  tpc: 4, // Fbbb is -8, Fbb is -1, Ebb is 4
  accidentals: {
    6: 2, // there are two double flats
    34: 2, // there are two comma downs
  },.
}
```

### Parsing of implicit accidentals

Let's say immediately after the above `Ebbbb\\` note, we have a `E` with no accidentals.

This note's `tpc` is still 4 (Ebb), because the Full Accidental is still in effect from before. However, it has no explicit accidentals attached to it.

In this situation, we calculate the effectiveNoteName of this `E` note by looking for prior notes in this staff line with explicit accidentals using the `getAccidental` function. This function returns the `NoteName` object of a preceding note with explicit accidentals that affect the current one, or `null` if there are no prior notes with explicit accidentals.



## Data Structures



## Functions