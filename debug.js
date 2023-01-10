var Lookup = ImportLookup();


window.testTuning = `
A4: 440
0 200 300 500 700 800 1000 1200
(100) #
(20) /
lig(1,2
1 1 #^
`;

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