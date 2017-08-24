//Retreive the details of a specific shared file

var http = require('http');

function getPositionJS(string, subString, index) {
  return string.split(subString, index).join(subString).length;
}

var path = require('path');
var db = require('diskdb');
db = db.connect(path.join(__dirname, '../JDB/'), ['Settings']);
var settings = db.Settings.find({
  SettingsFlag: 1
});
var portval = settings[0].APIPortNumber;

function SiaRenFndFl(SiaFile, callback) {

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
      //console.log('pre mod array: '+RenFls.files.length);
      //console.log('the renfls is :'+JSON.stringify(RenFls));
      for (var i = 0; i < RenFlsFile.files.length; i++) {
        if (RenFlsFile.files[i].siapath === SiaFile) {
          RenFls.push({
            'Siapath': RenFlsFile.files[i].siapath,
            'FileName': RenFlsFile.files[i].siapath.substring(getPositionJS(RenFlsFile.files[i].siapath, "^", 1) + 1, getPositionJS(RenFlsFile.files[i].siapath, "^", 2)),
            'FileExtension': (RenFlsFile.files[i].siapath.substring(RenFlsFile.files[i].siapath.lastIndexOf(".") + 1)).toUpperCase(),
            'Description': RenFlsFile.files[i].siapath.substring(getPositionJS(RenFlsFile.files[i].siapath, "^", 2) + 1, getPositionJS(RenFlsFile.files[i].siapath, "^", 3)),
            'Price': RenFlsFile.files[i].siapath.substring(getPositionJS(RenFlsFile.files[i].siapath, "^", 3) + 1, getPositionJS(RenFlsFile.files[i].siapath, "^", 4)),
            'FileID': RenFlsFile.files[i].siapath.substring(getPositionJS(RenFlsFile.files[i].siapath, "^", 4) + 1, RenFlsFile.files[i].siapath.lastIndexOf(".")),
            'FileSize': RenFlsFile.files[i].filesize
          });
        }
      };
      //console.log(RenFls);
      return callback(RenFls);
    });
  });

};

//Export the module for the rest of the app
exports.SiaRenFndFl = SiaRenFndFl;
