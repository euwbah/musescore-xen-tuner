# Xen Tuner: Microtonal MuseScore Plugin Suite

A **MuseScore 3.6** plugin to give first-class support for microtonal/alternative notation systems.

## Features/Goals

- [x] Infinitely many tuning systems with customizable SMuFL/text-based accidentals. [HEJI](https://en.xen.wiki/w/Helmholtz-Ellis_notation), [HEWM](http://tonalsoft.com/enc/h/hewm.aspx), [Sagittal](https://en.xen.wiki/w/Sagittal_notation), [Johnston JI](https://www.kylegann.com/BJNotation.html), [Rank 2/3/+ tunings](https://en.xen.wiki/w/Ups_and_Downs_Notation_for_Rank-3_JI), [very large edos](https://en.xen.wiki/w/Syntonic-rastmic_subchroma_notation), ... (SMuFL symbols data entry [help needed](#help-needed)! Currently at 44%)

- [x] Automated tuning & placement of multiple accidentals.

- [x] Every accidental/note is accessible with up/down operations and 'J' to cycle through enharmonics, no matter how large the tuning.

- [x] Configurable auxiliary up/down operations to transpose by selected accidentals/nominals.

- [x] Accidental ligatures where multiple accidentals can combine and be represented as a single symbol (e.g. HEJI & Sagittal)

- [x] Use of fingerings for text-based input of accidentals

- [x] Specifying JI ratios and cent offsets in fingerings.

- [ ] Proper transposition by any interval of choice for all regular mappings.

- [x] MIDI/MPE export with channel pitch bend support. (WIP. MIDI files containing MPE data are generated, but no workflow exists to import these directly to a DAW)


## Quick Start

> :warning: This project is very experimental. Please check [Caveats](#caveats)

### 1. Download & activate plugin

Download the project as .zip (the green "Code" button on top right of the project page).

Extract files to plugins folder and activate all the following plugins (see [this guide](https://musescore.org/en/handbook/3/plugins) if you don't know how):

- _clear tuning cache_
- _xen tuner_
- _export midi csv_

### 2. Remap/Remove MuseScore default shortcuts

This plugin is designed to replace MuseScore's default shortcuts. You will need to **remove/remap the following default keyboard shortcuts** in [MuseScore's shortcut preferences](https://musescore.org/en/handbook/3/preferences#shortcuts):

- Pitch up/down or move text/articulation up/down (`Up/Down` arrow keys)
- Change enharmonic spelling (`J`)
- Diatonic up/down (`Shift+Alt+Up/Down`)
- Go to higher/lower pitched note in chord (`Alt+Up/Down`)
- Go to top/bottom note in chord (`Ctrl+Alt+Up/Down`)

Also, if you're going to use the [fingering accidentals/tuning feature](#how-to-use-fingering-annotations) a lot, it's recommended to **change `Ctrl+F` to "Add fingering"** instead of "Find / Go to".

### 3. Start Xen Tuner

![start tuner](imgs/start%20xen%20tuner.png)

Once you have activated the plugins & replaced the shortcuts, you can start the plugin in **Plugins > Xen Tuner > Start Xen Tuner**.

> :warning: You only need to run this once! Starting the plugin will open a small docked panel on the bottom left. If you close this panel, you will need to restart Xen Tuner.
>
> The first time you start Xen Tuner after opening MuseScore, MuseScore will freeze for about 5 seconds while it loads. This is normal.

### 4. Select tuning configuration & key signatures

![specify tuning config](imgs/specify%20tuning%20config.png)

You can specify which [tuning/notation system](#how-to-tuning-configuration) and [key signatures](#how-to-key-signatures) to use by adding a System Text or Staff Text element. The text can be the configuration text itself, or a path to a `.txt` or `.json` file in the `tunings/` folder. Do not include the `.txt` or `.json` extension.

> 🟢 For a start, try out `heji/5 limit`, which references the `./tunings/heji/5 limit.txt` tuning system configuration file.
>
> You can check out other files in the `tunings/` folder to learn how you can write your own tuning configurations.

A System Text configuration will affect all staves, whereas a Staff Text configuration will only affect the staff it is on. A configuration is only applied to notes from its bar onwards. Only place configuration texts/key signatures at the start of a bar.

These Staff/System Texts don't have to be visible (you can press `V` to toggle visibility).

### 5. Entering notes & accidentals

Enter notes as per normal. Press `Alt+R` after entering new notes to retune them to the correct tuning.

There are four different ways to input accidentals. The most primitive method being dragging symbols in from the Master Palette, then hitting `Alt+R`.

However, the recommended way to enter accidentals would be to use up/down operations. These are available as keyboard shortcuts ([which you can change](#how-to-change-shortcuts)):

- `Up/Down`: Move note up/down to the next nearest step
- `J`: Cycle through enharmonics of the note
- `Alt+Up/Down`: up/down auxiliary operation 1 (usually for moving up/down diatonically)
- `Ctrl+Alt+Up/Down`: up/down auxiliary operation 2 (usually for sharps/flats, or first accidental chain)
- `Alt+Shift+Up/Down`: up/down auxiliary operation 3 (usually 5-limit accidentals, or second accidental chain)
- `Ctrl+Alt+Shift+Up/Down`: up/down auxiliary operation 4 (usually 7-limit accidentals, or third accidental chain)

What the auxiliary operations do can be changed by [modifying auxiliary operations defined in the tuning configuration](#auxiliary-operations)

The next best way to enter accidentals is by entering fingerings containing the text-representation of accidentals. To use this feature, the tuning config should declare [text representations](#advanced-declaring-text-representations-of-accidentals) which matches specific strings of text and converts them into accidental symbols (which can either be SMuFL or text-based).

When using this, it is recommended to map the default `Ctrl+F` shortcut to "Add fingering" instead of "Find / Go to".

Select a note, hit `Ctrl+F`, then enter the text representation of the accidental(s) you need on that note. You can press space or shift+space to apply fingerings on next/previous notes.

Once fingerings are entered, hit `Alt+R` and the accidentals will render themselves.

This method is recommended for entering the occasional accidental that need not be part of a main accidental chain. If there are too many [accidental chains](#accidental-chains--degrees), a tuning config will take longer to load.

Read [how the plugin conceptualizes tunings & accidentals](#introduction) to make your own tuning configurations.

### [List of Supported Symbols](https://docs.google.com/spreadsheets/d/1kRBJNl-jdvD9BBgOMJQPcVOHjdXurx5UFWqsPf46Ffw/edit?usp=sharing)

This is still a work in progress. Free for all to edit, and [in need of community contribution](#help-needed)!

#### Keeping accidentals up to date

While the accidental data entry project is in progress, the new accidentals will be supported. Thus, it is recommended to keep your copy of the plugin [updated](#updating-the-plugin).

Though, if you don't want to repeatedly download the plugin files to update the list of supported accidentals, you can run the included `scripts/tabulate_accidentals.py` python script yourself with Python 3. This will sync the plugin's accidental Symbol Codes to the "CSV Export" sheet on the spreadsheet.

If you have been using Symbol Code numbers to refer to your accidentals, you will need to ensure that the Symbol Codes numbers still refer to the same accidentals after updating the list of supported accidentals. While the data entry is ongoing, the Symbol Code index may change and is unstable.

-----

## Introduction

> 🟢 This section introduces important terminology. It is recommended to read this section before the rest of the guide.

### Nominals & Equave

The **nominals** are the 'musical alphabet'. In 12edo terms, we call them the 'white keys'. That is, the notes without any accidentals attached to them.

Normally there are only 7 nominals (letters A to G), and the distance between two of the same nominals is called an octave.

However, in Xen Tuner, you're free to declare as many nominals as you want, tuned to whatever you want, as long as you have at least 2 nominals. The distance between two of the same nominals is called an **equave**. You can set the equave to whatever interval you want.

This means, you can construct notation systems like the [chromatic staff](https://www.youtube.com/watch?v=U7l7s1Vr6lQ&ab_channel=FabioCostaMusic), where all nominals are the same size, or [Bohlen-Pierce](https://www.youtube.com/watch?v=sd1b9Lh8iFA&t=89s&ab_channel=KjellHansen) with 9 nominals. For whatever reason, you can even write using the negative treble clef (negative harmony) by setting the equave to negative `-1200c`. Then, notes that are visually going up will sound like they're going down.

### Symbol codes, text codes, text-based accidental symbols

A **symbol code** represents a single visually/semantically unique symbol which can either be a SMuFL symbol ID or one or more characters of text (ASCII).

This plugin only uses SMuFL symbols from the 'Symbols' category in the Master Palette (shortcut 'Z'). Do not use accidentals from the 'Accidentals' palette.

![](imgs/symbols%20palette.png)

To refer to a SMuFL symbol when setting up a tuning/key signature, you can either use the Symbol Code number (the _Symbol Code_ column of the [spreadsheet](https://docs.google.com/spreadsheets/d/1kRBJNl-jdvD9BBgOMJQPcVOHjdXurx5UFWqsPf46Ffw/edit?usp=sharing)), or by the Text Code representation of the symbol (_Text Code_ column of the spreadsheet).

![](imgs/spreadsheet%20lookup.png)

> E.g. both `#` and `5` can be used to refer to the sharp symbol.
> 
> Code `100` doesn't have a Text Code attributed to it (at this time of writing), so you can only refer to it by entering `100`.

You can also use text-based accidentals by referring to them in single quotes, as long as the text does not contain a space.

> E.g. `'abc'` represents the literal text abc as a single accidental symbol.

### Escape codes

When referring to Text Codes or Text-based accidentals in the tuning configuration, certain special charcters need to be escaped with a backslash:

- Write `'` as `\'` unless you intend to create a text-based accidental
- Write `\` as `\\` unless you intend to start an escape sequence.
- Write `//` as `\/\/` unless you intend to write a comment.

This applies to **both text codes and quoted text accidentals**. 

For example, the down arrow symbol (SymbolCode 43) must be referred to as `\\` even though the text code for it is `\`.

### Constructing an accidental

Multiple symbols can combine to form a single logical accidental that represents a single pitch adjustment in an accidental chain. Separate each symbol code/quoted text with a period to combine them.

> E.g. `x./.'hi'` refers to a single accidental comprised of the double sharp symbol, up arrow symbol and the text 'hi', left to right order.

### Accidental chains & degrees

Now, when we say "sharps and flats", these accidentals represents a chain of accidentals along a spectrum. For the purpose of this plugin, let's call it the **accidental chain**. Each successive item in this chain of sharps and flats refer to a constant-sized pitch increment. The number of increments of the unit interval is called the **degree** of the **chain**. `#` (sharp) is "degree 1", and `bb` (double flat) is "degree -2" of the sharps-flats chain.

In 12edo, each degree along the sharps/flats chain represents a 100 cent increment, so degree -2 would be -200 cents. We can theoretically extend this chain indefinitely to include as many sharps and flats as we want.

You can't attach two accidental degrees from the same accidental chain on to a single note (like how it wouldn't make sense to call a note "C-sharp-double-flat-triple-natural").

To combine and permute different accidentals, declare multiple accidental chains. E.g. `C#/` can signify +1 degree sharp, and +1 degree syntonic comma.

### Accidental vectors

You can combine different accidental degrees from different accidental chains. The degrees of each accidental chain forms a list of numbers called the **accidental vector**. This is a unique representation of all the accidentals attached to one notehead.

> E.g. in 5-limit Helmholtz-Ellis Just Intonation (HEJI) notation, we need to define two **accidental chains**. 
> 
> First, the chain of sharps and flats, where each step in the 'sharp' direction corresponds to the apotome interval (2187/2048). These accidentals allow us to access 3-limit just intonation.
> 
> Next, the chain of syntonic commas, where each step up is equal to the syntonic comma (81/80). These accidentals give access to 5-limit just intonation.
> 
> Now, we can notate the classic major third (5/4) of `D` as `F#v` (F-sharp-down). `F#v` is 1 step up in the 'sharp' direction, and 1 step down in the 'syntonic comma' direction. Thus, we can represent this note as having the accidental vector of `1, -1`.

-----

## How to: tuning configuration

To declare a tuning system, we need to enter the **Tuning Configuration** into the score. These can be entered as text in **System Text** or **Staff Text** elements.

System Text elements will apply to all staves, whereas Staff Text will only apply to the staff it is attached to. Configurations will only apply from its own bar onwards.

You do not need to write the entire tuning configuration within a staff text. E.g. if you frequently use a tuning with rather lengthy configuration text, you can create a `.txt` file ([or pre-computed `.json` file](#1-pre-compute-the-tuning-config)) inside the included `tunings/` folder.

> E.g. to refer to the 5-limit HEJI tuning config in `tunings/heji/5 limit.txt`, simply write `heji/5 limit` in the Staff/System Text.
>
> 🟢 **Recommended**: have a look at the provided tuning configs in the `tunings/` folder to see how notation/tuning systems are configured.

> 🔴 **Beware:** if you find two files with the same name where one is a `.txt` and the other a `.json` file, this means that the tuning configuration is [pre-computed. Read more about it in this section](#1-pre-compute-the-tuning-config).
>
> The plugin will opt to look for pre-computed `.json` tuning configurations first, so **changing the `.txt` file will not affect the tuning config**. Instead, you will need to use this web tool: https://euwbah.github.io/musescore-xen-tuner/ to generate a new `.json` file to replace the old one.

Now lets dive into how we can create our own tuning/notation systems.

### Tuning configuration syntax overview

```
// This is a comment. Comments are ignored by the plugin.

// 1. Reference note

C4: 440 * 16/27 // set frequency reference note (must be without accidental)

// Intervals/frequencies can be specified as math/JavaScript expressions.

// 2. Nominals

// Nominals start from the above specified reference note
// Cents must end with c, otherwise the number is treated as a JI ratio.
// Last number specifies the interval of the equave.
0c 200c 34/27 Math.pow(11/10, 3) Math.sqrt(49000)c 27/16 1101.1c 2/1

// 3. Accidental chains

// each accidental must be separated by a space.

// chain 1: the usual 100c semitone accidentals
bbb.b bbb bb b (100c) # x #x x.x

// chain 2: text based accidentals
'-'.'-' '-' (81/80) '+' '+'.'+'

// chain 3: combination accidentals & irregular accidental sizes
'hello'.68(-31.7c) (0) 'bye'.67(Math.sqrt(28/21))

// chains 4-6: certain characters must be escaped with a backslash.
// Applies to both text-based accidentals and Text Codes

b\/\/ (0) // the double slash (//) of the 'b//' (Buyuk Mucenneb)
          // must be escaped to prevent it from being treated as a comment.

\'\' \' '\'' (0)  // single quote must be escaped.
\\ '\\' (0)  // backslash must be escaped

// 4. Ligatures

lig(1,2) // signifies declaring a ligature that apply to chains 1 and 2
1 -1 #v // sharp and minus (#.'-') becomes sharp arrow down symbol
1 1 #^ // sharp and plus (#.'+') becomes sharp arrow up symbol

lig(x, y, z, ...) // create ligature that applies to chains x, y, z, ...
etc...

// question mark after a ligature declaration signifies that the ligature
// is a weak ligature.
lig(1)?
etc...

// 5. Auxiliary operations

aux(0) // 1st aux up/down adjusts note diatonically
aux(1) // 2nd aux up/down modifies first accidental chain (flat/sharps)
aux(2,3) // 3rd aux up/down modifies 2nd and 3rd accidental chains

// 6. Secondary accidentals & text representations

sec() // signifies start of secondary accidental declaration.

't' + 50c // quarter sharp symbol raises note by 50c.
// This symbol can be entered via fingering using the "t" text representation

'#' # 100c // additional sharp symbols raise note by 100c
'b' b -100c // additional flat symbols lower note by 100c

'+++' #+ 150c // triple plus converts into sesquisharp symbol.
// This must be declared before '+', otherwise, when entering
// accidentals using text representation fingerings, a triple-plus
// will match as 3 separate plus symbols ('+'.'+'.'+')

// Text representations' matching precedence is determined by
// the order of declaration.

'+' 81/80 // additional plus symbols raise note by syntonic comma
// because '+' is a single-symbol text-based accidental, "+" is
// automatically set as the text representation for this accidental.

'abc' 0.01c // this is also a single-symbol text-based accidental
'a'.'b'.'c' 0 // this isn't single-symbol.

```

The declarations need to be in order. Apart from the reference note and nominals, all the other declarations are optional:

1. Reference note
2. Nominals
3. Accidental chains
4. Ligatures
5. Auxiliary operations
6. Secondary accidentals & text representations

### Full example

See [heji/5 limit.txt](tunings/heji/5%20limit.txt) for a full annotated example of implementing the tuning configuration for the [extended Helmholtz-Ellis just intonation notation (2020 edition)](https://marsbat.space/pdfs/HEJI2_legend+series.pdf). In this tuning config, the up/down operations are implemented for up to the 5 limit, but higher limit accidentals are available as secondary accidentals, and can be entered via fingerings with the accidentals' text representations.

Most of this section revolves around the [heji/5 limit.txt](tunings/heji/5%20limit.txt) tuning config. Continue reading for a detailed explanation on how you would go about creating tuning configs like this:

### Simple example

Let's start of with the simplest example: Just the white keys of the piano:

```txt
A4: 440
0c 200c 300c 500c 700c 800c 1000c 1200c
```

`A4: 440` specifies the reference note and tuning in Hertz, which sets the note A4 to 440hz.

`0c 200c 300c 500c 700c 800c 1000c` specifies, in cents, the tunings of each of the 7 nominals starting from the reference note of choice, A4. This means that B4 will be 200c higher than A4, C5 will be 300c higher than A4, etc... Each entry must be separated by a space.

The last interval size, `1200c`, specifies the equave size. The equaves are referenced in terms of the nominals defined, rather than the standard 12edo octave. E.g., if you only declare 2 nominals, then the next equave up from A4 will start at C5 instead of A5.

### Adding accidentals

Now let's add the usual 12edo accidentals to complete the 12edo tuning system.

```txt
A4: 440
0c 200c 300c 500c 700c 800c 1000c 1200c
bb b (100c) # x
```

The last line adds a chain of accidentals ranging from double flat to double sharp. You can specify the accidental symbols as Symbol Codes or Text Codes, each degree of the accidental chain must be separated by space, and the `(100c)` in the middle means that increasing the degree on this chain by 1 will result in a 100 cent pitch increase.

### Adding too many accidentals

Sometimes, scores call for triple sharps and flats. Why not go all the way and add 6?

```txt
A4: 440
0c 200c 300c 500c 700c 800c 1000c 1200c
bbb.bbb bb.bbb bb.bb bbb bb b (100c) # x #x x.x #x.x #x.#x
```

As shown above, a single degree on an accidental chain can be composed of multiple symbols. To combine symbols, join Symbol Codes/Text Codes with a period. E.g. `bb.bbb` means that degree -5 of the chain is notated as a double flat followed by a triple flat.

Now's a good time to play with enharmonic cycling (`J` key).

### Just Intonation (JI)

Now, let's convert what we have into 3-limit just intonation (and also tone down on the accidentals)

```txt
C4: 440 * 16/27
0 9/8 81/64 4/3 3/2 27/16 243/128 2
bbb bb b (2187/2048) # x #x
```

> 🟢 Every ratio/cents interval can be specified as a math/JavaScript expression.
>
> **To differentiate ratios from cents, cents must end with a 'c'.**

We're now setting the reference note C4 to a just-intonated 3-limit major sixth below A4. Because of that, we can now specify our nominals starting from C, which makes it a little easier to calculate the ratios.

Our nominals are now all 3-limit ratios built off a chain of pure fifths from F to B, which are the standard nominals used in JI notations (unless you're writing in Ben Johnston's system).

### More accidental chains: 5-limit JI

```txt
C4: 440 * 16/27
0 9/8 81/64 4/3 3/2 27/16 243/128 2
bbb bb b (2187/2048) # x #x
\.\ \ (81/80) / /./
```

We can add more accidental chains by appending each one on a new line.

Here, we use the up and down arrow symbols to represent the syntonic comma. To get 2 arrows we combine the symbols with a period.

We now have access to those 'sweeter' 5:4 major thirds like `C-E\` instead of `C-E`.

### Accidental ligatures: "Real" HEJI

If we want to notate in HEJI proper, those arrows aren't the right symbol for the syntonic comma.

In HEJI, the first two accidental chains (syntonic commas & sharps/flats) are represented by a single ligatured accidental with the up/down arrows being attached to the sharp/flat symbol.

To add support for notation systems where a particular accidental can represent multiple accidental chains at once, we can declare a **ligature**. You can think of it as a list of "search-and-replace" conditions.

```txt
C4: 440 * 16/27
0 9/8 81/64 4/3 3/2 27/16 243/128 2
bbb bb b (2187/2048) # x #x
v3 v2 v (81/80) ^ ^2 ^3
lig(1,2)
-2 -2 bbv2
-2 -1 bbv
-2 1 bb^
-2 2 bb^2
-1 -2 bv2
-1 -1 bv
-1 1 b^
-1 2 b^2
0 -2 v2
0 -1 v
0 1 ^
0 2 ^2
1 -2 #v2
1 -1 #v
1 1 #^
1 2 #^2
2 -2 xv2
2 -1 xv
2 1 x^
2 2 x^2
```

We start declaring a ligature with `lig(1,2)`. The numbers `1,2` represent the Nth accidental chains that this ligature applies to &mdash; meaning that it will only replace symbols that are part of the 1st and 2nd accidental chains, leaving other chain's symbols untouched.

After that, we declare each search-and-replace condition on a new line.

`-2 -1 bbv` means that if the 1st accidental chain is on degree -2 (double flat), and the second accidental chain is on degree -1 (down arrow), then we replace it with the single symbol `bbv` (double flat with single down arrow).

> ⚠️ IMPORTANT: The degrees `-2 -1` **must be specified in the same order as the ligature's chain declaration**.
> 
> For example, if we declared `lig(2,1)` instead, with the second accidental chain on the left, then you would need to write the search-and-replace condition as `-1 -2 bbv`, since now the left number refers to the second accidental chain.
>
> ⚠️ Ligatured symbols **must not contain symbols that are already used as part of an accidental chain.**

The ligatured symbols can be constructed with multiple symbols. Just like before, you can join symbols with periods.

You can also [specify more than one ligature declaration](#advanced-weak-ligatures--using-multiple-ligatures-at-once), regarding different chains. Though special care must be taken when deciding the order of declaration of the ligatures. [Read more here](#advanced-weak-ligatures--using-multiple-ligatures-at-once).

### Auxiliary operations

You may realize that it is rather inefficient to just use the up/down arrows to get the note/accidental you need. We already have 245 unique notes within an equave!

We can make use of auxiliary up/down actions to have more control over how the note moves when being transposed.

> :warning: **Auxiliary declarations must be written after any ligature declarations**.

```txt
C4: 440 * 16/27
0 9/8 81/64 4/3 3/2 27/16 243/128 2
bbb bb b (2187/2048) # x #x
\ (81/80) /
lig(1,2)
...blah blah
aux(0)
aux(1)
aux(2)
aux(0,1)
```

Each auxiliary operation is declared on a new line. The first declaration correspond to the 'aux 1 up/down' commands, second declaration for aux 2, and so on.

`aux(0)` means that only the [nominal](#nominals--equave) is allowed to change when transposing notes. Any accidentals attached must remain the same. This corresponds to MuseScore's 'Diatonic pitch up/down (keep degree alterations)' function. This behaviour will be assigned to the action of the 'aux 1 up/down' commands (default shortcut: `Alt+Up/Down`)

`aux(1)` means that only the first accidental chain's degree is allowed to change when transposing notes. The note's nominal and other accidental chains must remain the same. In other words, you can use this to adjust the number of flats and sharps on the note. This behaviour will be assigned to the action of the 'aux 2 up/down' commands (default: `Ctrl+Alt+Up/Down`)

Similarly, `aux(2)` means only the second chain's degree can change. This adjusts the number of syntonic up/down accidentals on the note. This behaviour will be assigned to the 'aux 3 up/down' commands (default: `Shift+Alt+Up/Down`)

Finally, `aux(0,1)` means both the nominal and the first accidental chain's degree can change. This behaviour will be assigned to the 'aux 4 up/down' commands (default: `Ctrl+Shift+Alt+Up/Down`)

You can specify whatever combination of nominal/chains within the parentheses that you may find useful for your tuning/notation system. The order of the numbers in the parentheses do not matter.

### Advanced: Weak ligatures & using multiple ligatures at once

```txt
C4: 440 * 16/27
0 9/8 81/64 4/3 3/2 27/16 243/128 2
bbb bb b (2187/2048) # x #x
v3 v2 v (81/80) ^ ^2 ^3

lig(1)?
-1 ~.#v // flat equals ~#v
1 ~.b^ // sharp equals ~b^

lig(1,2)
-2 -2 bbv2
-2 -1 bbv
-2 1 bb^
-2 2 bb^2
-1 -2 bv2
-1 -1 bv
-1 1 b^
-1 2 b^2
0 -2 v2
0 -1 v
0 1 ^
0 2 ^2
1 -2 #v2
1 -1 #v
1 1 #^
1 2 #^2
2 -2 xv2
2 -1 xv
2 1 x^
2 2 x^2
```

If we want to follow the [HEJI specification (2020)](https://marsbat.space/pdfs/HEJI2_legend+series.pdf) to the letter, we will need to also implement the enharmonic schisma tilde symbol (`~`), such that `C#` = `Db~`, and `Db = C#~`.

Upon taking a closer look, the `~` symbol in HEJI can imply both an upwards or downwards offset depending on what symbol it is attached to. This plugin does not inherently support accidentals that change their meaning depending on the context, making it seemingly impossible to implement `~` per-se in Xen Tuner.

However, as stated above, the purpose of these symbols is to allow enharmonic spelling. Ligatures in this plugin are treated as **enharmonically equivalent spellings** of a note, meaning we can trick the plugin into implementing these enharmonics as ligatures:


```txt
lig(1)?
-1 ~.#v // "b" becomes "~#v"
1 ~.b^ // "#" becomes "~b^"
```

🟥 Note that we use a `?` after the `lig(1)?` declaration line. This is to signify that this is a **weak ligature**. We don't want the plugin to replace every `b` with `~#v` and every `#` with `~b^`, because that is not the point of introducing this ligature. In order for the plugin to not aggressively prefer the ligatured version of the accidental, we need to use `?` to declare it as a weak ligature.

🟥 Note that the order which the ligatures are declared is very important. This wouldn't work if the `lig(1)?` declaration is written after the `lig(1,2)` declaration.

If we were to declare `lig(1,2)` first, this will cause the plugin to look for and match the `#v` and `b^` symbols first, instead of the composite `~.#v` and `~.b^`. Here's what will happen:

- A note has the `~.b^` accidental, which should, by right, be interpreted as `#` enharmonically
- `b^` gets eaten up by matching the `lig(1,2)` ligature, because it was declared first.
- `~` remains, and the plugin will not be able to figure out what to do with it
- [Halt & catch fire](https://en.wikipedia.org/wiki/Halt_and_Catch_Fire_(computing))

### Advanced: Irregularly sized accidental chains

Within an accidental chain, you can specify additional offsets to be applied to each accidental degree like so:

```txt
A4: 440
0c 200c 300c 500c 700c 800c 1000c 1200c
bb b(15c) (100c) #(-3c) x(8/9)
```

The additional offset on the degree is written in parentheses right after the accidental symbol code(s), **without a space** between the symbol and the parentheses.

- `b(15c)` will make degree -1 (flat) equal to -85c instead of -100c
- `#(-3c)` will make degree 1 (sharp) equal to 97c instead of 100c
- `x(8/9)` will make degree 2 flatter by the 9/8 Just Intonation interval, making it only &approx;3.9c

If you have very irregular interval sizes between accidentals, it might be better to set the accidental size to 0 and specify the offset of each degree individually. For example:

```txt
bb(8/9) b(15/16) (0) #(17/16) x(8/7)
```

### Advanced: Text based accidentals

Some notation systems like [HEWM (Helmholtz-Ellis-Wolf-Monzo)](http://www.tonalsoft.com/enc/h/hewm.aspx) require accidentals that are text based (ASCII or UTF). You can use text based accidentals by quoting the text in single quotes like so:

```txt
A4: 440
0c 200c 300c 500c 700c 800c 1000c 1200c
'bb' 'b' (100c) '#' 'x'
```

This implements good old 12edo, but the accidentals will be text based instead of SMuFL symbols.

Text based accidentals are implemented as fingerings attached to a notehead, and you will be able to access these accidentals with the regular up/down/enharmonic operations.

However, if you want to be able to input these accidentals directly using fingering text, you will need to [declare text representations](#advanced-declaring-text-representations-of-accidentals).

For a thorough example, see the [HEWM tuning config](tunings/hewm/7%20limit.txt), which uses mainly text based accidentals.

🔴 **IMPORTANT**: Xen Tuner makes a distinction between `'x'.'x'` and `'xx'`. The former is two separate text elements whereas the latter is a single text element.

### Advanced: Secondary accidentals

When working in high-complexity just intonation or very large tunings with numerous accidentals of varying sizes that can all be permuted and combined with each other, it's highly recomended to implement the higher-limit/sporadic accidentals as secondary accidentals, rather than declaring one accidental chain per prime-limit.

> 🟠 Declaring too many accidentals/ accidental chains will cause the plugin to take a long time to load the tuning config.

Secondary accidentals are accidentals that are 'left-over' after the plugin parses the main accidentals that contribute to the tuning chain.

You can tell the plugin what to do with them like so:

```txt
A4: 440
0c 200c 300c 500c 700c 800c 1000c 1200c
b (100c) #

sec() // this starts the secondary accidental declaration

// syntax: <symbol code/text code> [space] <cents or ratio expression>
# 50c // extra sharps are +50c
b -50c // extra flats are -50c

\\.\\ -30c // double down arrow is -30c
\\ -10c // single down arrow is -10c
/./ 30c // double up is +30c
/ 10c // single up is +10c
```

> 🔴 **IMPORTANT**: The `sec()` declaration must be placed after `aux` and `lig` declarations.

In this example, there is only one accidental chain declared consisting of -1 to 1 degrees of flats/sharps. If there are any extra flat or sharp symbols, they will match as secondary accidentals, contributing +/- 50c each.

**Secondary accidentals can stack**, and you don't need to declare a new secondary accidental for every unique number of times the symbol is repeated. Only declare secondary accidentals for unique symbols.

For example, there are 4 HEJI 7-limit accidentals, so we declare only 4 secondary accidentals:

```txt
sec()
u77 64/63 * 64/63
u7 64/63
d77 63/64 * 63/64
d7 64/63
```

Any repetitions of these symbols found on a note will stack.


The up/down arrows are declared in a specific order such that if there are double up/down arrows adjacent to each other, they will contribute +/- 30c instead of +/-(10 + 10)c.

#### Secondary accidental declaration order matters

🔴 The **declaration order of secondary accidentals has to be carefully chosen** so that certain combinations of symbols that overlap are matched with the correct precedence.

E.g. if `\\` was declared before `\\.\\`, then the `\\.\\` secondary accidental would never be matched, because the `\\` symbol would always match first.

Secondary accidental declaration is almost never done on its own, and instead you would want to declare [textual representations of the symbols](#advanced-declaring-text-representations-of-accidentals) at the same time.

### Advanced: Declaring text representations of accidentals

Declaring textual representations allows you to input accidentals (both SMuFL and text-based) by attaching fingering text on the note. These declarations are done together with [secondary accidental declarations](#advanced-secondary-accidentals) and work the same way, except you provide a quoted text string that represents the accidental.

```txt
...
sec()
'up77' u77 64/63*64/63
'up7' u7 64/63
```

The above example declares two secondary accidentals, `u77` and `u7`. To input them effeciently, you can attach a fingering and enter `up77` or `up7` respectively. After any plugin operation is applied to that note, the note will be regarded as if it has the symbols attached to it.

🔴 As usual, the **declaration order matters**. If the text representation `'up7'` was declared before `'up77'`, then `up77` would be matched as `up7` first, leaving a `7` that would not be matched. The plugin will then ignore the fingering as it thinks that it is not a valid text-representation of accidental(s).

Declaration order must be carefully chosen so that there's no ambiguity between text representations (as they can be stacked repeatedly in a single fingering text), neither should there be ambiguity in how to [match the secondary accidental symbols](#secondary-accidental-declaration-order-matters).

#### Elided text representations

If the secondary accidental itself is a single-element text accidental, then you won't need to repeat the text accidental twice:

```txt
sec()
'^' '^' 81/80 // this is unnecessary
'^' 81/80 // this does the same thing

// ⚠️ You can't do this. This is not a 
// single-element text accidental!
// `+`.`+` 50c

// do this instead:
'++' '+'.'+' 50c
```

-----

Congratulations on making it this far! You're encouraged to contribute your tuning systems to the project.

You can file a pull request adding files to the `tunings/` folder, or simply file an issue with your tuning config, and I'll add it for you.

🟠 If your tuning configuration contains many notes/equave and takes a long time to load, you should [pre-compute the tuning config](#1-pre-compute-the-tuning-config) into a `.json` file, which will help speed things up.

## How to: key signatures

Regardless of whether you're using standard or custom key signatures, you will need to declare key signatures using System/Staff text for this plugin to work with key signatures properly.

Just like the tuning config, System Text will apply the key signature for all staves from that bar onwards, whereas Staff Text will only apply to the staff it is written on.

The key signature text should start with `keysig`, followed by a space, followed by space-separated symbols codes that should apply to each nominal starting from the reference note.

E.g. if the tuning config specifies A4 as the reference note, and you have 7 nominals in your tuning, then:

```txt
keysig 0 0 # 0 0 # 0
```

...specifies that the nominals C and F should have the `#` symbol applied to them by default. `0` is used to mean natural/no symbol.

As per normal, if you require multiple symbols on a nominal, you can join them with periods, e.g.:


```txt
keysig #.+ 0 bbb.bbb.bb 0 17.bv2 0 x.#x.#x
```

...also specifies a (rather extreme) key signature for 7 nominals.

## How to use fingering annotations

> 🟢 If you're using fingering-related features, it is recommended to change the default MuseScore shortcut of `Ctrl+F` from _"Find / Go to"_ to _"Add fingering"_. This will make note entry much more efficient.

Fingerings are a handy way of attaching text directly to a single note. You can press space/tab to navigate between adjacent fingerings which allows you to edit them efficiently.

### 1. Entering accidentals via Accidental Vector

If you're dealing with a really large tuning system and can't reasonably access the accidental you need with just up/down & auxiliary operations, you can use fingerings to help you enter accidentals.

Create a fingering, type 'a', followed by comma-separated degrees of the [accidental vector](#accidental-vectors).

For example, the fingering `a-1,1,2` corresponds to the accidental symbols required to notate going down 1 step of the first accidental chain, up 1 step of the second chain, and up 2 steps of the third chain. The actual symbols that this corresponds to will depend on the Tuning Configuration being applied on that note.

Then, simply tune the note/score (or do some other operation) and the accidental symbols required to denote the accidental vector _-1,1,2_ will magically appear.

This is especially helpful for huge tunings with many accidental chains.

### 2. Fingerings to denote JI intervals

You can tune any note to a just intonation interval relative to the reference note by attaching a fingering of the ratio/math expression followed by a period.

The note's tuning will be automatically octave-reduced/expanded to match the octave that it is written in (in accordance to the Tuning Config), so you can use JI fingering annotations to supplement your existing tuning.

E.g. the fingering `19.` will cause a note to be tuned to the 19th harmonic of the reference pitch. You can also use JavaScript expressions like `Math.sqrt(19).` to cut that exactly into half. The 19th harmonic will automatically be octave-reduced be as close as possible to the original tuning of the written note.

> 🟠 If you regularly use this feature and do not require normal fingerings on your scores, you can set `var REQUIRE_PERIOD_AFTER_FINGERING_RATIO = false;` at around line 100 of `fns.js`. This will make all fingering text function as a JI ratio/harmonic by default, without the need for a period at the end &mdash; making your scores slightly neater.
>
> Of course, this will also make normal fingering numbers act as otonal harmonics, so you should be careful.

> ⚠️ This is not a replacement for accidentals. Fingering annotations do not carry over noteheads unlike accidentals. See [secondary accidentals](#advanced-secondary-accidentals) if you want a way to sporadically apply certain higher-order accidentals that need not be part of the declared accidental chains.

### 3. Fingerings to denote cent offsets

You can apply an additional cent offset to a note (on top of its standard tuning) by prefixing the fingering with a `+` or `-` sign.

E.g., `+5` on a note will make the note tune 5 cents higher than normal.

> ⚠️ This is not a replacement for accidentals. Fingering annotations do not carry over noteheads unlike accidentals. See [secondary accidentals](#advanced-secondary-accidentals) if you want a way to sporadically apply certain higher-order accidentals that need not be part of the declared accidental chains.

## How to: change shortcuts

You can change the keystrokes that this plugin listens to by editing `xen tuner.qml` directly. The syntax is pretty straightforward.

This is what the 'Tune' keybinding declaration looks like:

```qml
Shortcut {
  sequence: "Alt+R"
  context: Qt.ApplicationShortcut
  onActivated: {
      infoText.text = "Tuning score/selection...";
      Fns.operationTune();
      showWindow();
  }
}
```

If you want to change the keybinding to `Home` instead of `Alt+R` you can just modify the `sequence:` line:

```qml
Shortcut {
  sequence: "Home"
  context: ...
```

The strings of text that specifies a shortcut should be straightforward, but if you want to do anything fancy, you can refer to [the QT docs](https://doc.qt.io/qt-5/qkeysequence.html#details)

### More auxiliary operations

In the same `xen tuner.qml` file, you can specify/enable more auxiliary operations.

The default file contains this empty template:

```qml
Shortcut {
  sequence: "End"
  enabled: false // set to true to enable
  context: Qt.ApplicationShortcut
  onActivated: {
      infoText.text = "Moving note(s) up aux 5";
      Fns.operationTranspose(1, 5);
      showWindow();
  }
}
```

You can set `enabled: true` (or delete that line), then change `sequence` to a keybinding of your choice.

To control which Nth auxiliary operation this keybinding is for, simply set the second number of `Fns.operationTranspose(1, 5)` to the desired auxiliary operation number. E.g. the 10th auxiliary operation would be `Fns.operationTranspose(1, 10)`.

## Writing in huge tunings

When dealing with a large tuning (> 1500 notes/equave), the Tuning Configuration data gets really large. MuseScore's plugins API really isn't designed to handle such demanding tasks &mdash; so, when you run a Xen Tuner action for the first time after opening MuseScore, it is normal for the plugin to take a few seconds, or even minutes, to load a large tuning, if the score requests for it.

Of course, the plugin caches the tuning data, so this loading is a once-off event.

However, it still can be annoying to always have to wait every time you reopen MuseScore, or want to experiment with a new large tuning system. Thankfully, **there is a way to reduce the waiting time by 60-70%**.

Here are some ways to tackle the slow initialization/loading of tuning configs.

### 1. Pre-compute the tuning config

Instead of writing the tuning config into the score or into a .txt file, you can go to this link: https://euwbah.github.io/musescore-xen-tuner/ to convert your tuning configuration into a .json file. In a nutshell, you're pre-computing the tuning configuration, so that you don't need to do it within MuseScore.

Once you have the .json file (which you can rename to `whatever.json`, as long as it still has the `.json` extension), you can save it into the `tunings/` folder together with all the other .txt files.

You can reference this tuning configuration just like how you [reference any other `.txt` tuning config files](#how-to-tuning-configuration). When your score references a Tuning Configuration file, it will look for the `.json` file first, and reverts to the `.txt` file if the `.json` is not found.

This will make the initial loading of the tuning configuration much faster, but it still won't be instantaneous. A 1.6MB tuning config `.json` (&approx;5500 notes/equave) takes about 7 seconds to load.

This method is recommended if you're using a moderately large tuning system that is not ridiculously huge.

### 2. Use secondary accidentals

If there are some accidentals in a chain that you only use sporadically, you may want to consider using [secondary accidentals](#advanced-secondary-accidentals) instead of declaring them main accidentals.

The downside is that you aren't able to access these via the up/down/enharmonic operations. (But if you already have &gt; 4 accidental chains, this wouldn't affect you much.)

### 3. Use fingering text ratios/cent offsets

If you're tuning config exceeds 30MB, it's probably time to consider cutting down on accidentals/accidental chains that aren't used that often, and use the occasional fingering text to denote certain offsets.

You can still have access to all the SMuFL symbols, and you can 'trick' the plugin to accept these symbols as accidentals so that you still get the benefit of auto-positioning by using pseudo-ligatures. (Work in progress)

### 4. Clear the tuning cache

If you've been experimenting with several large-sized tuning systems within the same score/over the current MuseScore session, this will populate a runtime & score metadata cache which may use up too much memory over time.

- Quit/close the Xen Tuner plugin panel/window
- Run `Plugins > Xen Tuner > Clear Tuning Cache`
- Restart Xen Tuner

### 5. Notate comma shifts using reference pitch changes

One of the culprits of requiring a huge Tuning Config is if you're writing a piece that utilizes regular comma shifts, requiring many accidentals per note throughout a particular comma-shifted section of the piece.

**You can notate comma shifts by changing the reference note's frequency.** For example, if you want to shift down by 81/80 you can do this: `A4: 440 * 80/81`.

You can also use standard JavaScript/math expressions to accomplish more complicated comma shifts. E.g., shifting with respect to C4 instead: `C4: 440 * 16/27 * 80/81`.

or shifting up 10 syntonic commas and down 3 septimal commas: `A4: 440 * Math.pow(80/81, 10) * Math.pow(64/63, -3)`.

## How to: export MIDI/MPE

> ⚠️ This feature is still a work in progress. The generated microtonal .mid file does contain proper MPE MIDI messages and plays back correctly when imported directly into Pianoteq standalone. However, I haven't found a nice simple way to import this MPE MIDI data directly into a DAW. It seems like DAWs don't implement MPE import/export.

MPE is a specification building on top of the MIDI 1.0 standard which allows for polyphonic pitch bend, which this plugin relies on to export microtonal pitch offsets of up to 15 notes per staff.

Unfortunately, as far as I know, there isn't a way to import MPE midi files into DAWs directly. There are two options:

1. Import 1 channel at a time (from channel 1 to 15) into separate tracks/channels in your DAW, assigning the channel's pitch bend to 15 different copies of the synth.

2. Use the included python script to play back the generated MPE midi file in real-time through a virtual MIDI port on your computer. Record this play-back using any DAW that supports MPE MIDI controllers.

The "Export MIDI CSV" plugin generates a .mid.csv file at the same location as the score.

This file can be fed into the `generate-mpe.py` Python script.

To run this, first, you will need to install [Python 3](https://www.python.org/downloads/) (preferably 3.6 or higher).

After installing, Python, you will need to install three Python libraries: [mido](https://mido.readthedocs.io/en/latest/installing.html), [MIDIUtil](https://midiutil.readthedocs.io/en/1.2.1/), and [python-rtmidi](https://github.com/SpotlightKid/python-rtmidi).

> :warning: If you installed Python 3 (the normal way) on Windows, you will need to use the `py` command instead of `python3`.

```bash
python3 -m pip install MIDIUtil
python3 -m pip install mido
python3 -m pip install python-rtmidi
```

To run the midi generator script:

```bash
cd path/to/musescore-xen-tuner
python3 generate-mpe.py path/to/score.mid.csv
```

This will generate a .mid file at `path/to/score.mid`.

-----

## Updating the plugin

This plugin is very experimental, so make sure you're always using the most updated version of this plugin as bugs are always being fixed.
This plugin does not update automatically. Redownload the code from here, and replace the files.

> ⚠️ **IMPORTANT**: When updating the plugin, make sure you reopen MuseScore for changes to take effect. To be very certain that the newer files are being used, you can click the **Reload Plugins** button in the [Plugin Manager](https://musescore.org/en/handbook/3/plugins#enable-disable-plugins) to force reload all plugins.

## Troubleshooting

### The tuning is wrong/off

Checklist:

- Suffix your cents with `c`, numbers represent ratios by default.
- Prefix fingering cent offsets with `+`
- Suffix fingering JI ratios with `.`
- [Clear tuning cache](#4-clear-the-tuning-cache)
  - ⚠️ If you modify a tuning from a `.txt` or `.json` file, you will need to clear the tuning cache for the changes to take effect.
- Specify [key signature](#how-to-key-signatures)

If all else fails, [report an issue](#reporting-an-issue). Include the tuning config text you were trying to use and provide a score example.

### I changed the tuning config text, but the plugin isn't picking up the changes

- If there's a [pre-computed `.json` tuning file](#1-pre-compute-the-tuning-config), you will need to either delete it or use the [Xen Tuner pre-compute config tool](https://euwbah.github.io/musescore-xen-tuner/) to generate a new one with the updated tuning config text.
- You will need to [clear the tuning cache](#4-clear-the-tuning-cache) for the changes to take effect.
- If all else fails, you can just close MuseScore, rename the tuning config file, reopen MuseScore and use the new tuning config name.

### If the plugin is lagging/tuning isn't correct

- [Reset the tuning cache](#4-clear-the-tuning-cache). It is recommended to do this often when you are playing around with many tunings in one score but are no longer using most of the tunings you experimented with.

If you're dealing with many notes per equave (>1000), see [how to deal with huge tunings](#writing-in-huge-tunings)

## Workarounds + advanced configs

There are certain advanced configuration options at the top of the `fns.js` file, which you can modify to change certain behaviours of the plugin.

### When I select a single notehead, it doesn't play the right pitch. However, playing back the score works fine.

This is normal. The plugin modifies `PlayEvent`s to affect the MIDI pitch of the note, which are not reflected when you select a notehead. Modifying `PlayEvent`s to compensate for large tuning offsets reduces distortion of the note's timbre during playback. However, if you want to hear the correct pitch all the time and disregard adjusting for timbre, you can modify this line in `fns.js` (around line 150):

```js
var PLAY_EVENT_MOD_SEMITONES_THRESHOLD = 1000;
```

Set the number to like 1000 or something, and that will ensure that the playback upon selecting a notehead is mostly correct. However, when you have two notes on the same staff line, e.g. [augmented unisons](https://github.com/euwbah/musescore-xen-tuner/issues/1), the plugin will still modify the `PlayEvent` to ensure that the notes play back correctly.

### The timbre is weird when I play back the score

This is the inverse problem of the above workaround. Simply set:

```js
var PLAY_EVENT_MOD_SEMITONES_THRESHOLD = 0;
```

This way, `PlayEvent`s will be aggressively modified to ensure that the `Note.tuning` offset is kept to a minimum.

### Augmented/diminished unisons in the same voice/stafff/instrument/part don't play back

This is a [known problem](https://github.com/euwbah/musescore-xen-tuner/issues/1#issuecomment-1396622359) and has to do with how MuseScore handles playback as MIDI notes. You can see how two notes on the same staff line are represented as the same note in the [piano roll](https://musescore.org/en/handbook/3/piano-roll-editor), thus making them indistinguishable to the playback engine.

To work around this, simply attach standard-support accidentals (those that affect playback, not the symbolic ones) to either one of the clashing notes and make them invisible.

Doing this will change how the note's MIDI pitch is represented internally so that they won't clash. The plugin will know how to compensate for the added accidentals, and you can use up to triple sharps/flats.

### Enharmonic equivalents aren't showing up / are incorrect

Around line 127 of `fns.js`, there is this setting:

```js
var ENHARMONIC_EQUIVALENT_THRESHOLD = 0.005;
```

This sets the threshold interval (in cents) where two notes should be considered enharmonically equivalent.

If enharmonic equivalents in your ET/temperament are not showing up, try increasing this number slightly (e.g. 0.01). Floating point errors (inaccuracies in computer number-crunching) may cause enharmonically equivalent notes to have slightly different cent values. Also, make sure you specify your cent offsets to as many decimal places as possible to reduce this error.

If you're working in a very large JI subset and there are no enharmonic equivalents, it's recommended to set this number smaller (or even to 0), to prevent two very similar notes being regarded as enharmonically equivalent, since there are no equivalents in JI.

### Keyboard shortcuts stop working

You could have started more than one instance of Xen Tuner. Close Xen Tuner and restart, or restart MuseScore.

If you ran Xen Tuner from the Plugin Creator, you will need to restart MuseScore to restart Xen Tuner normally again.

## Reporting an issue

If none of the above remedies work, you will need to [file an issue here](https://github.com/euwbah/musescore-xen-tuner/issues). Please include the following information:

- Version of MuseScore
- Version of plugin
- Operating system
- Debug logs
  - Stop running Xen Tuner (close plugin window/quit button).
  - Open the **Plugin Creator** (Plugins > Plugin Creator).
  - Open the `xen tuner.qml`
  - Run the plugin from the Plugin Creator.
  - Repeat the action you did that caused the issue.
  - Usually if an error occurs, you should be able to see the error message at the bottom of the log.
  - Copy and paste as much of the debug log as you can, **making sure that you include the error message** at the bottom.

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


## Caveats

- Does not intend to use the standard Accidentals at all. Accidental symbols used/created by the plugin are cosmetic symbols from the "Symbols" category of the Master Palette. This means:
  - You cannot drag accidentals from the "Accidentals" palette. All accidentals used must be from the "Symbols" category in the Master Palette.
  - Existing scores not made by this plugin will not work with this plugin.
  - Accidentals on grace notes can't be made smaller.
  - Formatting may look weird as this plugin has to reconstruct how accidentals are to be positioned.
- Only concert pitch display mode is supported. If you wish to write for transposing instruments in its transposed key, put the score in Concert Pitch mode and use a Staff Text to enter a Tuning Config such that the tuning frequency matches the transposition of the instrument.
- Does not fully support cross-staff notation. Accidentals don't carry over between two different staves if cross-staff notation is used. However, you can specify all accidentals explicitly.

#### Smaller caveats

- 5-10s freeze after starting this plugin for the first time after opening MuseSoce. [The plugin is loading](https://musescore.org/en/node/306551#comment-1005654).
- Does not differentiate between the order of appearance of accidentals within one note.
- Does not intend to support having the same symbols in two different accidental chains (I am unaware of any notation system that requires this)
- Does not support grace notes occurring _after_ a note. Grace notes occuring _before_ a note are supported.
- Octave 8va/15ma/etc... lines are not supported when non-standard number of nominals are used (e.g. bohlen pierce). You can simulate an octave line by setting the reference frequency higher/lower when needed.
- If an undeclared accidental combination is used, the note will be regarded as without accidental, even if some (but not all) symbols are declared in accidental chains.
- Ornaments can only be tuned within +/- 100 cents resolution.
- When exporting MIDI, crescendos/diminuendos do not affect velocity. There doesn't seem to be a simple way to get the velocity of a note from the plugin API.
- Could be very laggy...

-----

## Clarifications

- The use of the term _accidental chain_ in this readme is not related to ["Nominal-Accidental Chains"](https://en.xen.wiki/w/Nominal-accidental_chain). The former represents a sequence of accidentals where two adjacent accidentals differ by a more-or-less consistent interval size. The latter is a more general descriptor of the phenomenon where most western-centric notation systems involve one nominal and some accidentals which can generate a sequence of notes.

- The "Xen Tuner" name is unrelated to [Keenan Pepper's MuseScore Xentuner pluging](https://github.com/keenanpepper/musescore-xentuner). This naming coincidence I only realized after naming the project.

-----

## [Contributors](CONTRIBUTORS.md)

-----

## [Dev Notes](/DEVELOPMENT.md)

See dev notes for technical implementation details.
