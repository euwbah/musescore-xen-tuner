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
// HEWM Referenced from http://www.tonalsoft.com/enc/h/hewm.aspx
// Accidental Symbols up to 7-limit.
// The rest are kept as ASCII.

C4: 440 * 16/27
0 9/8 81/64 4/3 3/2 27/16 243/128 2/1
bbb bb b (2187/2048) # x #x
j-.j- j- (81/80) j+ j+.j+
d77 d7 (64/63) u7 u77
aux(0)
aux(1)
aux(2)
aux(3)
sec()
'bbb' bbb Math.pow(2048/2187,3)
'bb' bb Math.pow(2048/2187,2)
'b' b 2048/2187
'###' #x Math.pow(2187/2048,3)
'#x' #x Math.pow(2187/2048,3)
'##' x Math.pow(2187/2048,2)
'x' x Math.pow(2187/2048,2)
'#' # 2187/2048
'+' j+ 81/80
'-' j- 80/81
'<<' d77 Math.pow(63/64,2)
'<' d7 63/64
'>>' u77 Math.pow(64/63,2)
'>' u7 64/63
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