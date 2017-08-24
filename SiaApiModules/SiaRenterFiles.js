//The purpose of this module is to retreive a list of Sia files

var http = require('http');
var path = require('path');
var db = require('diskdb');
db = db.connect(path.join(__dirname, '../JDB/'), ['Settings']);
var settings = db.Settings.find({
  SettingsFlag: 1
});
var portval = settings[0].APIPortNumber;


SiaRenFls = function(callback) {

  http.get({
    url: 'localhost',
    port: portval,
    path: '/renter/files',
    headers: {
      'User-Agent': 'Sia-Agent',
    }
  }, function(response) {
    // Continuously update stream with data
    var RenFlsArr = [];
    response.on('data', function(d) {
      RenFlsArr.push(d);
    });
    response.on('end', function() {

      var RenFlsFile = JSON.parse(RenFlsArr);
      var RenFls = [];

      for (var i = 0; i < RenFlsFile.files.length; i++) {
 
        RenFls.push(RenFlsFile.files[i]);

      };
      return callback(RenFls);
    });
  });

};

//Export the module for the rest of the app
exports.SiaRenFls = SiaRenFls;
