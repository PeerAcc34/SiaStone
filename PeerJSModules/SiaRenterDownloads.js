//Check on the download status of a file from the Sia network
var http = require('http');

var path = require('path');
var db = require('diskdb');
db = db.connect(path.join(__dirname, '../JDB/'), ['Settings']);
var settings = db.Settings.find({
  SettingsFlag: 1
});
var portval = settings[0].APIPortNumber;

SiaRenDnlds = function(callback) {

  var RenDnlArr = [];
  http.get({
    url: 'localhost',
    port: portval,
    path: '/renter/downloads',
    headers: {
      'User-Agent': 'Sia-Agent',
    }
  }, function(response) {
    // Continuously update stream with data

    response.on('data', function(d) {
      RenDnlArr.push(d);
    });
    response.on('end', function() {

      var DnArr = [];
      DnArr.push(JSON.parse(RenDnlArr));
      return callback(DnArr);
    });
  });
};

//Export the module for the rest of the app
exports.SiaRenDnlds = SiaRenDnlds;

// SiaRenDnlds(function(value){
//   for(var i = 0; i<value[0].downloads.length;i++){
//     if(value[0].downloads[i].siapath==){
//       if(value[0].downloads[i].received!=value[0].downloads[i].filesize){
//           console.log('return out '+parseFloat(Math.round((value[0].downloads[i].received/value[0].downloads[i].filesize) * 100) / 100).toFixed(2)*100);
//       }
//     }
//   };
// });
