/**
    Lookup table for mapping SymbolCode number to 
    musescore's internal accidental names and accidental symbol names.

    Note: this is a one-to-many lookup table, as there are multiple symbols/accidentals
    that look alike but have different internal representations. This plugin
    should treat identical looking accidentals all the same.

    All caps are accidental names (the string value of Note.accidentalType)
    Non caps are symbol names (string value of Element.symbol)

    E.g. codeToLabels[2] contains all the possible accidental names/symbol names
    that represent the sesquisharp (#+) accidental.

    Whenever 'accidentalID' is used in code, it refers to the index of the
    accidental in this array.

    To be kept updated with: https://docs.google.com/spreadsheets/d/1kRBJNl-jdvD9BBgOMJQPcVOHjdXurx5UFWqsPf46Ffw/edit?usp=sharing
 */

/*
Any two notes that are less than this many cents apart will be considered
enharmonically equivalent.

Don't set this too low, it may cause floating point errors to
make enharmonically equivalent show up as not equivalent.

Don't set this too high, it may cause notes that should not be
considered enharmonically equivalent to show up as equivalent.
*/
ENHARMONIC_EQUIVALENT_THRESHOLD = 0.03;

SIMULATED_TUNING_CONFIG = `
A4: 440
0 203.910 294.130 498.045 701.955 792.180 996.090 1200
b (113.685) #
\ (21.506) /
`;

CODE_TO_LABELS = [
    null,
    ['NONE','noSym']
    ['NATURAL','accidentalNatural','medRenNatural']
    ['SHARP3','accidentalTripleSharp']
    ['SHARP2','SHARP_SHARP','accidentalDoubleSharp','accidentalSharpSharp']
    ['SHARP','NATURAL_SHARP','accidentalBakiyeSharp','accidentalSharp']
    ['FLAT','NATURAL_FLAT','accidentalKucukMucennebFlat','accidentalFlat']
    ['FLAT2','accidentalDoubleFlat']
    ['FLAT3','accidentalTripleFlat']
    ['SHARP_SLASH4','NINE_TWELFTH_SHARP','accidentalWyschnegradsky9TwelfthsSharp','accidentalThreeQuarterTonesSharpStein']
    ['SHARP_SLASH','THREE_TWELFTH_SHARP','accidentalWyschnegradsky3TwelfthsSharp','accidentalKomaSharp','accidentalQuarterToneSharpStein']
    ['MIRRORED_FLAT','accidentalKomaFlat','accidentalNarrowReversedFlat','accidentalQuarterToneFlatStein']     
    ['MIRRORED_FLAT2','accidentalNarrowReversedFlatAndFlat','accidentalThreeQuarterTonesFlatZimmermann']       
    ['FLAT_SLASH2','accidentalBuyukMucennebFlat']
    ['FLAT_SLASH','accidentalBakiyeFlat','accidentalQuarterToneFlatArabic']
    ['SHARP_SLASH3','accidentalKucukMucennebSharp']
    ['SHARP_SLASH2','accidentalBuyukMucennebSharp']
    ['accidentalThreeQuarterTonesFlatArabic']
    ['DOUBLE_SHARP_THREE_ARROWS_UP','accidentalDoubleSharpThreeArrowsUp']
    ['DOUBLE_SHARP_TWO_ARROWS_UP','accidentalDoubleSharpTwoArrowsUp']
    ['SHARP2_ARROW_UP','DOUBLE_SHARP_ONE_ARROW_UP','accidentalDoubleSharpOneArrowUp']
    ['SHARP2_ARROW_DOWN','DOUBLE_SHARP_ONE_ARROW_DOWN','accidentalDoubleSharpOneArrowDown']
    ['DOUBLE_SHARP_TWO_ARROWS_DOWN','accidentalDoubleSharpTwoArrowsDown']
    ['DOUBLE_SHARP_THREE_ARROWS_DOWN','accidentalDoubleSharpThreeArrowsDown']
    ['SHARP_THREE_ARROWS_UP','accidentalSharpThreeArrowsUp']
    ['SHARP_TWO_ARROWS_UP','accidentalSharpTwoArrowsUp']
    ['SHARP_ARROW_UP','SHARP_ONE_ARROW_UP','accidentalSharpOneArrowUp']
    ['SHARP_ARROW_DOWN','SHARP_ONE_ARROW_DOWN','accidentalSharpOneArrowDown']
    ['SHARP_TWO_ARROWS_DOWN','accidentalSharpTwoArrowsDown']
    ['SHARP_THREE_ARROWS_DOWN','accidentalSharpThreeArrowsDown']
    ['NATURAL_THREE_ARROWS_UP','accidentalNaturalThreeArrowsUp']
    ['NATURAL_TWO_ARROWS_UP','accidentalNaturalTwoArrowsUp']
    ['NATURAL_ARROW_UP','NATURAL_ONE_ARROW_UP','accidentalNaturalOneArrowUp']
    ['ARROW_UP','accidentalArrowUp']
    ['NATURAL_ARROW_DOWN','NATURAL_ONE_ARROW_DOWN','accidentalNaturalOneArrowDown']
    ['ARROW_DOWN','accidentalArrowDown']
    ['NATURAL_TWO_ARROWS_DOWN','accidentalNaturalTwoArrowsDown']
    ['NATURAL_THREE_ARROWS_DOWN','accidentalNaturalThreeArrowsDown']
    ['FLAT_THREE_ARROWS_UP','accidentalFlatThreeArrowsUp']
    ['FLAT_TWO_ARROWS_UP','accidentalFlatTwoArrowsUp']
    ['FLAT_ARROW_UP','FLAT_ONE_ARROW_UP','accidentalFlatOneArrowUp']
    ['FLAT_ARROW_DOWN','FLAT_ONE_ARROW_DOWN','accidentalFlatOneArrowDown']
    ['FLAT_TWO_ARROWS_DOWN','accidentalFlatTwoArrowsDown']
    ['FLAT_THREE_ARROWS_DOWN','accidentalFlatThreeArrowsDown']
    ['DOUBLE_FLAT_THREE_ARROWS_UP','accidentalDoubleFlatThreeArrowsUp']
    ['DOUBLE_FLAT_TWO_ARROWS_UP','accidentalDoubleFlatTwoArrowsUp']
    ['FLAT2_ARROW_UP','DOUBLE_FLAT_ONE_ARROW_UP','accidentalDoubleFlatOneArrowUp']
    ['FLAT2_ARROW_DOWN','DOUBLE_FLAT_ONE_ARROW_DOWN','accidentalDoubleFlatOneArrowDown']
    ['DOUBLE_FLAT_TWO_ARROWS_DOWN','accidentalDoubleFlatTwoArrowsDown']
    ['DOUBLE_FLAT_THREE_ARROWS_DOWN','accidentalDoubleFlatThreeArrowsDown']
];

