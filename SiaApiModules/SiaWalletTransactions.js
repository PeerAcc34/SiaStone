//The purpose of this module is to retreive a list of transactions for an address
//INPUT: Wallet Address String
//OUTPUT: Transaction array

var path = require('path');
var db = require('diskdb');
db = db.connect(path.join(__dirname, '../JDB/'), ['Settings']);
var settings = db.Settings.find({
  SettingsFlag: 1
});
var portval = settings[0].APIPortNumber;

SiaWalTrx = function(Address) {

  var http = require('http'); //Get the HTTP module to interact with the Sia API

  var Address = Address; //Get the wallet address to search for related transactions
  var WalTrxArr = []; //Create an array to store the list of related transactions

  //Set up the connection options and the API request
  var options = {
    uri: 'localhost',
    port: portval,
    method: 'GET'
    path: '/wallet/transactions/' + Address;
    headers: {
      'User-Agent': 'Sia-Agent',
    }
  }

  //Setup the http request
  function callback(error, response, body) {
    if (!error && response.statusCode == 200) {
      WalTrxArr.push(JSON.parse(body));
      return (WalTrxArr);
    }
  }

  //Initialize the http request
  request(options, callback);
};
//Export the module for the rest of the app
module.exports = SiaWalTrx;
