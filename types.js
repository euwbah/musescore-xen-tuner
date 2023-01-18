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