/**
 * The inverse many-to-one mapping of the above CODE_TO_LABELS array.
 * 
 * Maps internal labels/IDs to SymbolCode number.
 */
LABELS_TO_CODE = (function() {
    var mapping = {};
    for (var i = 0; i < codeToLabels.length; i++) {
      for (var j = 0; j < codeToLabels[i].length; j++)
        mapping[codeToLabels[i][j]] = i;
    }
    Object.freeze(mapping);
    return mapping;
})();

/**
 * Mapping of Text Codes to SymbolCode.
 * 
 * To be kept updated with https://docs.google.com/spreadsheets/d/1kRBJNl-jdvD9BBgOMJQPcVOHjdXurx5UFWqsPf46Ffw/edit?usp=sharing
 * 
 * (For inputting symbols via text representation)
 */

TEXT_TO_CODE = {
    '#x': 3,
    'x': 4,
    '#': 5,
    'b': 6,
    'bb': 7,
    'bbb': 8,
    '#+': 9,
    '+': 10,
    'd': 11,
    'db': 12,
    'x^3': 18,
    'x^2': 19,
    'x^': 20,
    'xv': 21,
    'xv2': 22,
    'xv3': 23,
    '#^3': 24,
    '#^2': 25,
    '#^': 26,
    '#v': 27,
    '#v2': 28,
    '#v3': 29,
    '^3': 30,
    '^2': 31,
    '^': 32,
    '/': 33,
    'v': 34,
    '\\': 35,
    'v2': 36,
    'v3': 37,
    'b^3': 38,
    'b^2': 39,
    'b^': 40,
    'bv': 41,
    'bv2': 42,
    'bv3': 43,
    'bb^3': 44,
    'bb^2': 45,
    'bb^': 46,
    'bbv': 47,
    'bbv2': 48,
    'bbv3': 49,
};

/**
 * Mapping of 12EDO note letters to nominals from A.
 */
