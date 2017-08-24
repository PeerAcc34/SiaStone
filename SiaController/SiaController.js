var express = require('express');
var app = express();

var bodyParser = require('body-parser');
app.use(bodyParser.json());
var urlencodedParser = bodyParser.urlencoded({
  extended: false
});

var waitUntil = require('wait-until');
var path = require('path');

//Connect to JSON table used to record settings and file transfers
var db = require('diskdb');
db = db.connect(path.join(__dirname, '../JDB/'), ['PremiumTransfers', 'Settings', 'PeerJsSwitch', 'RSA','PurchaseIDs','PendingPurchases']);

var crypto2 = require('crypto2');

var NodeRSA = require('node-rsa');


//FileSystem module
var fs = require('fs');

//Call the SiaWalletAddresses to list addresses
var SiaWalAdrsFn = require('../SiaApiModules/SiaWalletAddresses');
var SiaWalAdrs = SiaWalAdrsFn.SiaWalAdrs;

//Call the SiaWalletAddress to generate a new address
var SiaWalAdrFn = require('../SiaApiModules/SiaWalletAddress');
var SiaWalAdr = SiaWalAdrFn.SiaWalAdr;

//Call the SiaRenterFiles to get list of files
var SiaRenFlsFn = require('../SiaApiModules/SiaRenterFiles');
var SiaRenFls = SiaRenFlsFn.SiaRenFls;

//Call the SiaRenterRename to rename chosen files (used to share/unshare files)
var SiaRenRnmFn = require('../SiaApiModules/SiaRenterRenames');
var SiaRenRnm = SiaRenRnmFn.SiaRenRnm;

//Call the SiaWalletSiacoins module to make payments
var SiaWalSiasFn = require('../SiaApiModules/SiaWalletSiacoins');
var SiaWalSias = SiaWalSiasFn.SiaWalSias;

