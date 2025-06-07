// Copyright (C) 2023 euwbah
//
// This file is part of Xen Tuner.
//
// Xen Tuner is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Xen Tuner is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Xen Tuner.  If not, see <http://www.gnu.org/licenses/>.

/*
This file is for cosmetic/autocomplete purposes and is not
used in the plugin.

Provides type/class definitions for objects in the plugin,
so that autocomplete is improved.
*/


/**
 * A number or string representing a uniquely identifiable accidental symbol.
 *
 * If this value is a number, it corresponds to a SMuFL symbol. Similar-looking
 * SMuFL symbols have the same symbol code.
 *
 * If this value is a string, it represents an ASCII accidental to be attached to
 * the note verbatim. Internally, ASCII accidental SymbolCodes are prefixed with a
 * quote (`'`) to signify that they are not SMuFL symbols.
 *
 * Remember to prepend the quote `'` to tokenized ASCII accidental fingering texts
 * before looking up tables.
 *
 *
 * [See list of symbol codes](https://docs.google.com/spreadsheets/d/1kRBJNl-jdvD9BBgOMJQPcVOHjdXurx5UFWqsPf46Ffw/edit?usp=sharing)
 * @typedef {number|string} SymbolCode
 */

/**
 * Represents accidental symbols attached to a note. Each entry is the {@link SymbolCode} of the
 * symbol and the number of times this symbol occurs.
 *
 * The keys are NOT ORDERED.
 *
 * The keys are in left-to-right display order as per accidental display order determined by
 * {@link TuningConfig}.
 *
 * This object can be hashed into the {@link AccidentalHash}, which can be appended to a nominal
 * number to produce the {@link XenNote.hash}. The hashed symbols list is sorted by increasing
 * {@link SymbolCode}.
 *
 * (Ignore the type of the key, it should be {@link SymbolCode}, but JSDoc does not support that)
 * @typedef {Object.<number, number>} AccidentalSymbols
 */

/**
 * Represents a tokenized {@link PluginAPINote} element.
 */
class MSNote {
    /**
     * {@link PluginAPINote.pitch}
     *
     * @type {number} */
    midiNote;
    /**
     * {@link PluginAPINote.tpc}
     * @type {number}
     */
    tpc;
    /**
     * Number of 12 edo nominals from A4.
     * @type {number}
     */
    nominalsFromA4;
    /**
     * @type {AccidentalSymbols?}
     */
    accidentals;
    /**
     * @type {number}
     */
    tick;
    /**
     * {@link PluginAPINote.line}
     * @type {number} */
    line;
    /**
     * @type {PluginAPINote}
     */
    internalNote;
    /**
     * List of non-accidental fingering elements attached to this note.
     *
     * Fingerings that function as accidentals will show up in
     * {@link MSNote.accidentals} instead.
     *
     * @type {PluginAPIElement[]}
     */
    fingerings;
}

/**
 * Represents a hashed {@link AccidentalSymbols} object or {@link SymbolCode[]} list.
 *
 * This is a space-separated value where entries come in pairs.
 *
 * `<SymbolCode> <number of occurrences>`
 *
 * E.g. `"6 1 41 2"` represents one flat and two up arrows.
 *
 * `"6 1 'b 1 '6 1"` represents one flat, one 'b' ascii symbol, and one '6' ascii symbol.
 *
 * The symbol codes must be sorted in increasing order. Numerical SymbolCodes
 * come first, followed by string-based ASCII symbol codes, sorted in increasing
 * alphabetical order.
 *
 * @typedef {string} AccidentalHash
 */

/**
 * Represents a single abstract composite accidental being applied to a note,
 * represented by the degrees of each accidental chain.
 *
 * For example, in a tuning system with two accidental chains in this order:
 * sharps/flats, up/down — the AccidentalVector of [2, -3] represents the degree
 * 2 of the sharps/flat chain (double sharp) and degree -3 of the arrows chain
 * (three down arrows).
 *
 * The n-th number represents the degree of the n-th accidental chain.
 * The order of which the accidental chains are declared/stored determines
 * which number corresponds to which accidental chain.
 * @typedef {number[]} AccidentalVector
 */

/**
Think of this as the xen version of ‘tonal pitch class’.

This is how the plugin represents a ‘microtonal’ note,
containing data pertaining to how the note should be
spelt/represented microtonally.

The accidentals object is not sorted. When creating/displaying an
accidental, use orderedSymbols to iterate each symbol in left-to-right order.

If accidentals is null, represents a nominal of the tuning system
(note without accidental).

`<nominal> SymbolCode <degree> SymbolCode <degree> ...`

The SymbolCodes in the hash string must appear in increasing order.

For example, the note A bb d (1 double flat, 1 mirrored flat)
should have the hash string: "0 6 1 10 1".
 */
class XenNote {
    /**
     * Number of nominals with respect to the {@link TuningConfig.tuningNote absolute tuning note} of {@link TuningConfig}
     * @type {number}
     */
    nominal;
    /**
     * A list of symbols in left-to-right display order.
     *
     * If no symbols present, this is an empty list.
     *
     * @type {SymbolCode[]}
     */
    orderedSymbols;
    /**
     * If null, this note represents a nominal of the {@link TuningConfig}
     * @type {AccidentalSymbols?} */
    accidentals;
    /**
     * Unique ID of this {@link XenNote}
     * @type {string}
     */
    hash;
    /**
     * If `true`, this {@link XenNote} has ligature priority (i.e. 'strong ligature')
     *
     * I.e. this spelling will be chosen over non-ligature enharmonic
     * spellings during up/down operations.
     *
     * If this {@link XenNote} was created from a weak ligature (denoted by `lig(...)?`),
     * this will still be `false`.
     *
     * @type {boolean}
     */
    hasLigaturePriority;
    /**
     * If `true`, this {@link XenNote} has an important ligature that
     * should override other enharmonically equivalent spellings in
     * all cases.
     *
     * This spelling will be chosen over other ligature/non-ligature spellings
     * during up/down AND ENHARMONIC cycle operations.
     *
     * These are created from important ligatures denoted by `!` as in:
     * `lig(x,...)`.
     *
     * @type {boolean}
     */
    hasImportantLigature;
}

