//The following modules are required to allow PeerJS to run in Node
//PeerJS Compatible Start---
window = global;
window.BlobBuilder = require("BlobBuilder");
location = {
  protocol: 'http'
};

BinaryPack = require("binary-pack");
XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

var wrtc = require('electron-webrtc')();
RTCPeerConnection = wrtc.RTCPeerConnection;
RTCSessionDescription = wrtc.RTCSessionDescription;
RTCIceCandidate = wrtc.RTCIceCandidate;
WebSocket=require('ws')

require('./node_modules/peer/lib/exports.js');
//PeerJS Compatible End---

//fs to interact with file system
var fs = require('fs');
//path to resolve directories
var path = require('path');
var http = require('http');

//nodersa to decrypt verification messages that are encrypted with the associated public key
var NodeRSA = require('node-rsa');

//used to wait until a file has been downloaded from the Sia network before transferring to Explorer via PeerJS
var waitUntil = require('wait-until');

//Call the SiaRenterFiles to get list of files being shared
var SiaRenFlsFn = require('./PeerJSModules/SiaRenterFiles');
var SiaRenFls = SiaRenFlsFn.SiaRenFls;

//Call the DiskDB module to read/write values to the JSON database
var db = require('diskdb');
db = db.connect(path.join(__dirname, './JDB/'), ['PremiumTransfers', 'PeerJsSwitch', 'PendingPurchases', 'PurchaseIDs', 'RSA', 'Settings']);

//Call the SiaWalletAddress module to generate payment address
var SiaWalAdrFn = require('./PeerJSModules/SiaWalletAddress');
var SiaWalAdr = SiaWalAdrFn.SiaWalAdr;

//Call the SiaWalletTransactions to check if a payment has been made to a payment address
var SiaWalTrxFn = require('./PeerJSModules/SiaWalletTransactions');
var SiaWalTrx = SiaWalTrxFn.SiaWalTrx;

//Call the SiaRenterDownload module to delete file
var SiaRenDnlFn = require('./PeerJSModules/SiaRenterDownload');
var SiaRenDnl = SiaRenDnlFn.SiaRenDnl;

//Check the download rate of a file from the Sia network
var SiaRenDnldsFn = require('./PeerJSModules/SiaRenterDownloads');
var SiaRenDnlds = SiaRenDnldsFn.SiaRenDnlds;

//Call the module that checks if an Explorer has previously purchased a file
var RtdVerifyPurchaseFn = require('./PeerJSModules/SiaExplorerRenterFiles');
var RtdVerifyPurchase = RtdVerifyPurchaseFn.RtdVerifyPurchase;

//Call the module to determine if an Explorer is allowed to downloaded a file
var SiaRenFndFlFn = require('./PeerJSModules/SiaRenterFindFile');
var SiaRenFndFl = SiaRenFndFlFn.SiaRenFndFl;

//A module with can read in files as array buffers
var FileReader = require('filereader');
var fapi = require('file-api');
var File = fapi.File;

//A function that forces a pause between sending chunks of the array buffer of the imported file to the Explorer
function wait(ms) {
  var start = new Date().getTime();
  var end = start;
  while (end < start + ms) {
    end = new Date().getTime();
  }
}

//Checks if a file requested by the Explorer has already been downloaded from the Sia network. If so, no need to redownload it from the Sia network.
function checkFileExists(x) {
  if (fs.existsSync(x)) {
    return true;
  } else {
    return false;
  }
};

//Create an array which tracks the files being requested by the Explorer, including the download permission status for a given Explorer
var SiaFilesArray = [];
var peerId;

//Declare variables to start PeerJS
var SharerID;
var MaxBuffer;
var MaxPeer;
var Key;
var PassShareSettings;
var STUNURL;
var STUNPORT;
var STUNPATH;

