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

// Just 12 EDO.
var DEFAULT_TUNING_CONFIG = "   \n\
A4: 440                         \n\
0 200 300 500 700 800 1000 1200 \n\
bbb bb b (100) # x #x           \n\
";

/**
 * Returns the default tuning config to apply when none is specified
 */
function generateDefaultTuningConfig() {
    console.log("Generating default tuning config...");
    console.log(DEFAULT_TUNING_CONFIG);
    var tuningConfig = parseTuningConfig(DEFAULT_TUNING_CONFIG);
    return tuningConfig;
}

/*
Any two notes that are less than this many cents apart will be considered
enharmonically equivalent.

Don't set this too low, it may cause floating point errors to
make enharmonically equivalent show up as not equivalent.

Don't set this too high, it may cause notes that should not be
considered enharmonically equivalent to show up as equivalent.
*/
var ENHARMONIC_EQUIVALENT_THRESHOLD = 0.03;

/**
 * 
 * @param {*} MSAccidental Accidental enum from MuseScore plugin API.
 * @param {*} MSNoteType NoteType enum from MuseScore plugin API.
 */
function init(MSAccidental, MSNoteType, MSSymId, MSElement, MSMs) {
    Lookup = ImportLookup();
    // console.log(JSON.stringify(Lookup));
    Accidental = MSAccidental;
    SymId = MSSymId;
    NoteType = MSNoteType;
    Ms = MSMs;
    Element = MSElement;
    console.log("Hello world! Enharmonic eqv: " + ENHARMONIC_EQUIVALENT_THRESHOLD + " cents");
}

/**
 * Modulo function that always returns a positive number.
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
 * Convert user-string input SymbolCode or Text Code into SymbolCode ID.
 * 
 * @param {string} codeOrText
 * @returns {number?} SymbolCode number or null if invalid.
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
 * @param {*} note 
 * @returns `Segment.tick` tick time-position of note.
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
 * @param {*} note `PluginAPI::Note`
 * @returns {*?} Chord element containing the grace note, or null
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
 * Reads the Ms::PluginAPI::Note and creates a `MSNote` data structure.
 * 
 * @param {*} note `PluginAPI::Note`
 */
function tokenizeNote(note) {
    // 69 = MIDI A4
    var octavesFromA4 = Math.floor((note.pitch - 69) / 12);
    var nominals = Lookup.TPC_TO_NOMINAL[note.tpc][0];
    octavesFromA4 += Lookup.TPC_TO_NOMINAL[note.tpc][1];

    var hasAcc = false;
    var accidentals = {};

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

        var acc = Lookup.LABELS_TO_CODE[note.elements[i].symbol.toString()];

        if (acc) {
            if (accidentals[acc])
                accidentals[acc] += 1;
            else
                accidentals[acc] = 1;

            hasAcc = true;
        }
    }

    var msNote = { // MSNote
        midiNote: note.pitch,
        tpc: note.tpc,
        nominalsFromA4: nominals + (octavesFromA4 * 7),
        accidentals: hasAcc ? accidentals : null,
        tick: getTick(note),
        line: note.line,
        internalNote: note
    };

    return msNote;
}

/**
 * 
 * Hashes the accidental symbols attached to a note.
 * 
 * The result is appended to the nominal of a note to construct a XenNote.
 * 
 * You can also specify a list of unsorted `SymbolCode`s that are present.
 * (useful for hashing accidentals from user-input)
 * 
 * @param {AccidentalSymbols|[SymbolCode]} accidentals 
 *      The AccidentalSymbols object, or a list of `SymbolCode` numbers
 * @returns {string} AccidentalSymbols hash string.
 */