/**
 * Contains degrees of secondary accidentals present in a {@link NoteData}
 *
 * The keys of this lookup are the indices of the secondary accidental,
 * such that {@link TuningConfig.secondaryAccList}[idx] will yield the
 * secondary accidental that has been matched.
 *
 * The values of this lookup are positive, non-zero numbers, indicating
 * how many times that particular secondary accidental has been matched.
 *
 * @typedef {Object.<number, number>} SecondaryAccMatches
 */

/**
 * Contains information after a note is parsed in {@link readNoteData}.
 *
 * This is where the {@link TuningConfig} lookup is applied to a {@link MSNote}
 * to calculate its {@link XenNote} pitch class, and other secondary accidentals
 * that may apply.
 *
 * During the parsing, new accidentals may be created on the note as the
 * {@link parseNote} function fleshes out the fingering-based accidental entry.
 */
class NoteData {
    /**
     * Tokenized internal 12 edo representation.
     * @type {MSNote} */
    ms;
    /**
     * Xen pitch class.
     * @type {XenNote} */
    xen;
    /**
     * Number of xen equaves relative to tuning note.
     * @type {number} */
    equaves;
    /**
     * {@link SymbolCode}[] list containing secondary accidental symbols
     * in left-to-right display order.
     *
     * If no symbols are present, this will be an empty array.
     *
     * @type {SymbolCode[]}
     */
    secondaryAccSyms;
    /**
     * Contains degrees of matched secondary accidentals.
     *
     * If no secondary accidentals are present, this will be an empty object.
     *
     * @type {SecondaryAccMatches}
     */
    secondaryAccMatches;
    /**
     * If fingering accidental entry was performed, this will contain all accidentals
     * symbols to be displayed & attached to the note in left-to-right display order.
     *
     * Both primary and secondary accidentals are included.
     *
     * As of now, this is just a concatenation of {@link secondaryAccSyms}
     * and {@link XenNote.orderedSymbols xen.orderedSymbols}.
     *
     * If no accidental entry was performed during, this will be `null`.
     *
     * @type {SymbolCode[]?}
     */
    updatedSymbols;
}

/**
 * Contains a lookup for all unique {@link XenNote}s in a tuning system.
 *
 * Maps {@link XenNote.hash} to a {@link XenNote} object.
 *
 * @typedef {Object.<string, XenNote>} NotesTable
 */

/**
 * Contains a map of {@link XenNote.hash}es to their respective {@link AccidentalVector}s.
 *
 * Note that this mapping is not bijective - two {@link XenNote}s can have different
 * nominals but the same {@link AccidentalVector}.
 *
 * @typedef {Object.<string, AccidentalVector>} AccidentalVectorTable
 */

/**
 * Contains a lookup of accidental vectors to their respective symbols.
 *
 * The key is an {@link AccidentalVector} list.
 *
 * Values are {@link SymbolCode}[] lists, in left-to-right display order.
 *
 * @typedef {Object.<string, SymbolCode[]>} AccidentalVectorSymbols
 */

/**
 * Lookup table for the tuning of {@link XenNote}s.
 *
 * Maps {@link XenNote.hash} to `[cents, equavesAdjusted]`.
 *
 * Entries do not need to be sorted in any particular order as the indexing
 * for pitch sorting is done in StepwiseList.
 * See `2.3.5 JI tuning table.csv` for an example.
 *
 * `cents`: the number of cents this note is from tuning note modulo the equave.
 *
 * `equavesAdjusted`: the number of times this note has to be taken up/down an
 * equave so that its cents mapping will fit modulo the equave.
 *
 * The equave adjustment has to be kept track of so that notes are tuned with
 *  in the correct equave, and stepwise up/down operations use the correct equave
 *  for certain notenames.
 *
 * Look at the above 2.3.5 JI subset tuning for an example.
 * (A4 is the tuning note & equave: 1200 cents.)
 *
 * Going up stepwise from the note `Dbbbb\\` to `Gx\`, we actually need to
 * lower `Gx\` by one equave to actually get the correct next note up.
 *
 * Similarly, going up stepwise from `Fxx\\` to `Bbb//`, we’ll need to increase
 *  the equave by 1 so that it sounds in the correct equave.
 *
 * @typedef {Object.<string, [number, number]>} TuningTable
 */

/**
 * This list of lists indexes the {@link XenNote.hash}es in order of ascending pitch
 * (within an equave).
 *
 * Each list represents ‘enharmonically equivalent’ {@link XenNote}s.
 * The stepwise up/down plugins uses this to determine what are the possible
 * spellings of the next stepwise note, and it chooses the best option
 * of enharmonic spelling based on the context (use of implicit accidentals/key
 * signature/minimizing accidentals)
 * @typedef {string[][]} StepwiseList
 */

/**
 * A lookup table for the index of a {@link XenNote.hash} in the {@link StepwiseList}.
 *
 * This lookup is used to determine the index of a current note, and the next
 * note up/down is simply the enharmonically equivalent {@link XenNote}s at index + 1
 * or index - 1 of {@link StepwiseList}.
 *
 * @typedef {Object.<string, number>} StepwiseLookup
 */

/**
A simple lookup table where {@link EnharmonicGraph}[{@link XenNote}] gives the next
enharmonic equivalent spelling of the note, or null if there are no other
enharmonic equivalents.

This lookup table describes a graph composed of several distinct cyclic
directional paths. Each cyclic loop represents enharmonically equivalent notes.

This structure is computed at the same time as the {@link StepwiseList}.

 * @typedef {Object.<string, string>} EnharmonicGraph
 */

/**
Represents a user declared accidental chain.

Each element of {@link degreesSymbols} is a list of {@link SymbolCode}s containing the
symbols composed together to represent one degree in the accidental chain
(in the order of which the user declared)

The actual chain degree being represented by `degreesSymbols[n]` and `tunings[n]`
is equal to `n - centralIdx`.

{@link symbolsUsed} is used to determine what symbols are used in this accidental chain.
 */
