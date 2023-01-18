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
 * A number representing a uniquely identifiable accidental symbol. 
 * A single symbol code maps to all MuseScore accidental enums/SMuFL IDs 
 * that looks identical.
 * 
 * [See list of symbol codes](https://docs.google.com/spreadsheets/d/1kRBJNl-jdvD9BBgOMJQPcVOHjdXurx5UFWqsPf46Ffw/edit?usp=sharing)
 * @typedef {number} SymbolCode
 */

/**
 * Represents accidental symbols attached to a note. Each entry is the {@link SymbolCode} of the symbol and the number of times this symbol occurs.

The keys are NOT ORDERED.

The keys are in left-to-right display order as per accidental display order determined by {@link TuningConfig}.

This object can be hashed into the AccidentalSymbols hash, which can be appended to a nominal number to produce the {@link XenNote.hash}. 
The hashed symbols list is sorted by increasing {@link SymbolCode}.
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
     * List of fingering elements attached to this note.
     * @type {PluginAPIElement[]}
     */
    fingerings;
}

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
     * Number of nominals with respect to tuning note of {@link TuningConfig}
     * @type {number}
     */
    nominal;
    /** @type {SymbolCode[]} */
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
}

/**
 * Represents a semantically parsed note after {@link TuningConfig} lookup is
 * applied to a {@link MSNote} to calculate its {@link XenNote} pitch class.
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
     * .@type {number} */
    equaves;
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
 * NOTE: There doesn’t seem to be a use case for an
 * inverse mapping of this yet. However, if it is required later down
 * the line, that would mean a lot of the implementation has to change. Hmm.
 * 
 * @typedef {Object.<string, AccidentalVector>} AccidentalVectorTable
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
     * @type {(SymbolCode|null)[]}
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
 * Represents a ligature declaration.
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
     * Search & replace mapping {@link AccidentalVector}s to {@link SymbolCode}s
     * 
     * `LigAccVector` is a subspace/subset of {@link AccidentalVector}(s)
     * which corresponds to the order of {@link AccidentalChain}s specified
     * by {@link regarding}.
     * 
     * @type {Object.<string: LigAccVector, SymbolCode[]>}
     */
    ligAvToSymbols;
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
    /** @type {AccidentalVectorTable}*/
    avTable;
    /** @type {StepwiseList} */
    stepsList;
    /** @type {StepwiseLookup} */
    stepsLookup;
    /** @type {EnharmonicGraph} */
    enharmonics;
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
     */
    tuningFreq;
    /**
     * 
     */
    auxList;
}

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
     * @type {'Fingering' | 'StaffText' | 'SystemText'}
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
    prev() {}
    next() {}
    /**
     * 0: Rewind to start of score
     * 1: Rewind to start of selection
     * 2: Rewind to end of selection
     * @param {number} rewindMode 
     */
    rewind(rewindMode) {}
}

class PluginAPIScore {
    /**
     * Signals start of a score-modifying operation.
     * 
     * While modifying a score, any newly created objects'
     * properties will not be populated/set until {@link endCmd} is called.
     */
    startCmd() {}
    /**
     * Signals end of a score-modifying operation.
     * 
     * New object's properties will be calculated after this call.
     */
    endCmd() {}
    /**
     * Retrieve metadata attached to the score.
     * @param {string} key 
     * @returns {string}
     */
    metaTag(key) {}
    /**
     * Assigns metadata attached to the score.
     * @param {string} key 
     * @param {string} value 
     */
    setMetaTag(key, value) {}
    /**
     * Call this function to populate {@link PlayEvent}s for all notes in the score.
     */
    createPlayEvents() {}
    /**
     * Create a {@link Cursor} instance
     * @returns {Cursor}
     */
    newCursor() {}
}