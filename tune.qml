import QtQuick 2.1
import QtQuick.Controls 1.3
import QtQuick.Controls.Styles 1.3
import "fns.js" as Fns
import MuseScore 3.0

MuseScore {
      version: "0.1.0"
      description: "Retune selection/score to tuning system"
      menuPath: "Plugins.xen.Tune"

      // WARNING! This doesn't validate the accidental code!
      property variant customKeySigRegex: /\.(.*)\.(.*)\.(.*)\.(.*)\.(.*)\.(.*)\.(.*)/g

      // these lookups are for transposition annotations
      property variant fifthsFromC: {
        'f': -1,
        'c': 0,
        'g': 1,
        'd': 2,
        'a': 3,
        'e': 4,
        'b': 5
      }

      property variant standardAccFifths: {
        'bb': -14,
        'b': -7,
        '': 0,
        '#': 7,
        'x': 14
      }

      // MuseScore's annotations contain formatting code in angle brackets if the
      // annotation text formatting is not default. This function removes
      // all text within angle brackets including the brackets themselves
      function removeFormattingCode(str) {
        if (typeof(str) == 'string')
          return str.replace(/<[^>]*>/g, '');
        else
          return null;
      }

      // Calculates the number of cents to detune the default musescore note by.
      // noteName: the note nominal alphabet from 'f' thru 'b'
      // stepOffset: offset the nominal by this many steps of the EDO
      // regAcc: number of regular accidentals
      // edo: how many notes per octave in the tuning system.
      // center: the central note and its frequency in Hz (by default A4, 440)
      //
      // Special credits to @FloraCanou (https://github.com/FloraCanou) for conceiving this method
      // method edited by @euwbah to set A as the normalised frequency instead of D

      /**
      noteName: nominal of note to tune
      stepOffset: number of edosteps away from nominal
      regAcc: number of sharps in the accidental of this note is a regular accidental
      edo: edo to tune to
      center: Reference pitch e.g. {note: 'a4', freq: 440}
      transFifths: number of fifths this part is transposed by if transposing instrument and
                   concert pitch mode is off. E.g. Bb clarinet should be -2.
                   Only regular fifth-based transpositions can be used.
                   Rationale for this is that musescore's transposing instruments
                   are transposed in 12 edo, so an additional offset must be applied
                   to convert it to a fifth-based transposition in n-edo.
      */
      function getCentOffset(noteName, stepOffset, regAcc, edo, center, transFifths) {
        var stepSize = 1200.0 / edo;
        var fifthStep = Math.round(edo * Math.log(3/2) / Math.LN2);
        var sharpValue = 7 * fifthStep - 4 * edo;
        var twelveFifthVsEdoFifthCents = 700 - (fifthStep * stepSize);
        var transpositionCorrection = -transFifths * twelveFifthVsEdoFifthCents;

        // Offset caused by custom central frequency
        var centOffset = 1200*Math.log (center.freq / 440) / Math.LN2;
        // Offset caused by custom central note
        var centerValue;
        switch (center.note.substring(0, 1)) {
        case 'f':
          centOffset += 400;
          centerValue = 3;
          break;
        case 'c':
          centOffset += 900;
          centerValue = 2;
          break;
        case 'g':
          centOffset += 200;
          centerValue = 1;
          break;
        case 'd':
          centOffset += 700;
          centerValue = 0;
          break;
        case 'a':
          centOffset += 0;
          centerValue = -1;
          break;
        case 'e':
          centOffset += 500;
          centerValue = -2;
          break;
        case 'b':
          centOffset += -200;
          centerValue = -3;
          break;
        }
        centOffset += -1200*(parseInt(center.note.substring(1, 2)) - 4);

        var nominalOffset = 0;
        var nominalOffset = 0;
        switch (noteName) {
          case 'f':
            nominalOffset = (centerValue - 3)*(stepSize*fifthStep - 700);
            break;
          case 'c':
            nominalOffset = (centerValue - 2)*(stepSize*fifthStep - 700);
            break;
          case 'g':
            nominalOffset = (centerValue - 1)*(stepSize*fifthStep - 700);
            break;
          case 'd':
            nominalOffset = centerValue*(stepSize*fifthStep - 700);
            break;
          case 'a':
            nominalOffset = (centerValue + 1)*(stepSize*fifthStep - 700);
            break;
          case 'e':
            nominalOffset = (centerValue + 2)*(stepSize*fifthStep - 700);
            break;
          case 'b':
            nominalOffset = (centerValue + 3)*(stepSize*fifthStep - 700);
            break;
        }

        return stepSize*stepOffset - 100*regAcc + nominalOffset + centOffset + transpositionCorrection;
      }

      function convertAccidentalToStepsOrNull(acc, edo) {
        var fifthStep = Math.round(edo * Math.log(3/2) / Math.LN2);
        var sharpValue = 7 * fifthStep - 4 * edo;
        switch(acc.trim()) {
        case 'db':
        case 'bd':
          return -3*sharpValue/2;
        case 'd':
          return -sharpValue/2;
        case '+':
          return sharpValue/2;
        case '#+':
        case '+#':
          return 3*sharpValue/2;
        case 'bbv3':
          return -2*sharpValue - 3;
        case 'bbv2':
          return -2*sharpValue - 2;
        case 'bbv1':
        case 'bbv':
          return -2*sharpValue - 1;
        case 'bb':
          return -2*sharpValue;
        case 'bb^':
        case 'bb^1':
          return -2*sharpValue + 1;
        case 'bb^2':
          return -2*sharpValue + 2;
        case 'bb^3':
          return -2*sharpValue + 3;
        case 'bv3':
          return -sharpValue - 3;
        case 'bv2':
          return -sharpValue - 2;
        case 'bv1':
        case 'bv':
          return -sharpValue - 1;
        case 'b':
          return -sharpValue;
        case 'b^':
        case 'b^1':
          return -sharpValue + 1;
        case 'b^2':
          return -sharpValue + 2;
        case 'b^3':
          return -sharpValue + 3;
        case 'v3':
          return -3;
        case 'v2':
          return -2;
        case 'v1':
        case 'v':
          return -1;
        case '':
          return 0;
        case '^':
        case '^1':
          return 1;
        case '^2':
          return 2;
        case '^3':
          return 3;
        case '#v3':
          return sharpValue - 3;
        case '#v2':
          return sharpValue - 2;
        case '#v1':
        case '#v':
          return sharpValue - 1;
        case '#':
          return sharpValue;
        case '#^':
        case '#^1':
          return sharpValue + 1;
        case '#^2':
          return sharpValue + 2;
        case '#^3':
          return sharpValue + 3;
        case 'xv3':
          return 2*sharpValue - 3;
        case 'xv2':
          return 2*sharpValue - 2;
        case 'xv1':
        case 'xv':
          return 2*sharpValue - 1;
        case 'x':
          return 2*sharpValue;
        case 'x^':
        case 'x^1':
          return 2*sharpValue + 1;
        case 'x^2':
          return 2*sharpValue + 2;
        case 'x^3':
          return 2*sharpValue + 3;
        default:
          return null;
        }
      }

      // Takes in annotations[].text and returns either
      // a key signature object if str is a valid custom key sig code or null.
      //
      // Valid key sig code is denoted as such:
      //  .c.d.e.f.g.a.b
      // where identifiers c thru b denote a valid accidental code of which
      // will apply to the respective notes.
      //
      // For example, this is F-down major: .v.v.v.v.v.v.bv
      //
      // whitespace can be placed between dots and accidentals for readability.
      //
      // For the natural accidental, blank or whitespace will both work.
      //
      // Assign the key signature object to the parms.currKeySig field!
      function scanCustomKeySig(str, edo) {
        if (typeof (str) !== 'string')
          return null;
        str = str.trim();
        var keySig = {};
        var res = str.match(customKeySigRegex);
        // For code golfing
        var notes = [null, 'c', 'd', 'e', 'f', 'g', 'a', 'b'];

        if (res === null)
          return null;

        for (var i = 1; i <= 7; i++) {
          var acc = convertAccidentalToStepsOrNull(res[i].trim(), edo);
          console.log('keySig ' + i + ', steps: ' + acc);
          if (acc !== null)
            keySig[notes[i]] = acc;
          else
            keySig[notes[i]] = 0;
        }
        return keySig;
      }

      // Apply the given function to all notes in selection
      // or, if nothing is selected, in the entire score

      function applyToNotesInSelection(func, parms) {
        var cursor = curScore.newCursor();
        cursor.rewind(1);
        var startStaff;
        var endStaff;
        var endTick;
        var fullScore = false;
        if (!cursor.segment) { // no selection
          fullScore = true;
          startStaff = 0; // start with 1st staff
          endStaff = curScore.nstaves - 1; // and end with last
        } else {
          startStaff = cursor.staffIdx;
          cursor.rewind(2);
          if (cursor.tick == 0) {
            // this happens when the selection includes
            // the last measure of the score.
            // rewind(2) goes behind the last segment (where
            // there's none) and sets tick=0
            endTick = curScore.lastSegment.tick + 1;
          } else {
            endTick = cursor.tick;
          }
          endStaff = cursor.staffIdx;
        }
        console.log(startStaff + " - " + endStaff + " - " + endTick);
        // -------------- Actual thing here -----------------------


        for (var staff = startStaff; staff <= endStaff; staff++) {

          // Reset accidentals at the start of every staff.
          parms.accidentals = {};



          // Even if system text is used for key sig, the text
          // won't carry over for all voices (if the text was placed on voice 1, only
          // voice 1 will see the text)
          //
          // Therefore, all the diff custom key sig texts across all 4 voices
          // need to be aggregated into this array before the notes can be
          // tuned.
          var staffKeySigHistory = [];
          var staffCenterHistory = [];
          var staffEDOHistory = [];
          var staffTranspositionHistory = [];

          // initial run to populate custom key signatures
          for (var voice = 0; voice < 4; voice++) {

            // Note: either ways, it is still necesssary to go to the start of the score before
            // applying to notes in selection as custom key signatures may precede the selection
            // that should still apply to the score.

            // NOTE: THIS IS THE ONLY RIGHT WAY (TM) TO REWIND THE CURSOR TO THE START OF THE SCORE.
            //       ANY OTHER METHOD WOULD RESULT IN CATASTROPHIC FAILURE FOR WHATEVER REASON.
            cursor.rewind(1);
            cursor.voice = voice;
            cursor.staffIdx = staff;
            cursor.rewind(0);

            var measureCount = 0;
            console.log("processing custom key signatures staff: " + staff + ", voice: " + voice);

            while (true) {
              if (cursor.segment) {
                // scan edo & tuning center first. key signature parsing is dependant on edo used.
                for (var i = 0; i < cursor.segment.annotations.length; i++) {
                  var annotation = cursor.segment.annotations[i];
                  console.log("found annotation type: " + annotation.name);
                  if ((annotation.name == 'StaffText' && Math.floor(annotation.track / 4) == staff) ||
                      (annotation.name == 'SystemText')) {
                    var text = removeFormattingCode(annotation.text);
                    if (text.toLowerCase().trim().endsWith('edo')) {
                      var edo = parseInt(text.substring(0, text.length - 3));
                      if (edo !== NaN || edo !== undefined || edo !== null) {
                        console.log('found EDO annotation: ' + text)
                        staffEDOHistory.push({
                          tick: cursor.tick,
                          edo: edo
                        });
                      }
                    } else if (text.trim().search(/[a-g][0-9]:/i) == 0) {
                      var txt = text.toLowerCase().trim();
                      if (txt.endsWith('hz'))
                        txt = txt.substring(0, txt.length - 2);
                      var center = {note: txt.substring(0, 2), freq: parseFloat(txt.substring(3))};
                      if (center.freq !== NaN || center.freq !== undefined || center.freq !== null) {
                        console.log('found tuning center annotation: ' + text)
                        staffCenterHistory.push({
                          tick: cursor.tick,
                          center: center
                        });
                      }
                    }
                  }
                }

                // Check for StaffText key signature changes, then update staffKeySigHistory
                for (var i = 0; i < cursor.segment.annotations.length; i++) {
                  var annotation = cursor.segment.annotations[i];
                  console.log("found annotation type: " + annotation.name);
                  if ((annotation.name == 'StaffText' && Math.floor(annotation.track / 4) == staff) ||
                      (annotation.name == 'SystemText')) {
                    var t = annotation.text.toLowerCase().trim();
                    if (t.startsWith('t:')) {
                      t = t.substring(2).trim();
                      var nominal = t.substring(0, 1);
                      var acc = t.substring(1).trim();
                      if (fifthsFromC[nominal] !== undefined && standardAccFifths[acc] !== undefined) {
                        staffTranspositionHistory.push({
                          tick: cursor.tick,
                          fifths: fifthsFromC[nominal] + standardAccFifths[acc]
                        });
                      }
                    } else {
                      var text = removeFormattingCode(t);
                      var mostRecentEDO = staffEDOHistory.length !== 0 ? staffEDOHistory[staffEDOHistory.length - 1].edo : null;
                      if (!mostRecentEDO)
                        mostRecentEDO = 12;
                      var maybeKeySig = scanCustomKeySig(text, mostRecentEDO);
                      if (maybeKeySig !== null) {
                        console.log("detected new custom keySig: " + text + ", staff: " + staff + ", voice: " + voice);
                        staffKeySigHistory.push({
                          tick: cursor.tick,
                          keySig: maybeKeySig
                        });
                      }
                    }
                  }
                }

                if (cursor.segment.tick == cursor.measure.firstSegment.tick && voice === 0) {
                  // once new bar is reached, denote new bar in the parms.accidentals.bars object
                  // so that getAccidental will reset. Only do this for the first voice in a staff
                  // since voices in a staff shares the same barrings.
                  if (!parms.accidentals.bars)
                    parms.accidentals.bars = [];

                  parms.accidentals.bars.push(cursor.segment.tick);
                  measureCount ++;
                  console.log("New bar - " + measureCount);
                }
              }

              if (!cursor.next())
                break;
            }
          }

          // 2 passes - one to ensure all accidentals are represented acorss
          // all 4 voices, then the second one to apply those accidentals.
          for (var rep = 0; rep < 2; rep++) {
            // After every staff, reset the keySig and tuning states back to default
            parms.currKeySig = parms.keySig;
            parms.currEdo = 12;
            parms.currCenter = {note: 'a4', freq: 440};
            parms.currTranspose = 0;
            for (var voice = 0; voice < 4; voice++) {
              // if first pass go to start of score so that anchors.all
              // accidentals are accounted for
              // otherwise, go to the start of the selection to begin tuning

              // NOTE: FOR WHATEVER REASON, rewind(1) must be called BEFORE assigning voice and staffIdx,
              //       and rewind(0) MUST be called AFTER rewind(1), AND AFTER assigning voice and staffIdx.
              cursor.rewind(1);
              cursor.voice = voice; //voice has to be set after goTo
              cursor.staffIdx = staff;
              if (fullScore || rep == 0)
                cursor.rewind(0);

              var measureCount = 0;

              console.log("processing staff: " + staff + ", voice: " + voice);

              // Loop elements of a voice
              while (cursor.segment && (fullScore || cursor.tick < endTick)) {
                // Note that the parms.accidentals object now stores accidentals
                // from all 4 voices in a staff since microtonal accidentals from one voice
                // should affect subsequent notes on the same line in other voices as well.

                var mostRecentKeySigTick = -1;
                for (var i = 0; i < staffKeySigHistory.length; i++) {
                  var keySig = staffKeySigHistory[i];
                  if (keySig.tick <= cursor.tick && keySig.tick >= mostRecentKeySigTick) {
                    parms.currKeySig = keySig.keySig;
                    mostRecentKeySigTick = keySig.tick;
                  }
                }

                var mostRecentEDOTick = -1;
                for (var i = 0; i < staffEDOHistory.length; i++) {
                  var edo = staffEDOHistory[i];
                  if (edo.tick <= cursor.tick && edo.tick >= mostRecentEDOTick) {
                    parms.currEdo = edo.edo;
                    mostRecentEDOTick = edo.tick;
                  }
                }

                var mostRecentCenterTick = -1;
                for (var i = 0; i < staffCenterHistory.length; i++) {
                  var center = staffCenterHistory[i];
                  if (center.tick <= cursor.tick && center.tick >= mostRecentCenterTick) {
                    parms.currCenter = center.center;
                    mostRecentCenterTick = center.tick;
                  }
                }

                var mostRecentTransposeTick = -1;
                for (var i = 0; i < staffTranspositionHistory.length; i++) {
                  var trans = staffTranspositionHistory[i];
                  if (trans.tick <= cursor.tick && trans.tick >= mostRecentTransposeTick) {
                    parms.currTranspose = trans.fifths;
                    mostRecentTransposeTick = trans.tick;
                  }
                }

                if (cursor.element) {
                  if (cursor.element.type == Ms.CHORD) {
                    var graceChords = cursor.element.graceNotes;
                    for (var i = 0; i < graceChords.length; i++) {
                      // iterate through all grace chords
                      var notes = graceChords[i].notes;
                      for (var j = 0; j < notes.length; j++)
                        func(notes[j], cursor.segment, parms, rep === 0);
                    }
                    var notes = cursor.element.notes;
                    for (var i = 0; i < notes.length; i++) {
                      var note = notes[i];
                      // find other symbols (aux accidentals) attached to the note
                      // for (var j = 0; j < note.elements.length; j++) {
                      //   if (note.elements[j].symbol)
                      //     console.log(note.elements[j].symbol);
                      // }
                      func(note, cursor.segment, parms, rep === 0);
                    }
                  }
                }
                cursor.next();
              }
            }
          }
        }
      }

      // This will register an accidental's offset value and tick position.
      // Unified accidental registry is necessary so that special accidentals across
      // different voices in the same staff will affect each other as it should.
      //
      // Only microtonal accidentals need to be registered. Musescore properly handles
      // normal accidentals with TPCs.
      //
      // Remember to reset the parms.accidentals array after every bar & staff!
      function registerAccidental(noteLine, tick, stepOffset, parms) {
        if (!parms.accidentals[noteLine]) {
          parms.accidentals[noteLine] = [];
        }

        parms.accidentals[noteLine].push({
          tick: tick,
          offset: stepOffset
        });
      }

      // Returns the step offset if a prior microtonal accidental exists
      // before or at the given tick value.
      // Null if there are no explicit microtonal accidentals
      // WARNING: DON'T USE !getAccidental() to check for Null because !0 IS TRUE!
      function getAccidental(noteLine, tick, parms) {
        // Tick of the most recent measure just before current tick
        var mostRecentBar = 0;

        for (var i = 0; i < parms.accidentals.bars.length; i++) {
          var barTick = parms.accidentals.bars[i];

          if (barTick > mostRecentBar && barTick <= tick) {
            mostRecentBar = barTick;
          }
        }

        var oldTick = -1;
        var offset = null;

        if (!parms.accidentals[noteLine])
          return null;

        for (var i = 0; i < parms.accidentals[noteLine].length; i++) {
          var acc = parms.accidentals[noteLine][i];

          // Accidentals only count if
          // 1. They are in the same bar as the current note
          // 2. They are before or at the current note's tick
          // 3. It is the most recent accidental that fulfills 1. and 2.
          if (acc.tick >= mostRecentBar && acc.tick <= tick && acc.tick >= oldTick) {
            console.log('note line: ' + noteLine + ', steps: ' + acc.offset + ', tick: ' + acc.tick);
            console.log('acc.tick: ' + acc.tick + ', mostRecentBar: ' + mostRecentBar + ', tick: ' + tick + ', oldTick: ' + oldTick);
            offset = acc.offset;
            oldTick = acc.tick;
          }
        }
        return offset;
      }

      // Note: if scanOnly is true, accidentals will be registered but the note
      // will not be tuned.
      function tuneNote(note, segment, parms, scanOnly) {
        var tpc = note.tpc;
        var fifthStep = Math.round(parms.currEdo * Math.log(3/2) / Math.LN2);
        var sharpValue = 7*fifthStep - 4*parms.currEdo;

        // If tpc is non-natural, there's no need to go through additional steps,
        // since accidentals and key sig are already taken into consideration
        // to produce a non-screw-up tpc.

        // However, if tpc is natural, it needs to be checked against acc and
        // the key signature to truly determine what note it is.

        switch(tpc) {
        case -1: //Fbb
          note.tuning = getCentOffset ('f', -2*sharpValue, -2, parms.currEdo, parms.currCenter, parms.currTranspose);
          return;
        case 0: //Cbb
          note.tuning = getCentOffset ('c', -2*sharpValue, -2, parms.currEdo, parms.currCenter, parms.currTranspose);
          return;
        case 1: //Gbb
          note.tuning = getCentOffset ('g', -2*sharpValue, -2, parms.currEdo, parms.currCenter, parms.currTranspose);
          return;
        case 2: //Dbb
          note.tuning = getCentOffset ('d', -2*sharpValue, -2, parms.currEdo, parms.currCenter, parms.currTranspose);
          return;
        case 3: //Abb
          note.tuning = getCentOffset ('a', -2*sharpValue, -2, parms.currEdo, parms.currCenter, parms.currTranspose);
          return;
        case 4: //Ebb
          note.tuning = getCentOffset ('e', -2*sharpValue, -2, parms.currEdo, parms.currCenter, parms.currTranspose);
          return;
        case 5: //Bbb
          note.tuning = getCentOffset ('b', -2*sharpValue, -2, parms.currEdo, parms.currCenter, parms.currTranspose);
          return;

        case 6: //Fb
          note.tuning = getCentOffset ('f', -sharpValue, -1, parms.currEdo, parms.currCenter, parms.currTranspose);
          return;
        case 7: //Cb
          note.tuning = getCentOffset ('c', -sharpValue, -1, parms.currEdo, parms.currCenter, parms.currTranspose);
          return;
        case 8: //Gb
          note.tuning = getCentOffset ('g', -sharpValue, -1, parms.currEdo, parms.currCenter, parms.currTranspose);
          return;
        case 9: //Db
          note.tuning = getCentOffset ('d', -sharpValue, -1, parms.currEdo, parms.currCenter, parms.currTranspose);
          return;
        case 10: //Ab
          note.tuning = getCentOffset ('a', -sharpValue, -1, parms.currEdo, parms.currCenter, parms.currTranspose);
          return;
        case 11: //Eb
          note.tuning = getCentOffset ('e', -sharpValue, -1, parms.currEdo, parms.currCenter, parms.currTranspose);
          return;
        case 12: //Bb
          note.tuning = getCentOffset ('b', -sharpValue, -1, parms.currEdo, parms.currCenter, parms.currTranspose);
          return;

        case 20: //F#
          note.tuning = getCentOffset ('f', sharpValue, 1, parms.currEdo, parms.currCenter, parms.currTranspose);
          return;
        case 21: //C#
          note.tuning = getCentOffset ('c', sharpValue, 1, parms.currEdo, parms.currCenter, parms.currTranspose);
          return;
        case 22: //G#
          note.tuning = getCentOffset ('g', sharpValue, 1, parms.currEdo, parms.currCenter, parms.currTranspose);
          return;
        case 23: //D#
          note.tuning = getCentOffset ('d', sharpValue, 1, parms.currEdo, parms.currCenter, parms.currTranspose);
          return;
        case 24: //A#
          note.tuning = getCentOffset ('a', sharpValue, 1, parms.currEdo, parms.currCenter, parms.currTranspose);
          return;
        case 25: //E#
          note.tuning = getCentOffset ('e', sharpValue, 1, parms.currEdo, parms.currCenter, parms.currTranspose);
          return;
        case 26: //B#
          note.tuning = getCentOffset ('b', sharpValue, 1, parms.currEdo, parms.currCenter, parms.currTranspose);
          return;

        case 27: //Fx
          note.tuning = getCentOffset ('f', 2*sharpValue, 2, parms.currEdo, parms.currCenter, parms.currTranspose);
          return;
        case 28: //Cx
          note.tuning = getCentOffset ('c', 2*sharpValue, 2, parms.currEdo, parms.currCenter, parms.currTranspose);
          return;
        case 29: //Gx
          note.tuning = getCentOffset ('g', 2*sharpValue, 2, parms.currEdo, parms.currCenter, parms.currTranspose);
          return;
        case 30: //Dx
          note.tuning = getCentOffset ('d', 2*sharpValue, 2, parms.currEdo, parms.currCenter, parms.currTranspose);
          return;
        case 31: //Ax
          note.tuning = getCentOffset ('a', 2*sharpValue, 2, parms.currEdo, parms.currCenter, parms.currTranspose);
          return;
        case 32: //Ex
          note.tuning = getCentOffset ('e', 2*sharpValue, 2, parms.currEdo, parms.currCenter, parms.currTranspose);
          return;
        case 33: //Bx
          note.tuning = getCentOffset ('b', 2*sharpValue, 2, parms.currEdo, parms.currCenter, parms.currTranspose);
          return;
        }

        // in the event that tpc is considered natural by
        // MuseScore's playback, it would mean that it is
        // either a natural note, or a microtonal accidental.

        var baseNote;
        switch(tpc) {
        case 13:
          baseNote = 'f';
          break;
        case 14:
          baseNote = 'c';
          break;
        case 15:
          baseNote = 'g';
          break;
        case 16:
          baseNote = 'd';
          break;
        case 17:
          baseNote = 'a';
          break;
        case 18:
          baseNote = 'e';
          break;
        case 19:
          baseNote = 'b';
          break;
        }

        //NOTE: Only special accidentals need to be remembered.
        var accOffset = null;
        if (note.accidental) {
          console.log('Note: ' + baseNote + ', Line: ' + note.line +
                      ', Special Accidental: ' + note.accidentalType);
          switch(0 + note.accidentalType) {
          case Accidental.NATURAL:
            accOffset = 0;
            break;
          case Accidental.SHARP_SLASH4:
            accOffset = 3*sharpValue/2;
            break;
          case Accidental.SHARP_SLASH:
            accOffset = sharpValue/2;
            break;
          case Accidental.MIRRORED_FLAT:
            accOffset = -sharpValue/2;
            break;
          case Accidental.MIRRORED_FLAT2:
            accOffset = -3*sharpValue/2;
            break;
          case Accidental.DOUBLE_SHARP_THREE_ARROWS_UP:
            accOffset = 2*sharpValue + 3;
            break;
          case Accidental.DOUBLE_SHARP_TWO_ARROWS_UP:
            accOffset = 2*sharpValue + 2;
            break;
          case Accidental.SHARP2_ARROW_UP:
          case Accidental.DOUBLE_SHARP_ONE_ARROW_UP:
            accOffset = 2*sharpValue + 1;
            break;
          case Accidental.SHARP2_ARROW_DOWN:
          case Accidental.DOUBLE_SHARP_ONE_ARROW_DOWN:
            accOffset = 2*sharpValue - 1;
            break;
          case Accidental.DOUBLE_SHARP_TWO_ARROWS_DOWN:
            accOffset = 2*sharpValue - 2;
            break;
          case Accidental.DOUBLE_SHARP_THREE_ARROWS_DOWN:
            accOffset = 2*sharpValue - 3;
            break;
          case Accidental.SHARP_THREE_ARROWS_UP:
            accOffset = sharpValue + 3;
            break;
          case Accidental.SHARP_TWO_ARROWS_UP:
            accOffset = sharpValue + 2;
            break;
          case Accidental.SHARP_ARROW_UP:
          case Accidental.SHARP_ONE_ARROW_UP:
            accOffset = sharpValue + 1;
            break;
          case Accidental.SHARP_ARROW_DOWN:
          case Accidental.SHARP_ONE_ARROW_DOWN:
            accOffset = sharpValue - 1;
            break;
          case Accidental.SHARP_TWO_ARROWS_DOWN:
            accOffset = sharpValue - 2;
            break;
          case Accidental.SHARP_THREE_ARROWS_DOWN:
            accOffset = sharpValue - 3;
            break;
          case Accidental.NATURAL_THREE_ARROWS_UP:
            accOffset = 3;
            break;
          case Accidental.NATURAL_TWO_ARROWS_UP:
            accOffset = 2;
            break;
          case Accidental.NATURAL_ARROW_UP:
          case Accidental.NATURAL_ONE_ARROW_UP:
            accOffset = 1;
            break;
          case Accidental.NATURAL_ARROW_DOWN:
          case Accidental.NATURAL_ONE_ARROW_DOWN:
            accOffset = -1;
            break;
          case Accidental.NATURAL_TWO_ARROWS_DOWN:
            accOffset = -2;
            break;
          case Accidental.NATURAL_THREE_ARROWS_DOWN:
            accOffset = -3;
            break;
          case Accidental.FLAT_THREE_ARROWS_UP:
            accOffset = -sharpValue + 3;
            break;
          case Accidental.FLAT_TWO_ARROWS_UP:
            accOffset = -sharpValue + 2;
            break;
          case Accidental.FLAT_ARROW_UP:
          case Accidental.FLAT_ONE_ARROW_UP:
            accOffset = -sharpValue + 1;
            break;
          case Accidental.FLAT_ARROW_DOWN:
          case Accidental.FLAT_ONE_ARROW_DOWN:
            accOffset = -sharpValue - 1;
            break;
          case Accidental.FLAT_TWO_ARROWS_DOWN:
            accOffset = -sharpValue - 2;
            break;
          case Accidental.FLAT_THREE_ARROWS_DOWN:
            accOffset = -sharpValue - 3;
            break;
          case Accidental.DOUBLE_FLAT_THREE_ARROWS_UP:
            accOffset = -2*sharpValue + 3;
            break;
          case Accidental.DOUBLE_FLAT_TWO_ARROWS_UP:
            accOffset = -2*sharpValue + 2;
            break;
          case Accidental.FLAT2_ARROW_UP:
          case Accidental.DOUBLE_FLAT_ONE_ARROW_UP:
            accOffset = -2*sharpValue + 1;
            break;
          case Accidental.FLAT2_ARROW_DOWN:
          case Accidental.DOUBLE_FLAT_ONE_ARROW_DOWN:
            accOffset = -2*sharpValue - 1;
            break;
          case Accidental.DOUBLE_FLAT_TWO_ARROWS_DOWN:
            accOffset = -2*sharpValue - 2;
            break;
          case Accidental.DOUBLE_FLAT_THREE_ARROWS_DOWN:
            accOffset = -2*sharpValue - 3;
            break;
          }

          if (accOffset !== null) {
            registerAccidental(note.line, segment.tick, accOffset, parms);
          }
        }

        // Check for prev accidentals first, will be null if not present
        var stepsFromBaseNote = accOffset !== null ? accOffset : getAccidental(note.line, segment.tick, parms);
        console.log('steps bef KeySig: ' + stepsFromBaseNote);
        if (stepsFromBaseNote === null) {
          // No accidentals - check key signature.
          stepsFromBaseNote = parms.currKeySig[baseNote];
          console.log('steps on KeySig: ' + stepsFromBaseNote);
        }

        console.log("Base Note: " + baseNote + ", steps: " + stepsFromBaseNote + ", tick: " + note.parent.parent.tick + ", tpc: " + note.tpc);
        var isConcert = note.tpc == note.tpc1;
        note.tuning = getCentOffset(baseNote, stepsFromBaseNote, 0, parms.currEdo, parms.currCenter, isConcert ? 0 : parms.currTranspose);
        return;
      }

      onRun: {
        console.log("Xen Tune v0.1");
        Fns.test();
        console.log(Qt.resolvedUrl("."));

        if (typeof curScore === 'undefined')
              Qt.quit();

        var parms = {};

        /*
          key signature as denoted by the TextFields.

          NOTE: parms.keySig has been deprecated, it now serves as a placeholder
                for the natural key signature.

          THIS SHOULD BE READONLY!
        */
        parms.keySig = {
          'c': 0,
          'd': 0,
          'e': 0,
          'f': 0,
          'g': 0,
          'a': 0,
          'b': 0
        };

        /*
        Used for StaffText declared custom key signature.
        No worries about handling system text vs staff text as
        the annotation automatically applies appropriately.

        Will be reset to the original TextField denoted key signature
        at the start of each staff, although using both TextField
        and StaffText(22)/SystemText(21) methods of custom key sig
        entry is STRONGLY DISCOURAGED due to extreme unpredicatability.
        */
        parms.currKeySig = parms.keySig

        parms.accidentals = {};

        applyToNotesInSelection(tuneNote, parms);
        Qt.quit();
      }
}
