import QtQuick 2.1
import "fns.ms.js" as Fns
import QtQuick.Controls 1.3
import QtQuick.Controls.Styles 1.3
import MuseScore 3.0

MuseScore {
      version: "0.1.0"
      description: "Retune selection/score to tuning system"
      menuPath: "Plugins.xen.Tune"

      // WARNING! This doesn't validate the accidental code!
      property variant customKeySigRegex: /\.(.*)\.(.*)\.(.*)\.(.*)\.(.*)\.(.*)\.(.*)/g

      // MuseScore's annotations contain formatting code in angle brackets if the
      // annotation text formatting is not default. This function removes
      // all text within angle brackets including the brackets themselves
      function removeFormattingCode(str) {
        if (typeof(str) == 'string')
          return str.replace(/<[^>]*>/g, '');
        else
          return null;
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
                      if (!isNaN(edo) || edo !== undefined || edo !== null) {
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
                      if (!isNaN(center.freq) || center.freq !== undefined || center.freq !== null) {
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

      // Note: if scanOnly is true, accidentals will be registered but the note
      // will not be tuned.
      function tuneNote(note, segment, parms, scanOnly) {
        var tpc = note.tpc;
        var fifthStep = Math.round(parms.currEdo * Math.log(3/2) / Math.LN2);
        var sharpValue = 7*fifthStep - 4*parms.currEdo;

        

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
        Fns.init(Accidental);
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
