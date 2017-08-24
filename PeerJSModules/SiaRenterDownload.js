//Initiate a file download from Sia

var http = require('http');
var path = require('path');
var db = require('diskdb');
db = db.connect(path.join(__dirname, '../JDB/'), ['Settings']);
var settings = db.Settings.find({
  SettingsFlag: 1
});
var portval = settings[0].APIPortNumber;

//Require the FileSystem module to facilitate downloads
var fs = require('fs');

SiaRenDnl = function(download,downloadpeer, callback) {

  var absDir = path.join(__dirname, '../SiaDownloads/')
  var dir = '../SiaDownloads/';
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }

  http.get({
    url: 'localhost',
    port: portval,
    path: '/renter/download/' + download.replace(/ /g,'%20') + '?destination=' + absDir + downloadpeer.replace(/ /g,'%20'),
    headers: {
      'User-Agent': 'Sia-Agent',
    }
  }, function(response) {
    // Continuously update stream with data
    response.on('data', function(d) {

    });
    response.on('end', function() {
      console.log('downloaded');
      return callback('downloaded');

    });
  });

};

//Export the module for the rest of the app
exports.SiaRenDnl = SiaRenDnl;
