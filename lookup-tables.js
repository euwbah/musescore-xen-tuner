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

// Export function to be retrieved by Qt.include()
// MuseScore plugin api is a mess...

function ImportLookup() {

    var Generated = ImportGenerated();


    var CODE_TO_LABELS = Generated.CODE_TO_LABELS;


    var LABELS_TO_CODE = (function () {
        var mapping = {};
        // start from 1. 0 is null.
        for (var i = 1; i < CODE_TO_LABELS.length; i++) {
            for (var j = 0; j < CODE_TO_LABELS[i].length; j++)
                mapping[CODE_TO_LABELS[i][j]] = i;
        }
        Object.freeze(mapping);
        return mapping;
    })();

    var TEXT_TO_CODE = Generated.TEXT_TO_CODE;

    
    var LETTERS_TO_NOMINAL = {
        'a': 0,
        'b': 1,
        'c': 2,
        'd': 3,
        'e': 4,
        'f': 5,
        'g': 6
    };

    /**
     * Mapping of SymId/AccidentalType string to [PosX, PosY, SizeX, SizeY] layout settings
     * 
     * If Symbol is not in this lookup, default layout settings are used.
     */
    var SYMBOL_LAYOUT = Generated.SYMBOL_LAYOUT;

    var LETTERS_TO_SEMITONES = {
        'a': 0,
        'b': 2,
        'c': -9,
        'd': -7,
        'e': -5,
        'f': -4,
        'g': -2
    };

    var TPC_TO_NOMINAL = (function () {
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

    var HEWM_CONVERT_SYMCODES = {
        '#': {
            '1': [5],
            '2': [4], 
            '3': [3],
        },
        'b': {
            '1': [6],
            '2': [7],
            '3': [8],
        },
        '+': {
            // converts to johnston +
            '1': [104],
            '2': [104, 104],
            '3': [104, 104, 104],
        },
        '-': {
            // converts to johnston -
            '1': [105],
            '2': [105, 105],
            '3': [105, 105, 105],
        },
        '<': {
            // converts to HEJI's 7
            '1': [72], // mirrored 7
            '2': [73], // double mirrored 7
        },
        '>': {
            // converts to 7 up
            '1': [71], // 'el'
            '2': [70], // double 'el'
        },
        '^': {
            // converts to johnston up arrow
            '1': [108],
            '2': [108, 108],
        },
        'v': {
            // converts to johnston down arrow
            '1': [109],
            '2': [109, 109],
        }
    };

    var HEWM_RATIOS = {
        '#': 2187/2048,
        'b': 2048/2187,
        '+': 81/80,
        '-': 80/81,
        '>': 64/63,
        '<': 63/64,
        '^': 33/32,
        'v': 32/33,
        '}': 27/26,
        '{': 26/27,
        '/': 18/17,
        '\\': 17/18,
        ')': 19/18,
        '(': 18/19,
        ']': 24/23,
        '[': 23/24,
        '!': 261/256,
        ';': 256/261,
        '"': 32/31,
        '?': 31/32,
        '%': 37/36,
        '&': 36/37,
        '$': 82/81,
        '@': 81/82,
        "'": 129/128,
        ',': 128/129,
        '*': 48/47,
        ':': 47/48,
        '|': 54/53,
        '.': 53/54,
        'z': 243/236,
        's': 236/243,
        'k': 244/243,
        'y': 243/244,
    };


    return {
        /**
        Lookup table for mapping SymbolCode number to 
        musescore's internal accidental names and accidental symbol names.

        Index of element in array = SymbolCode number.
        
        Note: this is a one-to-many lookup table, as there are multiple symbols/accidentals
        that look alike but have different internal representations. This plugin
        should treat identical looking accidentals all the same.
        
        All caps are accidental names (the string value of Note.accidentalType)
        Non caps are symbol names (string value of Element.symbol)
        
        E.g. CODE_TO_LABELS[2] contains all the possible accidental names/symbol names
        that represent the sesquisharp (#+) accidental.
        
        Whenever 'accidentalID' is used in code, it refers to the index of the
        accidental in this array.
        
        To be kept updated with: https://docs.google.com/spreadsheets/d/1kRBJNl-jdvD9BBgOMJQPcVOHjdXurx5UFWqsPf46Ffw/edit?usp=sharing

        @type {Array.<Array.<string>>}
        */
        CODE_TO_LABELS: CODE_TO_LABELS,
        /**
         * The inverse many-to-one mapping of the above CODE_TO_LABELS array.
         * 
         * Maps internal labels/IDs to SymbolCode number.
         * 
         * @type {Object.<string, number>}
         */
        LABELS_TO_CODE: LABELS_TO_CODE,
        /**
         * Mapping of Text Codes to SymbolCode.
         * 
         * To be kept updated with https://docs.google.com/spreadsheets/d/1kRBJNl-jdvD9BBgOMJQPcVOHjdXurx5UFWqsPf46Ffw/edit?usp=sharing
         * 
         * (For inputting symbols via text representation)
         * 
         * @type {Object.<string, number>}
         */
        TEXT_TO_CODE: TEXT_TO_CODE,
        /**
         * Mapping of 12EDO note letters to number of nominals from A.
         * 
         * Nominals reset at the note A.
         */
        LETTERS_TO_NOMINAL: LETTERS_TO_NOMINAL,
        /**
         * Mapping of 12EDO note letters to semitones from A.
         * (A is the reference note which the octave is based on).
         */
        LETTERS_TO_SEMITONES: LETTERS_TO_SEMITONES,
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
        TPC_TO_NOMINAL: TPC_TO_NOMINAL,

        /**
         * If the tokenized {@link HewmAccidental} matches this lookup,
         * the plugin will automatically convert it into the respective
         * symbol code.
         * 
         * When writing in HEWM, the Tuning Config must use these symbols
         * in order for the plugin to automatically convert from ASCII to
         * symbols.
         * 
         * Otherwise, the accidentals will remain as ASCII.
         * 
         * @type {Object.<string, Object.<number, SymbolCode[]>>}
         */
        HEWM_CONVERT_SYMCODES: HEWM_CONVERT_SYMCODES,

        /**
         * Mapping of HEWM ASCII symbols to their respective JI ratios.
         * 
         * @type {Object.<string, number>}
         */
        HEWM_RATIOS: HEWM_RATIOS,
    };
}