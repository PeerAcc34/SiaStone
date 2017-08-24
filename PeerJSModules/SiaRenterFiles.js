//Get the list of file being shared
var http = require('http');

//Setup connection to the settings DB to get API port number
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
		  //Push shared files into an array that will be returned by the functions
        if (RenFlsFile.files[i].siapath.substring(0, 12) === 'SiaStoneFile') {

          RenFls.push(RenFlsFile.files[i]);

        }
      };

      return callback(RenFls);
    });
  });

};

//Export the module for the rest of the app
exports.SiaRenFls = SiaRenFls;
