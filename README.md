# SiaStone
This app allows you to share and sell your Sia files, as well as download and buy files from other Sia users by merging WebRTC (via the PeerJS wrapper) and the Sia API

<h2>Overview</h2>
This app allows you to share and sell your Sia files, as well as download and buy files from other Sia users. Sia users can mark which of the files they have stored on Sia to share/sell. To view the files of another Sia user, a WebRTC connection is formed using by entering the Sharer ID and the Public Key of the Sia user whose files you wish to view/download/purchase. A STUN server is used to facilitate the connection (currently the STUN server used is peerjs.com) and once the connection has been established between the two Sia users, a direct data connection is formed between them to facilitate file browsing and file transfer. When a Sia user 'downloads' a file from another Sia user, the file is downloaded from the Sia network onto the Sharer's computer, and then transferred across via WebRTC to the Explorer.

<h2>Terminology and Concepts</h2>
Just a quick note on some of the terminology I will use: <br><p></p>
1. Explorer: A Sia user who views/downloads/purchases the file of another Sia user (the 'client' if you will in terms of the traditional client-server model). An Explorer identifies themselves to another Sia user whose sharing their files via an Explorer ID (i.e. a Sia address). <br><p></p>
2. Sharer: A Sia user who shares their files for viewing/download/purchase for other Sia users (the 'server' if you will in terms of the traditional client-server model). A Sharer is accessed with a combination of a Sharer ID (i.e. a Sia address) and a Public Key (used to verify the identity of the Sharer to the Explorer).<br><p></p>
3. Verification (or Confirmation) message: An Explorer uses a public key from the Sharer to encrypt a random string and send it to the Sharer. If the Sharer can decrypt the message with the associated private key, this gives the Explore confidence they are viewing the files of the actual Sharer.<br><p></p>
<h2>Requirements</h2>
1. Siad running with the wallet unlocked<br><p></p>
2. Google Chrome (I developed this with Chrome so I am confident that it works with this browser. I have not tried other browsers extensively, but FireFox is definitely not compatible with some of the functionalities of PeerJS).<br><p></p>
3. Node.js installed<br><p></p>
4. A free PeerJS cloud API key from http://peerjs.com/peerserver <br><p></p>
<h2>Walkthrough</h2>
<h3>Start up</h3>
1. Download the SiaStone zip file from GitHub and unzip<br><p></p>
2. In the command line of your operating system, navigate to the SiaStone directory<br><p></p>
3. Type 'npm install'. This will install the required modules for the app to run.<br><p></p>
4. Once 'npm install' has completed, type 'node SiaStone'. If successful, you should get a message saying "Listening on Port 3000". <br><p></p>
5. In your browser (preferably Chrome), type 'localhost:3000'. This should give you the 'Settings Page'.<br><p></p>
6. For subsequent uses of the app, just follow steps 4 and 5.<br><p></p>
<h3>Settings Page</h3>
The first page that you will see is the Settings page. This page is where you set your Explorer ID that you will use to view and buy files of other Sia users, as well as set your Sharer ID which you publicize to allow other Sia users to view and buy your files. 
On first use of the app, the Your Current Settings section will have blank values (except for API Port Number to connect to Sia). Scroll down to Change Settings to change the values:<br><p></p>
1. Sharer ID: The ID that you share publicly (e.g. social media, forums, etc) to allow other Sia users to find you and view/purchase files. This is chosen from one of your Sia addresses.<br><p></p>
2. Explorer ID: The ID that identifies you when you view another users files and make purchases. This is chosen from one of your Sia addresses.<br><p></p>
3. Maximum Buffer Size: Since a Sharer downloads a file from the Sia network and then transfers it to the Explorer, a limit needs to be established to prevent an excessive number of files being downloaded at the same time and overwhelming the Sharer's computer.<br><p></p>
4. Maximum Number of Peers: The maximum number of connections a Sharer is willing to permit simultaneously. <br><p></p>
5. PeerJS Key: Currently PeerJS is used to facilitate direct peer-to-peer connections between Sharers and Explorers. Currently a free API key is required to use its service (has a limit of 50 concurrent connections)<br><p></p>
6. API Port Number: The default connection port number for the Sia API is 9980. This normally remains unchanged unless you have changed it due to clashes with other apps. <br><p></p>
7. Host: The URL for the STUN server. Currently this is 0.peerjs.com as PeerJS is the current STUN server<br><p></p>
8. Port: The port number for the STUN server. Currently 9000 for PeerJS<br><p></p>
9. Path: The path for the STUN server. Currently left blank as it is optional.<br><p></p>
Once you have changed the values, click Confirm Settings
Under Change Public and Private Keys, click Generate New Keys to create a new Public Key and a Private Key.<br><p></p>
1. Public Key: This is publicly shared along with your Sharer ID. This is used by other Explorers to encrypt a verification message. The ability of the Sharer to successfully decrypt it with the associated private key and return the decrypted message gives the Explorer confidence that they are actually viewing the Sharer's files<br><p></p>
2. Private Key: Used by the Sharer to decrypt verification message from Explorers.  <br><p></p>
<h3>My Files</h3>
This section lists all the files that you have uploaded to the Sia network. Here you can choose to share and unshare files, as well as set a price if you wish to sell your files.
To share a file, click on Share for the file you wish to share. A section labeled Rename and edit settings of your file here will appear at the bottom:<br><p></p>
1. File Name: Change the name of the file you wish to change it<br><p></p>
2. New Description: Provide a description of the file for Explorers<br><p></p>
3. New Price: If you wish to sell your file, specify a price, else just set the price to 0.<br><p></p>
Click Confirm Share to confirm sharing. A File ID (i.e. a Sia address) is generated as a unique identifier for the file.
Clicking confirm actually renames the file to incorporate the new details of the file (separated by ^) in the following format:<br><p></p>
SiaStoneFile^FileName^FileDescription^FilePrice^FileID.FileExtension<br><p></p>
Only files in this format will be shared. You can check in the Sia-UI to see the name change.<br><p></p>
To unshare a file, just click the Unshare button. The file will then be renamed to the original file name plus its extension (e.g. .jpg, .doc, .pdf etc).
<h3>Share Sia Files</h3>
To start sharing your files, click on the Enable button. Explorers who have your Sharer ID and public key will now be able to view/download/purchase your files. In the command line, if successful, you should see the output Connected to STUN server. To stop sharing, press the Disable button. Please note that you need to leave this app running to continue sharing your files.
Sia Explore
This section is where you can view the files of other Sia users (i.e. Sharers). Enter the Sharer ID and Public Key into the input boxes and press Connect. A random string will also be generated, encrypted and sent to the Sharer for verification.
If the connection is successful (a connection log is generated at the bottom of the page), a list of the Sharer's files will then appear. If the Sharer was able to decrypt the verification message, the message Sharer Verification: Success appears, else the message Sharer Verification: Fail appears. 
Notice the field Purchase Status. There are three possible values:
1. FREEFILE: If the price of a file is 0, then the Explorer can download the file without purchase. The Download button will appear.
2. FILEPURCHASED: If the Explorer has purchased the file previously, the Explorer can download the file by press the Download button. Note the Explorer must use the same Explorer ID that they used to previously purchase the file.
3. FILENOTPURCHASED: If the file price is greater than 0 and the Explorer has not purchased the file previously, then the Explorer will have to click the Purchase button to buy the file.
Download File
To download a file, press Download. This initiates a 2 step process:
1. The Sharer's computer will download the requested file from the Sia network. A progress update is provided every 10 seconds stating the download completed percentage from the Sia network to the Sharer computer.
2. The Sharer then transfers the file to the Explorer via WebRTC. A near real time download update is generated on the page.
Once the file is transferred, a download link is generated. Right click, select 'Save Link As' and save to desired location.
Purchase File
To purchase a file, press Purchase. This triggers the Sharer to create a Sia address that is used as the Purchase Address i.e. the address to which the Explorer will make the payment to purchase the file. Review the purchase details and then press Confirm Payment. This will initiate a payment from your wallet. The payment amount is broken down into 4 components:
1. File Price
2. Developer Fee (fixed at 2 Siacoin, regardless of File Price)
3. Transaction Fee for File Price (0.75 Siacoin)
4. Transaction Fee for Developer Fee (0.75 Siacoin)
Please wait up to 60 seconds while the Sharer checks the purchase address to make sure a payment has been made. If the payment is successful, an alert message will state payment successful, else an alert message will give you an error. If successful, refresh the page and re-enter the Sharer ID and public key. You will then see the Download button for the file you just purchased. 
Premium File History
This section lists all the files that you have bought and sold. Note only file transactions that had a price greater than 0 are listed here (free file transactions are not listed).
About
MIT license for the app, as well as the license for PeerJS.
Shut Down
Back in your command line, press Ctrl+C. This will terminate the app and any other associated processes.
