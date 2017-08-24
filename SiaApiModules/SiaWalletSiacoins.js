//SiaWalletSiacoins to send payments to the sharer and developer

var http = require('http');

var path = require('path');
var db = require('diskdb');
db = db.connect(path.join(__dirname, '../JDB/'), ['Settings']);
var settings = db.Settings.find({
  SettingsFlag: 1
});
var portval = settings[0].APIPortNumber;

function SiaWalSias(SellerAddress, Price, callback) {
  //Replace the space in the seed with the space character %20

  var options = {
    url: 'localhost',
    method: 'POST',
    port: portval,
    path: '/wallet/siacoins?amount=' + Price + '&destination=' + SellerAddress,
    headers: {
      'User-Agent': 'Sia-Agent',
    }
  };

  var req = http.request(options, function(res) {
    console.log('Status: ' + res.statusCode);
    console.log('Headers: ' + JSON.stringify(res.headers));
    res.setEncoding('utf8');
    res.on('data', function(body) {
      console.log('Body: ' + body);
      callback(res.statusCode + ' ' + JSON.stringify(body));
    });
  });
  req.on('error', function(e) {
    console.log('problem with request: ' + e.message);
  });

  req.end();

};
exports.SiaWalSias = SiaWalSias;

