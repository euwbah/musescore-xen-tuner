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

      onRun: {
        console.log("Xen Tune v0.1");
        Fns.init(Accidental, NoteType);
        console.log(Qt.resolvedUrl("."));

        if (typeof curScore === 'undefined')
              Qt.quit();

        var parms = {};
        curScore.createPlayEvents();

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
                    var text = removeFormattingCode(annotation.text);
                    
                    var maybeConfig = Fns.parseTuningConfig(text);

                    if (maybeConfig != null) {
                      console.log("Found tuning config:\n" + text);
                      // tuning config found.

                      configs.push({ // ConfigUpdateEvent
                        tick: cursor.tick,
                        config: {
                          currTuning: maybeConfig
                        }
                      });
                    }

                    maybeConfig = Fns.parseKeySig(text);

                    if (maybeConfig != null) {
                      // key sig found
                      console.log("Found key sig:\n" + text);

                      configs.push({ // ConfigUpdateEvent
                        tick: cursor.tick,
                        config: {
                          currKeySig: maybeConfig
                        }
                      });
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
          for (var voice = 0; voice < 4; voice++) {
            // After each voice & rewind, 
            // reset all configs back to default
            parms.currKeySig = null;
            parms.currTuning = Fns.generateDefaultTuningConfig();

            // NOTE: FOR WHATEVER REASON, rewind(1) must be called BEFORE assigning voice and staffIdx,
            //       and rewind(0) MUST be called AFTER rewind(1), AND AFTER assigning voice and staffIdx.
            cursor.rewind(1);
            cursor.voice = voice; //voice has to be set after goTo
            cursor.staffIdx = staff;
            cursor.rewind(0);

            var measureCount = 0;

            console.log("Tuning. staff: " + staff + ", voice: " + voice);

            // Loop elements of a voice
            while (cursor.segment && (fullScore || cursor.tick < endTick)) {

              // Apply all declared configs up to current cursor position.

              for (var i = 0; i < parms.staffConfigs[staff].length; i++) {
                var config = parms.staffConfigs[staff][i];
                if (config.tick <= cursor.tick) {
                  var configKeys = Object.keys(config.config);
                  for (var j = 0; j < configKeys.length; j++) {
                    var key = configKeys[j];
                    parms[key] = config.config[key];
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
                      Fns.tuneNote(notes[j], parms.currKeySig, parms.currTuning, parms.bars, cursor);
                    }
                  }
                  var notes = cursor.element.notes;
                  for (var i = 0; i < notes.length; i++) {
                    Fns.tuneNote(notes[i], parms.currKeySig, parms.currTuning, parms.bars, cursor);

                    // REMOVE AFTER TESTING
                    // this is how find other symbols (aux accidentals) attached to the note
                    // for (var j = 0; j < note.elements.length; j++) {
                    //   if (note.elements[j].symbol)
                    //     console.log(note.elements[j].symbol);
                    // }
                  }
                }
              }
              cursor.next();
            }
          }
        }

        Qt.quit();
      }
}
