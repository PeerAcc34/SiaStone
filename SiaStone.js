var express = require('express');
var app = express();
var path = require('path');

var db = require('diskdb');
db = db.connect(path.join(__dirname, './JDB/'), ['PremiumTransfers','Settings','PeerJsSwitch']);

db.PeerJsSwitch.remove({SwitchFlag: 1})
db.PeerJsSwitch.save({Switch: 'Disable', SwitchFlag: 1});

var SiaController = require('./SiaController/SiaController');

app.set('view engine','ejs');
app.use('/public',express.static('public'));


SiaController(app);

app.listen(3000);
console.log('Listening on port 3000');
