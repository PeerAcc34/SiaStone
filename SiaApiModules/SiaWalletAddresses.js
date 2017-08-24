//The purpose of this module is to retreive a list of transactions for an address
//INPUT: Wallet Address String
//OUTPUT: Transaction array

var http = require('http');

var path = require('path');
var db = require('diskdb');
db = db.connect(path.join(__dirname, '../JDB/'), ['Settings']);
var settings = db.Settings.find({
  SettingsFlag: 1
});
var portval = settings[0].APIPortNumber;

SiaWalAdrs = function(callback) {

  http.get({
    url: 'localhost',
    port: portval,
    path: '/wallet/addresses',
    headers: {
      'User-Agent': 'Sia-Agent',
    }
  }, function(response) {
    // Continuously update stream with data
    var WalAdrsArr = [];
    response.on('data', function(d) {
      WalAdrsArr += d;
    });
    response.on('end', function() {

      // Data reception is done, do whatever with it!
      var AdrsVer = JSON.parse(WalAdrsArr);
      return callback(AdrsVer);
    });
  });

};

//Export the module for the rest of the app
exports.SiaWalAdrs = SiaWalAdrs;