LETTERS_TO_NOMINAL = {
    'a': 0,
    'b': 1,
    'c': 2,
    'd': 3,
    'e': 4,
    'f': 5,
    'g': 6
};

/**
 * Mapping of 12EDO note letters to semitones from A.
 * (A is the reference note which the octave is based on).
 */
LETTERS_TO_SEMITONES = {
    'a': 0,
    'b': 2,
    'c': -9,
    'd': -7,
    'e': -5,
    'f': -4,
    'g': -2
};

/**
 * Mapping from 12edo TPCs to a [nominals, midiOctaveOffset] tuple.
 * 
 * Used in conjuction with Note.pitch to calculate `nominalsFromA4` 
 * property of MSNote.
 * 
 * nominals: 
 *      0-6, representing A, B, C, ...
 * 
 * midiOctaveOffset: 
 *      represents the number of octaves to add/sub when calculating octaves
 *      using its MIDI note because the MIDI pitch of this TPC will appear
 *      to be in a different octave if it has accidentals.
 *      
 *      In these calculations, the 12edo octave is considered to reset
 *      on the note A. (A4 = 0th octave, G4 = -1st octave)
 */
TPC_TO_NOMINAL = (function() {
    var x = {};
    x[-8] = [5, 0]; // Fbbb
    x[-7] = [2, 0]; // Cbbb
    x[-6] = [6, 0]; // Gbbb
    x[-5] = [3, 0]; // Dbbb
    x[-4] = [0, 1]; // Abbb
    x[-3] = [4, 0]; // Ebbb
    x[-2] = [1, 1]; // Bbbb

    x[-1] = [5, 0]; // Fbb
    x[0] = [2, 0]; // Cbb
    x[1] = [6, 0]; // Gbb
    x[2] = [3, 0]; // Dbb
    x[3] = [0, 1]; // Abb
    x[4] = [4, 0]; // Ebb
    x[5] = [1, 0]; // Bbb

    x[6] = [5, 0]; // Fb
    x[7] = [2, 0]; // Cb
    x[8] = [6, 0]; // Gb
    x[9] = [3, 0]; // Db
    x[10] = [0, 1]; // Ab
    x[11] = [4, 0]; // Eb
    x[12] = [1, 0]; // Bb

    x[13] = [5, 0]; // F
    x[14] = [2, 0]; // C
    x[15] = [6, 0]; // G
    x[16] = [3, 0]; // D
    x[17] = [0, 0]; // A
    x[18] = [4, 0]; // E
    x[19] = [1, 0]; // B

    x[20] = [5, 0]; // F#
    x[21] = [2, 0]; // C#
    x[22] = [6, 0]; // G#
    x[23] = [3, 0]; // D#
    x[24] = [0, 0]; // A#
    x[25] = [4, 0]; // E#
    x[26] = [1, 0]; // B#

    x[27] = [5, 0]; // Fx
    x[28] = [2, 0]; // Cx
    x[29] = [6, -1]; // Gx
    x[30] = [3, 0]; // Dx
    x[31] = [0, 0]; // Ax
    x[32] = [4, 0]; // Ex
    x[33] = [1, 0]; // Bx

    x[34] = [5, 0]; // Fx#
    x[35] = [2, 0]; // Cx#
    x[36] = [6, -1]; // Gx#
    x[37] = [3, 0]; // Dx#
    x[38] = [0, 0]; // Ax#
    x[39] = [4, 0]; // Ex#
    x[40] = [1, 0]; // Bx#
    return x;
})();

function test() {
    (() => console.log("Hello world! Helper function."))();
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
    var code = TEXT_TO_CODE[codeOrText];
    if (!code)
        code = parseInt(codeOrText) || null;
    
    return code;
}


/**
 * Reads the Ms::PluginAPI::Note and creates a `MSNote` data structure.
 */
