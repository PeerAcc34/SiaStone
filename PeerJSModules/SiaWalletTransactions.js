//The purpose of this module is to retreive a list of transactions for an address

var http = require('http');

var path = require('path');
var db = require('diskdb');
db = db.connect(path.join(__dirname, '../JDB/'), ['Settings']);
var settings = db.Settings.find({
  SettingsFlag: 1
});
var portval = settings[0].APIPortNumber;

SiaWalTrx = function(Address, callback) {

  var TrxArr = '';
  var WalTrxArr; //Create an array to store the list of related transactions

  http.get({
    url: 'localhost',
    port: portval,
    path: '/wallet/transactions/' + Address,
    headers: {
      'User-Agent': 'Sia-Agent',
    }
  }, function(response) {
    // Continuously update stream with data
    response.on('data', function(d) {
      TrxArr += d;
    });
    response.on('end', function() {
      WalTrxArr = JSON.parse(TrxArr);
      //console.log(WalTrxArr);
      return callback(WalTrxArr);
    });
  });

};

//Export the module for the rest of the app
exports.SiaWalTrx = SiaWalTrx;
