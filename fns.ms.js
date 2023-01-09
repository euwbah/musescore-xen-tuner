// Because MuseScore's QT JS environment is very weird...
// We need to manually include js files.

Qt.include("./lookup-tables.js", function() {
    Qt.include("./fns.js");
});