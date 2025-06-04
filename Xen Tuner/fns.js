// Copyright (C) 2025 euwbah
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

// MUST USE ES5 SYNTAX FOR MSCORE COMPAT.

var Lookup = ImportLookup();

var isMS4; // init sets this to true if MuseScore 4 is detected.

/**
 * If {@link isMS4}, this will be assigned to `mu::plugins::api::enums::AccidentalType`,
 * otherwise, it will be `MS::PluginAPI::Accidental` for MuseScore 3.
 */
var Accidental = null;
var NoteType = null;
// eslint-disable-next-line no-redeclare
var Element = null;
var SymId = null; // WARNING: SymId has a long loading time.
/** @type {FileIO} */
var fileIO;
/**
 * Contains the home directory of the plugin
 */
var pluginHomePath = '';
/** @type {PluginAPIScore} */
var _curScore = null; // don't clash with namespace

/**
 * FontStyle enumeration.
 *
 * Values used as bitmask.
 *
 * TODO: This is a polyfill for the missing FontStyle enumeration in the PluginAPI.
 * Remove this once the PluginAPI has a FontStyle enumeration.
 */
var FontStyle = {
    Normal: 0,
    Bold: 1,
    Italic: 2,
    Underline: 4,
};

/**
                                            _____
  __  __________  _____   _________  ____  / __(_)___ _   _   ______ ___________
 / / / / ___/ _ \/ ___/  / ___/ __ \/ __ \/ /_/ / __ `/  | | / / __ `/ ___/ ___/
/ /_/ (__  )  __/ /     / /__/ /_/ / / / / __/ / /_/ /   | |/ / /_/ / /  (__  )
\__,_/____/\___/_/      \___/\____/_/ /_/_/ /_/\__, /    |___/\__,_/_/  /____/
                                              /____/
*/

/**
 * When using JI ratios attached to noteheads as fingerings,
 * this determines whether the period after the ratio is required.
 *
 * If you wish to use fingerings normally (i.e. to denote fingerings)
 * you should leave this as `true`.
 *
 * If you don't want to enter a period after every JI ratio, and you
 * don't mind having fingerings rendered as JI ratios, you can set this
 * to false.
 */
var REQUIRE_PERIOD_AFTER_FINGERING_RATIO = true;

/*
Sets the maximum interval (in cents) of notes that will be
considered enharmonically equivalent.

If your tuning system is extremely huge and has very small
intervals, you may need to set this to a smaller value so
that notes do not get incorrectly classified as enharmonic
equivalents.

Don't set this too low, it may cause floating point errors to
make enharmonically equivalent show up as not equivalent.

Don't set this too high, it may cause notes that should not be
considered enharmonically equivalent to show up as equivalent.
*/
var ENHARMONIC_EQUIVALENT_THRESHOLD = 0.005;

/*
When in complex/non-octave tunings, certain notes can be very far off from
the original 12edo pitches of the notes. Using cents tuning alone for
large tuning offsets will cause an unpleasant timbre during playback.

Any tuning offsets more than the specified number of semitones will include
PlayEvent adjustments, which will internally change the MIDI note playback
of this note during playback.

However, when PlayEvents are used to offset tuning a note, the playback sounded
when selecting/modifying the note will not include the semitone offset.

The score has to be played in order to hear the correct pitch.

If you rather hear the correct pitch when selecting/modifying the note,
in spite of weird timbres caused by playback, set this number higher
(e.g. 40).

If you rather preserve timbre as much as possible, set this
number to 1.

3 is a good midpoint for preserving selection playback for most
standard tunings.
*/
var PLAY_EVENT_MOD_SEMITONES_THRESHOLD = 12;

/**
 * All symbol/ascii accidentals must be at least this far apart
 * from each other.
 *
 * Some accidentals are very very thin and the default auto-positioning
 * will make them too tight and cluttered to read.
 */
var MIN_ACC_WIDTH = 0.75;

/**
 * Represents additional horizontal space to put between accidentals
 * when auto-positioning them.
 *
 * (Increases the width of the accidental bounding box)
 *
 * The smaller the number, the more tightly packed accidental symbols
 * are when auto-positioning accidentals.
 *
 * Number is in spatium units.
 */
var ACC_SPACE = 0.1;

/**
 * Represents additional horizontal space to put between the notehead
 * and the accidental when auto-positioning accidentals.
 *
 * Number is in spatium units.
 */
var ACC_NOTESPACE = 0.2;

/**
 * Font size of text-based ASCII accidentals. In px.
 *
 * Text-based accidentals are rendered with fingering text.
 *
 * Auto placement of single ASCII symbols/punctuation is
 * optimized for this font size.
 */
var ASCII_ACC_FONT_SIZE = 11;

/**
 * Font size of the fingering text containing the step number of
 * the note.
 */
var STEPS_DISPLAY_FONT_SIZE = 10;

/**
 * Font size of the fingering text containing cents offset of the note.
 */
var CENTS_DISPLAY_FONT_SIZE = 10;

/**
 * By default, whenever an accidental is entered via ascii
 * input, it will clear all prior accidentals attached to the note.
 *
 * This mimics the same behavior as entering accidentals via
 * AccidentalVector method.
 *
 * However, if you want the new accidentals to pile up on top of
 * existing accidentals instead of replacing the old ones, set this
 * to false.
 */
var CLEAR_ACCIDENTALS_AFTER_ASCII_ENTRY = true;

/**
 * If `true`, the non-diatonic up/down operations will keep prior secondary
 * accidentals that were attached to the note.
 *
 * This defaults to `false` as the intention of a non-diatonic up/down is to
 * modify the existing accidentals on the note.
 *
 * It would seem weird to keep some of the old accidentals only because
 * they are 'secondary' accidentals, then have the user manually delete them
 * later.
 *
 * However, in HCJI where comma shifts are notated as secondary accidentals,
 * (which is not recommended), then the user may find this feature handy
 * and set this to `true`.
 */
var KEEP_SECONDARY_ACCIDENTALS_AFTER_TRANSPOSE = false;
/**
 * If `false`, the plugin will delete secondary accidentals after a
 * diatonic transpose is performed. (That is, aux(0))
 *
 * This defaults to `true` to keep in line with the expected behavior
 * that a "diatonic" transpose should only change the nominal and
 * not affect the accidentals.
 */
var KEEP_SECONDARY_ACCIDENTALS_AFTER_DIATONIC = true;
/**
 * If `false`, the plugin will delete secondary accidentals after a
 * enharmonic cycle operation (Shortcut `J`) is performed.
 *
 * This defaults to `true` to keep in line with the expectation that
 * enharmonic notes should have the same pitch. Thus, any secondary
 * accidentals present must remain to keep the pitch consistent.
 */
var KEEP_SECONDARY_ACCIDENTALS_AFTER_ENHARMONIC = true;

/**
 * If true, the plugin will allow `cmd('pitch-up')` and `cmd('pitch-down')` to be
 * sent when the selection doesn't include notes and up/down operations are being sent.
 *
 * Set this to false when the user is editing text elements, so that the user can
 * press up/down to navigate the text without being interrupted.
 */
var fallthroughUpDownCommand = true;

/**
 * In the event that a particular note in the tuningTable is this many
 * cents underneath an equave, it will be assumed that the note's tuning
 * is exactly one equave.
 *
 * This prevents floating point errors from causing the enharmonics of
 * a note to have the wrong octave offset due to floating point errors.
 */
var EPSILON = 1e-8;

/**
 * Contains a lookup of valid characters that can occur after
 * a backslash escape character when declaring Symbol Codes in
 * tuning config via Text Code or ASCII.
 *
 * @type {Object.<string, boolean>}
 */
var VALID_ASCII_ACC_ESC_CHARS = {
    '\\': true,
    '\'': true,
    '/': true
};

/**
 * The default tuning config in case tunings/default.txt is invalid or not found.
 */
var DEFAULT_TUNING_CONFIG = "           \n\
A4: 440                                 \n\
0 200c 300c 500c 700c 800c 1000c 1200c  \n\
bbb bb b (100c) # x #x                  \n\
aux(0)                                  \n\
aux(1)                                  \n\
sec()                                   \n\
'bbb' bbb -300c                         \n\
'bb' bb -200c                           \n\
'b' b -100c                             \n\
'###' #x 300c                           \n\
'#x' #x 300c                            \n\
'x#' #x 300c                            \n\
'##' x 200c                             \n\
'x' x 200c                              \n\
'#' # 100c";

/**
 * If a fingering has this Z index, it signifies that it is a
 * per-note tuning fingering annotation that has already been
 * processed.
 *
 * This currently no purpose other than to set the Z index of
 * the fingering to the non-default value so that it won't be
 * repeatedly attempted to be processed as an ASCII-representation
 * accidental entry, which is computationally intensive.
 */
var PROCESSED_FINGERING_ANNOTATION_Z = 3903;

var STEPS_DISPLAY_FINGERING_Z = 3904;
var CENTS_DISPLAY_FINGERING_Z = 3905;

/**
 * This is the default Z index for fingerings as of MuseScore 3.6.2.
 *
 * If MuseScore changes this, we need to change this as well.
 *
 * The default fingering z index is used to mark that a fingering
 * has not been processed, and that we will need to process it.
 */
var DEFAULT_FINGERING_Z_INDEX = 3900;

/**
 * Cached mapping of tuning config strings to `TuningConfig` objects that the string
 * refers to.
 *
 * This object is dynamically created and populated as tuning configs are loaded.
 *
 * If the `'tuningconfig'` metaTag exists in the score, populate from there as well.
 *
 * The `'tuningconfig'` metaTag can be set by the Save Tuning Cache plugin.
 *
 * @type {TuningConfigLookup}
 */
var tuningConfigCache = {};

var ENABLE_LOGGING = true;

/**
 * Returns the default tuning config to apply when none is specified
 *
 * @returns {TuningConfig}
 */
function generateDefaultTuningConfig() {
    if (tuningConfigCache['!default!'] != null) {
        return tuningConfigCache['!default!'];
    }

    fileIO.source = pluginHomePath + "tunings/default.txt";
    var defaultTxt = fileIO.read();
    /** @type {TuningConfig} */
    var tuningConfig;
    if (defaultTxt.length == 0) {
        log("default.txt not found, generating default tuning config...");
        tuningConfig = parseTuningConfig(DEFAULT_TUNING_CONFIG, true, true);
    } else {
        log('Generated default tuning config from default.txt');
        tuningConfig = parseTuningConfig(defaultTxt, true, true);
        if (tuningConfig == null) {
            console.error("ERROR: default.txt is invalid. Please fix your tuning config. Generating default tuning config...");
            tuningConfig = parseTuningConfig(DEFAULT_TUNING_CONFIG, true, true);
        }
    }

    // log('Default tuning config freq: ' + tuningConfig.tuningFreq + ', midi: ' + tuningConfig.tuningNote +
    //     ', nominal: ' + tuningConfig.tuningNominal);

    tuningConfigCache['!default!'] = tuningConfig;
    return tuningConfig;
}

/**
 * Logs debug message to opened log file (MS4) & console (MS3).
 *
 * Make sure {@link openLog} is called before calling this, and
 * {@link closeLog} is called after to flush logs.
 *
 * @param {string} msg
 */
function log(msg) {
    if (ENABLE_LOGGING) {
        logn(msg);
        console.log(msg);
    }
}

/**
 * Executes before any shortcut/operation is handled
 * Call this after {@link init}
 */
function preAction() {
    openLog(pluginHomePath + "xen tuner.log");
}

/**
 * Executes after any shortcut/operation is handled
 */
function postAction() {
    closeLog();
}

/**
 *
 * @param {*} MSAccidental Accidental enum from MuseScore plugin API.
 * @param {*} MSNoteType NoteType enum from MuseScore plugin API.
 */
function init(MSAccidental, MSNoteType, MSSymId, MSElement, MSFileIO, MSCurScore, _isMS4) {
    Lookup = ImportLookup();
    // log(JSON.stringify(Lookup));
    Accidental = MSAccidental;
    SymId = MSSymId;
    NoteType = MSNoteType;
    Element = MSElement;
    fileIO = MSFileIO;
    _curScore = MSCurScore;
    isMS4 = _isMS4;

    // set to absolute path
    pluginHomePath = Qt.resolvedUrl("../").replace("file:///", "");
    if (pluginHomePath.match(/^\w:/g) == null) {
        // if no drive letter, prefix a slash (*nix systems)
        pluginHomePath = "/" + pluginHomePath;
    }
    openLog(pluginHomePath + "xen tuner.log");
    log("Home path: " + pluginHomePath);
    log("Initialized! Enharmonic eqv: " + ENHARMONIC_EQUIVALENT_THRESHOLD + " cents");
    closeLog();
}

/**
 * Modulo function that always returns a positive number.
 *
 * @param {number} x
 * @param {number} y
 */
function mod(x, y) {
    return ((x % y) + y) % y;
}

/**
 * Check if two arrays are equal.
 */
