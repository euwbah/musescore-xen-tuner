// MUST USE ES5 SYNTAX FOR MSCORE COMPAT.
var Lookup = ImportLookup();

/**
 * During init, this will be assigned to the MuseScore plugin API `Accidental` enum.
 */
var Accidental = null;

/*
Any two notes that are less than this many cents apart will be considered
enharmonically equivalent.

Don't set this too low, it may cause floating point errors to
make enharmonically equivalent show up as not equivalent.

Don't set this too high, it may cause notes that should not be
considered enharmonically equivalent to show up as equivalent.
*/
var ENHARMONIC_EQUIVALENT_THRESHOLD = 0.03;

SIMULATED_TUNING_CONFIG = "     \n\
A4: 440                         \n\
0 200 300 500 700 800 1000 1200 \n\
(100) #                         \n\
(20) /                          \n\
lig(1,2)                        \n\
1 1 #^                          \n\
";

function init(MSAccidental) {
    Lookup = ImportLookup();
    Accidental = MSAccidental;
    console.log("Hello world! Enharmonic eqv: " + ENHARMONIC_EQUIVALENT_THRESHOLD + " cents");

    // This is to test that imports are working properly...

    console.log(Lookup);
    for (var i = 1; i < 10; i++) {
        var acc = Accidental[Lookup.CODE_TO_LABELS[i][0]];
        console.log(acc);
    }
}

/**
 * Modulo function that always returns a positive number.
 */
