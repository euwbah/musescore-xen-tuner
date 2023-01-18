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

// MUST USE ES5 SYNTAX FOR MSCORE COMPAT.

var Lookup = ImportLookup();

/**
 * During init, this will be assigned to the MuseScore plugin API `Accidental` enum.
 */
var Accidental = null;
var NoteType = null;
var Element = null;
var Ms = null;
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
 * If true, the plugin will allow `cmd('pitch-up')` and `cmd('pitch-down')` to be
 * sent when the selection doesn't include notes and up/down operations are being sent.
 * 
 * Set this to false when the user is editing text elements, so that the user can
 * press up/down to navigate the text without being interrupted.
 */
var fallthroughUpDownCommand = true;

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

/**
 * The default tuning config in case tunings/default.txt is invalid or not found.
 */
var DEFAULT_TUNING_CONFIG = "   \n\
A4: 440                         \n\
0 200 300 500 700 800 1000 1200 \n\
bb b (100) # x                  \n\
";

/**
 * Returns the default tuning config to apply when none is specified
 * 
 * @returns {TuningConfig}
 */
function generateDefaultTuningConfig() {
    fileIO.source = pluginHomePath + "tunings/default.txt";
    var defaultTxt = fileIO.read();
    var tuningConfig;
    if (defaultTxt.length == 0) {
        console.log("default.txt not found, generating default tuning config...");
        tuningConfig = parseTuningConfig(DEFAULT_TUNING_CONFIG, true, true);
    } else {
        console.log('Generated default tuning config from default.txt');
        tuningConfig = parseTuningConfig(defaultTxt, true, true);
        if (tuningConfig == null) {
            console.error("ERROR: default.txt is invalid. Please fix your tuning config. Generating default tuning config...");
            tuningConfig = parseTuningConfig(DEFAULT_TUNING_CONFIG, true, true);
        }
    }

    return tuningConfig;
}

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
var PLAY_EVENT_MOD_SEMITONES_THRESHOLD = 13;

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
 * 
 * @param {*} MSAccidental Accidental enum from MuseScore plugin API.
 * @param {*} MSNoteType NoteType enum from MuseScore plugin API.
 */
function init(MSAccidental, MSNoteType, MSSymId, MSElement, MSMs, MSFileIO, homePath, MSCurScore) {
    Lookup = ImportLookup();
    // console.log(JSON.stringify(Lookup));
    Accidental = MSAccidental;
    SymId = MSSymId;
    NoteType = MSNoteType;
    Ms = MSMs;
    Element = MSElement;
    fileIO = MSFileIO;
    pluginHomePath = homePath;
    _curScore = MSCurScore;
    console.log("Initialized! Enharmonic eqv: " + ENHARMONIC_EQUIVALENT_THRESHOLD + " cents");
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
 * @returns 
 */
function isEnharmonicallyEquivalent(cents1, cents2) {
    return Math.abs(cents1 - cents2) < ENHARMONIC_EQUIVALENT_THRESHOLD;
}

/**
 * Convert user-input {@link SymbolCode} or Text Code ({@link Lookup.TEXT_TO_CODE}) into SymbolCode ID.
 * 
 * @param {string} codeOrText
 * @returns {SymbolCode?} {@link SymbolCode} or null if invalid.
 */
function readSymbolCode(codeOrText) {
    var codeOrText = codeOrText.trim();
    var code = Lookup.TEXT_TO_CODE[codeOrText];
    if (!code)
        code = parseInt(codeOrText) || null;

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

    // console.log('note bbox: ' + JSON.stringify(note.bbox) +
    //     ', pagePos: ' + JSON.stringify(note.pagePos));

    var hasAcc = false;
    var accidentals = {};

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

            fingerings.push(elem);
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

                // console.log('found elem: ' + elem.symbol.toString() + 
                //     ', bbox: ' + JSON.stringify(elem.bbox) +
                //     ', pagePos: ' + JSON.stringify(elem.pagePos));
            }
        }
    }

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
 * Filters accidentalHash to remove symbols that aren't used by the tuning config.
 * 
 * **WARNING:** If the resulting accidentalHash is empty, returns `null`.
 * In some accidentalHash use cases, '' is required instead of null. 
 * Make sure to check what is required.
 * 
 * @param {string} accHash Accidental Hash to remove unused symbols from.
 * @param {TuningConfig} tuningConfig
 * @returns {string} 
 *  Accidental Hash with unused symbols removed.
 * 
 */
function removeUnusedSymbols(accHash, tuningConfig) {
    if (!accHash) return null;
    var accHashWords = accHash.split(' ');
    var usedSymbols = tuningConfig.usedSymbols || {};
    var newAccHashWords = [];

    for (var i = 0; i < accHashWords.length; i += 2) {
        var symCode = accHashWords[i];

        if (usedSymbols[symCode]) {
            // If symbol is used by tuning config, add to hash.
            newAccHashWords.push(symCode); // add the sym code
            newAccHashWords.push(accHashWords[i + 1]);// add the num of symbols
        }
    }

    if (newAccHashWords.length == 0) return null;

    return newAccHashWords.join(' ');
}

/**
 * Hashes the {@link AccidentalSymbols} attached to a note.
 * 
 * The result is appended to the nominal of a note to construct a {@link XenNote}.
 * 
 * You can also specify a list of unsorted {@link SymbolCode}s that are present.
 * (useful for hashing accidentals from user-input)
 * 
 * @param {AccidentalSymbols|SymbolCode[]} accidentals 
 *      The AccidentalSymbols object, or a list of `SymbolCode` numbers
 * @returns {string} {@link AccidentalSymbols} hash string.
 */