function arraysEqual(a, b) {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (a.length !== b.length) return false;

    for (var i = 0; i < a.length; ++i) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

/**
 * Check if two notes are to be considered enharmonically equivalent
 * based on cents.
 *
 * @param {number} cents1
 * @param {number} cents2
 * @param {number} equaveSize Size of equave in cents.
 * @returns
 */
function isEnharmonicallyEquivalent(cents1, cents2, equaveSize) {
    return (Math.abs(cents1 - cents2) < ENHARMONIC_EQUIVALENT_THRESHOLD) ||
        (equaveSize - Math.abs(cents1 - cents2) < ENHARMONIC_EQUIVALENT_THRESHOLD);
}

/**
 * Convert user-input {@link SymbolCode} or Text Code ({@link Lookup.TEXT_TO_CODE}) into SymbolCode ID.
 *
 * This function only reads SMuFL symbol {@link SymbolCode}s or Text Codes.
 *
 * In v0.2, an update was made such that SymbolCodes can now be ASCII as well.
 *
 * The full parsing implementation of symbols is in {@link parseSymbolsDeclaration}.
 *
 * @param {string} codeOrText
 * @returns {SymbolCode?} {@link SymbolCode} or null if invalid.
 */
function readSymbolCode(codeOrText) {
    var codeOrText = codeOrText.trim();
    var code = Lookup.TEXT_TO_CODE[codeOrText];
    if (!code)
        code = parseInt(codeOrText);

    if (isNaN(code) || code >= Lookup.CODE_TO_LABELS.length) {
        return null;
    }
    return code;
}

/**
 * Gets the tick of a MuseScore note object.
 *
 * Can be used on notes & grace notes.
 *
 * @param {PluginAPINote} note
 * @returns {number} tick time-position of note.
 */
function getTick(note) {
    console.assert(note !== undefined && note !== null, "getTick called on non existent note");
    if (note.parent.parent.tick !== undefined)
        return note.parent.parent.tick;
    else
        return note.parent.parent.parent.tick;
}

/**
 * If note is a grace note, return the Chord it belongs to.
 *
 * @param {PluginAPINote} note `PluginAPI::Note`
 * @returns {PluginAPIChord?} Chord element containing the grace note, or null
 */
function findGraceChord(note) {
    var graceChord = null;
    var noteType = note.noteType;
    if (noteType == NoteType.ACCIACCATURA || noteType == NoteType.APPOGGIATURA ||
        noteType == NoteType.GRACE4 || noteType == NoteType.GRACE16 ||
        noteType == NoteType.GRACE32) {
        graceChord = note.parent;
    }

    return graceChord;
}

/*
  _          __                       _           _
 / |_       [  |  _                  (_)         (_)
`| |-' .--.  | | / ] .---.  _ .--.   __   ____   __   _ .--.   .--./)
 | | / .'`\ \| '' < / /__\\[ `.-. | [  | [_   ] [  | [ `.-. | / /'`\;
 | |,| \__. || |`\ \| \__., | | | |  | |  .' /_  | |  | | | | \ \._//
 \__/_'.__.'[__|  \_]'.__.'[___||__][___][_____][___][___||__].',__`
 .' _ '.                                                     ( ( __))
 | (_) '___
 .`___'/ _/
| (___)  \_                      _
`._____.\__|                    (_)
 _ .--.   ,--.   _ .--.  .--.   __   _ .--.   .--./)
[ '/'`\ \`'_\ : [ `/'`\]( (`\] [  | [ `.-. | / /'`\;
 | \__/ |// | |, | |     `'.'.  | |  | | | | \ \._//
 | ;.__/ \'-;__/[___]   [\__) )[___][___||__].',__`
[__|                                        ( ( __))
*/


/**
 * Reads the {@link PluginAPINote} and tokenizes it into a {@link MSNote}.
 *
 * @param {PluginAPINote} note `PluginAPI::Note`
 * @returns {MSNote}
 */
function tokenizeNote(note) {
    // 69 = MIDI A4
    var octavesFromA4 = Math.floor((note.pitch - 69) / 12);
    var nominals = Lookup.TPC_TO_NOMINAL[note.tpc][0];
    octavesFromA4 += Lookup.TPC_TO_NOMINAL[note.tpc][1];

    // log('note bbox: ' + JSON.stringify(note.bbox) +
    //     ', pagePos: ' + JSON.stringify(note.pagePos));

    var hasAcc = false;

    /** @type {AccidentalSymbols} */
    var accidentals = {};

    /** @type {PluginAPIElement[]} */
    var fingerings = [];

    // Removed. This plugin no longer attempts to deal with musescore's accidentals.
    //
    // This plugin relies on SMuFL symbols attached from symbols in the "Symbols"
    // category of the Master Palette only.
    //
    // if (note.accidental) {
    //     // If note has a Full/Half supported accidental,
    //     var symCode = Lookup.LABELS_TO_CODE[note.accidental.toString()];
    //     accidentals[symCode] = 1;
    // }

    for (var i = 0; i < note.elements.length; i++) {
        // If note has a Full/Half supported accidental,

        var elem = note.elements[i];

        if (elem.name == 'Fingering') {
            // Found fingering.

            if (elem.z >= 1000 && elem.z <= 2000) {
                // This is an ASCII accidental symbol.
                // remember to prepend "'" to signify that it is an
                // ASCII SymbolCode
                var asciiSymCode = "'" + removeFormattingCode(elem.text);
                if (accidentals[asciiSymCode])
                    accidentals[asciiSymCode] += 1;
                else
                    accidentals[asciiSymCode] = 1;

                hasAcc = true;
            } else {
                // This is some other fingering annotation
                // or an unprocessed accidental vector/ascii input fingering.
                fingerings.push(elem);
            }
        } else if (elem.symbol) {
            // Check if it is an accidental symbol.
            // Don't worry about registering accidentals not in the tuning config.
            // That will be handled later.

            var acc = Lookup.LABELS_TO_CODE[elem.symbol.toString()];

            if (acc) {
                if (accidentals[acc])
                    accidentals[acc] += 1;
                else
                    accidentals[acc] = 1;

                hasAcc = true;
            }
        }
    }

    /** @type {MSNote} */
    var msNote = { // MSNote
        midiNote: note.pitch,
        tpc: note.tpc,
        nominalsFromA4: nominals + (octavesFromA4 * 7),
        accidentals: hasAcc ? accidentals : null,
        tick: getTick(note),
        line: note.line,
        internalNote: note,
        fingerings: fingerings,
    };

    return msNote;
}

/**
 * Filters accidentals to remove symbols that aren't used by the tuning config.
 *
 * **WARNING:** If the resulting accidental is empty, returns `null`.
 * In some {@link AccidentalHash} use cases, '' is required instead of null.
 * Make sure to check what is required.
 *
 * @param {AccidentalHash|SymbolCode[]|AccidentalSymbols} accHashOrSymbols Accidentals to remove unused symbols from.
 * @param {TuningConfig} tuningConfig
 * @returns {(AccidentalHash|SymbolCode[]|AccidentalSymbols)?}
 *  Returns an {@link AccidentalHash}, {@link SymbolCode}[], or {@link AccidentalSymbols}
 *  depending on what was passed in.
 *
 *  Returns `null` if there are no symbols left after filtering.
 */
function removeUnusedSymbols(accHashOrSymbols, tuningConfig) {
    if (!accHashOrSymbols) return null;
    if (typeof (accHashOrSymbols) == 'string') {
        // Accidental Hash
        var accHashWords = accHashOrSymbols.split(' ');
        var newAccHashWords = [];

        for (var i = 0; i < accHashWords.length; i += 2) {
            var symCode = accHashWords[i];

            if (tuningConfig.usedSymbols[symCode] || tuningConfig.usedSecondarySymbols[symCode]) {
                // If symbol is used by tuning config, add to hash.
                newAccHashWords.push(symCode); // add the sym code
                newAccHashWords.push(accHashWords[i + 1]);// add the num of symbols
            }
        }

        if (newAccHashWords.length == 0) return null;

        return newAccHashWords.join(' ');
    } else if (Array.isArray(accHashOrSymbols)) {
        // SymbolCode[]
        var newSymbols = [];
        accHashOrSymbols.forEach(function (symCode) {
            if (tuningConfig.usedSymbols[symCode] || tuningConfig.usedSecondarySymbols[symCode]) {
                newSymbols.push(symCode);
            }
        });

        return newSymbols.length == 0 ? null : newSymbols;
    } else {
        // AccidentalSymbols object
        var newAccSymbols = {};
        for (var symCode in accHashOrSymbols) {
            if (tuningConfig.usedSymbols[symCode] || tuningConfig.usedSecondarySymbols[symCode]) {
                newAccSymbols[symCode] = accHashOrSymbols[symCode];
            }
        }

        if (Object.keys(newAccSymbols).length == 0) return null;

        return newAccSymbols;
    }
}

/**
 * Hashes the {@link AccidentalSymbols} attached to a note.
 *
 * The result is appended to the nominal of a note to construct a {@link XenNote}.
 *
 * You can also specify a list of unsorted {@link SymbolCode}s that are present.
 * (useful for hashing accidentals from user-input).
 *
 * Accidentals hash format:
 *
 * ```txt
 * 3 1 5 2 // this means SymCode 3 appears once, and SymCode 5 appears twice.
 * 'asdf 1 // this means the ASCII accidental 'asdf' appears once.
 * 7 2 '7 2 // this means the SymCode 7 appears 2 times, and the
 *          // ASCII symbol '7' appears 2 times.
 * ```
 *
 * To differentiate between ASCII and SMuFL internally, ASCII accidental
 * {@link SymbolCode}s are represented with a prefixed quote (`'`).
 *
 * @param {AccidentalSymbols|SymbolCode[]|null|undefined} accidentals
 *      The AccidentalSymbols object, or a list of `SymbolCode` numbers, or nothing.
 * @returns {string}
 * {@link AccidentalSymbols} hash string.
 * If no accidentals are present, returns an empty string.
 */
function accidentalsHash(accidentals) {

    if (accidentals == undefined) {
        return '';
    }

    if (accidentals == null) {
        // no accidentals
        return '';
    }

    var symCodeSortingFn = function (a, b) {
        // Note that object keys are always strings, so we need to
        // differentiate between ASCII and SMuFL by checking for the
        // prefixed quote.
        if (a.length && a[0] == "'" && b.length && b[0] == "'") {
            // strings are sorted in increasing alphabetical order
            return a.localeCompare(b);
        } else if (!(a.length && a[0] == "'") && !(b.length && b[0] == "'")) {
            // numbers are sorted in increasing numerical order
            return parseInt(a) - parseInt(b);
        } else if ((a.length && a[0] == "'") && !(b.length && b[0] == "'")) {
            // strings always after numbers
            return 1;
        } else {
            // numbers always before strings
            return -1;
        }
    };

    if (accidentals.length != undefined) {
        // `accidentals` param is a list of individual symbol codes

        if (accidentals.length == 0) {
            log('WARN: accidentalsHash called with 0 SymbolCodes in array');
            return '';
        }

        // sort and count number of occurences.
        // use a copy of the array so we don't modify the original.
        accidentals = accidentals.slice();
        accidentals.sort(symCodeSortingFn);

        var occurences = 0;
        var prevSymCode = -1;
        var symCodeNums = [];

        accidentals.forEach(function (symCode) {
            if (prevSymCode == -1) {
                prevSymCode = symCode;
                occurences++;
                return;
            }

            if (symCode != prevSymCode) {
                symCodeNums.push(prevSymCode);
                symCodeNums.push(occurences);
                occurences = 0;
            }

            occurences++;
            prevSymCode = symCode;
        });

        symCodeNums.push(prevSymCode);
        symCodeNums.push(occurences);

        return symCodeNums.join(' ');
    }

    // otherwise, `accidentals` param is an `AccidentalSymbols` object.

    var symCodeNums = [];

    Object.keys(accidentals)
        .sort(symCodeSortingFn)
        .forEach(function (symCode) {
            symCodeNums.push(symCode);
            symCodeNums.push(accidentals[symCode]);
        });

    return symCodeNums.join(' ');
}

/**
 * Adds accidentals from two different collections together.
 *
 * Returns a new {@link AccidentalSymbols} object.
 *
 * @param {AccidentalSymbols} x
 * @param {AccidentalSymbols | SymbolCode[]} y
 * @returns {AccidentalSymbols}
 */
function addAccSym(x, y) {
    if (!x)
        return y;
    if (!y)
        return x;

    var ret = {};

    for (var symCode in x) {
        ret[symCode] = x[symCode];
    }

    if (Array.isArray(y)) {
        // y is SymbolCode[]
        y.forEach(function (symCode) {
            if (ret[symCode] == undefined) {
                ret[symCode] = 1;
            } else {
                ret[symCode]++;
            }
        });
    } else {
        // y is AccidentalSymbols
        for (var symCode in y) {
            if (ret[symCode] == undefined) {
                ret[symCode] = y[symCode];
            } else {
                ret[symCode] += y[symCode];
            }
        }
    }

    return ret;
}

/**
 * Subtract x - y.
 *
 * Removes as many accidental symbols there are in Y from X, and returns
 * a new object.
 *
 * If X does not have enough symbols & not possible to subtract because the
 * number of symbols will go into the negative, returns `null`.
 *
 * @param {AccidentalSymbols} x The acc syms to subtract from
 * @param {AccidentalSymbols|SymbolCode[]} y
 *  The symbols to subtract. Can be specified either as {@link AccidentalSymbols}
 *  or {@link SymbolCode}[] array.
 * @returns {AccidentalSymbols?} The result of x - y, or `null` if not possible.
 */
function subtractAccSym(x, y) {
    // log('subtractAccSym\n' + JSON.stringify(x) + ' - ' + JSON.stringify(y));
    if (!x)
        return null;
    if (!y)
        return x;

    var ret = {};

    for (var sym in x) {
        // shallow copy x into ret.
        ret[sym] = x[sym];
    }

    if (y.length != undefined) {
        // y is SymbolCode[]
        for (var i = 0; i < y.length; i++) {
            var sym = y[i];
            // remove sym from ret.
            if (ret[sym] == undefined) {
                // X does not have any sym to subtract.
                return null;
            }

            ret[sym] -= 1;
            if (ret[sym] < 0) {
                return null;
            } else if (ret[sym] == 0) {
                delete ret[sym];
            }
        }
    } else {
        // y is AccidentalSymbols
        for (var sym in y) {
            if (ret[sym] == undefined) {
                // X does not have any sym to subtract.
                return null;
            }
            ret[sym] -= y[sym];
            if (ret[sym] < 0) {
                return null;
            } else if (ret[sym] == 0) {
                delete ret[sym];
            }
        }
    }

    return ret;
}

/**
 * Convert a {@link SymbolCode}[] array into an {@link AccidentalSymbols} object.
 *
 * @param {SymbolCode[]} symList Array of {@link SymbolCode}s
 * @returns {AccidentalSymbols?}
 * An {@link AccidentalSymbols} object, or `null` if the array is empty.
 */
function accidentalSymbolsFromList(symList) {
    if (symList.length == 0) return null;

    var accSymbols = {};

    symList.forEach(function (symCode) {
        if (accSymbols[symCode] == undefined) {
            accSymbols[symCode] = 0;
        }
        accSymbols[symCode]++;
    });

    return accSymbols;
}

/**
 * Convert an {@link AccidentalHash} string to an {@link AccidentalSymbols} object.
 *
 * @param {AccidentalHash?} accHash Accidental Hash string
 * @returns {AccidentalSymbols?}
 * An {@link AccidentalSymbols} object, or `null` if the string is empty, or
 * null value was passed.
 */
function accidentalSymbolsFromHash(accHash) {
    if (!accHash) return null;
    var accHashWords = accHash.split(' ');
    var accSymbols = {};

    for (var i = 0; i < accHashWords.length; i += 2) {
        accSymbols[accHashWords[i]] = parseInt(accHashWords[i + 1]);
    }

    return accSymbols;
}

/**
 * Check if two accidental symbols objects are equal. Returns false if either is null/undefined.
 *
 * @param {AccidentalSymbols} a
 * @param {AccidentalSymbols} b
 * @returns {boolean}
 */
function isAccidentalSymbolsEqual(a, b) {
    // log('isAccidentalSymbolsEqual(' + JSON.stringify(a) + ', ' + JSON.stringify(b) + ')');

    if (!a || !b) return false;

    if (a === b) return true;

    var aKeys = Object.keys(a);
    var bKeys = Object.keys(b);

    if (aKeys.length !== bKeys.length) return false;

    for (var i = 0; i < aKeys.length; i++) {
        var key = aKeys[i];
        if (a[key] !== b[key]) return false;
    }

    return true;
}

/**
 * Calculate a {@link XenNote.hash} string from its nominal and accidentals.
 *
 * @param {number} nominal
 * @param {AccidentalSymbols|SymbolCode[]|null|undefined} accidentals
 */
function createXenHash(nominal, accidentals) {
    return (nominal + ' ' + accidentalsHash(accidentals)).trim();
}

/**
 * Saves the current `tuningConfigCache` as a metaTag in the current score.
 *
 * This is very slow, run this function very sparsely.
 */
function saveMetaTagCache() {
    var toSave = {};

    Object.keys(tuningConfigCache).forEach(function (tuningConfigStr) {
        // don't save tuning configs with more than 1000 steps. MuseScore will crash.
        if (tuningConfigCache[tuningConfigStr].stepsList.length < 1000) {
            toSave[tuningConfigStr] = tuningConfigCache[tuningConfigStr];
        }
    });
    _curScore.setMetaTag('tuningconfigs', JSON.stringify(toSave));
}

/**
 * Clears runtime & metaTag tuning config caches from the current score.
 *
 * Be sure to run this time to time, especially if you're experimenting
 * with many tuning configs in one score. This will force the plugin to repopulate
 *
 * (Tell the user to run this if they are creating/experimenting with different tuning configs,
 * then deleting them, and are currently not using most of them)
 *
 * Otherwise, the cache text will contain too many tuning configs and it will become
 * pointless to use the cache as the JSON parsing will take longer than just generating
 * the tuning config.
 */
function clearTuningConfigCaches() {
    tuningConfigCache = {};
    _curScore.setMetaTag('tuningconfigs', '');
}

/**
 * Parses a string that declares {@link SymbolCode}s in a Tuning Config.
 *
 * E.g. `'\\\'+.'.'$'.#` represents 3 symbols. Left to right, they are
 *
 * 1. ASCII symbol with 4 characters `\'+.` (backslash, quote, plus, period).\
 *    \\ escapes into backslash\
 *    \\' escapes into quote.
 * 2. ASCII symbol with 1 character `$` (dollar sign)
 * 3. Standard-issue SMuFL sharp symbol.
 *
 * Backslash escapes must be used both inside and outside quotes.
 *
 * The valid escapes are:
 *
 * - `\\`  - backslash
 * - `\'` - quote
 * - `\/` - forward slash.
 *
 * 'abc'# is invalid syntax. A dot must separate distinct symbols,
 * and ASCII symbols are distinct from SMuFL symbols.
 *
 * The plugin will not check for this syntax error and will instead
 * parse it as a single ASCII symbol: 'abc#'.
 *
 * If failed to parse, logs error messages to the console.
 *
 * @param {string} str Text that represents a symbol.
 * @param {boolean?} suppressError If true, will not log error messages to the console.
 * @returns {SymbolCode[]?} Array of {@link SymbolCode}s, or `null` if the string is invalid.
 */
function parseSymbolsDeclaration(str, suppressError) {
    var symCodes = [];
    var isQuoted = false; // true if pending a closing quote.
    var isEscape = false; // true if pending an escape sequence.

    // stores current single symbol being processed.
    // the period seperates each symbol.
    var currStr = '';
    var currIsQuoted = false;

    for (var i = 0; i < str.length; i++) {
        var c = str[i];

        if (isEscape) {
            if (!VALID_ASCII_ACC_ESC_CHARS[c]) {
                // invalid escape sequence.
                if (!suppressError)
                    console.error('TUNING CONFIG ERROR: Invalid escape sequence: \\' + c);
                return null;
            }
            isEscape = false;
            currStr += c; // add character verbatim.
        } else if (c == '\\') {
            isEscape = true;
        } else if (c == '\'') {
            isQuoted = !isQuoted;
            currIsQuoted = true;
        } else if (c == '.') {
            if (isQuoted) {
                // still inside quotes, add period verbatim.
                currStr += c;
                continue;
            }

            // period separates symbols.
            if (currIsQuoted) {
                // Push an ASCII symbol code.
                // Prepend with a quote.
                symCodes.push("'" + currStr);
            } else {
                // Push a SMuFL symbol code.
                var code = readSymbolCode(currStr);

                if (code == null) {
                    if (!suppressError)
                        console.error('TUNING CONFIG ERROR: invalid symbol: ' + currStr);
                    return null;
                }

                symCodes.push(code);
            }

            currStr = '';
            currIsQuoted = false;
        } else {
            // otherwise just add the character.
            currStr += c;
        }
    }

    if (isQuoted) {
        if (!suppressError)
            console.error('TUNING CONFIG ERROR: symbol missing closing quote: ' + str);
        return null;
    }

    if (currStr.length > 0) {
        // last symbol

        // period separates symbols.
        if (currIsQuoted) {
            // Push an ASCII symbol code.
            symCodes.push("'" + currStr);
        } else {
            // Push a SMuFL symbol code.
            var code = readSymbolCode(currStr);

            if (code == null) {
                if (!suppressError)
                    console.error('TUNING CONFIG ERROR: invalid symbol: ' + currStr);
                return null;
            }

            symCodes.push(code);
        }

        return symCodes;
    }

    return null;
}

/**
 * Convert user-input string that denotes a cent/ratio interval value
 * into the number of cents it represents.
 *
 * If the string is invalid, it logs the error message and returns `null`.
 *
 * @param {string} str Parses cents or ratio text into cents offset.
 * @param {boolean?} suppressError If true, will not log error messages to the console.
 * @returns {number?} Cents offset, or null if invalid syntax.
 */
function parseCentsOrRatio(str, suppressError) {
    var str = str.trim();
    var offset = null;
    try {
        if (str.endsWith('c')) {
            // in cents
            offset = parseFloat(eval(str.slice(0, -1)));
        } else {
            var ratio = parseFloat(eval(str));
            if (ratio < 0) {
                offset = -Math.log(-ratio) / Math.log(2) * 1200;
            } else if (ratio == 0) {
                offset = 0;
            } else {
                offset = Math.log(ratio) / Math.log(2) * 1200;
            }
        }
    } catch (e) {
        if (!suppressError) {
            console.error('TUNING CONFIG ERROR parsing cents/ratio: Cannot parse as cents or ratio: ' + str
                + '\nErr: ' + e);
        }
        return null;
    }
    if (!isNaN(offset)) {
        return offset;
    } else {
        if (!suppressError) {
            console.error('TUNING CONFIG ERROR parsing cents/ratio: Invalid accidental tuning offset specified: ' + str);
        }
        return null;
    }
}

/**
 * Splits an accidental degree declaration in the acc chain into
 * symbols string and tuning offset.
 *
 * E.g.: `'(!!!)(Math.pow(3/2,3))'` should return:
 *
 * `['(!!!)', 'Math.pow(3/2,3)']`
 *
 * Parsing method:
 *
 * - If the string ends with a closing bracket, find the matching opening bracket.
 * - Split at the matching opening bracket. The left part is the symbols declaration
 *   and the right part is the tuning offset.
 * - If the entire string is matched as the tuning offset, treat the entire string
 *   as the symbols declaration.
 * - If the matched tuning offset has a syntax error, treat the entire string as
 *   the symbols declaration.
 *
 *
 * @param {string} str
 * String containing accidental symbols definition and optional irregular
 * tuning offset. Whitespace should be trimmed.
 *
 * @returns {[string, number]?}
 * `[symbols, centsOffset]`. Returns null if the syntax is invalid.
 */
function parseSymbolOffsetPair(str) {
    var splitIdx = 0;
    if (str.endsWith(')')) {
        var bracketDepth = 1;
        for (var i = str.length - 2; i >= 0; i--) {
            var c = str[i];
            if (c == ')') {
                bracketDepth++;
            } else if (c == '(') {
                bracketDepth--;
            }
            if (bracketDepth == 0) {
                splitIdx = i;
                break;
            }
        }
    } else {
        return [str, 0];
    }

    var symbols = str.slice(0, splitIdx);
    var offset = str.slice(splitIdx + 1, str.length - 1); // remove surrounding parens

    if (splitIdx == 0) {
        return [str, 0];
    }

    var maybeOffset = parseCentsOrRatio(offset);

    if (maybeOffset == null) {
        symbols = str;
        maybeOffset = 0;
    }

    return [symbols, maybeOffset];
}

/**
 * Convert a space/tabular separated string into an array of strings, removing empty whitespace.
 *
 * @param {string} str Space/tabular separated string
 * @returns {string[]} Array of non-empty strings
 */
function spaceSeparated(str) {
    return str
        .split(' ')
        .map(function (x) { return x.trim() })
        .filter(function(x) { return x.length != 0; });
}

/**
 * Tests if a certain text/tuning file is a tuning config.
 *
 * First it will look up cached TuningConfigs so it won't
 * have to parse the text again.
 *
 * The cache will contain strings (either entire texts or references to .txt files)
 * that generated a TuningConfig, and maps it to TuningConfig objects.
 *
 * If a cached TuningConfig is not found, parses the text/tuning file
 * and creates a TuningConfig object.
 *
 * Example tuning config text:
 *
 * ```txt
 * A4: 440
 * 0 203.91 294.13 498.04 701.96 792.18 996.09 1200
 * bb.bb 7 bb b (113.685) # x 2 x.x
 * \.\ \ (21.506) / /./
 * ```
 *
 * @param {string} text
 *  The system/staff text contents, or a path to a file containing the config text.
 *
 *  The path should be relative to the 'tunings' folder in the plugin home directory.
 *  The '.txt' extension is optional.
 *
 * @param {boolean?} isNotPath
 *  Optional. Specify `true` to read text verbatim instead of trying to read from a file.
 *
 * @param {boolean?} silent
 *  Optional. Specify `true` to suppress cache loading messages.
 *
 * @returns {TuningConfig} The parsed tuning configuration object, or null text was not a tuning config.
 */
function parseTuningConfig(textOrPath, isNotPath, silent) {

    // Check if a tuning config file in the /tunings directory is specified.
    // Use the contents of that file as the tuning config if there's anything
    // in that file.
    var text = '';
    var textOrPath = textOrPath.trim();

    // First, chech the runtime tuning config cache if this tuning already exists.

    if (tuningConfigCache[textOrPath]) {
        if (!silent) {
            log('Using cached tuning config:\n' + textOrPath + '\n' +
                tuningConfigCache[textOrPath].stepsList.length + ' notes/equave, ' + tuningConfigCache[textOrPath].equaveSize + 'c equave');
        }

        return tuningConfigCache[textOrPath];
    }

    // Otherwise, check the metaTag cache.

    if (_curScore) {
        var tuningCacheStr = _curScore.metaTag('tuningconfigs');
        if (tuningCacheStr && tuningCacheStr.length && tuningCacheStr.length > 0) {
            var tuningCache = JSON.parse(tuningCacheStr);
            var maybeCached = tuningCache && tuningCache[textOrPath];
            if (maybeCached) {
                // Cached tuning config found. Use it!
                if (!silent) {
                    log('Using cached tuning config:\n' + textOrPath + '\n' +
                        maybeCached.stepsList.length + ' notes/equave, ' + maybeCached.equaveSize + 'c equave');
                }

                // Update runtime cache with the cached tuning config.

                tuningConfigCache[textOrPath] = maybeCached;

                return maybeCached;
            }
        }
    } else {
        console.error('ERROR: _curScore not defined. Unable to read cache.');
    }

    if (!isNotPath && fileIO) {
        // read from a file

        if (textOrPath.length == 0) {
            // log('not tuning config: empty text');
            return null;
        }

        var filePath = textOrPath;

        if (textOrPath.endsWith('.txt')) {
            filePath = textOrPath.slice(0, textOrPath.length - 4);
        } else if (textOrPath.endsWith('.json')) {
            filePath = textOrPath.slice(0, textOrPath.length - 5);
        }

        // Try read from .json first.

        fileIO.source = pluginHomePath + 'tunings/' + filePath + '.json';

        text = fileIO.read().trim();

        try {
            var jsonTuningConfig = JSON.parse(text);

            if (jsonTuningConfig.nominals) {
                tuningConfigCache[textOrPath] = jsonTuningConfig;
                log('Loaded JSON tuning config from ' + fileIO.source + ':\n');
                return jsonTuningConfig;
            }
        } catch (e) {
        }

        // Otherwise, try read .txt

        fileIO.source = pluginHomePath + 'tunings/' + filePath + '.txt';

        text = fileIO.read().trim();
    }

    if (text.length == 0) {
        // If no file/IO Error, parse the textOrPath as the config itself.
        text = textOrPath;
    } else {
        log('Reading tuning config from ' + fileIO.source);
    }

    // remove comments from tuning config text.
    // comments start with two slashes
    text = text.replace(/^(.*?)\/\/.*$/gm, '$1')
        // remove empty lines after removing comments
        .replace(/^(?:[\t ]*(?:\r?\n|\r))+/gm, '')
        .trim();

    /** @type {TuningConfig} */
    var tuningConfig = { // TuningConfig
        notesTable: {},
        tuningTable: {},
        tuningOverrideTable: {},
        avTable: {},
        avToSymbols: {},
        stepsList: [],
        stepsLookup: {},
        enharmonics: {},
        nominals: [],
        ligatures: [],
        accChains: [],
        auxList: [null], // the 0th entry should be null.
        numNominals: null,
        equaveSize: null,
        tuningNote: null,
        tuningNominal: null,
        relativeTuningNominal: 0,
        tuningFreq: null,
        originalTuningFreq: null,
        // lookup of symbols used in tuning config.
        // anything not included should be ignored.
        usedSymbols: {},
        usedSecondarySymbols: {},
        secondaryAccList: [],
        secondaryAccIndexTable: {},
        secondaryAccTable: {},
        secondaryTunings: {},
        asciiToSmuflConv: {},
        asciiToSmuflConvList: [],
        alwaysExplicitAccidental: false,
        nonBoldTextAccidental: false,
        displayCentsPosition: 'above',
        displayCentsReference: 'nominal',
        displayCentsPrecision: 0,
        displaySteps: null,
        displayStepsPosition: 'below',
        independentSymbolGroups: [],
        symbolGroupLookup: {},
        symbolGroupNaturalizingLookup: [],
        symbolGroupNaturalizingLookupIdx: {},
    };

    var lines = text.split('\n').map(function (x) { return x.trim() });

    // Need at least reference note and nominal declarations.
    if (lines.length < 2)
        return null;

    // PARSE TUNING NOTE.
    //
    //

    var referenceTuning = lines[0].split(':').map(function (x) { return x.trim() });

    if (referenceTuning.length != 2) {
        // log(lines[0] + ' is not a reference tuning');
        return null;
    }

    var referenceLetter = referenceTuning[0][0].toLowerCase();
    var referenceOctave = parseInt(referenceTuning[0].slice(1));

    var nominalsFromA4 = (referenceOctave - 4) * 7;
    var lettersNominal = Lookup.LETTERS_TO_NOMINAL[referenceLetter];

    if (lettersNominal == undefined) {
        // log("Invalid reference note specified: " + referenceLetter);
        return null;
    }

    nominalsFromA4 += lettersNominal;

    // Since the written octave resets at C, but we need to convert it
    // such that the octave resets at A4, we need to subtract one octave
    // if the nominal is within C to G.
    if (lettersNominal >= 2)
        nominalsFromA4 -= 7;

    tuningConfig.tuningNominal = nominalsFromA4;
    tuningConfig.tuningNote = Lookup.LETTERS_TO_SEMITONES[referenceLetter] + (referenceOctave - 4) * 12 + 69;
    tuningConfig.tuningFreq = parseFloat(eval(referenceTuning[1])); // specified in Hz.
    tuningConfig.originalTuningFreq = tuningConfig.tuningFreq;

    if (isNaN(tuningConfig.tuningFreq)) {
        return null;
    }

    // PARSE NOMINALS
    //
    //

    var hasInvalid = false;
    var invalidNominals = [];
    var nominals = spaceSeparated(lines[1]).map(function (x) {
            var f = parseCentsOrRatio(x);
            if (f == null) {
                hasInvalid = true;
                invalidNominals.push(x);
            }
            return f;
        });

    if (hasInvalid) {
        log('Invalid nominal tunings: ' + invalidNominals.join(', '));
        return null;
    }

    tuningConfig.nominals = nominals.slice(0, nominals.length - 1);
    tuningConfig.equaveSize = nominals[nominals.length - 1];
    if (tuningConfig.equaveSize == 0) {
        console.error('TUNING CONFIG ERROR: Equave size must be non-zero!');
        return null;
    }
    tuningConfig.numNominals = tuningConfig.nominals.length;

    // PARSE ACCIDENTAL CHAINS
    //
    //

    for (var i = 2; i < lines.length; i++) {
        var line = lines[i].trim();

        // each new line is a new accidental chain.

        // terminate when 'lig(x,y,...)' is found (move on to ligature declarations)
        // terminate when 'aux(x,y,...)' is found (move on to aux stepwise declarations)

        var matches = line.match(/(lig|aux|sec|explicit|nobold|override|displaycents|displaysteps)\([0-9,a-zA-Z\s]*\)/);
        if (matches != null) {
            break;
        }

        var accChainWords = spaceSeparated(line);

        var increment = null;
        var symbolsLookup = {}; // contains all unique symbols used.
        var degreesSymbols = [];
        var tunings = [];
        var offsets = [];
        var centralIdx = null;

        for (var j = 0; j < accChainWords.length; j++) {
            var word = accChainWords[j];

            var matchIncrement = word.match(/^\((.+)\)$/);

            if (matchIncrement != null) {
                var maybeIncrement = parseCentsOrRatio(matchIncrement[1]);

                if (maybeIncrement == null) {
                    console.warn('TUNING CONFIG: ' + (i + 1) + ': invalid accidental chain increment: ' + matchIncrement[1]
                        + '\nAttempting to parse as symbols instead');
                } else if (increment != null) {
                    console.error('TUNING CONFIG ERROR: Multiple acc chain increments specified in: ' + line);
                } else {
                    increment = maybeIncrement;
                    degreesSymbols.push(null);
                    offsets.push(0);
                    centralIdx = j;
                    continue;
                }
            }

            // degree syntax: sym1.sym2.symN(<optional additional cents offset>)
            // e.g.: +.7./(-23.5) declares a degree containing:
            // SHARP_SLASH, FLAT2, ARROW_UP symbols
            // with additional offset -23.5 cents

            var symbols_offset = parseSymbolOffsetPair(word);

            var symbolCodes = parseSymbolsDeclaration(symbols_offset[0]);

            if (symbolCodes == null) {
                console.error('TUNING CONFIG ERROR: ' + (i + 1) + ': Could not parse accidental decl: ' + word);
                return null;
            }

            var offset = symbols_offset[1];

            symbolCodes.forEach(function (x) {
                symbolsLookup[x] = true;
                tuningConfig.usedSymbols[x] = true;
            });

            degreesSymbols.push(symbolCodes);
            offsets.push(offset);
        }

        if (increment == null || centralIdx == null) {
            console.error('TUNING CONFIG ERROR: ' + (i + 1) + ': Invalid accidental chain: "' + accChainWords.join(' ') + '" in ' + line);
            return null;
        }

        for (var j = 0; j < offsets.length; j++) {
            if (j == centralIdx)
                tunings.push(0);
            else
                tunings.push((j - centralIdx) * increment + offsets[j]);
        }

        // Add new acc chain
        tuningConfig.accChains.push({ // AccidentalChain
            degreesSymbols: degreesSymbols,
            symbolsUsed: Object.keys(symbolsLookup),
            tunings: tunings,
            centralIdx: centralIdx,
        });
    }

    // PARSE OTHER CONFIGS
    // (can be declared in any order)
    //
    // lig(x,y,...)
    // aux(x,y,...)
    // sec()
    //
    //

    /**
     * Stores current parsing state.
     *
     * First value is a string that signifies what info the parser is
     * parsing. Empty string `''` denotes that the parser is awaiting
     * EOF or a new config declaration.
     *
     * Only `'lig'` and `'sec'` are valid states which have additional
     * data.
     *
     * If state is `'lig'`, the second value is a {@link Ligature} object.
     *
     * @type {[''|'lig'|'sec'|'override'|'independent', Ligature?]}
     */
    var state = [];

    /**
     * After EOF or at the start of each new declaration, add the previously
     * parsed declaration to the tuning config.
     *
     * Call this before modifying the `state`.
     */
    var commitParsedSection = function () {
        if (state.length == 0)
            return;

        if (state[0] == 'lig') {
            // Push the ligature to the tuning config.
            tuningConfig.ligatures.push(state[1]);
        }

        // The other parsing states commit info as they go,
        // so there's nothing else to do here.
    }

    for (; i < lines.length; i++) {
        var line = lines[i].trim();
        var ligMa = line.match(/^lig\(([0-9,\s]+)\)([?!]*)/);
        var auxMa = line.match(/^aux\(([0-9,\s]+)\)/);
        var displayCentsMa = line.match(/^displaycents\(([0-9,\sa-zA-Z]+)\)/);
        var displayStepsMa = line.match(/^displaysteps\(([0-9,\sa-zA-Z]+)\)/);

        // First we check for declaration lines lig, aux, or sec.
        // Is so, we process the declaration and possibly update the parser state.

        if (auxMa != null) {
            hasInvalid = false;
            var nomAndChainIndices = auxMa[1]
                .split(',')
                .map(function (x) {
                    var auxIdx = parseInt(x);
                    // recall:
                    // 0: change nominal
                    // 1 to N: change accidental chain (1-based index)
                    if (isNaN(auxIdx) || auxIdx < 0 || auxIdx > tuningConfig.accChains.length) {
                        console.error('TUNING CONFIG ERROR: ' + (auxIdx + 1) + ': Invalid accidental chain index: ' + x
                            + '\nin aux declaration: ' + line);
                        hasInvalid = true;
                    }
                    return auxIdx;
                });
            if (hasInvalid)
                return null;

            var constantConstrictions = []; // ConstantConstrictions list

            for (var accChainIdx = 0; accChainIdx < tuningConfig.accChains.length; accChainIdx++) {
                // invert the accidental chains - only accidental chains not specified by the aux declaration
                // should maintain at the same degree.

                // accChainIdx is 0-based, +1 to make it 1-based.
                if (nomAndChainIndices.indexOf(accChainIdx + 1) != -1)
                    continue;

                constantConstrictions.push(accChainIdx + 1);
            }

            // aux(0) Represents that the nominal should change.
            // if the user doesn't specify 0, then the nominal should not change.

            if (nomAndChainIndices.indexOf(0) == -1)
                constantConstrictions.push(0);

            tuningConfig.auxList.push(constantConstrictions);

            commitParsedSection();
            state = []; // aux has no section. await next section.
            continue;
        } else if (ligMa != null) {
            var regarding = ligMa[1]
                .split(',')
                .map(function (x) {
                    var n = parseInt(x);
                    if (isNaN(n) || n < 1) hasInvalid = true;
                    return n - 1;
                });

            if (hasInvalid) {
                console.error('TUNING CONFIG ERROR: ' + (i + 1) + ': Invalid ligature declaration: ' + line);
                return null;
            }

            var isWeak = false;
            var isImportant = false;

            if (ligMa[2]) {
                if (ligMa[2].indexOf('!') != -1)
                    isImportant = true;
                if (ligMa[2].indexOf('?') != -1)
                    isWeak = true;
            }

            commitParsedSection();
            state = [
                'lig',
                {
                    regarding: regarding,
                    isWeak: isWeak,
                    isImportant: isImportant,
                    ligAvToSymbols: {},
                }
            ];
            continue;
        } else if (line == 'sec()') {
            commitParsedSection();
            state = ['sec'];
            continue;
        } else if (line == 'nobold()') {
            commitParsedSection();
            tuningConfig.nonBoldTextAccidental = true;
            state = [];
            continue;
        } else if (line == 'explicit()') {
            commitParsedSection();
            tuningConfig.alwaysExplicitAccidental = true;
            state = [];
            continue;
        } else if (line == 'override()') {
            commitParsedSection();
            state = ['override'];
            continue;
        } else if (displayStepsMa != null) {
            commitParsedSection();
            state = [];
            var csv = displayStepsMa[1].split(',').map(function (x) { return x.trim() });
            if (csv.length != 2) {
                console.error('TUNING CONFIG ERROR: ' + (i + 1) + ': Invalid displaysteps declaration. Expected 2 arguments: ' + line);
                return null;
            }

            var steps = parseInt(csv[0]);
            var position = csv[1];

            if (isNaN(steps) || steps < 2) {
                console.error('TUNING CONFIG ERROR: ' + (i + 1) +
                    ': Invalid displaysteps declaration, invalid edo/neji steps: ' + line);
                return null;
            }
            if (position != 'above' && position != 'below') {
                console.error('TUNING CONFIG ERROR: ' + (i + 1) +
                    ': Invalid displaysteps declaration, display must be above or below: ' + line);
                return null;
            }

            tuningConfig.displaySteps = steps;
            tuningConfig.displayStepsPosition = position;
            continue;
        } else if (displayCentsMa != null) {
            commitParsedSection();
            state = [];
            var csv = displayCentsMa[1].split(',').map(function (x) { return x.trim() });
            if (csv.length != 3) {
                console.error('TUNING CONFIG ERROR: ' + (i + 1) + ': Invalid displaycents declaration. Expected 3 arguments: ' + line);
                return null;
            }

            var centType = csv[0];
            var precision = parseInt(csv[1]);
            var position = csv[2];

            if (centType != 'nominal' && centType != 'absolute' && centType != 'semitone') {
                console.error('TUNING CONFIG ERROR: ' + (i + 1) +
                    ': Invalid displaycents declaration. Cent type must be nominal/absolute/semitone: ' + line);
                return null;
            }
            if (isNaN(precision) || precision < 0 || precision > 20) {
                console.error('TUNING CONFIG ERROR: ' + (i + 1) +
                    ': Invalid displaycents declaration, invalid precision specified: ' + line);
                return null;
            }
            if (position != 'above' && position != 'below') {
                console.error('TUNING CONFIG ERROR: ' + (i + 1) +
                    ': Invalid displaycents declaration, display must be above or below: ' + line);
                return null;
            }

            tuningConfig.displayCentsReference = centType;
            tuningConfig.displayCentsPrecision = precision;
            tuningConfig.displayCentsPosition = position;
            continue;
        } else if (line == 'independent()') {
            commitParsedSection();
            state = ['independent'];
            continue;
        }

        // If we are here, then there are no section/setting declarations

        if (state.length == 0) {
            console.error('TUNING CONFIG ERROR: ' + (i + 1)
                + ': Expected aux(...), lig(...), sec(), explicit(), or nobold(). Instead, got '
                + line);
            return null;
        }

        if (state[0] == 'lig') {
            // parse ligature entry.
            var words = spaceSeparated(line);
            var ligAv = words.slice(0, words.length - 1).map(function (x) { return parseInt(x) });

            var ligatureSymbols = parseSymbolsDeclaration(words[words.length - 1]);

            if (ligatureSymbols == null) {
                return null;
            }

            ligatureSymbols.forEach(function (x) {
                tuningConfig.usedSymbols[x] = true;
            });

            state[1].ligAvToSymbols[ligAv] = ligatureSymbols;
        } else if (state[0] == 'sec') {
            // parse secondary accidental declaration.
            // directly modifies the tuning config.

            var words = spaceSeparated(line);
            var numNomsMin1 = tuningConfig.numNominals - 1;
            var firstWordSymCodes = parseSymbolsDeclaration(words[0]);

            if (firstWordSymCodes == null) {
                console.error('TUNING CONFIG ERROR: ' + (i + 1) + ': Invalid secondary symbol declaration: ' + line
                    + '\n"' + words[0] + '" is not a valid symbol code combination.');
                return null;
            }

            var firstWordIsSingleElemTextAcc = firstWordSymCodes.length == 1 && typeof (firstWordSymCodes[0]) == 'string';
            var maybeSecondWordSymbol = parseSymbolsDeclaration(words[1], true);
            var maybeSecondWordCents = parseCentsOrRatio(words[1], true);

            if (words.length == 2 || (words.length == 2 + numNomsMin1 &&
                !(words.length == 3 && firstWordIsSingleElemTextAcc &&
                    (maybeSecondWordSymbol == null && maybeSecondWordCents != null))
            )
                // if there's only 2 nominals, the sec acc decl has 3 words, and the first word is
                // a single-element text accidental,
                // the decl can only be treated as a per-nominal sec declaration with
                // implicit text replacement IF the second word DEFINITELY IS NOT a symbol
                // and COULD BE a cents/ratio.
                // Otherwise it defaults to a nominal-agnostic secondary acc tuning
                // with explicit text replacement with the second word treated as
                // Symbol Codes.
            ) {
                // Declaring a secondary symbol without conversion
                var cents = [];

                for (var wordIdx = 1; wordIdx < words.length; wordIdx++) {
                    var maybeCents = parseCentsOrRatio(words[wordIdx]);
                    if (maybeCents == null) {
                        console.error('TUNING CONFIG ERROR: ' + (i + 1) + ': Invalid secondary symbol declaration: ' + line
                            + '\n"' + words[wordIdx] + '" is not a valid cents or ratio tuning.');
                        if (words.length > 2)
                            log('HELP: Did you specify the correct number of nominals for per-nominal tuning declaration?');
                        return null;
                    }
                    cents.push(maybeCents);
                }

                var accHash = accidentalsHash(firstWordSymCodes);

                tuningConfig.secondaryAccList.push(accHash);
                tuningConfig.secondaryAccIndexTable[accHash] = tuningConfig.secondaryAccList.length - 1;
                tuningConfig.secondaryAccTable[accHash] = firstWordSymCodes;
                tuningConfig.secondaryTunings[accHash] = cents.length == 1 ? cents[0] : cents;

                firstWordSymCodes.forEach(function (c) {
                    tuningConfig.usedSecondarySymbols[c] = true;
                });

                // if the declared SymbolCode is a single-element, pure ASCII symbol,
                // implicitly declare the ASCII-to-SymCode conversion.

                // in these cases, it is obvious that if the user enters the
                // ASCII of the accidental itself, the user will want that exact
                // ASCII to be entered as a symbol.

                if (firstWordIsSingleElemTextAcc) {
                    var asciiFrom = firstWordSymCodes[0].slice(1);
                    tuningConfig.asciiToSmuflConv[asciiFrom] = firstWordSymCodes;
                    tuningConfig.asciiToSmuflConvList.push(asciiFrom);
                }
            } else if (words.length == 3 || words.length == 3 + numNomsMin1) {
                // Declaring a secondary symbol with conversion.
                // Conversion always goes from ASCII

                if (!firstWordIsSingleElemTextAcc) {
                    console.error('TUNING CONFIG ERROR: ' + (i + 1) + ': Convert-from text must be a single-element text symbol.\n'
                        + 'Received a multi-symbol/hybrid accidental instead' + line);
                    return null;
                }

                // The first word must be the ascii to be converted
                var symCodesTo = parseSymbolsDeclaration(words[1]);
                var cents = [];

                if (symCodesTo == null) {
                    console.error('TUNING CONFIG ERROR: ' + (i + 1) + ': Invalid secondary symbol declaration: ' + line
                        + '\n"' + words[1] + '" is not a valid symbol code combination.');
                    return null;
                }

                for (var wordIdx = 2; wordIdx < words.length; wordIdx++) {
                    var maybeCents = parseCentsOrRatio(words[wordIdx]);
                    if (maybeCents == null) {
                        console.error('TUNING CONFIG ERROR: ' + (i + 1) + ': Invalid secondary symbol declaration: ' + line
                            + '\n"' + words[wordIdx] + '" is not a valid cents or ratio tuning.');
                        return null;
                    }
                    cents.push(maybeCents);
                }

                // remove the preceding quote from the ascii SymbolCode
                var asciiFrom = firstWordSymCodes[0].slice(1);
                var accHashTo = accidentalsHash(symCodesTo);
                log('accHashTo:' + accHashTo);

                tuningConfig.secondaryAccList.push(accHashTo);
                tuningConfig.secondaryAccIndexTable[accHashTo] = tuningConfig.secondaryAccList.length - 1;
                tuningConfig.secondaryAccTable[accHashTo] = symCodesTo;
                tuningConfig.secondaryTunings[accHashTo] = cents.length == 1 ? cents[0] : cents;
                log('secondaryTunings: ' + tuningConfig.secondaryTunings[accHashTo])
                tuningConfig.asciiToSmuflConv[asciiFrom] = symCodesTo;
                tuningConfig.asciiToSmuflConvList.push(asciiFrom);

                symCodesTo.forEach(function (c) {
                    tuningConfig.usedSecondarySymbols[c] = true;
                });
            } else {
                console.error('TUNING CONFIG ERROR: ' + (i + 1) +
                    ': Secondary symbol declaration must have 2 or 3 (for nominal-agnostic tunings) or '
                    + (2 + numNomsMin1) + ' or ' + (3 + numNomsMin1)
                    + ' (for nominal-specific tunings) space-separated words. Got: ' + line);
                return null;
            }
        } else if (state[0] == 'override') {
            // parse override() declarations.

            var words = spaceSeparated(line);

            /*
            format of each override decl:
            <nominal:int[0, N]> <avdeg1: int> ... <avdegN: int> <ratio/cents from fundamental>
            */

            if (words.length != tuningConfig.accChains.length + 2) {
                console.error('TUNING CONFIG ERROR: ' + (i + 1)
                    + ': Override declaration has incorrect number of acc vector degrees in: ' + line
                    + '\nExpected ' + tuningConfig.accChains.length + ' degrees, got ' + (words.length - 2)
                    + ' instead.');
                log('HELP: Make sure there are no spaces in the cents/ratio tuning');
                return null;
            }

            var nominal = parseInt(words[0]);
            var av = words.slice(1, words.length - 1).map(function (x) { return parseInt(x) });
            var overrideCents = parseCentsOrRatio(words[words.length - 1]);

            if (isNaN(nominal) || nominal < 0 || nominal >= tuningConfig.numNominals) {
                console.error('TUNING CONFIG ERROR: ' + (i + 1)
                    + ': Override declaration has invalid nominal ' + words[0] + ' in ' + line
                    + '\nExpected a number from 0 to ' + (tuningConfig.numNominals - 1) + ' inclusive.');
                return null;
            }

            var isValid = true;
            for (var avIdx = 0; avIdx < av.length; avIdx++) {
                var deg = av[avIdx];
                var min = -tuningConfig.accChains[avIdx].centralIdx;
                var max = min + tuningConfig.accChains[avIdx].length - 1;
                if (isNaN(deg) || deg < min || deg > max) {
                    console.error('TUNING CONFIG ERROR: ' + (i + 1)
                        + ': Override declaration has invalid accidental vector degree ' + words[avIdx + 1] + ' in ' + line
                        + '\nExpected a number from ' + min + ' to ' + max + ' inclusive.');
                    isValid = false;
                    break;
                }
            }

            if (!isValid) {
                return null;
            }

            if (overrideCents == null) {
                console.error('TUNING CONFIG ERROR: ' + (i + 1)
                    + ': Override declaration has invalid cents/ratio ' + words[words.length - 1] + ' in ' + line);
                return null;
            }

            tuningConfig.tuningOverrideTable[[nominal].concat(av)] = overrideCents;
        } else if (state[0] == 'independent') {
            // parse independent symbol groups. Each line contains space separated symbols belonging
            // in a single group. No compound symbols allowed.
            //
            // The first symbol is a naturalizing symbol, which denotes the accidental that will
            // reset the symbol group.
            //
            // By default the if no symbol groups are specified, the natural sign is the
            // naturalizing symbol

            var words = spaceSeparated(line);

            var symbolGroupIdx = tuningConfig.independentSymbolGroups.length;
            var symbols = [];

            for (var j = 0; j < words.length; j++) {
                var symCodes = parseSymbolsDeclaration(words[j]);
                if (symCodes == null) {
                    console.error('TUNING CONFIG ERROR: ' + (i + 1) + ': Invalid independent symbol declaration: ' + line
                        + '\n"' + words[j] + '" is not a valid symbol code combination.');
                    return null;
                }
                if (symCodes.length != 1) {
                    console.error('TUNING CONFIG ERROR: ' + (i + 1) + ': Symbol group declaration must contain individual symbols only: ' + line
                        + '\n"' + words[j] + '" is not a single symbol code.');
                    return null;
                }
                symbols.push(symCodes[0]);
                tuningConfig.symbolGroupLookup[symCodes[0]] = symbolGroupIdx;
            }

            tuningConfig.independentSymbolGroups.push(symbols);
            tuningConfig.symbolGroupNaturalizingLookup.push(symbols[0]);
            tuningConfig.symbolGroupNaturalizingLookupIdx[symbols[0]] = symbolGroupIdx;
        }
    }

    commitParsedSection();

    //
    //
    // END OF PARSING
    //
    //


    // Set ascii 'n' for adding naturalizing accidentals symbol for fingerings
    //
    // Also, register naturalizing symbols in usedSymbols.
    tuningConfig.asciiToSmuflConvList.push('n');
    if (tuningConfig.symbolGroupNaturalizingLookup.length == 0) {
        // By default, if no independent symbol groups, the natural accidental is the default
        // naturalizing accidental.
        tuningConfig.asciiToSmuflConv['n'] = [2]; // 2 is the symbol code for natural sign

        tuningConfig.usedSymbols[2] = true;
    } else {
        // Otherwise, the default naturalizing accidentals are as specified
        tuningConfig.asciiToSmuflConv['n'] = tuningConfig.symbolGroupNaturalizingLookup;

        for (var i = 0; i < tuningConfig.symbolGroupNaturalizingLookup.length; i++) {
            tuningConfig.usedSymbols[tuningConfig.symbolGroupNaturalizingLookup[i]] = true;
        }
    }

    // If no symbol groups were defined, define the default single symbol group where the standard
    // natural sign is the usual naturalizing accidental.
    //
    // Note that if a used symbol is not in the symbol group lookup, it will be assumed to be in
    // group 0 (first group), hence it suffices to just include the natural sign.
    if (tuningConfig.independentSymbolGroups.length == 0) {
        tuningConfig.independentSymbolGroups.push([2]);
        tuningConfig.symbolGroupLookup[2] = 0;
        tuningConfig.symbolGroupNaturalizingLookup.push(2);
        tuningConfig.symbolGroupNaturalizingLookupIdx[2] = 0;
    }

    // Independent symbol groups update:
    // All naturalizing symbols should have secondary accidental status

    for (var i = 0; i < tuningConfig.symbolGroupNaturalizingLookup.length; i++) {
        var natSym = tuningConfig.symbolGroupNaturalizingLookup[i];
        var natSymHash = accidentalsHash([natSym]);
        console.log('natSymHash: ' + natSymHash);
        if (tuningConfig.secondaryTunings[natSymHash] == undefined) {
            tuningConfig.secondaryAccList.push(natSymHash);
            tuningConfig.secondaryAccIndexTable[natSymHash] = tuningConfig.secondaryAccList.length - 1;
            tuningConfig.secondaryTunings[natSymHash] = 0; // 0 cent default for naturalizing acc
            tuningConfig.secondaryAccTable[natSymHash] = [natSym];
        }
    }

    //
    //
    // SETTLE PERMUTATIONS OF XenNotes
    //
    //

    /**
     * Permute all combinations of accidental chains.
     *
     * The number of accidental chains can vary, so we need a way to
     * generate a variable number of nested for loops.
     */

    // This will be populated with all possible permutations of
    // accidental vectors.
    //
    // E.g. in the case of 2 accidental chains, this will be:
    // [0, 0], [0, 1], [0, 2], ...
    // [1, 0], [1, 1], [1, 2], ...
    // ...
    var idxPermutations = [];

    for (var i = 0; i < tuningConfig.accChains.length; i++) {
        var accChain = tuningConfig.accChains[i];

        if (idxPermutations.length == 0) {
            // first iteration: populate with indices of first acc chain.
            for (var j = 0; j < accChain.degreesSymbols.length; j++) {
                idxPermutations.push([j]);
            }

            continue;
        }

        // subsequent iterations: permute existing indices with indices of
        // current acc chain

        var newPermutations = [];

        for (var j = 0; j < accChain.degreesSymbols.length; j++) {
            for (var k = 0; k < idxPermutations.length; k++) {
                newPermutations.push(idxPermutations[k].concat([j]));
            }
        }

        idxPermutations = newPermutations;
    }

    // Now we have all permutations of accidental vectors by index

    /*
    Contains all possible XenNote names within one equave.

    A list of objects, each containing:
        - av AccidentalVector (with 0 being the centralIdx)
        - xen XenNote
        - cents (cents from nominal modulo equave)
        - equavesAdjusted (non-zero if cents was wrapped around the equave)
    */


    /**
     * This is a KVP of {@link XenNote.hash XenNote hashes} to {@link XNE}.
     *
     * The user may declare ligatures that have the same {@link XenNote.hash} as
     * existing {@link XenNote XenNotes} from the accidental chains to explicitly give
     * them 'important' priority. (See `hewm/5 limit.txt` or `updown/22edo.txt`)
     *
     * It's important to let ligatured {@link XNE} override default {@link XNE} entries
     * that come from acc chains.
     *
     * @type {XenNotesEquaves}
     */
    var xenNotesEquaves = {};

    // Now we iterate the nominals to populate

    for (var nomIdx = 0; nomIdx < tuningConfig.nominals.length; nomIdx++) {
        var nominalCents = tuningConfig.nominals[nomIdx];

        // if there are no accidental chains, we can just add the nominal

        if (tuningConfig.accChains.length == 0) {
            var hash = createXenHash(nomIdx, {});
            var cents = nominalCents;
            var equavesAdjusted = 0;

            if (tuningConfig.tuningOverrideTable[[nomIdx]]) {
                cents = tuningConfig.tuningOverrideTable[[nomIdx]];
            }

            if (tuningConfig.equaveSize > 0) { // prevent crashes
                while (cents < 0) {
                    cents += tuningConfig.equaveSize;
                    equavesAdjusted++;
                }
                while (cents >= tuningConfig.equaveSize) {
                    cents -= tuningConfig.equaveSize;
                    equavesAdjusted--;
                }
            } else if (tuningConfig.equaveSize < 0) {
                // negative equave - negative harmony
                while (cents < 0) {
                    cents -= tuningConfig.equaveSize;
                    equavesAdjusted--;
                }
                while (cents >= -tuningConfig.equaveSize) {
                    cents += tuningConfig.equaveSize;
                    equavesAdjusted++;
                }

                // Because the reference note is on 'top', and it works downwards.
                equavesAdjusted += 1;
            }
            xenNotesEquaves[hash] = {
                av: [],
                xen: { // XenNote
                    nominal: nomIdx,
                    orderedSymbols: [],
                    accidentals: null,
                    hash: hash,
                    hasLigaturePriority: false, // these don't matter
                    hasImportantLigature: true,
                },
                cents: cents,
                equavesAdjusted: equavesAdjusted,
            };
            continue;
        }

        // otherwise, iterate all permutations of accidental vectors
        // and create a new entry for each accidental vector

        for (var j = 0; j < idxPermutations.length; j++) {
            var avIndices = idxPermutations[j];
            var centOffset = 0;
            var accidentalVector = [];
            var accidentalSymbols = {};

            /*
            Stores the order that the SymbolCode keys should appear in.
            This determines the order accidentals will be displayed left-to-right.

            According to spec, symbols belonging to the first accidental chain
            should be displayed right-most.

            If a single degree of a chain consists of multiple symbols, they are to be
            displayed left-to-right in the order the user specified.
            */
            var orderedSymbols = [];

            for (var accChainIdx = 0; accChainIdx < tuningConfig.accChains.length; accChainIdx++) {
                // Loop each accidental chain of the current accidental vector.

                var accChain = tuningConfig.accChains[accChainIdx];
                var avIdx = avIndices[accChainIdx];
                // Degree of this acc chain.
                var accDegree = avIdx - accChain.centralIdx;

                accidentalVector.push(accDegree);

                if (accDegree == 0) {
                    // The degree on this chain is 0, it doesn't contribute to
                    // the accidental. Continue.
                    continue;
                }

                // Symbols used for this degree.
                // If there are multiple, they are in left-to-right order which
                // the user specified them.
                var accSymbols = accChain.degreesSymbols[avIdx];

                var newSymbols = [];

                accSymbols.forEach(function (symCode) {
                    if (accidentalSymbols[symCode]) {
                        accidentalSymbols[symCode]++;
                    } else {
                        accidentalSymbols[symCode] = 1;
                    }
                    newSymbols.push(symCode);
                });

                // Since the first accidental chain should be right-most,
                // the newer symbols should be concat to the left of the
                // rest of the symbols.
                orderedSymbols = newSymbols.concat(orderedSymbols);

                centOffset += accChain.tunings[avIdx];
            }

            var cents = nominalCents + centOffset;
            var equavesAdjusted = 0;

            if (tuningConfig.tuningOverrideTable[[nomIdx].concat(accidentalVector)]) {
                cents = tuningConfig.tuningOverrideTable[[nomIdx].concat(accidentalVector)];
            }

            if (tuningConfig.equaveSize > 0) { // prevent crashes
                while (cents < 0) {
                    cents += tuningConfig.equaveSize;
                    equavesAdjusted++;
                }
                while (cents >= tuningConfig.equaveSize) {
                    cents -= tuningConfig.equaveSize;
                    equavesAdjusted--;
                }
            } else if (tuningConfig.equaveSize < 0) {
                // negative equave - negative harmony
                while (cents < 0) {
                    cents -= tuningConfig.equaveSize;
                    equavesAdjusted--;
                }
                while (cents >= -tuningConfig.equaveSize) {
                    cents += tuningConfig.equaveSize;
                    equavesAdjusted++;
                }

                // Because the reference note is on 'top', and it works downwards.
                equavesAdjusted += 1;
            }


            if (tuningConfig.equaveSize - cents < EPSILON) {
                // Prevent floating point errors from causing enharmonics of the
                // unison of the reference pitch to be one equave higher than
                // it should be.
                cents = 0;
                equavesAdjusted--;
            }

            var hash = createXenHash(nomIdx, accidentalSymbols);
            xenNotesEquaves[hash] = {
                av: accidentalVector,
                xen: { // XenNote
                    nominal: nomIdx,
                    orderedSymbols: orderedSymbols,
                    accidentals: orderedSymbols.length == 0 ? null : accidentalSymbols,
                    hash: hash,
                    hasLigaturePriority: false,
                    hasImportantLigature: false,
                },
                cents: cents,
                equavesAdjusted: equavesAdjusted,
            };

            tuningConfig.avToSymbols[accidentalVector] = orderedSymbols;


            // SETTLE IMPLEMENTING LIGATURES AS ENHARMONICS
            //
            //

            /**
             * A list of orderedSymbols that are populated as ligatures are found.
             * Every subsequent ligature match builds upon prior enharmonically equivalent spellings.
             *
             * E.g. lets say we have symbols [a,b,c,d].
             * Ligature 1 matches [a,b] into X and ligature 2 matches [c,d] into Y.
             *
             * This value will initialize with only [[1,2,3,4]].
             * After processing lig 1, it will contain [[1,2,3,4], [X,3,4]].
             * After processing lig 2, it will contain [[1,2,3,4], [X,3,4], [1,2,Y], [X,Y]], where
             * each new value is lig2 applied to each of the previous values.
             *
             * All of which are valid equivalent ligatured spellings of the original symbols.
             *
             * This implementation relies on the fact that ligatures declared do not entirely overlap.
             * It is up to the user's discretion to ensure ligatures are sensible.
             *
             * @type {SymbolCode[][]}
             */
            var ligatureEnharmonics = [orderedSymbols];

            /**
             * Keeps track of the highest ligature precedence encountered so far, so
             * that a lower-precedence ligature does not override the
             * {@link TuningConfig.avToSymbols} lookup which determines the best way to
             * represent a particular AV when accidentals are entered via fingering.
             *
             * 0: weak, non-important (does not override avToSymbols lookup)
             * 1: strong, non-important
             * 2: weak, important
             * 3: strong, important
             */
            var highestPrecedenceEncountered = 0;

            tuningConfig.ligatures.forEach(function (lig) {
                var newEnharmonicsToAdd = [];
                var currLigPrecedence = lig.isWeak + lig.isImportant * 2;
                ligatureEnharmonics.forEach(function (unligSymbols) {
                    var ligAv = [];

                    // This list will contain the ligatured spelling of the accidental.
                    // Only used when a ligature match is found.
                    var ligOrderedSymbols = unligSymbols.map(function (x) { return x; }); // shallow copy

                    /*
                    As per spec, the ligatured symbols take the place of the right-most
                    symbol it replaces.
                    */

                    // Stores the index of the right-most symbol it replaces.
                    // This will be where the ligature is inserted.
                    var ligSymbolIdx = 0;

                    lig.regarding.forEach(function (idx) {
                        // idx represents each accidental chain that this ligature checks for
                        var deg = accidentalVector[idx];

                        // append this degree to the ligature subspace vector.
                        ligAv.push(deg);

                        // Remove symbols from ligOrderedSymbols that are
                        // replaced by the ligature.

                        var accChain = tuningConfig.accChains[idx];
                        var symbolsCausedByDegree = accChain.degreesSymbols[avIndices[idx]];

                        if (symbolsCausedByDegree == null) {
                            // continue. the current degree of this accidental vector doesn't need any symbols
                            return;
                        }

                        for (var sIdx = 0; sIdx < symbolsCausedByDegree.length; sIdx++) {
                            var symCode = symbolsCausedByDegree[sIdx];
                            var idxOfSymbol = ligOrderedSymbols.lastIndexOf(symCode);
                            if (idxOfSymbol == -1) {
                                console.warn('TUNING CONFIG WARN: Cannot find symbol to remove based on standard accidental chain when creating ligatures.'
                                    + ' This shouldn\'t happen. Pretending the nothing is wrong.');
                                return;
                            }
                            ligOrderedSymbols.splice(idxOfSymbol, 1);
                            if (idxOfSymbol > ligSymbolIdx) {
                                ligSymbolIdx = idxOfSymbol;
                            } else if (idxOfSymbol < ligSymbolIdx) {
                                // If removed symbol is before ligSymbolIdx,
                                // push the lig symbol up 1 index.
                                ligSymbolIdx--;
                            }
                        }
                    });

                    // contains symbols from ligature, in user-specified order.
                    var ligSymbols = lig.ligAvToSymbols[ligAv];

                    if (ligSymbols) {
                        // A ligature match is found.

                        // Insert the ligature symbols into the ordered symbols.
                        ligOrderedSymbols = ligOrderedSymbols
                            .slice(0, ligSymbolIdx)
                            .concat(ligSymbols)
                            .concat(ligOrderedSymbols.slice(ligSymbolIdx));

                        // Add the ligature as if it were an enharmonic equivalent.

                        var hash = createXenHash(nomIdx, ligOrderedSymbols);
                        // log(hash + ': ligOrderedSymbols: ' + JSON.stringify(ligOrderedSymbols));
                        xenNotesEquaves[hash] = {
                            av: accidentalVector,
                            xen: { // XenNote
                                nominal: nomIdx,
                                orderedSymbols: ligOrderedSymbols,
                                accidentals: ligOrderedSymbols.length == 0 ? null : accidentalSymbolsFromList(ligOrderedSymbols),
                                hash: hash,
                                hasLigaturePriority: !lig.isWeak,
                                hasImportantLigature: lig.isImportant,
                            },
                            cents: cents,
                            equavesAdjusted: equavesAdjusted,
                        };

                        newEnharmonicsToAdd.push(ligOrderedSymbols);

                        if (currLigPrecedence >= 1 && currLigPrecedence >= highestPrecedenceEncountered) {
                            // Only strong or important ligatures can override the default
                            // best representation of the accidental vector.
                            tuningConfig.avToSymbols[accidentalVector] = ligOrderedSymbols;
                            highestPrecedenceEncountered = currLigPrecedence;
                        }
                    }
                });
                ligatureEnharmonics = ligatureEnharmonics.concat(newEnharmonicsToAdd);
            }); // end iterating ligatures
        } // end iterating idxPermutations
    }
    // end of xenNotesEquaves population

    // SETTLE TABLE LOOKUPS
    //
    //

    /*
        Sort all XenNotes by cents, then by accidentalVector.join()

        (array comparison uses .join implicitly)
    */

    /**
     * @type {SortedXNE}
     */
    var sortedXNEs =
        Object.keys(xenNotesEquaves)
            .map(function (x) { return xenNotesEquaves[x]; })
            .sort(function (a, b) {
                if (isEnharmonicallyEquivalent(a.cents, b.cents, tuningConfig.equaveSize)) {
                    return (a.av < b.av) ? -1 : 1;
                }
                return a.cents - b.cents;
            });

    /*
    Iterate all XenNotes in order
    */

    // Contains cents of previous note.
    // If current note is enharmonically equivalent, don't update this value.
    var prevEnhEquivCents = null;
    var firstNoteCents = null;

    sortedXNEs.forEach(function (x) {
        var av = x.av;
        var xenNote = x.xen;
        var cents = x.cents;
        var equavesAdjusted = x.equavesAdjusted;
        var hash = xenNote.hash;

        if (firstNoteCents == null)
            firstNoteCents = cents;

        // Add to NotesTable
        tuningConfig.notesTable[hash] = xenNote;
        tuningConfig.avTable[hash] = av;
        tuningConfig.tuningTable[hash] = [cents, equavesAdjusted];

        if (prevEnhEquivCents != null && isEnharmonicallyEquivalent(cents, prevEnhEquivCents, tuningConfig.equaveSize)) {
            // Curr note should belong to the same group as prev note.
            // Safe to assume tuningConfig.stepsList is not empty.

            // Contains list of enharmonically equivalent XenNote hashes.
            var enharmGroup = tuningConfig.stepsList[tuningConfig.stepsList.length - 1];
            enharmGroup.push(hash);
            tuningConfig.stepsLookup[hash] = tuningConfig.stepsList.length - 1;
        } else if (prevEnhEquivCents != null && isEnharmonicallyEquivalent(cents, firstNoteCents, tuningConfig.equaveSize)) {
            // we looped back to the first note from the other end.
            // Add to the first step.
            tuningConfig.stepsList[0].push(hash);
            tuningConfig.stepsLookup[hash] = 0;
        } else {
            // Curr note is not enharmonically equivalent.

            // Add new entry in StepwiseList

            tuningConfig.stepsList.push([hash]);
            tuningConfig.stepsLookup[hash] = tuningConfig.stepsList.length - 1;

            // Update cents of new note.
            prevEnhEquivCents = cents;
        }
    });

    // Populate enharmonic graphs:

    for (var i = 0; i < tuningConfig.stepsList.length; i++) {
        var enhEquivNotes = tuningConfig.stepsList[i];
        // true if hasImportantLigature
        var containsImportantFlag = false;
        var importantOrNominal = enhEquivNotes.filter(function (hash) {
            var note = tuningConfig.notesTable[hash];
            if (note.hasImportantLigature) {
                containsImportantFlag = true;
                return true;
            }

            if (note.accidentals == null) {
                return true;
            }
            return false;
        });
        if (containsImportantFlag) {
            // if some notes in the enharmonic equivalent list have important ligatures,
            // we only want to consider important or nominal notes.
            enhEquivNotes = importantOrNominal;
        }
        // otherwise, we should consider all notes as enharmonic cyclable.

        if (enhEquivNotes.length > 1) {
            // If there are more than one enharmonic equivalents,
            // populate the enharmonic graph.

            // log((i+1) + '/' + tuningConfig.stepsList.length + ': '
            //     + JSON.stringify(enhEquivNotes));

            for (var j = 0; j < enhEquivNotes.length; j++) {
                var hash = enhEquivNotes[j];
                var nextHash = enhEquivNotes[(j + 1) % enhEquivNotes.length];
                tuningConfig.enharmonics[hash] = nextHash;
            }
        }
    }

    // DONE!

    // Make sure to save the new tuning to the runtime and metaTag caches.

    if (_curScore) {
        tuningConfigCache[textOrPath] = tuningConfig;
        saveMetaTagCache();

        log('Saved tuning to runtime & metaTag cache.');
    }

    log(tuningConfig.stepsList.length + ' notes/equave');

    return tuningConfig;
}

/**
 * Parse System/Staff Text into `KeySig` object.
 *
 * Key Sig text example format for tuning system with 5 nominals:
 *
 * ```txt
 * keysig x./ 20 0 +.9 3
 * ```
 *
 * The above KeySig denotes for the 1st to 5th nominals respectively:
 *
 * 1. double sharp & up arrow
 * 2. SymbolCode 20
 * 3. no accidental
 * 4. quarter sharp & SymbolCode 9
 * 5. SymbolCode 3
 *
 * - KeySig declarations must be prepended with 'keysig' (cAsE dOeSn'T mAtTeR)
 *
 * - Every nominal must be separated with one or more spaces
 *
 * - Multiple symbols on one nominal must be separated by a period (.), as per usual.
 *
 *
 * WARNING: The returned KeySig may not have the correct number of nominals
 * for the tuning system. It's important to CHECK if the `KeySig` is valid
 * w.r.t. the tuning system before trying to apply it in `readNoteData()` or
 * anywhere else.
 *
 * @param {string} text System/Staff Text content
 * @returns {KeySig?} KeySig object or null if not a KeySig
 */
function parseKeySig(text) {
    if (!text.toLowerCase().startsWith('keysig')) {
        return null;
    }

    var nomSymbols = spaceSeparated(text).slice(1);

    var keySig = [];

    nomSymbols.forEach(function (s) {
        var symCodes = parseSymbolsDeclaration(s);

        if (parseInt(symCodes[0]) <= 2) {
            // Any natural/none/null accidental code should be
            // regarded as no accidentals for this nominal.
            // just checking the first symbol should be good enough.
            keySig.push(null);
            return;
        }

        if (symCodes == null) {
            keySig.push(null);
        } else {
            keySig.push(accidentalsHash(symCodes));
        }
    });

    log('Parsed keySig: ' + JSON.stringify(keySig));

    return keySig;
}

/**
 * The user can specify just the reference tuning (e.g. `A4: 405`)
 * to update the Tuning Config's reference note & frequency
 * without having to recalculate the whole tuning config.
 *
 * This saves a lot of loading time for large JI systems with
 * comma shifts implemented as reference tuning changes, or
 * when the user wants to write for transposing instruments.
 *
 * When only reference tuning is changed, the mode of the nominals
 * will be preserved, unless `!` is prefixed to the change reference
 * tuning declaration.
 *
 * E.g.: `!C4: 263` will set the 0th nominal to the midi note C4, whereas
 * `C4: 263` will keep the 0th nominal as per the tuning config (
 * which is {@link TuningConfig.tuningNominal}), but change the
 * 0th nominal's tuning frequency such that the written C4 on the
 * score will be exactly 263 Hz.
 *
 * If the reference frequency is not specified (e.g. 'D4:'),
 * it represents that the reference nominal should change without
 * changing the tuning.
 *
 * E.g. If reference is originally A4: 440 and "C4:" is specified,
 * then the relative reference offset will be -5, but the tuning frequency
 * will remain the same (at A4: 440),
 *
 * The use case would be when JI ratios are specified as per-note
 * fingering annotations, and the ratios are to be related to a
 * different 1/1 instead of the default.
 *
 * @param {string} text reference tuning text
 * @returns {ChangeReferenceTuning?}
 */
function parseChangeReferenceTuning(text) {

    var text = text.trim();

    // The change reference tuning should be on 1 line.
    // Otherwise, it should be parsed as a new tuning config.
    if (text.indexOf("\n") != -1)
        return null;

    // PARSE TUNING NOTE.
    //
    //

    var referenceTuning = text.split(':').map(function (x) { return x.trim() });

    if (referenceTuning.length != 2) {
        // log(text + ' is not a reference tuning');
        return null;
    }

    var preserveNominalsMode = true;
    if (referenceTuning[0][0] == '!') {
        referenceTuning[0] = referenceTuning[0].slice(1).trim();
        preserveNominalsMode = false;
    }

    var referenceLetter = referenceTuning[0][0].toLowerCase();
    var referenceOctave = parseInt(referenceTuning[0].slice(1));
    if (isNaN(referenceOctave)) {
        // octave wasn't specified, so we assume it's 4.
        referenceOctave = 4;
    }

    var nominalsFromA4 = (referenceOctave - 4) * 7;
    var lettersNominal = Lookup.LETTERS_TO_NOMINAL[referenceLetter];

    if (lettersNominal == undefined) {
        // log("Invalid reference note specified: " + referenceLetter);
        return null;
    }

    nominalsFromA4 += lettersNominal;

    // Since the written octave resets at C, but we need to convert it
    // such that the octave resets at A4, we need to subtract one octave
    // if the nominal is within C to G.
    if (lettersNominal >= 2)
        nominalsFromA4 -= 7;

    var changeRelativeNominalOnly = referenceTuning[1] == '';
    var changeReferenceNote = {
        preserveNominalsMode: preserveNominalsMode,
        tuningNominal: nominalsFromA4,
        tuningNote: Lookup.LETTERS_TO_SEMITONES[referenceLetter] + (referenceOctave - 4) * 12 + 69,
        tuningFreq: changeRelativeNominalOnly ? null : parseFloat(eval(referenceTuning[1])), // specified in Hz.
        changeRelativeNominalOnly: changeRelativeNominalOnly
    };

    if (isNaN(changeReferenceNote.tuningFreq) && !changeRelativeNominalOnly) {
        return null;
    }

    return changeReferenceNote;
}

/**
 * Removes HTML/XML formatting code from text and decodes HTML escape sequences.
 *
 * Make sure formatting code is removed before parsing System/Staff/Fingering text!
 *
 * @param {string} str Raw System/Staff text contents
 * @returns {string} Text with formatting code removed
 */
function removeFormattingCode(str) {
    if (typeof (str) == 'string')
        return _decodeHTMLEscape(str.replace(/<[^>]*>/g, ''));
    else
        return null;
}

/**
 * Use this when writing to the {@link PluginAPIElement.text} property.
 *
 * Characters <, >, &, " are escaped to their HTML escape sequences.
 *
 * @param {string} str String to escape
 * @returns {string} Escaped string
 */
function escapeHTML(str) {
    var str = str.replace(/&/g, '&amp;');
    str = str.replace(/</g, '&lt;');
    str = str.replace(/>/g, '&gt;');
    str = str.replace(/"/g, '&quot;');
    return str;
}

/**
 * Decodes html espace sequences.
 *
 * **DO NOT USE DIRECTLY**. Use `removeFormattingCode()` instead!
 *
 * Text in musescore is HTML Encoded (since it is represented in XML).
 *
 * @param {string} str String containing html escape sequences
 */
function _decodeHTMLEscape(str) {
    var str = str.replace(/&amp;/g, '&');
    str = str.replace(/&lt;/g, '<');
    str = str.replace(/&gt;/g, '>');
    str = str.replace(/&quot;/g, '"');

    return str;
}

/**
 * Parses a System/Staff Text contents to check if it represents any config.
 *
 * If a config is found, returns a `ConfigUpdateEvent` object to be added to
 * the `parms.staffConfigs[]` list.
 *
 * `ConfigUpdateEvent`s can modify the parms object.
 *
 * @param {string} text System/Staff Text contents
 * @param {number} tick Current tick position
 * @returns {ConfigUpdateEvent?}
 *  The `ConfigUpdateEvent` to add to `staffConfigs[]`, or `null` if invalid/not a config
 *
 */
function parsePossibleConfigs(text, tick) {
    if (tick === undefined || tick === null) {
        console.error('FATAL ERROR: parsePossibleConfigs() missing tick parameter!');
        return null;
    }

    var text = removeFormattingCode(text);


    /** @type {ChangeReferenceTuning|TuningConfig|KeySig|null} */
    var maybeConfig;

    // First, check for reference tuning changes.

    maybeConfig = parseChangeReferenceTuning(text);

    if (maybeConfig != null) {
        log("Found reference tuning change:\n" + text);
        // reference tuning change found.

        return { // ConfigUpdateEvent
            tick: tick,
            config: function (parms) {
                if (!maybeConfig.preserveNominalsMode && !maybeConfig.changeRelativeNominalOnly) {
                    // Changes mode of the nominals.
                    // When the user declares "!C4: 440", the nominals will start
                    // from C4 instead of whatever it was.

                    parms.currTuning.tuningNominal = maybeConfig.tuningNominal;
                    parms.currTuning.relativeTuningNominal = 0;
                    parms.currTuning.tuningNote = maybeConfig.tuningNote;
                    parms.currTuning.tuningFreq = maybeConfig.tuningFreq;
                    parms.currTuning.originalTuningFreq = maybeConfig.tuningFreq;
                } else if (!maybeConfig.changeRelativeNominalOnly) {
                    // We need to preserve the tuning nominal & tuning note, but change
                    // the tuning frequency so that the declared reference note is
                    // effectively correct.
                    //
                    // This prevents the nominals mode from going out of sync, unless
                    // explicitly wanted by the user.

                    /*
                    Method:

                    1. Calculate actual Hz of the new reference nominal using the original reference tuning.
                    2. Calculate interval between the above frequency and the actual frequency the user specified.
                    3. Apply that interval to currTuning.originalTuningFreq to get the new tuning frequency.
                    */

                    var nominalsFromReference = maybeConfig.tuningNominal - parms.currTuning.tuningNominal;
                    parms.currTuning.relativeTuningNominal = nominalsFromReference;
                    var xenNominal = mod(nominalsFromReference, parms.currTuning.numNominals);
                    var equaves = Math.floor(nominalsFromReference / parms.currTuning.numNominals);
                    var oldCentsFromReference = parms.currTuning.nominals[xenNominal] + equaves * parms.currTuning.equaveSize;
                    var oldHz = parms.currTuning.originalTuningFreq * Math.pow(2, oldCentsFromReference / 1200);
                    var newHz = maybeConfig.tuningFreq;

                    // log('oldHz: ' + oldHz, 'newHz: ' + newHz, 'oldCentsFromReference: ' + oldCentsFromReference);

                    parms.currTuning.tuningFreq = newHz / oldHz * parms.currTuning.originalTuningFreq;
                } else {
                    parms.currTuning.relativeTuningNominal = maybeConfig.tuningNominal - parms.currTuning.tuningNominal;
                }
            }
        };
    }

    // Then, check for Tuning Config declarations.

    maybeConfig = parseTuningConfig(text);

    if (maybeConfig != null) {
        var numSteps = maybeConfig.stepsList.length;
        log("Found tuning config:\n" + text + "\n" + numSteps + " notes/equave");
        // tuning config found.

        return { // ConfigUpdateEvent
            // Spoofing 1 tick earlier, because any TuningConfigs should
            // should be applied before a ChangeReferenceTuning event.
            //
            // This way, a System Text TuningConfig can be used to apply to
            // all staves, while individual staves can use ChangeReferenceTuning
            // to emulate transposing instruments.
            tick: tick - 1,
            config: function (parms) {
                parms.currTuning = maybeConfig;
            }
        };
    }

    maybeConfig = parseKeySig(text);

    if (maybeConfig != null) {
        // key sig found
        log("Found key sig:\n" + text);

        return { // ConfigUpdateEvent
            tick: tick,
            config: function (parms) {
                parms.currKeySig = maybeConfig;
            }
        }
    }

    return null;
}

/**
 * At the start of each voice, call this to reset parms to default.
 *
 * @param {Parms} parms Parms object.
 */
function resetParms(parms) {
    parms.currTuning = generateDefaultTuningConfig();
    parms.currKeySig = null;
}

/**
 * Use this function if you need to get the xen nominal of a note, but don't need
 * any other information.
 *
 * @param {MSNote} msNote Tokenized musescore Note object
 * @param {TuningConfig} tuningConfig
 */
function getNominal(msNote, tuningConfig) {
    var nominalsFromTuningNote = msNote.nominalsFromA4 - tuningConfig.tuningNominal;

    return mod(nominalsFromTuningNote, tuningConfig.numNominals);
}

/**
 * Merges two {@link AccidentalSymbols} groups (each group of accidental symbols act independently
 * within the bar, see {@link TuningConfig.independentSymbolGroups})
 *
 * E.g., let pythagorean accidentals (sharp/flat) be in one group, and up/down arrows be in the
 * other. If `priorSymGroups` has a sharp and up arrrow, and `currSymGroups` has a flat, then the
 * flat overrides the sharp but the up arrow persists, so the function will return flat + up arrow.
 *
 * @param {?AccidentalSymbols[]} priorSymGroups The existing symbol groups from the previous notes'
 * explicit accidentals or the key signature. If null, ignore and only return symbols in
 * `currSymGroups`.
 *
 * @param {?AccidentalSymbols[]} currSymGroups The current symbol groups from the current note which
 * will override symbols of the same group in `priorSymGroups` if explicit accidental symbols are
 * found in that group. If null, ignore and only return symbols in `priorSymGroups`.
 *
 * @param {boolean} outputGroups If true, the function will return groups (a list of
 * {@link AccidentalSymbols} objects) (same group indexing as inputs), instead of a single
 * {@link AccidentalSymbols} object.
 *
 * @returns {?AccidentalSymbols | AccidentalSymbols[]} The merged {@link AccidentalSymbols} of both
 * groups where `currSymGroups` takes precedence over `priorSymGroups`. If `outputGroups` is true,
 * returns a list of {@link AccidentalSymbols} indexed by groups. Returns `null` if no accidental
 * symbols are found in either group.
 */
function mergeAccidentalSymbolGroups(priorSymGroups, currSymGroups, outputGroups) {
    /**
     * If `outputGroups` is true, this will be a list of {@link AccidentalSymbols} objects, one for each group,
     * otherwise, it will be a single {@link AccidentalSymbols} object.
     *
     * @type {AccidentalSymbols[] | AccidentalSymbols}
     */
    var newAccSyms = outputGroups ? [] : {};

    if (priorSymGroups != null && currSymGroups != null && priorSymGroups.length != currSymGroups.length) {
        log('ERROR: mergeAccidentalSymbolGroups: priorSymGroups and currSymGroups have different lengths. This should not happen.')
    }
    var numGroups = 0;
    if (priorSymGroups != null) {
        numGroups = priorSymGroups.length;
    } else if (currSymGroups != null) {
        numGroups = currSymGroups.length;
    }

    if (outputGroups) {
        for (var grpIdx = 0; grpIdx < numGroups; grpIdx++) {
            newAccSyms.push({});
        }
    }

    for (var grpIdx = 0; grpIdx < numGroups; grpIdx++) {
        var priorGroup = priorSymGroups != null ? priorSymGroups[grpIdx] : null;
        var currGroup = currSymGroups != null ? currSymGroups[grpIdx] : null;

        if (currGroup != null && Object.keys(currGroup).length > 0) {
            // Accidental symbol groups on note take priority.
            if (outputGroups) {
                newAccSyms[grpIdx] = currGroup;
            } else {
                for (var noteSym in currGroup) {
                    if (newAccSyms[noteSym] == undefined) {
                        newAccSyms[noteSym] = currGroup[noteSym];
                    } else {
                        // NOTE: this code block shouldn't execute, since each group must have
                        // mutually exclusive symbols. However, just in case, we impl this.
                        newAccSyms[noteSym] += currGroup[noteSym];
                    }
                }
            }
        } else if (priorGroup != null && Object.keys(priorGroup).length > 0) {
            // If no accidental symbols in this group in the bar, take group from key sig.
            if (outputGroups) {
                newAccSyms[grpIdx] = priorGroup;
            } else {
                for (var keySym in priorGroup) {
                    if (newAccSyms[keySym] == undefined) {
                        newAccSyms[keySym] = priorGroup[keySym];
                    } else {
                        newAccSyms[keySym] += priorGroup[keySym];
                    }
                }
            }
        }
    }

    if (!outputGroups && Object.keys(newAccSyms).length == 0) {
        return null;
    }

    return newAccSyms;
}

/**
 * Check if the given accidental symbols are exclusively naturalizing symbols and nonempty/non-null.
 *
 * @param {AccidentalSymbols | SymbolCode[]} syms Either an {@link AccidentalSymbols} object or an array of {@link SymbolCode}s.
 * @param {TuningConfig} tuningConfig The current tuning config applied.
 * @return {boolean} True if the symbols are only naturalizing symbols, false otherwise. If no symbols/null, returns `false`.
 */
function containsOnlyNaturalizingSymbols(syms, tuningConfig) {
    if (syms == null) {
        return false;
    }
    if (syms.length != undefined) {
        // syms is an array of SymbolCodes
        if (syms.length == 0) {
            return false;
        }

        var onlyNaturalizingSymbols = tuningConfig.independentSymbolGroups.length == 0
            && syms.length == 1 && syms[0] == '2'; // Default natural symbol.

        if (tuningConfig.independentSymbolGroups.length > 0) {
            // For independent symbol groups with custom naturalizing accidentals
            onlyNaturalizingSymbols = true;
            for (var symIdx = 0; symIdx < syms.length; symIdx++) {
                var symCode = syms[symIdx];
                if (tuningConfig.symbolGroupNaturalizingLookupIdx[symCode] == undefined) {
                    onlyNaturalizingSymbols = false;
                    break;
                }
            }
        }
        return onlyNaturalizingSymbols;
    } else {
        // syms is an AccidentalSymbols object

        var symsKeys = Object.keys(syms);
        if (symsKeys.length == 0) {
            return false;
        }

        var onlyNaturalizingSymbols = tuningConfig.independentSymbolGroups.length == 0
            && symsKeys.length == 1 && symsKeys[0] == '2'; // Default natural symbol.

        if (tuningConfig.independentSymbolGroups.length > 0) {
            // For independent symbol groups with custom naturalizing accidentals
            onlyNaturalizingSymbols = true;
            for (var symIdx = 0; symIdx < symsKeys.length; symIdx++) {
                var symCode = symsKeys[symIdx];
                if (tuningConfig.symbolGroupNaturalizingLookupIdx[symCode] == undefined) {
                    onlyNaturalizingSymbols = false;
                    break;
                }
            }
        }

        return onlyNaturalizingSymbols;
    }
}

/**
 * Obtains a list of {@link SymbolCode}s (left-to-right) with naturalizing accidentals added
 * whenever a group has no symbols.
 *
 * The returned list will sort symbols in original order within each group, and the first declared
 * group will be on the right (closest to the note) (this implementation may reorder symbols if
 * groups do not agree with accidental chains!)
 *
 * @param {SymbolCode[][]} symCodeGroups a list of accidental symbols deconstructed into groups,
 * obtained by passing a `SymbolCode[]` array through {@link deconstructSymbolGroups}
 * @param {TuningConfig} tuningConfig
 *
 * @returns {SymbolCode[]} A list of {@link SymbolCode}s with naturalizing accidentals added.
 */
function addNaturalizingSymbols(symCodeGroups, tuningConfig) {
    var result = [];

    if (symCodeGroups.length != tuningConfig.independentSymbolGroups.length) {
        log('ERROR: addNaturalizingSymbols: symCodeGroups do not match number of groups defined in tuningConfig.independentSymbolGroups!');
        return result;
    }
    for (var i = symCodeGroups.length - 1; i >= 0; i--) {
        var group = symCodeGroups[i];
        if (group.length == 0) {
            // No symbols in this group, add naturalizing symbol.
            result.push(tuningConfig.independentSymbolGroups[i][0]);
        } else {
            // Add all symbols in this group.
            result = result.concat(group);
        }
    }
    return result;
}

/**
 *
 * 1. Uses TuningConfig and cursor to read XenNote data from a tokenized musescore note.
 *
 * 2. Checks for new accidentals added via fingerings (and resolves ligatures if any).
 *
 *    **If new accidentals were created, `reusedBarState` will be cleared.**
 *
 * Uses cursor & getAccidental() to find the effective accidental being applied on `msNote`,
 * including accidentals on `msNote` itself.
 *
 * If no prior explicit accidentals found, looks for accidentals on key signature.
 *
 * Otherwise, just returns the nominal XenNote object.
 *
 * @param {MSNote} msNote Representation of tokenized musescore note
 * @param {TuningConfig} tuningConfig The current tuning config applied.
 * @param {KeySig?} keySig The current key signature applied, or null if none.
 * @param {number} tickOfThisBar Tick of first segment of this bar
 * @param {number} tickOfNextBar Tick of first seg of the next bar, or -1 if last bar
 * @param {Cursor} MuseScore Cursor object
 * @param {BarState?} reusedBarState See parm description of {@link getAccidental()}. The bar state
 * cache will be cleared for reevaluation if a new accidental is created from fingering.
 * @returns {NoteData?} The parsed note data. If the note's accidentals are not valid within the
 *      declared TuningConfig, returns `null`.
 */
function readNoteData(msNote, tuningConfig, keySig, tickOfThisBar, tickOfNextBar, cursor, reusedBarState) {
    // Convert nominalsFromA4 to nominals from tuning note.

    var debugStr = ''; // to be printed during error or if debug logging is enabled

    var nominalsFromTuningNote = msNote.nominalsFromA4 - tuningConfig.tuningNominal;
    var equaves = Math.floor(nominalsFromTuningNote / tuningConfig.numNominals);

    var nominal = mod(nominalsFromTuningNote, tuningConfig.numNominals);

    var currAccStateHash = getAccidental(
        cursor, msNote.internalNote, tickOfThisBar, tickOfNextBar,
        0, null, reusedBarState, tuningConfig);

    var accSyms = accidentalSymbolsFromHash(currAccStateHash);
    accSyms = removeUnusedSymbols(accSyms, tuningConfig);

    // Check fingerings for accidental declarations
    var maybeFingeringAccSymbols = readFingeringAccidentalInput(msNote, tuningConfig);
    if (maybeFingeringAccSymbols != null) {
        // log('found fingering acc input: ' + JSON.stringify(maybeFingeringAccSymbols.symCodes));
        if (!CLEAR_ACCIDENTALS_AFTER_ASCII_ENTRY &&
            maybeFingeringAccSymbols.type == "ascii" && accSyms != null) {
            // We need to combine existing accidentals and newly created ones
            accSyms = addAccSym(accSyms, maybeFingeringAccSymbols.symCodes);
        } else {
            // Simply replace existing accidentals with newly created ones
            accSyms = accidentalSymbolsFromList(maybeFingeringAccSymbols.symCodes);
        }
        // We need to explicitly add naturalizing accidentals for groups with no accidentals.
        debugStr += '\nCreated symbols from fingering: ' + JSON.stringify(accSyms);
    }

    // If no accidental found, check key signature.
    // Check that key sig is valid for this tuning config by checking number of nominals.
    if (keySig && keySig.length == tuningConfig.numNominals && keySig[nominal] != null) {
        var keySigSyms = accidentalSymbolsFromHash(keySig[nominal]);
        if (accSyms == null) {
            // No explicit accidentals found within the bar. Directly use key sig on note.
            accSyms = keySigSyms;
            debugStr += '\nCreated symbols from key sig: ' + JSON.stringify(accSyms);
        } else {
            // Apply symbol groups of key sig only if they are not on the note.

            /** @type {AccidentalSymbols[]} */
            var keySigSymGroups = deconstructSymbolGroups(keySigSyms, tuningConfig);
            /** @type {AccidentalSymbols[]} */
            var noteAccSymGroups = deconstructSymbolGroups(accSyms, tuningConfig);

            accSyms = mergeAccidentalSymbolGroups(keySigSymGroups, noteAccSymGroups, false);
        }
    }

    // No longer needed.
    // var isNaturalFingeringAdded = false;

    if (accSyms != null && false) { // TODO this is commented out.
        // make sure that if the only symbol present is the natural symbol, we make accSyms null
        // since the natural symbol will be leftover/unmatched after the matching process.
        var syms = Object.keys(accSyms);

        if (containsOnlyNaturalizingSymbols(syms, tuningConfig)) {
            accSyms = null;
            debugStr += '\nOnly natural symbols found, setting accSyms to null.';

            // However, if the natural symbol was added because of the fingering, we need to
            // explicitly create a natural accidental symbol manually. We set a flag for setting
            // updatedSymbols later.
            // if (maybeFingeringAccSymbols != null && maybeFingeringAccSymbols.type == "ascii") {
            //     isNaturalFingeringAdded = true;
            // }
        }
    }

    /** @type {SymbolCode[]} */
    var primarySyms = []; // left-to-right display order
    /** @type {SymbolCode[]} */
    var secondarySyms = []; // left-to-right display order
    /** @type {SecondaryAccMatches} */
    var secondaryAccMatches = {};
    if (accSyms != null) {
        // First, check for ligatures, they count as primary accidentals.
        tuningConfig.ligatures.forEach(function (lig, idx) {
            // log('checking ligature: ' + JSON.stringify(lig));
            var mostSymbolsMatched = 0;
            /** @type {SymbolCode[]} */
            var bestSymbolMatch = null;
            /** @type {AccidentalSymbols} */
            var bestSubtracted = accSyms;
            for (var key in lig.ligAvToSymbols) {
                var syms = lig.ligAvToSymbols[key];
                var trySubtract = subtractAccSym(accSyms, syms);
                if (trySubtract != null && syms.length > mostSymbolsMatched) {
                    // log('lig subtracted ' + JSON.stringify(syms) + ' from ' + JSON.stringify(accSyms));
                    mostSymbolsMatched = syms.length;
                    bestSymbolMatch = syms;
                    bestSubtracted = trySubtract;
                }
            }
            if (bestSymbolMatch != null) {
                // If a match was found, add the best match to the primary symbols.
                // The matched accidentals go to the left of the earlier accidentals
                // from earlier chains.
                primarySyms = bestSymbolMatch.concat(primarySyms);

                // Remove the best match from the list of symbols to be matched.
                accSyms = bestSubtracted;

                debugStr += '\nMatched ligature: ' + JSON.stringify(bestSymbolMatch) +
                    ' from lig no. ' + (idx + 1);
            }
        });

        // Search from first declared acc Chain onwards
        for (var i = 0; i < tuningConfig.accChains.length; i++) {
            var chain = tuningConfig.accChains[i];

            // Find the best accidental match for this chain, which is assumed
            // to be the one with most symbols matched.
            var mostSymbolsMatched = 0;
            /** @type {SymbolCode[]} */
            var bestSymbolMatch = null;
            /** @type {AccidentalSymbols} */
            var bestSubtracted = accSyms;

            chain.degreesSymbols.forEach(function (syms) {
                if (syms == null) {
                    return; // skip central natural index.
                }
                var trySubtract = subtractAccSym(accSyms, syms);
                if (trySubtract != null && syms.length > mostSymbolsMatched) {
                    mostSymbolsMatched = syms.length;
                    bestSymbolMatch = syms;
                    bestSubtracted = trySubtract;
                }
            });

            if (bestSymbolMatch != null) {
                // If a match was found, add the best match to the primary symbols.
                // The matched accidentals go to the left of the earlier accidentals
                // from earlier chains.
                primarySyms = bestSymbolMatch.concat(primarySyms);

                // Remove the best match from the list of symbols to be matched.
                accSyms = bestSubtracted;

                debugStr += '\nMatched primary accidental: ' + JSON.stringify(bestSymbolMatch) +
                    ' from acc. chain no. ' + (i + 1);
            }
        }

        // Search from first declared secondary accidental.
        for (var i = 0; i < tuningConfig.secondaryAccList.length; i++) {
            var accHash = tuningConfig.secondaryAccList[i];
            var syms = tuningConfig.secondaryAccTable[accHash];

            // secondary accidentals can be stacked indefinitely.
            // match this secondary accidental's symbols until no more
            // are matchable.

            var numTimesMatched = 0;

            var count = 0;
            while (count++ < 70) { // limit reps to prevent freezing
                var trySubtract = subtractAccSym(accSyms, syms);

                if (trySubtract == null) {
                    break;
                }

                accSyms = trySubtract;
                numTimesMatched++;
            }

            // Register secondary accidental matches.

            if (numTimesMatched > 0) {
                var secAccIndex = tuningConfig.secondaryAccIndexTable[accHash];
                for (var j = 0; j < numTimesMatched; j++) {
                    secondarySyms = syms.concat(secondarySyms);
                }

                secondaryAccMatches[secAccIndex] = numTimesMatched;

                debugStr += '\nMatched secondary accidental: ' + JSON.stringify(syms) +
                    ' (no. ' + (i + 1) + ') ' + numTimesMatched + ' times';
            }
        }

        // All naturalizing accidentals count as secondary accidentals. Don't worry if the user
        // already explictly declared them as secondary accidentals (e.g. to get a text
        // representation), the user defined one will be caught in the above loop anyways.

        var remainingSyms = Object.keys(accSyms);
        for (var symIdx = 0; symIdx < remainingSyms.length; symIdx++) {
            var symCode = remainingSyms[symIdx];
            if (tuningConfig.symbolGroupNaturalizingLookupIdx[symCode] != undefined) {
                // This is a naturalizing symbol, so it counts as a secondary accidental.
                secondarySyms.push(symCode);
                if (secondaryAccMatches[symCode] == undefined) {
                    secondaryAccMatches[symCode] = 0;
                }
                secondaryAccMatches[symCode]++;
                debugStr += '\nMatched naturalizing accidental: ' + symCode;
            }
        }
    }

    debugStr += '\nLeftover unmatched symbols: ' + JSON.stringify(accSyms);

    // Create hash manually.
    // Don't use the createXenHash function, that works on the AccidentalSymbols object
    // instead of the hash.
    var xenHash = nominal;

    var primarySymsHash = accidentalsHash(primarySyms);

    if (primarySymsHash != '') {
        xenHash += ' ' + primarySymsHash;
    }

    var xenNote = tuningConfig.notesTable[xenHash];

    if (xenNote == undefined) {
        console.error("\n-----------------------\nFATAL ERROR: Could not find XenNote (" + xenHash +
            ") in tuning config. " + "\n\nNote parsing trace:" + debugStr +
            "\n\n...this is likely due to an incorrect order of declaration of ligature/secondary accidentals. "
            + "Read the above note parsing trace messages to see how the plugin mis-parsed this note.\n"
            + "\n-----------------------\n");
        // log("Tuning config: " + JSON.stringify(tuningConfig.notesTable));
        return null;
    }
    log('Note parsing: xenHash:' + xenHash + debugStr + '\n-----------');

    // If new accidentals created from fingerings, use the best representation
    // of the accidental so that the proper ligatures are applied.

    if (maybeFingeringAccSymbols != null) {
        var av = tuningConfig.avTable[xenNote.hash];
        var newHash = createXenHash(xenNote.nominal, tuningConfig.avToSymbols[av]);
        xenNote = tuningConfig.notesTable[newHash];
    }

    /**
     * If new accidentals should replace the ones currently on the note, this will be non-null.
     * @type {SymbolCode[]?}
     */
    var updatedSymbols = null;

    if (maybeFingeringAccSymbols != null) {
        // Once accidental order is figured out, if fingering added new accidental symbols, we need
        // to explicitly add naturalizing accidentals.
        updatedSymbols = secondarySyms.concat(xenNote.orderedSymbols);
        updatedSymbols = addNaturalizingSymbols(
            deconstructSymbolGroups(updatedSymbols, tuningConfig), tuningConfig
        );
        // Clear reusedBarState cache since we've modified the bar state.
        Object.keys(reusedBarState).forEach(function(key) {delete reusedBarState[key];});
    }

    // NOTE: If the full docs is not loading for the return type of this function, open ./types.js
    // and try again.
    return {
        /**
         * The MuseScore note model.
         * @type {MSNote}
         */
        ms: msNote,
        /**
         * The XenNote object.
         * @type {XenNote}
         */
        xen: xenNote,
        /**
         * The equave offset of the note relative to the tuning note.
         * @type {number}
         */
        equaves: equaves,
        /**
         * Secondary accidental symbols that were matched.
         * @type {SymbolCode[]}
         */
        secondaryAccSyms: secondarySyms,
        /**
         * The number of times each secondary accidental appears. Shares the same index as
         * `secondaryAccSyms`.
         * @type {number[]}
         */
        secondaryAccMatches: secondaryAccMatches,
        /**
         * If a new valid accidental entry fingering text is found, these accidental symbols will
         * override the accidental of this note.
         * @type {SymbolCode[]?}
         */
        updatedSymbols: updatedSymbols
    };
}

/**
 * Parses a user-input string which converts into an array of {@link SymbolCode}s.
 *
 * The entire user input must be matched with not a single character left over.
 * Otherwise, this is not a valid ASCII accidental input string.
 *
 * @param {string} str Text containing ascii representation of accidentals.
 * @param {TuningConfig} tuningConfig
 * @returns {SymbolCode[]?} List of symbols, or null if the string couldn't be fully parsed.
 */
function parseAsciiAccInput(str, tuningConfig) {
    /**
     * A list of strings.
     *
     * Every time a match is found, the string will be split into the parts
     * before and after the match.
     * @type {string[]}
     */
    var strParts = [str];

    /**
     * Stores converted {@link SymbolCode}s
     * @type {SymbolCode[]}
     */
    var convertedSymbols = [];

    tuningConfig.asciiToSmuflConvList.forEach(function (searchStr) {
        // contains strParts for the next iteration.
        var newStrParts = [];
        var numMatches = 0;
        strParts.forEach(function (sourceStr) {
            var splitStr = sourceStr.split(searchStr);
            numMatches += splitStr.length - 1;
            for (var i = 0; i < splitStr.length; i++) {
                var strPart = splitStr[i];
                if (strPart != '') {
                    newStrParts.push(strPart);
                }
            }
        });

        if (numMatches > 0) {
            var symCodes = tuningConfig.asciiToSmuflConv[searchStr];
            for (var i = 0; i < numMatches; i++) {
                // It doesn't really matter what order the individual SymCodes are in.
                // It will get parsed properly by readNoteData().
                convertedSymbols = convertedSymbols.concat(symCodes);
            }

            strParts = newStrParts;
        }
    });

    if (strParts.length != 0) {
        // fail silently. Not all fingerings are meant to be accidentals.
        return null;
    }

    return convertedSymbols;
}

/**
 * Checks if user enters accidentals via using fingering text attached
 * to this note.
 *
 * If so, returns an {@link SymbolCode[]} list containing
 * accidental symbols that should replace existing accidentals.
 *
 * When parsing accidentals, this {@link SymbolCode}[] object, if any,
 * should be used in place of the original tokenized {@link AccidentalSymbols}
 * on the {@link MSNote}
 *
 * Accidental fingering text could either be an {@link AccidentalVector},
 * or ASCII-representation accidental entry.
 *
 * For ASCII-representation accidental entry, the user must declare conversion rules
 * in the secondary accidentals section of the tuning config.
 *
 * AccidentalVector fingering is prefixed by 'a', followed
 * by the accidental vector that is comma-separated.
 *
 * Recap: The Nth integer of the accidental vector represents the degree
 * of the Nth accidental chain to be applied to this note.
 *
 * Unprocessed fingerings have z-index of DEFAULT_FINGERING_Z_INDEX
 *
 * @param {MSNote} msNote
 * @param {TuningConfig} tuningConfig
 * @returns {{
 *  type: 'av' | 'ascii',
 *  symCodes: SymbolCode[]
 * }?}
 * Returns `null`, if there are no fingerings that affect the accidentals of this note.
 * Otherwise, returns an object containing the `symbols` property which contains
 * a list of symbol codes that this fingering applies on to the note, and the
 * `type` property which is either 'av' or 'ascii' depending on what kind of
 * fingering created the new accidental symbols.
 */
function readFingeringAccidentalInput(msNote, tuningConfig) {
    for (var i = 0; i < msNote.fingerings.length; i++) {
        // Loop through all non-accidental fingerings attached to this note.

        var fingering = msNote.fingerings[i];
        var text = fingering.text;
        text = removeFormattingCode(text);

        if (fingering.z != DEFAULT_FINGERING_Z_INDEX) {
            // only process unprocessed fingerings.
            continue;
        }

        // first, we try to match the fingering to user-declared ASCII
        // representations as declared in the sec() accidentals declarations

        var maybeSymCodes = parseAsciiAccInput(text, tuningConfig);

        if (maybeSymCodes != null) {
            // These new accidental symbols are converted from the
            // ascii-representation fingering.
            msNote.internalNote.remove(fingering);
            return {
                symCodes: maybeSymCodes,
                type: 'ascii',
            };
        }

        if (text.startsWith('a')) {
            // test accidental vector fingering.

            // Each space-separated number represents the degree of the
            // nth accidental chain.
            var isValid = true;
            var degrees =
                text
                    .slice(1)
                    .trim()
                    .split(',')
                    .map(function (x) {
                        var i = parseInt(x);
                        if (isNaN(i)) isValid = false
                        return i;
                    });

            if (isValid) {
                // We found an accidental vector fingering.

                var av = [];

                // If the number of degrees is less than the number of chains,
                // assume the rest to be 0.

                // If it is more, ignore the extra degrees.
                for (var accChainIdx = 0; accChainIdx < tuningConfig.accChains.length; accChainIdx++) {
                    var deg = degrees[accChainIdx];
                    if (deg)
                        av.push(deg);
                    else
                        av.push(0);
                }

                // remove the fingering.
                msNote.internalNote.remove(fingering);

                var orderedSymbols = tuningConfig.avToSymbols[av];

                if (orderedSymbols != undefined) {
                    return {
                        symCodes: orderedSymbols,
                        type: 'av',
                    };
                }
            }
        }
    }

    // nothing found

    return null;
}

/**
 * Parse a MuseScore Note into `NoteData`.
 *
 * Checks for fingering-based accidental entry and adds accidental symbols/fingerings if accidental
 * vector fingerings or ascii-representation fingerings are present.
 *
 * If fingering accidental entry is performed, the note will have its accidentals replaced/updated
 * with the new symbols. **`reusedBarState` cache will be cleared if so.**
 *
 * @param {PluginAPINote} note MuseScore Note object
 * @param {TuningConfig} tuningConfig Current tuning config applied.
 * @param {KeySig} keySig Current key signature applied.
 * @param {number} tickOfThisBar Tick of first segment of this bar
 * @param {number} tickOfNextBar Tick of first segment of next bar, or -1 if last bar.
 * @param {Cursor} cursor MuseScore Cursor object
 * @param {*} newElement reference to the `PluginAPI::newElement` function.
 * @param {BarState?} reusedBarState See parm description of {@link getAccidental()}.
 * @returns {NoteData} NoteData object
 */
function parseNote(note, tuningConfig, keySig, tickOfThisBar, tickOfNextBar, cursor, newElement, reusedBarState) {
    var msNote = tokenizeNote(note);
    // TODO: Check if using reusedBarState introduces a bug.
    // reusedBarState cache will be cleared in this call if noteData.updatedSymbols is non-null.
    var noteData = readNoteData(msNote, tuningConfig, keySig, tickOfThisBar, tickOfNextBar, cursor, reusedBarState);

    if (noteData && noteData.updatedSymbols) {
        forceExplicitAccidentalsAfterNote(
            note, note.line, noteData.ms.tick, tickOfThisBar, tickOfNextBar,
            tuningConfig, keySig, cursor, newElement
        );

        // update new symbols if fingering-based accidental entry is performed.
        setAccidental(note, noteData.updatedSymbols, newElement, tuningConfig);
    }
    return noteData;
}

/**

████████ ██    ██ ███    ██ ██ ███    ██  ██████
   ██    ██    ██ ████   ██ ██ ████   ██ ██
   ██    ██    ██ ██ ██  ██ ██ ██ ██  ██ ██   ███
   ██    ██    ██ ██  ██ ██ ██ ██  ██ ██ ██    ██
   ██     ██████  ██   ████ ██ ██   ████  ██████

*/

/**
 * Given current `NoteData` and a `TuningConfig`, calculate the
 * required note's tuning offset in cents.
 *
 * This function also applies per-note tuning offsets denoted by
 * fingering annotations.
 *
 * @param {NoteData} noteData The note to be tuned
 * @param {TuningConfig} tuningConfig The tuning configuration
 * @param {boolean?} absoluteFromA4
 * If `true`, returns the cents interval between the note and 440hz.
 * @returns {number}
 * Returns the cents offset to apply to `Note.tuning` property,
 *
 * or if `absoluteFromA4`, returns the absolute cents offset from 440hz.
 */
function calcCentsOffset(noteData, tuningConfig, absoluteFromA4) {
    // lookup tuning table [cents, equavesAdjusted]
    var cents_equaves = tuningConfig.tuningTable[noteData.xen.hash];

    // calc XenNote cents from A4

    // include equave offset (caused by equave modulo wrapping)
    var xenCentsFromA4 = cents_equaves[0] - cents_equaves[1] * tuningConfig.equaveSize;

    // apply reference note tuning offset
    xenCentsFromA4 += Math.log(tuningConfig.tuningFreq / 440) * 1200 / Math.log(2);

    // apply NoteData equave offset.
    xenCentsFromA4 += noteData.equaves * tuningConfig.equaveSize;

    // apply secondary accidentals
    Object.keys(noteData.secondaryAccMatches).forEach(function (secAccIdx) {
        var accHash = tuningConfig.secondaryAccList[secAccIdx];
        var secAccTuning = tuningConfig.secondaryTunings[accHash];
        if (Array.isArray(secAccTuning)) {
            secAccTuning = secAccTuning[noteData.xen.nominal];
        }
        xenCentsFromA4 +=
            noteData.secondaryAccMatches[secAccIdx] // number of matched accidentals
            * secAccTuning;
    });

    /*
    Different fingering tuning annotations can be applied to a note.
    (and can be applied simultaneously).

    They are applied in this order:

    1. The fingering JI interval/ratio tuning overrides the tuning entirely,
    tuning the note as the specified ratio against the reference note.
    Its octave is automatically reduced/expanded to be as close as possible to
    xenCentsFromA4. By default, this fingering must be suffixed by a period
    unless the REQUIRE_PERIOD_AFTER_FINGERING_RATIO flag is set to false.

    2. The fingering cents offset simply offsets tuning by the specified
       amount of cents.
    */

    var fingeringCentsOffset = 0;
    var fingeringJIOffset = null; // this is in cents

    noteData.ms.fingerings.forEach(function (fingering) {
        if (fingering.z != DEFAULT_FINGERING_Z_INDEX && fingering.z != PROCESSED_FINGERING_ANNOTATION_Z) {
            // Only accept processed & unprocessed fingering annotations.
            // Other fingering types should be ignored.
            return;
        }

        var text = fingering.text;

        try {
            if (text[0] && (text[0] == '+' || text[0] == '-')) {
                // Cents offset fingering
                var cents = parseFloat(eval(text.slice(1)));
                if (!isNaN(cents)) {
                    fingeringCentsOffset += cents * (text[0] == '+' ? 1 : -1);
                }
                fingering.z = PROCESSED_FINGERING_ANNOTATION_Z;
            } else if (!REQUIRE_PERIOD_AFTER_FINGERING_RATIO || text.endsWith('.')) {
                // Ratio.
                if (REQUIRE_PERIOD_AFTER_FINGERING_RATIO)
                    text = text.slice(0, -1);
                var ratio = parseFloat(eval(text));
                if (!isNaN(ratio) && ratio != 0) {
                    if (ratio > 0) {
                        fingeringJIOffset = Math.log(ratio) * 1200 / Math.log(2);
                    } else {
                        // negative ratio is treated as a negative cents offset
                        fingeringJIOffset = -Math.log(-ratio) * 1200 / Math.log(2);
                    }
                    var nomsOffset = mod(tuningConfig.relativeTuningNominal, tuningConfig.numNominals);
                    var eqvOffset = Math.floor(tuningConfig.relativeTuningNominal / tuningConfig.numNominals);
                    fingeringJIOffset += tuningConfig.nominals[nomsOffset] + eqvOffset * tuningConfig.equaveSize;
                }
                fingering.z = PROCESSED_FINGERING_ANNOTATION_Z;
            }
        }
        catch (e) {
            // ignore possible syntax errors. ascii-repr accidental
            // entry may begin with + or - and may match this form
            //
            // Even though the fingering element is removed from the note
            // immediately after rendering down, it will still show up
            // in PluginAPINote wrapper object, until endCmd() is called.
        }
    });

    if (fingeringJIOffset) {
        // 1. If JI ratio is present on the note, override the tuning of the note.

        // We need to octave reduce/expand this until it is as close as possible to
        // xenCentsFromA4.

        xenCentsFromA4 = fingeringJIOffset - Math.round((fingeringJIOffset - xenCentsFromA4) / 1200) * 1200;
    }

    // 2. Apply cents offset.

    xenCentsFromA4 += fingeringCentsOffset;

    if (absoluteFromA4)
        return xenCentsFromA4;

    // calculate 12 edo interval from A4

    var standardCentsFromA4 =
        (noteData.ms.midiNote - 69) * 100;

    // the final tuning calculation is the difference between the two
    return xenCentsFromA4 - standardCentsFromA4;
}

/**
 * Tunes a MuseScore note. Also adds an accidental if it finds a valid accidental fingering
 * attached.
 *
 * If a note's cent offset is too great (especially in systems with weird nominals/non-octave) we
 * will have to use a different MIDI pitch than the original `Note.pitch`, otherwise, the playback
 * will have a very weird timbre.
 *
 * This function tunes a note by adjusting both its `.tuning` and `.playEvents` properties. Make
 * sure to always re-run the tune function when notes are changed, (especially when using
 * Shift+Alt+Up/Down diatonic transpose) because it's not obvious when the `.playEvents` property is
 * tempered with, and a note may seemingly play back with the wrong pitch if the tune function isn't
 * run again.
 *
 * **Make sure _curScore.createPlayEvents() is called** so that play events are populated &
 * modifiable from the plugin API!
 *
 * This function also generates MIDI CSV entries for PlayEvents of the note if `returnMidiCSV` is
 * set to true.
 *
 * **IMPORTANT: Cursor must be positioned where the msNote is before calling this function!**
 *
 * `cursor.element` must point to the Chord of msNote, or if msNote is a grace note,
 * `cursor.element` must point to the Chord the grace note is attached to.
 *
 * @param {PluginAPINote} note MuseScore note object
 * @param {KeySig} keySig
 * @param {TuningConfig} tuningConfig
 * @param {number} tickOfThisBar Tick of first segment of this bar
 * @param {number} tickOfNextBar Tick of first segment of next bar, or -1 if last bar.
 * @param {Cursor} cursor MuseScore note object
 * @param {BarState?} reusedBarState See parm description of {@link getAccidental()}.
 * @param {boolean} newElement Reference to the `PluginAPI::newElement` function.
 * @param {boolean} returnMidiCSV If true, this function will iterate play events of this note and
 *  create midi text events for each play event.
 * @param {number?} partVelocity If `returnMidiCSV` is true, you will need to specify the velocity
 *  of the part (from Dynamic segment annotations). Individual note velocity is usually set to an
 *  offset relative to the part velocity.
 * @returns {string} MIDI CSV string to append to the midi csv file.
 */
function tuneNote(note, keySig, tuningConfig, tickOfThisBar, tickOfNextBar, cursor,
    reusedBarState, newElement, returnMidiCSV, partVelocity) {

    var noteData = parseNote(note, tuningConfig, keySig,
        tickOfThisBar, tickOfNextBar, cursor, newElement, reusedBarState);

    var centsOffset = calcCentsOffset(noteData, tuningConfig);

    log("Tune note: " + noteData.xen.hash + ", equave: " + noteData.equaves);

    var midiOffset = Math.round(centsOffset / 100);

    if (Math.abs(midiOffset) <= PLAY_EVENT_MOD_SEMITONES_THRESHOLD) {
        // If the midiOffset required is not that huge (within +/- 2 semitones)
        // don't affect PlayEvents.

        // When PlayEvent is changed, the playback of a Note when selected
        // will not match the actual playback of the note, which can be
        // quite annoying.

        // This reduces the chance of that happening when the tuning
        // & nominals are close to 12.
        midiOffset = 0;
    }


    /*
     * This is a hacky quickfix for https://github.com/euwbah/musescore-xen-tuner/issues/1
     *
     * Two notes with the same internal MIDI pitch will be regarded as one note,
     * making it impossible to tune them differently.
     *
     * This solution scans the chord this note is attached to, so at least within
     * the same chord, augmented unisons et al will be played back properly.
     *
     * However, this doesn't solve the problem when it occurs over two voices,
     * two Staffs under the same Part, or in play events caused by ornamentation.
     */

    var chord = note.parent;
    /**
     * Contains a lookup of MIDI pitches of PlayEvents of notes in this chord,
     * excluding play events of this current note.
     */
    var midiPitchesInChord = {};

    if (chord) {
        for (var i = 0; i < chord.notes.length; i++) {
            var n = chord.notes[i];
            if (n.is(note)) // skip self
                continue;

            var p = n.pitch;
            for (var nPevIdx = 0; nPevIdx < n.playEvents.length; nPevIdx++) {
                var pev = n.playEvents[nPevIdx];
                midiPitchesInChord[p + pev.pitch] = true;
            }
        }
    }


    if (midiPitchesInChord[note.pitch + midiOffset]) {
        // If the original midi offset won't work because another note in the same chord already has the
        // same midi pitch, work in a zig-zag fashion to find a 'hole' to insert the note.

        for (var offset = 1; offset < 80; offset++) { // god forbid someone actually having 80-note clusters in ONE chord.
            var bestOffset = 100;
            var foundSpace = false;
            for (var direction = -1; direction <= 1; direction += 2) {
                // test both directions in case the MIDI pitch is already offset and
                // going in one direction reduces offset more than the other.
                var testOffset = midiOffset + offset * direction;
                if (!midiPitchesInChord[note.pitch + testOffset] && Math.abs(testOffset) < Math.abs(bestOffset)) {
                    // hole found!
                    bestOffset = testOffset;
                    foundSpace = true;
                }
            }

            if (foundSpace) {
                midiOffset = bestOffset;
                break;
            }
        }
    }

    centsOffset -= midiOffset * 100;

    note.tuning = centsOffset;

    log("midi offset: " + midiOffset + ", centsOffset: " + centsOffset);

    // Update midi offset as well.

    // If there are ornaments on this note, the ornaments
    // will result in multiple play events. Though,
    // it's not possible to microtune the ornaments, you can still at least
    // tune them within +/- 100 cents.
    for (var i = 0; i < note.playEvents.length; i++) {
        // the PlayEvent.pitch property is relative
        // to the original note's pitch.
        note.playEvents[i].pitch = midiOffset;
        // log('play event: ' + JSON.stringify(note.playEvents[i]));
    }

    if (!returnMidiCSV) {
        return;
    }

    var midiText = '';
    var staffIdx = Math.floor(note.track / 4);
    var velo = (note.veloType == 0) ? (partVelocity + note.veloOffset) : note.veloOffset;

    // iterate play events
    for (var i = 0; i < note.playEvents.length; i++) {
        var pev = note.playEvents[i];
        var pitch = note.pitch + pev.pitch; // midi pitch, to nearest semitone

        // Actual default duration information is tied to the Chord.actualDuration.ticks
        // property.
        var duration = noteData.ms.internalNote.parent.actualDuration.ticks;
        var ontime = noteData.ms.tick + (pev.ontime / 1000 * duration);
        var len = pev.len / 1000 * duration;

        var midiOffset = Math.round(centsOffset / 100);

        pitch += midiOffset;

        var tuning = centsOffset - midiOffset * 100;
        tuning = tuning.toFixed(5); // don't put too many decimal places

        log('registered: staff: ' + staffIdx + ', pitch: ' + pitch + ', ontime: ' + ontime
            + ', len: ' + len + ', vel: ' + velo + ', cents: ' + tuning);
        log('veloType: ' + note.veloType);

        midiText += staffIdx + ', ' + pitch + ', ' + ontime + ', ' + len + ', '
            + velo + ', ' + tuning + '\n';
    }

    return midiText;
}

/**
 * Finds the tick of the first segment of the bar that 'tick'
 * lives in, and also the first segment of the next bar.
 *
 * If `tick` is within the last bar of the score,
 * returns `-1` for the next bar tick.
 *
 * @param {number} tick The tick position to check
 * @param {number[]} bars List of tick positions of each barline. These must be sorted in increasing order.
 * @param {boolean?} returnIndices If `true`, returns indices of the bars array instead of the ticks themselves.
 * @returns {number[]}
 * `[tickOfThisBar, tickOfNextBar]` or `[currBarIdx, nextBarIdx]`
 */
function getBarBoundaries(tick, bars, returnIndices) {

    if (tick >= bars[bars.length - 1]) {
        return returnIndices ? [bars.length - 1, -1] : [bars[bars.length - 1], -1];
    }

    var guessIdx = Math.floor(bars.length / 2);
    var highGuess = bars.length - 1;
    var lowGuess = 0;
    for (var i = 0; i < bars.length; i++) {
        if (tick >= bars[guessIdx] && tick < bars[guessIdx + 1]) {
            // log('found target bar', guessIdx, bars[guessIdx]);
            return returnIndices ? [guessIdx, guessIdx + 1] : [bars[guessIdx], bars[guessIdx + 1]];
        }
        if (tick < bars[guessIdx]) {
            // log('guess too high: ', guessIdx, bars[guessIdx], lowGuess, highGuess);
            highGuess = guessIdx;
            guessIdx = Math.floor((highGuess + lowGuess) / 2);
        } else {
            // log('guess too low', guessIdx, bars[guessIdx], lowGuess, highGuess);
            lowGuess = guessIdx;
            guessIdx = Math.floor((highGuess + lowGuess) / 2);
        }
    }

    console.error('ERROR: getBarBoundaries() failed to find bar boundaries of tick ' + tick + ' in bars: ' + JSON.stringify(bars));
    return [-1, -1];
}

/**
 * Reads all notes & grace notes of all voices within a bar and
 * in the current staff. Represents them as a `BarState` object.
 *
 * The current staffIdx of the cursor is used to determine which
 * staff to read from.
 *
 * This object is useful for traversing all Notes within a bar
 * on a line-by-line (nominal) basis. Useful for checking things
 * like accidental state etc...
 *
 * Returns cursor to original position after operation.
 *
 * @param {number} tickOfThisBar Tick of the start of the bar
 * @param {number} tickOfNextBar
 * @param {Cursor} cursor
 * @returns {BarState} `BarState` object
 */
function readBarState(tickOfThisBar, tickOfNextBar, cursor) {

    // log('readBarState(' + tickOfThisBar + ', ' + tickOfNextBar + ')');

    var ogCursorPos = saveCursorPosition(cursor);

    if (tickOfNextBar == null || tickOfNextBar == -1) {
        tickOfNextBar = 1e9;
    }

    // Mapping of each line to list of [Note]s in order
    // of appearance.
    var barState = {};

    // Loop all 4 voices to populate notes map

    for (var voice = 0; voice < 4; voice++) {
        setCursorToPosition(cursor, tickOfThisBar, voice, ogCursorPos.staffIdx);

        while (cursor.segment && cursor.tick < tickOfNextBar) {
            if (cursor.element && cursor.element.name == "Chord") {
                var notes = cursor.element.notes;
                var graceChords = cursor.element.graceNotes;
                var currTick = cursor.tick;

                // grace notes come first, add them to list first
                for (var i = 0; i < graceChords.length; i++) {
                    var graceNotes = graceChords[i].notes;

                    // contains mapping of { line: [Note], ... }
                    var notesInCurrChord = {};

                    for (var j = 0; j < graceNotes.length; j++) {
                        var n = graceNotes[j];
                        if (!notesInCurrChord[n.line]) {
                            notesInCurrChord[n.line] = [];
                        }
                        notesInCurrChord[n.line].push(n);
                    }
                    Object.keys(notesInCurrChord).forEach(function (line) {
                        var notes = notesInCurrChord[line];
                        if (!barState[line]) {
                            barState[line] = {};
                        }
                        if (!barState[line][currTick]) {
                            // Init empty lists for each voice
                            barState[line][currTick] =
                                [[], [], [], []];
                        }
                        // add all the notes within the same chord, voice & line
                        // to the lines lookup.
                        barState[line][currTick][voice].push(notes);
                    });
                }

                // Add the final main chord at this tick position.

                // mapping of { line: [Note] }
                var notesInCurrChord = {};

                for (var i = 0; i < notes.length; i++) {
                    var n = notes[i];
                    if (!notesInCurrChord[n.line]) {
                        notesInCurrChord[n.line] = [];
                    }
                    notesInCurrChord[n.line].push(n);
                }
                Object.keys(notesInCurrChord).forEach(function (line) {
                    var notes = notesInCurrChord[line];
                    if (!barState[line]) {
                        barState[line] = {};
                    }
                    if (!barState[line][currTick]) {
                        // Init empty lists for each voice
                        barState[line][currTick] =
                            [[], [], [], []];
                    }
                    // add all the notes within the same chord, voice & line
                    // to the lines lookup.
                    barState[line][currTick][voice].push(notes);
                });
            }

            cursor.next();
        }
    }

    restoreCursorPosition(ogCursorPos);

    return barState;
}

/**
 * Retrieve the next note up/down/enharmonic from the current {@link PluginAPINote}, and
 * returns {@link XenNote} and {@link PluginAPINote.line} offset to be applied on the note.
 *
 * This function does not read/regard secondary accidentals. The returned {@link NextNote} will
 * not contain any secondary accidentals.
 *
 * The returned `lineOffset` property represents change in `Note.line`.
 * This is a negated value of the change in nominal ( +pitch = -line )
 *
 * In up/down mode, the enharmonic spelling is decided with the following rules:
 *
 * - If the new note has an enharmonic spelling that matches prior accidental state/key signature,
 *   the new note returned will use the enharmonic spelling matching.
 *
 * - Otherwise, the enharmonic spelling with the smallest accidental vector distance
 *   from the current note's AV (sum of squares) is to be chosen.
 *   This ensures that accidentals used will stay roughly within the same
 *   ball park.
 *
 * - Otherwise, if two options have very similar {@link AccidentalVector} distances, choose the one with
 *   lesser accidental symbols. This ensures that ligatures will always take effect.
 *
 * - Otherwise, we should pick the enharmonic spelling that
 *   minimizes nominal/line offset amount.
 *
 * - If all else are the same, up should prefer sharp side of acc chains (simply
 *   the sum of all degrees in the vector), and down should prefer flat side.
 *
 *
 * A `NextNote.matchPriorAcc` flag will be returned `true` if an enharmonic
 * spelling is found that matches prior accidental state.
 *
 * @param {number} direction `1` for upwards, `0` for enharmonic cycling, `-1` for downwards.
 * @param {number[]?} constantConstrictions
 *  An optional list of indices of accidental chains specifying the accidental chains
 *  that must maintain at the same degree.
 *
 *  This is applied for auxiliary up/down function where certain accidental movements
 *  are skipped.
 *
 *  (Only applicable if direction is `1`/`-1`. Not applicable for enharmonic)
 *
 * @param {NoteData} noteData parsed note data of the note to be transposed.
 * @param {KeySig} keySig Current key signature
 * @param {TuningConfig} tuningConfig Tuning Config object
 * @param {number} tickOfThisBar Tick of first segment of the bar
 * @param {number} tickOfNextBar Tick of first segment of the next bar, or -1 if last bar.
 * @param {Cursor} cursor MuseScore cursor object
 * @param {BarState} reusedBarState
 * @returns {NextNote?}
 *  `NextNote` object containing info about how to spell the newly modified note.
 *  Returns `null` if no next note can be found.
 */
function chooseNextNote(direction, constantConstrictions, noteData, keySig,
    tuningConfig, tickOfThisBar, tickOfNextBar, cursor) {

    var note = noteData.ms.internalNote;

    log('Choosing next note for (' + noteData.xen.hash + ', eqv: ' + noteData.equaves + ')');

    if (direction === 0) {
        // enharmonic cycling
        var enharmonicNoteHash = tuningConfig.enharmonics[noteData.xen.hash];

        log('retrieved enharmonicNoteHash: ' + enharmonicNoteHash);

        if (enharmonicNoteHash === undefined) {
            // No enharmonic spelling found. Return null.
            // log(JSON.stringify(tuningConfig.enharmonics));
            return null;
        }

        var enhXenNote = tuningConfig.notesTable[enharmonicNoteHash];

        // Account for equave offset between enharmonic notes.

        // Reminder: equavesAdjusted represents how many equaves has to be added
        // in order to fit the equave-0 spelling of the note within the equave
        // e.g. Ab has to be shifted up 1 equave to fit within the A-G equave range.

        var currNoteEqvsAdj = tuningConfig.tuningTable[noteData.xen.hash][1];
        var enhNoteEqvsAdj = tuningConfig.tuningTable[enharmonicNoteHash][1];
        var equaveOffset = enhNoteEqvsAdj - currNoteEqvsAdj;

        // E.g. if G# and Ab are enharmonics, and G# is the currNote,
        // enhNoteEqvsAdj - currNoteEqvsAdj = 1 - 0 = 1
        // 1 means that, when going from the note G# to Ab, the plugin has to
        // use the Ab that is 1 equave abovet the G#, instead of the Ab that is
        // within the same equave. Otherwise, the Ab would incorrectly be
        // an equave lower than the G#.

        var nominalsOffset = enhXenNote.nominal - noteData.xen.nominal +
            equaveOffset * tuningConfig.numNominals;

        // when cycling enharmonics, do not care about matching the prior accidental spelling
        // (defeats purpose of cycling enharmonics).

        // the only thing to check for is whether or not explicit accidentals should be created
        // for the new note.
        // However, that's NOT the goal of this function. Simply return the new note spelling.

        return {
            xen: enhXenNote,
            nominal: enhXenNote.nominal,
            equaves: noteData.equaves + equaveOffset,
            lineOffset: -nominalsOffset, // negative line = higher pitch.
            matchPriorAcc: false, // always false, doesn't matter
        }
    }


    // Otherwise, it's an up/down operation.

    // The index of the StepwiseList this note is currently at.
    var currStepIdx = tuningConfig.stepsLookup[noteData.xen.hash];

    log('currStepIdx: ' + currStepIdx);

    // If a valid step is found, this will contain list of enharmonically equivalent
    // XenNote.hashes that matches the accidental vector requirements of `regarding`.
    var validOptions = null;

    // If the steps reaches 0 when moving upwards, or last step when moving downwards,
    // this means that an additional equave has to be added/removed.
    // Keep track of this.
    var equaveOffset = 0;

    for (var i = 1; i < tuningConfig.stepsList.length; i++) {
        // Loop through every step within an equave once until an appropriate step is found
        // which differs in accidentalVector according to `regarding`.

        var offset = i;
        if (direction == -1) {
            // reverse search direction if offset negative.
            offset = -i;
        }

        var newStepIdx = mod(currStepIdx + offset, tuningConfig.stepsList.length);

        // These assumes that the equave has positive size.
        // For negative equaves, use the negative value of equaveOffset later.
        if (newStepIdx == 0 && direction == 1) {
            // looped back from end of stepsList. Add an equave.
            equaveOffset++;
        } else if (newStepIdx == tuningConfig.stepsList.length - 1 && direction == -1) {
            // looped back from beginning of stepsList. Remove an equave.
            equaveOffset--;
        }

        // list of xenHashes that are enharmonic to newStep
        var enharmonicOptions = tuningConfig.stepsList[newStepIdx];

        // this map will be populated with enharmonic option hashes
        // that match accidental vector requirements of `regarding`.
        // If a hash maps to 'false', it is invalidated forever.
        // If a hash maps to 'true', it is valid (but further checks can invalidate it)
        var validEnharmonicOptions = {};

        // check for accidental vector requirements according to
        // constantConstrictions

        var currNoteAccVec = tuningConfig.avTable[noteData.xen.hash];

        if (constantConstrictions != null) {
            // Loop each accidental chain to check degree matches one at a time.
            for (var foo = 0; foo < constantConstrictions.length; foo++) {
                // newNote.accVec[accChainIdx] needs to match currNote.accVec[accChainIdx]
                // for it to be considered a valid option for this auxiliary up/down.

                // If referring to accidental chains, these are 1-indexed, subtract 1
                // Otherwise, -1 will represent that nominals should stay unchanged.
                var nomOrAccChainIdx = constantConstrictions[foo] - 1;

                // loop enharmonic spellings at newStepIdx
                for (var j = 0; j < enharmonicOptions.length; j++) {
                    var option = enharmonicOptions[j];

                    // The user enters aux(0,...) to specify that the
                    // nominal should be changed.
                    // If accChainIdx == -1, this means
                    // 0 was not specified by the user,
                    // so the nominal should not change.

                    if ((nomOrAccChainIdx == -1 && tuningConfig.notesTable[option].nominal != noteData.xen.nominal)
                        || (nomOrAccChainIdx != -1 && tuningConfig.avTable[option][nomOrAccChainIdx] != currNoteAccVec[nomOrAccChainIdx])) {
                        // this enharmonic spelling does not match the requirements. flag as invalid
                        validEnharmonicOptions[option] = false;
                    } else if (validEnharmonicOptions[option] == undefined) {
                        validEnharmonicOptions[option] = true;
                    }
                }
            }
        }

        validOptions = enharmonicOptions.filter(function (opt) {
            return validEnharmonicOptions[opt] == undefined ||
                validEnharmonicOptions[opt] == true;
        });

        if (validOptions.length == 0) continue; // Does not meet `regarding` criteria... try next step

        break;
    }

    if (validOptions == null || validOptions.length == 0) {
        log('WARNING: no valid next note options found for note: ' + noteData.xen.hash +
            '\nDid you declare an invalid tuning system?');
        return null;
    }

    if (tuningConfig.equaveSize < 0) {
        equaveOffset = -equaveOffset;
        log('equaveSize < 0, reversing equaveOffset: ' + equaveOffset);
    }

    /**
     * A list of next note options with pre-calculated metrics.
     *
     * To be sorted based on the metrics to obtain the best option.
     *
     * @type {NextNoteOptions}
     */
    var nextNoteOptions = [];

    for (var i = 0; i < validOptions.length; i++) {
        /** @type {AccidentalHash} */
        var option = validOptions[i]; // contains XenNote hash of enharmonic option.

        var newXenNote = tuningConfig.notesTable[option];

        var newNoteEqvsAdj = tuningConfig.tuningTable[option][1];
        var currNoteEqvsAdj = tuningConfig.tuningTable[noteData.xen.hash][1];

        var totalEqvOffset = newNoteEqvsAdj - currNoteEqvsAdj + equaveOffset;

        var nominalOffset = newXenNote.nominal - noteData.xen.nominal +
            totalEqvOffset * tuningConfig.numNominals;

        var nextNoteObj = {
            xen: newXenNote,
            nominal: newXenNote.nominal,
            equaves: noteData.equaves + totalEqvOffset,
            lineOffset: -nominalOffset,
            matchPriorAcc: false
        };

        // check each option to see if it would match a prior accidental
        // on the new line. An AccidentalVector match is considered a match,
        // The `regarding` constriction is not so strict to the point where
        // enharmonics based on prior existing accidentals are disallowed.

        var priorAcc = getAccidental(
            cursor, note, tickOfThisBar, tickOfNextBar, 2, note.line - nominalOffset, tuningConfig);

        if (priorAcc == null && keySig) {
            var keySigAcc = keySig[newXenNote.nominal];
            if (keySigAcc != null && keySigAcc.length == tuningConfig.numNominals) {
                priorAcc = keySigAcc;
            }
        }

        priorAcc = removeUnusedSymbols(priorAcc, tuningConfig);
        var priorAV = priorAcc == null ? null : tuningConfig.avTable['0 ' + priorAcc];

        var optionAV = tuningConfig.avTable[option];

        if (priorAV != null && arraysEqual(optionAV, priorAV)) {
            // Direct accidental match. Return this.
            nextNoteObj.matchPriorAcc = true;

            // Having the same accidental vector as the prior accidental
            // doesn't necessarily mean it's the exact same symbols.
            // Make sure we use the exact same symbols as the prior accidental.
            nextNoteObj.xen = tuningConfig.notesTable['0 ' + priorAcc];
            return nextNoteObj;
        } else if (priorAV == null && option.split(' ').length == 1) {
            // If there's no prior accidental nor key signature accidental on this line,
            // and a note can be represented as a nominal, use the nominal.
            // This avoids unnecessary enharmonics.

            nextNoteObj.matchPriorAcc = true;
            return nextNoteObj;
        }

        // If no immediate match found, calculate metrics and
        // add this to the list of options to be sorted.

        // square distance between prior acc state and this option
        var avDist = 0;
        // absolute square distance between nominal/natural/origin and this option
        var absAvDist = 0;

        for (var j = 0; j < optionAV.length; j++) {
            absAvDist += optionAV[j] * optionAV[j];

            if (priorAV != null) {
                avDist += (priorAV[j] - optionAV[j]) * (priorAV[j] - optionAV[j]);
            } else {
                avDist = absAvDist;
            }
        }

        var sumOfDeg = optionAV.reduce(function (acc, deg) {
            return acc + deg;
        });

        nextNoteOptions.push({
            nextNote: nextNoteObj,
            avDist: avDist,
            absAvDist: absAvDist,
            numSymbols: newXenNote.orderedSymbols.length,
            lineOffset: -nominalOffset,
            sumOfDegree: sumOfDeg
        });
    }

    /**
     * Returns true if the line offset of the next note option
     * matches the operation direction.
     *
     * Staying on the same line is also considered 'matching direction'.
     *
     * If negative equave the preferred direction is reversed.
     * @returns {boolean} `true` if matches direction
     */
    function matchesDirection(lineOffset) {
        var up = tuningConfig.equaveSize > 0 ? direction > 0 : direction < 0;
        return up ? lineOffset <= 0 : lineOffset >= 0;
    }

    /**
     *
     * @param {NextNoteOption} a
     * @param {NextNoteOption} b
     * @param {boolean} debug set to `true` to print why a note was picked over the other.
     * @returns
     */
    var nextNoteSortFn = function (a, b, debug) {
        var dlog = debug ? function (sortDirection, str) {
            var first = sortDirection <= 0 ? a.nextNote.xen.hash : b.nextNote.xen.hash;
            var second = sortDirection <= 0 ? b.nextNote.xen.hash : a.nextNote.xen.hash;
            if (sortDirection == 0) {
                log('No preference between ' + first + ' and ' + second);
                return 0;
            }
            log('picked ' + first + ' over ' + second + ' because: ' + str);
            return sortDirection;
        } : function (sortDirection, str) {
            return sortDirection;
        };

        // Important ligatures should be preferred
        if (a.nextNote.xen.hasImportantLigature && !b.nextNote.xen.hasImportantLigature) {
            return dlog(-1, 'important ligature');
        } else if (!a.nextNote.xen.hasImportantLigature && b.nextNote.xen.hasImportantLigature) {
            return dlog(1, 'important ligature');
        }

        // Strong ligatures should be preferred
        if (a.nextNote.xen.hasLigaturePriority && !b.nextNote.xen.hasLigaturePriority) {
            return dlog(-1, 'strong ligature');
        } else if (!a.nextNote.xen.hasLigaturePriority && b.nextNote.xen.hasLigaturePriority) {
            return dlog(1, 'strong ligature');
        }

        var aMatchDir = matchesDirection(a.lineOffset);
        var bMatchDir = matchesDirection(b.lineOffset);

        // Prefer line offset matching the direction of transpose
        if (aMatchDir && !bMatchDir) {
            return dlog(-1, 'line offset matches direction');
        } else if (!aMatchDir && bMatchDir) {
            return dlog(1, 'line offset matches direction');
        }

        // choose the one with lesser line offset
        if (Math.abs(a.lineOffset) < Math.abs(b.lineOffset)) {
            return dlog(-1, 'line offset');
        } else if (Math.abs(a.lineOffset) > Math.abs(b.lineOffset)) {
            return dlog(1, 'line offset');
        }

        // Lower AV Dist is better. Give leeway for
        // 'similar' AV dist.
        if (a.avDist - b.avDist <= -0.7) {
            return dlog(-1, 'relative AV dist ' + a.avDist + ' vs ' + b.avDist);
        } else if (a.avDist - b.avDist >= 0.7) {
            return dlog(1, 'relative AV dist ' + b.avDist + ' vs ' + a.avDist);
        }

        // Lower absolute AV dist (less accidental degrees) preferred
        if (a.absAvDist - b.absAvDist <= -0.3) {
            return dlog(-1, 'absolute AV dist ' + a.absAvDist + ' vs ' + b.absAvDist);
        } else if (a.absAvDist - b.absAvDist >= 0.3) {
            return dlog(1, 'absolute AV dist ' + b.absAvDist + ' vs ' + a.absAvDist);
        }

        // Choose the one with lesser symbols
        if (a.numSymbols < b.numSymbols) {
            return dlog(-1, 'lesser symbols: ' + a.numSymbols + ' vs ' + b.numSymbols);
        } else if (a.numSymbols > b.numSymbols) {
            return dlog(1, 'lesser symbols: ' + b.numSymbols + ' vs ' + a.numSymbols);
        }

        // Line offset similar, choose the one with sumOfDegree
        // that matches the direction of transpose.
        //
        // Up should favor upward accidentals (sharps)
        if ((a.sumOfDegree > b.sumOfDegree && direction == 1) ||
            (a.sumOfDegree < b.sumOfDegree && direction == -1)) {
            return dlog(-1, 'sum of degree matches direction: ' + a.sumOfDegree + ' vs ' + b.sumOfDegree);
        } else if ((a.sumOfDegree < b.sumOfDegree && direction == 1) ||
            (a.sumOfDegree > b.sumOfDegree && direction == -1)) {
            return dlog(1, 'sum of degree matches direction: ' + b.sumOfDegree + ' vs ' + a.sumOfDegree);
        }

        return dlog(0, '');
    }

    // Sort them such that the best option is at the front
    // The sorting precedence & preference is as declared in order:
    nextNoteOptions.sort(function (a, b) {
        var sortOutcome = nextNoteSortFn(a, b, false);

        return sortOutcome;
    });

    // debug log why this option was chosen over the others.
    // TODO: comment this out when note choices are optimal & thoroughly tested.
    for (var i = 1; i < nextNoteOptions.length; i++) {
        nextNoteSortFn(nextNoteOptions[0], nextNoteOptions[i], true);
    }

    return nextNoteOptions[0].nextNote;
}

/**
 * Move the cursor to a specified position.
 *
 * If the cursor cannot move exactly to the specified position,
 * i.e. the selected `voice` does not have any element at specified
 * `tick` position, then the cursor position will be set to
 * the nearest element to the **LEFT** of specified `tick`.
 *
 * @param {Cursor} cursor MuseScore cursor object
 * @param {number} tick Tick to move cursor to
 * @param {number} voice Voice to move cursor to
 * @param {number} staffIdx staff index to move cursor to
 */
function setCursorToPosition(cursor, tick, voice, staffIdx) {
    cursor.rewind(1);
    cursor.voice = voice;
    cursor.staffIdx = staffIdx;

    if (voice < 0 || voice > 3) {
        console.error("FATAL ERROR: setCursorToPosition voice out of range: " + voice);
        return;
    }

    if (staffIdx < 0 || (cursor.score && staffIdx >= cursor.score.nstaves)) {
        console.error("FATAL ERROR: setCursorToPosition staffIdx out of range: " + staffIdx);
        return;
    }

    cursor.rewindToTick(tick);

    if (cursor.tick != tick) {
        // This happens very frequently because the position to move to
        // may not contain any elements (e.g. voices 2, 3 and 4 are usually mostly blank).
        //
        // In these cases, the cursor will not move to the 'correct' location, but it is
        // fine since there is nothing to check anyways.
        // log('WARN: didn\'t set Cursor correctly (This is fine if voice/staff is blank).\n' +
        //     'requested: ' + tick + ', got t|v: ' + cursor.tick + ' cursor.voice: ' + cursor.voice);
    }
}

/**
 * Returns a SavedCursorPosition to be fed into {@link restoreCursorPosition()}.
 *
 * @returns {SavedCursorPosition}
 */
function saveCursorPosition(cursor) {
    return { // SavedCursorPosition
        tick: cursor.tick,
        staffIdx: cursor.staffIdx,
        voice: cursor.voice,
        cursor: cursor
    }
}

/**
 * Restores cursor positioned to the saved position.
 *
 * @param {SavedCursorPosition} savedPosition SavedCursorPosition object
 */
function restoreCursorPosition(savedPosition) {
    setCursorToPosition(savedPosition.cursor, savedPosition.tick, savedPosition.voice, savedPosition.staffIdx);
}

/**
 * Deconstructs a list of accidental symbols into groups of independent symbols. If passed in an
 * array of {@link SymbolCode}s, each group preserves the relative left-to-right order.
 *
 * If tuning config does not specify independent symbol groups, assumes a single symbol group.
 *
 * @param {SymbolCode[] | AccidentalSymbols} symbols list of {@link SymbolCode}s or
 * {@link AccidentalSymbols} object
 * @param {TuningConfig} tuningConfig
 * @return {SymbolCode[][] | AccidentalSymbols[]} If `symbols` is a list of {@link SymbolCode}s, a
 * list of symbol groups, each group is a list of {@link SymbolCode}s. Otherwise, if `symbols` is an
 * {@link AccidentalSymbols} object, a list of {@link AccidentalSymbols} objects, each representing
 * a group of symbols. Groups are indexed according to symbol groups defined in
 * {@link TuningConfig.independentSymbolGroups}.
 */
function deconstructSymbolGroups(symbols, tuningConfig) {
    if (tuningConfig.independentSymbolGroups.length == 0) {
        return [symbols];
    }

    var groups = [];
    if (symbols.length != undefined) {
        // Symbols is an array of SymbolCodes.
        for (var i = 0; i < tuningConfig.independentSymbolGroups.length; i++) {
            groups.push([]);
        }
        for (var i = 0; i < symbols.length; i++) {
            var symCode = symbols[i];
            var groupIdx = tuningConfig.symbolGroupLookup[symCode];
            if (groupIdx == undefined) {
                groupIdx = 0; // default group is the first group if symbol is not specified.
            }
            groups[groupIdx].push(symCode);
        }
    } else {
        // Symbols is an AccidentalSymbols object.
        for (var i = 0; i < tuningConfig.independentSymbolGroups.length; i++) {
            groups.push({});
        }
        /** @type {SymbolCode[]} */
        var symKeys = Object.keys(symbols);
        for (var i = 0; i < symKeys.length; i++) {
            var symCode = symKeys[i];
            var groupIdx = tuningConfig.symbolGroupLookup[symCode];
            if (groupIdx == undefined) {
                groupIdx = 0; // default group is the first group if symbol is not specified.
            }
            groups[groupIdx][symCode] = symbols[symCode];
        }
    }

    return groups;
}

/**
 *
 * Retrieves the effective accidentals applied to the note.
 *
 * If no explicit accidentals found on/before this note within the bar, will return `null`. Explicit
 * naturalizing accidentals will still be returned.
 *
 * If `before` is true, does not include accidentals attached to the current note in the search.
 *
 * **Only SMuFL symbols from the "Symbols" category in the Master Palette (shortcut `Z`) are
 * supported**. This function DOES NOT read MuseScore's default accidentals. Due to how score data
 * is exposed to the plugins API, it is not possible to reliably determine accidentals when MS
 * accidentals and SMuFL-only symbols are used interchangeably.
 *
 * @param {Cursor} cursor MuseScore Cursor object
 * @param {PluginAPINote} note The note to check the accidental of.
 * @param {number} tickOfThisBar Tick of the first segment of the bar to check accidentals in
 * @param {number} tickOfNextBar Tick of first seg of next bar, or -1 if its the last bar.
 * @param {0|1|2|null} exclude If `0` or falsey, include accidentals attached to the current
 *  operating `note`.
 *
 *  If `1` ignore accidentals attached to the current `note` and only look for accidentals that are
 *  considered to appear 'before' `note`.
 *
 *  If `2`, ignore any accidentals from any note that belongs to the same chord as `note`.
 *
 *  The search will still return accidentals on prior notes in the same chord, or in a prior grace
 *  chord.
 * @param {number?} lineOverride If `lineOverride` specified, reads accidentals on this line instead
 *  of the line of the `note` parameter.
 *
 *  If `lineOverride` is different than the original `note.line`, `exclude=2` will be used, no
 *  matter what it was set to.
 *
 *  TODO: Check if this may cause any problems.
 * @param {BarState?} reusedBarState If an empty object is provided, a shallow copy of the read bar
 *  state will be stored in this object.
 *
 *  If the same bar is being read again, and nothing has changed in the bar, this object can be
 *  passed back to this function to reuse the bar state, so that it doesn't need to repeat
 *  `readBarState`.
 *
 * @param {TuningConfig} tuningConfig {@link TuningConfig} object
 *
 * @returns {string?|string[]} If an accidental is found, returns the accidental hash of the
 *  {@link AccidentalSymbols} object.
 *
 *  If no accidentals found, returns null.
 */
function getAccidental(cursor, note, tickOfThisBar,
    tickOfNextBar, exclude, lineOverride, reusedBarState, tuningConfig) {

    var nTick = getTick(note);
    var nLine = lineOverride || note.line;

    // log("getAccidental() tick: " + nTick + " (within " + tickOfThisBar + " - "
    //     + tickOfNextBar + "), line: " + nLine);

    if ((tickOfNextBar != -1 && nTick > tickOfNextBar) || nTick < tickOfThisBar) {
        console.error("FATAL ERROR: getAccidental() tick " + nTick +
            " not within given bar ticks: " + tickOfThisBar + " to " + tickOfNextBar);
        return null;
    }

    /** @type {BarState} */
    var barState;
    if (reusedBarState && Object.keys(reusedBarState).length != 0) {
        barState = reusedBarState;
    } else {
        barState = readBarState(tickOfThisBar, tickOfNextBar, cursor);
        if (reusedBarState) {
            // if empty reusedBarState provided, populate it with the generated
            // bar state.

            // TODO: If lagging, check if for-in is more performant for QJS engine.
            for (var key in barState) {
                reusedBarState[key] = barState[key];
            }
        }
    }

    var lineState = barState[nLine];

    if (!lineState) {
        // Nothing on this line. Return null.
        return null;
    }

    // METHOD: Traverse notes in line in reverse order.
    //
    // Find the first note with an explicit accidental that is
    // closest to the currentOperatingNote.

    // contains ticks of chords on line sorted from right-to-left.
    var lineTicks = Object.keys(lineState).sort(
        function (a, b) {
            return parseInt(b) - parseInt(a);
        }
    );

    /** @type {(AccidentalSymbols | null)[]} */
    var groupSymbols = [];
    /** @type {AccidentalSymbols} */
    var accidentals = {};

    for (var grpIdx = 0; grpIdx < tuningConfig.independentSymbolGroups.length; grpIdx++) {
        groupSymbols.push(null); // init empty group
    }

    for (var tIdx = 0; tIdx < lineTicks.length; tIdx++) {
        var currTick = lineTicks[tIdx];
        // log('tick: ' + currTick);
        if (currTick > nTick) {
            // Accidentals cannot possibly affect a previous note.
            // skip.
            continue;
        }

        // loop each voice from back to front.
        // Remember, every chord here is registered with the same tick!
        for (var voice = 3; voice >= 0; voice--) {
            if (currTick == nTick && voice > note.voice) {
                // E.g.: Within the same tick, voice 2's accidental
                //       cannot carry over to voice 1
                continue;
            }

            var chords = lineState[currTick][voice];

            // If we're at the same tick & voice as the note in question,
            // we need to make sure that only accidentals from prior chords
            // can affect this note.
            var chdIdxOfNote = -1;

            // If we're in the same chord as the note in question,
            // we need to make sure that only lower-indexed notes
            // can affect this note.
            var nIdxOfNote = -1;

            // loop chords back to front. (start from main chord, then
            // proceeds to grace chords).
            for (var chdIdx = chords.length - 1; chdIdx >= 0; chdIdx--) {
                var chd = chords[chdIdx];

                if (currTick == nTick && voice == note.voice) {
                    // We need to make sure that the curr chord not after
                    // the note in question.

                    if (chdIdxOfNote == -1) {
                        // We haven't found the chdIdx of the note yet...

                        for (var nIdx = chd.length - 1; nIdx >= 0; nIdx--) {
                            var currNote = chd[nIdx];

                            if (currNote.is(note)) {
                                chdIdxOfNote = chdIdx;
                                nIdxOfNote = nIdx;
                                break;
                            }
                        }

                        // If we still haven't found the chord this note belongs to,
                        // we cannot proceed, because we're traversing backwards
                        // and a future accidental cannot affect a previous note.
                        if (chdIdxOfNote == -1) {
                            // log('skip chd. chdIdx: ' + chdIdx);
                            continue; // go to previous chdIdx
                        }
                    }

                    // We also need to make sure that if we're excluding accidentals
                    // from the same chord entirely, we make sure that we skip
                    // this chd if the note belongs to it.

                    if (exclude == 2 && chdIdx == chdIdxOfNote) {
                        continue;
                    }

                    // otherwise, we can proceed knowing that we're traversing a chord
                    // that could affect the note's effective accidental.
                }

                // loop notes back to front.
                for (var nIdx = chd.length - 1; nIdx >= 0; nIdx--) {
                    if (currTick == nTick && voice == note.voice && chdIdx == chdIdxOfNote) {
                        if (nIdx > nIdxOfNote || (exclude == 1 && nIdx == nIdxOfNote)) {
                            // If we're traversing the same chord as the note in question,
                            // We need to make sure that only prior-indexed notes can affect
                            // the note in question,
                            //
                            // and check that we exclude the note itself if required.
                            // log('skipped: nIdx: ' + nIdx + ', nIdxOfNote: ' + nIdxOfNote);
                            continue;
                        }
                    }
                    var currNote = chd[nIdx];

                    var msNote = tokenizeNote(currNote);

                    if (msNote.accidentals) {
                        // found explicit accidental - check groups
                        // log(JSON.stringify(msNote.accidentals));
                        var earlyReturn = true;
                        var deconSymGroups = deconstructSymbolGroups(msNote.accidentals, tuningConfig);
                        for (var grpIdx = 0; grpIdx < deconSymGroups.length; grpIdx ++) {
                            var symKeys = Object.keys(deconSymGroups[grpIdx]);
                            if (groupSymbols[grpIdx] == null) {
                                if (symKeys.length > 0) {
                                    groupSymbols[grpIdx] = deconSymGroups[grpIdx];
                                    for (var i = 0; i < symKeys.length; i++) {
                                        accidentals[symKeys[i]] = deconSymGroups[grpIdx][symKeys[i]];
                                        // log("set accidentals[" + symKeys[i] + "] to " +
                                        //     deconSymGroups[grpIdx][symKeys[i]]);
                                    }
                                } else {
                                    earlyReturn = false;
                                }
                            }
                        }

                        if (earlyReturn) {
                            // Every independent symbol group has at least one symbol, so no more
                            // prior symbols can affect accidental of this note.
                            var accHash = accidentalsHash(accidentals);
                            // log('Found accidental earlyReturn (' + accHash + ') at: t: ' +
                            //     currTick + ', v: ' + voice + ', chd: ' + chdIdx + ', n: ' + nIdx);

                            return accHash;
                        }

                    }
                } // end of note loop
            }// end of chord loop
        }// end of voice loop
    }// end of ticks loop

    // Reached start of bar.

    if (Object.keys(accidentals).length > 0) {
        var accHash = accidentalsHash(accidentals);
        log('Found accidental (' + accHash + ') at: t: ' +
            currTick + ', v: ' + voice + ', chd: ' + chdIdx + ', n: ' + nIdx);

        return accHash;
    }

    // By the end of everything, if we still haven't found any explicit accidental,
    // return nothing.

    return null;
}

/**
 * Attach given {@link SymbolCode}s to a note (clears existing accidentals),
 * clearing prior accidentals.
 *
 * Assigns z-index (stacking order) from 1000 onwards, acting as
 * metadata which the layout algorithm will use to maintain the
 * correct right-to-left order of the accidental symbols if
 * multiple-symbol accidentals are used.
 *
 * The higher z-index = further to the left (1000 is to the right of 1001)
 *
 * This function does not handle layout of accidentals.
 *
 * Layout is only done after a whole chord is processed,
 * and is performed for all 4 voices at the same time.
 *
 * @param {PluginAPINote} note `PluginAPI::Note`
 * @param {SymbolCode[]?} orderedSymbols
 *  A list of `SymbolCode`s representing accidental symbols in left-to-right order.
 *
 *  `null` or `[]` to remove all accidentals.
 * @param {newElement} newElement reference to the `PluginAPI.newElement()` function
 * @param {TuningConfig} tuningConfig
 *  If provided, any accidentals symbols that are not included in the tuning config
 *  will not be altered/removed by this function.
 */
function setAccidental(note, orderedSymbols, newElement, tuningConfig) {

    var elements = note.elements;
    var elemsToRemove = [];

    // First, remove any accidental symbols from note.

    for (var i = 0; i < elements.length; i++) {
        if (elements[i].symbol) {
            var symCode = Lookup.LABELS_TO_CODE[elements[i].symbol.toString()];
            if (tuningConfig.usedSymbols[symCode] || tuningConfig.usedSecondarySymbols[symCode]) {
                // This element is an accidental symbol, remove it.
                elemsToRemove.push(elements[i]);
            }
        } else if (elements[i].name == 'Fingering') {
            if (elements[i].z >= 1000 && elements[i].z < 2000) {
                // This fingering is an accidental symbol, remove it.
                elemsToRemove.push(elements[i]);
            }
        }
    }

    elemsToRemove.forEach(function (elem) {
        note.remove(elem);
    });


    if (!orderedSymbols || orderedSymbols.length == 0) return;

    // Create new SymId symbols and attach to note.
    var zIdx = 1000;
    // go right-to-left.
    for (var i = orderedSymbols.length - 1; i >= 0; i--) {
        /** @type {PluginAPIElement} */
        var elem;
        var symCode = orderedSymbols[i];
        if (typeof (symCode) == 'string' && symCode[0] == "'") {
            // Create a fingering accidental
            elem = newElement(Element.FINGERING);
            note.add(elem);
            elem.text = escapeHTML(symCode.slice(1));
            /*  Autoplace is required for this accidental to push back prior
                segments. */

            // Default Fingering text style has its own automatic positionings
            // e.g.
            //  - X position is w.r.t. stem instead of notehead,
            //  - Y position w.r.t. voice instead of notehead.
            //
            // We need to set to User-1 style to position fingering text w.r.t. notehead.
            // But doing this will reset fontsize, horizontal and vertical alignment.

            elem.subStyle = 45; // Change Fingering text Style to "User-1" instead of "Fingering"
            // TODO: When updating to MuseScore 4, this enum constant is different.
            // E.g. refer to latest version of https://github.com/musescore/MuseScore/blob/b8862e94a919bea496db40769ba7a575dabdafd8/src/inspector/types/texttypes.h#L114

            elem.autoplace = true;
            elem.align = Align.LEFT | Align.VCENTER;
            elem.fontStyle = tuningConfig.nonBoldTextAccidental ?
                FontStyle.Normal : FontStyle.Bold;
            elem.fontSize = ASCII_ACC_FONT_SIZE;
            /*  Set offsetY to some random number to re-trigger vertical align later.
                Otherwise, the fingering will be auto-placed above the notehead, even though
                offsetY is set to 0. */
            elem.offsetY = -3;
            elem.z = zIdx;
        } else {
            // Create a SMuFL symbol accidental
            var symId = Lookup.CODE_TO_LABELS[symCode][0];
            var elem = newElement(Element.SYMBOL);
            elem.symbol = SymId[symId];
            note.add(elem);
            elem.z = zIdx;
        }

        // Just put some arbitrary 1.4sp offset
        // between each symbol for now.
        elem.offsetX = -1.4 * (zIdx - 999);

        zIdx++;
    }
}

/**
 * Makes a note's accidentals explicit.
 *
 * @param {PluginAPINote} note
 * @param {TuningConfig} tuningConfig
 * @param {KeySig} keySig
 * @param {number} tickOfThisBar
 * @param {number} tickOfNextBar
 * @param {*} newElement
 * @param {Cursor} cursor
 */
function makeAccidentalsExplicit(note, tuningConfig, keySig, tickOfThisBar, tickOfNextBar, newElement, cursor) {
    var noteData = parseNote(note, tuningConfig, keySig, tickOfThisBar, tickOfNextBar, cursor, newElement);
    var symbols = noteData.secondaryAccSyms.concat(noteData.xen.orderedSymbols);
    log('makeAccidentalsExplicit: ' + JSON.stringify(symbols));
    if (tuningConfig.independentSymbolGroups.length == 0) {
        // If there are no independentSymbolGroups, assume the usual natural symbol (symbol code 2)
        // is the naturalizing symbol.
        if (symbols.length != 0) {
            setAccidental(note, symbols, newElement, tuningConfig);
        } else {
            // If no accidentals, also make the natural accidentals explicit.
            setAccidental(note, [2], newElement, tuningConfig);
        }
    } else {
        var groups = deconstructSymbolGroups(symbols, tuningConfig);
        var newSymbols = [];
        // The first declared symbol group will be rendered on the right, closest to the note.
        for (var grpIdx = groups.length - 1; grpIdx >= 0; grpIdx--) {
            if (groups[grpIdx].length == 0) {
                // If no accidentals in this group, add naturalizing accidental to left of existing
                // accidental symbols.
                newSymbols.push(tuningConfig.symbolGroupNaturalizingLookup[grpIdx]);
            } else {
                // Otherwise, add all accidentals in this group, preserving same left-to-right order.
                newSymbols = newSymbols.concat(groups[grpIdx]);
            }
        }
        log("explicit newSymbols: " + newSymbols);
        setAccidental(note, newSymbols, newElement, tuningConfig);
    }
}

/**
 * Modifies accidentals & nominal on a MuseScore note.
 *
 * @param {PluginAPINote} note `PluginAPI::Note` to set pitch, tuning & accidentals of
 * @param {number} lineOffset Nominals offset from current note's pitch
 * @param {SymbolCode[]} orderedSymbols
 * Left-to-right ordered {@link SymbolCode}s. Obtained by concatenating
 * {@link NoteData.secondaryAccSyms} and {@link XenNote.orderedSymbols}.
 * @param {*} newElement
 * @param {TuningConfig} tuningConfig
 */
function modifyNote(note, lineOffset, orderedSymbols, newElement, tuningConfig) {
    log('modifyNote(' + (note.line + lineOffset) + ')');
    var newLine = note.line + lineOffset;

    // This is the easiest hacky solution to move a note's line.

    note.line = newLine;

    note.accidentalType = Accidental.NATURAL;
    note.accidentalType = Accidental.NONE;

    note.line = newLine;

    setAccidental(note, orderedSymbols, newElement, tuningConfig);
}

/**
 * Aggressively applies explicit accidental to ALL notes with the same Note.line
 * as the current (old) note and the new Note.line of the modified note,
 * whose .tick values match, or come after the current note's .tick value,
 *
 * This will include grace notes that come before the actual note.
 *
 * The idea is to brute-force as many explicit accidentals as possible first,
 * then remove unnecessary accidentals later.
 *
 * @param {PluginAPINote} note Current note being adjusted
 * @param {number} newLine New {@link PluginAPINote.line} of note after adjustment
 * @param {number} noteTick tick of note
 * @param {number} tickOfThisBar
 * @param {number} tickOfNextBar
 * @param {TuningConfig} tuningConfig
 * @param {KeySig} keySig
 * @param {Cursor} cursor
 * @param {newElement} newElement
 */
function forceExplicitAccidentalsAfterNote(
    note, newLine, noteTick, tickOfThisBar, tickOfNextBar,
    tuningConfig, keySig, cursor, newElement
) {

    var ogCursorPos = saveCursorPosition(cursor);

    for (var voice = 0; voice < 4; voice++) {

        setCursorToPosition(cursor, noteTick, voice, ogCursorPos.staffIdx);

        while (cursor.segment && (cursor.tick < tickOfNextBar || tickOfNextBar == -1)) {
            // log('cursor.tick: ' + cursor.tick + ', tickOfNextBar: ' + tickOfNextBar);

            if (!(cursor.element && cursor.element.name == "Chord")) {
                cursor.next();
                continue;
            }

            /** @type {PluginAPIChord} */
            var chord = cursor.element;

            var notes = chord.notes;
            var graceChords = chord.graceNotes;

            for (var i = 0; i < graceChords.length; i++) {
                var graceNotes = graceChords[i].notes;
                for (var j = 0; j < graceNotes.length; j++) {
                    var gnote = graceNotes[j];
                    // We need to ensure that we're not mistakenly setting
                    // an accidental of a note that ties back to the current note.
                    if (!gnote.is(note) && !gnote.firstTiedNote.is(note) &&
                        (gnote.line == note.line || gnote.line == newLine)) {
                        makeAccidentalsExplicit(gnote, tuningConfig, keySig,
                            tickOfThisBar, tickOfNextBar, newElement, cursor);
                    }
                }
            }

            for (var i = 0; i < notes.length; i++) {
                var n = notes[i];
                if (!n.is(note) && !n.firstTiedNote.is(note) &&
                    (n.line == note.line || n.line == newLine)) {
                    makeAccidentalsExplicit(n, tuningConfig, keySig,
                        tickOfThisBar, tickOfNextBar, newElement, cursor);
                }
            }

            cursor.next();
        }
    }

    restoreCursorPosition(ogCursorPos);
}

/**
 * Executes up/down/enharmonic on a note.
 *
 * **IMPORTANT:**
 * - **The cursor must currently be at the note position**
 * - **In a sequence of tied notes, this function should only be called on
 *   the {@link PluginAPINote.firstTiedNote firstTiedNote}**
 *
 * <br/>
 *
 * What it does:
 * - Finds next pitch to transpose to
 * - Aggresively apply explicit accidentals on notes that may be affected by the
 *   modification of the current note.
 * - Modifies pitch & accidental of note. Explicit accidentals are always used.
 * - If tuningConfig has {@link TuningConfig.alwaysExplicitAccidental} `true`, then
 *   sets all tied notes to have the updated explicit accidental.
 * - Tunes the note.
 *
 * <br/>
 *
 * This function will create some unnecessary accidentals that should be
 * removed after this bar is processed.
 *
 * @param {PluginAPINote} note `PluginAPI::Note` object to modify
 * @param {number} direction 1 for up, -1 for down, 0 for enharmonic cycle
 * @param {number?} aux
 *  The Nth auxiliary operation for up/down operations. If 0/null, defaults
 *  to normal stepwise up/down. Otherwise, the Nth auxiliary operation will
 *  be performed.
 *
 * @param {Parms} parms Reference to `parms` object.
 * @param {*} newElement Reference to `PluginAPI.newElement()` function
 * @param {Cursor} cursor Cursor object.
 *
 * @returns {BarState}
 *  Returns an updated `BarState` object which includes changes made to
 *  the newly modified note.
 *
 *  Use this for layout & formatting purposes so that `BarState` does not
 *  need to be recalculated so often.
 */
function executeTranspose(note, direction, aux, parms, newElement, cursor) {
    var tuningConfig = parms.currTuning;
    var keySig = parms.currKeySig; // may be null/invalid
    /** @type {ConstantConstrictions} */
    var constantConstrictions = parms.currTuning.auxList[aux]; // may be null/undefined
    var bars = parms.bars;
    var noteTick = getTick(note);

    var barBoundaries = getBarBoundaries(noteTick, bars, false);
    var tickOfThisBar = barBoundaries[0];
    var tickOfNextBar = barBoundaries[1];

    log('executeTranspose(' + direction + ', ' + aux + '). Tick: ' + noteTick);

    var noteData = parseNote(note, tuningConfig, keySig,
        tickOfThisBar, tickOfNextBar, cursor, newElement);

    // STEP 1: Choose the next note.
    var nextNote = chooseNextNote(
        direction, constantConstrictions, noteData,
        keySig, tuningConfig, tickOfThisBar, tickOfNextBar, cursor);

    if (!nextNote) {
        // If no next note (e.g. no enharmonic)
        // simple do nothing, return bar state.
        var newBarState = {};
        tuneNote(note, keySig, tuningConfig, tickOfThisBar, tickOfNextBar, cursor, newBarState, newElement);

        return newBarState;
    }

    // log('nextNote: ' + JSON.stringify(nextNote));

    var newLine = note.line + nextNote.lineOffset;

    // STEP 2: Apply explicit accidentals on notes that may be affected
    //         by the modification process.

    forceExplicitAccidentalsAfterNote(
        note, newLine, noteTick, tickOfThisBar, tickOfNextBar,
        tuningConfig, keySig, cursor, newElement
    );

    //
    // STEP 3:
    //  - Carry over secondary accidentals if KEEP_SECONDARY_ACCIDENTALS_XXX is configured.
    //  - Always add explicit accidental if `explicit()` is set
    //  - Always add naturalizing accidentals, which will be removed in removeUnnecessaryAccidentals

    var accSymbols = nextNote.xen.orderedSymbols;

    // Here we need to check whether or not to include prior secondary
    // accidentals in the new note depending on the operation.

    var isEnharmonic = direction == 0;
    var isDiatonic = !isEnharmonic && constantConstrictions &&
        constantConstrictions.length == tuningConfig.accChains.length && constantConstrictions.indexOf(0) == -1;
    var isNonDiatonicTranspose = !isEnharmonic && !isDiatonic;

    if (KEEP_SECONDARY_ACCIDENTALS_AFTER_DIATONIC && isDiatonic ||
        KEEP_SECONDARY_ACCIDENTALS_AFTER_ENHARMONIC && isEnharmonic ||
        KEEP_SECONDARY_ACCIDENTALS_AFTER_TRANSPOSE && isNonDiatonicTranspose) {

        // We need to keep secondary accidentals. Carry forward secondary symbols and prepend them
        // We already added naturalizing symbols to the current note above, so no need to add
        // multiple copies of naturalizing symbols.
        var secondaryAccSymsWithoutNaturalizing = [];
        for (var secIdx = 0; secIdx < noteData.secondaryAccSyms.length; secIdx++) {
            var secSym = noteData.secondaryAccSyms[secIdx];
            if (tuningConfig.symbolGroupNaturalizingLookupIdx[secSym] == undefined) {
                secondaryAccSymsWithoutNaturalizing.push(secSym);
            }
        }
        accSymbols = secondaryAccSymsWithoutNaturalizing.concat(accSymbols);
        log('keeping acc symbols: ' + JSON.stringify(accSymbols));
        log('secondary (without nats): ' + JSON.stringify(secondaryAccSymsWithoutNaturalizing));
    }

    // Only add naturalizing symbols after adding secondary symbols, otherwise there may be
    // naturalizing symbols on notes with secondary symbols for independent symbol groups containing
    // (only) those secondary symbols.
    accSymbols = addNaturalizingSymbols(deconstructSymbolGroups(accSymbols, tuningConfig), tuningConfig);

    modifyNote(note, nextNote.lineOffset, accSymbols, newElement, tuningConfig);

    if (tuningConfig.alwaysExplicitAccidental) {
        // if we're in explicit accidentals/atonal mode, make sure that explicit
        // accidentals also appear on all tied notes, and that these accidentals are
        // updated.

        // We don't have to worry about these accidentals affecting subsequent notes
        // in the next bar (if the tie carries over a barline), because we're in
        // atonal/explicit accidental mode.
        var notePointer = note;
        while (notePointer.tieForward) {
            notePointer = notePointer.tieForward.endNote;
            setAccidental(notePointer, accSymbols, newElement, tuningConfig);
        }
    }

    //
    // STEP 4
    //

    var newBarState = {};
    tuneNote(note, keySig, tuningConfig, tickOfThisBar, tickOfNextBar, cursor, newBarState, newElement);

    return newBarState;
}

/**
 * Remove unnecessary accidentals within a staff in selected range of bars.
 *
 * This function assumes that the accidental state is always valid.
 *
 * Valid as in: {@link getAccidental()} will always return the correct effective
 * accidental on every single note in this bar.
 *
 * **IMPORTANT: {@link Cursor.staffIdx} must be set to the staff to operate on.**
 *
 * @param {number} startBarTick Any tick position within the starting bar (or start of selection)
 * @param {number} endBarTick
 *  Any tick pos within ending bar (or end of selection).
 *  If -1, performs the operation till the end of the score.
 * @param {Parms} parms Global `parms` object.
 * @param {Cursor} cursor Cursor object
 * @param {newElement} newElement Reference to the `PluginAPI.newElement()` function
 * @param {number?} firstBarTickIndex
 * Pre-calculated {@link getBarBoundaries} output to reduce repeated computation.
 * If provided, {@link startBarTick} will be ignored.
 * @param {number?} lastBarTickIndex
 * Pre-calculated {@link getBarBoundaries} output to reduce repeated computation.
 * If provided, {@link endBarTick} will be ignored.
 */
function removeUnnecessaryAccidentals(startBarTick, endBarTick, parms, cursor, newElement, firstBarTickIndex, lastBarTickIndex) {

    var staff = cursor.staffIdx;
    var bars = parms.bars;

    var lastBarTickIndex = lastBarTickIndex || getBarBoundaries(endBarTick, bars, true)[1]; // if -1, means its the last bar of score
    var firstBarTickIndex = firstBarTickIndex || getBarBoundaries(startBarTick, bars, true)[0];

    if (lastBarTickIndex == -1)
        lastBarTickIndex = bars.length - 1;

    var tickOfThisBar = bars[firstBarTickIndex];

    log('removeUnnec( from bar ' + firstBarTickIndex + ' (' + tickOfThisBar + ') to ' + lastBarTickIndex + ')');

    // Repeat procedure for 1 bar at a time.

    for (var barIdx = firstBarTickIndex; barIdx <= lastBarTickIndex; barIdx++) {

        /*
        Procedure for each bar:

        1. Generate BarState

        2. Iterate the notes of each staff line in order that they should appear
           (remember to sort Object.keys by tick first)

           As it iterates, keep track of accidentals. If no accidental has occured
           yet, defer to the key signature.

           If any accidental is found redundant remove it.
        */


        var tickOfNextBar;
        if (barIdx == bars.length - 1) {
            tickOfNextBar = -1;
        } else {
            tickOfNextBar = bars[barIdx + 1];
        }

        var barState = readBarState(tickOfThisBar, tickOfNextBar, cursor);

        // Mapping of lines to accidental hash
        // If a line has no accidentals thus far, check key signature
        // to see if an accidental is redundant.
        var accidentalState = {};

        var lines = Object.keys(barState);

        // Don't modify parms. Create a fake parms to store current
        // configs applied at this bar.
        /** @type {Parms} */
        var fakeParms = {};
        resetParms(fakeParms);

        for (var i = 0; i < parms.staffConfigs[staff].length; i++) {
            var config = parms.staffConfigs[staff][i];
            if (config.tick <= tickOfThisBar) {
                config.config(fakeParms);
            }
        }

        var tuningConfig = fakeParms.currTuning;
        var keySig = fakeParms.currKeySig;

        if (tuningConfig.alwaysExplicitAccidental) {
            // don't remove unnecessary accidentals if tuning config requests
            // all accidentals to be made explicit.
            continue;
        }

        for (var lineIdx = 0; lineIdx < lines.length; lineIdx++) {
            var lineNum = lines[lineIdx]; // staff line number
            var lineTickVoices = barState[lineNum]; // tick to voices mappings.

            // Sort ticks in increasing order.
            var ticks = Object.keys(barState[lineNum]).sort(
                function (a, b) {
                    return parseInt(a) - parseInt(b);
                }
            );

            // traversing ticks left to right.
            for (var tickIdx = 0; tickIdx < ticks.length; tickIdx++) {
                var currTick = ticks[tickIdx];

                // go from voice 1 to 4.
                for (var voice = 0; voice < 4; voice++) {
                    // We are traversing all voices left to right in order,
                    // there is no need to reset accidental state.

                    var chds = lineTickVoices[currTick][voice];

                    // go from leftmost to rightmost chord
                    for (var chdIdx = 0; chdIdx < chds.length; chdIdx++) {
                        /**
                         * All these notes are on the same line => all have the same nominal.
                         * @type {MSNote[]}
                         */
                        var msNotes = chds[chdIdx].map(
                            function (note) {
                                return tokenizeNote(note);
                            }
                        );
                        // All these notes have the same nominal.
                        var nominal = getNominal(msNotes[0], tuningConfig);

                        /** @type {?AccidentalSymbols[]} */
                        var keySigSymGroups = null;
                        if (keySig && keySig[nominal]) {
                            var keySigSyms = removeUnusedSymbols(accidentalSymbolsFromHash(keySig[nominal]), tuningConfig);
                            if (keySigSyms != null) {
                                keySigSymGroups = deconstructSymbolGroups(keySigSyms, tuningConfig);
                            }
                        }

                        // Before we proceed, make sure that all explicit accidentals
                        // attached to notes within this same chord & line
                        // are exactly the same (with respect to independent accidental groups).

                        // Note that it is fine for these notes to be
                        // a mix of implicit and explicit accidentals,
                        // as long as the accidentals are all the same.
                        // In that situation, it is clear that all the notes
                        // are the exact same note.

                        // Of course, people wouldn't write music like that,
                        // but while spamming transpose up/down, it is possible
                        // that such a scenario is reached, and the plugin should
                        // be able to smoothly handle it.

                        /** @type {AccidentalSymbols?} */
                        var prevExplicitAccSyms = null;
                        var proceed = true;
                        for (var noteIdx = 0; noteIdx < msNotes.length; noteIdx++) {
                            var accSyms = removeUnusedSymbols(
                                msNotes[noteIdx].accidentals, tuningConfig
                            );

                            if (accSyms != null) {
                                if (prevExplicitAccSyms == null) {
                                    if (keySigSymGroups != null) {
                                        var noteAccSymGroups = deconstructSymbolGroups(accSyms, tuningConfig);
                                        prevExplicitAccSyms = mergeAccidentalSymbolGroups(keySigSymGroups, noteAccSymGroups, false);
                                    } else {
                                        prevExplicitAccSyms = accSyms;
                                    }
                                } else {
                                    var currNoteAccSymGroups = deconstructSymbolGroups(accSyms, tuningConfig);
                                    var prevExplicitAccSymsGroups = deconstructSymbolGroups(prevExplicitAccSyms, tuningConfig);
                                    var effectiveCurrAccSyms = mergeAccidentalSymbolGroups(
                                        prevExplicitAccSymsGroups, currNoteAccSymGroups, false);

                                    if (!isAccidentalSymbolsEqual(prevExplicitAccSyms, effectiveCurrAccSyms)) {
                                        proceed = false;
                                        break;
                                    }
                                }
                            }
                        }

                        if (!proceed) continue;

                        for (var noteIdx = 0; noteIdx < msNotes.length; noteIdx++) {
                            var msNote = msNotes[noteIdx];
                            var accSyms = removeUnusedSymbols(msNote.accidentals, tuningConfig);

                            if (accSyms == null) {
                                continue; // No accidental symbols to remove on this note.
                            }

                            /*
                                STRATEGY: For each independent symbol group, if:

                                1. The current note's symbol group contains symbols.
                                2. The effective prior accidental state for this group contains the
                                   exact same symbols as current note's group.

                                Then, we ignore this group's symbols by adding it to a blacklist.

                                If no groups are ignored, all symbol groups are necessary and we
                                continue without removing symbols.

                                Otherwise, we have to re-call readNoteData (TODO: optimize so that
                                we don't have to do this twice per operation!) to obtain the correct
                                order of all SymbolCodes (NoteData.secondaryAccSyms on the left, and
                                NoteData.xen.orderedSymbols on the right), then reconstruct the
                                updated list based on blacklisted symbols.

                                TODO: Right now we are making use of reusedBarState when calling
                                readNoteData, but I'm not sure if it is possible even when deleting
                                accidental symbols (though they were deemed redundant anyways). It
                                would be super inefficient to recompute bar when parsing every note.

                                At the end, update accidentalState to match the merge of
                                effectivePriorAccSymGroups with currAccSymGroups.
                             */

                            var prevExplicitAccSyms = accidentalState[lineNum];
                            var prevExplicitAccSyms = accidentalSymbolsFromHash(prevExplicitAccSyms);
                            /** @type {?AccidentalSymbols[]} */
                            var effectivePriorAccSymGroups = null;

                            if (prevExplicitAccSyms == null) {
                                effectivePriorAccSymGroups = keySigSymGroups;
                            } else if (keySigSymGroups == null) {
                                effectivePriorAccSymGroups = deconstructSymbolGroups(prevExplicitAccSyms, tuningConfig);
                            } else {
                                var prevExplicitAccSymGroups = deconstructSymbolGroups(prevExplicitAccSyms, tuningConfig);
                                effectivePriorAccSymGroups = mergeAccidentalSymbolGroups(
                                    keySigSymGroups, prevExplicitAccSymGroups, true
                                );
                            }

                            /** @type {AccidentalSymbols[]} */
                            // log('current accSyms: ' + JSON.stringify(accSyms));
                            var currAccSymGroups = deconstructSymbolGroups(accSyms, tuningConfig);

                            // If prior symbol groups array is null or contains empty symbol groups,
                            // we populate it the groups' respective naturalizing symbols.
                            //
                            // If current symbol group is empty but prior is not, the prior group's
                            // symbols carries over to the current symbol group, (or naturalizing
                            // symbol if prior has no symbols)

                            if (effectivePriorAccSymGroups == null) {
                                effectivePriorAccSymGroups = []; // now it is non-null.
                                for (var grpIdx = 0; grpIdx < tuningConfig.independentSymbolGroups.length; grpIdx++) {
                                    effectivePriorAccSymGroups.push({});
                                }
                            }

                            for (var grpIdx = 0; grpIdx < currAccSymGroups.length; grpIdx++) {
                                var effectivePriorGroup = effectivePriorAccSymGroups[grpIdx];
                                var grpNaturalizingSym = tuningConfig.symbolGroupNaturalizingLookup[grpIdx];
                                if (Object.keys(effectivePriorGroup).length == 0) {
                                    effectivePriorGroup[grpNaturalizingSym] = 1;
                                }
                                var currSymKeys = Object.keys(currAccSymGroups[grpIdx]);
                                if (currSymKeys.length == 0) {
                                    currAccSymGroups[grpIdx] = effectivePriorGroup;
                                }
                                for (var symIdx = 0; symIdx < currSymKeys.length; symIdx++) {
                                    var symKey = currSymKeys[symIdx];
                                    if (tuningConfig.symbolGroupNaturalizingLookupIdx[symKey] != undefined) {
                                        // Even if multiple naturalizing symbols are registered on
                                        // the note, only accept one symbol --- naturalizing
                                        // accidentals should not be stacked.
                                        currAccSymGroups[grpIdx][symKey] = 1;
                                    }
                                }
                            }

                            log('effectivePriorAccSymGroups: ' + JSON.stringify(effectivePriorAccSymGroups)
                                + ', currAccSymGroups: ' + JSON.stringify(currAccSymGroups)
                                + ', keySig: ' + JSON.stringify(keySig) + ', nominal: ' + nominal);

                            var blacklistSymbols = {};
                            var hasBlacklist = false;
                            for (var grpIdx = 0; grpIdx < tuningConfig.independentSymbolGroups.length; grpIdx++) {
                                var priorGroup = effectivePriorAccSymGroups ? effectivePriorAccSymGroups[grpIdx] : null;

                                if (Object.keys(currAccSymGroups[grpIdx]).length > 0
                                    && isAccidentalSymbolsEqual(priorGroup, currAccSymGroups[grpIdx])) {
                                    // Redundant symbol group found.
                                    log('Blacklisted accidental group: ' + grpIdx + ', symbols: ' + JSON.stringify(currAccSymGroups[grpIdx]));
                                    var symKeys = Object.keys(currAccSymGroups[grpIdx]);
                                    for (var symIdx = 0; symIdx < symKeys.length; symIdx++) {
                                        blacklistSymbols[symKeys[symIdx]] = true;
                                        hasBlacklist = true;
                                    }
                                    /*
                                        Don't worry if we blacklist a naturalizing symbol that's not
                                        actually on the note, nothing bad will happen as long as we
                                        don't use the blacklist as a whitelist.
                                     */
                                }
                            }

                            if (hasBlacklist) {
                                log('Has blacklistSymbols: ' + JSON.stringify(blacklistSymbols));
                                // Reconstruct accidental symbols. TODO: Check if reusing barState
                                // is ok, even though we are deleting some symbols.
                                var noteData = readNoteData(msNote, tuningConfig, keySig, tickOfThisBar, tickOfNextBar, cursor, barState);
                                var newAccSyms = [];
                                log('secondaryAccSyms: ' + JSON.stringify(noteData.secondaryAccSyms));
                                for (var symIdx = 0; symIdx < noteData.secondaryAccSyms.length; symIdx++) {
                                    if (!blacklistSymbols[noteData.secondaryAccSyms[symIdx]]) {
                                        newAccSyms.push(noteData.secondaryAccSyms[symIdx]);
                                    }
                                }
                                for (var symIdx = 0; symIdx < noteData.xen.orderedSymbols.length; symIdx++) {
                                    if (!blacklistSymbols[noteData.xen.orderedSymbols[symIdx]]) {
                                        newAccSyms.push(noteData.xen.orderedSymbols[symIdx]);
                                    }
                                }
                                log('Reconstructed accidental symbols: ' + JSON.stringify(newAccSyms));
                                setAccidental(msNote.internalNote, newAccSyms, newElement, tuningConfig);
                            }

                            // LEGACY impl before symbol groups:

                            // var accHash = accidentalsHash(accSyms);
                            // var isNatural = containsOnlyNaturalizingSymbols(accSyms, tuningConfig);

                            // // we found an explicit accidental on this note.
                            // // check if we really need it or not.

                            // if (prevExplicitAccSyms && prevExplicitAccSyms == accHash) {
                            //     // if the exact same accidental hash is found on the
                            //     // accidental state and this note, this note's
                            //     // accidental is redundant. Remove it.
                            //     log('Removed redundant acc (state): ' + accHash);
                            //     setAccidental(msNote.internalNote, null, newElement, tuningConfig);
                            //     continue;
                            // }

                            // if (!prevExplicitAccSyms && keySig) {
                            //     // If no prior accidentals before this note, and
                            //     // this note matches KeySig, this note's acc
                            //     // is also redundant. Remove.

                            //     var realKeySig = removeUnusedSymbols(keySig[nominal], tuningConfig) || '';
                            //     log('realKeySig: ' + realKeySig);
                            //     if (realKeySig == accHash) {
                            //         log('Removed redundant acc (keysig): ' + accHash);
                            //         setAccidental(msNote.internalNote, null, newElement, tuningConfig);
                            //         continue;
                            //     }
                            // }

                            // if (isNatural && !prevExplicitAccSyms && (!keySig || !keySig[nominal])) {
                            //     // This note has a natural accidental, but it is not
                            //     // needed, since the prior accidental state/key sig is natural.
                            //     log('Removed redundant acc (nat): ' + accHash);
                            //     setAccidental(msNote.internalNote, null, newElement, tuningConfig);
                            //     continue;
                            // }

                            // Update accidentalState based on merging symbol groups

                            var currEffectiveAccSymGroups = mergeAccidentalSymbolGroups(effectivePriorAccSymGroups, currAccSymGroups, false);

                            accidentalState[lineNum] = accidentalsHash(currEffectiveAccSymGroups);
                        }
                    }
                }
            }
        }


        // go next bar
        tickOfThisBar = tickOfNextBar;
    }
}

/**
 * Checks if two intervals on a number line overlap/touch
 * each other.
 *
 * E.g. [1, 3] and [2, 4] overlap, but [1, 2] and [2, 3] do not.
 *
 * @param {number} a1 Start of first interval
 * @param {number} a2 End of first interval
 * @param {number} b1 Start of second interval
 * @param {number} b2 End of second interval
 * @returns {boolean} `true` if intervals overlap, `false` otherwise.
 */
function intervalOverlap(a1, a2, b1, b2) {
    // log('intervalOverlap(' + a1 + ', ' + a2 + ', ' + b1 + ', ' + b2 + ')');
    return (a1 - b2) * (a2 - b1) <= 0;
}


/**
 * Reads notes in a Bar according to {@link Chords} structure.
 *
 * Each {@link Chords} object represents the chords (+ grace chords) available
 * at a given tick for all voices.
 *
 * @param {number} tickOfThisBar
 * @param {number | -1 | null} tickOfNextBar
 * @param {Cursor} cursor MuseScore cursor object
 *
 * @returns {Object.<number, Chords>}
 *  A mapping of `Chords` objects indexed by tick position.
 */
function partitionChords(tickOfThisBar, tickOfNextBar, cursor) {
    // log('partitionChords(' + tickOfThisBar + ', ' + tickOfNextBar + ')');

    var ogCursorPos = saveCursorPosition(cursor);

    if (tickOfNextBar == null || tickOfNextBar == -1) {
        tickOfNextBar = 1e9;
    }

    // mapping of ticks to Chords objects.
    /** @type {Object.<number, Chords>} */
    var chordsPerTick = {};

    // Loop all 4 voices to populate notes map

    for (var voice = 0; voice < 4; voice++) {
        setCursorToPosition(cursor, tickOfThisBar, voice, ogCursorPos.staffIdx);

        while (cursor.segment && cursor.tick < tickOfNextBar) {
            if (cursor.element && cursor.element.name == "Chord") {
                var notes = cursor.element.notes;
                var graceChords = cursor.element.graceNotes;
                var currTick = cursor.tick;

                if (!chordsPerTick[currTick]) {
                    chordsPerTick[currTick] = [[], [], [], []];
                }

                // Move right-to-left. Start with the rightmost main chord.

                var listOfNotes = [];
                for (var i = 0; i < notes.length; i++) {
                    listOfNotes.push(notes[i]);
                }
                chordsPerTick[currTick][voice].push(listOfNotes);

                // Then add grace notes to the list in right-to-left order.

                for (var i = graceChords.length - 1; i >= 0; i--) {
                    var graceNotes = graceChords[i].notes;

                    var listOfNotes = [];

                    for (var j = 0; j < graceNotes.length; j++) {
                        listOfNotes.push(graceNotes[j]);
                    }
                    chordsPerTick[currTick][voice].push(listOfNotes);
                }
            }

            cursor.next();
        }
    }

    restoreCursorPosition(ogCursorPos);

    return chordsPerTick;
}

/**
 * Retrieves custom position & size offsets (according to {@link Lookup.SYMBOL_LAYOUT}
 * or {@link Lookup.ASCII_LAYOUT}) of an accidental symbol/fingering element respectively.
 *
 * @param {PluginAPIElement} elem Symbol or fingering element
 *
 * @param {boolean} staffLineIntersectsNote
 * `true` if the note is a 'line note' (EGBDF treble clef).
 *
 * `false` if the note is a 'space note' (FACE treble clef).
 *
 * @returns {{
 *  additionalXOffset: number,
 *  additionalYOffset: number,
 *  halfAddWidth: number,
 *  halfAddHeight: number
 * }}
 *
 * `additionalXOffset` and `additionalYOffset` are X and Y position offsets,
 * (X offset will affect push-back of further-left symbols)
 *
 * `halfAddWidth` and `halfAddHeight` are half the additional width and height
 * specified to apply to the {@link PluginAPIElement.bbox} property, such that
 * the rectangular bounds are expanded centrally (half the additional width/height each).
 *
 * If no custom offsets are found, all values are 0, signifying no deviation from
 * standard auto-positioning.
 */
function retrieveCustomOffsets(elem, staffLineIntersectsNote) {
    var offsets = {
        additionalXOffset: 0,
        additionalYOffset: 0,
        halfAddWidth: 0,
        halfAddHeight: 0
    };

    var lookupMapping;
    var key;

    if (elem.symbol) {
        lookupMapping = Lookup.SYMBOL_LAYOUT;
        key = elem.symbol.toString();
    } else if (elem.name == 'Fingering') {
        lookupMapping = Lookup.ASCII_LAYOUT;
        key = removeFormattingCode(elem.text);
    } else {
        return offsets;
    }

    var quartupletOffsets = lookupMapping[key] && lookupMapping[key][staffLineIntersectsNote ? 1 : 0];

    if (!quartupletOffsets) {
        return offsets;
    }

    return {
        additionalXOffset: quartupletOffsets[0],
        additionalYOffset: quartupletOffsets[1],
        halfAddWidth: quartupletOffsets[2],
        halfAddHeight: quartupletOffsets[3]
    };
}

/**
 * Positions accidental symbols for all voices' chords that are to be
 * vertically-aligned.
 *
 * Uses the [zig-zag algorithm](https://musescore.org/en/node/25055) to auto-position symbols.
 *
 * Also positions text-based accidentals to the left of any other accidental symbols, treating it
 * as if it were an accidental symbol.
 *
 * returns the largest (negative) distance between the left-most symbol the notehead
 * it is attached to. This returned value will decide how much should
 * grace chords be pushed back.
 *
 * **IMPORTANT**: `chord` is NOT the wrapped {@link PluginAPIChord} plugin object.
 * It is a list of unwrapped {@link PluginAPINote} objects!
 *
 * @param {PluginAPINote[]} chord Notes from all voices at a single tick & vertical-chord position.
 * @param {TuningConfig} tuningConfig
 * @returns {number} most negative distance between left-most symbol and left-most notehead.
 */
function positionAccSymbolsOfChord(chord, tuningConfig) {

    // First, we need to sort the chord by increasing line number. (top-to-bottom)
    chord.sort(function (a, b) { return a.line - b.line });

    // log("chord.length: " + chord.length);
    // chord.forEach(function(n) { log("HALLO: " + Object.keys(n)); });

    // Then, we create two indices, one ascending and one descending.
    // This is to accomplish zigzag pattern.

    var ascIdx = 0;
    var descIdx = chord.length - 1;

    var mostNegativeDistance = 0;

    // zig means use ascending index (top note)
    // zag means use descending index (bottom note)
    var isZig = true;

    // contains absolute bboxes of already positioned elements.
    // this is what we check against to prevent collision within this
    // vertical-stack.

    // This list is to be kept sorted by decreasing x position.
    // (right to left).
    var positionedElemsBbox = [];

    // first we populate the positioned elems with noteheads. The positions
    // of noteheads are all fixed relative to the chord segment.

    chord.forEach(function (note) {
        // log('noteline: ' + note.line);
        positionedElemsBbox.push(
            {
                left: note.pagePos.x + note.bbox.left - ACC_NOTESPACE,
                right: note.pagePos.x + note.bbox.right,
                top: note.pagePos.y + note.bbox.top,
                bottom: note.pagePos.y + note.bbox.bottom
            }
        );
    });

    // then we sort the bboxes by decreasing x position.

    positionedElemsBbox.sort(function (a, b) { return b.left - a.left });

    // stores positions of positioned symbols to be updated all at once at the end.
    /**
     * @type {{
     *  elem: PluginAPIElement,
     *  x: number,
     *  y: number
     * }[]}
     */
    var registeredSymbolOffsets = [];

    var count = 0;
    while (count++ < chord.length) {
        // Iterate notes in chord in zig zag pattern.

        // log(count + ') posElemsBbox: ' + JSON.stringify(positionedElemsBbox.map(function (bbox) {
        //     return bbox.left;
        // })));
        var note = chord[isZig ? ascIdx : descIdx];

        /**
         * If `true`, staff line intersects the notehead (E G B D F treble clef).
         */
        var staffLineIntersectsNote = (note.line % 2 === 0);
        // for some NONSENSE reason, x % 2 == 0 always returns true, but x % 2 === 0 checks isEven.
        // log('staffLineIntersectsNote: ' + staffLineIntersectsNote + ', line: ' + note.line + ', mod 2: ' + (note.line % 2));

        // var absNoteBbox = {
        //     left: note.pagePos.x + note.bbox.left,
        //     right: note.pagePos.x + note.bbox.right,
        //     top: note.pagePos.y + note.bbox.top,
        //     bottom: note.pagePos.y + note.bbox.bottom
        // };

        var accSymbolsRTL = []; // right-to-left

        // We treat all the symbols to be attached as one big symbol with a bounding box
        // that encapsulates all the bounding boxes of the symbols.

        // total amount of sp used by all symbols attached to this notehead.
        var symbolsWidth = 0;
        // top most absolute position of top bbox of symbols
        var symbolsTop = 1e7;
        // bottom most abs pos of bottom bbox of symbols
        var symbolsBottom = -1e7;

        // stores list of all accidental symbols attached to this notehead.
        for (var i = 0; i < note.elements.length; i++) {
            var elem = note.elements[i];
            var isAccSym = false;
            // log(JSON.stringify(elem.bbox));
            if (elem.symbol) {
                var symCode = Lookup.LABELS_TO_CODE[elem.symbol.toString()];
                if (symCode && (tuningConfig.usedSymbols[symCode]
                    || tuningConfig.usedSecondarySymbols[symCode])) {
                    isAccSym = true;
                }
            } else if (elem.name && elem.name == 'Fingering' &&
                elem.z >= 1000 && elem.z <= 2000) {
                // Found ASCII accidental symbols implemented as fingerings.
                isAccSym = true;
            }

            if (isAccSym) {
                accSymbolsRTL.push(elem);
                var cusOff = retrieveCustomOffsets(elem, staffLineIntersectsNote);

                symbolsWidth += elem.bbox.right - elem.bbox.left + cusOff.halfAddWidth * 2;

                var absTopPos, absBottomPos;
                if (elem.name == 'Fingering') {
                    // When fingerings are just created, they are above the notehead, meaning that
                    // we can't use the current Y position of the fingering to determine
                    // whether it will vertically collide with said note.
                    // Instead, we use the Y positions of the notehead as a guideline.

                    // We assume that the tallest symbol will protrude the notehead height by
                    // +/- 0.5sp. (pipe symbol |).
                    // This is a very conservative estimate and may cause wasted space.

                    absTopPos = note.pagePos.y + note.bbox.top - 0.5;
                    absBottomPos = note.pagePos.y + note.bbox.bottom + 0.5;
                } else {
                    absTopPos = elem.pagePos.y + elem.bbox.top;
                    absBottomPos = elem.pagePos.y + elem.bbox.bottom;
                }
                // apply custom offsets
                absTopPos += cusOff.additionalYOffset - cusOff.halfAddHeight;
                absBottomPos += cusOff.additionalYOffset + cusOff.halfAddHeight;

                if (absTopPos < symbolsTop) {
                    symbolsTop = absTopPos;
                }
                if (absBottomPos > symbolsBottom) {
                    symbolsBottom = absBottomPos;
                }
            }
        }

        // Symbols on the right have lower z index.
        accSymbolsRTL.sort(function (a, b) { return a.z - b.z });


        if (accSymbolsRTL.length != 0) {
            // Found acc symbols to position on this note.

            // Now that we have the list of symbols to add to this notehead,
            // we need to find holes in the positionedElemsBbox list to insert them.

            var prevElemLeft = null;
            for (var i = 0; i < positionedElemsBbox.length; i++) {
                var bbox = positionedElemsBbox[i];
                var willCollideVertically = intervalOverlap(bbox.top, bbox.bottom, symbolsTop, symbolsBottom);

                // log('check bbox: ' + bbox.left + ', willCollideVertically: ' + willCollideVertically);
                if (!willCollideVertically) continue;

                if (prevElemLeft == null) {
                    prevElemLeft = bbox.left;
                    continue;
                }

                var gapWidth = prevElemLeft - bbox.right;

                prevElemLeft = bbox.left; // absolute x left pos of positioned bbox.

                if (gapWidth >= symbolsWidth && prevElemLeft <= note.pagePos.x) {
                    // log('gapWidth: ' + gapWidth + ', symbolsWidth: ' + symbolsWidth + ', prevElemLeft: ' + prevElemLeft + ', note.pagePos.x: ' + note.pagePos.x);
                    // the symbols can be added in this gap.
                    // exit loop. prevElemLeft now contains the absolute position
                    // to put the right most symbol.
                    break;
                }
            }

            // The above loop will stop once a hole has been found, or once
            // all elements have been looped and no holes are found.
            // At this point, prevElemLeft contains the absolute X position that the
            // 'hole' begins and expands leftward, which is the absolute left bbox
            // of the leftmost element before the 'hole' starts.

            // In case none of the symbols vertically intersects with any existing positioned
            // bbox (perhaps this symbol has specific overrides to be positioned atop a notehead),
            // we assume that prevX is 0sp by default.

            if (prevElemLeft == null) {
                console.warn('WARNING: Symbol does not vertically intersect with any positioned elements, setting ' +
                    'x offset to 0.');
            }

            // prevX is the relative offset to assign to the curr symbol.
            var prevX = prevElemLeft != null ? (prevElemLeft - note.pagePos.x) : 0;

            accSymbolsRTL.forEach(function (elem) {
                var cusOff = retrieveCustomOffsets(elem, staffLineIntersectsNote);
                var actualSymWidth = elem.bbox.right - elem.bbox.left;
                var effectiveSymWidth = actualSymWidth + cusOff.halfAddWidth * 2 + ACC_SPACE;
                var spaceCentralizationOffset = cusOff.halfAddWidth;

                if (effectiveSymWidth < MIN_ACC_WIDTH) {
                    spaceCentralizationOffset += (MIN_ACC_WIDTH - effectiveSymWidth) / 2;
                    effectiveSymWidth = MIN_ACC_WIDTH;
                }

                var offX = prevX - effectiveSymWidth + cusOff.additionalXOffset;
                var offY = cusOff.additionalYOffset;
                // log('offX: ' + offX);
                registeredSymbolOffsets.push({
                    elem: elem,
                    x: offX + spaceCentralizationOffset,
                    y: offY
                });

                if (offX < mostNegativeDistance) {
                    mostNegativeDistance = offX;
                }

                // create abs bbox for newly positioned symbol
                var symBbox = {
                    left: note.pagePos.x + elem.bbox.left + offX - cusOff.halfAddWidth,
                    right: note.pagePos.x + elem.bbox.right + offX + cusOff.halfAddWidth,
                    top: note.pagePos.y + elem.bbox.top + offY - cusOff.halfAddHeight,
                    bottom: note.pagePos.y + elem.bbox.bottom + offY + cusOff.halfAddHeight
                };

                // find index to insert symBbox into positioned elements.

                var insertIdx = positionedElemsBbox.length;
                for (var j = 0; j < positionedElemsBbox.length; j++) {
                    if (positionedElemsBbox[j].left < symBbox.left) {
                        insertIdx = j;
                        break;
                    }
                }

                // Mark symbol as positioned.
                positionedElemsBbox.splice(insertIdx, 0, symBbox);

                prevX = offX;
            });
        }


        if (isZig) {
            ascIdx++;
        } else {
            descIdx--;
        }
        isZig = !isZig;
    } // finish registering positions

    // log(count + ') posElemsBbox: ' + JSON.stringify(positionedElemsBbox.map(function (bbox) {
    //     return bbox.left;
    // })));

    // Now, we need to apply the offsets

    registeredSymbolOffsets.forEach(function (symOff) {
        if (symOff.elem.name == 'Fingering') {
            // because the HEWM accidental has autoplace on,
            // the offsetX needs to be further left.
            // TODO: Check if there's some kind of Score Formatting rules that
            //       affects this offset. It can't possibly be alright to hardcode this.

            // LEGACY: "Fingering" subStyle (33) is offset weirdly. Use User-1 (45)
            // symOff.elem.offsetX = symOff.x - 0.65;

            symOff.elem.offsetX = symOff.x;
        } else {
            symOff.elem.offsetX = symOff.x;
        }
        symOff.elem.offsetY = symOff.y;
    });

    return mostNegativeDistance;
}

/**
 * Automatically positions accidentals in a staff within specified
 * selection range.
 *
 * @param {number} startTick Tick inside first bar of selection
 * @param {number} endTick Tick inside last bar of selection. If -1, performs operation
 *  till the end of the score.
 * @param {number[]} bars List of ticks of bars.
 * @param {Cursor} cursor MuseScore cursor object
 * @param {number?} firstBarTickIndex
 * Pre-calculated {@link getBarBoundaries} output to reduce repeated computation.
 * If provided, {@link startTick} will be ignored.
 * @param {number?} lastBarTickIndex
 * Pre-calculated {@link getBarBoundaries} output to reduce repeated computation.
 * If provided, {@link endTick} will be ignored.
 */
function autoPositionAccidentals(startTick, endTick, parms, cursor, firstBarTickIndex, lastBarTickIndex) {
    var bars = parms.bars;
    var staff = cursor.staffIdx;

    var lastBarTickIndex = lastBarTickIndex || getBarBoundaries(endTick, bars, true)[1]; // if -1, means its the last bar of score
    var firstBarTickIndex = firstBarTickIndex || getBarBoundaries(startTick, bars, true)[0];

    if (lastBarTickIndex == -1) {
        lastBarTickIndex = bars.length - 1;
    }

    var tickOfThisBar = bars[firstBarTickIndex];

    log('autoPosition(' + startTick + ', ' + endTick + ') from bar '
        + firstBarTickIndex + ' (' + tickOfThisBar + ') to ' + lastBarTickIndex);

    // Repeat procedure for 1 bar at a time.

    for (var barIdx = firstBarTickIndex; barIdx <= lastBarTickIndex; barIdx++) {

        var tickOfNextBar;
        if (barIdx == bars.length - 1) {
            tickOfNextBar = -1;
        } else {
            tickOfNextBar = bars[barIdx + 1];
        }

        // Don't modify parms. Create a fake parms to store current
        // configs applied at this bar.
        var fakeParms = {};
        resetParms(fakeParms);

        for (var i = 0; i < parms.staffConfigs[staff].length; i++) {
            var config = parms.staffConfigs[staff][i];
            if (config.tick <= tickOfThisBar) {
                config.config(fakeParms);
            }
        }

        // mapping of ticks to Chords object of all chords present at that tick.
        var chordsByTick = partitionChords(tickOfThisBar, tickOfNextBar, cursor);
        var ticks = Object.keys(chordsByTick);

        // log('auto positioning from ' + tickOfThisBar + ' to ' + tickOfNextBar +
        //     '\nTicks found: ' + ticks.join(', '));

        ticks.forEach(function (tick) {
            /**
             * @type {Chords}
             */
            var chords = chordsByTick[tick];

            // One vert stack = all chords at a tick that should be
            // more or less aligned vertically.

            // The 0th vert stack represent the main chord.
            // 1st = right most grace chord
            // etc..
            var vertStackIndex = 0;

            // keeps track of how far back to push the grace chords.
            var graceOffset = 0;

            while (true) {
                // Loop through each vert stack startng with main chord
                // followed by grace chords right to left.

                // contains array of Note elements
                // for all voices, at this tick.
                var vertStack = [];
                for (var voice = 0; voice <= 3; voice++) {
                    // log('num chords in voice ' + voice + ': ' + chords[voice].length);
                    var chord = chords[voice][vertStackIndex]; // [Note]
                    if (!chord) {
                        // log('no chord in voice ' + voice + ' at vertStackIndex ' + vertStackIndex);
                        continue;
                    }

                    if (chord.length == 0) {
                        // log('chord no notes');
                        continue;
                    }

                    // log('num notes in chord: ' + chord.length);

                    // At the same time, we need to push back the chord
                    // by graceOffset, so that the symbols that were just
                    // don't overlap with the noteheads of this chord.

                    // chdElement contains one of the notes of the chord.
                    // We use this to get the parent MScore Chord element
                    // so that we can push it back.
                    var chdElement = chord[0];

                    if (!chdElement) {
                        // this shouldn't happen...
                        console.error("ERROR: chord object is present but no note inside!");
                        continue;
                    }

                    if (chdElement.parent.name != "Chord") {
                        console.error("ERROR: parent of note object isn't a chord??");
                        continue;
                    }

                    chdElement.parent.offsetX = graceOffset;
                    // log('applied grace chord offset: ' + graceOffset);

                    vertStack = vertStack.concat(chord);
                }

                // log('vertStack.length: ' + vertStack.length);
                // log('vertStack[0]: ' + vertStack[0]);

                // If no more chords at this vert stack index,
                // finish.
                if (vertStack.length == 0) break;

                // Now, we have all notes that should be vertically aligned.
                // Position symbols for this vert stack.
                // log(vertStack.length);
                var biggestXOffset = positionAccSymbolsOfChord(vertStack, fakeParms.currTuning);

                graceOffset += biggestXOffset;

                vertStackIndex++;
            }
        });

        tickOfThisBar = tickOfNextBar;
    }
}

/**
 *
 * @param {boolean} isSteps `true` to display steps info, `false` to display cents data
 * @param {PluginAPINote} note
 * @param {KeySig} keySig
 * @param {TuningConfig} tuningConfig
 * @param {number} tickOfThisBar
 * @param {number} tickOfNextBar
 * @param {Cursor} cursor
 * @param {BarState?} reusedBarState
 * @param {newElement} newElement
 */
function addStepsCentsFingering(
    isSteps, note, keySig, tuningConfig, tickOfThisBar, tickOfNextBar,
    cursor, reusedBarState, newElement) {

    var noteData = parseNote(note, tuningConfig, keySig,
        tickOfThisBar, tickOfNextBar, cursor, newElement, reusedBarState);

    // Nominal index of the relative reference note.
    var relRefNominal = mod(tuningConfig.relativeTuningNominal, tuningConfig.numNominals);
    var relRefOctOffset = Math.floor(tuningConfig.relativeTuningNominal / tuningConfig.numNominals);
    var relRefCentsFromAbsRef = tuningConfig.nominals[relRefNominal] + relRefOctOffset * tuningConfig.equaveSize;
    var absRefCentsFromA440 = 1200 * Math.log(tuningConfig.tuningFreq / 440) / Math.log(2);
    var relRefCentsFromA440 = relRefCentsFromAbsRef + absRefCentsFromA440;

    if (isSteps && tuningConfig.displaySteps != null) {
        // Create steps info fingering.
        var steps = 0;

        if (tuningConfig.stepsList.length == tuningConfig.displaySteps
            && noteData.secondaryAccSyms.length == 0) {
            // Use steps lookup table to get the edo/neji step

            // Reference nominal doubles as XenNote hash.
            var referenceSteps = tuningConfig.stepsLookup[relRefNominal];
            var currNoteSteps = tuningConfig.stepsLookup[noteData.xen.hash];
            steps = mod(currNoteSteps - referenceSteps, tuningConfig.displaySteps);
        } else {
            // Use cents offset to calculate edosteps.
            var centsFromA440 = calcCentsOffset(noteData, tuningConfig, true);
            var centsFromRef = centsFromA440 - relRefCentsFromA440;
            steps = mod(
                Math.round(centsFromRef / tuningConfig.equaveSize * tuningConfig.displaySteps),
                tuningConfig.displaySteps);
        }

        // Remove prior steps display fingerings.

        var elemsToRemove = [];
        for (var i = 0; i < note.elements.length; i++) {
            var elem = note.elements[i];
            if (elem.name == 'Fingering' && elem.z == STEPS_DISPLAY_FINGERING_Z) {
                // This fingering is an accidental symbol, remove it.
                elemsToRemove.push(elem);
            }
        }
        elemsToRemove.forEach(function (elem) {
            note.remove(elem);
        });

        var elem = newElement(Element.FINGERING);
        note.add(elem);
        elem.text = escapeHTML(steps.toString());
        /*  Autoplace is required for this accidental to push back prior
            segments. */
        elem.autoplace = true;
        elem.fontSize = STEPS_DISPLAY_FONT_SIZE;
        elem.placement = tuningConfig.displayStepsPosition == 'above' ?
            Placement.ABOVE : Placement.BELOW;
        elem.z = STEPS_DISPLAY_FINGERING_Z;
        return;
    }

    if (!isSteps) {
        // Create cents info fingering.
        var cents = 0;
        var centsText = '';

        var centsFromA440 = calcCentsOffset(noteData, tuningConfig, true);

        var precisionMult = Math.pow(10, tuningConfig.displayCentsPrecision);

        if (tuningConfig.displayCentsReference == 'absolute') {
            var centsFromRef = centsFromA440 - relRefCentsFromA440;
            var centsFromEquave = mod(centsFromRef, tuningConfig.equaveSize);
            cents = Math.round(centsFromEquave * precisionMult)
                / precisionMult;
        } else if (tuningConfig.displayCentsReference == 'nominal') {
            var nomCentsFromA440 =
                absRefCentsFromA440
                + tuningConfig.nominals[noteData.xen.nominal]
                + noteData.equaves * tuningConfig.equaveSize;
            var centsFromNom = centsFromA440 - nomCentsFromA440;
            cents = Math.round(centsFromNom * precisionMult)
                / precisionMult;
            if (cents >= 0) {
                centsText = '+';
            }
        } else if (tuningConfig.displayCentsReference == 'semitone') {
            var centsFromRef = centsFromA440 - relRefCentsFromA440;
            var centsModSemitone = mod(centsFromRef + 49.99999999, 100) - 49.99999999;
            cents = Math.round(centsModSemitone * precisionMult)
                / precisionMult;
            if (cents >= 0) {
                centsText = '+';
            }
        }

        centsText += cents
            .toFixed(tuningConfig.displayCentsPrecision);

        // Remove prior steps display fingerings.

        var elemsToRemove = [];
        for (var i = 0; i < note.elements.length; i++) {
            var elem = note.elements[i];
            if (elem.name == 'Fingering' && elem.z == CENTS_DISPLAY_FINGERING_Z) {
                // This fingering is an accidental symbol, remove it.
                elemsToRemove.push(elem);
            }
        }
        elemsToRemove.forEach(function (elem) {
            note.remove(elem);
        });

        var elem = newElement(Element.FINGERING);
        note.add(elem);
        elem.text = escapeHTML(centsText);
        /*  Autoplace is required for this accidental to push back prior
            segments. */
        elem.autoplace = true;
        elem.fontSize = CENTS_DISPLAY_FONT_SIZE;
        elem.placement = tuningConfig.displayCentsPosition == 'above' ?
            Placement.ABOVE : Placement.BELOW;
        elem.z = CENTS_DISPLAY_FINGERING_Z;
        return;
    }
}

/**
 * Set whether or not to allow up/down fallthrough.
 *
 * If Element.STAFF_TEXT or Element.SYSTEM_TEXT is selected
 *
 * @param {boolean} allowFallthrough Whether or not `cmd('pitch-up/down')` should be sent
 */
function setUpDownFallthrough(allowFallthrough) {
    fallthroughUpDownCommand = allowFallthrough;
}

/*
==============================================================================================



 ██████╗ ██████╗ ███╗   ███╗███╗   ███╗ █████╗ ███╗   ██╗██████╗ ███████╗
██╔════╝██╔═══██╗████╗ ████║████╗ ████║██╔══██╗████╗  ██║██╔══██╗██╔════╝
██║     ██║   ██║██╔████╔██║██╔████╔██║███████║██╔██╗ ██║██║  ██║███████╗
██║     ██║   ██║██║╚██╔╝██║██║╚██╔╝██║██╔══██║██║╚██╗██║██║  ██║╚════██║
╚██████╗╚██████╔╝██║ ╚═╝ ██║██║ ╚═╝ ██║██║  ██║██║ ╚████║██████╔╝███████║
 ╚═════╝ ╚═════╝ ╚═╝     ╚═╝╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═════╝ ╚══════╝


The main plugin functions are moved here.

Instead of having one plugin per operation, the plugin is now one single dockable window
that runs in the background. This plugin detects shortcuts according to the shortcut
settings in xen tuner.qml.

================================================================================================
*/

/**
 * Tunes selected notes or entire score.
 *
 * Optionally, will create fingerings that display the current cents or steps offset
 * of tuned notes.
 *
 * @param {1|2|null} display
 * If `1`, create fingerings to display the cent offsets of notes according
 * to the `displaycents()` settings specified in the tuning config.
 * If `2`, create fingerings to display step indices of notes according
 * to `displaysteps()` settings specified in the tuning config.
 * @returns
 */
function operationTune(display) {
    log('Running Xen Tune');
    if (typeof _curScore === 'undefined')
        return;

    /** @type {Parms} */
    var parms = {};
    _curScore.createPlayEvents();

    var cursor = _curScore.newCursor();
    cursor.rewind(1);
    var startStaff;
    var endStaff;
    var startTick = cursor.tick;
    var endTick;
    var fullScore = false;
    if (!cursor.segment) { // no selection
        fullScore = true;
        startStaff = 0; // start with 1st staff
        endStaff = _curScore.nstaves - 1; // and end with last
        endTick = _curScore.lastSegment.tick + 1;
    } else {
        startStaff = cursor.staffIdx;
        cursor.rewind(2);
        if (cursor.tick == 0) {
            // this happens when the selection includes
            // the last measure of the score.
            // rewind(2) goes behind the last segment (where
            // there's none) and sets tick=0
            endTick = _curScore.lastSegment.tick + 1;
        } else {
            endTick = cursor.tick;
        }
        endStaff = cursor.staffIdx;
    }
    log("startStaff: " + startStaff + ", endStaff: " + endStaff + ", endTick: " + endTick);

    //
    //
    //
    // -------------- Actual thing here -----------------------
    //
    //
    //

    // Set parms' defaults.

    // mapping of staffIdx to [ConfigUpdateEvent]
    parms.staffConfigs = {};
    // contains list of bars' ticks in order.
    parms.bars = [];


    // First, populate ConfigUpdateEvents for each staff.

    for (var staff = startStaff; staff <= endStaff; staff++) {

        // Contains [ConfigUpdateEvent]s for curr staff
        var configs = [];

        // Search each voice and populate `ConfigUpdateEvent`s in this staff.
        for (var voice = 0; voice < 4; voice++) {

            // NOTE: THIS IS THE ONLY RIGHT WAY (TM) TO REWIND THE CURSOR TO THE START OF THE SCORE.
            //       ANY OTHER METHOD WOULD RESULT IN CATASTROPHIC FAILURE FOR WHATEVER REASON.
            cursor.rewind(1);
            cursor.voice = voice;
            cursor.staffIdx = staff;
            cursor.rewind(0);

            var measureCount = 0;
            // log("Populating configs. staff: " + staff + ", voice: " + voice);

            while (true) {
                // loop from first segment to last segment of this staff+voice.
                if (cursor.segment) {
                    for (var i = 0; i < cursor.segment.annotations.length; i++) {
                        var annotation = cursor.segment.annotations[i];
                        log("found annotation type: " + annotation.name);
                        if ((annotation.name == 'StaffText' && Math.floor(annotation.track / 4) == staff) ||
                            (annotation.name == 'SystemText')) {
                            var maybeConfigUpdateEvent = parsePossibleConfigs(annotation.text, cursor.tick);

                            if (maybeConfigUpdateEvent != null) {
                                configs.push(maybeConfigUpdateEvent);
                            }
                        }
                    }

                    if (cursor.segment.tick == cursor.measure.firstSegment.tick &&
                        voice === 0 && staff == startStaff) {
                        // For the first staff/voice, store tick positions of the start of each bar.
                        // this is used for accidental calculations.

                        parms.bars.push(cursor.segment.tick);
                        measureCount++;
                        // log("New bar - " + measureCount);
                    }
                }

                if (!cursor.next())
                    break;
            }
        }

        parms.staffConfigs[staff] = configs.sort(function (a, b) {
            return a.tick - b.tick;
        });
    }

    // Staff configs have been populated!

    var startBarIdx = getBarBoundaries(startTick, parms.bars, true)[0];
    var endBarIdx = getBarBoundaries(endTick, parms.bars, true)[1];

    // Go through each staff + voice to start tuning notes.

    for (var staff = startStaff; staff <= endStaff; staff++) {

        _curScore.startCmd();

        for (var voice = 0; voice < 4; voice++) {
            // After each voice & rewind,
            // reset all configs back to default
            resetParms(parms);

            // NOTE: FOR WHATEVER REASON, rewind(1) must be called BEFORE assigning voice and staffIdx,
            //       and rewind(0) MUST be called AFTER rewind(1), AND AFTER assigning voice and staffIdx.
            cursor.rewind(1);
            cursor.voice = voice; //voice has to be set after goTo
            cursor.staffIdx = staff;
            cursor.rewind(0);

            // 0-indexed bar counter.
            // Used to keep track of bar boundaries efficiently.
            var currBar = getBarBoundaries(cursor.tick, parms.bars, true)[0];

            var tickOfThisBar = parms.bars[currBar];
            var tickOfNextBar = currBar == parms.bars.length - 1 ? -1 : parms.bars[currBar + 1];

            log("Tuning. staff: " + staff + ", voice: " + voice);
            // log("Starting bar: " + currBar + ", tickOfThisBar: " + tickOfThisBar + ", tickOfNextBar: " + tickOfNextBar);

            // Tuning doesn't affect note/accidental state,
            // we can reuse bar states per bar to prevent unnecessary
            // computation.
            var reusedBarState = {};
            var tickOfLastModified = -1;

            // Loop elements of a voice
            while (cursor.segment && (fullScore || cursor.tick < endTick)) {
                if (tickOfNextBar != -1 && cursor.tick >= tickOfNextBar) {
                    // Update bar boundaries.
                    currBar++;
                    tickOfThisBar = tickOfNextBar;
                    tickOfNextBar = currBar == parms.bars.length - 1 ? -1 : parms.bars[currBar + 1];
                    // log("Next bar: " + currBar + ", tickOfThisBar: " + tickOfThisBar + ", tickOfNextBar: " + tickOfNextBar);
                    // reset bar state.
                    reusedBarState = {};
                }

                // Apply all declared configs up to current cursor position.

                for (var i = 0; i < parms.staffConfigs[staff].length; i++) {
                    var config = parms.staffConfigs[staff][i];
                    if (config.tick <= cursor.tick) {
                        config.config(parms);
                    }
                }

                // Tune the note!

                if (cursor.element) {
                    if (cursor.element.name == "Chord") {
                        var graceChords = cursor.element.graceNotes;
                        for (var i = 0; i < graceChords.length; i++) {
                            // iterate through all grace chords
                            var notes = graceChords[i].notes;
                            for (var j = 0; j < notes.length; j++) {
                                tuneNote(notes[j], parms.currKeySig, parms.currTuning,
                                    tickOfThisBar, tickOfNextBar, cursor, reusedBarState, newElement);
                                if (display) {
                                    addStepsCentsFingering(
                                        display == 2, notes[j], parms.currKeySig, parms.currTuning,
                                        tickOfThisBar, tickOfNextBar, cursor, reusedBarState, newElement);
                                }
                            }
                        }
                        var notes = cursor.element.notes;
                        for (var i = 0; i < notes.length; i++) {
                            tuneNote(notes[i], parms.currKeySig, parms.currTuning,
                                tickOfThisBar, tickOfNextBar, cursor, reusedBarState, newElement);
                            if (display) {
                                addStepsCentsFingering(
                                    display == 2, notes[i], parms.currKeySig, parms.currTuning,
                                    tickOfThisBar, tickOfNextBar, cursor, reusedBarState, newElement);
                            }
                        }

                        tickOfLastModified = cursor.tick;
                    }
                }
                cursor.next();
            }
        } // end of voice loop

        _curScore.endCmd();

        // -----------------------------

        _curScore.startCmd();

        removeUnnecessaryAccidentals(
            startTick, endTick, parms, cursor, newElement, startBarIdx, endBarIdx
        );

        _curScore.endCmd();

        // -----------------------------

        _curScore.startCmd();

        autoPositionAccidentals(
            startTick, endTick, parms, cursor, startBarIdx, endBarIdx
        );

        _curScore.endCmd();
    }
}

/**
 * Operation to transpose according to specified direction & aux
 *
 * @param {number} stepwiseDirection
 *  1: up
 *  0: cycle enharmonics
 *  -1: down
 * @param {number} stepwiseAux
 *  This number represents the 1-index Nth user-declared auxiliary operation.
 *  0 represents no aux, step through all notes.
 *
 *  Auxiliary operations allow the user to declare whether
 *  the nominals, or specified accidental chains, should maintain
 *  the same nominal/degree during the transpose up/down operation.
 */
function operationTranspose(stepwiseDirection, stepwiseAux) {
    log("Xen Up");

    if (typeof _curScore === 'undefined')
        return;

    /** @type {Parms} */
    var parms = {};
    _curScore.createPlayEvents();

    var cursor = _curScore.newCursor();
    cursor.rewind(1);
    var startStaff;
    var endStaff;
    var startTick = cursor.tick;
    var endTick;
    var noPhraseSelection = false;
    if (!cursor.segment) { // no selection
        // no action if no selection.
        log('no phrase selection');
        noPhraseSelection = true;
    } else {
        startStaff = cursor.staffIdx;
        cursor.rewind(2);
        if (cursor.tick == 0) {
            // this happens when the selection includes
            // the last measure of the score.
            // rewind(2) goes behind the last segment (where
            // there's none) and sets tick=0
            endTick = _curScore.lastSegment.tick + 1;
        } else {
            endTick = cursor.tick;
        }
        endStaff = cursor.staffIdx;
    }

    parms.staffConfigs = {};
    parms.bars = [];

    // populate configs for all staves.

    for (var staff = 0; staff < _curScore.nstaves; staff++) {
        var configs = [];

        for (var voice = 0; voice < 4; voice++) {
            cursor.rewind(1);
            cursor.staffIdx = staff;
            cursor.voice = voice;
            cursor.rewind(0);

            var measureCount = 0;
            log("Populating configs. staff: " + staff + ", voice: " + voice);

            while (true) {
                if (cursor.segment) {
                    // scan edo & tuning center first. key signature parsing is dependant on edo used.
                    for (var i = 0; i < cursor.segment.annotations.length; i++) {
                        var annotation = cursor.segment.annotations[i];
                        log("found annotation type: " + annotation.name);
                        if ((annotation.name == 'StaffText' && Math.floor(annotation.track / 4) == staff) ||
                            (annotation.name == 'SystemText')) {
                            var maybeConfigUpdateEvent = parsePossibleConfigs(annotation.text, cursor.tick);

                            if (maybeConfigUpdateEvent != null) {
                                configs.push(maybeConfigUpdateEvent);
                            }
                        }
                    }

                    if (cursor.segment.tick == cursor.measure.firstSegment.tick
                        && voice === 0 && staff === 0) {
                        if (!parms.bars)
                            parms.bars = [];

                        parms.bars.push(cursor.segment.tick);
                        measureCount++;
                        // log("New bar - " + measureCount + ", tick: " + cursor.segment.tick);
                    }
                }

                if (!cursor.next())
                    break;
            }
        }

        parms.staffConfigs[staff] = configs.sort(function (a, b) {
            return a.tick - b.tick;
        });
    }

    var startBarIdx = null, endBarIdx = null;

    if (!noPhraseSelection) {
        startBarIdx = getBarBoundaries(startTick, parms.bars, true)[0];
        endBarIdx = getBarBoundaries(endTick, parms.bars, true)[1];
    }

    // End of config population.
    //
    //
    //
    // Begin pitch modification impl


    if (noPhraseSelection) {
        // No phrase/range selection mode.
        //
        // User selects individual note heads to modify.

        // - No-op if _curScore.selection.elements.length == 0.
        // - If selection doesn't contain a single element that has Element.type == Element.NOTE,
        //   default to cmd('pitch-up') or cmd('pitch-down') so MuseScore can handle moving other Elements.
        //   This allows users to use this plugin in place of the 'pitch-up' and 'pitch-down' shortcuts (up/down arrow keys)
        //   without losing any of the other functions that the up or down arrow keys originally provides.
        // - If selection contains individual notes, transpose them.

        if (_curScore.selection.elements.length == 0) {
            log('no individual selection. quitting.');
            return;
        } else {
            /** @type {PluginAPINote[]} */
            var selectedNotes = [];
            for (var i = 0; i < _curScore.selection.elements.length; i++) {
                if (_curScore.selection.elements[i].type == Element.NOTE) {
                    selectedNotes.push(curScore.selection.elements[i]);
                }
            }

            // for debugging
            // for (var i = 0; i < selectedNotes.length; i ++) {
            //   selectedNotes[i].color = 'red';
            // }

            if (selectedNotes.length == 0 && fallthroughUpDownCommand) {
                log('no selected note elements, defaulting to pitch-up/pitch-down shortcuts');
                if (stepwiseDirection == 1)
                    cmd('pitch-up');
                else if (stepwiseDirection == -1)
                    cmd('pitch-down');
                return;
            }

            // Run transpose operation on all selected note elements.

            // contains list of notes that have already been transposed
            // this is to prevent repeat transposition in the event that
            // 2 notes tied to each other are individually selected.
            var affected = [];

            for (var i = 0; i < selectedNotes.length; i++) {
                var note = selectedNotes[i];
                var voice = note.track % 4;
                var staffIdx = Math.floor(note.track / 4);
                var tick = getTick(note);

                // handle transposing the firstTiedNote in the event that a non-first tied note
                // is selected.
                note = note.firstTiedNote;
                var firstTiedTick = getTick(note);
                var lastTiedTick = getTick(note.lastTiedNote);

                var alreadyTrans = false;
                for (var j = 0; j < affected.length; j++) {
                    if (affected[j].is(note)) {
                        alreadyTrans = true;
                        break;
                    }
                }

                if (alreadyTrans)
                    continue;

                affected.push(note);

                setCursorToPosition(cursor, tick, voice, staffIdx);

                log('indiv note: line: ' + note.line + ', voice: ' + cursor.voice
                    + ', staff: ' + cursor.staffIdx + ', tick: ' + tick);


                // Reset & populate configs for each note,
                // since we're uncertain which note belongs to which bar.

                resetParms(parms);

                for (var j = 0; j < parms.staffConfigs[Math.floor(note.track / 4)].length; j++) {
                    var config = parms.staffConfigs[cursor.staffIdx][j];
                    if (config.tick <= cursor.tick) {
                        config.config(parms);
                    }
                }

                // Modify pitch.

                _curScore.startCmd();

                var firstTiedBarIdx = getBarBoundaries(firstTiedTick, parms.bars, true)[0];
                var lastTiedBarEndIdx = getBarBoundaries(lastTiedTick, parms.bars, true)[1];

                // direction: 1: up, -1 = down, 0: enharmonic cycle.
                executeTranspose(note, stepwiseDirection,
                    stepwiseAux, parms, newElement, cursor);

                // Remove unnecessary accidentals just for this bar.

                removeUnnecessaryAccidentals(
                    tick, tick, parms, cursor, newElement, firstTiedBarIdx, lastTiedBarEndIdx);

                _curScore.endCmd();
                _curScore.startCmd();

                // Auto position accidentals in this bar.
                autoPositionAccidentals(
                    tick, tick, parms, cursor, firstTiedBarIdx, lastTiedBarEndIdx
                );
                _curScore.endCmd();


            }
        }
    } // End of no-phrase selection impl
    else {
        // Standard implementation for phrase selection.
        for (var staff = startStaff; staff <= endStaff; staff++) {
            _curScore.startCmd();
            for (var voice = 0; voice < 4; voice++) {

                // reset curr configs

                resetParms(parms);

                cursor.rewind(1); // goes to start of selection, will reset voice to 0

                // 0-indexed bar counter.
                // Used to keep track of bar boundaries efficiently.
                var currBar = getBarBoundaries(cursor.tick, parms.bars, true)[0];

                var tickOfThisBar = parms.bars[currBar];
                var tickOfNextBar = currBar == parms.bars.length - 1 ? -1 : parms.bars[currBar + 1];

                cursor.staffIdx = staff;
                cursor.voice = voice;

                log('processing:' + cursor.tick + ', voice: ' + cursor.voice + ', staffIdx: ' + cursor.staffIdx);

                var tickOfLastModified = -1;

                // Loop elements of a voice
                while (cursor.segment && (cursor.tick < endTick)) {
                    if (tickOfNextBar != -1 && cursor.tick >= tickOfNextBar) {
                        // Update bar boundaries.
                        currBar++;
                        tickOfThisBar = tickOfNextBar;
                        tickOfNextBar = currBar == parms.bars.length - 1 ? -1 : parms.bars[currBar + 1];
                    }

                    for (var i = 0; i < parms.staffConfigs[staff].length; i++) {
                        var config = parms.staffConfigs[staff][i];
                        if (config.tick <= cursor.tick) {
                            config.config(parms);
                        }
                    }

                    if (cursor.element) {
                        if (cursor.element.name == "Chord") {
                            var graceChords = cursor.element.graceNotes;
                            for (var i = 0; i < graceChords.length; i++) {
                                // iterate through all grace chords
                                var notes = graceChords[i].notes;
                                for (var j = 0; j < notes.length; j++) {
                                    var note = notes[j];

                                    // skip notes that are tied to previous notes.
                                    if (note.tieBack)
                                        continue;

                                    // Modify pitch.
                                    executeTranspose(note, stepwiseDirection, stepwiseAux, parms, newElement, cursor);
                                }
                            }
                            var notes = cursor.element.notes;
                            for (var i = 0; i < notes.length; i++) {
                                var note = notes[i];

                                // skip notes that are tied to previous notes.
                                if (note.tieBack)
                                    continue;

                                // Modify pitch.
                                executeTranspose(note, stepwiseDirection, stepwiseAux, parms, newElement, cursor);
                            }
                            tickOfLastModified = cursor.tick;
                        }
                    }
                    cursor.next();
                }

                // Don't forget to remove unnecessary accidentals for the last bit of
                // the selection that wasn't included in the loop above.

                if (tickOfLastModified != -1) {
                    removeUnnecessaryAccidentals(
                        tickOfLastModified, tickOfLastModified, parms,
                        cursor, newElement);
                }

                // Also don't forget to auto position accidentals for the last bar.
            } // end of voices

            _curScore.endCmd();

            _curScore.startCmd();

            removeUnnecessaryAccidentals(
                startTick, endTick, parms, cursor, newElement, startBarIdx, endBarIdx
            );

            _curScore.endCmd();

            _curScore.startCmd();

            // After processing all voices in a staff,
            // auto position accidentals in this staff in the selection range
            autoPositionAccidentals(
                startTick, endTick, parms, cursor, startBarIdx, endBarIdx
            );

            _curScore.endCmd();
        }
    }
}