function readNote(note) {
    // 69 = MIDI A4
    var octavesFromA4 = Math.floor((note.pitch - 69) / 12);
    var nominals = TPC_TO_NOMINAL[note.tpc][0];
    octavesFromA4 += TPC_TO_NOMINAL[note.tpc][1];
    
    var accidentals = {};

    if (note.accidental) {
        // If note has a Full/Half supported accidental,
        var symCode = LABELS_TO_CODE['' + note.accidental];
        accidentals[symCode] = 1;
    }

    for (var i = 0; i < note.elements.length; i++) {
        // If note has a Full/Half supported accidental,

        var acc = LABELS_TO_CODE['' + note.elements[i].symbol];

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
        accidentals: accidentals
    };

    return msNote;
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

    if (text.length == 0)
        return null;
    
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

    var lines = text.split('\n');

    // Need at least reference note and nominal declarations.
    if (lines.length < 2)
        return null;
    
    // SETTLE TUNING NOTE.
    //
    //

    var referenceTuning = lines[0].split(':').forEach(x => x.trim());

    if (referenceTuning.length != 2)
        return null;

    var referenceLetter = referenceTuning[0][0].toLowerCase();
    var referenceOctave = parseInt(referenceTuning[0].slice(1));

    var nominalsFromA4 = (referenceOctave - 4) * 7;
    var lettersNominal = LETTERS_TO_NOMINAL[referenceLetter];

    if (!lettersNominal)
        return null;
    
    nominalsFromA4 += lettersNominal;

    // Since the written octave resets at C, but we need to convert it
    // such that the octave resets at A4, we need to subtract one octave
    // if the nominal is within C to G.
    if (lettersNominal >= 2)
        nominalsFromA4 -= 7;
    
    tuningConfig.tuningNominal = nominalsFromA4;
    tuningConfig.tuningNote = LETTERS_TO_SEMITONES[referenceLetter] + (referenceOctave - 4) * 12 + 69;
    tuningConfig.tuningFreq = parseFloat(referenceTuning[1]);

    // SETTLE NOMINALS
    //
    //

    var hasInvalid = false;
    var nominals = lines[1].split(' ').forEach(x => {
        var f = parseFloat(x);
        if (f == NaN) hasInvalid = true;
        return f
    });

    if (hasInvalid)
        return null;
    
    tuningConfig.nominals = nominals.slice(0, nominals.length - 1);
    tuningConfig.equaveSize = nominals[nominals.length - 1];
    tuningConfig.numNominals = tuningConfig.nominals.length;

    // SETTLE ACCIDENTAL CHAINS
    //
    //

    var ligDeclarationStartLine = null;

    for (var nomIdx = 2; nomIdx < lines.length; nomIdx++) {
        // each new line is a new accidental chain.

        // terminate when 'lig(x,y,...)' is found (move on to ligature declarations)

        if (lines[nomIdx].match(/lig\([0-9,]+\)/)) {
            ligDeclarationStartLine = nomIdx;
            break;
        }

        var accChainStr = lines[nomIdx].split(' ').forEach(x => x.trim());

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
                var symbolCodes = symbols_offset[0].split('.').map(x => {
                    var code = readSymbolCode(x);

                    if (code == null) hasInvalid = true;

                    symbolsLookup[code] = true;
                    return code;
                });

                if (hasInvalid) return null;

                var offset = symbols_offset.length > 1 ? parseFloat(symbols_offset[1].slice(0, symbols_offset[1].length - 1)) : 0;

                degreesSymbols.push(symbolCodes);
                offsets.push(offset);
            }
        }

        if (!increment || !centralIdx)
            return null;
        
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

    // SETTLE LIGATURES
    //
    //

    for (var nomIdx = ligDeclarationStartLine; nomIdx < lines.length; nomIdx++) {
        hasInvalid = false;

        // lig(m, n) will be regarding the mth and nth accidental chains only.
        //
        // An exact match of the degrees of the mth and nth chains must be found
        // in order for the ligature regarding m and n to be applied.

        var regarding = lines[nomIdx]
            .match(/lig\(([0-9,]+)\)/)[1]
            .split(',')
            .map(x => {
                let n = parseInt(x);
                if (n == NaN || n < 1) hasInvalid = true;
                return n;
            });
        
        var ligAvToSymbols = {};

        for (var j = nomIdx + 1; j < lines.length; j++) {
            // each line represents a mapping in `ligAvToSymbols`

            // syntax: <chain 1 degree> <chain 2 degree> ... <dot separated acc symbols>

            var words = lines[j].split(' ').forEach(x => x.trim());
            var ligAv = words.slice(0, words.length - 1).map(x => parseInt(x));

            hasInvalid = false;
            var ligatureSymbols = words[words.length - 1]
                .split('.')
                .forEach(x => {
                    var code = readSymbolCode(x);
                    if (code == null) hasInvalid = true;
                    return code;
                });
            
            if (hasInvalid) return null;

            ligAvToSymbols[ligAv] = ligatureSymbols;
        }

        tuningConfig.ligatures.push({ // Ligature
            regarding: regarding,
            ligAvToSymbols: ligAvToSymbols,
        });
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

    for(var nomIdx = 0; nomIdx < tuningConfig.accChains.length; nomIdx++) {
        var accChain = tuningConfig.accChains[nomIdx];

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
                    hash: '' + nomIdx
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

                accSymbols.forEach(symCode => {
                    if (accidentalSymbols[symCode]) {
                        accidentalSymbols[symCode] ++;
                    } else {
                        accidentalSymbols[symCode] = 1;
                        newSymbols.push(symCode);
                    }
                });

                symbolsOrder = newSymbols.concat(symbolsOrder);

                centOffset += accChain.tunings[avIdx];
            }

            // Contains alternating SymbolCode and number of occurences
            // sorted in increasing SymbolCode.
            // Used to create hash string.
            var symCodeNums = [];
            
            Object.keys(accidentalSymbols)
                .map(parseInt)
                .sort()
                .forEach(symCode => {
                    symCodeNums.push(symCode);
                    symCodeNums.push(accidentalSymbols[symCode]);
                });

            var cents = nominalCents + centOffset;
            var equavesAdjusted = 0;

            if (tuningConfig.equaveSize > 0) { // prevent crashes
                while (cents < 0) {
                    cents += tuningConfig.equaveSize;
                    equavesAdjusted ++;
                }
                while (cents >= tuningConfig.equaveSize) {
                    cents -= tuningConfig.equaveSize;
                    equavesAdjusted --;
                }
            }

            var properlyOrdererdAccSymbols = {};

            symbolsOrder.forEach(symCode => {
                properlyOrdererdAccSymbols[symCode] = accidentalSymbols[symCode];
            });

            xenNotesEquaves.push({
                av: accidentalVector,
                xen: { // XenNote
                    nominal: nomIdx,
                    accidentals: properlyOrdererdAccSymbols,
                    hash: `${nomIdx} ${symCodeNums.join(' ')}`
                },
                cents: cents,
                equavesAdjusted: equavesAdjusted,
            });

            // SETTLE IMPLEMENTING LIGATURES AS ENHARMONICS
            //
            //

            tuningConfig.ligatures.forEach(lig => {
                var ligAv = [];
                var ligaturedSymbols = { ...accidentalSymbols }; // shallow copy

                /*
                As per spec, the ligatured symbols take the place of the right-most
                symbol it replaces.
                */

                // Stores the index of the right-most symbol it replaces.
                var ligSymbolIdx = 0;

                lig.regarding.forEach(idx => {
                    // idx represents each accidental chain that this ligature checks for
                    var deg = accidentalVector[idx];
                    ligAv.push(deg);

                    // Remove symbols from ligaturedSymbols that are
                    // replaced by the ligature.
                    tuningConfig.accChains[idx].degreesSymbols[deg].forEach(symCode => {
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

                            ligSymbols.forEach(symCode => {
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
 
                    // calculate ligatured hash string
                    symCodeNums = [];
                    Object.keys(finalAccSymbols)
                        .map(parseInt)
                        .sort()
                        .forEach(symCode => {
                            symCodeNums.push(symCode);
                            symCodeNums.push(finalAccSymbols[symCode]);
                        });
                    
                    // Add the ligature as if it were an enharmonic equivalent.

                    xenNotesEquaves.push({
                        av: accidentalVector,
                        xen: { // XenNote
                            nominal: nomIdx,
                            accidentals: finalAccSymbols,
                            hash: `${nomIdx} ${symCodeNums.join(' ')}`
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

    xenNotesEquaves.sort((a, b) => {
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

    xenNotesEquaves.forEach( x => {
        var av = x.av;
        var xenNote = x.xen;
        var cents = x.cents;
        var equavesAdjusted = x.equavesAdjusted;
        var hash = xenNote.hash;

        // Add to NotesTable
        tuningConfig.notesTable[hash] = xenNote;
        tuningConfig.avTable[hash] = av;
        tuningConfig.tuningTable[hash] = [cents, equavesAdjusted];

        if (isEnharmonicallyEquivalent(cents, prevEnhEquivCents)) {
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

            var prevEnharmGroup = tuningConfig.stepsList[tuningConfig.stepsList.length - 1];
            if (prevEnharmGroup.length > 1) {
                var firstEnharmHash = prevEnharmGroup[0];
                var lastEnharmHash = prevEnharmGroup[prevEnharmGroup.length - 1];
                tuningConfig.enharmonics[lastEnharmHash] = firstEnharmHash;
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