module.exports = function(app) {


//Get values used to view files of another Sia user via PeerJS
  app.post('/getExploreID', urlencodedParser, function(req, res) {

    var requestedPeer = req.body.rid; //The SharerID of the Sia user whose files you want to see
    var publicKey = req.body.pkey.replace("\\n", ""); //The public key of the Sia user, used to verify the identity of the Sia user
    var randMSG = req.body.random; //The message to be encrypted with the Sia users public key. If the Sia user can decrypt with their private key, this confirms their identity
	
	console.log(publicKey);

    var PassShareSettings = db.Settings.find({
      SettingsFlag: 1
    });
    var PassExploreIDSetting = PassShareSettings[0].ExploreIDSetting;

    var Purchases = db.PurchaseIDs.findOne({
      SharerID: requestedPeer
    });

	var PurchaseID
	if(Purchases==null){
	PurchaseID = '';
	}
	else{
    PurchaseID = Purchases.PurchaseID;
	};
	
	console.log('the purchase id is: '+PurchaseID);

    var key = new NodeRSA();
    key.importKey(publicKey, 'pkcs8-public-pem');
	
	    var encrypted = key.encrypt(randMSG, 'base64');
    console.log('encrypted: ', encrypted);
	
	        // try {
	// //Generate encrypted message
    // var encrypted = key.encrypt(randMSG, 'base64');
    // console.log('encrypted: ', encrypted);
            // var err = new Error('Encryption Error')
            // throw err
        // } catch (err) {
            // // handle the error safely
            // var encrypted = 'Encryption Error';
            // console.log(err)
        // }



    var ArgPassExploreIDSetting = [PassExploreIDSetting, PurchaseID, encrypted];
    res.json(ArgPassExploreIDSetting);

  });
  
  //Store the PurchaseID
  //The next time an Explorer visits a Sharer, this PurchaseID will be provided
  //Since only the real Explorer would have this PurchaseID, any attempt by others to impersonate the Explorer to download purchased files will be thwarted
  //because the Sharer will check the Explorer against the PurchasedIDs table to verify purchases
   app.post('/savePurchaseID', urlencodedParser, function(req, res) {
	   
	       var sharerid = req.body.sharer;
		   var purchaseid = req.body.purchaseid;
		   var explorerid = req.body.explorer;
		   
		   db.PurchaseIDs.save({
			   
			   SharerID: sharerid,
			   ExplorerID: explorerid,
			   PurchaseID: purchaseid
			   
		   });
		   
		   res.json(1);
	   
   });

   //Send the payment for a file
  app.post('/sendPayment', urlencodedParser, function(req, res) {

    var Price = req.body.price + '000000000000000000000000'; //convert to hastings (1SC = 10^24 hastings)
    console.log('the string price is: ' + Price);
    var PurchaseAddress = req.body.purchaseaddress;
    var FileID = req.body.fileid;
    var SharerID = req.body.sharer;
    var ExplorerID = req.body.explorer;

    function handlePayment(results) {
      function handleDevPayment(DevResult) {

        if (parseInt(DevResult.substring(0, 3)) >= 200 && parseInt(DevResult.substring(0, 3)) <= 210) {
          db.PremiumTransfers.save({
            TransactionDate: Date.now(),
            TransactionType: "Purchase",
            SharerID: SharerID,
            ExplorerID: ExplorerID,
            FileID: FileID,
            Price: Price,
            PurchaseAddress: PurchaseAddress
          });
          console.log('all payments successful');
          res.json(1);
        } else {
          res.json('Error after pay dev 2' + DevResult);
        }

      };

      //If the Sharer has been successfully paid, move to run the developer fee

      if (parseInt(results.substring(0, 3)) >= 200 && parseInt(results.substring(0, 3)) <= 210) {
        console.log(results);
		//Developer fee transactions, with developer address and 2 siacoin (written in hastings)
        SiaWalSias("53313408818c3374968f6fa38917eb166b3d59c9b59d92167643541544235e25cbc2086ed56e", "2000000000000000000000000", function(results) {
          handleDevPayment(results);
        });
      } else {
        console.log('Error after pay sharer 1')
        res.json('Error after pay sharer 1' + results);
      }

    };
	//Pay the Sharer for the file
    SiaWalSias(PurchaseAddress, Price, function(results) {
      handlePayment(results);
    });

  });

  //This section is used to share/unshare files using the Sia API rename call
  app.post('/SiaRenterFiles', urlencodedParser, function(req, res) {
    console.log('sharetype is: ' + req.body.ShareType);
    console.log('filename is: ' + req.body.FileName);
	
    if (req.body.ShareType === 'Share') {

      console.log('share triggered');
      console.log('the siapath is: ' + req.body.SiaFilePath);

      function getAdrID(callback) {
        SiaWalAdr(callback);
      }

      getAdrID(function(value) {


        function handleRename(results) {

          var SiaFiles = [];
          if (results === 204) {
            console.log('Rename Success');
            SiaRenFls(function(RenFls) {
              SiaFiles.push(RenFls);

              res.render('SiaRenterFiles', {
                SiaFiles: RenFls
              });
            });
          } else {
            console.log('Rename Fail');
          }
        };

		//Shared files have the prefix SiaStoneFile
		//Create a new file name based on original file name, description, price and file id, separated by ^
        var NewSiaFilePath = 'SiaStoneFile^' + req.body.FileName.replace(/ /g, '%20') + '^' + req.body.FileDescription.replace(/ /g, '%20') + '^' + req.body.FilePrice + '^' + value + '.' + req.body.FileExtension;
        var OldSiaFilePath = req.body.SiaFilePath.replace(/ /g, '%20');

        SiaRenRnm(OldSiaFilePath, NewSiaFilePath, function(results) {
          handleRename(results);
        });
      });
    } else {

      function handleRename(results) {

        var SiaFiles = [];
        if (results === 204) {
          console.log('Rename Success');
          SiaRenFls(function(RenFls) {
            SiaFiles.push(RenFls);

            res.render('SiaRenterFiles', {
              SiaFiles: RenFls
            });
          });
        } else {
          console.log('Rename Fail');
        }
      };
	
		//Unshare a file - reverting back to the original file name and its extension
      var NewSiaFilePath = req.body.FileName.replace(/ /g, '%20') + '.' + req.body.FileExtension;
      var OldSiaFilePath = req.body.SiaFilePath.replace(/ /g, '%20');

      SiaRenRnm(OldSiaFilePath, NewSiaFilePath, function(results) {
        handleRename(results);
      });
    };

  });

  //Get the list of premium file transactions
  app.get('/SiaFileTransactions', function(req, res) {
    var FileTransactions = db.PremiumTransfers.find();
    res.render('SiaFileTransactions', {
      PremiumTransfers: FileTransactions
    });
  });

  
  //Display the Explorer/Sharer IDs, as well as PeerJS connection settings and the public/private keys
  app.get('/', function(req, res) {

    var Addresses = [];
	
	var pubKey;
	var privKey;
	
	     var RSAKeys = db.RSA.find({
        SettingsFlag: 1
      });
	//Get public/private keys if they exists, else ''
	if(db.RSA.count()>0){
		pubKey= RSAKeys[0].publicKey.replace("\\n", "");
		privKey = RSAKeys[0].privateKey.replace("\\n", "");
	}
	else{
		pubKey= '';
		privKey = '';
	};
		
	//Get Sharer ID and Explorer ID, as well as PeerJS connection settings
    if (db.Settings.count() > 0) {

      var PassShareSettings = db.Settings.find({
        SettingsFlag: 1
      });
      var PassShareIDSetting = PassShareSettings[0].ShareIDSetting;
      var PassExploreIDSetting = PassShareSettings[0].ExploreIDSetting;
      var PassMaxBufferSetting = PassShareSettings[0].MaxBufferSetting;
      var PassMaxPeerSetting = PassShareSettings[0].MaxPeerSetting;
	  var PassHost = PassShareSettings[0].Host;
	  var PassPort = PassShareSettings[0].Port;
	  var PassPath = PassShareSettings[0].Path;
	  var PassAPIPort = PassShareSettings[0].APIPortNumber;
	  var PassPeerJSKey = PassShareSettings[0].PeerJSKey;
	  
      SiaWalAdrs(function(AdrsVer) {
        Addresses.push(AdrsVer);
        res.render('PeerSettings', {
          Addresses: AdrsVer,
          Settings: {
            ShareID: PassShareIDSetting,
            ExploreIDSetting: PassExploreIDSetting,
            MaxBufferSetting: PassMaxBufferSetting,
            MaxPeerSetting: PassMaxPeerSetting,
			APIPortNumber: PassAPIPort,
			Host: PassHost,
			Port: PassPort,
			Path: PassPath,
			PeerJSKey: PassPeerJSKey,
			PublicKey: pubKey,
			PrivateKey: privKey
          }
        });
      });
    } else {
      SiaWalAdrs(function(AdrsVer) {
        Addresses.push(AdrsVer);
        res.render('PeerSettings', {
          Addresses: AdrsVer,
          Settings: {
            ShareID: '',
            ExploreIDSetting: '',
            MaxBufferSetting: '',
            MaxPeerSetting: '',
			APIPortNumber: '',
			Host: '',
			Port: '',
			Path: '',
			PeerJSKey: '',
			PublicKey: pubKey,
			PrivateKey: privKey
          }
        });
      });
    }


  });

  //Change settings
  app.post('/SiaStoneSettings', urlencodedParser, function(req, res) {

    var Addresses = [];
	
	  var sharer = req.body.sharer;
	  var explorer = req.body.explorer;
	  var maxbuffers = req.body.maxbuffers;
	  var maxpeers = req.body.maxpeers;
	  var peerjskey = req.body.peerjskey;
	  var APIPortNumber = req.body.APIPortNumber;
	  var host = req.body.host;
	  var port = req.body.port;
	  var path = req.body.path;
	  

    //If there is already a settings record, delete the old one and replace with a new one
    if (db.Settings.count() > 0) {
      db.Settings.remove({
        SettingsFlag: 1
      }, true)};
	  
      db.Settings.save({
        ShareIDSetting: sharer,
        ExploreIDSetting: explorer,
        MaxBufferSetting: maxbuffers,
        MaxPeerSetting: maxpeers,
		Host: host,
		Port: port,
		Path: path,
		PeerJSKey: peerjskey,
		APIPortNumber: APIPortNumber,
        SettingsFlag: 1
      });
    
	res.json(1);

  });

    //Generate new public and private keys
  app.post('/GenRsaKeys', urlencodedParser, function(req, res) {
	  	
	    RSAKeys = db.RSA.remove({
        SettingsFlag: 1
      });
		  
	  
	  crypto2.createKeyPair((err, privateKey, publicKey) => {
			db.RSA.save({
				publicKey: publicKey,
				privateKey: privateKey,
				SettingsFlag: 1
			});
			res.json(1);
});
	  
	 
  });
  

  //Retreive the variables ready to setup a WebRTC connection to another Sia user
  app.get('/SiaExplore', function(req, res) {

    var PassShareSettings = db.Settings.find({
      SettingsFlag: 1
    });
    var PassExploreIDSetting = PassShareSettings[0].ExploreIDSetting;
	var PassHost = PassShareSettings[0].Host;
	var PassPort = PassShareSettings[0].Port;
	var PassPath = PassShareSettings[0].Path;
	var PassPeerJSKey = PassShareSettings[0].PeerJSKey;
	
    res.render('SiaExplore', {
      ExploreID: PassExploreIDSetting,
	  PeerJSKey: PassPeerJSKey,
	  Host: PassHost,
	  Port: PassPort,
	  Path: PassPath
    });

  });

  //About/Help page
  app.get('/SiaAboutHelp', function(req, res) {
    res.render('SiaAboutHelp');
  });

  //View your Sia files
  app.get('/SiaRenterFiles', function(req, res) {

    SiaRenFls(function(RenFls) {
      res.render('SiaRenterFiles', {
        SiaFiles: RenFls
      });
    });
  });

 
  //Start PeerJS in Node, allowing other Sia users to view your files using your Sharer ID and public key
  var fork; //Create variable to trigger PeerJS
  var child; //Create variable to trigger PeerJS
  //app.post('/PeerJsStart', urlencodedParser,function(req,res){
  app.post('/SiaExploreShare', urlencodedParser, function(req, res) {

  //Start PeerJS for Node
    if (req.body.ShareStatus === 'Enable') {
      db.PeerJsSwitch.remove({
        SwitchFlag: 1
      })

      var PassShareSettings = db.Settings.find({
        SettingsFlag: 1
      });

      fork = require('child_process').fork;
      child = fork(path.join(__dirname, '../PeerJS.js'));

      db.PeerJsSwitch.save({
        Switch: 'Enable',
        SwitchFlag: 1
      });
      res.render('SiaExploreShare', {
        PeerFlag: 'Disable'
      });
    }
	//End PeerJS for Node
    if (req.body.ShareStatus === 'Disable') {

      child.kill('SIGINT');
      db.PeerJsSwitch.remove({
        SwitchFlag: 1
      })
      db.PeerJsSwitch.save({
        Switch: 'Disable',
        SwitchFlag: 1
      });
      res.render('SiaExploreShare', {
        PeerFlag: 'Enable'
      });
      console.log('The process is ended');
    }


  });
//View if PeerJS for Node is currently enabled or disabled
  app.get('/SiaExploreShare', function(req, res) {

    if (db.PeerJsSwitch.count() > 0) {
      var switchArr = db.PeerJsSwitch.find();
      var switchArrFlag = switchArr[0].Switch;

      if (switchArrFlag === 'Disable') {
        res.render('SiaExploreShare', {
          PeerFlag: 'Enable'
        });
      } else {
        res.render('SiaExploreShare', {
          PeerFlag: 'Disable'
        });
      }
    }
    //if this is the first time to use app, set up the switch file
    else {
      db.PeerJsSwitch.save({
        Switch: 'Disable',
        SwitchFlag: 1
      });
      res.render('SiaExploreShare', {
        PeerFlag: 'Enable'
      });
    }

  });



};