function mod(x, y) {
    return ((x % y) + y) % y;
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
 * @returns {number?} SymbolCode ID or null if invalid.
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
 * Reads the Ms::PluginAPI::Note and creates a `MSNote` data structure.
 */
function readNote(note) {
    // 69 = MIDI A4
    var octavesFromA4 = Math.floor((note.pitch - 69) / 12);
    var nominals = Lookup.TPC_TO_NOMINAL[note.tpc][0];
    octavesFromA4 += Lookup.TPC_TO_NOMINAL[note.tpc][1];

    var accidentals = {};

    // Removed. This plugin no longer attempts to deal with musescore's accidentals.
    // 
    // This plugin relies on SMuFL symbols attached from symbols in the "Symbols"
    // category of the Master Palette only.
    //
    // if (note.accidental) {
    //     // If note has a Full/Half supported accidental,
    //     var symCode = Lookup.LABELS_TO_CODE['' + note.accidental];
    //     accidentals[symCode] = 1;
    // }

    for (var i = 0; i < note.elements.length; i++) {
        // If note has a Full/Half supported accidental,

        var acc = Lookup.LABELS_TO_CODE['' + note.elements[i].symbol];

        if (acc) {
            if (accidentals[acc])
                accidentals[acc] += 1;
            else
                accidentals[acc] = 1;
        }
    }

    var msNote = { // MSNote
        midiNote: note.pitch,
        tpc: note.tpc,
        nominalsFromA4: nominals + (octavesFromA4 * 7),
        accidentals: accidentals,
        tick: getTick(note),
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
 * @param {AccidentalSymbols} accidentals The AccidentalSymbols object
 * @returns {string} AccidentalSymbols hash string.
 */
function accidentalsHash(accidentals) {
    var symCodeNums = [];

    Object.keys(accidentals)
        .map(function (x) { return parseInt(x); })
        .sort()
        .forEach(function (symCode) {
            symCodeNums.push(symCode);
            symCodeNums.push(accidentalSymbols[symCode]);
        });
    
    return symCodeNums.join(' ');
}

/**
 * Calculate a XenNote.hash string from its nominal and accidental object.
 */
function xenHash(nominal, accidentals) {
    return nominal + ' ' + accidentalsHash(accidentals);
}

/**
 * Tests system/staff text to see if it is a tuning config.
 * 
 * If it is, parses it and creates a TuningConfig object.
 * 
 * Example tuning config text:
 * 
 * A4: 440
 * 0 203.91 294.13 498.04 701.96 792.18 996.09 1200
 * bb.bb 7 bb b (113.685) # x 2 x.x
 * \.\ \ (21.506) / /./
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
                    accidentals: {},
                    hash: xenHash(nomIdx, {}),
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
            var symbolsOrder = [];

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
                        newSymbols.push(symCode);
                    }
                });

                symbolsOrder = newSymbols.concat(symbolsOrder);

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

            var properlyOrdererdAccSymbols = {};

            symbolsOrder.forEach(function (symCode) {
                properlyOrdererdAccSymbols[symCode] = accidentalSymbols[symCode];
            });

            xenNotesEquaves.push({
                av: accidentalVector,
                xen: { // XenNote
                    nominal: nomIdx,
                    accidentals: properlyOrdererdAccSymbols,
                    hash: xenHash(nomIdx, properlyOrdererdAccSymbols)
                },
                cents: cents,
                equavesAdjusted: equavesAdjusted,
            });

            // SETTLE IMPLEMENTING LIGATURES AS ENHARMONICS
            //
            //

            tuningConfig.ligatures.forEach(function (lig) {
                var ligAv = [];
                var ligaturedSymbols = Object.assign({}, accidentalSymbols); // shallow copy

                /*
                As per spec, the ligatured symbols take the place of the right-most
                symbol it replaces.
                */

                // Stores the index of the right-most symbol it replaces.
                var ligSymbolIdx = 0;

                lig.regarding.forEach(function (idx) {
                    // idx represents each accidental chain that this ligature checks for
                    var deg = accidentalVector[idx];
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

                                var orderIdx = symbolsOrder.indexOf(symCode);
                                if (orderIdx > ligSymbolIdx)
                                    ligSymbolIdx = orderIdx;
                            }
                        }
                    });
                });

                // contains symbols from ligature, in user-specified order.
                var ligSymbols = lig.ligAvToSymbols[ligAv];

                if (ligSymbols) {
                    // A ligature match is found.

                    // contains accidentals for ligatured spelling of note.
                    var finalAccSymbols = {};

                    for (var orderIdx = 0; orderIdx < symbolsOrder.length; orderIdx++) {
                        var symCode = symbolsOrder[orderIdx];
                        if (orderIdx == ligSymbolIdx) {
                            // Insert ligature symbols at designated position.

                            ligSymbols.forEach(function (symCode) {
                                if (finalAccSymbols[symCode])
                                    finalAccSymbols[symCode]++;
                                else
                                    finalAccSymbols[symCode] = 1;
                            });

                            continue;
                        }

                        // otherwise, copy remaining unaffected symbols from the
                        // original non-ligatured accidental symbols.

                        if (ligaturedSymbols[symCode]) {
                            finalAccSymbols[symCode] = ligaturedSymbols[symCode];
                        }
                    }

                    // Add the ligature as if it were an enharmonic equivalent.

                    xenNotesEquaves.push({
                        av: accidentalVector,
                        xen: { // XenNote
                            nominal: nomIdx,
                            accidentals: finalAccSymbols,
                            hash: xenHash(nomIdx, finalAccSymbols)
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
 * 
 * Uses TuningConfig and cursor to read XenNote data from a tokenized musescore note.
 * 
 * Cursor used for getAccidental() to find accidentals on prior notes.
 * 
 * @param {MSNote} msNote Representation of tokenized musescore note
 * @param {TuningConfig} tuningConfig 
 * @param {*} MuseScore Cursor object
 * @returns {NoteData} The parsed note data
 */
function readNoteData(msNote, tuningConfig, cursor, parms) {
    /*
    Example repr. of the note Ebbbb\\4 with implicit accidentals:
    {
        ms: { // MSNote
            midiNote: 64, // E4
            tpc: 18, // E
            nominalsFromA4: -3, // E4 is 3 nominals below A4.
            accidentals: null,
            tick: 1337,
            internalNote: MScore::Note // copy of internal musescore note object
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
    */

    var ms = msNote;
    var xen = {};
    var equaves = 0;

    // Convert nominalsFromA4 to nominals from tuning note.

    var nominalsFromTuningNote = ms.nominalsFromA4 - tuningConfig.tuningNominal;
    equaves = Math.floor(nominalsFromTuningNote / tuningConfig.numNominals);
    xen.nominal = mod(nominalsFromTuningNote, tuningConfig.numNominals);

    // graceChord will contain the chord this note belongs to if the current note
    // is a grace note.
    var graceChord = undefined;
    if (note.noteType == NoteType.ACCIACCATURA || note.noteType == NoteType.APPOGGIATURA ||
        note.noteType == NoteType.GRACE4 || note.noteType == NoteType.GRACE16 ||
        note.noteType == NoteType.GRACE32) {
        graceChord = note.parent;
    }

    var accidentalsHash = getAccidental(
        cursor, msNote.internalNote, msNote.internalNote.line, 
        false, parms, false, msNote, graceChord);
    xen.accidentals = ms.accidentals;
    xen.hash = getHash(xen);
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
    var xenCentsFromRef = cents_equaves[0] + cents_equaves[1] * tuningConfig.equaveSize;

    // apply NoteData equave offset.
    xenCentsFromRef += noteData.equaves * tuningConfig.equaveSize;

    // calculate 12 edo interval from reference
    var standardCentsFromRef =
        (noteData.ms.midiNote - tuningConfig.tuningNote) * 100;

    // the final tuning calculation is the difference between the two
    return xenCentsFromRef - standardCentsFromRef;
}

/**
 * Get the next XenNote and nominal offset of the stepwise note 
 * above/below the current `noteData`.
 * 
 * 
 * 
 * @param {NoteData} noteData The current unmodified note
 * @param {boolean} upwards `true` if upwards, `false` if downwards
 * @param {[boolean]} regarding A list of boolean values indicating whether or not to
 * consider the nth accidental chain when choosing the next note.
 * @param {*} tuningConfig
 * @returns {[NextNote]} Array XenNote and nominal offset of next note from the current note.
 */
function chooseNextNote(noteData, upwards, disregard, tuningConfig) {

}

/**
 * Move the cursor to a specified position.
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

    while (cursor.tick < tick) {
        // cursor.next();
        if (tick > cursor.measure.lastSegment.tick) {
            if (!cursor.nextMeasure()) {
                console.log('FATAL ERROR: setCursorToPosition next measure BREAK. tick: ' + cursor.tick + ', elem: ' + cursor.element);
                break;
            }
        } else if (!cursor.next()) {
            console.log('FATAL ERROR: setCursorToPosition next BREAK. tick: ' + cursor.tick + ', elem: ' + cursor.element);
            break;
        }
    }

    while (cursor.tick > tick) {
        // cursor.next();
        if (!cursor.prev()) {
            console.log('FATAL ERROR: setCursorToPosition prev BREAK. tick: ' + cursor.tick + ', elem: ' + cursor.element);
            break;
        }
    }

    // how can this even happen
    if (cursor.tick !== tick)
        console.log('FATAL ERROR: cursor position messed up (setCursorToPosition). tick: ');
}

/**
 * 
 * Inner function called by `getAccidental()`. Do not use this directly.
 * 
 * @param {*} cursor MuseScore Cursor object
 * @param {number} noteTick Tick of the current note to check the accidental of
 * @param {number} line Note.line property (Y position on musical stave)
 * @param {number} tickOfThisBar tick of start of current bar
 * @param {number} tickOfNextBar tick of next bar (or if end of score, last element of this bar)
 * @param {boolean} botchedCheck If true, check for botched accidentals.
 * @param {boolean} before 
 *      If true, ignore accidentals attached to the current note head
 *      and only look for accidentals occuring before.
 *      The search will still return accidentals on notes with the same `.tick`,
 *      for prior voices and graceBefore notes.
 *      It will also return accidentals on notes in the same chord and line that
 *      MuseScore considers to appear 'before' the current note.
 * @param {*} currentOperatingNote 
 *      If `before` is specified, should contain the current musescore note object
 *      to exclude from the search.
 * @param {*} graceChord 
 *      If the plugin is currently modifying a grace note, this should contain 
 *      the Chord object this grace note belongs to.
 * @param {*} excludeBeforeInSameChord 
 *      If this is `true` and `before` is specified, the search should not
 *      return accidentals on notes that belong to the same chord as the
 *      currentOperatingNote.
 * @returns {string?} 
 *      If an accidental is found, returns the accidental hash of the
 *      AccidentalSymbols object. 
 *      
 *      If `botchedCheck` is `true` and the
 *      accidental is possibly botched, returns the string `'botched'`.
 *      
 *      If no accidentals found, returns null.
 */
function _getMostRecentAccidentalInBar(
    cursor, noteTick, line, tickOfThisBar, tickOfNextBar,
    botchedCheck, before, currentOperatingNote, graceChord,
    excludeBeforeInSameChord) {

    var originalCursorTick = cursor.tick;
    var thisCursorVoice = cursor.voice;
    var thisStaffIdx = cursor.staffIdx;
    var mostRecentExplicitAcc;
    var mostRecentExplicitAccTick = -1;
    // if 2 notes ticks are the same, the voice index matters as well.
    // higher voice idx = accidental takes precedence!
    var mostRecentExplicitAccVoice = -1;
    var mostRecentDoubleLineTick = -1;
    var mostRecentDoubleLineVoice = -1;

    if (tickOfNextBar == -1)
        tickOfNextBar = cursor.score.lastSegment.tick;

    console.log('getMostRecentAcc: called with parms: tick: ' + noteTick + ', line: ' + line + ', thisBar: ' + tickOfThisBar +
        ', nextBar: ' + tickOfNextBar + ', botchedCheck: ' + botchedCheck + ', before: ' + before +
        ', excludeBeforeInSameChord: ' + excludeBeforeInSameChord);

    for (var voice = 0; voice < 4; voice++) {

        cursor.rewind(1);
        cursor.voice = voice;
        cursor.staffIdx = thisStaffIdx;
        cursor.rewind(0);

        // move cursor to the segment at noteTick
        while (cursor.tick < tickOfThisBar && cursor.nextMeasure());
        while (cursor.tick < noteTick && cursor.next());


        while (tickOfThisBar !== -1 && cursor.segment && cursor.tick >= tickOfThisBar) {
            if (cursor.element && cursor.element.type == Ms.CHORD) {
                // because this is backwards-traversing, it should look at the main chord first before grace chords.
                var notes = cursor.element.notes;
                var nNotesInSameLine = 0;
                /**
                 * Contains the string hash of AccidentalSymbols object.
                 * @type {string}
                 */
                var explicitAccidental = undefined;

                // Processing main chord.

                // If true, only graces notes should be searched.
                var searchGraces = false;

                // Search only grace notes if this function is to return accidentals being applied 
                // to a grace note, and the current cursor position is that of the chord this
                // grace note is attached to.
                if (graceChord !== undefined && graceChord.parent.parent.tick == cursor.tick)
                    searchGraces = true;

                if (!searchGraces) {

                    // Start search for accidentals on current chord (non-grace)

                    for (var i = 0; i < notes.length; i++) {
                        // Loops through all notes in this chord

                        if ((!before || (
                            getTick(notes[i]) < noteTick ||
                            ((notes[i].is(currentOperatingNote) === false &&
                                line == currentOperatingNote.line &&
                                currentOperatingNote.voice == voice &&
                                !excludeBeforeInSameChord) ||
                                voice < currentOperatingNote.voice)
                        )) &&
                            notes[i].line === line && getTick(notes[i]) <= noteTick) {
                            nNotesInSameLine++;

                            // This current note fulfils the accidental search condition.

                            // Only check for symbol elements.
                            
                            if (notes[i].elements) {
                                var accidentals = {}; // AccidentalSymbols object
                                for (var j = 0; j < notes[i].elements.length; j++) {
                                    var smuflId = notes[i].elements[j].symbol;
                                    if (smuflId && Lookup.LABELS_TO_CODE[smuflId]) {
                                        var symCode = Lookup.LABELS_TO_CODE[smuflId];
                                        if (accidentals[symCode]) {
                                            accidentals[symCode] ++;
                                        } else {
                                            accidentals[symCode] = 1;
                                        }
                                    }
                                }

                                if (Object.keys(accidentals).length > 0) {
                                    explicitAccidental = accidentalsHash(accidentals);
                                }
                            }
                        }
                    }

                    if ((nNotesInSameLine === 1 || !botchedCheck) && explicitAccidental &&
                        (cursor.tick > mostRecentExplicitAccTick ||
                            (cursor.tick === mostRecentExplicitAccTick && cursor.voice > mostRecentExplicitAccVoice))) {
                        mostRecentExplicitAcc = explicitAccidental;
                        mostRecentExplicitAccTick = cursor.tick;
                        mostRecentExplicitAccVoice = cursor.voice;
                        break;
                    } else if (nNotesInSameLine > 1 &&
                        (cursor.tick > mostRecentDoubleLineTick ||
                            (cursor.tick === mostRecentDoubleLineTick && cursor.voice > mostRecentDoubleLineVoice))) {
                        mostRecentDoubleLineTick = cursor.tick;
                        mostRecentDoubleLineVoice = cursor.voice;
                        break;
                    }
                }

                var graceChords = cursor.element.graceNotes;
                var beforeCurrent = !searchGraces;
                for (var gchdIdx = graceChords.length - 1; gchdIdx >= 0; gchdIdx--) {
                    // Move cursor to either the current selected grace chord
                    var isCurrentOperating = false;
                    if (!beforeCurrent) {
                        if (graceChords[gchdIdx].is(graceChord)) {
                            beforeCurrent = true;
                            isCurrentOperating = true;
                        } else {
                            continue;
                        }
                    }
                    // iterate through all grace chords
                    var notes = graceChords[gchdIdx].notes;
                    var nNotesInSameLine = 0;
                    var explicitAccidental = undefined;
                    for (var i = 0; i < notes.length; i++) {
                        if ((!before || (!isCurrentOperating ||
                            (notes[i].is(currentOperatingNote) === false &&
                                line == currentOperatingNote.line &&
                                currentOperatingNote.voice == voice &&
                                !excludeBeforeInSameChord)
                        )) &&
                            notes[i].line === line) {
                            nNotesInSameLine++;

                            // This current note fulfils the accidental search condition.

                            // Only check for symbol elements.
                            
                            if (notes[i].elements) {
                                var accidentals = {}; // AccidentalSymbols object
                                for (var j = 0; j < notes[i].elements.length; j++) {
                                    var smuflId = notes[i].elements[j].symbol;
                                    if (smuflId && Lookup.LABELS_TO_CODE[smuflId]) {
                                        var symCode = Lookup.LABELS_TO_CODE[smuflId];
                                        if (accidentals[symCode]) {
                                            accidentals[symCode] ++;
                                        } else {
                                            accidentals[symCode] = 1;
                                        }
                                    }
                                }

                                if (Object.keys(accidentals).length > 0) {
                                    explicitAccidental = accidentalsHash(accidentals);
                                }
                            }
                        }
                    }

                    if ((nNotesInSameLine === 1 || botchedCheck) && explicitAccidental &&
                        (cursor.tick > mostRecentExplicitAccTick ||
                            (cursor.tick === mostRecentExplicitAccTick && cursor.voice > mostRecentExplicitAccVoice))) {
                        mostRecentExplicitAcc = explicitAccidental;
                        mostRecentExplicitAccTick = cursor.tick;
                        mostRecentExplicitAccVoice = cursor.voice;
                        break;
                    } else if (nNotesInSameLine > 1 &&
                        (cursor.tick > mostRecentDoubleLineTick ||
                            (cursor.tick === mostRecentDoubleLineTick && cursor.voice > mostRecentDoubleLineVoice))) {
                        mostRecentDoubleLineTick = cursor.tick;
                        mostRecentDoubleLineVoice = cursor.voice;
                        break;
                    }
                }
            }

            cursor.prev();
        }
    }

    setCursorToPosition(cursor, originalCursorTick, thisCursorVoice, thisStaffIdx);

    if (botchedCheck && mostRecentDoubleLineTick !== -1 && mostRecentDoubleLineTick >= mostRecentExplicitAccTick) {
        return 'botched';
    } else if (mostRecentExplicitAcc && mostRecentExplicitAcc != Accidental.NONE) {
        return mostRecentExplicitAcc;
    } else {
        return null;
    }
}

/**
 * 
 * Retrieves the effective accidental applied at the current cursor position & stave line.
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
 * @param {number} tick Tick of the current note to check the accidental of
 * @param {number} noteLine Note.line property (Y position on musical stave)
 * @param {boolean} botchedCheck If true, check for botched accidentals.
 * @param {*} parms The universal `parms` object.
 * @param {boolean} before 
 *      If true, ignore accidentals attached to the current note head
 *      and only look for accidentals occuring before.
 *      The search will still return accidentals on notes with the same `.tick`,
 *      for prior voices and graceBefore notes.
 *      It will also return accidentals on notes in the same chord and line that
 *      MuseScore considers to appear 'before' the current note.
 * @param {*} currentOperatingNote 
 *      If `before` is specified, should contain the current musescore note object
 *      to exclude from the search.
 * @param {*} graceChord 
 *      If the plugin is currently modifying a grace note, this should contain 
 *      the Chord object this grace note belongs to.
 * @param {*} excludeBeforeInSameChord 
 *      If this is `true` and `before` is specified, the search should not
 *      return accidentals on notes that belong to the same chord as the
 *      currentOperatingNote.
 * @returns {string?} 
 *      If an accidental is found, returns the accidental hash of the
 *      AccidentalSymbols object. 
 *      
 *      If `botchedCheck` is `true` and the
 *      accidental is possibly botched, returns the string `'botched'`.
 *      
 *      If no accidentals found, returns null.
 */
function getAccidental(cursor, tick, noteLine, botchedCheck, parms, before,
    currentOperatingNote, graceChord, excludeBeforeInSameChord) {

    var tickOfNextBar = -1; // if -1, the cursor at the last bar

    for (var i = 0; i < parms.bars.length; i++) {
        if (parms.bars[i] > tick) {
            tickOfNextBar = parms.bars[i];
            break;
        }
    }

    var tickOfThisBar = -1; // this should never be -1

    for (var i = 0; i < parms.bars.length; i++) {
        if (parms.bars[i] <= tick) {
            tickOfThisBar = parms.bars[i];
        }
    }

    if (before === undefined)
        before = false;

    var result = _getMostRecentAccidentalInBar(cursor, tick, noteLine,
        tickOfThisBar, tickOfNextBar, botchedCheck, before,
        currentOperatingNote, graceChord, excludeBeforeInSameChord);

    return result;
}