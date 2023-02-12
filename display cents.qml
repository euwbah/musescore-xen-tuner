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
      version: "0.3.2"
      description: "Create fingerings to display cent offsets of notes.\n\n" +
        "Applies to selection, or entire score if nothing is selected."
      menuPath: "Plugins.Xen Tuner.Display Cents"

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

      onRun: {
        console.log('Xen Tuner - Display Cents');
        Fns.init(Accidental, NoteType, SymId, Element, Ms, fileIO, Qt.resolvedUrl("."), curScore);

        Fns.operationTune(1);
      }
}
