# Dev Notes

## How to dev

- Use an editor/IDE with JSDoc support. Makes autocomplete much better and reduces the chances of typos/null pointers. (VSCode was used)

- Update `types.js` if there are any changes to the data structures of objects.

- Almost everything is in one file: `fns.js`

## Important quirks of QJSEngine

- ECMA 5 only. Maybe even older.
- `char` is **not** a valid variable name.
- Semicolons are **compulsory**

----

# Version 0.2

One of the main issues of the v0.1 plugin is that every accidental vector in the tuning config must be permuted for all nominals to populate the tuning config. This is really only necessary if the user wishes to use the up/down transpose feature with these symbols.

However, when writing in HCJI/large tunings, it's common that there are some symbols which are 'secondary' and used less frequently.

Also, in v0.1, the handling of fingerings is very hacky. The plugin needs a better way to handle fingerings that can regard them as accidentals.

## Feature plan

### Add comments in tuning config

```txt
// this is comment

A4: 440
0 200c 300c 500c 700c 800c 1000c 1200c
bb b (100c) # x // also comment
'--' '-' (20c) '+' '++'
// this is a comment
```

### ASCII Accidentals

Fingering annotations should be able to function just like SMuFL symbols. The plugin should allow the user to define ASCII accidentals in the Tuning Config alongside Symbol Codes.

For example:

```txt
A4: 440
0 200c 300c 500c 700c 800c 1000c 1200c
bb b (100c) # x
'--' '-' (20c) '+' '++'
```

The above example defines the second accidental chain to comprise fingerings containing plus/minus characters

Due to restrictions of tuning config parsing, spaces cannot be used inside an ASCII fingering.

The Z-index of ASCII accidentals will be changed to match the Z-index range of standard symbol accidentals so that they will be auto-placed together with other symbols in the correct user-defined order.

⚠️ **This will break tuning configs made for v0.1**. Because of the new syntax, **backslashes and single quotes must be escaped** when declaring Symbol Codes/Text Codes/ASCII accidentals in a tuning config.

To differentiate accidental fingerings from standard fingerings/JI ratios/cent offset annotations, a processed ASCII accidental fingering element will have Z-index between 1000 and 2000. That way, `getAccidental` will simply search for any fingerings with Z-index between 1000 and 2000, and immediately regard them as accidentals. This allows `getAccidental` to remain stateless.

