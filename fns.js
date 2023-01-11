// MUST USE ES5 SYNTAX FOR MSCORE COMPAT.
var Lookup = ImportLookup();

/**
 * During init, this will be assigned to the MuseScore plugin API `Accidental` enum.
 */
var Accidental = null;
var NoteType = null;

// Just 12 EDO.
var DEFAULT_TUNING_CONFIG = "   \n\
A4: 440                         \n\
0 200 300 500 700 800 1000 1200 \n\
bbb bb b (100) # x #x           \n\
";

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
function init(MSAccidental, MSNoteType) {
    Lookup = ImportLookup();
    // console.log(JSON.stringify(Lookup));
    Accidental = MSAccidental;
    NoteType = MSNoteType;
    console.log("Hello world! Enharmonic eqv: " + ENHARMONIC_EQUIVALENT_THRESHOLD + " cents");
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
 * Reads the Ms::PluginAPI::Note and creates a `MSNote` data structure.
 */
function tokenizeNote(note) {
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
        }
    }

    var msNote = { // MSNote
        midiNote: note.pitch,
        tpc: note.tpc,
        nominalsFromA4: nominals + (octavesFromA4 * 7),
        accidentals: accidentals,
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
                    accidentals: {},
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
                    hash: createXenHash(nomIdx, properlyOrdererdAccSymbols)
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
                            hash: createXenHash(nomIdx, finalAccSymbols)
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

    var valid = true;

    nomSymbols.forEach(function (s) {
        var symbols = s.split('.');

        var symCodes = [];

        symbols.forEach(function (s) {
            var symbolCode = readSymbolCode(s);
            if (symbolCode == null) {
                valid = false;
            }
            symCodes.push(symbolCode);
        });

        keySig.push(accidentalsHash(symCodes));
    });

    if (!valid) {
        return null;
    }

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
        console.log("Found tuning config:\n" + text);
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
 * 
 * Uses TuningConfig and cursor to read XenNote data from a tokenized musescore note.
 * 
 * Uses cursor & getAccidental() to find accidentals on prior notes.
 * 
 * **IMPORTANT: Cursor must be positioned where the msNote is before 
 * calling this function!**
 * 
 * `cursor.element` must point to the Chord of msNote, or if msNote is
 * a grace note, `cursor.element` must point to the Chord the grace note is
 * attached to.
 * 
 * If no prior explicit accidentals found, looks for accidentals on key signature.
 * 
 * Otherwise, just returns the nominal XenNote object.
 * 
 * @param {MSNote} msNote Representation of tokenized musescore note
 * @param {TuningConfig} tuningConfig The current tuning config applied.
 * @param {KeySig?} keySig The current key signature applied, or null if none.
 * @param {[number]} bars Tick values of barlines as per `parms.bars`
 * @param {*} MuseScore Cursor object
 * @returns {NoteData?} 
 *      The parsed note data. If the note's accidentals are not valid within the
 *      declared TuningConfig, returns `null`.
 */
function readNoteData(msNote, tuningConfig, keySig, bars, cursor) {
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
    var graceChord = undefined;
    var noteType = msNote.internalNote.noteType;
    if (noteType == NoteType.ACCIACCATURA || noteType == NoteType.APPOGGIATURA ||
        noteType == NoteType.GRACE4 || noteType == NoteType.GRACE16 ||
        noteType == NoteType.GRACE32) {
        graceChord = msNote.internalNote.parent;
    }

    var accidentalsHash = getAccidental(
        cursor, msNote.tick, msNote.line,
        false, bars, false, msNote, graceChord);

    console.log("Found effective accidental: " + accidentalsHash);

    if (accidentalsHash == null && keySig && keySig[nominal] != null
        // Check if KeySig has a valid number of nominals.
        && keySign[nominal].length == tuningConfig.numNominals) {
        // If no prior accidentals found within the bar,
        // look to key signature.
        accidentalsHash = keySig;
    }

    if (accidentalsHash == '2 1') {
        // treat natural symbol = no accidental
        accidentalsHash = null;
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
 * **IMPORTANT: Cursor must be positioned where the msNote is before 
 * calling this function!**
 * 
 * `cursor.element` must point to the Chord of msNote, or if msNote is
 * a grace note, `cursor.element` must point to the Chord the grace note is
 * attached to.
 * 
 * @param {*} note MuseScore Note object
 * @param {TuningConfig} tuningConfig Current tuning config applied.
 * @param {KeySig} keySig Current key signature applied.
 * @param {[number]} bars List of bar ticks
 * @param {*} cursor MuseScore Cursor object
 * @returns {NoteData} NoteData object
 */
function parseNote(note, tuningConfig, keySig, bars, cursor) {
    var msNote = tokenizeNote(note);
    var noteData = readNoteData(msNote, tuningConfig, keySig, bars, cursor);

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
    var noteData = parseNote(note, tuningConfig, keySig, bars, cursor);
    var centsOffset = calcCentsOffset(noteData, tuningConfig);

    console.log("Found note: " + noteData.xen.hash + ", equave: " + noteData.equaves);

    var midiOffset = Math.round(centsOffset / 100);
    centsOffset -= midiOffset * 100;

    note.tuning = centsOffset;
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
 * Retrieve the next note up/down/enharmonic from the current `PluginAPI::Note`, and
 * returns `XenNote` and `Note.line` offset to be applied on the note.
 * 
 * @param {number} direction `1` for upwards, `0` for enharmonic cycling, `-1` for downwards.
 * @param {[boolean]} regarding
 *  (Only applicable if direction is `1`/`-1`. Not applicable for enharmonic)
 * 
 *  A list of boolean values signifying which accidental chains to consider.
 * 
 *  This feature is used for the aux up/down plugins.
 * 
 *  E.g. `[true, false, true]` means that this plugin will move to the next note
 *  up/down such that only first and third accidental chains are changed, but
 *  the degree of the second accidental chain is left unchanged.
 * 
 * @param {*} note The `PluginAPI::Note` MuseScore note object
 * @param {KeySig} keySig Current key signature
 * @param {TuningConfig} tuningConfig Tuning Config object
 * @param {[number]} bars `parms.bars` list of bar ticks
 * @param {*} cursor MuseScore cursor object
 * @returns {NextNote} 
 *  `NextNote` object containing info about how to spell the newly modified note.
 */
function chooseNextNote(direction, regarding, note, keySig, tuningConfig, bars, cursor) {
    var noteData = parseNote(note, tuningConfig, keySig, bars, cursor);

    var newXenNote = null;
    var lineOffset = null;

    if (direction === 0) {
        // enharmonic cycling
        var enharmonicNoteHash = tuningConfig.enharmonics[noteData.xen.hash];
        var enhXenNote = tuningConfig.notesTable[enharmonicNoteHash];

        // Account for equave offset between enharmonic notes.

        // Reminder: equavesAdjusted represents how many equaves has to be added
        // in order to fit the equave-0 spelling of the note within the equave
        // e.g. Ab has to be shifted up 1 equave to fit within the A-G equave range.

        var currNoteEqvsAdj = tuningConfig.tuningTable[noteData.xen.hash][1];
        var enhNoteEqvsAdj = tuningConfig.tuningTable[enharmonicNoteHash][1];

        // E.g. if G# and Ab are enharmonics, and G# is the currNote,
        // enhNoteEqvsAdj - currNoteEqvsAdj = 1 - 0 = 1
        // 1 means that, when going from the note G# to Ab, the plugin has to
        // use the Ab that is 1 equave abovet the G#, instead of the Ab that is
        // within the same equave. Otherwise, the Ab would incorrectly be
        // an equave lower than the G#.

        var nominalsOffset = enhXenNote.nominal - noteData.xen.nominal + 
            (enhNoteEqvsAdj - currNoteEqvsAdj) * tuningConfig.numNominals;
        
        newXenNote = enhXenNote;
        lineOffset = nominalsOffset;
    } else {
        // up/down operation.

        // The index of the StepwiseList this note is currently at.
        var stepIdx = tuningConfig.stepsLookup[noteData.xen.hash];

        for (var i = 1; i < tuningConfig.stepsList.length; i ++) {
            // Loop through every step once, until an appropriate step is found
            // which differs in accidentalVector according to `regarding`.
        }
    }

    return nextNote;
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
    var mostRecentExplicitAcc = null;
    var mostRecentExplicitAccTick = -1;
    // if 2 notes ticks are the same, the voice index matters as well.
    // higher voice idx = accidental takes precedence!
    var mostRecentExplicitAccVoice = -1;
    var mostRecentDoubleLineTick = -1;
    var mostRecentDoubleLineVoice = -1;

    if (tickOfNextBar == -1)
        tickOfNextBar = cursor.score.lastSegment.tick;

    // console.log('getMostRecentAcc: called with tick: ' + noteTick + ', line: ' + line + ', thisBar: ' + tickOfThisBar +
    //     ', nextBar: ' + tickOfNextBar + ', botchedCheck: ' + botchedCheck + ', before: ' + before +
    //     ', excludeBeforeInSameChord: ' + excludeBeforeInSameChord);

    for (var voice = 0; voice < 4; voice++) {

        cursor.rewind(1);
        cursor.voice = voice;
        cursor.staffIdx = thisStaffIdx;
        cursor.rewind(0);

        // move cursor to the segment at noteTick

        while (cursor.tick < tickOfThisBar && cursor.nextMeasure());
        while (cursor.tick < noteTick && cursor.next());


        while (tickOfThisBar !== -1 && cursor.segment && cursor.tick >= tickOfThisBar) {
            // loop each segment from current cursor position until cursor reaches
            // the start of this bar.

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

                        console.log("HELLO: line: " + line + ", note.line: " + notes[i].line);

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

                            console.log("HELLO");

                            // This current note fulfils the accidental search condition.

                            // Only check for symbol elements.

                            if (notes[i].elements) {
                                var symbolCodes = [];

                                for (var j = 0; j < notes[i].elements.length; j++) {
                                    var smuflId = notes[i].elements[j].symbol.toString();
                                    console.log(smuflId);
                                    if (smuflId) {
                                        if (Lookup.LABELS_TO_CODE[smuflId])
                                            symbolCodes.push(Lookup.LABELS_TO_CODE[smuflId]);
                                        else {
                                            console.log("WARN: Non-registered symbol found. If '" + smuflId + "' is supposed to be a supported accidental, add it to the spreadsheet");
                                        }
                                    }
                                }

                                if (symbolCodes.length > 0) {
                                    explicitAccidental = accidentalsHash(symbolCodes);
                                    console.log("Found symbols: " + explicitAccidental);
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
                                // List of symbol codes that make up the accidental.

                                var symbolCodes = [];

                                for (var j = 0; j < notes[i].elements.length; j++) {
                                    var smuflId = notes[i].elements[j].symbol.toString();
                                    console.log(smuflId);
                                    if (smuflId) {
                                        if (Lookup.LABELS_TO_CODE[smuflId])
                                            symbolCodes.push(Lookup.LABELS_TO_CODE[smuflId]);
                                        else {
                                            console.log("WARN: Non-registered symbol found. If '" + smuflId + "' is supposed to be a supported accidental, add it to the spreadsheet");
                                        }
                                    }
                                }

                                if (symbolCodes.length > 0) {
                                    explicitAccidental = accidentalsHash(symbolCodes);
                                    console.log("Found symbols: " + explicitAccidental);
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
    } else if (mostRecentExplicitAcc) {
        return mostRecentExplicitAcc;
    } else {
        return null;
    }
}

/**
 * 
 * Retrieves the effective accidental applied at the current cursor position & stave line.
 * 
 * If natural or no accidental to be applied, will return `null`.
 * 
 * IMPORTANT: Cursor must be positioned at the note to check the accidental of.
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
 * @param {*} bars List of bar ticks as per `parms.bars`
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
function getAccidental(cursor, tick, noteLine, botchedCheck, bars, before,
    currentOperatingNote, graceChord, excludeBeforeInSameChord) {

    console.log("getAccidental() tick: " + tick + ", line: " + noteLine);

    var tickOfNextBar = -1; // if -1, the cursor at the last bar
    var tickOfThisBar = -1; // if -1, something's wrong.

    for (var i = 0; i < bars.length; i++) {
        if (bars[i] > tick) {
            tickOfNextBar = bars[i];
            break;
        }
    }

    var tickOfThisBar = -1; // this should never be -1

    for (var i = 0; i < bars.length; i++) {
        if (bars[i] <= tick) {
            tickOfThisBar = bars[i];
        }
    }

    if (before === undefined)
        before = false;

    var result = _getMostRecentAccidentalInBar(cursor, tick, noteLine,
        tickOfThisBar, tickOfNextBar, botchedCheck, before,
        currentOperatingNote, graceChord, excludeBeforeInSameChord);

    return result;
}

/**
 * Returns the default tuning config to apply when none is specified
 */
function generateDefaultTuningConfig() {
    console.log("Generating default tuning config...");
    console.log(DEFAULT_TUNING_CONFIG);
    var tuningConfig = parseTuningConfig(DEFAULT_TUNING_CONFIG);
    return tuningConfig;
}