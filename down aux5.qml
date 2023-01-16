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
      description: "Lower selection/selected note(s) down to a lower step. Steps sizes are determined by the fifth aux() declaration."
      menuPath: "Plugins.xen.Pitch Down (aux5)"

      FileIO {
        id: fileIO
        source: "tunings/default.txt"
      }
      
      /* 
      Just update these vars to change the direction/aux of this operation.

      Directions: 1 (up), 0 (enharmonic cycle), -1 (down)
      */
      property var stepwiseDirection: -1
      property var stepwiseAux: 0
      
      onRun: {
        console.log("Xen Down");

        if (typeof curScore === 'undefined')
              Qt.quit();

        Fns.init(Accidental, NoteType, SymId, Element, Ms, fileIO, Qt.resolvedUrl("."), curScore);
        console.log(Qt.resolvedUrl("."));
        var parms = {};
        curScore.createPlayEvents();

        var cursor = curScore.newCursor();
        cursor.rewind(1);
        var startStaff;
        var endStaff;
        var startTick = cursor.tick;
        var endTick;
        var noPhraseSelection = false;
        if (!cursor.segment) { // no selection
          // no action if no selection.
          console.log('no phrase selection');
          noPhraseSelection = true;
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
        console.log(startStaff + " - " + endStaff + " - " + endTick)

        parms.staffConfigs = {};
        parms.bars = [];

        // populate configs for all staves.

        for (var staff = 0; staff < curScore.nstaves; staff++) {
          var configs = [];

          for (var voice = 0; voice < 4; voice++) {
            cursor.rewind(1);
            cursor.staffIdx = staff;
            cursor.voice = voice;
            cursor.rewind(0);

            var measureCount = 0;
            console.log("Populating configs. staff: " + staff + ", voice: " + voice);

            while (true) {
              if (cursor.segment) {
                // scan edo & tuning center first. key signature parsing is dependant on edo used.
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

                if (cursor.segment.tick == cursor.measure.firstSegment.tick 
                    && voice === 0 && staff === 0) {
                  if (!parms.bars)
                    parms.bars = [];

                  parms.bars.push(cursor.segment.tick);
                  measureCount ++;
                  console.log("New bar - " + measureCount + ", tick: " + cursor.segment.tick);
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

        // End of config population.
        //
        //
        //
        // Begin pitch modification impl


        if (noPhraseSelection) {
          // No phrase/range selection mode.
          //
          // User selects individual note heads to modify.

          // - No-op if curScore.selection.elements.length == 0.
          // - If selection doesn't contain a single element that has Element.type == Element.NOTE,
          //   default to cmd('pitch-up') or cmd('pitch-down') so MuseScore can handle moving other Elements.
          //   This allows users to use this plugin in place of the 'pitch-up' and 'pitch-down' shortcuts (up/down arrow keys)
          //   without losing any of the other functions that the up or down arrow keys originally provides.
          // - If selection contains individual notes, transpose them.

          if (curScore.selection.elements.length == 0) {
            console.log('no individual selection. quitting.');
            Qt.quit();
          } else {
            var selectedNotes = [];
            for (var i = 0; i < curScore.selection.elements.length; i++) {
              if (curScore.selection.elements[i].type == Element.NOTE) {
                selectedNotes.push(curScore.selection.elements[i]);
              }
            }

            // for debugging
            // for (var i = 0; i < selectedNotes.length; i ++) {
            //   selectedNotes[i].color = 'red';
            // }

            if (selectedNotes.length == 0) {
              console.log('no selected note elements, defaulting to pitch-up/pitch-down shortcuts');
              if (stepwiseDirection == 1)
                cmd('pitch-up');
              else if (stepwiseDirection == -1)
                cmd('pitch-down');
              Qt.quit();
            }

            // Run transpose operation on all selected note elements.

            // contains list of notes that have already been transposed
            // this is to prevent repeat transposition in the event that
            // 2 notes tied to each other are individually selected.
            var affected = [];

            for (var i = 0; i < selectedNotes.length; i++) {
              var note = selectedNotes[i];
              var voice = note.track % 4;
              var staffIdx = Math.floor(note.track / 4);
              var tick = Fns.getTick(note);

              // handle transposing the firstTiedNote in the event that a non-first tied note
              // is selected.
              note = note.firstTiedNote;

              var alreadyTrans = false;
              for (var j = 0; j < affected.length; j++) {
                if (affected[j].is(note)) {
                  alreadyTrans = true;
                  break;
                }
              }

              if (alreadyTrans)
                continue;

              affected.push(note);

              Fns.setCursorToPosition(cursor, tick, voice, staffIdx);

              console.log('indiv note: line: ' + note.line + ', voice: ' + cursor.voice 
                + ', staff: ' + cursor.staffIdx + ', tick: ' + tick);


              // Reset & populate configs for each note,
              // since we're uncertain which note belongs to which bar.

              Fns.resetParms(parms);
              
              for (var j = 0; j < parms.staffConfigs[Math.floor(note.track / 4)].length; j++) {
                var config = parms.staffConfigs[cursor.staffIdx][j];
                if (config.tick <= cursor.tick) {
                  var configKeys = Object.keys(config.config);
                  for (var k = 0; k < configKeys.length; k++) {
                    var key = configKeys[k];
                    parms[key] = config.config[key];
                  }
                }
              }

              var barBoundaries = Fns.getBarBoundaries(tick, parms.bars);

              // Modify pitch.

              curScore.startCmd();

              // direction: 1: up, -1 = down, 0: enharmonic cycle.
              var barState = Fns.executeTranspose(note, stepwiseDirection, 
                stepwiseAux, parms, newElement, cursor);

              // Remove unnecessary accidentals just for this bar.

              Fns.removeUnnecessaryAccidentals(
                tick, tick, parms, cursor, newElement);

              curScore.endCmd();              
              curScore.startCmd();
              
              // Auto position accidentals in this bar.
              Fns.autoPositionAccidentals(
                tick, tick, parms, cursor
              );
              curScore.endCmd();              
              

            }
          }
        } // End of no-phrase selection impl
        else 
        {
          // Standard implementation for phrase selection.
          for (var staff = startStaff; staff <= endStaff; staff++) {
            curScore.startCmd();
            for (var voice = 0; voice < 4; voice++) {
              
              // reset curr configs

              Fns.resetParms(parms);

              cursor.rewind(1); // goes to start of selection, will reset voice to 0

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

              cursor.staffIdx = staff;
              cursor.voice = voice;

              console.log('processing:' + cursor.tick + ', voice: ' + cursor.voice + ', staffIdx: ' + cursor.staffIdx);

              var tickOfLastModified = -1;

              // Loop elements of a voice
              while (cursor.segment && (cursor.tick < endTick)) {
                if (tickOfNextBar != -1 && cursor.tick >= tickOfNextBar) {
                  // At the end of every bar, remove unnecessary accidentals.
                  Fns.removeUnnecessaryAccidentals(
                    tickOfThisBar, tickOfThisBar, parms, cursor, newElement);
                  
                  // We can't do this one-shot at the end, because the unnecessary accidentals
                  // dependins on tuning config & key sig, which may be different for each
                  // bar.

                  // However, a more efficient method would be to store the last tick when
                  // key sig/tuning config was changed, and when config is changed
                  // again, we remove unnecessary accidentals, then proceed.
                  // This would be more efficient than re-running this function every bar.
                  // 
                  // TODO: improve efficiency of removeUnnecessaryAccidentals call
                  // (Only if performance improvements are necessary)

                  // Update bar boundaries.
                  currBar++;
                  tickOfThisBar = tickOfNextBar;
                  tickOfNextBar = currBar == parms.bars.length - 1 ? -1 : parms.bars[currBar + 1];
                }

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

                if (cursor.element) {
                  if (cursor.element.type == Ms.CHORD) {
                    var graceChords = cursor.element.graceNotes;
                    for (var i = 0; i < graceChords.length; i++) {
                      // iterate through all grace chords
                      var notes = graceChords[i].notes;
                      for (var j = 0; j < notes.length; j++) {
                        var note = notes[j];

                        // skip notes that are tied to previous notes.
                        if (note.tieBack)
                          continue;

                        // Modify pitch.
                        Fns.executeTranspose(note, stepwiseDirection, stepwiseAux, parms, newElement, cursor);
                      }
                    }
                    var notes = cursor.element.notes;
                    for (var i = 0; i < notes.length; i++) {
                      var note = notes[i];

                      // skip notes that are tied to previous notes.
                      if (note.tieBack)
                        continue;

                      // Modify pitch.
                      Fns.executeTranspose(note, stepwiseDirection, stepwiseAux, parms, newElement, cursor);
                    }
                    tickOfLastModified = cursor.tick;
                  }
                }
                cursor.next();
              }

              // Don't forget to remove unnecessary accidentals for the last bit of 
              // the selection that wasn't included in the loop above.

              if (tickOfLastModified != -1) {
                Fns.removeUnnecessaryAccidentals(
                  tickOfLastModified, tickOfLastModified, parms, 
                  cursor, newElement);
              }

              // Also don't forget to auto position accidentals for the last bar.
            } // end of voices

            curScore.endCmd();

            curScore.startCmd();

            // After processing all voices in a staff, 
            // auto position accidentals in this staff in the selection range
            Fns.autoPositionAccidentals(
              startTick, endTick, parms, cursor
            );
            curScore.endCmd();
          }
        }

        Qt.quit();
      }
}
