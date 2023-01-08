# Microtonal/Xenharmonic MuseScore plugin suite

A rewrite of the n-edo plugin to support as many notation & xen tuning systems as possible.

## HELP NEEDED

This project is still a **work in progress.** (See [this post](https://www.facebook.com/groups/497105067092502/permalink/2700729770063343/))

I need help with the [data entry of accidentals](https://docs.google.com/spreadsheets/d/1kRBJNl-jdvD9BBgOMJQPcVOHjdXurx5UFWqsPf46Ffw/edit?usp=sharing) to complete this plugin.

## Goals

- [ ] The user should not need to manually retune cents offset of notes. Support for many tuning systems as possible while allowing maximum flexibility of choice of accidentals.

- [ ] The user should not need to open up the symbols palette and manually search for the accidental the user needs. Every unique accidental and note in the equave should be accessible with just up/down arrows and 'J' to cycle through enharmonics.

- [ ] In large tuning systems, the user should not need to press the up arrow one [gongulus](https://googology.fandom.com/wiki/Gongulus) times to get to the desired note. An auxiliary up/down operation should be provided that transposes to the next note that considers a smaller subset of accidentals and leaves the other accidentals unchanged.

- [ ] Accidental ligatures (for HEJI & Sagittal) where multiple accidentals can combine and be represented as a single symbol.

- [ ] Proper transposition by any interval of choice for all regular mappings.

- [ ] MIDI/MPE export with channel pitch bend support.

## List of Supported Accidentals

https://docs.google.com/spreadsheets/d/1kRBJNl-jdvD9BBgOMJQPcVOHjdXurx5UFWqsPf46Ffw/edit?usp=sharing

This is still a work in progress. Free for all to edit, and in need of community contribution! (Read [this post](https://www.facebook.com/groups/497105067092502/permalink/2700729770063343/))

## What???

To use this plugin, we first need to know how this plugin conceptualizes accidentals. Let's fix some terminology first.

A **symbol code** represents a visually unique symbol, which could have multiple different IDs under the hood. For the purposes of this plugin, all similar-looking symbols are considered the same symbol.

Technically speaking, MuseScore has two different types of 'accidentals'. You can use accidentals from the usual 'Accidentals' palette, but you can access a larger range of accidental symbols from the 'Symbols' category in the Master Palette (shortcut 'Z'). You can only have one 'accidental' attached to a note, but you can attach multiple symbols to get multiple accidentals on one note. No matter how you attach the accidental, this plugin will identical looking accidentals/symbols as the same and assign them the same **symbol code**

One or more symbol codes can come together to form a single accidental that represents a **degree** on an **accidental chain**. 

We are all familiar with sharps and flats. We can also have double sharps, triple flats etc...

When we say "sharps and flats", what we're really referring to is an **accidental chain**. Each successive item in this chain of sharps and flats refer to a regular (or regular-ish) pitch increment. The number of increments of the unit interval is the **degree**. In other words, `bb` (double flat) is really "degree -2" of the "sharps and flats" chain. In 12edo, each degree represents a 100 cent increment, so `bb` represents -200 cents.

You can compose different symbols together to form a degree. E.g. if you want 5 flats, you can do `bbb.bb` to compose a triple flat and a double flat together as one logically grouped accidental degree.

You can't attach two accidental degrees from the same accidental chain on to a single note (like how it wouldn't make sense to call a note "C-sharp-flat-natural").

However, you can combine different degrees of different accidental chains together to form the composite accidental aka **accidental vector**. 

For example, in 5-limit just intonation, we will need to tune the 'ditone' (81/64) down a syntonic comma (81/80) to arrive at a classic major third (5/4). Let's say our 'sharp-flats' chain are all 3-limit apotomes -- so the interval between D and F# is a ditone. We can lower F# down a syntonic comma by adding an accidental from a second accidental chain. 

We can declare a new accidental chain (the 5-commas chain) with a 21 cents increment between each degree.

Then, we can get the note `F#\`, which represents +1 steps in the sharps-flats chain and -1 steps in the 5-commas chain.

This plugin enables xen notation by giving you free-reign over declaring:

- Accidental chains with regular/irregular step sizes between each degree
- The combinations of one or more symbols that represent a single degree on an accidental chain.
- The tunings of the nominals (A, B, C, D, etc...)
- The number of nominals within an octave/equave (so you can emulate Bohlen-Pierce & other non-octave notations)
- The interval of the 'equave' (so you can have stretched octave/tritave/etc... tunings)
- Accidental ligatures --- where a single symbol (or multiple) can represent & substitute for a combination of accidentals from differing accidental chains (useful for HEJI & Sagittal)

## Caveats

- Does not intend to support having the same symbols in two different accidental chains (I am unaware of any notation system that requires this)
- Does not regard the order of appearance of accidentals.
- Only concert pitch display mode is supported. If you wish to write for transposing instruments in its transposed key, put the score in Concert Pitch mode and use a Staff Text to enter a Tuning Config such that the tuning frequency matches the transposition of the instrument.
- Could be very laggy...

-----

# Dev Notes
### Feature target (for now)

- Multiple accidental symbols (using symbols attached to a note) functioning as a single accidental.
- any number of nominals + custom nominal tuning
- equave stretching (1 equave = 1 cycle of nominals)
- custom accidental tuning
- declare a finite number of accidental permutations using chains of accidentals to support rank-N tunings & JI subgroups. (up to 1 accidental per chain can be present on a note).
- Allow irregular step sizes within a single accidental chain.
- transpose up/down to the nearest pitch
- enharmonic respell
- a list of copyable tuning configs of commonly used tunings for beginner users.

## Case Study/Example

This tuning system/staff text specifies a 315-note subset of 2.3.5 JI:

```txt
A4: 440
0 203.91 294.13 498.04 701.96 792.18 996.09 1200
bb.bb 7 bb b (113.685) # x 2 x.x
\.\ \ (21.506) / /./
```

- `A4: 440`
  - Chooses the 12edo nominal A4 as the reference note, sets A4 to 440hz.
  - Because of how this plugin works, the tuning note must be without accidental (it has to be a nominal)
  - **Do not suffix this line with 'hz'**
- `0 203.91 294.13 498.04 701.96 792.18 996.09 1200`
  - Sets a cycle of 7 nominals extending upwards/downwards from A4.
  - Tunes 7 nominals to 203.91cents, 294.13c, 498.04c, 701.96c, etc... respectively, representing the note names A, B, C, etc... (3-limit JI)
  - The last number sets equave to 1200c.
- `bb.bb 7 bb b (113.685) # x 2 x.x`
  - Declares a chain of accidentals that goes: two double-flats, triple-flat (accidental code `7` according to the [spreadsheet](https://docs.google.com/spreadsheets/d/1kRBJNl-jdvD9BBgOMJQPcVOHjdXurx5UFWqsPf46Ffw/edit?usp=sharing)), double-flat, flat, natural/none, sharp, double-sharp, triple-sharp (accidental code `2`), two double-sharps.
  - Each step in the flat/sharp direction lowers/raises the pitch by 113.685 cents respectively. It is also possible to have irregular sizes for different accidentals in a chain, separate example below.
- `\.\ \ (21.506) / /./`
  - Declares a second chain of accidentals that go double-syntonic down, syntonic down, natural/none, syntonic up, double-syntonic up --- where each adjacent step in the accidental chain is 21.506 cents apart.
  - You can combine accidentals from different chains.

This produces the following `TuningConfig`:

```js
{
  notesTable: { ... NotesTable },
  tuningTable: { ... TuningTable },
  avTable: { ... AccidentalVectorTable },
  stepsList: [ ... StepwiseList ],
  stepsLookup: { ... StepwiseLookup },
  enharmonics: { ... EnharmonicGraph },
  accChains: [
    {
      // Accidental chain of bb.bb, bbb, bb, b, etc...
      degreesSymbols: [
        [7,7], [8], [7], [6], null, 
        [5], [4], [3], [4,4]
      ],
      tunings: [
        -454.74, -341.055, -227.37, -113.685, 0, 
        113.685, ...
      ],
      centralIdx: 4
    },
    {
      // Accidental chain of \.\ \, \, /, /./
      degreesSymbols: [...],
      tunings: [...],
      centralIdx: 2
    }
  ],
  ligatures: [],
  nominals: [0, 203.91, 294.13, 498.04, 701.96, 792.18, 996.09],
  numNominals: 7,
  equaveSize: 1200,
  tuningNote: 69, // A4
  tuningNominal: 0, // number of 12edo nominals from A4.
  tuningFreq: 440 // Hz
}
```


Note that accidentals in one chain are mutually exclusive. That is, you cannot have two different accidentals within the same chain applied to the same note. Following this e.g., you can't have flat and sharp on one note at the same time.

Declaring the chain of accidentals limits the search space of the stepwise 'up/down' action such that only the declared accidentals are regarded. (too many declared accidentals/chains/nominals will cause lag / OOM)

Multiple symbols can logically represent one accidental. To do this, connect multiple accidental codes with a dot (`.`). **Do not put a space between dots and symbols**.

For example, `x.+./` declares a single accidental that comprises a double-sharp, a Stein semisharp, and an up arrow. When this accidental is constructed by the plugin, it will have these symbols follow this layout in this order left-to-right, but internally, there is no difference in the ordering of these symbols and they can appear in any order and be tuned the same.

Even if you declare a multi-symbol accidental, these individual symbols cannot be used in the accidentals within any other accidental chain. This is a user-constriction put in place to reduce lag & computation complexity.

E.g. if you declare `x.+./` in chain 1, you cannot declare `x.d` in chain 2, because `x` is already being used by chain 1.

## Implementation Details

### Overview

`tune.qml`:

1. Parse tuning text annotation to construct the 'TuningConfig`.
2. Using key signature annotations, implicit & explicit accidentals, calculate the effective accidental applied on to a note. Explicit > implicit > key signature.
3. Calculate cents interval (from tuning note) of the original 12edo note.
4. Look up the `TuningConfig` for cents interval (from tuning note) for microtonal tuning.
5. Subtract the xen tuning cents from the original cents to get the cents offset.
6. Apply cents offset.

`up/down.qml`:

1. Parse tuning text annotation to construct the `TuningConfig`.
2. The up/down operation should move the current selected note(s) stepwise to the nearest `XenNote` in the `TuningConfig` that is **not** enharmonically equivalent. It should also choose the enharmonic spelling with the minimal number of required explicit accidentals.
3. Run through a series of checks:
   - If the newly adjusted note has a side-effect of adjusting the effective accidental of a succeeding note/grace note, apply the effective accidental of the succeeding note as explicit accidental(s), **before** the current note is adjusted.
   - If the newly adjusted note has a side-effect of making explicit accidentals of a succeeding note/grace redundant, remove the explicit accidental(s) of the succeeding note.
   - If the newly adjusted note agrees with the prior effective accidental context, then simply remove explicit accidentals of the current note.
4. Finally, apply/remove explicit accidentals as needed on the adjusted note.
5.  Apply the same method as `tune.qml` to tune the newly adjusted note.

In some edge cases, the newly adjusted note may cause succeeding notes to sound off-pitch (because of how symbolic accidentals allow standard accidental pitch offsets to pass through). **The user is recommended to always manually run `tune.qml` on the whole score after moving notes around.**

`enharmonic.qml`:

1. Parse tuning text annotation to construct the `TuningConfig`.
2. All enharmonically equivalent spellings are indexed/logically grouped together in the `TuningConfig`.
3. Cycle enharmonic spellings by index using the lookup table.

No checks on subsequent notes are needed because enharmonically equivalent notes/accidentals should always result in the same pitch.

For the same reason as `up/down.qml`, recommend the user to **always manually run `tune.qml` after this operation.**

`aux up/down.qml`:

1. Parse tuning text annotation to construct the `TuningConfig`.
2. Take note of the special auxiliary step config annotation which specifies which accidental cycles/sets to regard/disregard for the auxiliary up/down operation.
3. For this aux up/down operation, instead of using the nearest adjacent non-equivalent pitch. Skip to the nearest non-equivalent `XenNote` spelling such that accidentals present in disregarded accidental cycles remain unchanged. This is effectively forms a 'quotient group' (ish).
4. Continue with steps 8-10 of `up/down.qml`.

Let's use the current 2.3.5 JI subset example:

Assume we configure aux up/down to disregard the syntonic comma accidental chain and only regard the sharps/flats chain.

Then, upon executing 'aux up' on the note `A/`, it should skip all the way to `Gx/`, followed by `Dbbbb/`, `Fxx/`, `Cbb/`, etc... because those are the next nearest `XenNote`s in the `TuningTable` which have an identical syntonic comma accidental. This way, the user can move a note up/down in bigger increments to save time.

We can also make clones `aux2 up/down.qml` etc... which work the same way with individually configurable accidental chains.

### Construction of `TuningTable` & `TuningConfig`

Upon parsing the above example of the 2.3.5 JI subset tuning config, the plugin should generate the `TuningTable`. This contains all permutations of nominals and accidentals within an equave and sort it in ascending pitch order like so:

```csv
NoteName,  cents,  equavesAdjusted
A      ,   0.00c,  0
Dbbbb\\,   0.29c,  0
Gx\    ,   1.95c,  -1
Fxx\\  ,   3.91c,  -1
Bbb//  ,  19.55c,  0
A/     ,  21.51c,  0
Dbbbb\ ,  21.79c,  0
Gx     ,  23.46c,  -1
Cbb\\  ,  23.75c,  0
Fxx\   ,  25.41c,  -1
A//    ,  43.01c,  0
Dbbbb  ,  43.30c,  0
Gx/    ,  44.97c,  -1
Cbb\   ,  45.25c,  0
Fxx    ,  46.92c,  -1
Bb\\   ,  47.21c,  0
Dbbbb/ ,  64.81c,  0
Gx//   ,  66.47c,  -1
Cbb    ,  66.76c,  0
Fxx/   ,  68.43c,  -1
Bb\    ,  68.72c,  0
A#\\   ,  70.67c,  0
Dbbbb//,  86.31c,  0
Cbb/   ,  88.27c,  0
Fxx//  ,  89.93c,  -1
Bb     ,  90.22c,  0
A#\    ,  92.18c,  0
G#x\\  ,  94.13c,  -1
... etc (see 2.3.5 JI tuning example.csv for all 315 notes)
```

This `TuningTable` is the common resource that exhausts all possible unique spellings of the nominals, and belongs to the `TuningConfig`. It is implemented as a mapping from `XenNote`s to cent offsets.

During the parsing of tuning, the `TuningConfig` needs to index the `TuningTable` several ways so that we can quickly obtain required information in O(1) time.

- `notesTable`: maps `XenNote` string hashes to `XenNote` objects
- `tuningTable`: maps `XenNote` string hashes to cent offsets
- `avTable`: maps `XenNote` string hashes to `AccidentalVector`s
- `stepsList`: a list of collated sets of enharmonic-equivalent `XenNote` string hashes, sorted by increasing pitch
- `stepsLookup`: maps `XenNote` string hashes to the index it appears in the `stepsList`
- `enharmonics`: maps `XenNote` string hashes to enharmonic equivalent `XenNote` string hashes.
- ~~a mapping of cents to note name~~ (no use case yet)

We also need to store the accidental chains in the order which they are declared.

### Behavior of accidentals

Before we can do anything, we need to address how MuseScore handles accidentals.

There are 3 categories of accidentals, and for the sake of this plugin, let's call them:

1. **Fully supported** aka 'full accidentals'
2. **Half supported** aka 'half accidentals'
3. **Symbolic** accidentals

Full accidentals are the result an internal property of the Note element called `tpc` (tonal pitch class), which is a number that ranges from -8 to 40. This represents a cycle of 49 fifths ranging from Fbbb (3ple flat) to B#x (3ple sharp). Any of these standard accidentals will affect playback in steps of 100 cents as it registers a different MIDI note.

Half accidentals are accidentals that exist in the `accidental` property of the Note element, but they do not affect the `tpc` nor playback, and they are treated like the 'natural' accidental (cancelling all prior accidentals). Only a fraction of SMuFL accidental symbols are available as half-supported accidentals. These accidentals are identifiable with UPPER_CAMEL_CASE IDs.

Symbolic accidentals are accidentals that are from of the `elements` array property of the Note element. This property includes **all** elements attached to the Note head (including articulations & fingering), but accidental symbols will have the `symbol` property set to the SMuFL ID of the symbol. These accidentals are identifiable with lowerCamelCase IDs. E.g. if a note only has one symbol element attached to it, then you can access it with `note.elements[0].symbol`.


Because of this mess, we need to take caution of notes which have non-natural `tpc`s, because we need to account for the fact that fully supported accidentals affect playback.

A half accidental naturalizes any prior accidentals, but a symbolic accidental does not. This means that any prior full accidental will cause a succeeding note with only a symbolic accidental to appear with the same offset applied to the prior full accidental, and we need to account for that.

Thankfully all we need to do is check the `tpc` of each note, and take into account the semitone offsets of the `tpc`. There is no need for handling all edge cases.

### Tokenizing of explicit accidentals

Let's continue the example using the same tuning system as above with two accidental chains, 7 nominals, and tuning note set to A4.

Here's an example of the parsing of `Ebbbb\\4`. Let's assume that the first double flat is a Full Accidental, and the second double flat is a Symbolic Accidental. (You cannot have more than one Full/Half Accidentals on the same note) The double flat is accidental code 6.

Let's also assume that the comma down is the `accidentalArrowDown` SMuFL (Gould arrow) symbol, which looks like an arrow pointing straight down. Let's say it is represented by accidental code 34 (not finalized yet).

Hence, this note's `tpc` is 3 (E double flat), and it has three Symbolic Accidental attached under the `elements` property. In no particular order: double flat, comma down, comma down.

Note that this plugin does not factor the order of appearance of accidentals. That is, `Ebbbb\\` is the same as `E\bb\bb`.

The `readNote()` function 'tokenizes' the MuseScore Note element to output the following `MSNote` object:

```js
// MSNote
{
  tpc: 4, // Ebb is 4
  nominalsFromA4: -3, // E4 is 3 nominals below A4.
  accidentals: {
    6: 2, // two double flats
    34: 2, // two comma downs
  }
}
```

### Tokenizing of implicit accidentals

Let's say immediately after the above `Ebbbb\\` note, we have a `E` with no accidentals.

This note's `tpc` is still 4 (Ebb), because the Full Accidental is still in effect from before. However, it has no explicit accidentals attached to it.

In this situation, we need to check for prior notes in this staff line with explicit accidentals using the `getAccidental` function. This function returns the `accidentals` object of a preceding note with explicit accidentals that affect the current one, or `null` if there are no prior notes with explicit accidentals.

As of now, this plugin does not intend to support the ability to have independently explicit/implicit accidentals per accidental chain. This means that ups and downs notation where prior sharps/flats carry through an up/down accidental will not be supported. If there's enough demand for that, then this feature will be a goal.

### Parsing a note

Once the implicit/explicit accidentals on a `MSNote` has been tokenized, we apply information from the TuningConfig to calculate the `XenNote` string hash from properties of the `MSNote`. Then, we can obtain `NoteData` from the `XenNote` + equaves calculation.

Example `NoteData` of the above `Ebbbb\\4` note with implicit accidentals.

```js
{
  ms: { // MSNote
    tpc: 4, // Ebb is 4
    nominalsFromA4: -3, // E4 is 3 nominals below A4.
    accidentals: null // no explicit accidentals
  },
  xen: { // XenNote
    nominal: 4, // E
    accidentals: {
      6: 2, // two double flats
      34: 2, // two comma downs
    },
    hash: "4 6 2 34 2"
  },
  equaves: -1 // E4 is in the equave below tuning note A4
}
```

### Matching of an accidental

Because the `TuningConfig` has a mapping for all `XenNote`s to `AccidentalVector`s, we can simply look that up.

We should obtain the `AccidentalVector` of `[-4,-2]`. Which states that we need to apply -4 apotomes and -2 syntonic commas to the nominal.

-----

## Advanced example: irregular steps

For whatever reason, if you wish to irregular intervals between accidentals within one accidental chain, you can do so with this syntax:

```txt
b.b(-50) bbb bb b (100) # x(25) #x x.x
```

This declares an accidental chain ranging from 2 double flats to 2 double sharps.

The `(-50)` symbolizes that the two double flat `b.b` accidental is 50 cents lower than what it should be. Hence, it signifies -450 cents.

Similarly, the `(25)` symbolizes that the double sharp `x` accidental now refers to 225 cents.

**There should not be a space between the accidental notation and the `(cent offset)`**

If you have a chain of accidentals that are completely irregular, what you can do is to set the generator interval to 0, and specify manual offsets for each accidental:

```txt
b^(-90) v(-50) (0) ^(30) ^2(70)
```

This sets the b^ accidental to -90 cents, v to -50 cents, and so on.

However, do note that if you're using this feature, you're either dealing with a really, complicated/obscure tuning system (8th-32nd harmonics scale stretched by pi?), or you're doing something wrong.

Reasonably sized regular temperament & JI subsets should be representable with only regularly-generated accidental chains.

If you require accidental ligatures where some individual symbols represent accidentals from multiple chains (like in HEJI & Sagittal), you should use the accidental ligature feature instead.

-----

## Advanced example: accidental ligatures

For proper HEJI and Sagittal notation, we need to take into account that there are combinations of accidentals that can combine into one single symbol.

For example, the sharp and syntonic comma up (ARROW_UP) accidentals can combine into `SHARP_ARROW_UP`.

The solution here is to allow the user to specify a list of ligatures/replacement symbols that apply to specific accidental chains only.

For example, we can have 7-limit JI with 3 accidental chains: apotomes, 5-commas and 7-commas.

In HEJI, there are composite accidental ligatures for compositions of apotomes and 5-commas. The user can append the following text to the Tuning Config text annotation:

```txt
lig(1,2)
<acc chain 1 degree> <acc chain 2 degree> <SymbolCode(s)>
1 3 23
1 2 24
1 1 25
1 -1 26
1 -2 27
1 -3 28
```

`lig(0,1)` signifies that the plugin should perform search-and-replace for exact matches regarding the 1st and 2nd accidental chains only (which are apotomes and 5-commas respectively).

`1 3 23` signifies that the ligature `SHARP_THREE_ARROWS_UP` (SymbolCode 23) is to be applied to replace the symbols that compose the degrees 1 and 3 for the 1st and 2nd accidental chains respectively.

This means that if some note has an accidental vector of `[1,3,2]` (sharp + 3 syntonic commas + 2 7-commas). The plugin will find that there is an exact match in the 1st and 2nd chains of `[1,3,2]` to the `1 3` ligature vector, and thus the `1 3` part gets ligatured as SymbolCode 23 (`SHARP_THREE_ARROWS_UP`).

Hence, the resulting combination of symbols on the note should be sharp-3-arrows (`[1, 3, 0]`) + 2 7-commas up (`[0, 0, 2]`) = `[1, 3, 2]`.

You can also specify Text Codes in place of SymbolCode numbers (e.g. `#^3` instead of `23`).

If you require a ligature that consists of more than one symbol, separate `SymbolCode`s with a dot (`.`). E.g., `1 3 #.^3` will ligature `[1,3,2]` into `SHARP` + `NATURAL_THREE_ARROWS_UP` + 2 7-commas up. (Though, this is an impractical example).

:::note
Note that ligatures are not a replacement for specifying symbols for each degree in accidental chains. You can only apply ligatures to degrees in a chain with symbols assigned to them.
:::

If you require more than one ligature declaration between any number of accidental chains, the user can do so by appending more `lig(x,y,z,...)` declarations below.

E.g.:

```txt
lig(1,2)
1 1 108
1 -1 109
etc...
lig(2,3)
etc...
lig(1,2,3)
etc...
```

The ligatures will be searched and replaced in the order of which they are declared.

The above example will first try to find matches between chains 1 and 2. If a match is found, then it will flag that accidental chains 1 and 2 has been replaced with and will no longer search for matches involving chains 1 and 2.

Then, ligatures for chains 2 and 3 will be searched, and any matches will be flagged.

Finally, if nothing has been matched so far, then ligatures involving all 3 chains will be searched.

Though, this is a very extreme example and I can't think of any notation system that requires that much complexity.

### Ligature implementation

If ligatures are defined, these will add additional entries to the `NotesTable` when there is an exact match in the degrees of the `AccidentalVector` regarding `considered` accidental chains.

A ligatured entry will contribute additional `XenNote` spellings pointing to the same `AccidentalVector` (+ other lookup entries). There's no need to worry about this many-to-one map because there is no need for an inverse mapping.

With these additional lookup entries, a ligatured spelling is implemented simply as an 'enharmonic spelling', and ligatures can be toggled with the enharmonic cycling operation.

When creating/managing accidentals during up/down operations, this plugin favours spellings with lesser symbols. If for whatever reason, a ligatured spelling has more symbols than an non-ligatured one, the plugin will not automatically use the ligatured spelling. Thus, it only makes sense to define ligatures if the ligatured spellings will always have fewer symbols than the non-ligatured one.

## Data Structures

#### `SymbolCode`

```js
number
```

A number representing a uniquely identifiable accidental symbol. A single symbol code maps to all MuseScore accidental enums/SMuFL IDs that looks identical.

[See list of symbol codes](https://docs.google.com/spreadsheets/d/1kRBJNl-jdvD9BBgOMJQPcVOHjdXurx5UFWqsPf46Ffw/edit?usp=sharing)

#### `MSNote`

```js
{
  tpc: number, // tpc of note
  nominalsFromA4: number, // number of 12edo nominals from A4.
  accidentals?: {
    // number of each explicit accidental symbol attached to this note
    SymbolCode: number,
    SymbolCode: number,
    ...
  }
}
```

Represents a tokenized MuseScore note element.

If no explicit accidentals are present, `accidentals` is null.

#### `AccidentalVector`

```js
[number, number, ...]
```

Represents a single abstract composite accidental being applied to a note, represented by the degrees of each accidental chain.

For example, in a tuning system with two accidental chains in this order: sharps/flats, up/down --- the `AccidentalVector` of `[2, -3]` represents the degree 2 of the sharps/flat chain (double sharp) and degree -3 of the arrows chain (three down arrows).

The n-th number represents the degree of the n-th accidental chain. The order of which the accidental chains are declared/stored determines which number corresponds to which accidental chain.

#### `XenNote`

```js
{
  nominal: number, // no. of nominals away from tuning note (mod equave)
  accidentals?: {
    // map of the accidentals required to spell this note.
    SymbolCode: number
    SymbolCode: number,
    // if a tuning-declared accidental is not present in this note,
    // do not add it
    SymbolCode: 0 // DON'T DO THIS.
    ...
  }
  hash: string, // for lookup purposes
}
```

Think of this as the xen version of 'tonal pitch class'.

This is how the plugin represents a 'microtonal' note, containing data pertaining to how the note should be spelt/represented microtonally.

If `accidentals` is null, represents a nominal of the tuning system (note without accidental).

The `hash` string is to save performance cost of JSON.stringify and acts as a unique identifier for this `XenNote`.

`"<nominal> SymbolCode <degree> SymbolCode <degree> ..."`

The accidental codes must appear in increasing order.

For example, the note `A bb d` (1 double flat, 1 mirrored flat) should have the hash string: `"0 6 1 10 1"`.

#### `NoteData`

```js
{
  ms: MSNote, // 12edo representation
  xen: XenNote, // xen pitch class
  equaves: number // no. of xen equaves from tuning note.
}
```

Represents a semantically parsed note after `TuningConfig` lookup is applied to a `MSNote` to calculate its `XenNote` pitch class.

#### `NotesTable`

```js
{
  'XenNote.hash': XenNote,
  'XenNote.hash', XenNote,
  ...
}
```

Contains a lookup for all unique `XenNote`s in a tuning system.

Maps `XenNote.hash` to `XenNote` object.

#### `AccidentalVectorTable`

```js
{
  'XenNote.hash': AccidentalVector,
  'XenNote.hash': AccidentalVector,
  ...
}
```

Contains a map of `XenNote`s to their respective `AccidentalVector`s.

Note that this mapping is not bijective - two `XenNote`s can have different nominals but the same `AccidentalVector`.

NOTE: There doesn't seem to be a use case for an inverse mapping of this yet. However, if it is required later down the line, that would mean a lot of the implementation has to change. Hmm.

#### `TuningTable`

```js
{
  'XenNote.hash': [number, number], // [cents, equavesAdjusted]
  'XenNote.hash': [number, number],
  ...
}
```

Lookup table for the tuning of `XenNote`s. Entries do not need to be sorted in any particular order as the indexing for pitch sorting is done in `StepwiseList`.

See [2.3.5 JI tuning table.csv](https://github.com/euwbah/musescore-ji-rtt-plugin/blob/master/2.3.5%20JI%20tuning%20table%20example.csv) for an example.

`cents`: the number of cents this note is from tuning note modulo the equave.

`equavesAdjusted`: the number of times this note has to be taken up/down an equave so that its cents mapping will fit modulo the equave.

The equave adjustment has to be kept track of so that notes are tuned with in the correct equave, and stepwise up/down operations use the correct equave for certain notenames.

Look at the above 2.3.5 JI subset tuning for an example. (A4 is the tuning note & equave: 1200 cents.)

Going up stepwise from the note `Dbbbb\\` to `Gx\`, we actually need to lower Gx\ by one equave to actually get the correct next note up.

Similarly, going up stepwise from `Fxx\\` to `Bbb//`, we'll need to increase the equave by 1 so that it sounds in the correct equave.

#### `StepwiseList`

```js
[
  // Groups enharmonically equivalent oredered by ascending pitch
  ['XenNote.hash', 'XenNote.hash', ...],
  ['XenNote.hash', 'XenNote.hash', ...],
  ...
]
```

This list of lists indexes the `XenNote` hashes in order of ascending pitch.

Each list represents 'enharmonically equivalent' `XenNote`s. The stepwise up/down plugins uses this to determine what are the possible spellings of the next stepwise note, and it chooses the best option of enharmonic spelling based on the context (use of implicit accidentals/key signature/minimizing accidentals)

#### `StepwiseLookup`

```js
{
  // Mapping of XenNote to index of StepwiseList
  `XenNote.hash`: number,
  `XenNote.hash`: number,
  ...
}
```

A lookup table for the index of a `XenNote` in the `StepwiseList`. This lookup is used to determine the index of a current note, and the next note up/down is simply the enharmonically equivalent `XenNote`s at index + 1 or index - 1 of `StepwiseList`.

#### `EnharmonicGraph`

```js
{
  'XenNote.hash': 'XenNote.hash',
  'XenNote.hash': 'XenNote.hash',
  ...
}
```

A simple lookup table where `EnharmonicGraph[XenNote]` gives the next enharmonic equivalent spelling of the note, or `null` if there are no other enharmonic equivalents.

This lookup table describes a graph composed of several distinct cyclic directional paths. Each cyclic loop represents enharmonically equivalent notes.

This structure is computed at the same time as the `StepwiseList`.

#### `AccidentalChain`

```js
{
  degreesSymbols: [[SymbolCode]?], // Central element is null.
  tunings: [number], // tuning of each accidental in cents. Central elemnent is 0.
  centralIdx: number, // the index of the central element.
}
```

Represents a user declared accidental chain.

Each element of `degreesSymbols` is a list of `SymbolCode`s containing the symbols composed together to represent one degree in the accidental chain (in the order of which the user declared)

The accidental degree of the chain represented by `degrees[n]` and `tunings[n]` is equal to `n - centralIdx`.

#### `Ligature`

```js
{
  regarding: [number], // acc chain indices
  ligAvToSymbols: {
    // Search & replace map AccidentalVector -> SymbolCode
    LigAccVector: [SymbolCode],
    LigAccVector: [SymbolCode],
  },
}
```

Represents a ligature declaration.

`regarding` is an unordered set representing which n-th accidental chains to consider when searching for exact `AccidentalVector` matches.

`LigAccVector` is a subspace of `AccidentalVector` with only the `n`-th accidental chains included by `regarding`.

#### `TuningConfig`

```js
{
  notesTable: NotesTable,
  tuningTable: TuningTable,
  avTable: AccidentalVectorTable,
  stepsList: StepwiseList, // Sorted by increasing pitch
  stepsLookup: StepwiseLookup,
  enharmonics: EnharmonicGraph,
  accChains: [AccidentalChain], // In the order of decl.
  ligatures: [Ligature], // In order of decl.
  nominals: [number], // List of cents from tuning note
  numNominals: number, // = nominals.length
  equaveSize: number, // = the last cents value in nominals list
  tuningNote: number, // MIDI note number of tuning note
  tuningNominal: number, // tuning note number of 12edo nominals from A4.
  tuningFreq: number // Hz of tuning note.
}
```

This is the resulting data structure to be generated after parsing a tuning config staff/system text annotation.


#### `TuningConfigLookup`

```js
{
  'staff/system text string': TuningConfig,
  'staff/system text string': TuningConfig,
  ...
}
```

A lookup for memoized parsed `TuningConfig`s. Because of how the plugin cursor API requires each voice to be tuned separately one at a time, it will cause many unnecessary re-parsings of the same System/Staff Text element.

To prevent unneeded parsings, this lookup maps verbatim system/staff texts to the `TuningConfig` it results in when parsed. Hopefully this would reduce plugin lag.

## Functions

#### `readNote`

Takes in a MuseScore Note element and returns a `MSNote` object.

#### `getAccidental`

Checks the current (or preceding if `before=true`) note for explicit accidentals.
