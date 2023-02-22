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

// Because MuseScore's QT JS environment is very weird...
// We need to manually include js files.

var _generatedTablesImportStatus = Qt.include("./generated-tables.js")
console.log('Import generated-tables.js ' + _generatedTablesImportStatus.status);
var _lookupTablesImportStatus = Qt.include("./lookup-tables.js")
console.log('Import lookup-tables.js ' + _lookupTablesImportStatus.status);
var _fnsTablesImportStatus = Qt.include("./fns.js");
console.log('Import fns.js ' + _fnsTablesImportStatus.toString());