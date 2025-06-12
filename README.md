# Xen Tuner: Microtonal MuseScore Plugin Suite

A **MuseScore 3.6** plugin to give first-class support for microtonal/alternative notation systems. [MuseScore 4 support needs testing](#1-testing-on-ms-4).

[![GitHub Sponsors](https://img.shields.io/github/sponsors/euwbah?style=for-the-badge)](https://github.com/sponsors/euwbah)

## Features/Goals

- [x] Infinitely many tuning systems with customizable SMuFL/text-based accidentals. [HEJI](https://en.xen.wiki/w/Helmholtz-Ellis_notation), [HEWM](http://tonalsoft.com/enc/h/hewm.aspx), [Sagittal](https://en.xen.wiki/w/Sagittal_notation), [Johnston JI](https://www.kylegann.com/BJNotation.html), [Rank 2/3/+ tunings](https://en.xen.wiki/w/Ups_and_Downs_Notation_for_Rank-3_JI), [very large edos](https://en.xen.wiki/w/Syntonic-rastmic_subchroma_notation), ... (SMuFL symbols data entry [help needed](#2-data-entry-of-accidentals)! Currently at 77%)

- [x] Automated tuning & placement of multiple accidentals.

- [x] Every accidental/note is accessible with up/down operations and 'J' to cycle through enharmonics, no matter how large the tuning.

- [x] Configurable auxiliary up/down operations to transpose by selected accidentals/nominals.

- [x] Accidental ligatures where multiple accidentals can combine and be represented as a single symbol (e.g. HEJI & Sagittal)

- [x] Use of fingerings for text-based input of accidentals

- [x] Specifying JI ratios and cent offsets in fingerings.

- [ ] Proper transposition by any interval of choice for all regular mappings.

- [x] MIDI/MPE export with channel pitch bend support. (WIP. MIDI files containing MPE data are generated, but no workflow exists to import these directly to a DAW)

## Quick Start

> [!WARNING]
> This project is very experimental. Please check [Caveats](#caveats)

### 1. Download & activate plugin

Download the project as .zip (the green "Code" button on top right of the project page).

Extract files to plugins folder and **activate all the following plugins** (see [this guide](https://musescore.org/en/handbook/3/plugins) if you don't know how):

- _xen tuner_ - This is the main plugin that runs in the background.
- _clear tuning cache_ - For [refreshing tuning configurations](#4-clear-the-tuning-cache)
- _export midi csv_ - For [midi/mpe export](#how-to-export-midimpe)
- _display cents_ - To auto-generate [cent offset text](#8-display-steps--display-cents)
- _display steps_ To display [edosteps of notes](#8-display-steps--display-cents)

### 2. Remove MuseScore default shortcuts

⚠️ **The following default keyboard shortcuts in [MuseScore's shortcut preferences](https://musescore.org/en/handbook/3/preferences#shortcuts) must be removed/remapped**. This plugin is designed to *replace/add these default shortcuts**:

- `Up/Down` arrow keys: Pitch up/down or move text/articulation up/down
- `J`: Cycle through enharmonically equivalent spellings
  - `Shift+J`: Cycle enharmonics in reverse order
- `Shift+Alt+Up/Down`: Diatonic up/down
- `Alt+Up/Down`: Go to higher/lower pitched note in chord
  - Remap this to Page Up/Down, it's a useful shortcut to have still.
- `Ctrl+Alt+Up/Down`: Go to top/bottom note in chord

Also, if you're going to use the [fingering accidentals/tuning feature](#how-to-use-fingering-annotations) a lot, it's recommended to **remap `Ctrl+F` to "Add fingering"** instead of "Find / Go to".

### 3. Start Xen Tuner

![start tuner](imgs/start-xen-tuner.png)

Start the plugin in **Plugins > Xen Tuner > Start Xen Tuner**.

> [!WARNING]
> **Xen Tuner should be started only once per session**. Starting the plugin will open a small docked panel on the bottom left. If you close this panel, you will need to restart Xen Tuner.
>
> Starting Xen Tuner will freeze MuseScore for about 5 seconds while it loads. This is normal.


> [!CAUTION]
> If you wish to close the plugin, use the "Quit" button. **Do not close the plugin window directly using the window's 'X' button**, otherwise the keyboard shortcuts will still be bound to the plugin.

### 4a. Select tuning configuration

![specify tuning config](imgs/specify%20tuning%20config.png)

[**Tunings configurations**](#how-to-tuning-configuration) are `.txt` (text) files located inside the `tunings/` folder of the project which describe a particular tuning and notation system to the plugin.

In the image above,

- **heji/5 limit** refers to the tuning config file located at [`tunings/heji/5 limit.txt`](tunings/heji/5%20limit.txt),
- **hewm/7 limit hybrid** refers to the tuning config file located at [`tunings/hewm/7 limit hybrid.txt`](tunings/hewm/7%20limit%20hybrid.txt).
- ...in general, **a/b/c/d** refers to the file located at `tunings/a/b/c/d.txt`.

To activate a tuning configuration to all staves, insert a System Text (`Ctrl + Shift + T`) to the score at the start of any bar, which will apply the referenced tuning configuration `.txt` file from that bar onwards. The plugin supports different tunings/notation systems across different bars.

To apply a configuration to only one staff, use a Staff Text (`Shift + T`) instead of System Text.

These Staff/System Texts can be made invisible (select text element and press `V` to toggle visibility).

> [!TIP]
> For a start, try out `heji/5 limit`, which references the `./tunings/heji/5 limit.txt` tuning system configuration file.
>
> Browse tunings in the [tunings/](./tunings/) folder to find notations that are already supported.
>
> Continue reading to learn how to [create your own tuning configurations](#how-to-tuning-configuration), or [submit a tuning config request issue](https://github.com/euwbah/musescore-xen-tuner/issues/new?assignees=&labels=tuning+config+request&projects=&template=request-contribute-tuning-config.md&title=).

> [!NOTE]
> **For power users**: Sometimes, a tuning config file has a `.json` file type instead of the usual `.txt`. This is used for [very large tunings](#1-pre-compute-the-tuning-config) which have precomputed tuning configuration files. Modifying the `.txt` file alone will not affect the tuning configuration, instead, delete the `.json` file and use the [web tool (https://euwbah.github.io/musescore-xen-tuner/)](https://euwbah.github.io/musescore-xen-tuner/) to create a new `.json` precomputed tuning configuration file.
>
> 🟠 While it is not recommended, you can also input the [tuning configuration text](#tuning-configuration-syntax-overview) directly into System/Staff texts, which may be helpful when testing your own custom tuning configs. Newlines/enter/return can be entered into System/Staff Text using `Shift` + `Enter`/`Return`. Remember to save it into a `.txt` file once you're done testing!

### 4b. Annotate key signatures

![key sig example](imgs/keysig-example.png)

> [!CAUTION]
> All key signatures, **regardless of whether a standard or custom/microtonal key signature is used**, [must be annotated](#how-to-key-signatures) in order for the plugin can read them, **otherwise they will be ignored by the plugin**.

[Read how to annotate key signatures using System/Staff Text here](#how-to-key-signatures)

These Staff/System Texts don't have to be visible (use the default MuseScore keyboard shortcut `V` to toggle visibility).

### 5. Entering notes & accidentals

#### Entering notes using up/down arrow keys

- Enter notes as per normal.
- **Press `Alt+R` after entering new notes to update the tuning & formatting**. (⚠️ **Do not confuse with `Ctrl` + `R`**, which will reset the plugin's autoplacement of accidental symbols)
- The up and down arrow keys will cycle through pitches defined in the tuning configuration.

> [!NOTE]
> In large tunings (e.g. `hewm/540edo`), not all pitches can be accessed using up/down arrow keys alone. Instead, some accidentals have to be input manually using [fingerings](#entering-accidentals-directly-using-fingerings) or by other means. These manual-input accidentals are called [**secondary accidentals**](#advanced-secondary-accidentals), as opposed to the **primary accidentals** which are declared in the tuning configuration as [**primary accidental chains**](#accidental-chains--degrees). Only notes in the [primary tuning space](#primary-tuning-space) containing only primary accidentals can be accessed from pitch up/down operations.

Use `Alt`/`Ctrl`/`Shift` modifiers to control the pitch modification performed by arrow keys:

- `Up`/`Down`: Move note up/down to the next nearest step
- `J`/`Shift+J`: Cycle through enharmonics of the note (use shift for reverse order)
- `Alt+Up/Down`: **auxiliary operation 1** (usually for moving up/down diatonically)
- `Ctrl+Alt+Up/Down`: **auxiliary operation 2** (usually for sharps/flats - first accidental chain)
- `Alt+Shift+Up/Down`: **auxiliary operation 3** (usually 5-limit accidentals - or second accidental chain)
- `Ctrl+Alt+Shift+Up/Down`: **auxiliary operation 4** (usually 7-limit accidentals - or third accidental chain)

These shortcuts can all be modified, and more auxiliary operations can be added, with a simple edit made to the main `.qml` plugin file. [Read how to configure shortcuts here](#how-to-change-shortcuts).

#### Entering accidentals using fingerings

Entering accidentals via fingerings can be done when [text representations of accidentals](#advanced-declaring-text-representations-of-accidentals) are declared in the tuning config. The plugin matches strings of text and converts them into accidental symbols (which can either be SMuFL or text-based). Refer to the `sec()` section of a tuning config .txt file to look up the text representation of accidental symbols.

> [!NOTE]
> Use the fingering text `n` to add a natural accidental.

> [!TIP]
> When using this feature, it is recommended to **map the default `Ctrl+F` shortcut to "Add fingering"** instead of "Find / Go to".

Select a note, hit `Ctrl+F`, then enter the [text representation](#advanced-declaring-text-representations-of-accidentals) of the accidental(s) you need on that note. Press space or shift+space to add/modify fingerings to next/previous notes respectively.

Once fingerings are entered, hit `Alt+R` (while selecting nothing or selecting the modified notes) and the accidentals will render & format themselves.

#### Manually adding accidentals

The most primitive method: dragging SMuFL symbols in from the **Master Palette** (shortcut `Z`), then hitting `Alt`+`R`.

> [!CAUTION]
> The plugin **does not recognize the standard accidentals** that MuseScore normally uses from the **Accidentals** palette. You must use SMuFL symbols from the 'Symbols' category in the **Master Palette** (shortcut: `Z`).

### 6. Change reference pitch

Change the reference pitch of a score by adding a System Text or Staff Text element with the text `<midi note name>: <frequency>`.

🟡 **For example**, the text `A4: 440` will set the written note A4 to sound at 440hz.

You can use math/javascript expressions to calculate the frequency:

🟡 **e.g.**:

- `C4: 16/27 * 440` will set the written note C4 to sound at a 3-limit major 6th below A4=440
- `C4: 440 * Math.pow(2, -17/22)` will set the written note C4 to sound at 17 steps of 22edo below A4=440.

> [!TIP]
> If only the reference note is specified without frequency (e.g. `C4:`), only the relative tuning note (the first nominal) will change while the frequency of all notes remain unchanged, which is useful if you're making use of [just intonation ratios on notes](#2-fingerings-to-denote-ji-intervals) or want the [Display Cents/Steps](#8-display-steps--display-cents) plugins to use a different reference note as the root note (`1/1`, step 0).
>
> When changing the reference note, **key signature annotations also have to be updated since the order of nominals will be changed**.
>
> In non-octave tunings with less/more than 7 nominals, the reference note refers to the note as it appears on the staff in the usual 12edo, and all other nominals will be calculated relative to it.

> [!WARNING]
> You cannot use an accidental in the reference note. It must be a plain nominal without accidental.

<details>
<summary>
🟠 <b>Advanced feature:</b> when you change the MIDI reference pitch, the plugin will preserve the mode of the <a href="#nominals--equave">nominals</a>, but you can override the starting note of the nominals by prefixing a `!`, e.g. `!C4: 263`.<br>
</summary>

**E.g.** Let's say [the tuning config declares](#simple-example) `A4: 440` and nominals according the "white keys" (A aeolian mode ABCDEFG).
If we change the reference pitch to `C4: 256`, it will still preserve the nominal's mode such that ABCDEFG will be LsLLsLL (W-H-W-W-H-W-W), preserving the 'white keys'

However, if we use `!C4: 256`, it will override the starting note of the nominals to C, and the nominals will be CDEFGABC (W-H-W-W-H-W-W), which means the written 'white keys' now sound like C minor.

This is rarely ever useful though, and only provided as an advanced feature for esoteric notation systems/alternate clefs.
</details>

### 7. Implement your own tunings/notation systems!

Continue reading the rest of the guide to learn how to create custom tuning configurations.

Alternatively, dive straight in to the [`tunings/`](./tunings/) folder for examples. [heji/5 limit](./tunings/heji/5%20limit.txt) showcases all the main features of this plugin, so it's a good place to start.

If you require assistance with implementing any particular notation system, or want to contribute a tuning config but don't know how to use Git, feel free to [file an issue under Request/contribute tuning config](https://github.com/euwbah/musescore-xen-tuner/issues/new?assignees=&labels=tuning+config+request&projects=&template=request-contribute-tuning-config.md&title=).

#### [Tuning config web tool](https://euwbah.github.io/musescore-xen-tuner)

You can use the [tuning configuration compiler/debugger](https://euwbah.github.io/musescore-xen-tuner) web tool to [check for syntax errors](#i-made-my-own-tuning-config-but-it-doesnt-seem-to-be-doing-anything-treated-as-12edo). You can also use it 'compile' your tuning config into a `.json` file so that [large tuning files can be pre-computed](#1-pre-compute-the-tuning-config) for faster loading.

If you're facing a bug or need help, [file an issue](#reporting-an-issue).

### 8. Display Steps & Display Cents

![Display steps/cents](imgs/display-steps-cents.png)

You can automatically generate text to display the cent offsets and edo/neji-steps of notes in the score/selection. Use the **Display Steps** and **Display Cents** plugins to do this.

> [!CAUTION]
> These must be enabled in the tuning config `.txt` file using the [`displaysteps()` declaration](#configuring-display-steps) and [`displaycents()` declaration](#configuring-display-cents) respectively.

**Display Steps** will attach fingerings to notes to display how many steps the note is away from the [reference tuning note](#6-change-reference-pitch).

**Display Cents** will attach fingerings to notes to display the cent offset of the note relative to its nominal tuning (`nominal` mode). However, you can also configure the [`displaycents()` declaration](#configuring-display-cents) to use `absolute` (relative to reference tuning pitch) or `semitone` (cents ÷ 100) mode, and adjust how many decimal places are displayed.

> [!NOTE]
> You don't need to delete previously generated text before running **Display Cents/Steps** again to update the cents/steps information. Simply run **Display Cents/Steps** again, and it will override the old text values.

-----

### [List of Supported Symbols](https://docs.google.com/spreadsheets/d/1kRBJNl-jdvD9BBgOMJQPcVOHjdXurx5UFWqsPf46Ffw/edit?usp=sharing)

This is still a work in progress. Free for all to edit, and [in need of community contribution](#2-data-entry-of-accidentals)!

-----

# Full documentation

- [Features/Goals](#featuresgoals)
- [Quick Start](#quick-start)
  - [1. Download \& activate plugin](#1-download--activate-plugin)
  - [2. Remove MuseScore default shortcuts](#2-remove-musescore-default-shortcuts)
  - [3. Start Xen Tuner](#3-start-xen-tuner)
  - [4a. Select tuning configuration](#4a-select-tuning-configuration)
  - [4b. Annotate key signatures](#4b-annotate-key-signatures)
  - [5. Entering notes \& accidentals](#5-entering-notes--accidentals)
    - [Entering notes using up/down arrow keys](#entering-notes-using-updown-arrow-keys)
    - [Entering accidentals using fingerings](#entering-accidentals-using-fingerings)
    - [Manually adding accidentals](#manually-adding-accidentals)
  - [6. Change reference pitch](#6-change-reference-pitch)
  - [7. Implement your own tunings/notation systems!](#7-implement-your-own-tuningsnotation-systems)
    - [Tuning config web tool](#tuning-config-web-tool)
  - [8. Display Steps \& Display Cents](#8-display-steps--display-cents)
  - [List of Supported Symbols](#list-of-supported-symbols)
- [Introduction](#introduction)
  - [Nominals \& Equave](#nominals--equave)
  - [Symbol codes, text codes, text-based accidental symbols](#symbol-codes-text-codes-text-based-accidental-symbols)
  - [Escape codes](#escape-codes)
  - [Constructing an accidental](#constructing-an-accidental)
  - [Accidental chains \& degrees](#accidental-chains--degrees)
  - [Accidental vectors](#accidental-vectors)
  - [Primary tuning space](#primary-tuning-space)
- [How to: tuning configuration](#how-to-tuning-configuration)
  - [Tuning configuration overview](#tuning-configuration-overview)
  - [Tuning configuration syntax overview](#tuning-configuration-syntax-overview)
  - [Full example](#full-example)
  - [Simple example](#simple-example)
  - [Relative tuning interval syntax](#relative-tuning-interval-syntax)
  - [Adding accidentals](#adding-accidentals)
  - [Adding too many accidentals](#adding-too-many-accidentals)
  - [Just Intonation (JI)](#just-intonation-ji)
  - [More accidental chains: 5-limit JI](#more-accidental-chains-5-limit-ji)
  - [Accidental ligatures: "Real" HEJI](#accidental-ligatures-real-heji)
  - [Auxiliary operations](#auxiliary-operations)
  - [Configuring display steps](#configuring-display-steps)
  - [Configuring display cents](#configuring-display-cents)
  - [Advanced: Irregularly sized accidental chains](#advanced-irregularly-sized-accidental-chains)
  - [Advanced: advanced ligature use, weak \& important ligatures](#advanced-advanced-ligature-use-weak--important-ligatures)
    - [Understanding how the plugin parses \& reads accidentals](#understanding-how-the-plugin-parses--reads-accidentals)
    - [What exactly are ligatures?](#what-exactly-are-ligatures)
    - [Weak \& important attributes on a ligature set](#weak--important-attributes-on-a-ligature-set)
    - [Strong vs weak ligatures](#strong-vs-weak-ligatures)
    - [Important vs non-important ligatures](#important-vs-non-important-ligatures)
    - [Weak \& important ligatures case study: HEJI](#weak--important-ligatures-case-study-heji)
  - [Advanced: Text based accidentals](#advanced-text-based-accidentals)
  - [Advanced: Secondary accidentals](#advanced-secondary-accidentals)
    - [Secondary accidental declaration order matters](#secondary-accidental-declaration-order-matters)
    - [Secondary accidentals automatically repeat](#secondary-accidentals-automatically-repeat)
  - [Advanced: Declaring text representations of accidentals](#advanced-declaring-text-representations-of-accidentals)
    - [Elided text representations](#elided-text-representations)
  - [Advanced: Independent accidental symbols](#advanced-independent-accidental-symbols)
  - [Advanced: Override Tunings, Near-Equal Just Intonation (NEJI), Irregular Accidental Sizes](#advanced-override-tunings-near-equal-just-intonation-neji-irregular-accidental-sizes)
    - [Irregular accidental sizes: `override()` for primary accidentals](#irregular-accidental-sizes-override-for-primary-accidentals)
    - [Irregular accidental sizes: secondary accidentals](#irregular-accidental-sizes-secondary-accidentals)
  - [Advanced: Other configurations](#advanced-other-configurations)
    - [`nobold()`](#nobold)
    - [`explicit()`](#explicit)
- [How to: key signatures](#how-to-key-signatures)
- [How to use fingering annotations](#how-to-use-fingering-annotations)
  - [0. Entering accidentals](#0-entering-accidentals)
  - [1. Entering accidentals via Accidental Vector](#1-entering-accidentals-via-accidental-vector)
  - [2. Fingerings to denote JI intervals](#2-fingerings-to-denote-ji-intervals)
  - [3. Fingerings to denote cent offsets](#3-fingerings-to-denote-cent-offsets)
- [How to: change shortcuts](#how-to-change-shortcuts)
  - [More auxiliary operations](#more-auxiliary-operations)
- [Writing in huge tunings](#writing-in-huge-tunings)
  - [1. Pre-compute the tuning config](#1-pre-compute-the-tuning-config)
  - [2. Use secondary accidentals](#2-use-secondary-accidentals)
  - [3. Use fingering text ratios/cent offsets](#3-use-fingering-text-ratioscent-offsets)
  - [4. Clear the tuning cache](#4-clear-the-tuning-cache)
  - [5. Notate comma shifts using reference pitch changes](#5-notate-comma-shifts-using-reference-pitch-changes)
- [How to: export MIDI/MPE](#how-to-export-midimpe)
- [Updating the plugin](#updating-the-plugin)
- [Troubleshooting](#troubleshooting)
  - [The tuning is wrong/off](#the-tuning-is-wrongoff)
  - [I made my own tuning config, but it doesn't seem to be doing anything, and notes are treated as 12edo](#i-made-my-own-tuning-config-but-it-doesnt-seem-to-be-doing-anything-and-notes-are-treated-as-12edo)
  - [The plugin just breaks when I use certain accidental symbols/text-entry combinations](#the-plugin-just-breaks-when-i-use-certain-accidental-symbolstext-entry-combinations)
  - [I changed the tuning config text, but the plugin isn't picking up the changes](#i-changed-the-tuning-config-text-but-the-plugin-isnt-picking-up-the-changes)
  - [If the plugin is lagging/tuning isn't correct](#if-the-plugin-is-laggingtuning-isnt-correct)
- [Workarounds + advanced configs](#workarounds--advanced-configs)
  - [When I select a single notehead, it doesn't play the right pitch. However, playing back the score works fine.](#when-i-select-a-single-notehead-it-doesnt-play-the-right-pitch-however-playing-back-the-score-works-fine)
  - [The timbre is weird when I play back the score](#the-timbre-is-weird-when-i-play-back-the-score)
  - [Augmented/diminished unisons in the same voice/stafff/instrument/part don't play back](#augmenteddiminished-unisons-in-the-same-voicestafffinstrumentpart-dont-play-back)
  - [Enharmonic equivalents aren't showing up / are incorrect](#enharmonic-equivalents-arent-showing-up--are-incorrect)
  - [Keyboard shortcuts stop working](#keyboard-shortcuts-stop-working)
- [Reporting an issue](#reporting-an-issue)
  - [Accessing plugin debug logs in MuseScore 3](#accessing-plugin-debug-logs-in-musescore-3)
  - [Accessing plugin debug logs for MuseScore 4](#accessing-plugin-debug-logs-for-musescore-4)
- [HELP NEEDED!](#help-needed)
  - [1. Testing on MS 4](#1-testing-on-ms-4)
  - [2. Data entry of accidentals](#2-data-entry-of-accidentals)
- [Caveats](#caveats)
    - [Smaller caveats](#smaller-caveats)
- [Clarifications](#clarifications)
- [Contributors](#contributors)
- [Changelog](#changelog)
- [Dev Notes](#dev-notes)
- [Support me](#support-me)



## Introduction

> [!TIP]
> This section introduces important terminology. It is recommended to read this section before the rest of the guide.

### Nominals & Equave

The **nominals** are the 'musical alphabet'. In 12edo terms, we call them the 'white keys'. That is, the notes without any accidentals attached to them.

Normally there are only 7 nominals (letters A to G), and the distance between two of the same nominals is called an octave.

However, in Xen Tuner, you're free to declare as many nominals as you want, tuned to whatever you want, as long as you have at least 2 nominals. The distance between two adjacent equivalent nominals (e.g., `C4` and `C5`) is called an **equave**, which is a generalization of the octave. You can set the equave to whatever interval you want.

This means you can implement a tuning conifguration for notation systems like the [chromatic staff](https://www.youtube.com/watch?v=U7l7s1Vr6lQ&ab_channel=FabioCostaMusic), where all nominals are the same size, or [Bohlen-Pierce](https://www.youtube.com/watch?v=sd1b9Lh8iFA&t=89s&ab_channel=KjellHansen) with 9 nominals. For whatever reason, you can even write using the negative treble clef (negative harmony) by setting the equave to negative `-1200c`. Then, notes that are visually going up will sound like they're going down.

### Symbol codes, text codes, text-based accidental symbols

A **symbol code** is a number that represents a single accidental symbol element which can either be a SMuFL symbol ID or one or more characters of UTF text.

This plugin only uses SMuFL symbols from the 'Symbols' category in the Master Palette (shortcut 'Z'). Do not use accidentals from the 'Accidentals' palette.

![symbols palette](imgs/symbols%20palette.png)

To refer to a SMuFL symbol when setting up a tuning/key signature, either use the Symbol Code number (the _Symbol Code_ column of the [spreadsheet](https://docs.google.com/spreadsheets/d/1kRBJNl-jdvD9BBgOMJQPcVOHjdXurx5UFWqsPf46Ffw/edit?usp=sharing)), or use the Text Code representation of the symbol (_Text Code_ column of the spreadsheet).

![Spreadsheet lookup](imgs/spreadsheet%20lookup.png)

> [!NOTE]
> **E.g.** both `#` and `5` can be used to refer to the sharp symbol.
>
> Symbol Code `100` doesn't have a Text Code attributed to it (at this time of writing), so you can only refer to it by entering `100`.

**UTF/ASCII text-based accidentals are specified using single quotes**. All UTF characters are supported except spaces, tabs, or newlines. These symbols will be displayed as fingering text beside the notehead and will be formatted like an accidental symbol.

> [!NOTE]
> **E.g.** `'abc'` represents the literal text "abc" as a single accidental symbol.

### Escape codes

When referring to Text Codes or Text-based accidentals in the tuning configuration, certain special charcters need to be escaped with a backslash:

- Write `'` as `\'` unless you intend to create a text-based accidental
- Write `\` as `\\` unless you intend to write one of these escape codes.
- Write `//` as `\/\/` unless you intend to write a comment.

This applies to **both text codes and quoted text accidentals**.

For example, the down arrow symbol (SymbolCode 43) must be referred to as `\\` even though the text code for it is `\`.

### Constructing an accidental

Multiple symbols can combine to form a single logical accidental that represents a single pitch adjustment. Separate each symbol code/quoted text with a period to combine them.

> [!NOTE]
> **E.g.** `x./.'hi'` refers to a single accidental consisting of the double sharp symbol, up arrow symbol and the text 'hi', in left to right order.

### Accidental chains & degrees

Now, when we say "sharps and flats", these accidentals represents a chain of accidentals along a spectrum. In this plugin, we call this an **accidental chain**. Each successive item in this chain of sharps and flats refer to a constant-sized pitch increment. The number of increments of the unit interval is called the **degree** of the **chain**. `#` (sharp) is "degree 1", and `bb` (double flat) is "degree -2" of the sharps-flats chain.

In 12edo, each degree along the sharps/flats chain represents a 100 cent increment, so degree -2 would be -200 cents. We can theoretically extend this chain indefinitely to include as many sharps and flats as we want.

A note can only have one accidental degree per accidental chain. E.g., it wouldn't make sense to call a note "C-sharp-double-flat-triple-natural", we would just sum up the degrees (+1 - 1 - 1 + 0 + 0 + 0 = -1) and call it "C-flat".

To combine different accidentals together, declare multiple accidental chains. E.g. `C#/` can mean +1 degree sharp, and +1 degree of the syntonic comma.

### Accidental vectors

The degrees of each accidental chain form a list of numbers called the **accidental vector**. This is a unique representation of the [primary accidentals](#primary-tuning-space) (excludes [secondary accidentals](#advanced-secondary-accidentals)) attached to a note.

> [!NOTE]
> **E.g.** in 5-limit Helmholtz-Ellis Just Intonation (HEJI) notation, we need to define two **accidental chains**.
>
> First, the chain of sharps and flats, where each step in the 'sharp' direction corresponds to the apotome interval (2187/2048). These accidentals allow us to access 3-limit just intonation.
>
> Next, the chain of syntonic commas, where each step up is equal to the syntonic comma (81/80). These accidentals unlock 5-limit just intonation.
>
> Now, we can notate the classic major third (5/4) of `D` as `F#v` (F-sharp-down). `F#v` is 1 step up in the 'sharp' direction, and 1 step down in the 'syntonic comma' direction. Thus, we can represent this note as having the accidental vector of `1, -1` if the first accidental chain contains sharps/flats and the second contains the syntonic commas `^`/`v`.

### Primary tuning space

In this plugin, there are two ways accidentals can be declared. The primary accidentals are declared using [Accidental Chains](#accidental-chains--degrees), but there are also [secondary accidentals](#advanced-secondary-accidentals) which allow you to declare how non-primary symbols are interpreted.

Notes with accidentals declared via accidental chains form the **primary tuning space**, which is the 'fully supported' set of notes that the plugin recognizes. You can think of these fully supported notes as '[Tonal Pitch Classes](https://en.wikipedia.org/wiki/Pitch_class_space)', but for **XenNotes** instead of normal 12edo notes.

In large tunings like high-limit JIs and very large edos, it's common to use notes that are outside primary tuning space, as it wouldn't be feasible to declare as many accidental chains as there are [ranks](https://en.xen.wiki/w/Rank_and_codimension) in the tuning, otherwise it would take forever to press the up/down arrow keys until the desired note shows up.

The caveat is that these notes will not be accessible via the up/down arrow keys, and will also not be supported by the [Display Steps](#8-display-steps--display-cents) feature.

-----

## How to: tuning configuration

To declare a tuning system, we need to enter the **Tuning Configuration** into the score. These can be entered as text in **System Text** or **Staff Text** elements.

System Text elements will apply to all staves, whereas Staff Text will only apply to the staff it is attached to. Configurations will only apply from its own bar onwards.

You do not need to write the entire tuning configuration within a staff text. E.g. if you frequently use a tuning with rather lengthy configuration text, you can create a `.txt` file ([or pre-computed `.json` file](#1-pre-compute-the-tuning-config)) inside the included `tunings/` folder.

> [!NOTE]
> **E.g.** to refer to the 5-limit HEJI tuning config in `tunings/heji/5 limit.txt`, simply write `heji/5 limit` in the Staff/System Text.

> [!TIP]
> **Recommended:** have a look at the provided tuning configs in the `tunings/` folder to see how notation/tuning systems are configured.

> [!NOTE]
> If you find two files with the same name where one is a `.txt` and the other a `.json` file, this means that the tuning configuration is [pre-computed to reduce loading time. Read more about it in this section](#1-pre-compute-the-tuning-config).
>
> The plugin will opt to look for pre-computed `.json` tuning configurations first, so **changing the `.txt` file will not affect the tuning config**. Instead, you will need to use this [web tool](#tuning-config-web-tool): https://euwbah.github.io/musescore-xen-tuner/ to generate a new `.json` file to replace the old one, or just delete the `.json` file and the plugin will use the `.txt` file instead.

Now lets dive into how we can create our own tuning/notation systems.

### Tuning configuration overview

A tuning/notation system configuration is specified in plaintext, and consists of the following parts:

1. [Reference note](#simple-example) e.g. `A4: 440`
2. [Nominals](#simple-example) & equave size
3. [Accidental chains](#adding-accidentals) (optional)
4. Optional declarations:
   - [Ligatures `lig(x,y,z,...)`](#accidental-ligatures-real-heji) allow you to declare how different symbols combine into other symbols. [Advanced ligatures](#advanced-advanced-ligature-use-weak--important-ligatures) can control which enharmonic spellings/accidentals are present in a tuning.
   - [Auxiliary operations `aux(x,y,z,...)`](#auxiliary-operations) define what the other keyboard shortcuts (e.g. `Alt+Up/Down`) do. You can control which accidental chains will be affected, and whether the nominal is allowed to change when using those auxiliary up/down operations.
   - [Secondary accidentals `sec()`](#advanced-secondary-accidentals) define additional symbols that are not part of the main set of notes accessible by up/down operations, but will still act like accidentals. You can access these by declaring [text representations](#advanced-declaring-text-representations-of-accidentals) of the accidentals and [entering the accidentals as fingerings](#entering-accidentals-directly-using-fingerings).
5. Preference settings:
   - [nobold()](#nobold) - text accidentals will not be bolded by default
   - [explicit()](#explicit) - display accidentals on every note, even if not necessary
   - [displaysteps()](#configuring-display-steps) - enables & configures the [steps display](#8-display-steps--display-cents) plugin
   - [displaycents()](#configuring-display-cents) - configures the [cents display](#8-display-steps--display-cents) plugin.
   - [independent()](#advanced-independent-accidental-symbols) - declare groups of symbols that propagate independently of other groups.

### Tuning configuration syntax overview

You can try to make sense of this yourself to fast-forward the learning process, otherwise, the rest of the guide will explain this is greater detail.

```txt
// This is a comment. Comments are ignored by the plugin.

// 1. Reference note

C4: 440 * 16/27 // set frequency reference note (must be without accidental)

// Intervals/frequencies can be specified as math/JavaScript expressions.

// 2. Nominals

// Nominals start from the above specified reference note
// Cents must end with c, otherwise the number is treated as a JI ratio.
// Last number specifies the size of the equave/octave.
// "0" (not 0c) means to ignore the nominal and prevent it from being used.

0c 200c 34/27 Math.pow(11/10, 3) Math.sqrt(49000)c 0 1101.1c 2/1

// Relative to the tuning note C4, the there are 6 nominals per octave spanning
// 7 staff linespaces.
//
// C: Tuning note = 440 * 16/27 Hz
// D: 200c
// E: 34/27 of C
// F: (11/10)^3 of C
// G: About 221.359 cents above C
// A: This nominal will not exist in this tuning
// B: 1101.1 cents above C

// 3. Accidental chains

// each accidental must be separated by at least one space

// chain 1: the usual 100c semitone accidentals
bbb.b bbb bb b (100c) # x #x x.x

// chain 2: text based accidentals
'-'.'-' '-' (81/80) '+' '+'.'+'

// chain 3: combination accidentals & irregular accidental sizes
//
// The first symbol is a compound of the text 'hello' and symbol code 68
// (accidentalFlatRepeatedLineStockhausen) with cent offset -31.7c
//
// The second symbol is a compound of the text 'bye' and symbol 67
// (accidentalSharpRepeatedSpaceStockhausen) with cent offset
// equal to sqrt(28/21) which is approx +249.02c
'hello'.68(-31.7c) (0) 'bye'.67(Math.sqrt(28/21))

// chains 4-6: certain characters must be escaped with a backslash.
// Applies to both text-based accidentals and Text Codes

b\/\/ (0) // the double slash (//) of the 'b//' (Buyuk Mucenneb)
          // must be escaped to prevent it from being treated as a comment.

\'\' \' '\'' (0)  // single quote must be escaped.
\\ '\\' (0)  // backslash must be escaped

// After declaring accidental chains, we declare other
// configurations: ligatures, auxiliary operations, and
// secondary accidentals.
//
// These declarations can be done in any order.

// 4a. Ligatures

lig(1,2) // signifies declaring a ligature that apply to chains 1 and 2
1 -1 #v // sharp and minus (#.'-') becomes sharp arrow down symbol
1 1 #^ // sharp and plus (#.'+') becomes sharp arrow up symbol

lig(x, y, z, ...) // create ligature that applies to chains x, y, z, ...
etc...

// question mark denotes a weak ligature (opposite of weak is 'strong')
lig(1)?
etc...

// Exclamation mark denotes an important ligature (opposite is 'non-important')
lig(2)!

// This is a weak & important ligature (order of '?!' doesn't matter)
lig(1,2)!?

// 4b. Auxiliary operations

aux(0) // 1st aux up/down adjusts note diatonically
aux(1) // 2nd aux up/down modifies first accidental chain (flat/sharps)
aux(2,3) // 3rd aux up/down modifies 2nd and 3rd accidental chains

// 4c. Secondary accidentals & text representations

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

// 4d. nobold
nobold() // declaring this will make text-based accidentals not bold by default

// 4e. explicit
explicit() // declaring this will make every note use explicit accidentals

// 4f. configure display cents/steps

// show the number of cents relative to reference tuning note C4: 260.74hz
// to 2 decimals of precision, above the staff.
displaycents(absolute, 2, above)

// show the number of edo/neji steps (assuming 1337 notes per equave,
// just for example) below the staff.
displaysteps(1337, below)

// 4g. Independent groups of symbols: each symbol group will propagate
//     independently, e.g., since flat and '+' are in different groups,
//     then a flat symbol will not override a '+' symbol if a flat note
//     comes after a plus note within the same bar.
//
//     The first (leftmost) symbol in each group is the naturalizing accidental
//     for the symbol group. Every indepedent group needs its own unique
//     naturalizing accidental.
independent()

// Group 1: flat and sharp symbols, the usual ♮ natural symbol will
// be the naturalizing accidental for this group. Only single symbols
// can be specified here, compound symbols will be broken up into their
// individual symbols, so 'bbb.b' containing `bbb` and `b` will both
// match in group 1.
n bbb bb b # x #x

// Group 2: the + and - text-based symbols.
// Using SymCode 152 (reversed natural symbol) as the naturalizing
// accidental.
152 '-' '+'

// We don't explicitly specify a third group for the other symbols in
// accidental chains 3-6, by default, all ungrouped symbols will default
// to be part of the first symbol group.

// NOTE: declaring explicit() with independent() is a contradiction, since
//       every note will have all its accidental symbols already explictly
//       written out in full, this is just an example.
```

Reference tuning frequency, nominals and accidental chains must be specified in fixed order. After those are the secondary declarations (`aux`, `lig`, `sec`, etc..) and they can be specified in any order.

Apart from the reference note and nominals, all the other declarations are optional.

### Full example

See [heji/5 limit.txt](tunings/heji/5%20limit.txt) for a fully annotated example of implementing the tuning configuration for the [extended Helmholtz-Ellis just intonation notation (2020 edition)](https://marsbat.space/pdfs/HEJI2_legend+series.pdf). All the features of the plugin is featured in that tuning config. the up/down operations are implemented for up to the 5 limit, but higher limit accidentals are available as secondary accidentals, and can be entered via fingerings with the accidentals' text representations.

Most of this section revolves around the [heji/5 limit.txt](tunings/heji/5%20limit.txt) tuning config. Continue reading for a detailed explanation on how you would go about creating tuning configs like this:

### Simple example

Let's start of with the simplest example: Just the white keys of the piano:

```txt
A4: 440
0c 200c 300c 500c 700c 800c 1000c 1200c
```

`A4: 440` specifies the reference note and tuning in Hertz, which sets the note A4 to 440hz.

`0c 200c 300c 500c 700c 800c 1000c` specifies, in cents, the tunings of each of the 7 nominals starting from the reference note of choice, A4. This means that B4 will be 200c higher than A4, C5 will be 300c higher than A4, etc... Each entry must be separated by at least one space.

The last interval size, `1200c`, specifies the equave size. The equaves are referenced in terms of the nominals defined, rather than the standard 12edo octave. E.g., if you only declare 2 nominals, then the next equave up from A4 will start at C5 instead of A5.

> [!NOTE]
> In some tunings, certain nominals are ignored (e.g., in 5edo, maybe you only want to use C D E G A and ignore F and B). In this case, you can use `0` to specify a nominal that should not be used.
>
> E.g., for C D E G A in 5edo, we can write:
> ```txt
> A4: 440
> 0c 0 240c 480c 720c 0 960c 1200c
> ```

Instead of specifying cents directly, any time an interval size is to be specified, we can use any supported [relative tuning interval](#relative-tuning-interval-syntax), as follows:

### Relative tuning interval syntax

Whenever a tuning config expects a relative interval size, we can either specify

- **Cents**: e.g. `100c` for 100 cents, or `-200c` for -200 cents.
- **Ratios**: e.g. `2` or `2/1` for an octave (= 1200 cents), `3/2` for JI perfect fifth.
  - If a **negative ratio** is specified, instead of playing back a negative frequency (which doesn't make sense), the plugin interprets it negation of ratios as **reciprocal**, so instead of `3/4` we can also write `-4/3` to specify "down a perfect fourth".

> [!NOTE]
> For advanced users, you can use any valid JavaScript expression (up to ECMAScript version 5) that evaluates to a number. This works for both cents and ratios, e.g.:
> - `Math.pow(2, 1/12)` is a ratio that represents a 100 cent interval (12th root of 2), and is equivalent to stating `100c`
> - `(Math.PI)c` is exactly 3.1415926... cents
> - `Math.sqrt(4/3)` is exactly half the size of a just perfect fourth
>
> If for some reason a JavaScript expression ends with 'c', but you don't want it to be interpreted as cents, you can just define and evaluate a variable in one line so it doesn't end with `c`, e.g., instead of `2 * magic`, type `var blah = 2 * magic; blah`.

### Adding accidentals

Now let's add the usual 12edo accidentals to complete the 12edo tuning system.

```txt
A4: 440
0c 200c 300c 500c 700c 800c 1000c 1200c
bb b (100c) # x
```

The last line adds a chain of accidentals ranging from double flat to double sharp. You can specify the accidental symbols as Symbol Codes or Text Codes, each degree of the accidental chain must be separated by at least one space, and the `(100c)` in the middle means that increasing the degree on this chain by 1 will result in a 100 cent pitch increase.

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

> [!TIP]
> Every ratio/cents interval can be specified as a math/JavaScript expression.
>
> Remember that to differentiate ratios from cents when specifying [relative intervals](#relative-tuning-interval-syntax), cents must end with a 'c'.

We're now setting the reference note C4 to a just-intonated 3-limit major sixth below A4. Because of that, we now specify our nominals starting from C.

Our nominals are now all 3-limit ratios built off a chain of pure fifths from F to B, which are the standard nominals used in almost all JI notations (unless you're writing in Ben Johnston's system).

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

In HEJI, the first two [accidental chains](#accidental-chains--degrees) (syntonic commas & sharps/flats) are represented by a single ligatured accidental with the up/down arrows being attached to the sharp/flat symbol.

To add support for notation systems where a particular accidental can represent multiple accidental chains at once, we can declare a **ligature set**. You can think of it as a list of "search-and-replace" conditions that **ligatures** (joins/connects/substitutes) different symbols into a different unique symbol. A ligatured accidental is part of the [primary tuning space](#primary-tuning-space), and functions just as the original accidentals it represents, differing only in visual appearance.

Think of them like [font ligatures](https://en.wikipedia.org/wiki/Ligature_(writing)) where multiple characters conjoin into a unique shape.

```txt
C4: 440 * 16/27
0 9/8 81/64 4/3 3/2 27/16 243/128 2
bbb bb b (2187/2048) # x #x
v3 v2 v (81/80) ^ ^2 ^3
lig(1,2)?
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

We start declaring a ligature with `lig(1,2)?`. The numbers `1,2` mean that this ligature applies to only the 1st and 2nd [accidental chains](#accidental-chains--degrees) in that specific order &mdash; meaning that it will only replace symbols that are part of the 1st and 2nd accidental chains, leaving symbols in other accidental chains untouched.

The `?` signifies that this is a [weak ligature](#weak--important-attributes-on-a-ligature-set) which allows both ligatured and non-ligatured versions of the same symbols to be cycled through as enharmonic equivalents using keyboard shortcut `J` (don't worry too much about that for now).

After that, we declare each search-and-replace condition on a new line.

`-2 -1 bbv` means that if the 1st [accidental chain](#accidental-chains--degrees) is on [degree](#accidental-chains--degrees) -2 (double flat), and the second accidental chain is on degree -1 (down arrow), then we replace it with the single symbol `bbv` (double flat with single down arrow).

> [!CAUTION]
> The degrees `-2 -1` **must be specified in the same order as the ligature's chain declaration**.
>
> 🟡 **For example**, if we declared `lig(2,1)` instead, with the second accidental chain on the left, then you would need to write the search-and-replace condition as `-1 -2 bbv`, since now the left number refers to the second accidental chain.

The ligatured accidentals can be constructed with multiple symbols, specified as [period-separated symbol codes](#symbol-codes-text-codes-text-based-accidental-symbols)

🟠**For basic ligature usage, to prevent conflicts**, ligatured symbols should not contain symbols that are already used as part of an accidental chain, and ligature declarations should always be [weak](#weak--important-attributes-on-a-ligature-set) (suffixed with `?`). However, more intricate behaviors/notation systems can be configured with [advanced ligature usage](#advanced-advanced-ligature-use-weak--important-ligatures).

> [!TIP]
> A ligature definition can be made **weak** (`?`), **important** (`!`), or **weak and important** (`!?`).
> If no modifiers are specified, it is by default a **strong** ligature (opposite of weak).
>
> [Read more about advanced ligature usage here](#advanced-advanced-ligature-use-weak--important-ligatures).

You can also declare more than one ligature set, regarding different chains. Though special care must be taken when [deciding the order of declaration of the ligatures](#understanding-how-the-plugin-parses--reads-accidentals).

### Auxiliary operations

Auxiliary up/down operations give more control when transposing a note. You can define whether the [nominal](#nominals--equave) can move, and exactly which [accidental chains](#accidental-chains--degrees) can change degree.

```txt
C4: 440 * 16/27
0 9/8 81/64 4/3 3/2 27/16 243/128 2

// chain 1: sharps-flats
bbb bb b (2187/2048) # x #x

// chain 2: up/down arrow
\ (81/80) /

// Auxiliary operation declarations:
aux(0)
aux(1)
aux(2)
aux(0,1)
```

Each auxiliary operation is declared on a new line. The first declaration corresponds to the first aux operation, the second declaration to the second aux operation etc...

The numbers in the parenthesis denote what can change during the operation:

- `0` allows the [nominal](#nominals--equave) of the note to change
- `1` allows the first [accidental chain](#accidental-chains--degrees) to change
- `2` allows the second accidental chain to change
- etc...

**The above example specifies that:**

1. The first auxiliary operation (`Alt+Up/Down`) changes only the note's nominal, similar to MuseScore's diatonic pitch up/down function.

2. The second auxiliary operation (`Ctrl+Alt+Up/Down`) changes the first accidental chain's degree, allowing you to adjust the number of flats and sharps on the note directly.

3. The third auxiliary operation (`Shift+Alt+Up/Down`) changes the second accidental chain's degree, allowing you to adjust the number of up/down arrows on the note directly.

4. The fourth auxiliary operation (`Ctrl+Shift+Alt+Up/Down`) changes both the nominal and the sharps-flats chain, which allows you to navigate the 'chromatic scale'.

You can specify whichever combinations of numbers from 0 to N (number of accidental chains) that you may find useful for your tuning/notation system. The order of the numbers in the parentheses do not matter.

If you require more than 4 auxiliary operations, you can [set up more keyboard shortcuts](#more-auxiliary-operations). You can also [change the default keyboard shortcuts](#how-to-change-shortcuts) for these operations.

### Configuring display steps

🟠 **In order to use the [Display Steps](#8-display-steps--display-cents) plugin, the tuning configuration needs to configure the steps display using the `displaysteps()` declaration**.

```txt
// Syntax: displaysteps(<steps per equave>, <placement>)

displaysteps(31, below) // E.g. 31 step tuning, place text below note
```

**`<steps per equave>`** denotes the total number of distinctly tuned steps this tuning uses within an equave

> [!NOTE]
> This generally corresponds to edos - arbitrarily large edos are supported.
>
> You also can get this working for NEJIs/temperaments and other step-based tunings as long as you ensure that all the notes in the score are in the [primary tuning space](#primary-tuning-space).

**`<placement>`**:

- `above` - text displayed above the note
- `below` - text displayed below the note

### Configuring display cents

You can configure how cents offsets are being displayed, and how cent offsets are calculated.

```txt
// Syntax: displaycents(<calculation mode>, <precision>, <placement>)
displaycents(nominal, 0, above)
```

**`<calculation mode>`**:

- **`nominal`** (Default) - cent offsets are calculated relative to the nominal of the note
- `absolute` - cent offsets are calculated relative to the specified tuning note modulo the equave. (E.g. if `A4: 440` is used in a 7-nominal tuning, then it will display number of cents above the nearest A)
- `semitone` - Same as `absolute`, but modulo 100 cents instead, to give the cent offset from the nearest 12-edo semitone. (A bit janky at this point, not recommended)

**`<precision>`**: The number of decimal places in the cents display.

**`<placement>`**:

- `above` - text displayed above the note
- `below` - text displayed below the note

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

### Advanced: advanced ligature use, weak & important ligatures

> [!NOTE]
> Make sure you understand the basics of [ligatures](#accidental-ligatures-real-heji) before reading this section.

If you've tried out the [simple ligature example tuning config](#accidental-ligatures-real-heji) for HEJI, you may have noticed that you can press `J` (enharmonic respell) on accidentals like `#^` (sharp with one arrow up) which turns it into `^.#` (natural with one arrow up & sharp). While the tuning is technically correct, it is improper use of the symbols according to the [HEJI](https://marsbat.space/pdfs/HEJI2_legend+series.pdf) standard. You may also notice that some enharmonic spelling choices are suboptimal, e.g. sharps and flats with arrows are spelt weird.

This seems like a small matter as most people don't bother with enharmonics in JI anyway. However, this same issue also affects tempered tunings notated with HEJI, plus, exact enharmonic substitutions via the `~` (tilde accidental: schisma alteration) are defined in the HEJI spec, such that `C#v~` = `Db`, and `Db^~` = `C#`.

We can modify how ligatures behave to improve the user experience for more intricate notation systems like HEJI/Sagittal.

**Ligatures can be used to:**

- Limit the plugin to use only certain accidental spellings so that _"technically correct but wrong"_ spellings don't show up after up/down/enharmonic cycle operations.
- Emulate support for symbols that can change their meaning depending on the context.

But first, to use ligatures effectively, we need to understand **how the plugin reads & breaks down accidental symbols** into actual note information.

#### Understanding how the plugin parses & reads accidentals

SMuFL & text-based accidental symbols attached to a note are tokenized into an unordered list of [Symbol Codes](#symbol-codes-text-codes-text-based-accidental-symbols). These symbols are **'eaten up'** one-by-one, according to the order specified in the tuning config declarations. Once a symbol is matched, it cannot be reused as a symbol in another ligature/accidental chain/secondary accidental. There are 3 different sources of accidental symbols, and the reading/parsing/matching/eating of the symbols happens in this order:

1. The plugin attempts to match ligatures, set-by-set, testing for matches in the order the ligature sets were declared in the tuning config. In each ligature set, the ligatured accidental with the most symbol matches will be chosen.
   E.g. if some ligature set contains `bb.bb` and `bb`, and `bb.bb.bb` is attached to the note, `bb.bb` will be 'eaten up' and matched by that ligature, leaving `bb` to be matched by the other declarations
2. The plugin attempts to match main accidentals in [accidental chains](#accidental-chains--degrees), testing for matches in the order the chains were declared. Just like the ligatures, the accidental with the most symbol matches will be chosen.
3. Finally, the plugin matches remaining leftover symbols as [secondary accidentals](#advanced-secondary-accidentals). It checks for secondary accidentals in the order they were declared, matching repeated secondary accidentals all at once.
4. Any other left over symbols will be ignored. In some cases, if the tuning config is specified incorrectly and matches symbols in the wrong order, [the plugin will not work](#the-plugin-just-breaks-when-i-use-certain-accidental-symbolstext-entry-combinations).

This symbol-parsing process is how the plugin understands the accidental symbols attached on to notes, and it will base its operations on this information.

> [!CAUTION]
> **IMPORTANT:** Note that because the plugin always tries to read the most number of symbols for each ligature set/accidental chain at a time, it's important that if the same symbol appears across different ligature sets/accidental chains, they should be declared in an order such that it is not ambiguous which ligature/accidental chain the symbol belongs to.
>
> 🟡 **For example**, let's say that the symbol `b^` is in ligature set 1, but we have `~.b^` in ligature set 2. Now let's say the plugin encounters a note with the symbols `~.b^`. It will first look to ligature set 1 to 'eat up' the `b^`, leaving `~` remaining. This means that **`~.b^` in ligature set 2 will never get matched** because the `b^` symbol will get eaten up by the first ligature.
>
> To solve this, we just need to flip the order the ligature sets are declared.

Now that's out of the way:

#### What exactly are ligatures?

A note with a ligatured accidental is treated as a unique _'Xen Tonal Pitch Class'_ (`XenNote` in the code) that is enharmonically equivalent to the same note with the original accidental it 'substitutes'.

In other words, notes with ligatures will (by default) be accessible as enharmonics of the non-ligatured note. Ligatured spellings will (by default) show up as possible note spelling choices for up/down/enharmonic operations.

Once ligatured accidentals are declared, it affects how the plugin parses symbols. As mentioned [above](#understanding-how-the-plugin-parses--reads-accidentals), accidental symbols are tested to match against ligatures first, before the primary accidentals that are part of the tuning config.

This means that we can use ligatures to affect how the plugin reads symbols, and we can create an intricate layered accidental system, if need be.

#### Weak & important attributes on a ligature set

A ligature set is defined with two attributes: weak/strong, and important/non-important.

**By default, all ligature sets are strong and non-important**. We can suffix `!` and/or `?` to our `lig(...)` declaration to change these attributes.

- `lig(...)?` makes a weak ligature
- `lig(...)!` makes an important ligature
- `lig(...)!?` makes a weak and important ligature.

The point of having these attributes is to have fine-grained control for when to prefer using some ligatures over other ligatures, or whether other primary accidental symbols can be accessible from up/down/enharmonic operations at all.

Here's a table summarizing the effect of these attributes, in increasing order of precedence:

| | | | |
|---|---|---|---------------|
| `lig(...)?` | Weak | Non-important  | Same priority as standard accidentals. These note spellings are treated exactly like standard enharmonic equivalent spellings declared in accidental chains |
| `lig(...)` | Strong | Non-important | Prefered over standard accidentals during up/down operations only. Allows cycling between ligatured & non-ligatured spellings as long as all enharmonic equivalents of this note doesn't contain important ligature symbols |
| `lig(...)!?` | Weak | Important | Prefered over standard accidentals & non-important ligatures. Prevents non-important/standard spellings from showing up in enharmonic cycling |
| `lig(...)!` | Strong | Important | Highest priority of all. Prevents non-important/standard spellings from showing up in enharmonic cycling |

#### Strong vs weak ligatures

During the up/down operations, whenever the plugin has to decide between choosing to spell note with a strong ligature vs without, it will always prefer the strong ligatured spelling over a weak-ligatured spelling or non-ligatured spelling (i.e. primary accidental symbols from the accidental chains).

Setting a ligature to weak means that the ligatured spelling will be considered on equal-footing with other non-ligature/weak-ligatured spellings. Thus, enharmonic spellings are picked based on the other usual factors (such as transposition direction, number of symbols, etc...).

#### Important vs non-important ligatures

If a tuning config has an enharmonically equivalent set of notes and some of them have an important ligature, the other non-important ligatures will be removed from the enharmonic cycling operation. The main point of using important ligatures is to exact **fine-grained control over the available enharmonic spellings that a note has**.

When given the option, the plugin will always choose to spell notes with important ligatures over non-important ligatures. This choice is made with a higher priority than the choice between strong vs weak ligatures.

The reason to use important ligatures is to **override the use of all original accidental symbols** in the accidental chains that the ligature applies to. This applies to all plugin operations (up/down/enharmonic).

> [!TIP]
> Because important ligatures take precedence over all other enharmonic spellings, we need to make sure that amongst the accidental chains the ligature applies to, all of their symbols have to be represented in the ligature, including "non-ligatured" standard spellings.

In a nutshell, the difference between a strong ligature and an important ligature is that a strong ligature still allows the original accidental chains' symbols to show up when respelling enharmonics (`J`), but an important ligature will not.

> [!NOTE]
> While these non-ligatured symbols being overriden by an important ligature are not accessible from standard plugin operations (up/down/enharmonic), they will still be parsed correctly if these symbols are manually attached to the note.

#### Weak & important ligatures case study: HEJI

Building from the [simple HEJI ligature example](#accidental-ligatures-real-heji), there are a few changes to configure full support for HEJI:

- We need to use important ligatures to prevent incorrect accidental spellings like `#.v2` from showing up in enharmonic cycling. We need to override all degrees of accidental chains 1 and 2 so that when we have a mixture of #/b and ^/v symbols, it will always show up using the correct ligatured spellings.
  - This means we declare important ligatures for all symbols (including the standard #/b and ^/v symbols), otherwise those symbols will not show up after moving a note up/down/enharmonic cycling.
- We need to implement the enharmonic schisma `~` using pseudo accidental degrees and [irregular accidental tuning sizes](#advanced-irregularly-sized-accidental-chains), and create an important ligature for those symbols as well so that they can appear when cycling through enharmonics (`J`).
  - These ligatures also declared as weak so that the standard spellings are preferred over these enharmonic schisma ones.
  - `C#v~` = `Db` and `Db^~` = `C#`.

This is what that looks like:

```txt
C4: 440 * 16/27
0 9/8 81/64 4/3 3/2 27/16 243/128 2
~.b^(243/256) bb(-113.685*2c) b(-113.685c) (0) #(113.685c) x(113.685*2c) ~.#v(256/243)
v3 v2 v (81/80) ^ ^2 ^3

lig(1)?! // weak and important ligature set
-3 ~.#v // pseudo degree -3 =  ~#v
3 ~.b^ // pseudo degree 3 = ~b^

lig(1,2)!
-2 -2 bbv2
-2 -1 bbv
-2 0 bb // duplicate standard symbols when declaring important ligatures
-2 1 bb^
-2 2 bb^2
-1 -2 bv2
-1 -1 bv
-1 0 b
-1 1 b^
-1 2 b^2
0 -2 v2
0 -1 v
0 1 ^
0 2 ^2
1 -2 #v2
1 -1 #v
1 0 #
1 1 #^
1 2 #^2
2 -2 xv2
2 -1 xv
2 0 x
2 1 x^
2 2 x^2
```

> [!CAUTION]
> The **order of ligature declaration is very important**. This wouldn't work if the `lig(1)?!` declaration is written after the `lig(1,2)!` declaration.

Recall [how the order of declarations affect how the plugin reads notes](#understanding-how-the-plugin-parses--reads-accidentals). Here's what will happen if the ligature declaration order was flipped:

- A note has the `~.b^` accidental
- `b^` gets eaten up by matching the `lig(1,2)` ligature, because it was declared first.
- `~` remains unmatched, and the plugin will not be able to figure out what to do with it
- [Halt & catch fire](https://en.wikipedia.org/wiki/Halt_and_Catch_Fire_(computing))

> [!TIP]
> Refer to the [heji/5 limit.txt](./tunings/heji/5%20limit.txt) tuning config to learn how HEJI is implemented.

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

> [!WARNING]
> Declaring too many accidentals/ accidental chains will cause the plugin to take a long time to load the tuning config.

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

In this example, there is only one accidental chain declared consisting of -1 to 1 degrees of flats/sharps. If there are any extra flat or sharp symbols, they will match as secondary accidentals, contributing +/- 50c each. Any [relative interval](#relative-tuning-interval-syntax) (cents or ratio) can be specified for each secondary accidental.

Note that the up/down arrows are declared in a **specific order** such that if there are double up/down arrows adjacent to each other, they will contribute +/- 30c instead of +/-(10 + 10)c, because the two-symbol accidentals are declared before the one-symbol ones. [The order that secondary accidentals are declarared matters](#secondary-accidental-declaration-order-matters).

#### Secondary accidental declaration order matters

🔴 The **declaration order of secondary accidentals has to be carefully chosen** so that certain combinations of symbols that overlap are matched with the correct precedence.

E.g. if `\\` was declared before `\\.\\`, then the `\\.\\` secondary accidental would never be matched, because the `\\` symbol would always match first.

#### Secondary accidentals automatically repeat

**Secondary accidentals can be stacked multiple times**, and you don't need to declare a new secondary accidental for every unique number of times the symbol is repeated (unless the tuning is irregular and depends on the number of times the accidental appears). Only declare secondary accidentals for uniquely tuned symbols.

✅ For example, there are 4 HEJI 7-limit accidentals, and their tunings don't change depending on how many times each symbol is repeated, so we only declare 4 secondary accidentals:

```txt
sec()
u77 64/63 * 64/63
u7 64/63
d77 63/64 * 63/64
d7 64/63
```

❌ Don't do this:

```txt
sec()
u7 64/63
u77 64/63 * 64/63
u7.u77 Math.pow(64/63, 3)
u77.u77 Math.pow(64/63, 4)
u7.u77.u77 Math.pow(64/63, 5)
...not like this...
```

### Advanced: Declaring text representations of accidentals

Declaring textual representations allows you to input accidentals (both SMuFL and text-based) by attaching fingering text on the note (you should remap `Ctrl + F` to "Add Fingering" instead of "Find" if you're using this feature). These declarations are done together with [secondary accidental declarations](#advanced-secondary-accidentals) and work the same way, except you provide a quoted text string that represents how you would type out the accidental in fingerings.

> [!NOTE]
> Even though these text representations are declared with secondary accidentals, the plugin will first try to match accidentals added via fingerings as primary accidentals first, and only fall back to secondary accidentals if no xen note in the [Primary tuning space](#primary-tuning-space) matches the fingering text.

```txt
...
sec()
'up77' u77 64/63*64/63
'up7' u7 64/63
```

The above example declares two secondary accidentals, `u77` and `u7`. To input them effeciently, you can attach a fingering and enter `up77` or `up7` respectively. After any plugin operation is applied to any note in that bar, the desired accidentals will be attached and the fingering used to enter the accidental will be removed.

> [!NOTE]
> **By default the ASCII text `n` is used to refer to the natural accidental (or a combination of all naturalizing symbols, if [multiple independent symbol groups are declared](#advanced-independent-accidental-symbols)), and for adding the natural accidental using fingerings**. If you want, this can be overriden by declaring a secondary accidental with text representation 'n' (e.g. `'n' 152 0c`), but you won't be able to enter the usual natural symbol with fingerings if so.
>
> For devs: this is implemented under the hood as declaring `'n' 2 0c` as the last secondary accidental with the lowest precedence.

🔴 As usual, the **declaration order matters**. If the text representation `'up7'` was declared before `'up77'`, then `up77` would be matched as `up7` first, leaving a `7` that would not be matched. The plugin will then ignore the fingering as it thinks that it is not a valid text-representation of accidental(s).

Declaration order must be carefully chosen so that there's no ambiguity between text representations (as they can be stacked repeatedly in a single fingering text), neither should there be ambiguity in how to [match the secondary accidental symbols](#secondary-accidental-declaration-order-matters).

#### Elided text representations

If the secondary accidental itself is a single-element text accidental, then you won't need to repeat the text accidental twice:

```txt
sec()
'^' '^' 81/80 // repeating '^' is unnecessary
'^' 81/80 // this does the same thing as above

// ⚠️ You can't do this. This is not a
// single-element text accidental!
// `+`.`+` 50c

// do this instead:
'++' '+'.'+' 50c
```

### Advanced: Independent accidental symbols

Refer to the tuning config .txt for [Kite's 41edo ups & downs notation: `kite/41edo`](tunings/kite/41edo.txt). At the bottom there is this section:

```txt
independent()
n bb b # x
'◇' 'ᴠ' 'ʌ'
```

Each line declares a group of independent accidental symbols, each symbol separated by at least one space. An independent symbol group propagates independently of other groups, **which applies to both accidentals and key signature**. For example,

![key sig example](imgs/keysig-example.png)

Even though the notes F and C appear with only a single down arrow `ᴠ`, these notes still have the `♯` symbol carrying over from the key signature &mdash; the up and down arrows act independently of the sharps and flats, so they are read and played back as `F♯ᴠ` & `C♯ᴠ`, instead of `Fᴠ` & `Cᴠ`.

In each line declaring an independent symbol group, the first, leftmost, symbol denotes the naturalizing symbol for the group. In the above example, the natural symbol &natural; resets a sharp/flat back to default, and the diamond `◇` resets up/down arrows.

> [!WARNING]
> ⚠️ **Only single individual accidental symbols can be declared in a symbol group**, you cannot use the period `.` to declare multi-symbol accidentals to act independently as a compound symbol.
>
> ✅ `#` is a single sharp symbol
> ✅ `'abc'` is a single text-based symbol containing 3 characters 'abc'
> ❌ `#.+` is a compound accidental containing two symbols
> ❌ `'a'.'b'` is a compound text-based accidental containing two single-character text-based symbols 'a' and 'b'
> ✅ `'a.b'` is a single text-based symbol containing three characters `a`, `.`, and `b` as a single unit.

> [!CAUTION]
> Declaring independent symbol groups will reorder the appearance of accidental symbols.
>
> By default, accidental symbols are ordered right-to-left where the first declared [accidental chain](#accidental-chains--degrees) is closest to the note, and secondary accidentals are on the left of all primary accidentals.
>
> Within each symbol group, the above order is preserved, but the first symbol group always appears to the right of the second symbol group, and so on.

### Advanced: Override Tunings, Near-Equal Just Intonation (NEJI), Irregular Accidental Sizes

#### Irregular accidental sizes: `override()` for primary accidentals

Tuning of notes in the [primary tuning space](#primary-tuning-space) can be overriden using the `override()` declaration.

Examples:
- [neji/12ji test](tunings/neji/12ji%20test.txt)
- [user/monzo/22edo blackwood](tunings/user/monzo/22edo%20blackwood.txt)

At the bottom of the tuning config, there is a section like:

```txt
A4: 440

// the nominal & accidental chain tunings don't matter because all of them
// will be overriden by override() section

0 0 0 0 0 0 0 2/1 // equave tuning needs to be specified

bb b (0) # x // only one accidental chain, tuning doesn't matter

override()
0 -2 9/5/(2)  // Abb = 9/10
0 -1 15/8/(2) // Ab  = 15/16
0 0 1/1       // A   = 1/1
0 1 25/24     // A#  = 25/24
0 2 9/8       // Ax  = 9/8
1 -2 1/1      // Bbb = 1/1
1 -1 25/24    // Bb  = 25/24
// etc...
```

Each line denotes a tuning override for each note in the [primary tuning space](#primary-tuning-space) (i.e., a [nominal](#nominals--equave) + [primary accidentals](#accidental-chains--degrees)).

- First number: the n-th nominal starting where 0 is the reference note's pitch class
  - E.g., since `A4: 440` is the reference note frequency, `0` is `A`, `1` is `B`, `2` is `C`, etc...
- Middle numbers: the [accidental vector/accidental chain degrees](#accidental-vectors), space-separated if there are multiple numbers. Accidental chain degrees are written in the same order that accidental chains are declared in.
- Last number: the [relative interval](#relative-tuning-interval-syntax) for the note, relative to the reference pitch (`A4: 440`) and equave.

For example, the line `1 -1 25/24` means that the note with nominal `B` (which is `1` relative to `A` = 0) and accidental vector `-1` (which is a single &flat;) should be tuned to `25/24` relative to the reference of `A` within that equave/octave. Simply put, that sets B&flat;4 = 25/24 of A4. Since the equave is defined as exactly `1200c`, then that means the same relation holds for all other octaves.

> [!CAUTION]
> The tuning of the overrides are specified **relative to the reference pitch**, not relative to original tuning of the note before the tuning overrides.

> [!TIP]
> It's not necessary to override every note in the [primary tuning space](#primary-tuning-space), only specified notes will be overriden and the rest will default to the usual as specified by the primary accidental chains & nominal declarations.

#### Irregular accidental sizes: secondary accidentals

The accidental sizes of secondary accidentals can be configured on a per-nominal basis.

Instead of specifying only one [relative interval](#relative-tuning-interval-syntax) for the tuning of a secondary accidental, you may also choose to **specify exactly as many tunings as there are nominals** (not more, not less, otherwise the plugin will not read the tuning config).

For example, in [user/monzo/22edo blackwood](tunings/user/monzo/22edo%20blackwood.txt), the secondary accidental section declaration looks like this:

```txt
sec()

//            A           B           C           D           E           F           G
'bb' bb  -1200*4/22c -1200*3/22c -1200*4/22c -1200*4/22c -1200*4/22c -1200*3/22c -1200*4/22c
'b'  b   -1200*2/22c -1200*2/22c -1200*2/22c -1200*2/22c -1200*2/22c -1200*1/22c -1200*2/22c
'##' x    1200*3/22c  1200*4/22c  1200*4/22c  1200*4/22c  1200*3/22c  1200*4/22c  1200*4/22c
'x'  x    1200*3/22c  1200*4/22c  1200*4/22c  1200*4/22c  1200*3/22c  1200*4/22c  1200*4/22c
'#'  #    1200*1/22c  1200*2/22c  1200*2/22c  1200*2/22c  1200*1/22c  1200*2/22c  1200*2/22c

// Constant-sized accidentals
'v'  \\  -1200*1/22c
'^'  /    1200*1/22c
```

You can mix and match specifying a single tuning and specifying tunings per-nominal, as the above example demonstrates.

> [!WARNING]
> The per-nominal tuning of secondary accidentals only applies when the **accidental symbols are parsed as secondary accidentals** (which are not accessible from up/down pitch operations alone). If the symbols on a note are parsed as primary accidentals, then modifying these will not change how the note is tuned. Instead, use [`override()` for notes in the primary tuning space](#irregular-accidental-sizes-override-for-primary-accidentals).

### Advanced: Other configurations

#### `nobold()`

Declare `nobold()` anywhere after declaring accidental chains to make the font style of fingering text based accidentals non-bold.

Otherwise, fingering text accidentals will be bold by default.

#### `explicit()`

Declare `explicit()` anywhere after declaring accidental chains to explicitly display all accidentals (even naturals).

Useful for atonal writing etc...

-----

Congratulations on making it this far! You're encouraged to contribute your tuning systems to the project.

You can file a pull request adding files to the `tunings/` folder, or simply file an issue with your tuning config, and I'll add it for you.

🟠 If your tuning configuration contains many notes/equave and takes a long time to load, you should [pre-compute the tuning config](#1-pre-compute-the-tuning-config) into a `.json` file, which will help speed things up.

## How to: key signatures

![key sig example](imgs/keysig-example.png)

> [!CAUTION]
> **Regardless of whether you're using standard or custom key signatures, you will need to declare key signatures using System/Staff text for this plugin to work with key signatures properly**

Just like the tuning config, System Text will apply the key signature for all staves from that bar onwards, whereas Staff Text will only apply to the staff it is written on.

The key signature text should start with `keysig`, followed by a space, followed by space-separated [accidental symbols](#symbol-codes-text-codes-text-based-accidental-symbols), one for each nominal starting from the reference note. If a combination of accidentals is required on one nominal, you can [join them with periods, as usual](#symbol-codes-text-codes-text-based-accidental-symbols).

E.g. if the tuning config specifies A4 as the reference note, and you have 7 nominals in your tuning, then:

```txt
keysig 0 0 # 0 0 # 0
```

...specifies that the 3rd nominal C and 6th nominal F (starting from 1st nominal A as defined by the tuning reference note `A4: 440`) should have the `#` symbol applied to them by default. `0` is used to declare that the nominal has no accidental symbol (defaults to natural) in the key signature.

As per normal, if you require multiple symbols on a nominal, you can join them with periods, e.g.:

```txt
keysig #.+ 0 bbb.bbb.bb 0 17.bv2 0 x.#x.#x
```

...also specifies a (rather extreme) key signature for 7 nominals.

## How to use fingering annotations

> [!TIP]
> If you're using fingering-related features, it is recommended to change the default MuseScore shortcut of `Ctrl+F` from _"Find / Go to"_ to _"Add fingering"_. This will make note entry much more efficient.

Fingerings are a handy way of attaching text directly to a single note. **You can press (shift) space/tab to navigate between adjacent fingerings** which allows you to edit them efficiently.

### 0. Entering accidentals

If [text representations of accidental symbols are defined](#advanced-declaring-text-representations-of-accidentals), typing the text representations of accidentals into a fingering then hitting `Alt+R` will quickly assign those accidentals.

### 1. Entering accidentals via Accidental Vector

If you're dealing with a really large tuning system and can't reasonably access the accidental you need with just up/down & auxiliary operations, you can use fingerings to help you enter accidentals.

Create a fingering, type 'a', followed by comma-separated degrees of the [accidental vector](#accidental-vectors).

For example, the fingering `a-1,1,2` corresponds to the accidental symbols required to notate going down 1 step of the first accidental chain, up 1 step of the second chain, and up 2 steps of the third chain. The actual symbols that this corresponds to will depend on the Tuning Configuration being applied on that note.

Then, simply tune the note/score (or do some other operation) and the accidental symbols required to denote the accidental vector _-1,1,2_ will magically appear.

This is especially helpful for huge tunings with many accidental chains.

### 2. Fingerings to denote JI intervals

You can tune any note to a just intonation interval relative to the reference note by attaching a fingering of the ratio/math expression followed by a period.

The note's tuning will be automatically octave-reduced/expanded to match the octave that it is written in (in accordance to the Tuning Config), so you can use JI fingering annotations to supplement your existing tuning.

🟡 E.g. the fingering `19.` will cause a note to be tuned to the 19th harmonic of the [current reference note](#6-change-reference-pitch). You can also use JavaScript expressions like `Math.sqrt(19).`.

> [!TIP]
> If you regularly use this feature and do not require fingerings on your scores (as how they normally should be used), you can search for `var REQUIRE_PERIOD_AFTER_FINGERING_RATIO` (at around line 77 of `Xen Tuner/fns.js`) and set it to `false` like so: `var REQUIRE_PERIOD_AFTER_FINGERING_RATIO = false;`. This will make all fingering text function as a JI ratio/harmonic by default, without the need for a period at the end &mdash; making your scores slightly neater.
>
> Of course, this will also make normal fingering numbers act as otonal harmonics, so you should be careful.

> [!WARNING]
> This is not a replacement for accidentals. JI fingering annotations do not persist until the barline unlike accidentals. See [secondary accidentals](#advanced-secondary-accidentals) if you want a way to sporadically apply certain higher-limit accidentals that behave like accidentals.

### 3. Fingerings to denote cent offsets

You can apply an additional cent offset to a note (on top of its standard tuning) by prefixing the fingering with a `+` or `-` sign.

E.g., `+5` on a note will make the note tune 5 cents higher than normal.

> [!WARNING]
> This is not a replacement for accidentals. Cent offset fingering annotations do not persist until the next bar unlike accidentals. See [secondary accidentals](#advanced-secondary-accidentals) if you want a way to sporadically apply certain higher-limit accidentals that behave like accidentals.

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

### 5. Notate comma shifts using [reference pitch changes](#6-change-reference-pitch)

One of the culprits of a huge Tuning Config is if you're writing a piece that utilizes tons of comma pumps that add up, requiring many accidentals per note throughout a particular comma-shifted section of the piece.

**You can notate comma shifts by [changing the reference tuning note & frequency](#6-change-reference-pitch).** For example, if you want to shift down by 81/80 you can do this: `A4: 440 * 80/81`.

## How to: export MIDI/MPE

> [!WARNING]
> This feature is still a work in progress. The generated microtonal .mid file does contain proper MPE MIDI messages and plays back correctly when imported directly into Pianoteq standalone. However, I haven't found a nice simple way to import this MPE MIDI data directly into a DAW. It seems like DAWs don't implement the import/export of MIDI files containing MPE data...

MPE is a specification building on top of the MIDI 1.0 standard which allows for polyphonic pitch bend, which this plugin relies on to export microtonal pitch offsets of up to 15 notes per staff.

Unfortunately, as far as I know, there isn't a way to import MPE midi files into DAWs directly. There are two options:

1. Import 1 channel at a time (from channel 1 to 15) into separate tracks/channels in your DAW, assigning the channel's pitch bend to 15 different copies of the synth.

2. Use the included python script to play back the generated MPE midi file in real-time through a virtual MIDI port on your computer. Record this play-back using any DAW that supports MPE MIDI controllers.

The "Export MIDI CSV" plugin generates a .mid.csv file at the same location as the score.

This file can be fed into the `generate-mpe.py` Python script.

To run this, first, you will need to install [Python 3](https://www.python.org/downloads/) (preferably 3.6 or higher).

After installing, Python, you will need to install three Python libraries: [mido](https://mido.readthedocs.io/en/latest/installing.html), [MIDIUtil](https://midiutil.readthedocs.io/en/1.2.1/), and [python-rtmidi](https://github.com/SpotlightKid/python-rtmidi).

> [!NOTE]
> If you installed Python 3 (the normal way) on Windows, you will need to use the `py` command instead of `python3` below.

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

> [!CAUTION]
> ⚠️ When updating the plugin, make sure you **restart MuseScore for changes to take effect**. To be very certain that the newer files are being used, you can click the **Reload Plugins** button in the [Plugin Manager](https://musescore.org/en/handbook/3/plugins#enable-disable-plugins) to force reload all plugins.

## Troubleshooting

### The tuning is wrong/off

Checklist:

- In the tuning config, suffix cent values with `c`, by default, numbers represent JI ratios.
- Per-note cent offsets in fingerings must be prefixed with with `+` or '-'.
- Per-note JI ratios must be suffixed with `.`, [unless otherwise configured](#2-fingerings-to-denote-ji-intervals)
- [Clear tuning cache](#4-clear-the-tuning-cache)
  - ⚠️ If you modify a tuning from a `.txt` or `.json` file, you will need to clear the tuning cache for the changes to take effect.
- Specify [key signature](#how-to-key-signatures)

If all else fails, [report an issue](#reporting-an-issue). Include the tuning config text you were trying to use and provide a score example.

### I made my own tuning config, but it doesn't seem to be doing anything, and notes are treated as 12edo

This usually means that there's an error in the tuning config itself. On your laptop/PC, go to the [Xen Tuner Tuning Config compiler website](https://euwbah.github.io/musescore-xen-tuner/), paste your tuning config there, and click 'Debug config (js console)', which will print messages/syntax errors to the [browser's JavaScript console](https://balsamiq.com/support/faqs/browserconsole/) about any issues with your declaration of the tuning config.

If you need help understanding the error messages, feel free to [open an issue to ask for help](#reporting-an-issue) using the "[help wanted](https://github.com/euwbah/musescore-xen-tuner/labels/help%20wanted)" tag.

### The plugin just breaks when I use certain accidental symbols/text-entry combinations

This is most likely a tuning config issue &mdash; and usually has something to do with things being declared in the wrong order:

1. Within a single ligature set, the ligatures are not declared in [the right order](#understanding-how-the-plugin-parses--reads-accidentals)
2. If there are multiple ligature sets, the sets aren't declared in [the right order](#understanding-how-the-plugin-parses--reads-accidentals)
3. Secondary accidentals/text representations are not declared in [the right order](#secondary-accidental-declaration-order-matters)

> [!NOTE]
> For example, in `heji/5 limit.txt`, if you shift the second ligature set declaration before the first, you will encounter this issue.

To make your tuning config debugging process easier, follow the instructions in "[Reporting an issue](#reporting-an-issue)" to find debug/error messages when running the plugin from the Plugin Creator.

If the issue is tuning config related, **the debug messages will contain the exact details of how the plugin tried to parse a note and failed**, and you can use that info to fix the tuning config yourself, or ask for help.

### I changed the tuning config text, but the plugin isn't picking up the changes

- If there's a [pre-computed `.json` tuning file](#1-pre-compute-the-tuning-config), you will need to either delete it or use the [Xen Tuner pre-compute config tool](https://euwbah.github.io/musescore-xen-tuner/) to generate a new one with the updated tuning config text.
- You will need to [clear the tuning cache](#4-clear-the-tuning-cache) for the changes to take effect.
- If all else fails, you can just close MuseScore, rename the tuning config file, reopen MuseScore and use the new tuning config name.

### If the plugin is lagging/tuning isn't correct

- [Reset the tuning cache](#4-clear-the-tuning-cache). It is recommended to do this often when you are playing around with many tunings in one score but are no longer using most of the tunings you experimented with.

If you're dealing with many notes per equave (>1000), see [how to deal with huge tunings](#writing-in-huge-tunings)

## Workarounds + advanced configs

There are certain advanced configuration options at the top of the `Xen Tuner/fns.js` file, which you can modify to change certain behaviours of the plugin.

### When I select a single notehead, it doesn't play the right pitch. However, playing back the score works fine.

This is normal. The plugin modifies `PlayEvent`s to affect the MIDI pitch of the note, which are not reflected when you select a notehead. Modifying `PlayEvent`s to compensate for large tuning offsets reduces distortion of the note's timbre during playback. However, if you want to hear the correct pitch all the time and disregard adjusting for timbre, you can modify this line in `Xen Tuner/fns.js` (around line 150):

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

Around line 127 of `Xen Tuner/fns.js`, there is this setting:

```js
var ENHARMONIC_EQUIVALENT_THRESHOLD = 0.005;
```

This sets the threshold interval (in cents) where two notes should be considered enharmonically equivalent.

If enharmonic equivalents in your ET/temperament are not showing up, try increasing this number slightly (e.g. 0.01). Floating point errors (inaccuracies in computer number-crunching) may cause enharmonically equivalent notes to have slightly different cent values. Also, make sure you specify your cent offsets to as many decimal places as possible to reduce this error.

If you're working in a very large JI subset and there is no need for enharmonic equivalents, it's recommended to set this number smaller (even to 0.000001), to prevent two very similar notes being regarded as enharmonically equivalent, since there are no equivalents in JI.

### Keyboard shortcuts stop working

You could have started more than one instance of Xen Tuner. Close Xen Tuner and restart, or restart MuseScore.

If you ran Xen Tuner from the Plugin Creator, you will need to restart MuseScore to restart Xen Tuner normally again.

## Reporting an issue

If none of the above remedies work, you will need to [file an bug report issue here](https://github.com/euwbah/musescore-xen-tuner/issues/new?assignees=&labels=bug&projects=&template=bug_report.md&title=).

Do follow the template provided and include the following information:

- Version of MuseScore
- Version of plugin
- Operating system
- Example score
- Tuning config you were using
- **Debug logs**

### Accessing plugin debug logs in MuseScore 3

- Stop running Xen Tuner (close plugin window/quit button).
- Open the **Plugin Creator** (Plugins > Plugin Creator).
- Open the `xen tuner.qml` file
- Run `xen tuner.qml` from the Plugin Creator.
- Repeat the action you did that caused the issue.
- Usually if an error occurs, you should be able to see the error message at the bottom of the log.
- Copy and paste as much of the debug log as you can, **including the error message** at the bottom.
- 🔴 If you wish to close the plugin, use the "Quit" button. **Do not use the plugin window's 'X' button or the Plugin Creator's 'Stop' button**, otherwise the shortcuts will stop working when you reopen the plugin.

### Accessing plugin debug logs for MuseScore 4

Logs created directly by the plugin aren't accessible anywhere in MuseScore 4 yet.

The best option would be to attach the `.log` files located at:

- **Windows**: `C:\Users\<name>\AppData\Local\MuseScore\MuseScore4\logs\`
- **MacOS**: `~/Library/Application Support/MuseScore/MuseScore4/logs/`
- **Linux**: `~/.local/share/data/MuseScore/MuseScore4/logs/`

if you're not on Windows, you can try running MuseScore from the command line/terminal to see if there's any output.

## HELP NEEDED!

### 1. Testing on MS 4

I've followed the current [temporary guidelines for plugins in MS 4.x](https://musescore.org/en/node/337468), but I can't get MS 4 to open on my computer. I would appreciate if someone can help me test & debug the plugin on MS 4.

🔴 **WARNING**: Even if the plugin currently works on MS 4, the plugin API is said to be unstable and this plugin may break in a future update.

### 2. Data entry of accidentals

I need help with tabulating the [list of all accidentals](https://docs.google.com/spreadsheets/d/1kRBJNl-jdvD9BBgOMJQPcVOHjdXurx5UFWqsPf46Ffw/edit?usp=sharing) available in MuseScore, such that Symbol IDs (`SymId`) & Accidental IDs (`AccidentalType`) that point to the same/similar-looking symbol are grouped together.

1. Use [this tool for looking up symbols and their IDs](https://musescore.org/en/node/341701#comment-1164436), kindly provided by _msfp_ on the MuseScore forums. Download the .zip from the link and open the .html file to access the lookup/symbol search tool.
2. Gather all `SymID`s and `AccidentalType`s that point to the same/similar-looking accidental symbol and tabulate them in the spreadsheet.

## Caveats

- **Does not use the standard accidentals from the "Accidentals" palette**. Accidental symbols used/created by the plugin are cosmetic symbols from the "Symbols" category of the Master Palette. This allows placing multiple accidental symbols on a note. This means:
  - You cannot drag accidentals from the "Accidentals" palette. All accidentals used must be from the "Symbols" category in the Master Palette.
  - Existing scores not made by this plugin will not work with this plugin.
  - Accidentals on grace notes can't be made smaller.
  - Formatting may look different as this plugin completely reimplements how accidentals are positioned.
- **Only concert pitch display mode is supported**. If you wish to write for transposing instruments in its transposed key, put the score in Concert Pitch mode and use a Staff Text to enter a Tuning Config such that the tuning frequency matches the transposition of the instrument.
- Does not fully support cross-staff notation. Accidentals don't carry over between two different staves if cross-staff notation is used. However, you can specify all accidentals explicitly.

#### Smaller caveats

- You cannot adjust the Z index ("Stacking order") of accidental symbols, and certain Z indices are reserved for special fingering annotations/accidentals which should not be used for any other purposes (3903-3905, 1000-2000).
- 5-10s freeze after starting this plugin for the first time after opening MuseScore. [The plugin is loading](https://musescore.org/en/node/306551#comment-1005654).
- Does not differentiate between the order of appearance of accidentals within one note.
- Does not intend to support having the same symbols in two different accidental chains (if required, this can be simulated using ligatures, read about how to implement the [HEJI enharmonic tilde](#weak--important-ligatures-case-study-heji))
- Does not support grace notes occurring _after_ a note. Grace notes occuring _before_ a note are supported.
- Octave 8va/15ma/etc... lines are not supported when non-standard number of nominals are used (e.g. bohlen pierce). You can simulate an 8va/8vb line by setting the [reference frequency](#6-change-reference-pitch) higher/lower when needed.
- If an undefined accidental combination is used, all accidentals on that note will be ignored, even if some (but not all) symbols are parsable.
- Playback of ornaments is fixed to +/- 100 cent steps relative to the attached note.
- When exporting MIDI, crescendos/diminuendos do not affect velocity. There doesn't seem to be a simple way to get the velocity of a note from the plugin API.

-----

## Clarifications

- The use of the term _accidental chain_ in this readme is not related to ["Nominal-Accidental Chains"](https://en.xen.wiki/w/Nominal-accidental_chain). ["Accidental chain"](#accidental-chains--degrees) in this document refers to a sequence of accidentals where adjacent accidentals are a constant interval apart (unless irregular accidental offsets are used), and differs by one [degree](#accidental-chains--degrees) in its component of the [accidental vector](#accidental-vectors). The term "Nominal-Accidental Chain" on https://xen.wiki is a more general descriptor of the phenomenon where most western-centric notation systems involve one nominal and some accidentals which can generate a sequence of notes.

- The "Xen Tuner" name is unrelated to [Keenan Pepper's MuseScore Xentuner plugin](https://github.com/keenanpepper/musescore-xentuner). This naming coincidence I only realized after naming the project. Currently, Keenan's version supports MuseScore 4, and this one doesn't.

-----

## [Contributors](CONTRIBUTORS.md)

## [Changelog](CHANGELOG.md)

## [Dev Notes](/DEVELOPMENT.md)

See dev notes for technical implementation details & how to contribute.

## Support me

[![YouTube](https://img.shields.io/youtube/channel/subscribers/UC5KoRLrbkARhAUQC1tBngaA?label=YouTube%3A%20euwbah&style=social)](https://www.youtube.com/channel/UC5KoRLrbkARhAUQC1tBngaA)

[![GitHub Sponsors](https://img.shields.io/github/sponsors/euwbah?style=for-the-badge)](https://github.com/sponsors/euwbah)