function accidentalsHash(accidentals) {

    if (accidentals == undefined) {
        // just in case...
        // console.log('WARN: undefined accidentals passed to accidentalsHash');
        return '';
    }

    if (accidentals == null) {
        // no accidentals
        return '';
    }

    if (accidentals.length != undefined) {
        // `accidentals` param is a list of individual symbol codes

        if (accidentals.length == 0) {
            console.log('WARN: accidentalsHash called with 0 SymbolCodes in array');
            return '';
        }

        // simply sort and count number of occurences.

        accidentals.sort();

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
        .map(function (x) { return parseInt(x); })
        .sort()
        .forEach(function (symCode) {
            symCodeNums.push(symCode);
            symCodeNums.push(accidentals[symCode]);
        });

    return symCodeNums.join(' ');
}

/**
 * Calculate a {@link XenNote.hash} string from its nominal and accidentals.
 * 
 * @param {number} nominal
 * @param {AccidentalSymbols|SymbolCode[]} accidentals
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
            console.log('Using cached tuning config:\n' + textOrPath + '\n' +
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
                    console.log('Using cached tuning config:\n' + textOrPath + '\n' +
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
            // console.log('not tuning config: empty text');
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
                console.log('Loaded JSON tuning config from ' + fileIO.source + ':\n');
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
        console.log('Reading tuning config from ' + fileIO.source + ':\n' + text);
    }

    /** @type {TuningConfig} */
    var tuningConfig = { // TuningConfig
        notesTable: {},
        tuningTable: {},
        avTable: {},
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
        tuningFreq: null,
        // lookup of symbols used in tuning config.
        // anything not included should be ignored.
        usedSymbols: {
            // Natural symbol should always be included.
            2: true
        },
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
        // console.log(lines[0] + ' is not a reference tuning');
        return null;
    }

    var referenceLetter = referenceTuning[0][0].toLowerCase();
    var referenceOctave = parseInt(referenceTuning[0].slice(1));

    var nominalsFromA4 = (referenceOctave - 4) * 7;
    var lettersNominal = Lookup.LETTERS_TO_NOMINAL[referenceLetter];

    if (lettersNominal == undefined) {
        // console.log("Invalid reference note specified: " + referenceLetter);
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

    if (isNaN(tuningConfig.tuningFreq)) {
        return null;
    }

    // PARSE NOMINALS
    //
    //

    var hasInvalid = false;
    var nominals = lines[1].split(' ').map(function (x) {
        var f;
        if (x.endsWith('c')) {
            // in cents
            f = parseFloat(eval(x.slice(0, -1)));
        } else {
            // in ratio, convert to cents.
            var ratio = parseFloat(eval(x));

            if (ratio < 0) {
                f = -Math.log(-ratio) / Math.log(2) * 1200;
            } else if (ratio == 0) {
                f = 0;
            } else {
                f = Math.log(ratio) / Math.log(2) * 1200
            }
        }
        if (isNaN(f)) hasInvalid = true;
        return f
    });

    if (hasInvalid) {
        console.log('Invalid nominal decl: ' + lines[1]);
        return null;
    }

    tuningConfig.nominals = nominals.slice(0, nominals.length - 1);
    tuningConfig.equaveSize = nominals[nominals.length - 1];
    tuningConfig.numNominals = tuningConfig.nominals.length;

    // PARSE ACCIDENTAL CHAINS
    //
    //

    var nextDeclStartLine = null;

    for (var i = 2; i < lines.length; i++) {
        var line = lines[i].trim();

        // each new line is a new accidental chain.

        // terminate when 'lig(x,y,...)' is found (move on to ligature declarations)
        // terminate when 'aux(x,y,...)' is found (move on to aux stepwise declarations)

        var matches = line.match(/(lig|aux)\([0-9,]*\)/);
        if (matches) {
            nextDeclStartLine = i;
            break;
        }

        var accChainStr = line.split(' ').map(function (x) { return x.trim(); });

        var increment = null;
        var symbolsLookup = {}; // contains all unique symbols used.
        var degreesSymbols = [];
        var tunings = [];
        var offsets = [];
        var centralIdx = null;

        for (var j = 0; j < accChainStr.length; j++) {
            var word = accChainStr[j];

            var matchIncrement = word.match(/^\((.+)\)$/);

            if (matchIncrement) {
                var maybeIncrement;
                if (matchIncrement[1].endsWith('c')) {
                    // in cents
                    maybeIncrement = parseFloat(eval(matchIncrement[1].slice(0, -1)));
                } else {
                    var ratio = parseFloat(eval(matchIncrement[1]));
                    if (ratio < 0) {
                        maybeIncrement = -Math.log(-ratio) / Math.log(2) * 1200;
                    } else if (ratio == 0) {
                        maybeIncrement = 0;
                    } else {
                        maybeIncrement = Math.log(ratio) / Math.log(2) * 1200
                    }
                }

                if (isNaN(maybeIncrement)) {
                    console.error('TUNING CONFIG ERROR: invalid accidental chain increment: ' + matchIncrement[1]);
                    return null;
                }

                increment = maybeIncrement;
                degreesSymbols.push(null);
                offsets.push(0);
                centralIdx = j;
            } else {
                // degree syntax: sym1.sym2.symN(<optional additional cents offset>)
                // e.g.: +.7./(-23.5) declares a degree containing:
                // SHARP_SLASH, FLAT2, ARROW_UP symbols
                // with additional offset -23.5 cents

                var symbols_offset = word.split('(');

                hasInvalid = false;

                // each symbol is either a text code or symbol code number
                var symbolCodes = symbols_offset[0].split('.').map(function (x) {
                    var code = readSymbolCode(x);

                    if (code == null) hasInvalid = true;

                    symbolsLookup[code] = true;
                    tuningConfig.usedSymbols[code] = true;
                    return code;
                });

                if (hasInvalid) {
                    console.error('TUNING CONFIG ERROR: invalid symbol: ' + symbols_offset[0]);
                    return null;
                }

                var offset = 0;

                if (symbols_offset.length > 1) {
                    var offsetText = symbols_offset[1].slice(0, symbols_offset[1].length - 1);
                    var maybeOffset;
                    if (offsetText.endsWith('c')) {
                        // in cents
                        maybeOffset = parseFloat(eval(offsetText.slice(0, -1)));
                    } else {
                        var ratio = parseFloat(eval(offsetText));
                        if (ratio < 0) {
                            maybeOffset = -Math.log(-ratio) / Math.log(2) * 1200;
                        } else if (ratio == 0) {
                            maybeOffset = 0;
                        } else {
                            maybeOffset = Math.log(ratio) / Math.log(2) * 1200
                        }
                    }
                    if (!isNaN(maybeOffset)) {
                        offset = maybeOffset;
                    } else {
                        console.error('TUNING CONFIG ERROR: Invalid accidental tuning offset specified: ' + offsetText);
                    }
                }

                degreesSymbols.push(symbolCodes);
                offsets.push(offset);
            }
        }

        if (!increment || centralIdx == null) {
            console.error('TUNING CONFIG ERROR: Invalid accidental chain: "' + accChainStr.join(' ') + '" in ' + line);
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

    // PARSE LIGATURES
    //
    //

    for (var i = nextDeclStartLine; i < lines.length; i++) {

        if (nextDeclStartLine == null)
            break;

        var line = lines[i].trim();

        // Check for `aux(x,y,..)` declaration
        if (line.match(/aux\([0-9,]+\)/)) {
            nextDeclStartLine = i;
            break;
        }

        hasInvalid = false;

        // lig(m, n) will be regarding the mth and nth accidental chains only.
        //
        // An exact match of the degrees of the mth and nth chains must be found
        // in order for the ligature regarding m and n to be applied.

        var match = line.match(/lig\(([0-9,]+)\)/);

        if (!match) {
            console.error('TUNING CONFIG ERROR: Couldn\'t parse tuning config: Expecting lig(x, y, ...) or aux(x?, y?, ...), got "' + line + '" instead.');
            return null;
        }

        var regarding = match[1]
            .split(',')
            .map(function (x) {
                var n = parseInt(x);
                if (isNaN(n) || n < 1) hasInvalid = true;
                return n - 1;
            });

        if (hasInvalid) {
            console.error('TUNING CONFIG ERROR: Invalid ligature declaration: ' + line);
            return null;
        }

        var ligAvToSymbols = {};

        for (var j = i + 1; j < lines.length; j++) {
            // each line represents a mapping in `ligAvToSymbols`

            // syntax: <chain 1 degree> <chain 2 degree> ... <dot separated acc symbols>

            var words = lines[j].split(' ').map(function (x) { return x.trim() });
            var ligAv = words.slice(0, words.length - 1).map(function (x) { return parseInt(x) });

            hasInvalid = false;
            var ligatureSymbols = words[words.length - 1]
                .split('.')
                .map(function (x) {
                    var code = readSymbolCode(x);
                    if (code == null) hasInvalid = true;
                    usedSymbols[code] = true;
                    return code;
                });

            if (hasInvalid) {
                console.error('TUNING CONFIG ERROR: invalid ligature symbol: ' + words[words.length - 1]);
                return null;
            }

            ligAvToSymbols[ligAv] = ligatureSymbols;
        }

        tuningConfig.ligatures.push({ // Ligature
            regarding: regarding,
            ligAvToSymbols: ligAvToSymbols,
        });

        // jump to new line
        i = j + 1;
    }

    // PARSE AUX
    //
    //

    for (var i = nextDeclStartLine; i < lines.length; i++) {
        if (nextDeclStartLine == null) break;

        var line = lines[i].trim();

        // Check for `aux(x,y,..)` declaration

        var match = line.match(/aux\(([0-9,]+)\)/);

        if (!match) {
            console.error('TUNING CONFIG ERROR: Couldn\'t parse tuning config: Expecting aux(x?, y?, ...), got "' + line + '" instead.');
        }

        hasInvalid = false;
        // Contains 0 if the user specifies nominals are allowed to change
        // 1 if the first accidental chain degree is allowed to change
        // 2 if the second accidental chain degree is allowed to change
        // etc...
        var nomAndChainIndices = match[1]
            .split(',')
            .filter(function (x) { return x.trim().length > 0 })
            .map(function (x) {
                var n = parseInt(x);
                if (isNaN(n) || n < 0) hasInvalid = true;
                return n;
            });

        if (hasInvalid) {
            console.error('TUNING CONFIG ERROR: Invalid aux declaration: ' + line);
            return null;
        }

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
    }

    //
    //
    // END OF PARSING
    //
    //

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
     * @type {XenNotesEquaves}
     */
    var xenNotesEquaves = [];

    // Now we iterate the nominals to populate

    for (var nomIdx = 0; nomIdx < tuningConfig.nominals.length; nomIdx++) {
        var nominalCents = tuningConfig.nominals[nomIdx];

        // if there are no accidental chains, we can just add the nominal

        if (tuningConfig.accChains.length == 0) {
            xenNotesEquaves.push({
                av: [],
                xen: { // XenNote
                    nominal: nomIdx,
                    orderedSymbols: [],
                    accidentals: null,
                    hash: createXenHash(nomIdx, {}),
                },
                cents: nominalCents,
                equavesAdjusted: 0,
            });
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

            xenNotesEquaves.push({
                av: accidentalVector,
                xen: { // XenNote
                    nominal: nomIdx,
                    orderedSymbols: orderedSymbols,
                    accidentals: orderedSymbols.length == 0 ? null : accidentalSymbols,
                    hash: createXenHash(nomIdx, accidentalSymbols)
                },
                cents: cents,
                equavesAdjusted: equavesAdjusted,
            });

            // SETTLE IMPLEMENTING LIGATURES AS ENHARMONICS
            //
            //

            tuningConfig.ligatures.forEach(function (lig) {
                var ligAv = [];

                // These values will contain the ligatured spelling of the accidental.
                // Only used when a ligature match is found.
                var ligaturedSymbols = {};
                for (var k in accidentalSymbols) {
                    ligaturedSymbols[k] = accidentalSymbols[k];
                } // shallow copy;
                var ligOrderedSymbols = orderedSymbols.map(function (x) { return x; }); // shallow copy

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

                    // Remove symbols from ligaturedSymbols that are
                    // replaced by the ligature.

                    var accChain = tuningConfig.accChains[idx];
                    var symbolsCausedByDegree = accChain.degreesSymbols[avIndices[idx]];

                    if (symbolsCausedByDegree == null) {
                        // continue. the current degree of this accidental vector doesn't need any symbols
                        return;
                    }

                    symbolsCausedByDegree.forEach(function (symCode) {
                        if (ligaturedSymbols[symCode]) {
                            // reduce count of symbols
                            var numSymbols = --ligaturedSymbols[symCode];
                            if (numSymbols == 0) {
                                delete ligaturedSymbols[symCode];
                            }
                            var idxOfSymbol = ligOrderedSymbols.lastIndexOf(symCode);
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
                });

                // contains symbols from ligature, in user-specified order.
                var ligSymbols = lig.ligAvToSymbols[ligAv];

                if (ligSymbols) {
                    // A ligature match is found.

                    ligSymbols.forEach(function (symCode) {
                        // Add the lig symbol to the accidentals map
                        if (ligaturedSymbols[symCode]) {
                            ligaturedSymbols[symCode]++;
                        } else {
                            ligaturedSymbols[symCode] = 1;
                        }
                    });

                    // Insert the ligature symbols into the ordered symbols.
                    ligOrderedSymbols = ligOrderedSymbols
                        .slice(0, ligSymbolIdx)
                        .concat(ligSymbols)
                        .concat(ligOrderedSymbols.slice(ligSymbolIdx));

                    // Add the ligature as if it were an enharmonic equivalent.

                    xenNotesEquaves.push({
                        av: accidentalVector,
                        xen: { // XenNote
                            nominal: nomIdx,
                            orderedSymbols: ligOrderedSymbols,
                            accidentals: ligOrderedSymbols.length == 0 ? null : ligaturedSymbols,
                            hash: createXenHash(nomIdx, ligOrderedSymbols)
                        },
                        cents: cents,
                        equavesAdjusted: equavesAdjusted,
                    });
                }
            });
        }
    }
    // end of xenNotesEquaves population

    // SETTLE TABLE LOOKUPS
    //
    //

    /*
        Sort all XenNotes by cents, then by accidentalVector.join()

        (array comparison uses .join implicitly)
    */

    xenNotesEquaves.sort(function (a, b) {
        if (isEnharmonicallyEquivalent(a.cents, b.cents)) {
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

    xenNotesEquaves.forEach(function (x) {
        var av = x.av;
        var xenNote = x.xen;
        var cents = x.cents;
        var equavesAdjusted = x.equavesAdjusted;
        var hash = xenNote.hash;

        // Add to NotesTable
        tuningConfig.notesTable[hash] = xenNote;
        tuningConfig.avTable[hash] = av;
        tuningConfig.tuningTable[hash] = [cents, equavesAdjusted];

        if (prevEnhEquivCents != null && isEnharmonicallyEquivalent(cents, prevEnhEquivCents)) {
            // Curr note should belong to the same group as prev note.
            // Safe to assume tuningConfig.stepsList is not empty.

            // Contains list of enharmonically equivalent XenNote hashes.
            var enharmGroup = tuningConfig.stepsList[tuningConfig.stepsList.length - 1];
            // Contains hash of last enharmGroup before current hash is added.
            var previousEnharmHash = enharmGroup[enharmGroup.length - 1];
            enharmGroup.push(hash);
            tuningConfig.stepsLookup[hash] = tuningConfig.stepsList.length - 1;

            // Add vertex in EnharmonicGraph:
            // connect previous enharmonic with current enharmonic.
            tuningConfig.enharmonics[previousEnharmHash] = hash;
        } else {
            // Curr note is not enharmonically equivalent.

            // Before adding new entry in StepwiseList, check if
            // most recent entry has enharmonic equivalents.
            //
            // If so, complete the cycle in the enharmonic graph.

            if (tuningConfig.stepsList.length > 0) {
                var prevEnharmGroup = tuningConfig.stepsList[tuningConfig.stepsList.length - 1];
                if (prevEnharmGroup.length > 1) {
                    var firstEnharmHash = prevEnharmGroup[0];
                    var lastEnharmHash = prevEnharmGroup[prevEnharmGroup.length - 1];
                    tuningConfig.enharmonics[lastEnharmHash] = firstEnharmHash;
                }
            }

            // Add new entry in StepwiseList

            tuningConfig.stepsList.push([hash]);
            tuningConfig.stepsLookup[hash] = tuningConfig.stepsList.length - 1;

            // Update cents of new note.
            prevEnhEquivCents = cents;
        }
    });

    // Finally, check if last entry in StepwiseList has enharmonic equivalents.
    // If so, complete the cycle in the enharmonic graph.
    var lastEnharmGroup = tuningConfig.stepsList[tuningConfig.stepsList.length - 1];
    if (lastEnharmGroup.length > 1) {
        var firstEnharmHash = lastEnharmGroup[0];
        var lastEnharmHash = lastEnharmGroup[lastEnharmGroup.length - 1];
        tuningConfig.enharmonics[lastEnharmHash] = firstEnharmHash;
    }

    // DONE!

    // Make sure to save the new tuning to the runtime and metaTag caches.

    if (_curScore) {
        tuningConfigCache[textOrPath] = tuningConfig;
        saveMetaTagCache();

        console.log('Saved tuning to runtime & metaTag cache.');
    }

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

    var nomSymbols = text.trim().split(' ').slice(1);

    var keySig = [];


    nomSymbols.forEach(function (s) {
        var symbols = s.split('.');

        var symCodes = [];

        if (parseInt(symCodes[0]) <= 2) {
            // Any natural/none/null accidental code should be
            // regarded as no accidentals for this nominal.
            keySig.push(null);
            return;
        }

        var valid = true;

        symbols.forEach(function (s) {
            var symbolCode = readSymbolCode(s);
            if (symbolCode == null) {
                valid = false;
            }
            symCodes.push(symbolCode);
        });

        if (!valid) {
            keySig.push(null);
        } else {
            keySig.push(accidentalsHash(symCodes));
        }
    });

    console.log('Parsed keySig: ' + JSON.stringify(keySig));

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
        // console.log(text + ' is not a reference tuning');
        return null;
    }

    var referenceLetter = referenceTuning[0][0].toLowerCase();
    var referenceOctave = parseInt(referenceTuning[0].slice(1));

    var nominalsFromA4 = (referenceOctave - 4) * 7;
    var lettersNominal = Lookup.LETTERS_TO_NOMINAL[referenceLetter];

    if (lettersNominal == undefined) {
        // console.log("Invalid reference note specified: " + referenceLetter);
        return null;
    }

    nominalsFromA4 += lettersNominal;

    // Since the written octave resets at C, but we need to convert it
    // such that the octave resets at A4, we need to subtract one octave
    // if the nominal is within C to G.
    if (lettersNominal >= 2)
        nominalsFromA4 -= 7;

    var changeReferenceNote = {};
    changeReferenceNote.tuningNominal = nominalsFromA4;
    changeReferenceNote.tuningNote = Lookup.LETTERS_TO_SEMITONES[referenceLetter] + (referenceOctave - 4) * 12 + 69;
    changeReferenceNote.tuningFreq = parseFloat(eval(referenceTuning[1])); // specified in Hz.

    if (isNaN(changeReferenceNote.tuningFreq)) {
        return null;
    }

    return changeReferenceNote;
}

/**
 * Removes formatting code from System/Staff text.
 * 
 * Make sure formatting code is removed before parsing System/Staff text!
 * 
 * @param {string} str Raw System/Staff text contents
 * @returns {string} Text with formatting code removed
 */
function removeFormattingCode(str) {
    if (typeof (str) == 'string')
        return str.replace(/<[^>]*>/g, '');
    else
        return null;
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

    /** @type {ConfigUpdateEvent} */
    var maybeConfig;

    // First, check for reference tuning changes.

    maybeConfig = parseChangeReferenceTuning(text);

    if (maybeConfig != null) {
        console.log("Found reference tuning change:\n" + text);
        // reference tuning change found.

        return { // ConfigUpdateEvent
            tick: tick,
            config: function(parms) {
                parms.currTuning.tuningNominal = maybeConfig.tuningNominal;
                parms.currTuning.tuningNote = maybeConfig.tuningNote;
                parms.currTuning.tuningFreq = maybeConfig.tuningFreq;
            }
        };
    }

    // Then, check for Tuning Config declarations.

    maybeConfig = parseTuningConfig(text);

    if (maybeConfig != null) {
        var numSteps = maybeConfig.stepsList.length;
        console.log("Found tuning config:\n" + text + "\n" + numSteps + " steps/equave");
        // tuning config found.

        return { // ConfigUpdateEvent
            // Spoofing 1 tick earlier, because any TuningConfigs should
            // should be applied before a ChangeReferenceTuning event.
            // 
            // This way, a System Text TuningConfig can be used to apply to
            // all staves, while individual staves can use ChangeReferenceTuning
            // to emulate transposing instruments.
            tick: tick - 1,
            config: function(parms) {
                parms.currTuning = maybeConfig;
            }
        };
    }

    maybeConfig = parseKeySig(text);

    if (maybeConfig != null) {
        // key sig found
        console.log("Found key sig:\n" + text);

        return { // ConfigUpdateEvent
            tick: tick,
            config: function(parms) {
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
 * 
 * Uses TuningConfig and cursor to read XenNote data from a tokenized musescore note.
 * 
 * Uses cursor & getAccidental() to find the effective accidental being applied
 * on `msNote`, including accidentals on `msNote` itself.
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
 * @param {BarState?} reusedBarState See parm description of {@link getAccidental()}.
 * @returns {NoteData?} 
 *      The parsed note data. If the note's accidentals are not valid within the
 *      declared TuningConfig, returns `null`.
 */
function readNoteData(msNote, tuningConfig, keySig, tickOfThisBar, tickOfNextBar, cursor, reusedBarState) {
    /*
    Example repr. of the note Ebbbb\\4 with implicit accidentals:
    {
        ms: { // MSNote
            midiNote: 64, // E4
            tpc: 18, // E
            nominalsFromA4: -3, // E4 is 3 nominals below A4.
            accidentals: null,
            tick: 1337,
            internalNote: PluginAPI::Note // copy of internal musescore note object
        },
        xen: { // XenNote
            nominal: 4, // E
            // Left-to-right order of symbols
            // comma downs are on the left because they are defined in the second chain.
            orderedSymbols: [34, 34, 6, 6]
            accidentals: {
                6: 2, // two double flats
                34: 2, // two comma downs
            },
            hash: "4 6 2 34 2"
        },
        equaves: -1 // E4 is in the equave below tuning note A4
    }
    */

    // Convert nominalsFromA4 to nominals from tuning note.

    var nominalsFromTuningNote = msNote.nominalsFromA4 - tuningConfig.tuningNominal;
    var equaves = Math.floor(nominalsFromTuningNote / tuningConfig.numNominals);

    var nominal = mod(nominalsFromTuningNote, tuningConfig.numNominals);

    var accidentalsHash = getAccidental(
        cursor, msNote.internalNote, tickOfThisBar, tickOfNextBar, 0, null, reusedBarState);

    // console.log("Found effective accidental: " + accidentalsHash);

    if (accidentalsHash == null && keySig && keySig[nominal] != null
        // Check if KeySig has a valid number of nominals.
        && keySig.length == tuningConfig.numNominals) {
        // If no prior accidentals found within the bar,
        // look to key signature.
        accidentalsHash = keySig[nominal];
    }

    if (accidentalsHash != null) {
        var acHashSplit = accidentalsHash.split(' ');
        if (acHashSplit.length == 2 && acHashSplit[0] == '2') {
            // treat any number of natural symbols = no accidental
            accidentalsHash = null;
        }
    }

    // Remove unused symbols from the hash.
    accidentalsHash = removeUnusedSymbols(accidentalsHash, tuningConfig);

    // Create hash manually.
    // Don't use the createXenHash function, that works on the AccidentalSymbols object
    // instead of the hash.
    var xenHash = nominal;

    if (accidentalsHash != null) {
        xenHash += ' ' + accidentalsHash;
    }

    var xenNote = tuningConfig.notesTable[xenHash];

    if (xenNote == undefined) {
        console.error("\n-----------------------\nFATAL ERROR: Could not find XenNote (" + xenHash + ") in tuning config. \n Please check your tuning config. \n-----------------------\n");
        // console.log("Tuning config: " + JSON.stringify(tuningConfig.notesTable));
        return null;
    }

    return {
        ms: msNote,
        xen: xenNote,
        equaves: equaves
    };
}

/**
 * Checks if an accidental fingering text is attached to the note.
 * 
 * If so, replaces the fingering text with actual accidental symbols.
 * 
 * The accidental fingering text is a string prefixed by 'a', followed
 * by the accidental vector that is comma-separated.
 * 
 * (Spaces can't be typed into a fingering)
 * 
 * Recap: The Nth integer of the accidental vector represents the degree 
 * of the Nth accidental chain to be applied to this note.
 * 
 * 
 * @param {MSNote} msNote
 * @returns {MSNote} 
 *  If accidentals were created, returns the retokenized `MSNote`, 
 *  Otherwise, returns the original `MSNote`.
 */
function renderFingeringAccidental(msNote, tuningConfig, newElement) {
    var elemToRemove = null;
    var av = null;

    for (var i = 0; i < msNote.fingerings.length; i++) {
        var fingering = msNote.fingerings[i];
        var text = fingering.text;
        if (text.startsWith('a')) {
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
                // We found a fingering text accidental.

                av = [];

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

                elemToRemove = fingering;
                break;
            }
        }
    }

    if (av == null) return msNote;

    // remove the fingering.
    msNote.internalNote.remove(elemToRemove);

    var orderedSymbols = [];

    // Loop from left most (last) acc chain to right most acc chain.
    for (var accChainIdx = tuningConfig.accChains.length - 1; accChainIdx >= 0; accChainIdx--) {
        var accChain = tuningConfig.accChains[accChainIdx];
        var deg = av[accChainIdx];
        if (deg != 0) {
            var degIdx = deg + accChain.centralIdx;
            var symCodes = accChain.degreesSymbols[degIdx]; // left-to-right
            orderedSymbols = orderedSymbols.concat(symCodes);
        }
    }

    console.log('Set accidental from fingering: ' + orderedSymbols);

    setAccidental(msNote.internalNote, orderedSymbols,
        newElement, tuningConfig.usedSymbols);

    return tokenizeNote(msNote.internalNote);
}

/**
 * Parse a MuseScore Note into `NoteData`.
 * 
 * If a fingering accidental is found, it is rendered on to the note.
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
    var msNote = renderFingeringAccidental(tokenizeNote(note), tuningConfig, newElement);
    var noteData = readNoteData(msNote, tuningConfig, keySig, tickOfThisBar, tickOfNextBar, cursor);

    return noteData;
}

/**
 * Given current `NoteData` and a `TuningConfig`, calculate the
 * required note's tuning offset in cents.
 * 
 * @param {NoteData} noteData The note to be tuned
 * @param {TuningConfig} tuningConfig The tuning configuration
 * @returns {number} cents offset to apply to `Note.tuning` property
 */
function calcCentsOffset(noteData, tuningConfig) {
    // lookup tuning table [cents, equavesAdjusted]
    var cents_equaves = tuningConfig.tuningTable[noteData.xen.hash];

    // calc XenNote cents from A4

    // include equave offset (caused by equave modulo wrapping)
    var xenCentsFromA4 = cents_equaves[0] - cents_equaves[1] * tuningConfig.equaveSize;

    // apply reference note tuning offset
    xenCentsFromA4 += Math.log(tuningConfig.tuningFreq / 440) * 1200 / Math.log(2);

    // apply NoteData equave offset.
    xenCentsFromA4 += noteData.equaves * tuningConfig.equaveSize;

    // 2 different fingering tuning annotations can be applied to a note.
    // (and can be applied simultaneously).
    //
    // They are applied in this order:
    //
    // 1. The fingering JI interval/ratio tuning overrides the tuning entirely,
    // tuning the note as the specified ratio against the reference note.
    // Its octave is automatically reduced/expanded to be as close as possible to 
    // xenCentsFromA4. By default, this fingering must be suffixed by a period
    // unless the REQUIRE_PERIOD_AFTER_FINGERING_RATIO flag is set to false.
    // 
    // 2. The fingering cents offset simply offsets tuning by the specified
    //    amount of cents.

    var fingeringCentsOffset = 0;
    var fingeringJIOffset = null; // this is in cents

    noteData.ms.fingerings.forEach(function (fingering) {
        var text = fingering.text;

        if (text[0] && (text[0] == '+' || text[0] == '-')) {
            // Cents offset fingering
            var cents = parseFloat(eval(text.slice(1)));
            if (!isNaN(cents)) {
                fingeringCentsOffset += cents * (text[0] == '+' ? 1 : -1);
            }
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
            }
        }
    });

    if (fingeringJIOffset) {
        // We need to octave reduce/expand this until it is as close as possible to 
        // xenCentsFromA4.

        xenCentsFromA4 = fingeringJIOffset - Math.round((fingeringJIOffset - xenCentsFromA4) / 1200) * 1200;
    }

    // Apply cents offset.

    xenCentsFromA4 += fingeringCentsOffset;

    // calculate 12 edo interval from A4

    var standardCentsFromA4 =
        (noteData.ms.midiNote - 69) * 100;

    // the final tuning calculation is the difference between the two
    return xenCentsFromA4 - standardCentsFromA4;
}

/**
 * Literally just tunes the note. It's that simple!
 * 
 * If a note's cent offset is too great (especially in
 * systems with weird nominals/non-octave) we will have to use a different MIDI pitch
 * than the original `Note.pitch`, otherwise, the playback will have a very
 * weird timbre.
 * 
 * This function tunes a note by adjusting both its `.tuning` and `.playEvents`
 * properties. Make sure to always re-run the tune function when notes are
 * changed, (especially when using Shift+Alt+Up/Down diatonic transpose)
 * because it's not obvious when the `.playEvents` property is
 * tempered with, and a note may seemingly play back with the wrong pitch if
 * the tune function isn't run again.
 * 
 * **Make sure _curScore.createPlayEvents() is called** so that play events
 * are populated & modifiable from the plugin API!
 * 
 * This function also generates MIDI CSV entries for PlayEvents of the note
 * if `returnMidiCSV` is set to true.
 * 
 * **IMPORTANT: Cursor must be positioned where the msNote is before 
 * calling this function!**
 * 
 * `cursor.element` must point to the Chord of msNote, or if msNote is
 * a grace note, `cursor.element` must point to the Chord the grace note is
 * attached to.
 * 
 * @param {PluginAPINote} note MuseScore note object
 * @param {KeySig} keySig 
 * @param {TuningConfig} tuningConfig 
 * @param {number} tickOfThisBar Tick of first segment of this bar
 * @param {number} tickOfNextBar Tick of first segment of next bar, or -1 if last bar.
 * @param {Cursor} cursor MuseScore note object
 * @param {BarState?} reusedBarState See parm description of {@link getAccidental()}.
 * @param {boolean} newElement Reference to the `PluginAPI::newElement` function.
 * @param {boolean} returnMidiCSV 
 *  If true, this function will iterate play events of this note and create
 *  midi text events for each play event.
 * @param {number?} partVelocity 
 *  If `returnMidiCSV` is true, you will need to specify the velocity of
 *  the part (from Dynamic segment annotations). Individual note velocity
 *  is usually set to an offset relative to the part velocity.
 * @returns {string} MIDI CSV string to append to the midi csv file.
 */
function tuneNote(note, keySig, tuningConfig, tickOfThisBar, tickOfNextBar, cursor,
    reusedBarState, newElement, returnMidiCSV, partVelocity) {

    var noteData = parseNote(note, tuningConfig, keySig,
        tickOfThisBar, tickOfNextBar, cursor, newElement, reusedBarState);

    var centsOffset = calcCentsOffset(noteData, tuningConfig);


    // console.log("Found note: " + noteData.xen.hash + ", equave: " + noteData.equaves);

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

    centsOffset -= midiOffset * 100;

    note.tuning = centsOffset;

    // Update midi offset as well.

    // If there are ornaments on this note, the ornaments
    // will result in multiple play events. Though,
    // it's not possible to microtune the ornaments, you can still at least
    // tune them within +/- 100 cents.
    for (var i = 0; i < note.playEvents.length; i++) {
        // the PlayEvent.pitch property is relative
        // to the original note's pitch.
        note.playEvents[i].pitch = midiOffset;
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

        console.log('registered: staff: ' + staffIdx + ', pitch: ' + pitch + ', ontime: ' + ontime
            + ', len: ' + len + ', vel: ' + velo + ', cents: ' + tuning);
        console.log('veloType: ' + note.veloType);

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
 * @param {number[]} bars List of tick positions of each barline.
 * @returns {number[]} `[tickOfThisBar, tickOfNextBar]`
 */
function getBarBoundaries(tick, bars) {
    var tickOfNextBar = -1; // if -1, the cursor at the last bar
    var tickOfThisBar = -1; // if -1, something's wrong.

    for (var i = 0; i < bars.length; i++) {
        if (bars[i] > tick) {
            tickOfNextBar = bars[i];
            break;
        }
        tickOfThisBar = bars[i];
    }

    return [tickOfThisBar, tickOfNextBar];
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

    // console.log('readBarState(' + tickOfThisBar + ', ' + tickOfNextBar + ')');

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
            if (cursor.element && cursor.element.type == Ms.CHORD) {
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
 * - Otherwise, if two options have very similar AV distances, choose the one with
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
 * @param {PluginAPINote} note The current `PluginAPI::Note` MuseScore note object to be modified
 * @param {KeySig} keySig Current key signature
 * @param {TuningConfig} tuningConfig Tuning Config object
 * @param {number} tickOfThisBar Tick of first segment of the bar
 * @param {number} tickOfNextBar Tick of first segment of the next bar, or -1 if last bar.
 * @param {Cursor} cursor MuseScore cursor object
 * @param {BarState} reusedBarState
 * @param {*} newElement 
 *  Reference to `PluginAPI::newElement`.
 *  
 *  Rationale: The parseNote function may create accidental symbols if an
 *  accidental fingering text is attached on the note.
 * @returns {NextNote?} 
 *  `NextNote` object containing info about how to spell the newly modified note.
 *  Returns `null` if no next note can be found.
 */
function chooseNextNote(direction, constantConstrictions, note, keySig,
    tuningConfig, tickOfThisBar, tickOfNextBar, cursor, newElement) {

    var noteData = parseNote(note, tuningConfig, keySig,
        tickOfThisBar, tickOfNextBar, cursor, newElement);

    console.log('Choosing next note for (' + noteData.xen.hash + ', eqv: ' + noteData.equaves + ')');

    if (direction === 0) {
        // enharmonic cycling
        var enharmonicNoteHash = tuningConfig.enharmonics[noteData.xen.hash];

        if (enharmonicNoteHash === undefined) {
            // No enharmonic spelling found. Return null.
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
            matchPriorAcc: false, // always false, doesn't matter.
            // The enharmonic plugin should check for the need of explicit accidentals
            // on its own.
        }
    }


    // Otherwise, it's an up/down operation.

    // The index of the StepwiseList this note is currently at.
    var currStepIdx = tuningConfig.stepsLookup[noteData.xen.hash];

    console.log('currStepIdx: ' + currStepIdx);

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
        console.log('WARNING: no valid next note options found for note: ' + noteData.xen.hash +
            '\nDid you declare an invalid tuning system?');
        return null;
    }

    var currAV = tuningConfig.avTable[noteData.xen.hash];

    // Returns the XenNote hash option so far.
    var bestOption = null;

    if (tuningConfig.equaveSize < 0) {
        equaveOffset = -equaveOffset;
        console.log('equaveSize < 0, reversing equaveOffset: ' + equaveOffset);
    }

    // AccidentalVector Distance is measured as sum of squares
    var bestOptionAccDist = 100000;
    var bestNumSymbols = 10000;
    var bestLineOffset = 90000;
    var bestSumOfDegree = direction == 1 ? -10000 : 10000;

    for (var i = 0; i < Math.max(5, validOptions.length); i++) {
        var option = validOptions[i % validOptions.length]; // contains XenNote hash of enharmonic option.

        var newXenNote = tuningConfig.notesTable[option];

        var newNoteEqvsAdj = tuningConfig.tuningTable[option][1];
        var currNoteEqvsAdj = tuningConfig.tuningTable[noteData.xen.hash][1];

        var totalEqvOffset = newNoteEqvsAdj - currNoteEqvsAdj + equaveOffset;

        var nominalOffset = newXenNote.nominal - noteData.xen.nominal +
            totalEqvOffset * tuningConfig.numNominals;

        // check each option to see if it would match a prior accidental
        // on the new line. An AccidentalVector match is considered a match,
        // The `regarding` constriction is not so strict to the point where
        // enharmonics based on prior existing accidentals are disallowed.

        var priorAcc = getAccidental(
            cursor, note, tickOfThisBar, tickOfNextBar, 2, note.line - nominalOffset);


        if (priorAcc == null && keySig) {
            var keySigAcc = keySig[newXenNote.nominal];
            if (keySigAcc != null && keySigAcc.length == tuningConfig.numNominals) {
                priorAcc = keySigAcc;
            }
        }

        priorAcc = removeUnusedSymbols(priorAcc, tuningConfig);

        var optionAV = tuningConfig.avTable[option];

        if (priorAcc != null) {
            // This is used to look up the accidental's effect on the accidentalVector
            // it doesn't matter what nominal it uses since all identical accidental
            // hashes will result in the same accidentalVector.
            var priorAccHash = '0 ' + priorAcc;

            if (arraysEqual(optionAV, tuningConfig.avTable[priorAccHash])) {
                // Direct accidental match. Return this.
                return {
                    xen: newXenNote,
                    nominal: newXenNote.nominal,
                    equaves: noteData.equaves + newNoteEqvsAdj - currNoteEqvsAdj + equaveOffset,
                    lineOffset: -nominalOffset,
                    // This flag means that no explicit accidental needs to be
                    // placed on this new modified note.
                    matchPriorAcc: true
                }
            }
        } else {
            // If there's no prior accidental nor key signature accidental on this line,
            // if a note can be represented by a nominal, use the nominal. 
            // This avoids unnecessary enharmonics.

            if (option.split(' ').length == 1) {
                return {
                    xen: newXenNote,
                    nominal: newXenNote.nominal,
                    equaves: noteData.equaves + newNoteEqvsAdj - currNoteEqvsAdj + equaveOffset,
                    lineOffset: -nominalOffset,
                    matchPriorAcc: true
                }
            }
        }

        // Otherwise, choose the best accidental option according to the above stated choosing rules
        // in JSDoc.

        // Compute AV distance, choose option with smallest distance

        var avDist = 0;

        for (var j = 0; j < currAV.length; j++) {
            avDist += (currAV[j] - optionAV[j]) * (currAV[j] - optionAV[j]);
        }

        var sumOfDeg = currAV.reduce(function (acc, deg) {
            return acc + deg;
        });

        var nextNoteObj = {
            xen: newXenNote,
            nominal: newXenNote.nominal,
            equaves: noteData.equaves + newNoteEqvsAdj - currNoteEqvsAdj + equaveOffset,
            lineOffset: -nominalOffset,
            matchPriorAcc: false
        };

        if (bestOptionAccDist - avDist > 0.01) {
            // console.log('best av dist');
            bestOption = nextNoteObj;
            bestOptionAccDist = avDist;
            // reset other lower-tier metrics
            bestNumSymbols = 90000;
            bestLineOffset = 90000;
            bestSumOfDegree = direction == 1 ? -10000 : 10000;
        } else if (Math.abs(avDist - bestOptionAccDist) <= 0.01) {
            // If distances are very similar, choose the option with
            // lesser symbols
            var numSymbols = newXenNote.orderedSymbols.length;

            if (numSymbols < bestNumSymbols) {
                // console.log('best num symbols');
                bestOption = nextNoteObj;
                bestNumSymbols = numSymbols;
                bestLineOffset = 90000; // reset
                bestSumOfDegree = direction == 1 ? -10000 : 10000;
            } else if (numSymbols == bestNumSymbols) {
                // if everything else the same, pick
                // the one that has the least lineOffset

                if (Math.abs(nominalOffset) < bestLineOffset) {
                    // console.log('best line offset');
                    bestOption = nextNoteObj;
                    bestLineOffset = Math.abs(nominalOffset);
                    bestSumOfDegree = direction == 1 ? -10000 : 10000;
                } else if (Math.abs(nominalOffset) == bestLineOffset) {
                    // If all else are the same, pick the option that
                    // matches the direction of transpose.

                    // Up should favor sharps, down should favor flats.

                    if ((direction == 1 && sumOfDeg > bestSumOfDegree) ||
                        (direction == -1 && sumOfDeg < bestSumOfDegree)) {
                        // console.log('best sum of degree');
                        bestOption = nextNoteObj;
                        bestSumOfDegree = sumOfDeg;
                    }
                }
            }
        }
    }

    // At the end of all the optimizations, bestOption should contain
    // the best option...

    return bestOption;
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
    cursor.rewind(0);

    if (voice < 0 || voice > 3) {
        console.error("FATAL ERROR: setCursorToPosition voice out of range: " + voice);
        return;
    }

    if (staffIdx < 0 || (cursor.score && staffIdx >= cursor.score.nstaves)) {
        console.error("FATAL ERROR: setCursorToPosition staffIdx out of range: " + staffIdx);
        return;
    }

    // console.log('Called setCursorToPosition. tick: ' + tick + ', voice: ' + voice + ', staffIdx: ' + staffIdx);

    while (cursor.tick < tick) {
        if (cursor.measure && tick > cursor.measure.lastSegment.tick) {
            if (!cursor.nextMeasure()) {
                // console.log('INFO: setCursorToPosition reached end during forward measure traversal. tick: '
                //     + cursor.tick + ', elem: ' + cursor.element);
                break;
            }
        } else if (!cursor.next()) {
            // console.log('INFO: setCursorToPosition reached end during forward traversal to '
            //     + tick + '|' + voice + '. tick: ' + cursor.tick + ', elem: ' + cursor.element);
            break;
        }
    }

    while (cursor.tick > tick) {
        if (!cursor.prev()) {
            // console.log('WARN: setCursorToPosition reached start during backward traversal. tick: '
            //     + cursor.tick + ', elem: ' + cursor.element);
            break;
        }
    }

    if (cursor.tick != tick) {
        // This happens very frequently because the position to move to
        // may not contain any elements (e.g. voices 2, 3 and 4 are usually mostly blank).
        //
        // In these cases, the cursor will not move to the 'correct' location, but it is
        // fine since there is nothing to check anyways.
        // console.log('WARN: didn\'t set Cursor correctly (This is fine if voice/staff is blank).\n' +
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
 * 
 * Retrieves the effective accidental applied to the note.
 * 
 * If natural or no accidental to be applied, will return `null`.
 * 
 * If `before` is true, does not include accidentals attached to the current note 
 * in the search.
 * 
 * This function DOES NOT read MuseScore accidentals. Due to how
 * score data is exposed to the plugins API, it is not possible to
 * reliably determine accidentals when MS accidentals and SMuFL-only symbols
 * are used interchangeably.
 * 
 * Thus, only SMuFL symbols ("Symbols" category in the Master Palette)
 * are supported.
 * 
 * @param {Cursor} cursor MuseScore Cursor object
 * @param {PluginAPINote} note The note to check the accidental of.
 * @param {number} tickOfThisBar Tick of the first segment of the bar to check accidentals in
 * @param {number} tickOfNextBar Tick of first seg of next bar, or -1 if its the last bar.
 * @param {number?} exclude
 *  If `0` or falsey, include accidentals attached to the current operating `note`.
 * 
 *  If `1` ignore accidentals attached to the current `note`
 *  and only look for accidentals that are considered to appear 
 *  'before' `note`.
 * 
 *  If `2`, ignore any accidentals from any note that belongs to the same chord
 *  as `note`.
 * 
 *  The search will still return accidentals on prior notes in the same
 *  chord, or in a prior grace chord.
 * @param {number?} lineOverride 
 *  If `lineOverride` specified, reads accidentals on this line instead of
 *  the line of the `note` parameter.
 *  
 *  If `lineOverride` is different than the original `note.line`,
 *  `exclude=2` will be used, no matter what it was set to.
 * 
 *  TODO: Check if this may cause any problems.
 * @param {BarState?} reusedBarState
 *  If an empty object is provided, a shallow copy of the read bar state
 *  will be stored in this object.
 *  
 *  If the same bar is being read again, and nothing has changed in
 *  the bar, this object can be passed back to this function to reuse the bar state,
 *  so that it doesn't need to repeat `readBarState`.
 * 
 * @returns {string?} 
 *  If an accidental is found, returns the accidental hash of the
 *  {@link AccidentalSymbols} object. 
 *  
 *  If no accidentals found, returns null.
 */
function getAccidental(cursor, note, tickOfThisBar,
    tickOfNextBar, exclude, lineOverride, reusedBarState) {

    var nTick = getTick(note);
    var nLine = lineOverride || note.line;

    // console.log("getAccidental() tick: " + nTick + " (within " + tickOfThisBar + " - " 
    //     + tickOfNextBar + "), line: " + nLine);

    if (nTick > tickOfNextBar || nTick < tickOfThisBar) {
        console.error("FATAL ERROR: getAccidental() tick " + nTick +
            " not within given bar ticks: " + tickOfThisBar + " to " + tickOfNextBar);
        return null;
    }

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

    for (var tIdx = 0; tIdx < lineTicks.length; tIdx++) {
        var currTick = lineTicks[tIdx];
        // console.log('tick: ' + currTick);
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
                            // console.log('skip chd. chdIdx: ' + chdIdx);
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
                            // console.log('skipped: nIdx: ' + nIdx + ', nIdxOfNote: ' + nIdxOfNote);
                            continue;
                        }
                    }
                    var currNote = chd[nIdx];

                    var msNote = tokenizeNote(currNote);

                    if (msNote.accidentals) {
                        // we found the first explicit accidental! return it!
                        var accHash = accidentalsHash(msNote.accidentals);
                        console.log('Found accidental (' + accHash + ') at: t: ' +
                            currTick + ', v: ' + voice + ', chd: ' + chdIdx + ', n: ' + nIdx);

                        return accHash;
                    }
                } // end of note loop
            }// end of chord loop
        }// end of voice loop
    }// end of ticks loop

    // By the end of everything, if we still haven't found any explicit accidental,
    // return nothing.

    return null;
}

/**
 * Attach given accidentalSymbols to a note (clears existing accidentals)
 * or clears existing accidentals.
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
 * @param {Function} newElement reference to the `PluginAPI.newElement()` function
 * @param {Object.<string, boolean>?} usedSymbols
 *  If provided, any accidentals symbols that are not included in the tuning config
 *  will not be altered/removed by this function.
 */
function setAccidental(note, orderedSymbols, newElement, usedSymbols) {

    var elements = note.elements;
    var elemsToRemove = [];

    // First, remove any accidental symbols from note.

    for (var i = 0; i < elements.length; i++) {
        if (elements[i].symbol) {
            var symCode = Lookup.LABELS_TO_CODE[elements[i].symbol.toString()];
            if (symCode && (!usedSymbols || usedSymbols[symCode])) {
                // This element is an accidental symbol, remove it.
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
        var symId = Lookup.CODE_TO_LABELS[orderedSymbols[i]][0];
        var elem = newElement(Element.SYMBOL);
        elem.symbol = SymId[symId];
        note.add(elem);
        elem.z = zIdx;

        // var pageXBefore = elem.pagePos.x;

        // Just put some arbitrary 1.4sp offset
        // between each symbol for now.
        elem.offsetX = -1.4 * (zIdx - 999);

        // I've checked that setting an element's offset also updates
        // its pagePos immediately. Thus, pagePos is a reliable source
        // of an element's most updated position.
        // console.log('pagePos.x difference: ' + (elem.pagePos.x - pageXBefore));
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
    if (noteData.xen.accidentals != null) {
        setAccidental(note, noteData.xen.orderedSymbols, newElement, tuningConfig.usedSymbols);
    } else {
        // If no accidentals, also make the natural accidental explicit.
        setAccidental(note, [2], newElement, tuningConfig.usedSymbols);
    }
}

/**
 * Modifies accidentals & nominal on a MuseScore note.
 * 
 * @param {PluginAPINote} note `PluginAPI::Note` to set pitch, tuning & accidentals of
 * @param {number} lineOffset Nominals offset from current note's pitch
 * @param {SymbolCode[]} orderedSymbols Ordered accidental symbols as per XenNote.orderedSymbols.
 * @param {*} newElement 
 */
function modifyNote(note, lineOffset, orderedSymbols, newElement, usedSymbols) {
    console.log('modifyNote(' + (note.line + lineOffset) + ')');
    var newLine = note.line + lineOffset;

    // This is the easiest hacky solution to move a note's line.

    note.line = newLine;

    var acc = newElement(Element.ACCIDENTAL);
    note.add(acc);
    note.accidentalType = Accidental.NATURAL;

    acc = newElement(Element.ACCIDENTAL);
    note.add(acc);
    note.accidentalType = Accidental.NONE;

    note.line = newLine; // Finally...

    setAccidental(note, orderedSymbols, newElement, usedSymbols);
}

/**
 * Executes up/down/enharmonic on a note.
 * 
 * **IMPORTANT: The cursor must currently be at the note position.**
 * 
 * - Finds next pitch to transpose to
 * - Aggresively apply explicit accidentals on notes that may be affected by the
 *   modification of the current note.
 * - Modifies pitch & accidental of note. Explicit accidental is always used.
 * - Tunes the note.
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
    var constantConstrictions = parms.currTuning.auxList[aux]; // may be null/undefined
    var bars = parms.bars;
    var noteTick = getTick(note);

    var barBoundaries = getBarBoundaries(noteTick, bars);
    var tickOfThisBar = barBoundaries[0];
    var tickOfNextBar = barBoundaries[1];

    console.log('executeTranspose(' + direction + ', ' + aux + '). Check same: ' + JSON.stringify(constantConstrictions));

    // STEP 1: Choose the next note.
    var nextNote = chooseNextNote(
        direction, constantConstrictions, note, keySig, tuningConfig, tickOfThisBar,
        tickOfNextBar, cursor, newElement);

    if (!nextNote) {
        // If no next note (e.g. no enharmonic)
        // simple do nothing, return bar state.
        var newBarState = {};
        tuneNote(note, keySig, tuningConfig, tickOfThisBar, tickOfNextBar, cursor, newBarState, newElement);

        return newBarState;
    }

    // console.log('nextNote: ' + JSON.stringify(nextNote));

    var newLine = note.line + nextNote.lineOffset;

    // STEP 2: Apply explicit accidentals on notes that may be affected
    //         by the modification process.

    var ogCursorPos = saveCursorPosition(cursor);

    /*
    Applies explicit accidental to ALL notes with the same Note.line 
    as the current (old) note or the new Note.line of the modified note,
    whose .tick values match, or come after the current note's .tick value.
    
    This will include grace notes that come before the actual note,
    or other notes within the same chord & line.

    Of course, logically, only notes coming after the current will be affected, 
    but there's no point writing a whole bunch of if statements.

    The idea is to brute-force as many explicit accidentals as possible first,
    then remove unnecessary accidentals later.
    */

    for (var voice = 0; voice < 4; voice++) {

        setCursorToPosition(cursor, noteTick, voice, ogCursorPos.staffIdx);

        while (cursor.segment && cursor.tick < tickOfNextBar) {

            if (!(cursor.element && cursor.element.type == Ms.CHORD)) {
                cursor.next();
                continue;
            }

            var notes = cursor.element.notes;
            var graceChords = cursor.element.graceNotes;

            for (var i = 0; i < graceChords.length; i++) {
                var graceNotes = graceChords[i].notes;
                for (var j = 0; j < graceNotes.length; j++) {
                    var gnote = graceNotes[j];
                    if (!gnote.is(note) &&
                        (gnote.line == note.line
                            || gnote.line == newLine)) {
                        makeAccidentalsExplicit(gnote, tuningConfig, keySig,
                            tickOfThisBar, tickOfNextBar, newElement, cursor);
                    }
                }
            }

            for (var i = 0; i < notes.length; i++) {
                var n = notes[i];
                if (!n.is(note) && (n.line == note.line || n.line == newLine)) {
                    makeAccidentalsExplicit(n, tuningConfig, keySig,
                        tickOfThisBar, tickOfNextBar, newElement, cursor);
                }
            }

            cursor.next();
        }
    }

    restoreCursorPosition(ogCursorPos);

    //
    // STEP 3
    //
    //

    var accSymbols = nextNote.xen.orderedSymbols;

    if (!accSymbols || accSymbols.length == 0) {
        // If the nextNote is a nominal, use explicit natural symbol.

        // The new note added should always use explicit accidentals.
        accSymbols = [2];
    }

    modifyNote(note, nextNote.lineOffset, accSymbols, newElement, tuningConfig.usedSymbols);

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
 * Valid as in: `getAccidental()` will always return the correct effective
 * accidental on every single note in this bar.
 * 
 * **IMPORTANT:** `cursor.staffIdx` must be set to the staff to operate on.
 * 
 * @param {number} startBarTick Any tick position within the starting bar (or start of selection)
 * @param {number} endBarTick 
 *  Any tick pos within ending bar (or end of selection).
 *  If -1, performs the operation till the end of the score.
 * @param {Parms} parms Global `parms` object.
 * @param {Cursor} cursor Cursor object
 * @param {*} newElement Reference to the `PluginAPI.newElement()` function
 */
function removeUnnecessaryAccidentals(startBarTick, endBarTick, parms, cursor, newElement) {

    var staff = cursor.staffIdx;
    var bars = parms.bars;

    var lastBarTickIndex = -1; // if -1, means its the last bar of score
    var firstBarTickIndex = -1;

    for (var i = 0; i < bars.length; i++) {
        if (endBarTick != -1 && bars[i] > endBarTick) {
            lastBarTickIndex = i - 1;
            break;
        }
        if (bars[i] > startBarTick && firstBarTickIndex == -1) {
            firstBarTickIndex = i - 1;
        }
    }

    if (lastBarTickIndex == -1)
        lastBarTickIndex = bars.length - 1;

    if (firstBarTickIndex == -1)
        firstBarTickIndex = lastBarTickIndex;

    var tickOfThisBar = bars[firstBarTickIndex];

    console.log('removeUnnec( from bar ' + firstBarTickIndex + ' (' + tickOfThisBar + ') to ' + endBarTick + ')');

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

        for (var lineIdx = 0; lineIdx < lines.length; lineIdx++) {
            var lineNum = lines[lineIdx]; // staff line number
            var lineTickVoices = barState[lineNum]; // tick to voices mappings.

            // Sort ticks in increasing order.
            var ticks = Object.keys(barState[lineNum]).sort(
                function (a, b) {
                    return parseInt(a) - parseInt(b)
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
                        var msNotes = chds[chdIdx].map(
                            function (note) {
                                return tokenizeNote(note);
                            }
                        );
                        // All these notes are on the same line => all have the same nominal.
                        var nominal = getNominal(msNotes[0], tuningConfig);

                        // Before we proceed, make sure that all explicit accidentals 
                        // attached to notes within this same chord & line
                        // are exactly the same.

                        // Note that it is fine for these notes to be
                        // a mix of implicit and explicit accidentals, 
                        // as long as the accidentals are all the same.
                        // In that situation, it is clear that all the notes
                        // are the exact same note.

                        // Of course, people wouldn't write music like that,
                        // but while spamming transpose up/down, it is possible
                        // that such a scenario is reached, and the plugin should
                        // be able to smoothly handle it.

                        var prevExplicitAcc = null;
                        var proceed = true;
                        for (var noteIdx = 0; noteIdx < msNotes.length; noteIdx++) {
                            var accHash = accidentalsHash(msNotes[noteIdx].accidentals);
                            accHash = removeUnusedSymbols(accHash, tuningConfig) || '';

                            if (accHash != '') {
                                if (prevExplicitAcc == null) {
                                    prevExplicitAcc = accHash;
                                } else if (prevExplicitAcc != accHash) {
                                    // this chord contains notes with different
                                    // explicit accidentals. We cannot proceed.
                                    proceed = false;
                                    break;
                                }
                            }
                        }

                        if (!proceed) continue;

                        for (var noteIdx = 0; noteIdx < msNotes.length; noteIdx++) {
                            var msNote = msNotes[noteIdx];

                            var accHash = accidentalsHash(msNote.accidentals);
                            accHash = removeUnusedSymbols(accHash, tuningConfig) || '';
                            var accHashWords = accHash.split(' ');
                            var isNatural = accHashWords.length == 2 && accHashWords[0] == '2';

                            if (accHash != '') {
                                // we found an explicit accidental on this note.
                                // check if we really need it or not.

                                var currAccState = accidentalState[lineNum];

                                console.log('currAccState: ' + currAccState + ', accHash: ' + accHash 
                                    + ', keySig: ' + JSON.stringify(keySig) + ', nominal: ' + nominal);

                                if (currAccState && currAccState == accHash) {
                                    // if the exact same accidental hash is found on the
                                    // accidental state and this note, this note's
                                    // accidental is redundant. Remove it.

                                    setAccidental(msNote.internalNote, null, newElement, tuningConfig.usedSymbols);
                                } else if (!currAccState && keySig) {
                                    // If no prior accidentals before this note, and
                                    // this note matches KeySig, this note's acc
                                    // is also redundant. Remove.

                                    var realKeySig = removeUnusedSymbols(keySig[nominal], tuningConfig) || '';
                                    console.log('realKeySig: ' + realKeySig);
                                    if (realKeySig == accHash) {
                                        setAccidental(msNote.internalNote, null, newElement, tuningConfig.usedSymbols);
                                    }
                                } else if (isNatural && !currAccState && (!keySig || !keySig[nominal])) {
                                    // This note has a natural accidental, but it is not
                                    // needed, since the prior accidental state/key sig is natural.

                                    setAccidental(msNote.internalNote, null, newElement, tuningConfig.usedSymbols);
                                } else {
                                    // Otherwise, if we find an explicit accidental
                                    // that is necessary, update the accidental state.

                                    accidentalState[lineNum] = accHash;
                                }
                            }
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
    // console.log('intervalOverlap(' + a1 + ', ' + a2 + ', ' + b1 + ', ' + b2 + ')');
    return (a1 - b2) * (a2 - b1) <= 0;
}


/**
 * Reads notes in a Bar according to `Chords` structure.
 * 
 * Each `Chords` object represents the chords (+ grace chords) available
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
    // console.log('partitionChords(' + tickOfThisBar + ', ' + tickOfNextBar + ')');

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
            if (cursor.element && cursor.element.type == Ms.CHORD) {
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
 * Positions accidental symbols for all voices' chords that are to be
 * vertically-aligned.
 * 
 * returns the largest (negative) distance between the left-most symbol the notehead 
 * it is attached to. This returned value will decide how much should
 * grace chords be pushed back.
 * 
 * @param {PluginAPINote[]} chord Notes from all voices at a single tick & vertical-chord position.
 * @param {Object.<string, boolean>} usedSymbols 
 *  Contains SymbolCodes that are currently used by the tuning config.
 *  Any symbols found that are not inside this object will be removed.
 * @returns {number} most negative distance between left-most symbol and left-most notehead.
 */
function positionAccSymbolsOfChord(chord, usedSymbols) {

    // First, we need to sort the chord by increasing line number. (top-to-bottom)
    chord.sort(function (a, b) { return a.line - b.line });

    // console.log("chord.length: " + chord.length);
    // chord.forEach(function(n) { console.log("HALLO: " + Object.keys(n)); });

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
        // console.log('noteline: ' + note.line);
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
    var registeredSymbolOffsets = [];

    var count = 0;
    while (count++ < chord.length) {
        // console.log(count + ') posElemsBbox: ' + JSON.stringify(positionedElemsBbox.map(function (bbox) {
        //     return bbox.left;
        // })));
        var note = chord[isZig ? ascIdx : descIdx];

        var absNoteBbox = {
            left: note.pagePos.x + note.bbox.left,
            right: note.pagePos.x + note.bbox.right,
            top: note.pagePos.y + note.bbox.top,
            bottom: note.pagePos.y + note.bbox.bottom
        };

        var accSymbolsRTL = [];

        // stores list of all accidental symbols attached to this notehead.
        // Symbols appearing to the right come first.
        for (var i = 0; i < note.elements.length; i++) {
            var elem = note.elements[i];
            // console.log(JSON.stringify(elem.bbox));
            if (elem.symbol) {
                var symCode = Lookup.LABELS_TO_CODE[elem.symbol.toString()];
                if (symCode && (!usedSymbols || usedSymbols[symCode])) {
                    accSymbolsRTL.push(elem);
                }
            }
        }

        accSymbolsRTL.sort(function (a, b) { return a.z - b.z });


        if (accSymbolsRTL.length != 0) {
            // Found acc symbols to position on this note.

            var symbolsWidth = accSymbolsRTL.reduce(function (acc, sym) {
                return acc + (sym.bbox.right - sym.bbox.left);
            }, 0);

            // Now that we have the sorted list of symbols to add, we need
            // to find holes in the positionedElemsBbox list to insert them.

            var prevElemLeft = null;
            for (var i = 0; i < positionedElemsBbox.length; i++) {
                var bbox = positionedElemsBbox[i];
                var willCollideVertically = intervalOverlap(bbox.top - 0.4, bbox.bottom + 0.4, absNoteBbox.top, absNoteBbox.bottom);

                // console.log('check bbox: ' + bbox.left + ', willCollideVertically: ' + willCollideVertically);
                if (!willCollideVertically) continue;

                if (prevElemLeft == null) {
                    prevElemLeft = bbox.left;
                    continue;
                }

                var gapWidth = prevElemLeft - bbox.right;

                prevElemLeft = bbox.left; // absolute x left pos of positioned bbox.

                if (gapWidth >= symbolsWidth && prevElemLeft <= note.pagePos.x) {
                    // console.log('gapWidth: ' + gapWidth + ', symbolsWidth: ' + symbolsWidth + ', prevElemLeft: ' + prevElemLeft + ', note.pagePos.x: ' + note.pagePos.x)
                    // the symbols can be added in this gap.
                    // exit loop. prevElemLeft now contains the absolute position
                    // to put the right most symbol.
                    break;
                }
            }

            // There was no gap between vertically intersecting elements 
            // prevElemLeft contains the leftmost element left pos.

            // prevX is the relative offset to assign to the curr symbol.
            var prevX = prevElemLeft - note.pagePos.x;

            accSymbolsRTL.forEach(function (sym) {
                var offX = prevX - (sym.bbox.right - sym.bbox.left) - ACC_SPACE;
                // console.log('offX: ' + offX);
                registeredSymbolOffsets.push({
                    sym: sym,
                    x: offX,
                    y: 0
                });

                if (offX < mostNegativeDistance) {
                    mostNegativeDistance = offX;
                }

                // create abs bbox for newly positioned symbol
                var symBbox = {
                    left: note.pagePos.x + offX + sym.bbox.left,
                    right: note.pagePos.x + offX + sym.bbox.right,
                    top: note.pagePos.y + sym.bbox.top,
                    bottom: note.pagePos.y + sym.bbox.bottom
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

    // console.log(count + ') posElemsBbox: ' + JSON.stringify(positionedElemsBbox.map(function (bbox) {
    //     return bbox.left;
    // })));

    // Now, we need to apply the offsets

    registeredSymbolOffsets.forEach(function (symOff) {
        symOff.sym.offsetX = symOff.x;
        symOff.sym.offsetY = symOff.y;
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
 */
function autoPositionAccidentals(startTick, endTick, parms, cursor) {
    var bars = parms.bars;
    var staff = cursor.staffIdx;

    var lastBarTickIndex = -1; // if -1, means its the last bar of score
    var firstBarTickIndex = -1;

    for (var i = 0; i < bars.length; i++) {
        if (endTick != -1 && bars[i] > endTick) {
            lastBarTickIndex = i - 1;
            break;
        }
        if (bars[i] > startTick && firstBarTickIndex == -1) {
            firstBarTickIndex = i - 1;
        }
    }

    if (lastBarTickIndex == -1)
        lastBarTickIndex = bars.length - 1;

    if (firstBarTickIndex == -1)
        firstBarTickIndex = lastBarTickIndex;

    var tickOfThisBar = bars[firstBarTickIndex];

    console.log('autoPosition(' + startTick + ', ' + endTick + ') from bar '
        + firstBarTickIndex + ' (' + tickOfThisBar + ') to ' + endTick);

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

        // console.log('auto positioning from ' + tickOfThisBar + ' to ' + tickOfNextBar +
        //     '\nTicks found: ' + ticks.join(', '));

        ticks.forEach(function (tick) {
            // the Chords object
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
                    // console.log('num chords in voice ' + voice + ': ' + chords[voice].length);
                    var chord = chords[voice][vertStackIndex]; // [Note]
                    if (!chord) {
                        // console.log('no chord in voice ' + voice + ' at vertStackIndex ' + vertStackIndex);
                        continue;
                    }

                    if (chord.length == 0) {
                        // console.log('chord no notes');
                        continue;
                    }

                    // console.log('num notes in chord: ' + chord.length);

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

                    if (chdElement.parent.type != Ms.CHORD) {
                        console.error("ERROR: parent of note object isn't a chord??");
                        continue;
                    }

                    chdElement.parent.offsetX = graceOffset;
                    // console.log('applied grace chord offset: ' + graceOffset);

                    vertStack = vertStack.concat(chord);
                }

                // console.log('vertStack.length: ' + vertStack.length);
                // console.log('vertStack[0]: ' + vertStack[0]);

                // If no more chords at this vert stack index,
                // finish.
                if (vertStack.length == 0) break;

                // Now, we have all notes that should be vertically aligned.
                // Position symbols for this vert stack.
                // console.log(vertStack.length);
                var biggestXOffset = positionAccSymbolsOfChord(vertStack, fakeParms.currTuning.usedSymbols);

                graceOffset += biggestXOffset;

                vertStackIndex++;
            }
        });

        tickOfThisBar = tickOfNextBar;
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

function operationTune() {
    console.log('Running Xen Tune');
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
    console.log("startStaff: " + startStaff + ", endStaff: " + endStaff + ", endTick: " + endTick);

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
            console.log("Populating configs. staff: " + staff + ", voice: " + voice);

            while (true) {
                // loop from first segment to last segment of this staff+voice.
                if (cursor.segment) {
                    for (var i = 0; i < cursor.segment.annotations.length; i++) {
                        var annotation = cursor.segment.annotations[i];
                        console.log("found annotation type: " + annotation.name);
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
                        console.log("New bar - " + measureCount);
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
            var currBar = parms.bars.length - 1;
            for (var i = 0; i < parms.bars.length; i++) {
                if (parms.bars[i] > cursor.tick) {
                    currBar = i - 1;
                    break;
                }
            }

            var tickOfThisBar = parms.bars[currBar];
            var tickOfNextBar = currBar == parms.bars.length - 1 ? -1 : parms.bars[currBar + 1];

            console.log("Tuning. staff: " + staff + ", voice: " + voice);
            // console.log("Starting bar: " + currBar + ", tickOfThisBar: " + tickOfThisBar + ", tickOfNextBar: " + tickOfNextBar);

            // Tuning doesn't affect note/accidental state,
            // we can reuse bar states per bar to prevent unnecessary
            // computation.
            var reusedBarState = {};
            var tickOfLastModified = -1;

            // Loop elements of a voice
            while (cursor.segment && (fullScore || cursor.tick < endTick)) {
                if (tickOfNextBar != -1 && cursor.tick >= tickOfNextBar) {
                    removeUnnecessaryAccidentals(
                        tickOfThisBar, tickOfThisBar, parms, cursor, newElement);
                    // Update bar boundaries.
                    currBar++;
                    tickOfThisBar = tickOfNextBar;
                    tickOfNextBar = currBar == parms.bars.length - 1 ? -1 : parms.bars[currBar + 1];
                    // console.log("Next bar: " + currBar + ", tickOfThisBar: " + tickOfThisBar + ", tickOfNextBar: " + tickOfNextBar);
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
                    if (cursor.element.type == Ms.CHORD) {
                        var graceChords = cursor.element.graceNotes;
                        for (var i = 0; i < graceChords.length; i++) {
                            // iterate through all grace chords
                            var notes = graceChords[i].notes;
                            for (var j = 0; j < notes.length; j++) {
                                tuneNote(notes[j], parms.currKeySig, parms.currTuning,
                                    tickOfThisBar, tickOfNextBar, cursor, reusedBarState, newElement);
                            }
                        }
                        var notes = cursor.element.notes;
                        for (var i = 0; i < notes.length; i++) {
                            tuneNote(notes[i], parms.currKeySig, parms.currTuning,
                                tickOfThisBar, tickOfNextBar, cursor, reusedBarState, newElement);

                            // REMOVE AFTER TESTING
                            // this is how find other symbols (aux accidentals) attached to the note
                            // for (var j = 0; j < note.elements.length; j++) {
                            //   if (note.elements[j].symbol)
                            //     console.log(note.elements[j].symbol);
                            // }
                        }

                        tickOfLastModified = cursor.tick;
                    }
                }
                cursor.next();
            }

            if (tickOfLastModified != -1) {
                removeUnnecessaryAccidentals(
                    tickOfLastModified, tickOfLastModified, parms,
                    cursor, newElement);
            }
        } // end of voice loop

        _curScore.endCmd();

        _curScore.startCmd();

        autoPositionAccidentals(
            startTick, endTick, parms, cursor
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
    console.log("Xen Up");

    if (typeof _curScore === 'undefined')
        return;

    console.log(Qt.resolvedUrl("."));
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
        console.log('no phrase selection');
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
    console.log(startStaff + " - " + endStaff + " - " + endTick)

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
            console.log("Populating configs. staff: " + staff + ", voice: " + voice);

            while (true) {
                if (cursor.segment) {
                    // scan edo & tuning center first. key signature parsing is dependant on edo used.
                    for (var i = 0; i < cursor.segment.annotations.length; i++) {
                        var annotation = cursor.segment.annotations[i];
                        console.log("found annotation type: " + annotation.name);
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
                        console.log("New bar - " + measureCount + ", tick: " + cursor.segment.tick);
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

        if (curScore.selection.elements.length == 0) {
            console.log('no individual selection. quitting.');
            return;
        } else {
            var selectedNotes = [];
            for (var i = 0; i < _curScore.selection.elements.length; i++) {
                if (curScore.selection.elements[i].type == Element.NOTE) {
                    selectedNotes.push(curScore.selection.elements[i]);
                }
            }

            // for debugging
            // for (var i = 0; i < selectedNotes.length; i ++) {
            //   selectedNotes[i].color = 'red';
            // }

            if (selectedNotes.length == 0 && fallthroughUpDownCommand) {
                console.log('no selected note elements, defaulting to pitch-up/pitch-down shortcuts');
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

                console.log('indiv note: line: ' + note.line + ', voice: ' + cursor.voice
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

                var barBoundaries = getBarBoundaries(tick, parms.bars);

                // Modify pitch.

                _curScore.startCmd();

                // direction: 1: up, -1 = down, 0: enharmonic cycle.
                var barState = executeTranspose(note, stepwiseDirection,
                    stepwiseAux, parms, newElement, cursor);

                // Remove unnecessary accidentals just for this bar.

                removeUnnecessaryAccidentals(
                    tick, tick, parms, cursor, newElement);

                _curScore.endCmd();
                _curScore.startCmd();

                // Auto position accidentals in this bar.
                autoPositionAccidentals(
                    tick, tick, parms, cursor
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
                var currBar = parms.bars.length - 1;
                for (var i = 0; i < parms.bars.length; i++) {
                    if (parms.bars[i] > cursor.tick) {
                        currBar = i - 1;
                        break;
                    }
                }

                var tickOfThisBar = parms.bars[currBar];
                var tickOfNextBar = currBar == parms.bars.length - 1 ? -1 : parms.bars[currBar + 1];

                cursor.staffIdx = staff;
                cursor.voice = voice;

                console.log('processing:' + cursor.tick + ', voice: ' + cursor.voice + ', staffIdx: ' + cursor.staffIdx);

                var tickOfLastModified = -1;

                // Loop elements of a voice
                while (cursor.segment && (cursor.tick < endTick)) {
                    if (tickOfNextBar != -1 && cursor.tick >= tickOfNextBar) {
                        // At the end of every bar, remove unnecessary accidentals.
                        removeUnnecessaryAccidentals(
                            tickOfThisBar, tickOfThisBar, parms, cursor, newElement);

                        // We can't do this one-shot at the end, because the unnecessary accidentals
                        // dependins on tuning config & key sig, which may be different for each
                        // bar.

                        // However, a more efficient method would be to store the last tick when
                        // key sig/tuning config was changed, and when config is changed
                        // again, we remove unnecessary accidentals, then proceed.
                        // This would be more efficient than re-running this function every bar.
                        // 
                        // TODO: improve efficiency of removeUnnecessaryAccidentals call
                        // (Only if performance improvements are necessary)

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
                        if (cursor.element.type == Ms.CHORD) {
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

            // After processing all voices in a staff, 
            // auto position accidentals in this staff in the selection range
            autoPositionAccidentals(
                startTick, endTick, parms, cursor
            );
            _curScore.endCmd();
        }
    }
}