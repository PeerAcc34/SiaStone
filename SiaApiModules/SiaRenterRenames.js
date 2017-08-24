//Rename files for the purpose of sharing/unsharing
var http = require('http');
var path = require('path');
var db = require('diskdb');
db = db.connect(path.join(__dirname, '../JDB/'), ['Settings']);
var settings = db.Settings.find({
  SettingsFlag: 1
});
var portval = settings[0].APIPortNumber;

function SiaRenRnm(oldName, newName, callback) {

  var options = {
    url: 'localhost',
    method: 'POST',
    port: portval,
    path: '/renter/rename/' + oldName + '?newsiapath=' + newName,
    headers: {
      'User-Agent': 'Sia-Agent',
    }
  };

  var req = http.request(options, function(res) {
    console.log('Status: ' + res.statusCode);
    callback(res.statusCode);
    console.log('Headers: ' + JSON.stringify(res.headers));
    res.setEncoding('utf8');
    res.on('data', function(body) {
      console.log('Body: ' + body);
    });
  });
  req.on('error', function(e) {
    console.log('problem with request: ' + e.message);
  });
  // write data to request body
  //req.write('{"string": "Hello, World"}');
  req.end();

};
exports.SiaRenRnm = SiaRenRnm;