class AccidentalChain {
    /**
     * List of {@link SymbolCode}s that make up each degree in this chain.
     *
     * Central element is null.
     *
     * @type {(SymbolCode[]|null)[]}
     */
    degreesSymbols;
    /**
     * Lists all unique symbols used in this chain.
     *
     * @type {SymbolCode[]}
     */
    symbolsUsed;
    /**
     * Tuning of each accidental in cents. Central element is 0.
     *
     * @type {number[]}
     */
    tunings;
    /**
     * The index of the central element.
     * @type {number}
     */
    centralIdx;
}

/**
 * `LigAccVector` is a subspace/subset of {@link AccidentalVector}
 * which corresponds to the degrees of {@link AccidentalChain}s
 * in an order specified by {@link Ligature.regarding}.
 *
 * @typedef {number[]} LigAccVector
 */

/**
 * Represents a ligature declaration.
 *
 * Note: ligatures can be declared weak and important (or both).
 *
 * A weak ligature will not take special precedence over non-ligatures
 * (i.e. the default accidental symbols can be favored over the ligature).
 * This is useful for adding support for sporadic enharmonic spellings or special symbols
 * that can mean different things depending on other symbols present on the note.
 * (See heji/5 limit.txt for an example)
 *
 * An important ligature takes precedence over the default accidental chain's symbols and other
 * non-important ligatures, and overrides the use of non-important spellings in all operations
 * up/down/enharmonic respell.
 */
class Ligature {
    /**
     * Accidental chain indices (starting from 0)
     *
     * An unordered set representing which n-th accidental chains to consider
     * when searching for exact {@link AccidentalVector} matches.
     *
     * (The indices are 0-based)
     *
     * @type {number[]}
     */
    regarding;
    /**
     * Search & replace mapping {@link LigAccVector} strings to {@link SymbolCode}s
     *
     * {@link LigAccVector} is a subspace/subset of {@link AccidentalVector}(s)
     * which corresponds to the order of {@link AccidentalChain}s specified
     * by {@link regarding}.
     *
     * @type {Object.<string, SymbolCode[]>}
     */
    ligAvToSymbols;
    /**
     * `true` if ligature is declared to be weak `lig(...)?`
     * (question mark)
     *
     * If a ligature is weak, ligatured symbols do not get special
     * priority over non-ligatured symbols when choosing between
     * equivalent spellings during up/down operations.
     *
     * The opposite of a weak ligature is called a 'strong ligature'.
     *
     * @type {boolean}
     */
    isWeak;
    /**
     * `true` if ligature is declared to override default acc symbols declared
     * in the accidental chains `lig(...)!`
     * (exclaimation mark)
     *
     * If a ligature overrides the default accidental symbols, the original
     * accidental symbols will no longer be accessible from the up/down/enharmonic
     * operations. These important! ligatures also take precedence over non-overidden
     * ligatures.
     *
     * (The default symbols will still tune and be recognized as valid symbols.)
     *
     * The opposite of an important ligature is called a 'non-important ligature'.
     *
     * @type {boolean}
     */
    isImportant;
}

/**
 * Just a list of numbers which filters which next notes are valid for the
 * current up/down aux operation.
 *
 * - If 0 is in the list, the nominal must stay constant.
 * - If 1 is in the list, the degree of the first accidental chain must stay constant.
 * - If 2 is in the list, the degree of the second accidental chain must stay constant.
 * - etc…
 * @typedef {number[]} ConstantConstrictions
 */

/**
 * Represents a tuning configuration.
 */
class TuningConfig {
    /** @type {NotesTable} */
    notesTable;
    /** @type {TuningTable} */
    tuningTable;
    /**
     * Contains tuning overrides of specified nominals-accidental vector
     * pairs, in absolute cents from the reference frequency.
     *
     * Maps arrays of the form [nominal, avDeg1, avDeg2, ...] to cent
     * tuning values.
     *
     * @type {Object.<string, number>}
     */
    tuningOverrideTable;
    /** @type {AccidentalVectorTable}*/
    avTable;
    /**
     * An {@link AccidentalVectorSymbols} lookup mapping {@link AccidentalVector}
     * to {@link SymbolCode}s that best represent the accidental vector.
     *
     * If different sets of symbols can represent the same {@link AccidentalVector},
     * e.g. {@link Ligature ligatured} vs non-ligatured spellings, the ligatured spelling will take
     * precedence if the ligature is not a {@link Ligature.isWeak weak ligature}.
     *
     * If multiple ligatures exist for the same accidental vector (which really
     * shouldn't happen), the last declared ligature will take precedence in this
     * lookup.
     *
     * @type {AccidentalVectorSymbols}
     */
    avToSymbols;
    /** @type {StepwiseList} */
    stepsList;
    /** @type {StepwiseLookup} */
    stepsLookup;
    /**
     * enharmonics[{@link XenNote.hash}] gives the next enharmonic equivalent of the note.
     *
     * Reversed order is in {@link enharmonicsReversed}.
     * @type {EnharmonicGraph} */
    enharmonics;
    /**
     * enharmonics[{@link XenNote.hash}] gives the previous enharmonic equivalent of the note.
     *
     * Reversed order is in {@link enharmonics}.
     * @type {EnharmonicGraph}
     */
    enharmonicsReversed;
    /** @type {AccidentalChain[]} */
    accChains;
    /** @type {Ligature[]} */
    ligatures;
    /**
     * List of nominals within an equave in cents (including the first).
     *
     * @type {number[]} */
    nominals;
    /**
     * Corresponds to {@link nominals}`.length`
     * @type {number} */
    numNominals;
    /**
     * In cents.
     * @type {number} */
    equaveSize;
    /**
     * MIDI note number of absolute reference note.
     *
     * The first note of the nominals will be this reference note.
     *
     * @type {number}
     */
    tuningNote;
    /**
     * How many 12edo nominals from A4 is the absolute reference note.
     *
     * The first note of the nominals will be this reference note.
     *
     * @type {number}
     */
    tuningNominal;
    /**
     * If the user specifies a mode-preserving reference tuning change,
     * the reference note the user specified is stored in this variable as an offset
     * of the number of nominals away from the original reference note specified in
     * the tuning config/most recent mode-changing reference tuning change.
     *
     * Defaults to 0.
     *
     * This value ONLY affects JI ratio calculations of fingering-based JI annotations,
     * and the Display Cents/Steps calculation.
     *
     * 1/1 will be the relative tuning nominal.
     *
     * Changing this does not affect the {@link XenNote.nominal} property's relation to
     * the absolute tuning nominal.
     *
     * @type {number}
     */
    relativeTuningNominal;
    /**
     * Effective hz of the absolute reference note ({@link tuningNote} & {@link tuningNominal}).
     *
     * This value is initially set to {@link originalTuningFreq}, but after a reference
     * pitch change (that doesn't change the mode), this value will be updated to match
     * the required reference pitch, without actually changing the {@link tuningNote} or
     * {@link tuningNominal}.
     *
     * @type {number}
     */
    tuningFreq;
    /**
     * Stores the original Hz of the reference. This value is read from the tuning config
     * file and does not change unless a reference pitch change with mode change (!) is called
     * for.
     *
     * This value is used to calculate the updated {@link tuningFreq} when relative tuning
     * changes occur, so that floating point errors don't accumulate.
     *
     * @type {number}
     */
    originalTuningFreq;
    /**
     * The 0-based Nth entry of this list corresponds to the Nth auxiliary
     * operation's {@link ConstantConstrictions} conditions on how a note
     * can be transposed.
     *
     * The first item in this list must be `null`, to signify a non-auxiliary
     * operation.
     *
     * @type {ConstantConstrictions[]}
     */
    auxList;

