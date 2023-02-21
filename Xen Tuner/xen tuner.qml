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

// When there's some syntax error the imported files and its not showing up,
// uncomment these lines
// import "generated-tables.js" as AAAAAaa
// import "lookup-tables.js" as Aaa
// import "fns.js" as Bbb

import "fns.ms.js" as Fns
import MuseScore 3.0
import QtQuick 2.9
import QtQuick.Controls 2.2
import QtQuick.Window 2.2
import QtQuick.Layouts 1.2
import Qt.labs.settings 1.0
import FileIO 3.0

MuseScore {
      version: "0.4.0"
      pluginType: "dialog" // changed from "dock" to "dialog" to support both MS3 and 4
      // dockArea: "left"
      description: "Starts the XenTuner plugin.\n\n" +
        "This will open a small docked panel to the side.\n\nIMPORTANT: Do not close the window.\n"+
        "Make sure you only have 1 instance of this plugin running at a time."
      menuPath: "Plugins.Xen Tuner.Start Xen Tuner"
      implicitHeight: 80
      implicitWidth: 300
      id: pluginId
      readonly property var window: Window.window
      
      onRun: {
        console.log('Started Xen Tuner');
        // When you want to find which import has a syntax error, uncomment this line
        // console.log(JSON.stringify(Fns));

        var isMS4 = mscoreMajorVersion >= 4;
        Fns.init(Accidental, NoteType, SymId, Element,
          fileIO, Qt.resolvedUrl("."), curScore, isMS4);
        console.log('present working dir: ' + Qt.resolvedUrl("."));
      }

      Component.onCompleted : {
        if (mscoreMajorVersion >= 4) {
          pluginId.title = qsTr("Xen Tuner");
          // pluginId.thumbnailName = "some_thumbnail.png";
          pluginId.categoryCode = "composing-arranging-tools";
        }
      }

      FileIO {
        id: fileIO
        source: "./"
        onError: function(err) {
          if (err.indexOf(".json") != -1) {
            console.warn("File not found: " + fileIO.source)
          } else {
            console.error(fileIO.source + ". File IO Error: " + err);
          }
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
        Button {
            text: "Quit"
            width: 40
            height: 20
            font.pointSize: 8
            onClicked: {
                infoText.text = "Quitting...";
                handleClose();
                pluginId.parent.Window.window.close();
            }
        }
      }

      Shortcut {
        sequence: "Alt+R"
        context: Qt.ApplicationShortcut
        id: tuneShortcut
        onActivated: {
            infoText.text = "Tuning score/selection...";
            Fns.operationTune();
            afterOperation();
        }
      }
      Shortcut {
        sequence: "J"
        context: Qt.ApplicationShortcut
        id: enharmonicShortcut
        onActivated: {
            infoText.text = "Cycling enharmonics";
            Fns.operationTranspose(0, 0);
            afterOperation();
        }
      }
      Shortcut {
        sequence: "Up"
        context: Qt.ApplicationShortcut
        id: upShortcut
        onActivated: {
            infoText.text = "Moving note(s) up";
            Fns.operationTranspose(1, 0);
            afterOperation();
        }
      }
      Shortcut {
        sequence: "Alt+Up"
        context: Qt.ApplicationShortcut
        id: up1Shortcut
        onActivated: {
            infoText.text = "Moving note(s) up aux 1";
            Fns.operationTranspose(1, 1);
            afterOperation();
        }
      }
      Shortcut {
        sequence: "Ctrl+Alt+Up"
        context: Qt.ApplicationShortcut
        id: up2Shortcut
        onActivated: {
            infoText.text = "Moving note(s) up aux 2";
            Fns.operationTranspose(1, 2);
            afterOperation();
        }
      }
      Shortcut {
        sequence: "Alt+Shift+Up"
        context: Qt.ApplicationShortcut
        id: up3Shortcut
        onActivated: {
            infoText.text = "Moving note(s) up aux 3";
            Fns.operationTranspose(1, 3);
            afterOperation();
        }
      }
      Shortcut {
        sequence: "Ctrl+Alt+Shift+Up"
        context: Qt.ApplicationShortcut
        id: up4Shortcut
        onActivated: {
            infoText.text = "Moving note(s) up aux 4";
            Fns.operationTranspose(1, 4);
            afterOperation();
        }
      }
      Shortcut {
        sequence: "End"
        enabled: false // set to true to enable
        context: Qt.ApplicationShortcut
        id: up5Shortcut
        onActivated: {
            infoText.text = "Moving note(s) up aux 5";
            Fns.operationTranspose(1, 5);
            afterOperation();
        }
      }
      Shortcut {
        sequence: "End"
        enabled: false
        context: Qt.ApplicationShortcut
        id: up6Shortcut
        onActivated: {
            infoText.text = "Moving note(s) up aux 6";
            Fns.operationTranspose(1, 6);
            afterOperation();
        }
      }
      Shortcut {
        sequence: "Down"
        context: Qt.ApplicationShortcut
        id: downShortcut
        onActivated: {
            infoText.text = "Moving note(s) down";
            Fns.operationTranspose(-1, 0);
            afterOperation();
        }
      }
      Shortcut {
        sequence: "Alt+Down"
        context: Qt.ApplicationShortcut
        id: down1Shortcut
        onActivated: {
            infoText.text = "Moving note(s) down aux 1";
            Fns.operationTranspose(-1, 1);
            afterOperation();
        }
      }
      Shortcut {
        sequence: "Ctrl+Alt+Down"
        context: Qt.ApplicationShortcut
        id: down2Shortcut
        onActivated: {
            infoText.text = "Moving note(s) down aux 2";
            Fns.operationTranspose(-1, 2);
            afterOperation();
        }
      }
      Shortcut {
        sequence: "Alt+Shift+Down"
        context: Qt.ApplicationShortcut
        id: down3Shortcut
        onActivated: {
            infoText.text = "Moving note(s) down aux 3";
            Fns.operationTranspose(-1, 3);
            afterOperation();
        }
      }
      Shortcut {
        sequence: "Ctrl+Alt+Shift+Down"
        context: Qt.ApplicationShortcut
        id: down4Shortcut
        onActivated: {
            infoText.text = "Moving note(s) down aux 4";
            Fns.operationTranspose(-1, 4);
            afterOperation();
        }
      }
      Shortcut {
        sequence: "Home"
        enabled: false
        context: Qt.ApplicationShortcut
        id: down5Shortcut
        onActivated: {
            infoText.text = "Moving note(s) down aux 5";
            Fns.operationTranspose(-1, 5);
            afterOperation();
        }
      }
      Shortcut {
        sequence: "Home"
        enabled: false
        context: Qt.ApplicationShortcut
        id: down6Shortcut
        onActivated: {
            infoText.text = "Moving note(s) down aux 5";
            Fns.operationTranspose(-1, 5);
            afterOperation();
        }
      }

      onScoreStateChanged: {
        if (state.selectionChanged && curScore) {
            var elems = curScore.selection.elements;
            var el = elems[0];
            var name = el ? el.name : null;
            if (elems.length == 1 && 
                (name == "SystemText" || name == "StaffText" || 
                name == "TBox" || name == "Text" || name == "Fingering" ||
                name == "Tempo" || name == "Expression")) {
                // allow the user to use up/down arrow keys to navigate text
                Fns.setUpDownFallthrough(false);
                upShortcut.enabled = false;
                downShortcut.enabled = false;
                enharmonicShortcut.enabled = false;
            } else {
                // If no notes are selected, allow up/down arrow keys to move elements.
                Fns.setUpDownFallthrough(true);
                upShortcut.enabled = true;
                downShortcut.enabled = true;
                enharmonicShortcut.enabled = true;
            }
        }
      }

      function afterOperation() {
        // Don't do this, it will steal focus from the score
        // pluginId.window.requestActivate();
      }

      function handleClose() {
        console.log('Quitting');
        var shortcuts = [
          tuneShortcut, enharmonicShortcut, upShortcut, up1Shortcut,
          up2Shortcut, up3Shortcut, up4Shortcut, up5Shortcut, up6Shortcut,
          downShortcut, down1Shortcut, down2Shortcut, down3Shortcut,
          down4Shortcut, down5Shortcut, down6Shortcut
        ];
        for (var i = 0; i < shortcuts.length; i++) {
          shortcuts[i].context = Qt.WindowShortcut; // make the shortcut disappear with the window.
          console.log('disable shortcut: ' + shortcuts[i].sequence);
        }
      }
}
