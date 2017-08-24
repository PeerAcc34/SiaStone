//The purpose of this module is get details about the wallet i.e. if it is unlocked

var http = require('http');

var path = require('path');
var db = require('diskdb');
db = db.connect(path.join(__dirname, '../JDB/'), ['Settings']);
var settings = db.Settings.find({
  SettingsFlag: 1
});
var portval = settings[0].APIPortNumber;

SiaWal = function(callback) {

  http.get({
    url: 'localhost',
    port: portval,
    path: '/wallet',
    headers: {
      'User-Agent': 'Sia-Agent',
    }
  }, function(response) {
    // Continuously update stream with data
    var WalArr = [];
    response.on('data', function(d) {
      WalArr += d;
    });
    response.on('end', function() {

      // Data reception is done, do whatever with it!
      var EncStat = JSON.parse(WalArr);
      return callback(EncStat);
    });
  });
};

//Export the module for the rest of the app
exports.SiaWal = SiaWal;