    /**
     * Lookup of all the accidental symbols/ASCII that affect {@link XenNote} spelling.
     *
     * When tokenizing a note, if the plugin finds symbols that do not belong
     * to this lookup, it will exclude them from affecting the XenNote spelling.
     *
     * @type {Object.<SymbolCode, boolean>}
     */
    usedSymbols;

    /**
     * Lookup of all the symbols used in secondary accidentals that do not affect {@link XenNote} spelling.
     * But the plugin should still recognize these as accidentals and format them as such.
     *
     * These symbols are not included in {@link usedSymbols}.
     *
     * @type {Object.<SymbolCode, boolean>}
     */
    usedSecondarySymbols;

    /**
     * These are all the secondary accidentals in the order which they are declared.
     *
     * The plugin will search for secondary accidentals in this order.
     *
     * @type {AccidentalHash[]}
     */
    secondaryAccList;

    /**
     * Lookup mapping entries in {@link secondaryAccList} to their index.
     *
     * E.g. if `6 2 '> 3` is the 3rd element of `secondaryAccList`, then
     * `secondaryAccIndexTable['6 2 '> 3'] === 2`.
     *
     * @type {Object.<AccidentalHash, number>}
     */
    secondaryAccIndexTable;

    /**
     * Lookup mapping secondary accidentals to properly ordered
     * {@link SymbolCode}[] arrays. These symbol code arrays represent
     * the left-to-right order that the symbol codes should be displayed.
     *
     * @type {Object.<AccidentalHash, SymbolCode[]>}
     */
    secondaryAccTable;

    /**
     * Contains lookup for tunings of secondary accidentals.
     *
     * The value mapped to a secondary accidental can either be:
     *
     * - A single number which denotes the cent offset of the accidental,
     * - Or, an array of as many numbers as there are nominals,
     *   denoting the cent offset of the accidental for each nominal.
     *
     * @type {Object.<AccidentalHash, number|number[]>}
     */
    secondaryTunings;

    /**
     * Contains lookup for converting ascii verbatim input to SMuFL symbols.
     *
     * ASCII verbatim input are NOT SymbolCodes, they are literally ascii strings
     * that the user types in.
     *
     * @type {Object.<string, SymbolCode[]>}
     */
    asciiToSmuflConv;

    /**
     * List of keys in asciiToSmuflConv, in order of declaration.
     *
     * The keys coming earlier in the list will be searched and matched first.
     *
     * @type {string[]}
     */
    asciiToSmuflConvList;

    /*
    OTHER SECONDARY SETTINGS
    */

    /**
     * If `true`, every accidental symbol is made explicit, even though it matches
     * a carry-over accidental or key signature.
     *
     * Defaults to `false`.
     *
     * Set to `true` using the `explicit()` secondary declaration.
     *
     * @type {boolean}
     */
    alwaysExplicitAccidental;

    /**
     * If `true`, fingering-based text accidentals will not be bolded.
     *
     * Defaults to `false` (i.e. bold text).
     *
     * Set to `true` using the `nobold()` secondary declaration.
     *
     * @type {boolean}
     */
    nonBoldTextAccidental;

    /**
     * If this value is not `null`, it denotes that this tuning config supports
     * displaying the step index of the note. The number of this value is the
     * number of edosteps/neji steps to display.
     *
     * @type {number?}
     */
    displaySteps;

    /**
     * Where to position the fingering containing edosteps info of the note.
     *
     * Defaults to 'below'.
     *
     * @type {'above'|'below'}
     */
    displayStepsPosition;

    /**
     * How the displayed cents offset should be calculated.
     *
     * - 'nominal': (Default) The cents offset from the nominal of the note.
     * - 'absolute': The absolute number of cents from the relative reference note.
     * - 'semitone': Same as above, modulo the 100 cents semitone ranging from +/-50c
     *
     * @type {'nominal'|'absolute'|'semitone'}
     */
    displayCentsReference;

    /**
     * Number of decimal places precision of the cent offset display.
     *
     * Defaults to 0
     *
     * @type {number}
     */
    displayCentsPrecision;

    /**
     * Where to position the fingering containing cents tuning info of the note.
     *
     * Defaults to 'above'.
     *
     * @type {'above'|'below'}
     */
    displayCentsPosition;