//Retreive settings variables
if (db.Settings.count() > 0) {

  PassShareSettings = db.Settings.find({
    SettingsFlag: 1
  });

  SharerID = PassShareSettings[0].ShareIDSetting; //The ID that Explorer use to find you
  MaxBuffer = parseInt(PassShareSettings[0].MaxBufferSetting) * 1000000000; //Retreive size limit on the files being read into node to minimize overload on computer
  MaxPeer = parseInt(PassShareSettings[0].MaxPeerSetting); //Retreive the maximum of peers allowed to connect to you at the same time
  Key = PassShareSettings[0].PeerJSKey; //Retrieve key to access PeerJSs cloud STUN server
  STUNURL = PassShareSettings[0].Host; //STUN server URL
  STUNPORT = PassShareSettings[0].Port; //STUN server port
  STUNPATH = PassShareSettings[0].Path; //STUN server path
};

//Initialize the private key to decrypt verfication confirmation messages
var PassRSAKeysSettings = db.RSA.find({
  SettingsFlag: 1
});
var PrivateKey = PassRSAKeysSettings[0].privateKey.replace("\\n", "");

var connectedPeers = []; //an array to list the peers connected
var totalBufferSize = []; //an array to list the size of the files being transferred. Compared against MaxBuffer to ensure overload doesn't occur
totalBufferSize.push({
  Peer: 'Dummy',
  BufferSize: 0
});

//Load the private key
//This will be used to decrypt messages from Explorers
//Being able to decrypt the Explorer's message gives the Explorer confidence
//that they are seeing the actual Sharer and not an imposter
var PrivateKeyFmt = new NodeRSA();
PrivateKeyFmt.importKey(PrivateKey, 'pkcs1-private-pem');

//Start connection to PeerJS STUN server
var peer = new Peer(SharerID, {
  key: Key,
  host: STUNURL,
  port: STUNPORT,
  path: STUNPATH
});

peer.on('open', function(id) {
  peerId = id;
  console.log('Connected to STUN server');

});

// Await connections from others
peer.on('connection', connect);

//Log connection errors
peer.on('error', function(err) {
  console.log(err);
})

