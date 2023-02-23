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
      version: "0.3.3"
      description: "The tuning cache contains cached data about tunings used in the score.\n" +
        "If you've experimented with many different tunings within a score, but aren't currently using most of them," +
        "it is highly recommended to clear the Tuning Config cache."
      menuPath: "Plugins.Xen Tuner.Clear Tuning Cache"

      id: pluginId

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
          console.error(fileIO.source + ". File IO Error: " + err);
        }
      }

      onRun: {
        console.log('Xen Tuner - Clear Tuning Cache');
        // When you want to find which import has a syntax error, uncomment this line
        // console.log(JSON.stringify(Fns));
        var isMS4 = mscoreMajorVersion >= 4;
        Fns.init(Accidental, NoteType, SymId, Element,
          fileIO, Qt.resolvedUrl("../"), curScore, isMS4);
        console.log(Qt.resolvedUrl("../"));

        if (typeof curScore === 'undefined')
              return;

        Fns.clearTuningConfigCaches();
      }
}