function accidentalsHash(accidentals) {

    if (accidentals == undefined) {
        // just in case...
        console.log('WARN: undefined accidentals passed to accidentalsHash');
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
 * Calculate a XenNote.hash string from its nominal and accidental object.
 */
function createXenHash(nominal, accidentals) {
    return (nominal + ' ' + accidentalsHash(accidentals)).trim();
}

/**
 * Tests system/staff text to see if it is a tuning config.
 * 
 * If it is, parses it and creates a TuningConfig object.
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
 * @param {string} text The system/staff text contents to parse.
 * 
 * @returns {TuningConfig} The parsed tuning configuration object, or null text was not a tuning config.
 */
function parseTuningConfig(text) {
    var text = text.trim();

    if (text.length == 0) {
        // console.log('not tuning config: empty text');
        return null;
    }

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
        numNominals: null,
        equaveSize: null,
        tuningNote: null,
        tuningNominal: null,
        tuningFreq: null,
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
    tuningConfig.tuningFreq = parseFloat(referenceTuning[1]);

    // PARSE NOMINALS
    //
    //

    var hasInvalid = false;
    var nominals = lines[1].split(' ').map(function (x) {
        var f = parseFloat(x);
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

        var matches = line.match(/(lig|aux)\([0-9,]+\)/);
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

            if (word.match(/\([0-9.]+\)/)) {
                increment = parseFloat(word.slice(1, word.length - 1));
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
                    return code;
                });

                if (hasInvalid) {
                    console.log('invalid symbol: ' + symbols_offset[0]);
                    return null;
                }

                var offset = symbols_offset.length > 1 ? parseFloat(symbols_offset[1].slice(0, symbols_offset[1].length - 1)) : 0;

                degreesSymbols.push(symbolCodes);
                offsets.push(offset);
            }
        }

        if (!increment || centralIdx == null) {
            console.log('Invalid accidental chain: "' + accChainStr.join(' ') + '" in ' + line);
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
            console.log('Expecting lig(...) or aux(...), got "' + line + '" instead.');
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
            console.log('Invalid ligature declaration: ' + line);
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
                    return code;
                });

            if (hasInvalid) {
                console.log('invalid ligature symbol: ' + words[words.length - 1]);
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

    // TODO.

    for (var i = nextDeclStartLine; i < lines.length; i++) {
        if (nextDeclStartLine == null) break;
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
                var ligaturedSymbols = Object.assign({}, accidentalSymbols); // shallow copy
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

    return keySig;
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
 * @param {string} text System/Staff Text contents
 * @param {number} tick Current tick position
 * @returns {ConfigUpdateEvent?} 
 *  The `ConfigUpdateEvent` to add to `staffConfigs[]`, or `null` if invalid/not a config
 * 
 */
function parsePossibleConfigs(text, tick) {
    if (tick === undefined || tick === null) {
        console.log('FATAL ERROR: parsePossibleConfigs() missing tick parameter!');
        return null;
    }

    var text = removeFormattingCode(text);

    var maybeConfig = parseTuningConfig(text);

    if (maybeConfig != null) {
        var numSteps = maybeConfig.stepsList.length;
        console.log("Found tuning config:\n" + text + "\n" + numSteps + " steps/equave");
        // tuning config found.

        return { // ConfigUpdateEvent
            tick: tick,
            config: {
                currTuning: maybeConfig
            }
        };
    }

    maybeConfig = parseKeySig(text);

    if (maybeConfig != null) {
        // key sig found
        console.log("Found key sig:\n" + text);

        return { // ConfigUpdateEvent
            tick: tick,
            config: {
                currKeySig: maybeConfig
            }
        }
    }

    return null;
}

/**
 * At the start of each voice, call this to reset parms to default.
 * 
 * @param {parms} parms Parms object.
 */
function resetParms(parms) {
    parms.currTuning = generateDefaultTuningConfig();
    parms.currKeySig = null;
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
 * @param {[number]} tickOfThisBar Tick of first segment of this bar
 * @param {[number]} tickOfNextBar Tick of first seg of the next bar, or -1 if last bar
 * @param {*} MuseScore Cursor object
 * @returns {NoteData?} 
 *      The parsed note data. If the note's accidentals are not valid within the
 *      declared TuningConfig, returns `null`.
 */
function readNoteData(msNote, tuningConfig, keySig, tickOfThisBar, tickOfNextBar, cursor) {
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

    // graceChord will contain the chord this note belongs to if the current note
    // is a grace note.
    var graceChord = findGraceChord(msNote.internalNote);

    var accidentalsHash = getAccidental(
        cursor, msNote.internalNote, tickOfThisBar, tickOfNextBar, 0);

    console.log("Found effective accidental: " + accidentalsHash);

    if (accidentalsHash == null && keySig && keySig[nominal] != null
        // Check if KeySig has a valid number of nominals.
        && keySig[nominal].length == tuningConfig.numNominals) {
        // If no prior accidentals found within the bar,
        // look to key signature.
        accidentalsHash = keySig;
    }

    if (accidentalsHash != null) {
        var acHashSplit = accidentalsHash.split(' ');
        if (acHashSplit.length == 2 && acHashSplit[0] == '2') {
            // treat any number of natural symbols = no accidental
            accidentalsHash = null;
        }
    }

    // Create hash manually.
    // Don't use the createXenHash function, that works on the AccidentalSymbols object
    // instead of the hash.
    var xenHash = nominal;

    if (accidentalsHash != null) {
        xenHash += ' ' + accidentalsHash;
    }

    var xenNote = tuningConfig.notesTable[xenHash];

    if (xenNote == undefined) {
        console.log("FATAL ERROR: Could not find XenNote (" + xenHash + ") in tuning config");
        console.log("Tuning config: " + JSON.stringify(tuningConfig.notesTable));
        return null;
    }

    return {
        ms: msNote,
        xen: xenNote,
        equaves: equaves
    };
}

/**
 * Parse a MuseScore Note into `NoteData`.
 * 
 * @param {*} note MuseScore Note object
 * @param {TuningConfig} tuningConfig Current tuning config applied.
 * @param {KeySig} keySig Current key signature applied.
 * @param {[number]} tickOfThisBar Tick of first segment of this bar
 * @param {[number]} tickOfNextBar Tick of first segment of next bar, or -1 if last bar.
 * @param {*} cursor MuseScore Cursor object
 * @returns {NoteData} NoteData object
 */
function parseNote(note, tuningConfig, keySig, tickOfThisBar, tickOfNextBar, cursor) {
    var msNote = tokenizeNote(note);
    console.log(accidentalsHash(msNote.accidentals));
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

    // calc cents (from reference note) of XenNote spelt in equave 0
    // remember to include equave offset (caused by equave modulo wrapping)
    var xenCentsFromRef = cents_equaves[0] - cents_equaves[1] * tuningConfig.equaveSize;

    // apply NoteData equave offset.
    xenCentsFromRef += noteData.equaves * tuningConfig.equaveSize;

    // calculate 12 edo interval from reference
    var standardCentsFromRef =
        (noteData.ms.midiNote - tuningConfig.tuningNote) * 100;

    // the final tuning calculation is the difference between the two
    return xenCentsFromRef - standardCentsFromRef;
}

/**
 * Literally just tunes the note. It's that simple!
 * 
 * Ok it's not. If a note's cent offset is too great (especially in
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
 * **Make sure curScore.createPlayEvents() is called** so that play events
 * are populated & modifiable from the plugin API!
 * 
 * **IMPORTANT: Cursor must be positioned where the msNote is before 
 * calling this function!**
 * 
 * `cursor.element` must point to the Chord of msNote, or if msNote is
 * a grace note, `cursor.element` must point to the Chord the grace note is
 * attached to.
 * 
 * @param {*} note MuseScore note object
 * @param {KeySig} keySig 
 * @param {TuningConfig} tuningConfig 
 * @param {*} cursor MuseScore note object
 */
function tuneNote(note, keySig, tuningConfig, bars, cursor) {
    var barBoundaries = getBarBoundaries(getTick(note), bars);

    var noteData = parseNote(note, tuningConfig, keySig,
        barBoundaries[0], barBoundaries[1], cursor);

    var centsOffset = calcCentsOffset(noteData, tuningConfig);

    console.log("Found note: " + noteData.xen.hash + ", equave: " + noteData.equaves);

    var midiOffset = Math.round(centsOffset / 100);

    if (Math.abs(midiOffset) <= 2) {
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
}

/**
 * Finds the tick of the first segment of the bar that 'tick'
 * lives in, and also the first segment of the next bar.
 * 
 * If `tick` is within the last bar of the score,
 * returns `-1` for the next bar tick.
 * 
 * @param {number} tick The tick position to check
 * @param {[number]} bars List of tick positions of each barline.
 * @returns {[number]} `[tickOfThisBar, tickOfNextBar]`
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
 * @param {*} tickOfNextBar 
 * @param {*} cursor 
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
 * Retrieve the next note up/down/enharmonic from the current `PluginAPI::Note`, and
 * returns `XenNote` and `Note.line` offset to be applied on the note.
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
 * - And if all else are equal, we should pick the enharmonic spelling that 
 *   minimizes nominal/line offset amount.
 * 
 * 
 * A `NextNote.matchPriorAcc` flag will be returned `true` if an enharmonic
 * spelling is found that matches prior accidental state.
 * 
 * @param {number} direction `1` for upwards, `0` for enharmonic cycling, `-1` for downwards.
 * @param {[number]?} accChainsToCheckSame
 *  An optional list of indices of accidental chains specifying the accidental chains
 *  that must maintain at the same degree.
 *  
 *  This is applied for auxiliary up/down function where certain accidental movements
 *  are skipped.
 * 
 *  (Only applicable if direction is `1`/`-1`. Not applicable for enharmonic)
 * 
 * @param {*} note The current `PluginAPI::Note` MuseScore note object to be modified
 * @param {KeySig} keySig Current key signature
 * @param {TuningConfig} tuningConfig Tuning Config object
 * @param {number} tickOfThisBar Tick of first segment of the bar
 * @param {number} tickOfNextBar Tick of first segment of the next bar, or -1 if last bar.
 * @param {*} cursor MuseScore cursor object
 * @returns {NextNote?} 
 *  `NextNote` object containing info about how to spell the newly modified note.
 *  Returns `null` if no next note can be found.
 */
function chooseNextNote(direction, accChainsToCheckSame, note, keySig,
    tuningConfig, tickOfThisBar, tickOfNextBar, cursor) {

    var noteData = parseNote(note, tuningConfig, keySig,
        tickOfThisBar, tickOfNextBar, cursor);
    
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
        // accChainsToCheckSame

        var currNoteAccVec = tuningConfig.avTable[noteData.xen.hash];

        if (accChainsToCheckSame != null) {
            // Loop each accidental chain to check degree matches one at a time.
            for (var foo = 0; foo < accChainsToCheckSame.length; foo++) {
                // newNote.accVec[accChainIdx] needs to match currNote.accVec[accChainIdx]
                var accChainIdx = accChainsToCheckSame[foo];

                // loop enharmonic spellings at newStepIdx
                for (var j = 0; j < enharmonicOptions.length; j++) {
                    var option = enharmonicOptions[j];
                    if (tuningConfig.avTable[option][accChainIdx] != currNoteAccVec[accChainIdx]) {
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

    console.log('validOptions: ' + JSON.stringify(validOptions));

    var currAV = tuningConfig.avTable[noteData.xen.hash];

    // Returns the XenNote hash option so far.
    var bestOption = null;

    // AccidentalVector Distance is measured as sum of squares
    var bestOptionAccDist = 100000;
    var bestNumSymbols = 10000;
    var bestLineOffset = 90000;

    for (var i = 0; i < validOptions.length; i++) {
        var option = validOptions[i]; // contains XenNote hash of enharmonic option.

        var newXenNote = tuningConfig.notesTable[option];

        var newNoteEqvsAdj = tuningConfig.tuningTable[option][1];
        var currNoteEqvsAdj = tuningConfig.tuningTable[noteData.xen.hash][1];;

        var nominalOffset = newXenNote.nominal - noteData.xen.nominal +
            (newNoteEqvsAdj - currNoteEqvsAdj + equaveOffset) * tuningConfig.numNominals;

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

        var nextNoteObj = {
            xen: newXenNote,
            nominal: newXenNote.nominal,
            equaves: noteData.equaves + newNoteEqvsAdj - currNoteEqvsAdj + equaveOffset,
            lineOffset: -nominalOffset,
            matchPriorAcc: false
        };

        if (avDist < bestOptionAccDist) {
            bestOption = nextNoteObj;
            bestOptionAccDist = avDist;
            // reset other lower-tier metrics
            bestNumSymbols = 90000;
            bestLineOffset = 90000;
        } else if (Math.abs(avDist - bestOptionAccDist) < 0.01) {
            // If distances are very similar, choose the option with
            // lesser symbols
            var numSymbols = newXenNote.orderedSymbols.length;

            if (numSymbols < bestNumSymbols) {
                bestOption = nextNoteObj;
                bestNumSymbols = numSymbols;
                bestLineOffset = 90000; // reset
            } else if (numSymbols == bestNumSymbols) {
                // Last tier: if everything else the same, pick
                // the one that has the least lineOffset

                if (Math.abs(nominalOffset) < bestLineOffset) {
                    bestOption = nextNoteObj;
                    bestLineOffset = Math.abs(nominalOffset);
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
 * @param {*} cursor MuseScore cursor object
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
        console.log("FATAL ERROR: setCursorToPosition voice out of range: " + voice);
        return;
    }

    if (staffIdx < 0 || (cursor.score && staffIdx >= cursor.score.nstaves)) {
        console.log("FATAL ERROR: setCursorToPosition staffIdx out of range: " + staffIdx);
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
 * Returns a SavedCursorPosition to be fed into `restoreCursorPosition()`.
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
 * @param {*} cursor MuseScore Cursor object
 * @param {*} note The note to check the accidental of.
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
 * @returns {string?} 
 *  If an accidental is found, returns the accidental hash of the
 *  AccidentalSymbols object. 
 *  
 *  If no accidentals found, returns null.
 */
function getAccidental(cursor, note, tickOfThisBar,
    tickOfNextBar, exclude, lineOverride) {

    var nTick = getTick(note);
    var nLine = lineOverride || note.line;

    // console.log("getAccidental() tick: " + nTick + " (within " + tickOfThisBar + " - " 
    //     + tickOfNextBar + "), line: " + nLine);

    if (nTick > tickOfNextBar || nTick < tickOfThisBar) {
        console.log("FATAL ERROR: getAccidental() tick " + nTick + 
            " not within given bar ticks: " + tickOfThisBar + " to " + tickOfNextBar);
        return null;
    }

    var barState = readBarState(tickOfThisBar, tickOfNextBar, cursor);

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
 * @param {*} note `PluginAPI::Note`
 * @param {[SymbolCode]?} orderedSymbols 
 *  A list of `SymbolCode`s representing accidental symbols in left-to-right order.
 * 
 *  `null` or `[]` to remove all accidentals.
 * @param {Function} newElement reference to the `PluginAPI.newElement()` function
 */
function setAccidental(note, orderedSymbols, newElement) {

    var elements = note.elements;
    var elemsToRemove = [];

    // First, remove any accidental symbols from note.

    for (var i = 0; i < elements.length; i++) {
        if (elements[i].symbol) {
            var symIdLookup = Lookup.LABELS_TO_CODE[elements[i].symbol.toString()];
            if (symIdLookup) {
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
        // Just put some arbitrary 1.4sp offset
        // between each symbol for now.
        elem.offsetX = -1.4 * (zIdx - 999);
        zIdx++;
    }
}

function makeAccidentalsExplicit(note, tuningConfig, keySig, tickOfThisBar, tickOfNextBar, newElement, cursor) {
    var noteData = parseNote(note, tuningConfig, keySig, tickOfThisBar, tickOfNextBar, cursor);
    if (noteData.xen.accidentals != null) {
        setAccidental(note, noteData.xen.orderedSymbols, newElement);
    } else {
        // If no accidentals, also make the natural accidental explicit.
        setAccidental(note, [2], newElement);
    }
}

/**
 * Modifies accidentals & nominal on a MuseScore note.
 * 
 * @param {*} note `PluginAPI::Note` to set pitch, tuning & accidentals of
 * @param {number} lineOffset Nominals offset from current note's pitch
 * @param {[SymbolCode]} orderedSymbols Ordered accidental symbols as per XenNote.orderedSymbols.
 * @param {*} newElement 
 */
function modifyNote(note, lineOffset, orderedSymbols, newElement) {
    console.log('modifyNote(' + (note.line + lineOffset) + ', ' + JSON.stringify(orderedSymbols) + ')');
    var newLine = note.line + lineOffset;
    note.line = newLine;

    var acc = newElement(Element.ACCIDENTAL);
    note.add(acc);
    note.accidentalType = Accidental.NATURAL;

    acc = newElement(Element.ACCIDENTAL);
    note.add(acc);
    note.accidentalType = Accidental.NONE;

    note.line = newLine; // Some hack to really make it register...

    setAccidental(note, orderedSymbols, newElement);
}

/**
 * Executes up/down/enharmonic on a note.
 * 
 * **IMPORTANT: The cursor must currently be at the note position.**
 * 
 * - Finds next pitch to transpose to
 * - Aggresively apply explicit accidentals on notes that may be affected by the
 *   modification of the current note.
 * - Modifies pitch & accidental of note.
 * - Tunes the note.
 * 
 * This function will create some unnecessary accidentals that should be
 * removed after this bar is processed.
 * 
 * @param {*} note `PluginAPI::Note` object to modify
 * @param {number} direction 1 for up, -1 for down, 0 for enharmonic cycle
 * @param {number?} aux 
 *  The Nth auxiliary operation for up/down operations. If 0/null, defaults
 *  to normal stepwise up/down. Otherwise, the Nth auxiliary operation will
 *  be performed.
 * 
 * @param {*} parms Reference to `parms` object.
 * @param {*} newElement Reference to `PluginAPI.newElement()` function
 * @param {*} cursor Cursor object.
 */
function executeTranspose(note, direction, aux, parms, newElement, cursor) {
    var tuningConfig = parms.currTuning;
    var keySig = parms.currKeySig; // may be null/invalid
    var regarding = parms.currAux; // may be null/undefined
    var bars = parms.bars;
    var noteTick = getTick(note);

    var barBoundaries = getBarBoundaries(noteTick, bars);
    var tickOfThisBar = barBoundaries[0];
    var tickOfNextBar = barBoundaries[1];

    console.log('executeTranspose(' + direction + ', ' + aux + '): ');

    // TODO: implement aux config & operations.

    // STEP 1: Choose the next note.
    var nextNote = chooseNextNote(
        direction, null, note, keySig, tuningConfig, tickOfThisBar, tickOfNextBar, cursor);

    console.log('nextNote: ' + JSON.stringify(nextNote));

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

    modifyNote(note, nextNote.lineOffset, nextNote.xen.orderedSymbols, newElement);

    //
    // STEP 4
    //

    tuneNote(note, keySig, tuningConfig, bars, cursor);
}

/**
 * Remove unnecessary accidentals from specified bars within staff.
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
 * @param {KeySig} keySig Key signature object
 * @param {[number]} bars List of bars' ticks
 * @param {*} cursor Cursor object
 * @param {*} newElement Reference to the `PluginAPI.newElement()` function
 */
function removeUnnecessaryAccidentals(startBarTick, endBarTick, keySig, bars, cursor, newElement) {

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

    var currBarTick = bars[firstBarTickIndex];

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


        var nextBarTick;
        if (barIdx == bars.length - 1) {
            nextBarTick = -1;
        } else {
            nextBarTick = bars[barIdx + 1];
        }

        var barState = readBarState(currBarTick, nextBarTick, cursor);

        // Mapping of lines to accidental hash
        // If a line has no accidentals thus far, check key signature
        // to see if an accidental is redundant.
        var accidentalState = {};

        var lines = Object.keys(barState);

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
                            var accHashWords = accHash.split(' ');
                            var isNatural = accHashWords.length == 2 && accHashWords[0] == '2';

                            if (accHash != '') {
                                // we found an explicit accidental on this note.
                                // check if we really need it or not.

                                var currAccState = accidentalState[lineNum];

                                if (currAccState && currAccState == accHash) {
                                    // if the exact same accidental hash is found on the
                                    // accidental state and this note, this note's
                                    // accidental is redundant. Remove it.

                                    setAccidental(msNote.internalNote, null, newElement);
                                } else if (!currAccState && keySig && keySig[lineNum] == accHash) {
                                    // If no prior accidentals before this note, and
                                    // this note matches KeySig, this note's acc
                                    // is also redundant. Remove.

                                    setAccidental(msNote.internalNote, null, newElement);
                                } else if (isNatural && !currAccState && (!keySig || !keySig[lineNum])) {
                                    // This note has a natural accidental, but it is not
                                    // needed, since the prior accidental state/key sig is natural.

                                    setAccidental(msNote.internalNote, null, newElement);
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
        currBarTick = nextBarTick;
    }
}