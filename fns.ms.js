// Because MuseScore's QT JS environment is very weird...
// We need to manually include js files.

var _generatedTablesImportStatus = Qt.include("./generated-tables.js")
console.log('Import generated-tables.js ' + _generatedTablesImportStatus.status);
var _lookupTablesImportStatus = Qt.include("./lookup-tables.js")
console.log('Import lookup-tables.js ' + _lookupTablesImportStatus.status);
var _fnsTablesImportStatus = Qt.include("./fns.js");
console.log('Import fns.js ' + _fnsTablesImportStatus.toString());