// When there's some syntax error in fns.js and its not showing up,
// uncomment this line.
// import "fns.js" as Aaaimport "fns.ms.js" as Fns
import "fns.ms.js" as Fns
import MuseScore 3.0
import QtQuick 2.9
import QtQuick.Controls 2.2
import QtQuick.Layouts 1.2
import Qt.labs.settings 1.0
import FileIO 3.0

MuseScore {
      version: "0.1.1"
      description: "Retune selection/score to annotated tuning system(s)"
      menuPath: "Plugins.xen.Tune"

      FileIO {
        id: fileIO
        source: "./"
        onError: function(err) {
          console.error(fileIO.source + ". File IO Error: " + err);
        }
      }

      onRun: {
        console.log('Xen Tune');
        // When you want to find which import has a syntax error, uncomment this line
        // console.log(JSON.stringify(Fns));
        Fns.init(Accidental, NoteType, SymId, Element, Ms, fileIO, Qt.resolvedUrl("."), curScore);
        console.log(Qt.resolvedUrl("."));

        if (typeof curScore === 'undefined')
              Qt.quit();

        var parms = {};
        curScore.createPlayEvents();

        var cursor = curScore.newCursor();
        cursor.rewind(1);
        var startStaff;
        var endStaff;
        var startTick = cursor.tick;
        var endTick;
        var fullScore = false;
        if (!cursor.segment) { // no selection
          fullScore = true;
          startStaff = 0; // start with 1st staff
          endStaff = curScore.nstaves - 1; // and end with last
          endTick = curScore.lastSegment.tick + 1;
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
        console.log("startStaff: " + startStaff + ", endStaff: " + endStaff + ", endTick: " + endTick);

        //
        //
        //
        // -------------- Actual thing here -----------------------
        //
        //
        //

        // Set parms' defaults.

        // mapping of staffIdx to [ConfigUpdateEvent]
        parms.staffConfigs = {};
        // contains list of bars' ticks in order.
        parms.bars = [];


        // these aren't really necessary as they'll be configured & updated
        // on a per-staff basis.
        // parms.currKeySig = null;
        // parms.currTuning = null;


        // First, populate ConfigUpdateEvents for each staff.

        for (var staff = startStaff; staff <= endStaff; staff++) {
          
          // Contains [ConfigUpdateEvent]s for curr staff
          var configs = [];

          // Search each voice and populate `ConfigUpdateEvent`s in this staff.
          for (var voice = 0; voice < 4; voice++) {

            // NOTE: THIS IS THE ONLY RIGHT WAY (TM) TO REWIND THE CURSOR TO THE START OF THE SCORE.
            //       ANY OTHER METHOD WOULD RESULT IN CATASTROPHIC FAILURE FOR WHATEVER REASON.
            cursor.rewind(1);
            cursor.voice = voice;
            cursor.staffIdx = staff;
            cursor.rewind(0);

            var measureCount = 0;
            console.log("Populating configs. staff: " + staff + ", voice: " + voice);

            while (true) {
              // loop from first segment to last segment of this staff+voice.
              if (cursor.segment) {
                for (var i = 0; i < cursor.segment.annotations.length; i++) {
                  var annotation = cursor.segment.annotations[i];
                  console.log("found annotation type: " + annotation.name);
                  if ((annotation.name == 'StaffText' && Math.floor(annotation.track / 4) == staff) ||
                      (annotation.name == 'SystemText')) {
                    var maybeConfigUpdateEvent = Fns.parsePossibleConfigs(annotation.text, cursor.tick);

                    if (maybeConfigUpdateEvent != null) {
                      configs.push(maybeConfigUpdateEvent);
                    }
                  }
                }

                if (cursor.segment.tick == cursor.measure.firstSegment.tick && 
                    voice === 0 && staff == startStaff) {
                  // For the first staff/voice, store tick positions of the start of each bar.
                  // this is used for accidental calculations.

                  parms.bars.push(cursor.segment.tick);
                  measureCount ++;
                  console.log("New bar - " + measureCount);
                }
              }

              if (!cursor.next())
                break;
            }
          }

          parms.staffConfigs[staff] = configs.sort(function(a, b) {
            return a.tick - b.tick;
          });
        }

        // Staff configs have been populated!

        // Go through each staff + voice to start tuning notes.

        for (var staff = startStaff; staff <= endStaff; staff++) {

          curScore.startCmd();

          for (var voice = 0; voice < 4; voice++) {
            // After each voice & rewind, 
            // reset all configs back to default
            Fns.resetParms(parms);

            // NOTE: FOR WHATEVER REASON, rewind(1) must be called BEFORE assigning voice and staffIdx,
            //       and rewind(0) MUST be called AFTER rewind(1), AND AFTER assigning voice and staffIdx.
            cursor.rewind(1);
            cursor.voice = voice; //voice has to be set after goTo
            cursor.staffIdx = staff;
            cursor.rewind(0);

            // 0-indexed bar counter.
            // Used to keep track of bar boundaries efficiently.
            var currBar = parms.bars.length - 1;
            for (var i = 0; i < parms.bars.length; i++) {
              if (parms.bars[i] > cursor.tick) {
                currBar = i - 1;
                break;
              }
            }

            var tickOfThisBar = parms.bars[currBar];
            var tickOfNextBar = currBar == parms.bars.length - 1 ? -1 : parms.bars[currBar + 1];

            console.log("Tuning. staff: " + staff + ", voice: " + voice);
            // console.log("Starting bar: " + currBar + ", tickOfThisBar: " + tickOfThisBar + ", tickOfNextBar: " + tickOfNextBar);

            // Tuning doesn't affect note/accidental state,
            // we can reuse bar states per bar to prevent unnecessary
            // computation.
            var reusedBarState = {};
            var tickOfLastModified = -1;

            // Loop elements of a voice
            while (cursor.segment && (fullScore || cursor.tick < endTick)) {
              if (tickOfNextBar != -1 && cursor.tick >= tickOfNextBar) {
                Fns.removeUnnecessaryAccidentals(
                    tickOfThisBar, tickOfThisBar, parms, cursor, newElement);
                // Update bar boundaries.
                currBar ++;
                tickOfThisBar = tickOfNextBar;
                tickOfNextBar = currBar == parms.bars.length - 1 ? -1 : parms.bars[currBar + 1];
                // console.log("Next bar: " + currBar + ", tickOfThisBar: " + tickOfThisBar + ", tickOfNextBar: " + tickOfNextBar);
                // reset bar state.
                reusedBarState = {};
              }

              // Apply all declared configs up to current cursor position.

              for (var i = 0; i < parms.staffConfigs[staff].length; i++) {
                var config = parms.staffConfigs[staff][i];
                if (config.tick <= cursor.tick) {
                  var configKeys = Object.keys(config.config);
                  for (var j = 0; j < configKeys.length; j++) {
                    var key = configKeys[j];
                    parms[key] = config.config[key];
                    // console.log('Applied config: ' + key + ' = eqvSize: ' + config.config[key].equaveSize +
                    //   ', staff: ' + staff + ', voice: ' + voice + ', config tick: ' + config.tick
                    //   + ', cursor tick: ' + cursor.tick);
                  }
                }
              }

              // Tune the note!

              if (cursor.element) {
                if (cursor.element.type == Ms.CHORD) {
                  var graceChords = cursor.element.graceNotes;
                  for (var i = 0; i < graceChords.length; i++) {
                    // iterate through all grace chords
                    var notes = graceChords[i].notes;
                    for (var j = 0; j < notes.length; j++) {
                      Fns.tuneNote(notes[j], parms.currKeySig, parms.currTuning, 
                        tickOfThisBar, tickOfNextBar, cursor, reusedBarState, newElement);
                    }
                  }
                  var notes = cursor.element.notes;
                  for (var i = 0; i < notes.length; i++) {
                    Fns.tuneNote(notes[i], parms.currKeySig, parms.currTuning, 
                      tickOfThisBar, tickOfNextBar, cursor, reusedBarState, newElement);

                    // REMOVE AFTER TESTING
                    // this is how find other symbols (aux accidentals) attached to the note
                    // for (var j = 0; j < note.elements.length; j++) {
                    //   if (note.elements[j].symbol)
                    //     console.log(note.elements[j].symbol);
                    // }
                  }

                  tickOfLastModified = cursor.tick;
                }
              }
              cursor.next();
            }
            
            if (tickOfLastModified != -1) {
              Fns.removeUnnecessaryAccidentals(
                tickOfLastModified, tickOfLastModified, parms, 
                cursor, newElement);
            }
          } // end of voice loop

          curScore.endCmd();

          curScore.startCmd();

          Fns.autoPositionAccidentals(
            startTick, endTick, parms, cursor
          );

          curScore.endCmd();
        }

        Qt.quit();
      }
}
