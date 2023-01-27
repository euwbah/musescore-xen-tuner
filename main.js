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

/**
 * @file Simple code for generating/downloading tuning config as JSON and
 *       testing the tuning config parser.
 */

var Lookup = ImportLookup();

window.testTuning = `
// A subset of 5-limit JI notation using HEJI notation
// A4 is tuned to 440 Hz.
//
// Tuning space comprises:
// 3 flats to 3 sharps
// 3 comma downs to 3 comma ups

C4: 440*16/27 // Indirectly tune A4 by tuning C4 to 16/27 of A4 = 440

// Nominals are a chain of pure fifths from F to B
0 9/8 81/64 4/3 3/2 27/16 243/128 2/1

// Here we declare two accidental chains

// 3-limit accidentals from bbb to #x
bbb bb b (2187/2048) # x #x
// 5-limit acc from -3 to +3
\\\\.\\\\.\\\\ \\\\.\\\\ \\\\ (81/80) / /./ /././

// Notice that we need to escape backslashes. "\\" instead of "\"

// Here we declare ligatures between the 1st and 2nd chain
// In HEJI, syntonic commas can merge with sharp/flat/natural
// accidentals to form ligatured symbols.
lig(1,2)
-2 -3 bbv3 // doubleflat and 3 downs combine into a double flat with 3 down arrows HEJI symbol
-2 -2 bbv2
-2 -1 bbv
-2 1 bb^
-2 2 bb^2
-2 3 bb^3
-1 -3 bv3
-1 -2 bv2
-1 -1 bv
-1 1 b^
-1 2 b^2
-1 3 b^3
1 -3 #v3
1 -2 #v2
1 -1 #v
1 1 #^
1 2 #^2
1 3 #^3
2 -3 xv3
2 -2 xv2
2 -1 xv
2 1 x^
2 2 x^2
2 3 x^3

// Here we declare 4 auxiliary up/down operations.
// These will be accessible as the aux1, aux2, aux3, aux4 up/down operations
// respectively. You can lookup/modify the keyboard shortcuts to these
// operations in the "xen tuner.qml" file.
aux(0) // aux1 will modify nominals only, without modifying accidentals
aux(1) // aux2 will modify flats/sharps only, without modifying nominals or other accs
aux(2) // aux3 will modify syntonic comas only
aux(0,1) // aux4 will modify both nominals and flats/sharps.

// Now we declare secondary accidentals & ASCII text representations

// E.g. If you attach the fingering 'bbbbb' on to a note,
// the plugin will convert & render it into a triple-flat symbol
// and a double-flat symbol bbb.bb.
//
// The triple-flat will match as degree -3 of the sharps/flats chain
// and the double-flat will match as a secondary accidental.

sec()
'bbb' bbb Math.pow(2187/2048,-3) // converts fingering 'bbb' into triple-flat symbol
'bb' bb Math.pow(2187/2048,-2)
'b' b 2048/2187
'###' #x Math.pow(2187/2048,3)
'#x' #x Math.pow(2187/2048,3)
'x#' #x Math.pow(2187/2048,3)
'##' x Math.pow(2187/2048,2)
'x' x Math.pow(2187/2048,2)
'#' # 2187/2048
'/' / 81/80
'\\\\' \\\\ 80/81
`;

function download(content, filename, contentType)
{
    if(!contentType) contentType = 'application/octet-stream';
    var a = document.createElement('a');
    var blob = new Blob([content], { 'type': contentType });
    a.href = window.URL.createObjectURL(blob);
    a.download = filename;
    a.click();
}

function generateTuningConfigJSON() {
    var tuningConfigStr = document.getElementById('tcinput').value.trim();
    var tuningConfig = parseTuningConfig(tuningConfigStr);

    if (!tuningConfig) {
        document.getElementById('errormsg').innerText = 
            'Error parsing tuning config! See browser console for details.';
        return;
    }
    document.getElementById('errormsg').innerText = '';

    var tuningConfigJSON = JSON.stringify(tuningConfig);
    download(tuningConfigJSON, 'tuningconfig.json', 'text/plain');
}

/**
 * Create a fake MuseScore Note QObject for testing purposes.
 * 
 * @param {string} noteName A to G
 * @param {number} octave (octave resets at C)
 * @param {string|number} accidental SymCode or Text Code
 * @param {string} symbols SymCodes or Text Codes separated by dot .
 * @param {number} tick tick position of Segment that note is attached to.
 */
function testNewNote(noteName, octave, accidental, symbols, tick=0) {
    var noteName = noteName.toLowerCase();
    var accidental = accidental;

    var noteNameTpcLookup = {
        'f': -8,
        'c': -7,
        'g': -6,
        'd': -5,
        'a': -4,
        'e': -3,
        'b': -2,
    };
    var accidentalTpcLookup = {
        8: 0,
        7: 7, // bb
        6: 14, // b
        1: 21, // default is None
        5: 28, // #
        4: 35, // x
        3: 42, // x#
    };

    if (Lookup.TEXT_TO_CODE[accidental]) {
        accidental = Lookup.TEXT_TO_CODE[accidental];
    }

    if (isNaN(parseInt(accidental))) {
        accidental = 1; // no accidental.
    }

    var pitch = 69 + (octave - 4) * 12 + Lookup.LETTERS_TO_SEMITONES[noteName];

    if (accidental >= 6 && accidental <= 8) {
        pitch -= accidental - 5;
    } else if (accidental >= 3 && accidental <= 5) {
        pitch += 6 - accidental;
    }

    var tpc = noteNameTpcLookup[noteName];

    if (accidentalTpcLookup[accidental]) {
        tpc += accidentalTpcLookup[accidental];
    }

    var elements;

    if (symbols.trim().length == 0) {
        elements = [];
    } else {
        elements = symbols.split('.').map(function(x) {
            var symCode = x;
            if (Lookup.TEXT_TO_CODE[x]) {
                symCode = Lookup.TEXT_TO_CODE[x];
            }
            return {
                symbol: Lookup.CODE_TO_LABELS[symCode][0] || 'NoSym'
            }
        });
    }

    return {
        pitch: pitch,
        tpc: tpc,
        accidental: Lookup.CODE_TO_LABELS[accidental][0] || 'NONE',
        elements: elements,
        parent: {
            parent: {
                tick: tick
            }
        },
        // supposed to represent stave line this note appears on
        // just put some fluff number, doesn't really matter.
        // as long as the same nominals are consistently on the
        // same lines, its fine.
        line: - (noteNameTpcLookup[noteName] + 6 + 7 * octave),
    }
}