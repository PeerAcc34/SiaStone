//Get the list of shared files
var SiaRenFlsFn = require('./SiaRenterFiles');
var SiaRenFls = SiaRenFlsFn.SiaRenFls;

//Call path module to resolve directories
var path = require('path');

//Call diskdb to read database files
var db = require('diskdb');
db = db.connect(path.join(__dirname, '../JDB/'), ['PremiumTransfers', 'PeerJsSwitch', 'PendingPurchases', 'PurchaseIDs', 'RSA', 'Settings']);

//Define a function to break up a file name into its component fields (i.e. name, price, id etc)
function getPositionJS(string, subString, index) {
  return string.split(subString, index).join(subString).length;
}

//For each Explorer that connects to a Sharer, determine what their PURCHASE STATUS is to download a file
//If a file has a 0 price, then the Purchase Status is set to FREEFILE and anyone can download it
//If a file does not have a 0 price and the Explorer has not previously purchased it, then the Purchase Status is set to FILENOTPURCHASED
//If a file does not have a 0 price but the Explorer has purchased it previously, then the Purchase Status is set to FILEPURCHASED
RtdVerifyPurchase = function(FileList, Peer, ExplorerPurchaseID, decrypt, callback) {

  var resarr = [];
  var FileLength = FileList.length;

  var FileArray = [];

  //Store file details in an array of objects
  for (var j = 0; j < FileLength; j++) {
    FileArray[j] = {
      'Siapath': FileList[j].siapath,
      'FileName': FileList[j].siapath.substring(getPositionJS(FileList[j].siapath, "^", 1) + 1, getPositionJS(FileList[j].siapath, "^", 2)),
      'FileExtension': (FileList[j].siapath.substring(FileList[j].siapath.lastIndexOf(".") + 1)).toUpperCase(),
      'Description': FileList[j].siapath.substring(getPositionJS(FileList[j].siapath, "^", 2) + 1, getPositionJS(FileList[j].siapath, "^", 3)),
      'Price': FileList[j].siapath.substring(getPositionJS(FileList[j].siapath, "^", 3) + 1, getPositionJS(FileList[j].siapath, "^", 4)),
      'FileID': FileList[j].siapath.substring(getPositionJS(FileList[j].siapath, "^", 4) + 1, FileList[j].siapath.lastIndexOf(".")),
      'FileSize': FileList[j].filesize,
      'PurchaseStatus': '',
      'FileTrxID': ''
    }

  };

  function verifyPurchase(Peer, iFileID, Price, Rn, Ln, EPID, dct) {

console.log('epid val is: '+EPID);

    if (Price == 0) { //If file price is 0, no need to perform a purchase check
      FileArray[Rn].PurchaseStatus = 'FREEFILE';
      resarr.push(FileArray[Rn]);
      if (resarr.length === Ln) {
        resarr.push({
          'Decrypt': dct
        });
        return callback(resarr);
      };
    } else {
      //If Explorer has never made a previous purchase
      //Set all the non-free files to NOTPURCHASED
      if (EPID == false) {
        FileArray[Rn].PurchaseStatus = 'FILENOTPURCHASED';
        resarr.push(FileArray[Rn]);
        if (resarr.length === Ln) {
          resarr.push({
            'Decrypt': dct
          });
          return callback(resarr);
        }
      }
      //If the Explorer has made a previous purchase, assess each file against the PremiumTransfers list
      else {
        var PurchCheck = db.PremiumTransfers.find({
          ExplorerID: Peer,
          FileID: iFileID
        });
        if (PurchCheck.length > 0) {
          FileArray[Rn].PurchaseStatus = 'FILEPURCHASED';
          resarr.push(FileArray[Rn]);
          if (resarr.length === Ln) {
            resarr.push({
              'Decrypt': dct
            });
            return callback(resarr);
          };
        } else {
          FileArray[Rn].PurchaseStatus = 'FILENOTPURCHASED';
          resarr.push(FileArray[Rn]);
          if (resarr.length === Ln) {
            resarr.push({
              'Decrypt': dct
            });
            return callback(resarr);
          }
        }
      }
    };
  };

console.log('the peer is: '+Peer);
console.log('the purchaseid of explorer is: '+ExplorerPurchaseID);

//Check if Explorer has made a previous purchase
  var PurchaseFlag = false;
  var PurchaseIDArray;

  PurchaseIDArray = db.PurchaseIDs.find();

  for(var r = 0; r<PurchaseIDArray.length; r++){

if(PurchaseIDArray[r].ExplorerID==Peer && PurchaseIDArray[r].PurchaseID==ExplorerPurchaseID){

PurchaseFlag = true;
break;

}

  };

//console.log('the array printout at 0 is: '+PurchaseIDArray[0].ExplorerID);
//console.log('the length of the purchase array is: '+JSON.stringify(PurchaseIDArray).length);

  if (JSON.parse(JSON.stringify(PurchaseIDArray)).length > 0) {
    PurchaseFlag = true;
  } else {
    PurchaseFlag = false;
  }

  for (var i = 0; i < FileLength; i++) {

    verifyPurchase(Peer, FileArray[i].FileID, FileArray[i].Price, i, FileLength, PurchaseFlag, decrypt);
  };
};

exports.RtdVerifyPurchase = RtdVerifyPurchase;