    /**
     * A list of symbol groups. Each symbol group will act independently: each symbol in a symbol
     * group overrides prior accidentals (or key sig) in the same symbol group, but other symbol
     * groups will persist until the end of the barline.
     *
     * E.g., let's say # and ^ are two symbols in two different symbol groups. If within a bar,
     * there is a written C^ followed by a written C#, then the C# will be understood as C#^ since
     * the ^ persists.
     *
     * In the edge case, if a written symbol does not belong in any symbol group (which should not
     * normally be the case), assume the symbol is in the first symbol group (index 0)
     *
     * For each symbol group, we requires a unique {@link SymbolCode} as the "naturalizing"
     * accidental.
     *
     * E.g., in Kite's ups and downs notation, the natural accidental ♮ is used to naturalize the
     * pythagorean accidentals #, b, and the UTF "plain" symbol ◇ is used to naturalize ups and
     * downs ^, v. It is a syntax error if a symbol group does not have a naturalizing accidental.
     *
     * @type {SymbolCode[][]}
     */
    independentSymbolGroups;

    /**
     * Lookup table for symbol groups of {@link SymbolCode}s.
     *
     * The number associated with a symbol is the index of the symbol group containing the symbol in
     * {@link independentSymbolGroups}
     *
     * If a symbol is not associated in any group, it is to be treated as being in the first symbol
     * group (index 0)
     *
     * @type {Object.<SymbolCode, number>}
     * @see {@link independentSymbolGroups}
     */
    symbolGroupLookup;

    /**
     * Lookup table for which symbol group in {@link independentSymbolGroups} uses which
     * naturalizing accidental symbols.
     *
     * - Key/index: symbol group index
     * - Value: The {@link SymbolCode} of the naturalizing accidental for the above indexed group.
     *
     * NOTE: Naturalizing accidental symbol cannot be a compound/complex symbol containing multiple
     * symbols. Only a single SMuFL symbol or a single ASCII/UTF string is allowed (no multiple
     * symbols, no combinations of SMuFL and ASCII/UTF fingering text)
     *
     * @type {SymbolCode[]}
     */
    symbolGroupNaturalizingLookup;

    /**
     * Inverse lookup table of {@link symbolGroupNaturalizingLookup}.
     *
     * - Key: {@link SymbolCode} of the naturalizing accidental symbol.
     * - Value: The index of its associated symbol group in {@link independentSymbolGroups}
     *
     * @type {Object.<SymbolCode, number>}
     */
    symbolGroupNaturalizingLookupIdx;
}

/**
 * A lookup for memoized parsed {@link TuningConfig}s. Because of how the {@link Cursor}
 * requires each voice to be tuned separately one at a time, it will cause many
 * unnecessary re-parsings of the same System/Staff Text element.
 *
 * To prevent re-parsings, this lookup maps verbatim system/staff texts
 * to the {@link TuningConfig} it results in when parsed.
 *
 * @typedef {Object.<string, TuningConfig>} TuningConfigLookup
 */

/**
 * Contains a list of N {@link AccidentalHash} hashes, where N is the number of nominals in the
 * tuning system.
 *
 * The X-th hash represents the accidental symbol(s) to be applied on the X-th nominal by the key
 * signature. The first hash corresponds to the nominal as stated by the reference tuning note.
 *
 * E.g. if `G4: 440` is used, then `KeySig[0]` will be the accidental that applies to G, `KeySig[1]`
 * applies to A, etc…
 *
 * If no accidental is to be applied on the nominal, the entry should be `null`.
 *
 * The list is to contain N hash/null entries at all times. However, because it is impossible to
 * validate whether a KeySig declaration has the right number of nominals (user may change tuning
 * config without updating key sig), validation checks have to be done before attempts to look up
 * the KeySig.
 *
 * @typedef {(?AccidentalHash)[]} KeySig
 */

/**
 * Represents a pseudo-{@link TuningConfig} object which is used to change the
 * reference note/tuning of the current tuning system without recalculating
 * the entire {@link TuningConfig}.
 */
class ChangeReferenceTuning {
    /**
     * MIDI note number of reference note.
     * @type {number}
     */
    tuningNote;
    /**
     * How many 12edo nominals from A4 is the reference note.
     * @type {number}
     */
    tuningNominal;
    /**
     * Hz of the reference note.
     * @type {number}
     */
    tuningFreq;
    /**
     * `false` if the change reference tuning declaration is prefixed
     * with `!` which signifies that the tuning config's nominals should
     * be redeclared starting on the new reference note, effectively
     * changing the 'mode' of the nominal scale.
     *
     * E.g. if a tuning config is originally declared to be A4: 440,
     * but a reference tuning change is declared as `!C4: 263`, then
     * the new interval between the written D and E will actually be
     * the same as the interval between B and C before the reference
     * tuning change.
     *
     * Otherwise, if `!` is not stated, then this value is `true`.
     *
     * If this is `false`, then {@link changeRelativeNominalOnly}
     * must also be `false`, otherwise this wouldn't make sense
     *
     * @type {boolean}
     */
    preserveNominalsMode;
    /**
     * Signifies that only the relative nominal should be changed
     * (the frequency is unspecified, e.g. "E5:").
     *
     * This changes the relative 1/1 of fingering annotations
     * that specify JI ratios.
     *
     * If this is `true`, then {@link preserveNominalsMode} must
     * also be `true`.
     *
     * @type {boolean}
     */
    changeRelativeNominalOnly;
}

/**
 * A function that updates config properties in parms as part
 * of the {@link ConfigUpdateEvent}
 *
 * @callback configUpdateCallback
 * @param {Parms} parms
 */

/**
 * This object represents a single parms configuration update event that
 * is to be executed when (or after) the cursor reaches tick position.
 *
 * The purpose of the {@link ConfigUpdateEvent} is to update {@link TuningConfig},
 * {@link KeySig}, and other settings on a staff-by-staff basis.
 *
 * System Text config annotations affect all staves and Staff Text annotations
 * affect only the staff that it is on.
 *
 * This allows the plugin to support multiple simultaneous & changing tuning
 * systems and changing key signatures etc… since every config is applied
 * according to when it is placed in the score.
 */
