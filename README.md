# Microtonal/Xenharmonic MuseScore plugin suite

A plugin to give first-class support as many microtonal/xen notation systems as possible by introducing multiple accidentals per note.

## Goals

- [x] (60%, needs [data entry](#help-needed)) The user should not need to manually retune cents offset of notes. Support for many tuning systems as possible while allowing maximum flexibility of choice of accidentals.

- [x] (60%, needs testing) The user should not need to open up the symbols palette and manually search for the accidental the user needs. Every unique accidental and note in the equave should be accessible with just up/down arrows and 'J' to cycle through enharmonics.

- [ ] In large tuning systems, the user should not need to press the up arrow one [gongulus](https://googology.fandom.com/wiki/Gongulus) times to get to the desired note. An auxiliary up/down operation should be provided that transposes to the next note that considers a smaller subset of accidentals and leaves the other accidentals unchanged.

- [x] (60%, needs testing) Accidental ligatures (for HEJI & Sagittal) where multiple accidentals can combine and be represented as a single symbol.

- [ ] Proper transposition by any interval of choice for all regular mappings.

- [ ] MIDI/MPE export with channel pitch bend support.


## Quick Start

> :warning: This project is still a work in progress. It is semi-usable, but I haven't had time to test nor write proper how-tos yet. In the meanwhile, feel free to message me on discord (euwbah#1417), [Telegram](https://t.me/euwbah) or [Instagram](https://www.instagram.com/euwbah/) if you need any assistance.

Download the project as .zip (the green "Code" button on top right of the project page).

Extract files to plugins folder & activate them (see [this guide](https://musescore.org/en/handbook/3/plugins))

Remove the default keyboard shortcuts for pitch-up/down (up/down arrow keys) and enharmonic (J key) in [MuseScore's shortcut preferences](https://musescore.org/en/handbook/3/preferences#shortcuts).

Assign `Up Arrow` to `up.qml`, `Down Arrow` to `down.qml` and `J` for enharmonic.qml using the "Define Shortcut" button in the [Plugin Manager](https://musescore.org/en/handbook/3/plugins#enable-disable-plugins).

Copy & read the [example tuning configuration](#case-studyexample).

Read [how the plugin conceptualizes tunings & accidentals](#what-how) to make your own tuning configurations.

## [List of Supported Accidentals](https://docs.google.com/spreadsheets/d/1kRBJNl-jdvD9BBgOMJQPcVOHjdXurx5UFWqsPf46Ffw/edit?usp=sharing)

This is still a work in progress. Free for all to edit, and [in need of community contribution](#help-needed)!

#### Keeping accidentals up to date

While the accidental data entry project is in progress, the new accidentals will be supported. The included `tabulate_accidentals.py` script updates your local copy of supported accidentals according to the "CSV Export" sheet. If you don't want to repeatedly download the plugin files to update the list of supported accidentals, you can just run this python script yourself with Python 3. (Though, it is recommended to keep your plugin updated as there are ongoing bugfixes etc...)

Note that if you have been using Symbol Code numbers to refer to your accidentals, you may need to ensure that the Symbol Codes still refer to the same accidentals after updating the list of supported accidentals. While the data entry is ongoing, the Symbol Code of symbols may change and is unstable.

## HELP NEEDED!

This project is still a **work in progress.**

One of the main features of this project is to allow the user to define their own
accidentals by combining any number of accidentals and symbols to represent one logical accidental.

However, in MuseScore, most accidental symbols have multiple internal IDs of accidentals that represent the same, or a similar-looking symbol.

I need help with tabulating the [list of all accidentals](https://docs.google.com/spreadsheets/d/1kRBJNl-jdvD9BBgOMJQPcVOHjdXurx5UFWqsPf46Ffw/edit?usp=sharing) available in MuseScore, such that Symbol IDs (`SymId`) & Accidental IDs (`AccidentalType`) that point to the same/similar-looking symbol are grouped together.

<br>

There are two categories of accidentals & IDs I will need help to tabulate together.

First, accidentals symbols marked as "Accidentals" in MuseScore's palette. These are the `AccidentalType`s identified internally using the `UPPER_SNAKE_CASE` naming convention.

**These are of low priority**, as the plugin does not intend to use these, at least for the foreseeable future. However, it would be good to get a full tabulation done as this would serve as a useful dataset for the community to do other projects in the future.

Unfortunately, there's no way of extracting their IDs from MuseScore UI, but _msfp_ has kindly provided [this tool for looking up symbols and their IDs](https://musescore.org/en/node/341701#comment-1164436). Download the .zip from the link and open the .html file to access the lookup/symbol search tool.

<br>

The other type of accidental symbols are the ones in the "Symbols" category, identified internally under `SymId` using the `lowerCamelCase` naming convention. These are accidentals used when you need more than one accidental per note (or when MuseScore only supports this accidental 'symbolically').

**High priority: all SymId/SMuFL IDs must be accounted for.**

<br>

The task at hand is to simply ensure all `SymId`s (and optionally, `AccidentalType`s) are represented in the document, and that all `SymId`s/`AccidentalType`s that point to a similar-looking accidental are grouped together on the same row.

For more info on this project, see [this post](https://www.facebook.com/groups/497105067092502/permalink/2700729770063343/).

## What? How?

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

- Does not intend to use the standard Accidentals at all (e.g. auto-formatted, auto-layout accidentals). All accidentals this plugin uses will be cosmetic symbols from the "Symbols" category of the Master Palette. This means:
  - You cannot drag standard-support accidentals from the "Accidentals" palette. All accidentals used must be from the "Symbols" category in the Master Palette. You can create your own custom Palette of symbolic SMuFL accidentals if you wish to drag & drop them on notes.
  \
  Though, you do not need to manually enter accidentals as the point of this plugin is for all accidentals used in a notation system to be accessible just via up/down arrow keys and the enharmonic respell ('J') key. Using this also automatically positions the accidentals.

  - Existing scores not made by this plugin will not work with this plugin.
  - Layout may look weird as this plugin has to reconstruct & re-invent how accidentals are to be laid out and formatted.
- Does not differentiate between the order of appearance of accidentals within one note.
- Only concert pitch display mode is supported. If you wish to write for transposing instruments in its transposed key, put the score in Concert Pitch mode and use a Staff Text to enter a Tuning Config such that the tuning frequency matches the transposition of the instrument.
- Does not fully support cross-staff notation. Accidentals don't carry over between two different staves if cross-staff notation is used. However, you can specify all accidentals explicitly.

#### Smaller caveats

- After you open MuseScore, the first time you run any function of this plugin, there will be a 5-10 second lag. This is normal, [the plugin is loading](https://musescore.org/en/node/306551#comment-1005654).
- Does not intend to support having the same symbols in two different accidental chains (I am unaware of any notation system that requires this)
- Does not support grace notes occurring _after_ a note. Grace notes occuring _before_ a note are supported.
- Octave 8va/15ma/etc... lines are not supported when non-standard number of nominals are used (e.g. bohlen pierce). You can simulate an octave line by setting the reference frequency higher/lower when needed.
- If an undeclared accidental combination is used, the note will be regarded as without accidental, even if some (but not all) symbols are declared in accidental chains.
- Ornaments can only be tuned within +/- 100 cents resolution.
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
0 203.910 294.130 498.045 701.955 792.180 996.090 1200
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
      symbolsUsed: [7,8,6,5,4,3],
      tunings: [
        -454.74, -341.055, -227.37, -113.685, 0, 
        113.685, ...
      ],
      centralIdx: 4
    },
    {
      // Accidental chain of \.\ \, \, /, /./
      degreesSymbols: [...],
      symbolsUsed: [...],
      tunings: [...],
      centralIdx: 2
    }
  ],
  ligatures: [],
  nominals: [0, 203.91, 294.13, 498.045, 701.955, 792.18, 996.09],
  numNominals: 7,
  equaveSize: 1200,
  tuningNote: 69, // A4
  tuningNominal: 0, // number of 12edo nominals from A4.
  tuningFreq: 440 // Hz
}
```

Note that accidentals in one chain are mutually exclusive. That is, you cannot have two different accidentals within the same chain applied to the same note. Following this e.g., you can't have flat and sharp on one note at the same time.

Declaring the chain of accidentals sets the search space of the stepwise 'up/down' action such that only the declared accidentals are regarded. (too many declared accidentals/chains/nominals will cause lag / OOM)

When declaring cent intervals of nominals & accidentals, state to as many decimal places as possible. At least 3dp, recommended > 4dp. This is to reduce floating point errors.

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
   - If the new note affects a succeeding note/grace note's accidental implicitly, attach explicit accidentals to the succeeding note **before** the current note is modified.
   - If the new note agrees with the prior accidental/key signature, flag that no explicit accidentals are needed on the modified note.
   - If the new note has a side effect of making explicit accidentals of a succeeding note/grace redundant, flag the succeeding note for later accidental removal.
4. Update the note using to reflected changes to the new note
   - Calculate new `note.line` by subtracting old nominal from new nominal.
   - Assign `note.line`
   - Use `setAccidental` to set the note.
   - Assign `note.line` AGAIN (to fight against MuseScore's score update)
5. Remove redundant accidentals on flagged notes.
6. Apply the same method as `tune.qml` to tune all the notes in selected bars (including the unselected parts of the last bar).

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

### Accidental Support

This plugin only intends to support/use accidentals that are regarded as 'Symbols'

This means, the usual accidentals from the "Accidentals" palette will not be used and ignored.

Accidentals used by this plugin are to be from the "Symbols" category in the Master Palette, and these symbols are the complete list of SMuFL symbols available, which is more exhaustive than MuseScore's "officially supported" accidentals.

The reason for this decision can be explained with the following case study:

On beat 1: enter a Db with an official flat symbol

Beat 2: enter a D sagittal 7 comma up via the "symbols" palette

Beat 3: enter the same D 7 comma up but using the "officially supported" accidental symbol from the Accidentals palette.

To the plugin, the second note will appear as Db with a 7 comma up symbol. This is because MuseScore does not naturalize a note if the symbol attached to it isn't regarded as an accidental.

The third note will appear as a D natural internally, with a 7 up accidental attached to it as a legitimate accidental.

However, logically speaking, by default, an accidental present should override any prior accidentals. Let's say we account for this and tune the second note 100 cents sharper to account for the 'phantom' flat accidental.

Now, if the second note were to actually instead be a Db with both the flat and sagittal symbols attached to it, the internal representation of the note would be exactly the same as a D without the flat, because internally, the prior Db on beat 1 affects the TPC of the second note.

This means that in this scenario, the two different notes would be indistinguishable and impossible to tell apart.

And there is simply no way for this plugin to tell apart whether that note should have been a Db or a D.

For this reason, this plugin will not aim to support standard MuseScore accidentals and will always use SMuFL symbols from the "Symbols" category of the Master Palette.

### Tokenizing of explicit accidentals

Let's continue the example using the same tuning system as above with two accidental chains, 7 nominals, and tuning note set to A4.

Here's an example of the parsing of `Ebbbb\\4`. Let's assume that the first double flat is a Full Accidental, and the second double flat is a Symbolic Accidental. (You cannot have more than one Full/Half Accidentals on the same note) The double flat is accidental code 6.

Let's also assume that the comma down is the `accidentalArrowDown` SMuFL (Gould arrow) symbol, which looks like an arrow pointing straight down. Let's say it is represented by accidental code 34 (not finalized yet).

Hence, this note's `tpc` is 3 (E double flat), and it has three Symbolic Accidental attached under the `elements` property. In no particular order: double flat, comma down, comma down.

Note that this plugin does not factor the order of appearance of accidentals. That is, `Ebbbb\\` is the same as `E\bb\bb`.

The `tokenizeNote()` function 'tokenizes' the MuseScore Note element to output the following `MSNote` object:

```js
// MSNote
{
  midiNote: 62, // playback pitch is D4 (Ebb)
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
    midiNote: 62, // D4 (Ebb)
    tpc: 4, // Ebb is 4
    nominalsFromA4: -3, // E4 is 3 nominals below A4.
    accidentals: null, // no explicit accidentals
    tick: 480, // tick position of note
    line: 3, // Note.line property (not actual value, just an example)
    internalNote: Ms::PluginAPI::Note // internal MuseScore Note object
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

### Cents offset calculation

To calculate the tuning offset to apply to a note, we calculate the xen interval from the reference note, and the 12edo interval from the reference note, then we subtract the 12edo cents from the xen cents to get the offset.

```js
function calcCentsOffset(noteData, tuningConfig) {
  // lookup tuning table [cents, equavesAdjusted]
  var cents_equaves = tuningConfig.tuningTable[noteData.xen.hash];

  // calc cents (from reference note) of XenNote spelt in equave 0
  // remember to include equave offset (caused by equave modulo wrapping)
  var xenCentsFromRef = cents_equaves[0] + cents_equaves[1] * tuningConfig.equaveSize;

  // apply NoteData equave offset.
  xenCentsFromRef += noteData.equaves * tuningConfig.equaveSize;

  // calculate 12 edo interval from reference
  var standardCentsFromRef = 
    (noteData.ms.midiNote - tuningConfig.tuningNote) * 100;

  // the final tuning calculation is the difference between the two
  return xenCentsFromRef - standardCentsFromRef;
}
```

Because of all the lookups, tuning a note is O(1) and should be performant.

### Choosing the next note

In `(aux) up/down.qml`, the plugin should be able to choose the next stepwise note up/down from the current given note.

The `chooseNextNote()` function returns a list of `[XenNote, nominalOffset]` tuples of enharmonically-equivalent spelling options for the next stepwise note.

### Accidental display order

As part of `up/down/enharmonic.qml`, the plugin should be able to create, modify and delete accidental symbols and attach them to the note.

The accidentals should appear in the order which the user declared them.

- Sort right-to-left in order of accidental chain declaration. Right-most symbols (closest to the notehead) belong to the first accidental chain.
- Ligatured symbols take the place of the highest-priority accidental chain included in `regarding` (they should take the place of the right-most symbol it replaces)
- Multi-symbol accidentals appear left-to-right in the order the user declared them.
  - E.g. `b./` should appear as flat on the left, up arrow on the right.

If multiple enharmonic equivalents are available, the plugin should choose the enharmonic spelling with the least number of symbols.

### Updating a note

In `(aux) up/down.qml` and `enharmonic.qml`, the plugin should be able to update the note's `line` (nominal) and `accidentalType` properties, and update attached symbols in `note.elements`.

This is a VERY involved process:

- Choose an appropriate spelling for the new note (`NextNote`)
- Obtain the proper ordering of `AccidentalSymbols` from `XenNote.orderedSymbols` object
- Ensure the modified note does not affect subsequent notes. Aggressively add explicit accidentals on all notes in the bar that share the same `Note.line` of the original & modified note.
- Update symbols attached to note, update `Note.line`
- At the end of each bar (or selection), remove extraneous explicit accidentals (only if config doesn't specify to keep them in case the user wants to do some post-tonal 23rd century stuff)  The `BarState` object comes in handy as it sorts notes by order of appearance.
- Then, process each tick-chords in the bar into a list of `Chords` objects. Each `Chords` object represents the chords & grace chords of all 4 voices at a single tick position.
- Use the `Chords` object to auto position accidentals.

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

`lig(1,2)` signifies that the plugin should perform search-and-replace for exact matches regarding the 1st and 2nd accidental chains only (which are apotomes and 5-commas respectively).

`1 3 23` signifies that the ligature `SHARP_THREE_ARROWS_UP` (SymbolCode 23) is to be applied to replace the symbols that compose the degrees 1 and 3 for the 1st and 2nd accidental chains respectively.

> :warning: The ligature degrees must be stated in order of which the accidental chains are declared in the ligature. If you specify `lig(2,1)` in the first line instead, then `1 3 23` denotes degree 1 for the **second chain**, and degree 3 for the **first chain**.
>
> **You cannot reuse Symbol Codes** that are already being used in any accidental chain. Each symbol of a ligature must be unique from symbols in other ligatures and accidentals.

This means that if some note has an accidental vector of `[1,3,2]` (sharp + 3 syntonic commas + 2 7-commas). The plugin will find that there is an exact match in the 1st and 2nd chains of `[1,3,2]` to the `1 3` ligature vector, and thus the `1 3` part gets ligatured as SymbolCode 23 (`SHARP_THREE_ARROWS_UP`).

Hence, the resulting combination of symbols on the note should be sharp-3-arrows (`[1, 3, 0]`) + 2 7-commas up (`[0, 0, 2]`) = `[1, 3, 2]`.

You can also specify Text Codes in place of SymbolCode numbers (e.g. `#^3` instead of `23`).

If you require a ligature that consists of more than one symbol, separate `SymbolCode`s with a dot (`.`). E.g., `1 3 #.^3` will ligature `[1,3,2]` into `SHARP` + `NATURAL_THREE_ARROWS_UP` + 2 7-commas up. (Though, this is an impractical example).

> :warning: Note that ligatures are not a replacement for specifying symbols for each degree in accidental chains. You can only apply ligatures to degrees in a chain with symbols assigned to them.

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

This will effectively tell the

### Ligature implementation

If ligatures are defined, these will add additional entries to the `NotesTable` when there is an exact match in the degrees of the `AccidentalVector` regarding `considered` accidental chains.

A ligatured entry will contribute additional `XenNote` spellings pointing to the same `AccidentalVector` (+ other lookup entries). There's no need to worry about this many-to-one map because there is no need for an inverse mapping.

With these additional lookup entries, a ligatured spelling is implemented simply as an 'enharmonic spelling', and ligatures can be toggled with the enharmonic cycling operation.

When creating/managing accidentals during up/down operations, this plugin favours spellings with lesser symbols. If for whatever reason, a ligatured spelling has more symbols than an non-ligatured one, the plugin will not automatically use the ligatured spelling. Thus, it only makes sense to define ligatures if the ligatured spellings will always have fewer symbols than the non-ligatured one.


## Auto-positioning & layout

This section describes the methodology of auto-positioning accidentals. This plugin will try its best to position accidentals. However, being a very ambitious project, this is an experimental feature and needs much feedback, testing & help from the community.

### 0. Auto-positioning case study

The auto-positioning function regards all chords at the same tick position at once. Thus, we only need to care about the positioning of accidentals one tick at a time.

Here are the non-positioned and positioned versions juxtaposed:



### 1. Read chords at given tick

First, we need to gather all the chords with the same tick position into one `Chords` data structure. In a similar spirit to `BarState`, the purpose is to allow for easy traversal of chords for the purpose of auto-positioning.

The `Chords` splits chords by voice. Within each voice, the main chord is separated from the grace chords. The index of the grace chords are synced across all voices right-to-left.

To give an example, let's say voice 1 and 2 have chords + grace chords at the same tick; voice 1 has 2 grace chords and voice 2 has 1 grace chord. 

The generated data structure will look like this:

```js
{
  1: {
    0: [Chord1, Chord2],
    1: [Chord3]
  },
  2: {
    0: [Chord4]
  }
}
```

### 2. 

## Data Structures

#### `SymbolCode`

```js
number
```

A number representing a uniquely identifiable accidental symbol. A single symbol code maps to all MuseScore accidental enums/SMuFL IDs that looks identical.

[See list of symbol codes](https://docs.google.com/spreadsheets/d/1kRBJNl-jdvD9BBgOMJQPcVOHjdXurx5UFWqsPf46Ffw/edit?usp=sharing)


#### `AccidentalSymbols`

```js
{
  SymbolCode: number,
  SymbolCode: number,
  ...
}
```

Represents accidental symbols attached to a note. Each entry is the SymbolCode of the symbol and the number of times this symbol occurs.

The keys are NOT ORDERED.

The keys are in left-to-right display order as per [accidental display order](#accidental-display-order) determined by Tuning Config.

This object can be hashed into the `AccidentalSymbols.hash`, which can be appended to a nominal number to produce the `XenNote.hash`. The hashed symbols list is sorted by increasing `SymbolCode`.

#### `MSNote`

```js
{
  midiNote: number, // `Note.pitch` property
  tpc: number, // `Note.tpc`
  nominalsFromA4: number, // number of 12edo nominals from A4.
  accidentals?: { // AccidentalSymbols
    // Explicit accidental symbols attached to this note.
    // Not ordered.
    SymbolCode: number,
    SymbolCode: number,
    ...
  },
  tick: number, // tick position of Segment that this note is attached to.
  line: number, // `PluginAPI::Note.line` property.
  internalNote: PluginAPI::Note // official MuseScore note object
}
```

Represents a tokenized MuseScore note element.

If no explicit accidentals are present, `accidentals` is null.

`midiNote` contains the default playback pitch (MIDI note) that MuseScore will use for this note.

Use `getTick(note)` to get value of `tick`.

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

  // How to spell the accidental in proper left-to-right order
  // If no accidentals, orderedSymbols is an empty list [].
  orderedSymbols: [SymbolCode]

  accidentals?: { // AccidentalSymbols
    // The spelling of this note according to symbols present.
    // Both Implicit & Explicit accidentals must be represented.
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

The `accidentals` object is not sorted. When creating/displaying an accidental, use `orderedSymbols` to iterate each symbol in left-to-right order.

If `accidentals` is null, represents a nominal of the tuning system (note without accidental).

The `hash` string is to save performance cost of JSON.stringify and acts as a unique identifier for this `XenNote`.

`"<nominal> SymbolCode <degree> SymbolCode <degree> ..."`

The `SymbolCode`s in the hash string must appear in increasing order.

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
  symbolsUsed: [SymbolCode], // lists all unique symbols used in this chain.
  tunings: [number], // tuning of each accidental in cents. Central elemnent is 0.
  centralIdx: number, // the index of the central element.
}
```

Represents a user declared accidental chain.

Each element of `degreesSymbols` is a list of `SymbolCode`s containing the symbols composed together to represent one degree in the accidental chain (in the order of which the user declared)

The accidental degree of the chain represented by `degrees[n]` and `tunings[n]` is equal to `n - centralIdx`.

`symbolsUsed` is used to determine what symbols are used in this accidental chain. It's not really necessary in this implementation (yet), but is provided as a lookup just in case.

#### `Ligature`

```js
{
  regarding: [number], // acc chain indices (starting from 0)
  ligAvToSymbols: {
    // Search & replace map AccidentalVector -> SymbolCode
    LigAccVector: [SymbolCode],
    LigAccVector: [SymbolCode],
  },
}
```

Represents a ligature declaration.

`regarding` is an unordered set representing which n-th accidental chains to consider when searching for exact `AccidentalVector` matches. (The indices are 0-based)

`LigAccVector` is a subspace of `AccidentalVector` which corresponds to the respective accidental chains included by `regarding`.

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

#### `KeySig`

```js
[
  AccidentalSymbols.hash?,
  AccidentalSymbols.hash?,
  AccidentalSymbols.hash?,
  ...
]
```

Contains a list of N `AccidentalSymbol` hashes, where N is the number of nominals in the tuning system.

The Xth hash represents the accidental symbol(s) to be applied by the key signature for the Xth nominal. The first hash corresponds to the nominal as stated by the reference tuning note. E.g. if `G4: 440` is used, then KeySig[0] will be the accidental that applies to G, KeySig[1] applies to A, etc...

If no accidental is to be applied on the nominal, the entry should be null.

**The list is to contain N hash/null entries at all times.** However, because it is impossible to validate whether a `KeySig` declaration has the right number of nominals, validation checks have to be done before attempts to look up the `KeySig`.

#### `ConfigUpdateEvent`

```js
{
  tick: number, // MScore tick, when the config is to be applied
  config: {
    // key-value pairs that will be assigned to the `parms` object
    // when the cursor passes/reaches the given `tick`
    "<keyName1>": value1,
    "<keyName2>": value2,
    ...
  }
}
```

This object represents a single `parms` configuration update event that is to be executed when (or after) the cursor reaches `tick` position.

The purpose of the config update event is to update `TuningConfig`, `KeySig`, and other settings on a staff-by-staff basis. System Text config annotations will be visible on all staves and Staff Text annotations will be visible on the staff that it is on.

This allows the plugin to support multiple simultaneous & changing tuning systems and changing key signatures etc... since every config is applied according to when it is placed in the score.

A list of `ConfigUpdateEvent`s sorted by increasing `tick` will be created at the start of running the plugin.

E.g.: If a new key signature is to be applied at tick 1760 in the current staff:

```js
{
  tick: 1760,
  config: {
    currKeySig: KeySig // key sig obj to be applied
  }
}
```

#### `parms`

```js
{
  bars: [number], // tick of each new bar
  staffConfigs: {
    // Contains list of ConfigUpdateEvents for each cursor.staffIdx number
    staffIdx: [ConfigUpdateEvent],
    staffIdx: [ConfigUpdateEvent],
    ...
  },
  currKeySig: KeySig?, // current key signature being applied
  currTuning: TuningConfig,
  currAux: TODO,
  currExplicit: TODO,
}
```

`parms` represents the global state object of the plugin.

This contains a list of timed configs for each staff, sorted by increasing tick.

The `ConfigUpdateEvent`s will modify properties of `parms` over time to reflect the current configurations applied to the current staff (`cursor.staffIdx`) to apply at current cursor position.

#### `SavedCursorPosition`

```js
{
  tick: number, // Saved Cursor.tick
  staffIdx: number, // Cursor.staffIdx
  voice: number, // Cursor.voice
}
```

Represents a saved `MS::PluginAPI::Cursor` position created by `saveCursorPosition(Cursor)`.

Cursor position can be restored with `restoreCursorPosition(SavedCursorPosition)`.

#### `NextNote`

```js
{
  xen: XenNote, // XenNote object of the new note.
  nominal: number, // Nominal of the new note.
  equaves: number, // Equave of the new note (from reference note)
  lineOffset: number, // Amount to change `Note.line` by
  matchPriorAcc: boolean, // whether new accidental can be made implicit
}
```

Return value of `chooseNextNote()` function. Contains info about what the plugin chooses to provide as the 'next note' during the up/down/enharmonic cycle operations.

#### `BarState`

```js
{
  // on staff line 4
  -4: {
    // at tick 1000
    1000: [
      // Grace Chords + Chords in voice 0
      [
        [Note, Note], // grace chord 1
        [Note], // grace chord 2
        ...,
        [Note] // main Chord.
      ],

      // voice 1 has no notes.
      [],

      // voice 2 has notes
      [[Note, Note], [Note], ...],

      // voice 3 has no notes
      []
    ],
    // at tick 2000
    { 
      etc... 
    }
  },
  // On staff line -1
  -1: {
    etc...
  }
}
```

Return value of `readBarState()`. This object is helpful checking accidental-related things as it presents notes on a line-by-line (nominal) basis, with notes properly sorted by order of appearance.

The tick-notes mappings on each line can be sorted by tick, and each (grace) chord can be traversed in proper order of appearance.

#### `Chords`

```js
```

## Functions

I list the most useful functions here, but you can find the rest in the source code.

There's JSDoc documentation for the functions in `fns.js`.

#### `tokenizeNote`

Reads a MuseScore `PluginAPI::Note` object and tokenizes it into `MSNote`. Use this to retrieve symbols on a note & its nominal offset from the reference note.

#### `parseNote`

Reads a MuseScore `PluginAPI::Note` object and parses it into `NoteData`. Use this to retrieve the effective `XenNote` spelling of a note, taking into account prior accidentals via `getAccidental()`, current `KeySig` and `TuningConfig`.

#### `getAccidental`

Retrieve the accidental symbol that applies to a note/staff line at a given tick. Has settings to include or exclude accidentals on the note being checked itself.

#### `tuneNote`

Updates `Note.tuning`. If the tuning amount is too large, will also update `PlayEvent`s of a `PluginAPI::Note` object so that the timbre of the playback is not off.

#### `executeTranspose`

Moves a `PluginAPI::Note` stepwise up/down, or enharmonically cycles the note. This function will aggressively add explicit accidentals to following notes that may be possibly affected by this operation.

#### `removeUnnecessaryAccidentals`

Removes unnecessary explicit accidentals created by the plugin or the user from a range of specified bars in one staff.
