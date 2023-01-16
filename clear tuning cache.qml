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
      description: "The tuning cache contains cached data about tunings used in the score.\n" +
        "If you've experimented with many different tunings within a score, but aren't currently using most of them," +
        "it is highly recommended to clear the Tuning Config cache."
      menuPath: "Plugins.xen.Clear Tuning Cache"

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

        Fns.clearTuningConfigCache();

        Qt.quit();
      }
}