// Handle a connection object.
function connect(c) {
console.log('Explorer: '+c.peer+' with label: '+c.label+' has connected');
  //If there are already the maximum number of peers allowed connected to the Sharer, close any new incoming connections
 if (connectedPeers.length >= MaxPeer) {
   c.send('FESorry. The maximum number of peers connected to the Sharer has reached the maximum. Please try again later!');
    c.close()
  }
  else {
console.log('else is triggered');

    c.on('open', function() {

      console.log('open triggered');

	//Send a list of shared files to the Explorer, as well as the the download/purchase permissions (i.e. FREEFILE, FILENOTPURCHASED, FILEPURCHASED)
      if (c.label === 'FileList') {
        console.log('Explorer: ' + c.peer + ' has connected to you and is retreiving your shared files list');

        //Decrypt the Explorers message and send it back to them
        //This will assure the Explorer that they have connected to the true Sharer

        var decrypted = PrivateKeyFmt.decrypt(c.metadata.enc, 'utf8');
        var err = new Error('Decryption Error')

        // try {
        //     // the synchronous code that we want to catch thrown errors on
        //     var decrypted = PrivateKeyFmt.decrypt(c.metadata.enc, 'utf8');
        //     var err = new Error('Decryption Error')
        //     throw err
        // } catch (err) {
        //     // handle the error safely
        //     var decrypted = 'Decryption Error';
        //     console.log(err)
        // }

        SiaRenFls(function(RenFls) {
          //Verify the purchase status of the files for the client
          RtdVerifyPurchase(RenFls, c.peer, c.metadata.pid, decrypted, function(FileListArr) {
            //Send the list of files along with the download/purchase permissions for a given Explorer (i.e. FREEFILE, FILENOTPURCHASED, FILEPURCHASED)
            SiaFilesArray.push([c.peer, {
              FileListArr
            }]);
            console.log(JSON.stringify(SiaFilesArray));
            c.send(JSON.stringify(FileListArr));
            c.close();
          });
        });
      }
	  //Generate a pending transaction, including a purchase address, when an Explorer wishes
      if (c.label === 'Purchase') {

        //Purge any pending transactions that were not completed
        db.PendingPurchases.remove({
          Explorer: c.peer
        });


        console.log('Purchase connection made from Explorer ' + c.peer +' and requesting file '+c.metadata.siapath);

		//Get the price of the file requested
        function getFilePrice(fileprice) {
          console.log(fileprice[0].Price);

          //Define the function to call for a new Sia address for payment
          function getAdrID(callback) {
            SiaWalAdr(callback);
          };

          //Generate a new payment address and send to the client
          getAdrID(function(value) {
            var purchaseAddress = value;
            console.log('the puchase address for this transaction is: ' + purchaseAddress);
            //Save pending transaction to JSON DB. It will be removed once payment is made
            var savPending = db.PendingPurchases.save({
              TransactionDate: Date.now(),
              PurchaseAddress: purchaseAddress,
              Explorer: c.peer,
              FileID: fileprice[0].FileID,
              Price: fileprice[0].Price //convert to hastings (1SC = 10^24 hastings)
            });
			//Send the Explorer the address to make the purchase
            c.send('PA' + purchaseAddress);
            c.close();
          });
        };

        SiaRenFndFl(c.metadata.siapath, function(results) {
          getFilePrice(results);
        })
      };

		//Check if the Explorer has completed the payment for the pending purchase
      if (c.label == 'Payment') {

		  if(c.metadata.msg=='PF'){


			  console.log('The Explorer did not successfully complete the transaction');
			  c.close();
		  }

	  else{
        console.log('Payment message: ' + c.metadata.msg)
        var ExplorerID = c.peer;
        var FileID = c.metadata.fileid;

        var Purchase = db.PendingPurchases.find({
          Explorer: ExplorerID,
          FileID: FileID
        });

		//Get the price and the purchase address
		//We need to check that the purchase address received the amount equal to the file price
        var FilePrice = Purchase[0].Price;
        var PurchaseAddress = Purchase[0].PurchaseAddress;
        console.log('the tx address is: ' + PurchaseAddress);


        console.log('start 20 second countdown');

        if (c.metadata.msg == 'Payment Success') {
			//set a 20 second delay to allow for the payment transaction to be processed
          setTimeout(function() {
            SiaWalTrx(PurchaseAddress, function(WalTrxArr) {

				//search for unconfirmed transactions on the purchase address
              if (JSON.stringify(WalTrxArr.unconfirmedtransactions) != null) {
                var ValueSum = 0;
                for (var k = 0; k < WalTrxArr.unconfirmedtransactions.length; k++) {
                  for (var l = 0; l < WalTrxArr.unconfirmedtransactions[k].outputs.length; l++) {
                    if (WalTrxArr.unconfirmedtransactions[k].outputs[l].fundtype == 'siacoin output') {
                      ValueSum += parseInt(WalTrxArr.unconfirmedtransactions[k].outputs[l].value);
                    };
                  };
                };

                console.log('the ValueSum is: ' + ValueSum);
                console.log('the FilePrice adding 0s and parse int is: ' + (FilePrice*1000000000000000000000000));

                // console.log('the ValueSum is: ' + parseInt(ValueSum+'000000000000000000000000'));
                // console.log('the FilePrice adding 0s and parse int is: ' + parseInt(FilePrice));
				//If the price amount (or greater) has been sent to the purchase address
				//record the address in the Premium Transers table
                // if (parseInt(ValueSum+'000000000000000000000000') >= parseInt(FilePrice)) {
                if (ValueSum >= (FilePrice*1000000000000000000000000)) {

                  db.PremiumTransfers.save({
                    TransactionDate: Date.now(),
                    TransactionType: "Sale",
                    ExplorerID: c.peer,
                    SharerID: SharerID,
                    FileID: FileID,
                    Price: FilePrice,
                    PurchaseAddress: PurchaseAddress
                  });


				  //Remove from pending transaction
                  db.PendingPurchases.remove({
                    Explorer: c.peer,
                    FileID: FileID
                  });

				//Send a PurchaseID confirmation
				//This is a secret code (i.e. a generated address) that only the Sharer and the Explorer know
				//Therefore, the next time the Explorer returns to the same Sharer, the Explorer will share it with the Sharer, assuring the Sharer is genuine
				//This minimizes instances of someone impersonating the Explorer to download files that the original Explorer purchased
				SiaWalAdr(function(PurchaseID){

				db.PurchaseIDs.save({

			   SharerID: SharerID,
			   ExplorerID: c.peer,
			   PurchaseID: PurchaseID

					});


                  c.send('PYSC'+PurchaseID);
                  c.close();
				})
                } else {
                  //Remove from pending and send failure message
                  db.PendingPurchases.remove({
                    Explorer: c.peer,
                    FileID: FileID
                  });

                  c.send('PYER');
                  c.close();
                };
              } else {
                console.log('The Explorer did not successfully send the payment within 20 seconds');
                c.close();
              }
            });
          }, 20000);
        } else {
          console.log('The Explorer did not successfully send the payment');
          c.close();
        };
	  };
      };

    });

    c.on('data', function(data) {

      console.log('The connection label: ' + c.label);

      var decrypted = PrivateKeyFmt.decrypt(c.metadata.enc, 'utf8');
      var err = new Error('Decryption Error')

      // try {
      //     // the synchronous code that we want to catch thrown errors on
      //     var decrypted = PrivateKeyFmt.decrypt(c.metadata.enc, 'utf8');
      //     var err = new Error('Decryption Error')
      //     throw err
      // } catch (err) {
      //     // handle the error safely
      //     var decrypted = 'Decryption Error';
      //     console.log(err)
      // }

            if (c.label === 'Download') {



              console.log('Incoming data and download triggered');
              console.log(c.metadata.fileid);
              console.log('the purchase id from meta is: ' + c.metadata.pid);
              var FileRequested = data;
              var FileRequestedPeer = data+c.peer; //when downloading the file,
              //mark it for the requesting Explorer by adding ther ExplorerID to the download

              console.log('file requested is: '+FileRequested);

              SiaRenFls(function(RenFls) {
                //Verify the purchase status of the files for the Explorer
                RtdVerifyPurchase(RenFls, c.peer, c.metadata.pid, decrypted, function(FileListArr) {

                  var FilePresentFlag;

                  for (var i = 0; i < JSON.parse(JSON.stringify(FileListArr)).length - 1; i++) {
                    if (JSON.parse(JSON.stringify(FileListArr))[i].Siapath.replace(/ /g,'') == FileRequested.replace(/ /g,'')) {
                      FilePresentFlag = 'Y';
                      if (JSON.parse(JSON.stringify(FileListArr))[i].PurchaseStatus !== 'FILENOTPURCHASED') {
                        var DwnldCheck; //Create a variable to determine if file downloaded
                        //A function to handle the download callback
                        function handleDownload(results) {
                          if (results === 'downloaded') {
                            console.log('sia download function complete and set true');
                            DwnldCheck = true;
                          } else {
                            DwnldCheck = false;
                          }
                        };

                        //If requested file is already in local directory, no download needed
                        if (checkFileExists(path.join(__dirname, './SiaDownloads/' + FileRequestedPeer)) === true) {
                          console.log('already downloaded. No download needed');
                          DwnldCheck = true;
                        }
                        //Else we need to retreive file from Sia network
                        else {

                          SiaRenDnl(FileRequested, FileRequestedPeer, function(results) {
                            console.log('run file download from sia');
                            handleDownload(results);
                          });

                        }

                        console.log('the directory for the file is: ' + path.join(__dirname, './SiaDownloads/' + FileRequestedPeer));
                        console.log('before connection, check if ok: ' + path.join(__dirname, './SiaDownloads/' + FileRequestedPeer));

                        //Check that the file has downloaded from the Sia network before sending to peer
                        waitUntil()
                          //Wait upto 30 mins for the file to download, checking for the file every 10 seconds
                          .interval(10000) //check every 10 seconds
                          .times(1800) //check a maximum of 1800 times
                          .condition(function() {
                            //return (checkFileExists(__dirname + '\\SiaDownloads\\'+FileRequested) ? true : false);

                            //Check on the file download status from Sia
                            //and send update to Explorer
                            console.log('10 seconds check');
                            console.log('The Dnld Check Is '+DwnldCheck);
                            if(DwnldCheck==null){
                            SiaRenDnlds(function(value){
                              for(var i = 0; i<value[0].downloads.length;i++){
                                  if(value[0].downloads[i].destination.substring(value[0].downloads[i].destination.lastIndexOf('/')+1, value[0].downloads[i].destination.length)==FileRequestedPeer){
                                    console.log('send 10 seconds update');
                                      c.send('DNUP'+(parseFloat(Math.round((value[0].downloads[i].received/value[0].downloads[i].filesize) * 100) / 100).toFixed(2)*100).toString());
                                  }
                              };
                            });
                          };

                            return (DwnldCheck ? true : false);
                          })
                          .done(function(result) {
                            console.log('Done is triggered');
                            //The file has successfully downloaded
                            fileReader = new FileReader();
                            if (result === true) {
                              console.log('true triggered');


var bufSize = 0;
for(var z = 0; z < totalBufferSize.length; z++){
	bufSize+=totalBufferSize[z].BufferSize;
};
console.log('bufsize is: '+bufSize);
if(bufSize<MaxBuffer)

{

//
var stats = fs.statSync(path.join(__dirname, './SiaDownloads/' + FileRequestedPeer));
var fileLength = stats.size;

//Save the file size that the Explorer is downloading
totalBufferSize.push({Peer: c.peer, BufferSize:fileLength});

            var rs = fs.createReadStream(path.join(__dirname, './SiaDownloads/' + FileRequestedPeer));
            c.send('FL' + fileLength.toString());


            rs.on('data',function(chunk){

            c.send(chunk);
            wait(50);
            console.log(chunk);
            //console.log(chunk.constructor);
            //console.log(chunk.byteLength);
            console.log(typeof chunk);

            });
          }
          else{
            console.log('Too many files being served.');
            c.send('FESO');
            c.close();
          }

            // rs.on('end',function(){
            //
            //   c.close();
            // });


//
// var rss = fs.readFileSync(path.join(__dirname, './SiaDownloads/' + FileRequested));
// var stats = fs.statSync(path.join(__dirname, './SiaDownloads/' + FileRequested));
// var fileLength = stats.size;
//
//   var chunkSize; //this is the size that determine amount of data sent
//
//   //if the file size is small, set a small chunk size
//   if (fileLength <= 1024) {
//     chunkSize = 1024;
//   } else {
//     chunkSize = 64 * 1024;
//   }
//
//         console.log('chunksize is: ' + chunkSize);
//         var remainder = fileLength % chunkSize;
//         //send the length to prepare client to receive file
//         //c.send([{MSGType:'BUFLEN', MSG: fileLength}]);
//         console.log('FL' + fileLength.toString());
//         c.send('FL' + fileLength.toString());
//
//         //i. send the majority of the data via the for loop
//         for (var i = 0; i <= fileLength - remainder; i += chunkSize) {
//           console.log(rss.slice(i, i + chunkSize));
//           c.send(rss.slice(i, i + chunkSize));
//           wait(75);
//         }
//         //ii. then send the final chunkSize
//         c.send(rss.slice(fileLength - remainder, fileLength));
//         console.log('sending final part data');
//         rss = [];
//         c.close();






                    //           fileReader.readAsArrayBuffer(new File(path.join(__dirname, './SiaDownloads/' + FileRequested)));
                    //
                    //           //Send the file in chunks
                    //           //Tested file ~150MB and it sent successfully
                    //           fileReader.on('loadend', function(ev) {
                    //
                    //             var fileLength = fileReader.result.byteLength;
                    //             console.log('file length: '+fileLength);
                    //
        						// var bufSize;
        						// for(var z = 0; z < totalBufferSize; z++){
        						// 	bufSize+=totalBufferSize[z].BufferSize;
        						// };
                    //
        						// //if(bufSize<MaxBuffer)
                    //
        						// //{
                    //
        						// //Save the file size that the Explorer is downloading
        						// totalBufferSize.push({Peer: c.peer, BufferSize:fileLength});
                    //
                    //             //set the chunksize depending on file size
                    //             console.log('the file size is: ' + fileLength);
                    //             var chunkSize; //this is the size that determine amount of data sent
                    //
                    //             //if the file size is small, set a small chunk size
                    //             if (fileLength <= 1024) {
                    //               chunkSize = 1024;
                    //             } else {
                    //               chunkSize = 64 * 1024;
                    //             }
                    //             console.log('chunksize is: ' + chunkSize);
                    //             var remainder = fileLength % chunkSize;
                    //             //send the length to prepare client to receive file
                    //             //c.send([{MSGType:'BUFLEN', MSG: fileLength}]);
                    //             console.log('FL' + fileLength.toString());
                    //             c.send('FL' + fileLength.toString());
                    //
                    //             //i. send the majority of the data via the for loop
                    //             for (var i = 0; i <= fileLength - remainder; i += chunkSize) {
                    //               c.send(fileReader.result.slice(i, i + chunkSize));
                    //               wait(75);
                    //             }
                    //             //ii. then send the final chunkSize
                    //             c.send(fileReader.result.slice(fileLength - remainder, fileLength));
                    //             console.log('sending final part data');
                    //             c.close();
                    //           });
                              //}
//
//       //           var stats = fs.statSync(path.join(__dirname, './SiaDownloads/' + FileRequested));
//       //           console.log('buffer size: '+stats.size);
//       //           c.send('FL' + stats.size.toString());
//       //
//       //   fileReader.readAsArrayBuffer(new File(path.join(__dirname, './SiaDownloads/' + FileRequested)));
//       //
//       //   fileReader.on('data', function (data) {
//       //
//       // wait(100);
//       //
//       // //console.log(data);
//       //   c.send(data);
//       // });
// })
                            }
                            else {
                              console.log('the condition is FALSE');
                              c.send('FESorry. It looks there was an error!');
                              c.close();
                            }
                          });
                      };
                    };
                  };
                  if (FilePresentFlag !== 'Y') {
                    console.log('the not present flag is triggered and ending it');
                    c.send('FNF');
                    c.close();
                  };
                });
              });
            }; //End Download
    });

    c.on('close', function() {

if(c.label=='Download'){
      for(var m = 0; m<totalBufferSize.length; m++){
        if(totalBufferSize[m].Peer===c.peer){
          console.log('if download triggered');
          totalBufferSize.splice(m, 1);
          fs.unlink(path.join(__dirname, './SiaDownloads/' + c.metadata.fileid+c.peer), function(error) {
            if (error) {
              throw error;
            }
            console.log('Deleted');
          });
        }
      }
    };

      console.log('The connection with Peer: ' + c.peer + ' with label' + c.label + ' has been closed');
    });

    //On close connection for whatever reason, remove peer from list of connected peers
    //This frees up space for other peers to connect
    var index = connectedPeers.indexOf(c.peer);
    if (index > -1) {
      connectedPeers.splice(index, 1);
    }
  };//else
};

//handle process exit to destroy the PeerJS so the program will not close instantly
process.stdin.resume();

function exitHandler(options, err) {
  if (options.cleanup) console.log('clean');
  if (err) console.log(err.stack);
  if (options.exit) {
    peer.destroy();
    console.log('peer destroyed');
    process.exit()
  };
}

//do something when app is closing
process.on('exit', exitHandler.bind(null, {
  cleanup: true
}));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, {
  exit: true
}));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, {
  exit: true
}));