The plugin [does this processing of ASCII accidentals automatically](#verbatim-ascii-accidental-entry)

### Restrictions on ASCII Accidentals

- Cannot be purely numerical, otherwise the plugin will parse them as symbol code IDs.
- Cannot have spaces

### Secondary Accidentals

Once all primary symbols/fingerings have been matched to form the main XenNote hash, the secondary symbols are remaining symbols that are not part of the main Tuning Space.

Because they are not part of a XenNote, we cannot access them via up/down operations, however we can input secondary symbols using fingering text or by dragging additional symbols from the Master Palette.

A secondary accidental can only have a single interval size. They can be stacked as many times as needed, providing a way to extend accidental chains to infinity.

They can be used to add higher-limit accidentals that need not be part of any accidental chain.

If ASCII-to-Symbol conversion is not desired, we can declare secondary symbols like this:

```txt
A4: 440
0 200c 300c 500c 700c 800c 1000c 1200c
bb b (100c) # x
'--' '-' (20c) '+' '++'
sec()
'#'.# 250c // secondary sharp ASCII and symbol together
# 100c // secondary sharp symbol
'#' 100c // secondary sharp ASCII
```

The plugin greedily matches symbols in the order that they are declared.

For example, let's say we have a note that contains 3 ASCII sharp symbols and 2 SMuFL sharp symbols:

1. The 1st SMuFL sharp symbol will match the first accidental chain (100c)
2. The 2nd SMuFL sharp symbol and 1st ASCII symbol will match first secondary accidental (250c)
3. The remaining 2nd and 3rd ASCII symbols will match the third secondary accidental (100c each)

...which results in a total 550c offset.

By default, secondary accidentals will not be removed/modified when the user uses up/down operations on a note. However, this should be a user-configurable boolean flag.

### ASCII to Symbol conversions

We can also use secondary accidental declarations to declare how ASCII accidentals convert into SMuFL symbols. Because of this, secondary symbols opens up the possibility of user-configurable methods of entering accidentals via fingerings.

```txt
A4: 440
0 200c 300c 500c 700c 800c 1000c 1200c
bb b (100c) # x
'--' '-' (20c) '+' '++'
sec()
'#' # 100c
'd' b -50c
```

In the above example, we define 2 secondary accidentals + ASCII conversions. One on each line.

In these two declarations, the symbol and ASCII variants are declared together in the same line. This syntax means that we want the plugin to always convert the ASCII variant into the SMuFL variant upon processing the fingering text.

Note that during the conversion process, the value of the accidental can change. E.g. if we input 'd' as ASCII verbatim in fingering text, this will be rendered into the SMuFL flat (b) symbol, which instead signifies -100c instead of -50.

However, if we type render 'dd' instead, both of which will be converted into flat symbols, the second flat symbol is in fact not part of any accidental chain, because the accidental chain only defines a single flat symbol.

This means that after typing 'Cdd' as an accidental, this will be converted to the XenNote 'Cb', with an extra flat-symbol secondary accidental. The flat symbol corresponds to -100c, and the secondary flat-symbol will correspond to an additional -50c, which means this note is 150c below C.

When we're declaring ASCII to symbol conversions take note of what you can and can't do:

- Unlike declaring a secondary accidental, the ASCII accidental to be converted must be fully ASCII and cannot be a hybrid accidental like `'>@'.#`.
- [Restrictions on ASCII accidentals](#restrictions-on-ascii-accidentals) apply
- If a main accidental chain contains an ASCII accidental that is also declared as a converted secondary accidental, the main accidental chain will match first, eating up the ASCII accidental. Remaining identical ASCII accidentals will then be converted.
- If ASCII accidentals take the form of another fingering syntax (e.g. cent offset, JI ratio tuning, or accidental vector entry mode), those fingering annotations will no longer work and will instead be parsed as ASCII accidentals.
- It is possible to convert from ASCII to ASCII/Hybrid/SMuFL. The 'convert-from' text is merely a user-configurable representation of what you would like to enter when typing it in as ASCII. For example, if you have declared some obscure accidental degree which goes like `'hello world'.#.'123abc'.^./`, and you find that really hard to key-in, you can declare an ASCII conversion to configure a short-hand, e.g.:

```txt
A4: 10000
0 1c 2c 3c
'bye world'.b.'987zyx'.v.\\ (100c) 'hello world'.#.'123abc'.^./
sec()
'/hw' 'hello world'.#.'123abc'.^./ 420c
```

This declares that you want the plugin to convert the fingering that goes `/hw` into that long chain of symbols and fingerings. Note that the first instance of the obscure accidental will be parsed as degree +1 of the first accidental chain, which gives it the value 100c. Only subsequent instances of the obscure accidental will be parsed as the secondary accidental.

`/hw` itself will have no value, as the plugin will assume that all instances of the shorthand would have been converted during the `renderFingeringAccidental()` function already.

### How to input verbatim ASCII

To input ASCII accidentals as fingerings directly, the Tuning Config must declare ASCII to ASCII symbol conversions as secondary accidentals. It's not possible for the plugin to figure out what strings should match first in order to prevent the wrong symbols from being entered from a single ASCII verbatim input.

#### :warning: WARNING: Extreme complexity

The issue with implementing secondary accidentals is that it greatly increases the complexity of not only development &mdash; Users who want to take advantage of the new ASCII accidentals, verbatim ascii input, and secondary accidental features must know how the plugin parses these tokens and understand how to declare them correctly and in the correct order.

For example, there IS a difference between declaring the accidental chain:

```txt
'-' (20c) '+' '+'.'+'
```

and:

```txt
'-' (20c) '+' '++'
```

In the first case, the two 'plus' symbols are rendered as separate fingering elements, but in the second case the '++' is a single fingering element containing both pluses.

Now consider adding the following secondary accidental:

```txt
sec()
'+' 21c
'++' 41c
```

The question is: how does the plugin differentiate between the secondary accidentals and the single-element vs multi-element versions of the ASCII plus signs?

How should the user enter the symbols as verbatim ASCII fingering text while having the plugin discern whether the plus is to be regarded as a single-element primary accidental, a multi-element primary accidental, a secondary accidental, or even part of a hybrid accidental?

It's really an impossible task where different notation systems will have different goals.

As such, verbatim accidental entries must be **MANUALLY MAPPED**. Even if the entire accidental degree comprises plain ASCII symbols, every ASCII-to-Symbols conversion must be manually stated in the `sec()` declaration.

Because it is manually mapped, the user can choose to decide which patterns have greater priority. For example, if we declare:

```txt
sec()
'++' '++' 50c
'+' '+' 20c
```

Now the plugin knows that we need to first match consecutive double plusses in the verbatim accidental input string. These consecutive double plusses will then be mapped to the `'++'` ASCII accidental token.

Now, if the user were to enter `'+++'` as the verbatim input, the plugin will first match the first two plusses as the `'++'` token, and the third plus will be matched as the `'+'` token.

Likewise: `'++++'` will be processed as `'++'.'++'`.

`'+++++'` will be processed as `'++'.'++'.'+'`.

However, if we merely declare:

```txt
'+' '+' 20c
```

...then, `'++'` will be processed as `'+'.'+'`, and `'+++'` will be processed as `'+'.'+'.'+'`, etc...

Now for the final blow:

```txt
'+++' j+.'++' 70c
'++' '+'.t 50c
'+' '+' 20c
```

This declares that 3 consecutive pluses gets converted to one Johnston plus symbol on the left followed by an ASCII double-plus on the right.

2 consecutive pluses gets converted to one ASCII plus on the left followed by a Stockhausen quarter sharp on the right.

Evidently, this allows the user to choose exactly how they want to enter their verbatim accidentals and how it gets converted, be it to ASCII, Symbols or Hybrid accidentals.

Once the ASCII input is processed, they get tokenized into `SymbolCode`s, and the `readNoteData` function will match these `SymbolCode`s based on the tuning config to figure out which ones will contribute as primary accidentals to affect the `XenNote` TPC spelling, and which ones are secondary accidentals.

The user must know how to declare the appropriate conversions, and must know that if conversions are not declared, then there will be no way of entering ASCII accidentals verbatim via fingering text. However, even without conversions, if ASCII accidentals are part of the primary accidental chains of a Tuning Config, they can still be accessible via up/down/J operations.

## How to implement v0.2

### Changes to data structures

There are some changes we need to make to internal data structures to support ASCII & hybrid accidentals.

#### `SymbolCode` v0.2

`SymbolCode`s can now be either a number or a string. `SymbolCode`s of ASCII symbols are represented as strings with a quote (`'`) prefix.

E.g. SymCode `3` is the triple sharp "#x" symbol, whereas SymCode `"'3"` is literally an ASCII '3' symbol.

This is to differentiate numerical ASCII accidentals from actual `SymbolCode` numbers. (JavaScript doesn't discriminate type of object keys)

#### `XenHash` v0.2

The above change effected on `SymbolCode` affects this data structure as well.

For example, nominal 0 with a flat symbol and an ASCII 'b' will have its `XenHash` looking like this: `0 6 1 'b 1`.


#### `AccidentalSymbols` v0.2

Similar to `XenHash`, symbol code keys in the `AccidentalSymbols` object will be prefixed with a quote (`'`) to signify that the symbol is an ASCII symbol.

```js
{ // AccidentalSymbols
  6: 1, // one SMuFL flat symbol
  "'b": 1 // one ASCII 'b' symbol
}
```

#### `MSNote` v0.2

`MSNote.accidentals` will now include ASCII accidentals (differentiated by having 1000 &le; Z index &le; 2000).

`MSNote.fingerings` will contain only non-accidental fingerings.

### Order of operations

There's a lot going on with the verbatim ASCII fingering accidental entry and the new secondary accidental thing. Here's a big-picture overview of what happens:

- User uses a verbatim accidental fingering to input accidentals on a note.
- `renderFingeringAccidental()` will convert this verbatim fingering into a `SymbolCode` array, tokenizing individual symbols and fingering accidental elements.
- These SymbolCode elements are matched by `readNoteData()`, which breaks down the Symbol/Fingering elements into primary and secondary accidentals.
- The primary accidentals affect the `XenNote` spelling.
- The secondary accidentals do not.

### Verbatim ASCII accidental entry: `renderFingeringAccidental()`

In v0.1, we can drag symbols from the Palette to enter symbols verbatim. In the same way, we need to support verbatim entry of ASCII accidentals via fingering text.

The parsing & rendering of accidentals input as fingerings is done in the `renderFingeringAccidental()` function.

This function parses:

- Accidental vector fingerings `a<x>,<y>,<z>,...`
- Verbatim fingerings

Accidental vector fingerings are trivial to parse and already implemented.

The parsing for verbatim fingerings isn't that bad thanks to the aforementioned constraint on how [ASCII conversions for verbatim entry must be manually declared](#warning-warning-extreme-complexity).

However, care must be taken to splice the search-and-replace string after every match.

For example, let the verbatim input be: `abcde`, and we declare that `bc` maps to `X` and `ad` maps to `Y`.

If we simply search-and-remove `bc` from `abcde`, we get `ade`, and it appears as if `ad` is now part of the verbatim string.

However, that is not the case at all, as `a` and `d` are clearly supposed to be two separate entities.

This means that the search-and-match process should work like this:

```txt
Assume we start with 'aefbcdefbcg' verbatim.
Assume we declare the search and replace in this order:

bc => X
ef => Y
a => A
d => D
g => G

abcdefg -> aef, X, def, X, g
aef & def -> a, Y & d, Y
a -> A, d -> D, g -> G

result: GDAYYXX
```

The method would be to split the string at every match. Then, every search string will be searched over the list of split strings, further splitting the strings. Once a string reaches 0 length, it is removed.

This is repeated until every `asciiToSmuflConvList` search string has been searched for.

Also, there should be two possible behaviours that the user can select using some boolean flag:

The default behaviour would be to delete old accidental symbols & fingerings, and replace them with the ASCII-entered text.

The second behaviour would be where prior accidentals are preserved and the newly entered accidentals add to the existing accidentals.

Once the ASCII verbatim accidental entry is parsed, 

### New tokenizing & parsing method

Now that there are all sorts of symbols in various forms, figuring out how to parse accidentals attached to a note has got a lot harder.

First, the old approach of consolidating all the symbols into one AccidentalSymbols object and looking that up the NotesTable to retrieve the XenNote will simply no longer work.

First, when we tokenize a note, we can assume that all fingering and symbol accidentals have been rendered down into individual fingering/symbol elements with Z-index ranging 1000-2000. The tokenizer will search all fingering and symbol elements with Z-index 1000-2000, and yield the `AccidentalsSymbols` object containing all these symbols + fingerings.

This also applies to the new `getAccidental` function, which will now return all supported symbols in the spreadsheet & fingerings with Z-index between 1000 and 2000, even if the symbol/fingering is not part of the tuning config. (This means that a non-recognized symbol will function like a natural sign. By default, fingerings have Z-index 3900, so they shouldn't affect reading accidentals)

After tokenizing, we need to parse.

- Filter out all symbols that are not in `TuningConfig.usedSymbols` or `TuningConfig.usedSecondarySymbols`. We shall refer to this as the filtered `AccidentalSymbols` object.
- This filtered `AccidentalSymbols` object acts as a tally of which symbols have yet to be matched.
- If invalid/unrecognized symbols are present, the plugin will silently ignore them, as the matching is done on a best-effort basis.
- First we need to populate the `primaryAccidentalSymbols`. The nominal of this note and the primary symbols come together to form the `XenHash` that can be looked up in the tuning config.
- Iterate one accidental chain at a time, in the order the chains were declared. For each chain:
  - Iterate the `degreesSymbols` of the chain.
  - Find the degree that matches the most number of symbols in the filtered `AccidentalSymbols` object.
  - Call it a match, and update the `primaryAccidentalSymbols` to include the matched symbols.
  - Subtract the matched symbols from the `AccidentalSymbols`.
- Next, we need to populate the `secondaryAccidentalSymbols`. These symbols do not affect the `XenNote` xen pitch class, but they do affect the pitch and can carry over to the next note as they return from the `getAccidental` function.
- Iterate each secondary accidental in the order they were declared. For each secondary accidental:
  - Match as many symbols as possible from the filtered `AccidentalSymbols` object.
  - Keep track of how many times the symbols were matched. Note that a single secondary accidental can comprise multiple symbols of different forms (e.g. hybrid ascii + smufl).
  - Append to the `secondaryAccidentalSymbols` object the `AccidentalHash` that was matched, and the number of times it was matched.
  - The `AccidentalHash` can be looked up in `TuningConfig.secondaryTunings` to get the cent offset effected by the secondary accidental.
  - Subtract the matched symbols from the `AccidentalSymbols`.

Once all declared `AccidentalChains` are matched, then we parse the rest as secondary accidentals, and we perform the same search-and-replace in the order which the user has declared the secondary symbols.

Any remaining symbols after searching and tokenizing everything are simply ignored.

### Accidental display order

There are two halves of accidental display. First, the primary `XenNote` accidental display order is the same as in v0.1. Those are RTL in order of declarations of accidental chains, and each symbol of a multi-symbol/element accidental is LTR in the user-defined order.

Next, there are the secondary accidentals. These are to be displayed in right-to-left order in the order that the user declared the secondary accidentals.

The first declared secondary accidental is to be immediately to the left of the left most accidental from the primary accidental chain, or if there are no primary accidentals, then simply it will be the right-most accidental.

# Version 0.1

## Case Study/Example

This tuning system/staff text specifies a 315-note subset of 2.3.5 JI:

```txt
A4: 440
0 203.910c 294.130c 498.045c 3/2 792.180c 16/9 2/1
bb.bb 7 bb b (2187/2048) # x 2 x.x
\.\ \ (21.506c) / /./
```

- `A4: 440`
  - Chooses the 12edo nominal A4 as the reference note, sets A4 to 440hz.
  - Because of how this plugin works, the tuning note must be without accidental (it has to be a nominal)
  - **Do not suffix this line with 'hz'**
- `0 203.91 294.13 498.04 701.96 792.18 996.09 1200`
  - Sets a cycle of 7 nominals extending upwards/downwards from A4.
  - Can specify ratios or cents (suffixed by c). Numbers can be javascript expressions.
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
  tuningFreq: 440, // Hz
  usedSymbols: {
    // if a Symbol Code appears in this lookup, it is used by the tuning config.
    7: true,
    8: true,
    6: true,
    ...
  }
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

`operationTune`:

1. Parse tuning text annotation to construct the 'TuningConfig`.
2. Using key signature annotations, implicit & explicit accidentals, calculate the effective accidental applied on to a note. Explicit > implicit > key signature.
3. Calculate cents interval (from tuning note) of the original 12edo note.
4. Look up the `TuningConfig` for cents interval (from tuning note) for microtonal tuning.
5. Subtract the xen tuning cents from the original cents to get the cents offset.
6. Apply cents offset.

`operationTranspose` (up/down):

1. Parse tuning text annotation to construct the `TuningConfig`.
2. The up/down operation should move the current selected note(s) stepwise to the nearest `XenNote` in the `TuningConfig` that is **not** enharmonically equivalent. It should also choose the enharmonic spelling with the minimal number of required explicit accidentals.
   - Explicit accidentals are aggresively created to prevent the modified note from affecting succeeding notes' accidentals.
   - At the end of each bar/selection remove unnecessary accidentals within a bar.
   - At the end of each bar/selection, auto-position accidentals & fix colliding symbols & grace notes.
3. Update the note using to reflected changes to the new note
4. Apply the same method as `tune.qml` to tune all the notes in selected bars (including the unselected parts of the last bar).

`operationTranspose` (enharmonic):

1. Parse tuning text annotation to construct the `TuningConfig`.
2. All enharmonically equivalent spellings are indexed/logically grouped together in the `TuningConfig` using the `EnharmonicGraph`.
3. Cycle enharmonic spellings by index using the lookup table.
4. Perform the same housekeeping, checks & formatting as `up/down.qml`.


Auxiliary up/down:

Same as `up/down.qml`, except that it will skip user specified accidental chains for each auxiliary up/down action.

Let's use the current 2.3.5 JI subset example:

Assume we configure aux up/down to disregard the syntonic comma accidental chain and only regard the sharps/flats chain.

Then, upon executing 'aux up' on the note `A/`, it should skip all the way to `Gx/`, followed by `Dbbbb/`, `Fxx/`, `Cbb/`, etc... because those are the next nearest `XenNote`s in the `TuningTable` which have an identical syntonic comma accidental. This way, the user can move a note up/down in bigger increments, while preserving existing accidentals.

We can also make clones `aux2 up/down.qml` etc... which work the same way with individually configurable accidental chains. This way, the user can declare multiple up/down arrow key shortcuts (home/end, pg up/pg dn, etc...), where each shortcut increments a different sized step. Very useful for large tunings.

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

### Ligature implementation

If ligatures are defined, these will add additional entries to the `NotesTable` when there is an exact match in the degrees of the `AccidentalVector` regarding `considered` accidental chains.

A ligatured entry will contribute additional `XenNote` spellings pointing to the same `AccidentalVector` (+ other lookup entries). There's no need to worry about this many-to-one map because there is no need for an inverse mapping.

With these additional lookup entries, a ligatured spelling is implemented simply as an 'enharmonic spelling', and ligatures can be toggled with the enharmonic cycling operation.

When creating/managing accidentals during up/down operations, this plugin favours spellings with lesser symbols. If for whatever reason, a ligatured spelling has more symbols than an non-ligatured one, the plugin will not automatically use the ligatured spelling. Thus, it only makes sense to define ligatures if the ligatured spellings will always have fewer symbols than the non-ligatured one.

-----

## Docking plugin

In order to prevent recalculating/reparsing tuning config data, the plugin has to be persistent so that cached data live in memory.

See [this forum post](https://musescore.org/en/node/314928) about application-level shortcuts working in a `pluginType: "dock"` plugin.

-----


## Auto-positioning & layout

This section describes the methodology of auto-positioning accidentals. This plugin will try its best to position accidentals. However, this is a very ambitious feature, and needs much feedback, testing & help from the community.

### 0. Auto-positioning case study

The auto-positioning function regards all chords at the same tick position at once. Thus, we only need to care about the positioning of accidentals one tick at a time.

However, different voices and grace notes can share the same tick position, so we need to handle the positioning of every voice + grace chords all at once.

Here is an image of non-positioned and positioned versions of the same notes at a single 'tick':

![](imgs/layout-example.png)

We will use this example to formulate our auto-positioning algorithm.

### 1. Read chords at given tick

We read the contents of one bar at once. Instead of partitioning by `line` which `BarState` does, this time we're partitioning our data into ticks. Gather all the chords with the same tick position into one `Chords` data structure.

The `Chords` object splits chords by voice. Within each voice, the chords & grace chords are sorted right to left, with the main chord first in the list.

The generated data structure of the above example will look like this:

```js
[ // Chords object
  // Voice 1
  [
    [Main chord],
    [Second grace chord],
    [First grace chord]
  ],
  // Voice 2
  [
    [Main chord],
    [First grace chord]
  ],
  // Voice 3&4 empty
  [],
  []
]
```

Within a single chord, the notes are listed in no particular order.

The rationale for sorting right-to-left is so that we ensure that the index of the second grace chord of voice 1 equals the index of the first grace chord of voice 2.

This way, the positioning of grace chords are consistent between voices, and all grace chords that should be vertically aligned have the same index.

This allows us to break down/decompose the process into even smaller steps.

### 2. Per-vertical chord accidentals processing

All vertically-aligned chords (discounting offsets due to clusters of noteheads) are given the same index. Now we process the accidentals of all vertically aligned chords together (regardless of voice).

e.g. Where `k` is the chord index, we concat all the voices together: `Chords[0][k].concat(Chords[1][k]).concat(Chords[2][k])...`

To position accidentals, we use the zigzag pattern: The accidentals for the top most note are positioned closest to the chord as possible, then the bottom most note's accidentals are positioned, then the second-top-most, then second-bottom-most, etc... until all the notes' accidentals are placed.

To accomplish this:

- Fold/flatten the list of vertically-aligned chords so that all the notes are in one list
- Sort the notes in increasing `.line` order (i.e. decreasing pitch, from top to bottom)
- Reorder the list using two pointers.

Once we have the zigzag list, we can 'add' accidentals.

### 3. Populate accidental offsets

We cannot add accidentals as we go along, as adding accidentals one-by-one may cause the position of the elements on the page to change, which means we will need to recalculate the bounding boxes of the noteheads every time we add an accidental.

Instead, we can rely on the fact that the element offsets are consistent relative to the attached notehead. What we can do is to calculate positions for ALL accidentals within the current vertical-chord, and express the positions as offsets from the parent element of each accidental.

By storing offsets, at the end of everything we can assign to offsets to all the accidentals in one go, and everything should work out.

To calculate where should an accidental go, we must take note of the bounding boxes of every fixed element/prior accidentals already keyed-in, and make sure that:

- We do not overlap with any fixed elements/already-positioned accidentals
- The chosen position of the accidental MUST be left of the notehead that the accidental is supposed to belong to.
- If there are multiple accidentals on a single notehead, we sort by increasing z index, the lower z index is positioned first so that it appears on the right side. The symbols of a multi-symbol accidental must always appear adjacent, and cannot be pushed back/interrupted by another accidental.

### 4. How to check overlap

We can check overlap using the `.pagePos` and `.bbox` properties of `PluginAPI::Element` (both noteheads & accidental symbols are elements).

`Element.pagePos` represents the absolute position of the element's origin:

```js
{
  "x":24.269899801587307,
  "y":30.73749507936508
}
```

and `Element.bbox` contains info about how far up, down, left, and right does the element extend from its origin, and where its top-left corner is positioned relative to its origin.

```js
{
  "x":0,
  "y":-1.3359375,
  "width":0.9759375,
  "height":2.6640625000000004,
  "left":0,
  "right":0.9759375,
  "top":-1.3359375,
  "bottom":1.3281250000000004
}
```

From the above two example properties, we can see that the absolute bounding box of the element is:

```js
{
  "left":24.2...,
  "right": 25.2...,
  "top":29.4...,
  "bottom":32.4...
}
```

### 5. Mark accidental(s) position

Using the absolute bounding boxes of fixed/already positioned elements from step 4., we can determine the appropriate X position for an accidental, then mark its position offset:

- Filter out all bounding boxes that are not vertically overlapping with the Y axis of the to-be-positioned accidental. (Use `intervalOverlap()` function)
- Sort bounding boxes by decreasing X position (i.e. from right to left)
- Between every Nth and (N+1)th bounding box, calculate the gap between them. The gap is the distance between the left edge of the Nth bounding box and the right edge of the (N+1)th bounding box.
- If the sum of the widths of bounding boxes of the symbols required in the to-be-positioned multi-symbol accidental can fit within the gap, place them flushed to the left edge of the Nth bounding box (i.e. flushed as right as possible).
- Mark the positioned symbols as 'fixed' so that the next accidentals cannot overlap.
- Calculate the X offset of the positioned symbols relative to the notehead's page position. Remember to account for the symbol's origin offset. (the notehead's X position is equal to its left bounding box edge).

A symbol that is marked as 'positioned' will take this form:

```js
{ // PositionedElement
  element: PluginAPI::Element, // element of the symbol
  top: ..., // absolute coords of bbox top
  bottom: ..., // absolute coords of bbox bottom
  left: ..., // absolute coords of bbox left
  right: ..., // absolute coords of bbox right
}
```

### 6. Assign offsets

Assign the respective calculated X offsets to all the symbols at one go.

### 7. Push back grace notes

The newly positioned accidentals will not push back grace notes/prior grace notes, this will cause positioned accidentals to intersect with grace notes. To fix this, we need to manually push back ALL grace notes by the largest (leftest, -ve) X offset applied in step 6.

We can push back a grace chord by adjusting the note's parent's `Chord.offsetX` property.

As we are iterating each grace chord, we need to keep track of the amount of space pushed back. DO NOT increment a grace chord's offset relative to its present offset, this will cause the offset to repeatedly increase. Instead, we use the `spacePushedBack` variable to keep track of any additional push backs caused by other grace chords on the right.

Also, there are two things to note about how MuseScore positions grace notes by default (even without accidentals):

![](imgs/grace-pushback.png)

Firstly, the default X position of each grace note depends on the noteheads of the voice it belongs to. If the voice's main chord has a notehead cluster, the gracenote's default position will be pushed back to compensate for the notehead cluster.

Secondly, notehead clusters/chords in other voices do not affect the positioning of grace chords in other voices.

As a result, we can decide how much to additionally push back a grace note by measuring the left-most symbol's position with respect to the left-most notehead position per voice. The `symbol.pagePos.x - note.pagePos.x` is the amount of space we need to push back all prior grace chords by.

### 8. Rinse and repeat

We can repeat steps 2-7 for the grace notes, calculating accidental offsets relative to grace notes one vertical-chord at a time, until all chords are completed.

## MIDI Export

This plugin 'exports' midi by generating a midi.csv file which contains all play events + tuning information for all notes in the selection/entire score.

This midi.csv file is fed into a Python script which generates one MPE midi file per staff.

### midi.csv format

```csv
ticks per quarter note
-2, tempo, tick
staff number, MIDI note, ontime, duration, velocity, cents offset
...
```

The first line contains the number of midi ticks per quarter note, and the second line onwards contains midi play events or tempo changes.

Tempo changes are denoted by having `-2` staff index. Tempo is given in BPM, and `tick` refers to the tick at which the tempo change occurs.

## Data Structures

> ⚠️ **IMPORTANT** 
> This documentation is deprecated.
> 
> Refer to `types.js` instead.

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
  internalNote: PluginAPI::Note, // official MuseScore note object
  fingerings: [Element], // List of Fingering elements attached to this notehead.
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

See [2.3.5 JI tuning table.csv](https://github.com/euwbah/musescore-xen-tuner/blob/master/2.3.5%20JI%20tuning%20table%20example.csv) for an example.

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

#### `ConstantConstrictions`

```js
[number]
```

Just a list of numbers which filters which next notes are valid for the current up/down aux operation.

- If `0` is in the list, the nominal must stay constant.
- If `1` is in the list, the degree of the first accidental chain must stay constant.
- If `2` is in the list, the degree of the second accidental chain must stay constant.
- etc...

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
  equaveSize: number,
  tuningNote: number, // MIDI note number of tuning note
  tuningNominal: number, // tuning note number of 12edo nominals from A4.
  tuningFreq: number, // Hz of tuning note.
  auxList: [ConstantConstrictions], // List of `ConstantConstrictions`
  usedSymbols: {
    // lookup of all symbols used in this tuning config.
    // anything not in here should be ignored by the plugin.
    SymbolCode: true,
    ...
  }
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

#### `ChangeReferenceTuning`

```js
{
  tuningNominal: number, // number of 12edo nominals from A4
  tuningNote: number, // MIDI note of reference note
  tuningFreq: number, // Hz of reference note
}
```

Represents a pseudo-tuning config object which is used to change the reference note/tuning of the current tuning system without recalculating the entire `TuningConfig`.

#### `ConfigUpdateEvent`

```js
{
  tick: number, // MScore tick, when the config is to be applied
  config: function(parms) {
    // Callback that modifies `parms` object.
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
[
  // Voice 1
  [
    [Main chord],
    [Second grace chord],
    [First grace chord]
  ],
  // Voice 2
  [
    [Main chord],
    [First grace chord]
  ],
  // Voice 3&4 empty
  [],
  []
]
```

See [Auto Positioning 1: Read chords at given tick](#1-read-chords-at-given-tick).

#### `PositionedElement`

```js
{ // PositionedElement
  element: PluginAPI::Element, // element of the symbol
  top: ..., // absolute coords of bbox top
  bottom: ..., // absolute coords of bbox bottom
  left: ..., // absolute coords of bbox left
  right: ..., // absolute coords of bbox right
}
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