class ConfigUpdateEvent {
    /**
     * When {@link Cursor} is on/passes this tick, the config should
     * be applied.
     *
     * @type {number}
     */
    tick;
    /**
     * Callback function that modifies parms object.
     *
     * @type {configUpdateCallback}
     */
    config;
}

/**
 * `parms` represents the global state object of the plugin.
 *
 * The {@link ConfigUpdateEvent}s in {@link staffConfigs} will modify properties
 * of parms over time to reflect the current configurations applied to the current
 * staff ({@link Cursor.staffIdx}) to apply at current cursor position.
 */
class Parms {
    /**
     * Contains ticks of the first {@link PluginAPISegment} of each bar,
     * sorted in increasing order.
     *
     * @type {number[]}
     */
    bars;
    /**
     * Contains a mapping of each {@link Cursor.staffIdx} to a list of
     * {@link ConfigUpdateEvent}s that affect that stave.
     *
     * @type {Object.<number, ConfigUpdateEvent[]>}
     */
    staffConfigs;
    /**
     * Current key signature being presently applied.
     *
     * @type {KeySig}
     */
    currKeySig;
    /**
     * Current tuning configuration being presently applied
     *
     * @type {TuningConfig}
     */
    currTuning;
    // TODO implement currExplicit
    currExplicit;
}

/**
 * Represents a saved {@link Cursor} position created by
 * {@link saveCursorPosition}(Cursor)
 *
 * Cursor position can be restored with
 * {@link restoreCursorPosition}(SavedCursorPosition)
 */
class SavedCursorPosition {
    /**
     * Saved {@link Cursor.tick}
     * @type {number}
     */
    tick;
    /**
     * Saved {@link Cursor.staffIdx}
     * @type {number}
     */
    staffIdx;
    /**
     * Saved {@link Cursor.voice}
     * @type {number}
     */
    voice;
}

/**
 * A list of {@link NextNoteOption} which contains enharmonically equivalent spellings
 * of a modified note in {@link chooseNextNote}.
 *
 * To be sorted such that the first entry is used.
 *
 * @typedef {NextNoteOption[]} NextNoteOptions
 */

/**
 * Represents a single option for a possible note spelling for the modified
 * note after an up/down operation.
 *
 * @typedef {Object} NextNoteOption
 * @property {NextNote} nextNote
 * @property {number} avDist - Squared {@link AccidentalVector} distance from prior accidental context,
 * @property {number} absAvDist - Squared {@link AccidentalVector} distance from origin nominal,
 * @property {number} numSymbols - Number of symbols in {@link XenNote.orderedSymbols}
 * @property {number} lineOffset - Amount to add to {@link PluginAPINote.line} to update the nominal.
 * @property {number} sumOfDegree - Sum of degrees of {@link AccidentalVector}
 */

/**
 * Return value of {@link chooseNextNote}() function. Contains info about what
 * which note the plugin chooses to provide as the ‘next note’ during the
 * up/down/enharmonic cycle operations.
 */
class NextNote {
    /** @type {XenNote} */
    xen;
    /**
     * Xen nominal of the new note (modulo equave)
     * @type {number} */
    nominal;
    /**
     * Number of equaves from reference note.
     * @type {number}
     */
    equaves;
    /**
     * Amount to add to {@link PluginAPINote.line} to update the nominal.
     * @type {number}
     */
    lineOffset;
    /**
     * Whether the new note's accidental matches a prior accidental.
     * @type {boolean}
     */
    matchPriorAcc;
}

/**
 * @typedef {PluginAPINote[][]} GraceChordsAndChords
 *
 * @typedef {Object.<number, GraceChordsAndChords>} TickToChords
 *
 * @typedef {Object.<number, TickToChords>} LineToTickChords
 */

/**
 * Return value of {@link readBarState()}. This object is helpful checking
 * accidental-related things as it presents notes on a line-by-line (nominal)
 * basis, with notes properly sorted by order of appearance.
 *
 * The tick-notes mappings on each line can be sorted by tick, and each
 * grace chord/chord can be traversed in proper order of appearance.
 *
 * E.g. data structure, where `[Note]` are {@link PluginAPINote} objects
 *
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
 *
 * @typedef {LineToTickChords} BarState
 */

/**
 * Represents chords/grace chords at a single given tick in one voice.
 * @typedef {PluginAPINote[][]} ChordsRightToLeft
 */

/**
 * Chords at a given tick for each voice. 0-based index voice.
 * @typedef {ChordsRightToLeft[]} Voices
 */

/**
 * Data structure for amalgamating all chords at a single given tick
 * across all voices.
 *
 * Used for auto-positioning accidental symbols.
 *
 * See [Auto Positioning 1: Read chords at given tick](./DEVELOPMENT.md)
 *
 * @typedef {Voices} Chords
 */

/**
 * Represents an {@link PluginAPIElement} that has been positioned and is now fixed.
 */
class PositionedElement {
    /**
     * @type {PluginAPIElement}
     */
    element;
    /**
     * Absolute {@link PluginAPIElement.pagePos} Y coordinates of
     * {@link PluginAPIElement.bbox}'s `.top`.
     *
     * Negative Y = higher up the screen.
     */
    top;
    /**
     * Absolute {@link PluginAPIElement.pagePos} Y coordinates of
     * {@link PluginAPIElement.bbox}'s `.bottom`
     *
     * Negative Y = higher up the screen.
     */
    bottom;
    /**
     * Absolute {@link PluginAPIElement.pagePos} X coordinates of
     * {@link PluginAPIElement.bbox}'s `.left`
     */
    left;
    /**
     * Absolute {@link PluginAPIElement.pagePos} X coordinates of
     * {@link PluginAPIElement.bbox}'s `.right`
     */
    right;
}

