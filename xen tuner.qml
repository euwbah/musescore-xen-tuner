// When there's some syntax error in fns.js and its not showing up,
// uncomment this line.
// import "fns.js" as Aaaimport "fns.ms.js" as Fns
import "fns.ms.js" as Fns
import MuseScore 3.0
import QtQuick 2.9
import QtQuick.Controls 2.2
import QtQuick.Window 2.2
import QtQuick.Layouts 1.2
import Qt.labs.settings 1.0
import FileIO 3.0

MuseScore {
      version: "0.1.1"
      pluginType: "dock"
      dockArea: "left"
      description: "Starts the XenTuner plugin.\n\n" +
        "This will open a small docked panel to the side.\n\nIMPORTANT: Do not close the window.\n"+
        "Make sure you only have 1 instance of this plugin running at a time."
      menuPath: "Plugins.Xen Tuner.Start Xen Tuner"
      implicitHeight: 80
      implicitWidth: 200
      id: pluginId

      FileIO {
        id: fileIO
        source: "./"
        onError: function(err) {
          console.error(fileIO.source + ". File IO Error: " + err);
        }
      }
      GridLayout {
        columns: 1
        rowSpacing: 1
        anchors.fill: parent
        Text {
            id: infoText
            text: "Xenharmonic is running."
            font.pointSize: 8
            color: "white"
        }
      }

      Shortcut {
        sequence: "Alt+R"
        context: Qt.ApplicationShortcut
        onActivated: {
            infoText.text = "Tuning score/selection...";
            Fns.operationTune();
            showWindow();
        }
      }
      Shortcut {
        sequence: "J"
        context: Qt.ApplicationShortcut
        onActivated: {
            infoText.text = "Cycling enharmonics";
            Fns.operationTranspose(0, 0);
            showWindow();
        }
      }
      Shortcut {
        sequence: "Up"
        context: Qt.ApplicationShortcut
        id: upShortcut
        onActivated: {
            infoText.text = "Moving note(s) up";
            Fns.operationTranspose(1, 0);
            showWindow();
        }
      }
      Shortcut {
        sequence: "Alt+Up"
        context: Qt.ApplicationShortcut
        onActivated: {
            infoText.text = "Moving note(s) up aux 1";
            Fns.operationTranspose(1, 1);
            showWindow();
        }
      }
      Shortcut {
        sequence: "Ctrl+Alt+Up"
        context: Qt.ApplicationShortcut
        onActivated: {
            infoText.text = "Moving note(s) up aux 2";
            Fns.operationTranspose(1, 2);
            showWindow();
        }
      }
      Shortcut {
        sequence: "Alt+Shift+Up"
        context: Qt.ApplicationShortcut
        onActivated: {
            infoText.text = "Moving note(s) up aux 3";
            Fns.operationTranspose(1, 3);
            showWindow();
        }
      }
      Shortcut {
        sequence: "Ctrl+Alt+Shift+Up"
        context: Qt.ApplicationShortcut
        onActivated: {
            infoText.text = "Moving note(s) up aux 4";
            Fns.operationTranspose(1, 4);
            showWindow();
        }
      }
      Shortcut {
        sequence: "Down"
        context: Qt.ApplicationShortcut
        id: downShortcut
        onActivated: {
            infoText.text = "Moving note(s) down";
            Fns.operationTranspose(-1, 0);
            showWindow();
        }
      }
      Shortcut {
        sequence: "Alt+Down"
        context: Qt.ApplicationShortcut
        onActivated: {
            infoText.text = "Moving note(s) down aux 1";
            Fns.operationTranspose(-1, 1);
            showWindow();
        }
      }
      Shortcut {
        sequence: "Ctrl+Alt+Down"
        context: Qt.ApplicationShortcut
        onActivated: {
            infoText.text = "Moving note(s) down aux 2";
            Fns.operationTranspose(-1, 2);
            showWindow();
        }
      }
      Shortcut {
        sequence: "Alt+Shift+Down"
        context: Qt.ApplicationShortcut
        onActivated: {
            infoText.text = "Moving note(s) down aux 3";
            Fns.operationTranspose(-1, 3);
            showWindow();
        }
      }
      Shortcut {
        sequence: "Ctrl+Alt+Shift+Down"
        context: Qt.ApplicationShortcut
        onActivated: {
            infoText.text = "Moving note(s) down aux 4";
            Fns.operationTranspose(-1, 4);
            showWindow();
        }
      }

      onRun: {
        console.log('Started Xen Tuner');
        // When you want to find which import has a syntax error, uncomment this line
        // console.log(JSON.stringify(Fns));
        Fns.init(Accidental, NoteType, SymId, Element, Ms, fileIO, Qt.resolvedUrl("."), curScore);
        console.log('present working dir: ' + Qt.resolvedUrl("."));
      }

      onScoreStateChanged: {
        if (state.selectionChanged && curScore) {
            var elems curScore.selection.elements;
            var el = elems[0];
            var name = el ? el.name : null;
            if (elems.length == 1 && 
                (name == "SystemText" || name == "StaffText" || name == "TBox" || name == "Text")) {
                // allow the user to use up/down arrow keys to navigate text
                Fns.setUpDownFallthrough(false);
                upShortcut.enabled = false;
                downShortcut.enabled = false;
            } else {
                // If no notes are selected, allow up/down arrow keys to move elements.
                Fns.setUpDownFallthrough(true);
                upShortcut.enabled = true;
                downShortcut.enabled = true;
            }
        }
      }

      function showWindow() {
        pluginId.window.requestActivate();
      }
}
