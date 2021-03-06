//Generate a Sia address for purchases

var http = require('http');

var path = require('path');
var db = require('diskdb');
db = db.connect(path.join(__dirname, '../JDB/'), ['Settings']);
var settings = db.Settings.find({
  SettingsFlag: 1
});
var portval = settings[0].APIPortNumber;

SiaWalAdr = function(callback) {

  var WalAdrArr = [];
  http.get({
    url: 'localhost',
    port: portval,
    path: '/wallet/address',
    headers: {
      'User-Agent': 'Sia-Agent',
    }
  }, function(response) {
    // Continuously update stream with data

    response.on('data', function(d) {
      WalAdrArr.push(d);
    });
    response.on('end', function() {

      var AdrVer = JSON.parse(WalAdrArr).address;
      return callback(AdrVer);
    });
  });
};

//Export the module for the rest of the app
exports.SiaWalAdr = SiaWalAdr;