/**
 * An intermediate representation of the notes in a {@link TuningConfig}.
 *
 * Used while it is being parsed/constructed.
 *
 * @typedef {Object.<string, XNE>} XenNotesEquaves
 */

/**
 * After {@link XenNotesEquaves} is populated, the XenNotes' values
 * are sorted in increasing pitch order to create this list.
 *
 * @typedef {XNE[]} SortedXNE
 */

/**
 * @typedef XNE
 * @type {object}
 * @property {AccidentalVector} av
 * @property {XenNote} xen
 * @property {number} cents - Number of cents from the reference note modulo equave
 * @property {number} equavesAdjusted - Number of equaves adjusted to get cents within equave 0
 */

/**
 * Represents a tokenized [HEWM](http://www.tonalsoft.com/enc/h/hewm_appendix.aspx)
 * accidental string. The keys of this object are the unique ASCII characters in the
 * accidental string, and the value is the number of times it appears.
 *
 * For example,
 *
 * ```js
 * {
 *   'b': 2,
 *   '+': 1,
 *   '?': 1
 * }
 * ```
 *
 * @typedef {Object.<string, number>} HewmAccidental
 */

class QRectF {
    /** @type {number} */
    top;
    /** @type {number} */
    bottom;
    /** @type {number} */
    left;
    /** @type {number} */
    right;
    /** @type {number} */
    width;
    /** @type {number} */
    height;
    /** @type {number} */
    x;
    /** @type {number} */
    y;
}

class QPoint {
    /** @type {number} */
    x;
    /** @type {number} */
    y;
}

class PluginAPISymbolID {
    /**
     * @returns {string}
     */
    toString() {

    }
}

const Placement = {
    ABOVE: 0,
    BELOW: 1
}

/**
 * An enumeration label of the {@link ELEMENT} enumeration.
 *
 * @typedef {string} ElementType
 */

/**
 * [ElementType enumeration](https://musescore.github.io/MuseScore_PluginAPI_Docs/plugins/html/namespace_ms.html#a16b11be27a8e9362dd122c4d879e01ae)
 *
 * Values here are placeholder. This is just for autocomplete purposes.
 * Do not actually use these numerical values.
 *
 * This is an incomplete list. See the link above for the full list.
 *
 * @type {Object.<ElementType, number>}
 */
const ELEMENT = {
    FINGERING: 0,
    NOTE: 0,
    TEXT: 0,
    SYMBOL: 0,
    STAFF_TEXT: 0,
    SYSTEM_TEXT: 0,
    TEMPO_TEXT: 0,
    DYNAMIC: 0,
}

/**
 * Align enumeration
 *
 * Values used as bitmask.
 */
const Align = {
    LEFT: 0,
    RIGHT: 1,
    HCENTER: 2,
    TOP: 0,
    BOTTOM: 4,
    VCENTER: 8,
    BASELINE: 16,
    CENTER: 8|2,
    HMASK: 0|1|2,
    VMASK: 0|4|8|16,
};


/**
 * @callback newElement
 * @param {ElementType} elem Element type from {@link ELEMENT} enumeration
 * @returns {PluginAPIElement}
 */

/**
 * Instantiates a new element of the given type.
 * @param {ElementType} elemType - type of element to create
 * @return {PluginAPIElement} newly created {@link PluginAPIElement}
 */
function newElement(elemType) { }

/**
 * Represents any element in the score.
 *
 * For the purposes of the plugin, this could be a notehead, tempo, dynamic,
 * chord, grace note, fingering, system/staff text, or accidental/smufl symbol.
 */
class PluginAPIElement {
    /**
     * A number that equals staffIdx * 4 + voice.
     * @type {number}
     */
    track;
    /** @type {QPoint} */
    pagePos;
    /** @type {number} */
    offsetX;
    /** @type {number} */
    offsetY;
    /** @type {QRectF} */
    bbox;
    /**
     * @type {'Fingering' | 'StaffText' | 'SystemText' | 'Chord'}
     */
    name;
    /**
     * Element Type enumeration
     *
     * @type {number}
     */
    type;
    /**
     * Fingering/staff/system text, if any.
     *
     * @type {string?}
     */
    text;
    /**
     * Internal symbol ID, if any.
     *
     * Call .toString() to convert to label representation.
     * @type {PluginAPISymbolID?}
     */
    symbol;
    /**
     * If this element is a Tempo, contains the beats per second of the tempo.
     * @type {number?}
     */
    tempo;
    /**
     * If this element is dynamic marking, contains the MIDI velocity of
     * the dynamic marking.
     * @type {number?}
     */
    velocity;

    /**
     * Text alignment setting. Uses a bitmask.
     *
     * Refer to the {@link Align} enumeration.
     *
     * @type {number?}
     */
    align;
    /**
     * Font size of text in pts
     * @type {number?}
     */
    fontSize;
    /**
     * Font style (bold/italic/underline). Uses a bitmask.
     *
     * Refer to the {@link FontStyle} enumeration.
     *
     * @type {number?}
     */
    fontStyle;

    /**
     * Z-index of this element.
     *
     * MuseScore uses this to control what draws on top of what.
     *
     * However this plugin uses this to ascribe certain metadata/flags
     * to score elements.
     *
     * The user is not recommended to change Z index as it will affect
     * the plugin's ability to identify & update accidental symbols.
     *
     * Symbols & fingering elements that constitute primary & secondary
     * accidentals on a note use Z-index to sort them left-to-right in the
     * correct order. The Z-index of accidental symbols cannot be changed.
     *
     * For Fingerings and Symbols, the Z-index range 1000-2000 is reserved
     * for accidental elements that have been processed and sorted in the
     * correct order.
     *
     * The z-index 3900 is assumed to be the default un-processed fingering
     * annotation.
     *
     * @type {number}
     */
    z;

    /**
     * @type {Placement.ABOVE|Placement.BELOW|null}
     */
    placement;

    /**
     * Enables/disables Automatic placement
     *
     * @type {boolean?}
     */
    autoplace;

    /**
     * The "Style" attribute of a text/fingering element.
     *
     * TODO: In MuseScore 3.6, these enum constants are different than in MuseScore 4.
     *
     * - 33 = Fingering
     * - 45 = User-1
     *
     * @type {number|33|45}
     */
    subStyle;

    /**
     * Checks if two element wrapper objects point to the same element in the score.
     *
     * @param {PluginAPIElement} elem other element
     * @returns {boolean} `true` if this element is the same as `elem`.
     */
    is(elem) { }
}

/**
 * Represents a Segment in the score, which a collection of
 * elements that occur at the same tick.
 */
class PluginAPISegment {
    /** @type {number} */
    tick;
    /**
     * Represents annotation/elements attached to this segment/tick.
     * @type {PluginAPIElement[]}
     */
    annotations;
}

class PluginAPIChord extends PluginAPIElement {
    /** @type {PluginAPINote[]} */
    notes;
    /**
     * List of chords which are grace notes attached to this chord.
     * @type {PluginAPIChord[]}
     */
    graceNotes;
    /**
     * If this chord is a grace chord, this is the chord it is attached to.
     *
     * Otherwise, this is the segment this chord belongs to.
     * @type {PluginAPISegment|PluginAPIChord}
     */
    parent;
    /**
     * Duration of the chord in ticks. Takes into account tempo changes etc...
     * @type {number}
     */
    actualDuration;
}

class PlayEvent {
    /**
     * Relative MIDI pitch offset from the original MIDI note
     * @type {number}
     */
    pitch;
    /**
     * Relative MIDI note ontime from the {@link PluginAPISegment}'s tick.
     * This number ranges from 0 to 1000, where 1000 is the duration of the note.
     * @type {number}
     */
    ontime;
    /**
     * Relative MIDI note offtime from the {@link PluginAPISegment}'s tick.
     * This number ranges from 0 to 1000, where 1000 is the duration of the note.
     * Typically this is 950 unless staccato/legato.
     * @type {number}
     */
    offtime;
    /**
     * {@link offtime} - {@link ontime}
     * @type {number}
     */
    len;
}

class PluginAPITie extends PluginAPIElement {
    /**
     * The left note attached to this tie.
     * @type {PluginAPINote}
     */
    startNote;
    /**
     * The right note attached to this tie.
     * @type {PluginAPINote}
     */
    endNote;
}

/**
 * The internal `PluginAPI::Note` object.
 */
class PluginAPINote extends PluginAPIElement {
    /**
     * MIDI Note pitch
     * @type {number}
     */
    pitch;
    /**
     * Tonal pitch class number
     * @type {number}
     */
    tpc;
    /**
     * Staff line (how high this note is in the staff)
     * Lower number = higher note
     * @type {number}
     */
    line;
    /**
     * List of {@link PluginAPIElement}s attached to this note
     * @type {PluginAPIElement[]}
     */
    elements;
    /**
     * The chord this note belongs to.
     * @type {PluginAPIChord}
     */
    parent;
    /**
     * @type {PlayEvent[]
     */
    playEvents;
    /**
     * Reference to the first {@link PluginAPINote} in a sequence
     * of notes tied together.
     *
     * @type {PluginAPINote}
     */
    firstTiedNote;
    /**
     * Reference to the last {@link PluginAPINote} in a sequence
     * of notes tied together.
     *
     * @type {PluginAPINote}
     */
    lastTiedNote;
    /** @type {PluginAPITie?} */
    tieBack;
    /** @type {PluginAPITie?} */
    tieForward;
    /**
     * Attach the {@link PluginAPIElement} to this notehead
     * @param {PluginAPIElement} elem element to add
     */
    add(elem) { }
    /**
     * Remove the {@link PluginAPIElement} from this notehead
     * @param {PluginAPIElement} elem element to remove
     */
    remove(elem) { }
}

/**
 * Represents a cursor that traverses the score.
 */
class Cursor {
    /**
     * @type {number}
     */
    tick;
    /**
     * @type {PluginAPISegment}
     */
    segment;
    /** @type {PluginAPIElement} */
    element;
    /** @type {number} */
    voice;
    /** @type {number} */
    staffIdx;
    prev() { }
    next() { }
    /**
     * - 0: Rewind to start of score
     * - 1: Rewind to start of selection
     * - 2: Rewind to end of selection
     * @param {number} rewindMode
     */
    rewind(rewindMode) { }
    /**
     * Moves cursor to specified tick.
     *
     * @param {number} tick Tick to move to
     */
    rewindToTick(tick) { }
}

class PluginAPIScore {
    /**
     * Signals start of a score-modifying operation.
     *
     * While modifying a score, any newly created objects'
     * properties will not be populated/set until {@link endCmd} is called.
     */
    startCmd() { }
    /**
     * Signals end of a score-modifying operation.
     *
     * New object's properties will be calculated after this call.
     */
    endCmd() { }
    /**
     * Retrieve metadata attached to the score.
     * @param {string} key
     * @returns {string}
     */
    metaTag(key) { }
    /**
     * Assigns metadata attached to the score.
     * @param {string} key
     * @param {string} value
     */
    setMetaTag(key, value) { }
    /**
     * Call this function to populate {@link PlayEvent}s for all notes in the score.
     */
    createPlayEvents() { }
    /**
     * Create a {@link Cursor} instance
     * @returns {Cursor}
     */
    newCursor() { }
}

/** @type {PluginAPIScore} */
var curScore;

class FileIO {
    /**
     * Path to the file. Can be specified relative to the plugin home directory.
     */
    source;
    /**
     * Read entire file.
     *
     * If unsuccessful, returns empty string `''`.
     * @returns {string}
     */
    read() { }
    /**
     * Writes/overrides file with given string.
     *
     * @param {string} str Content to write
     */
    write(str) { }
}

/**
 * Opens a log file for writing.
 *
 * Use {@link logn} to log to this file.
 *
 * Remember to {@link closeLog()} afterwards.
 *
 * @param {string} filePath path to log file
 */
function openLog(filePath) {}

function closeLog() {}

/** Log with new line */
function logn(str) {}