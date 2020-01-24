var CLIENT_ID = ''; // Get from Quickbooks Developer Console
var CLIENT_SECRET = ''; // Get from Quickbooks Developer Console
var BASE_AUTH_URL = 'https://appcenter.intuit.com/connect/oauth2';
var TOKEN_URL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
var API_SCOPE = 'com.intuit.quickbooks.accounting openid profile email phone address';
var REDIRECT_URI = ''; // Generate using the logRedirectUri() function mentioned at the end of this script
var RESPONSE_TYPE = 'code';

/**
 * Authorizes and makes a request to the Quickbooks API using OAuth 2.
*/ 
function run() {
  var service = getService();
  if (service.hasAccess()) {
    var url = 'https://quickbooks.api.intuit.com/';
    var response = UrlFetchApp.fetch(url, {
      headers: {
        Authorization: 'Bearer ' + service.getAccessToken()
      }
    });
    var result = JSON.parse(response.getContentText());
    Logger.log(JSON.stringify(result, null, 2));
  } else {
    var authorizationUrl = service.getAuthorizationUrl();
    Logger.log('Open the following URL and re-run the script: %s', authorizationUrl);
  }
}

/**
 * Reset the authorization state, so that it can be re-tested.
*/ 
function reset() {
  getService().reset();
}

/**
 * Configures the service.
 */
function getService() {
  return OAuth2.createService('Quickbooks')
      .setAuthorizationBaseUrl(BASE_AUTH_URL)
      .setTokenUrl(TOKEN_URL)
      .setClientId(CLIENT_ID)
      .setClientSecret(CLIENT_SECRET)
      .setScope(API_SCOPE)
      .setCallbackFunction('authCallback')
      .setParam('response_type', RESPONSE_TYPE)
      .setParam('state', getStateToken('authCallback')) // function to generate the state token on the fly
      .setPropertyStore(PropertiesService.getUserProperties());
}

/**
 * Handles the OAuth callback
 */
function authCallback(request) {
  var service = getService();
  var authorized = service.handleCallback(request);
  if (authorized) {
    Logger.log("Success!");
    return HtmlService.createHtmlOutput('Success!');
  } else {
    Logger.log("Denied!");
    return HtmlService.createHtmlOutput('Denied.');
  }
}

/** 
 * Generate a State Token
 */
function getStateToken(callbackFunction){
 var stateToken = ScriptApp.newStateToken()
     .withMethod(callbackFunction)
     .withTimeout(120)
     .createToken();
 return stateToken;
}

/**
 * Logs the redirect URI. Run this function to get the REDIRECT_URI to be mentioned at the top of this script. 
 */
function logRedirectUri() {
  Logger.log(getService().getRedirectUri());
}
  
// Encrypt function
function GAS_sha256(value) {
  var signature = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value);

  /** @type String */
  var hexString = signature
    .map(function(byte) {
    // Convert from 2's compliment
  var v = (byte < 0) ? 256 + byte : byte;

  // Convert byte to hexadecimal
  return ("0" + v.toString(16)).slice(-2);
  })
  .join("");
  return hexString
}

// Test webhook reception
function dxoPoxst(e) {
  var sheet = SpreadsheetApp.getActiveSheet();
  var data2 = JSON.parse(e.postData.contents);
  sheet.appendRow([data2]);
}



// Retreive all non-Deleted invoices from Quickbooks API and send to FB every 24 hours at 2AM 
// Fill in your company ID, conversion ID and access token in this function
function Past24hConversions() {
  var sheet = SpreadsheetApp.getActiveSheet();
  var timeNow = Utilities.formatDate(new Date(Date.now()), 'Etc/GMT', 'yyyy-MM-dd\'T\'HH:mm:ss.SSS\'Z\'')
  var yesterday = Utilities.formatDate(new Date(Date.now() - 864e5), 'Etc/GMT', 'yyyy-MM-dd\'T\'HH:mm:ss.SSS\'Z\'')
  // Uncomment date below and set to grab invoices for more than 24 hours. Facebook should be able to make use of 720 days.
  //var yesterday = "2020-01-08T10:45:31.944Z"

  var url2 = "https://quickbooks.api.intuit.com/v3/company/<company_number>/cdc?entities=estimate,invoice&changedSince="+yesterday
  
  var headers2 = {
    "muteHttpExceptions": true,
    "headers":{
      "Accept":"application/json", 
      "Content-Type":"application/json",
      "Authorization": "Bearer " + getService().getAccessToken()
    },
  };
  
  var response2 = UrlFetchApp.fetch(url2, headers2);
  var data3 = JSON.parse(response2.getContentText());

  var count = 0
  if (data3.CDCResponse[0].QueryResponse[1].Invoice) {
    var count = Object.keys(data3.CDCResponse[0].QueryResponse[1].Invoice).length;
  }
  
  var lena = []
  for (var i = 0; i < count; i++) {
    var hashedPhoneNumber = null
    var hashedEmailAddress = null
    var amount = null

    var wing = data3.CDCResponse[0].QueryResponse[1].Invoice[i]
    
    if (wing.TotalAmt) {
      var amount = wing.TotalAmt
    }
    if (wing.CustomerRef) {
      var custN = wing.CustomerRef.value
    }
    if (wing.BillEmail) {
      var email = wing.BillEmail.Address // DELETE ME
      var hashedEmailAddress = GAS_sha256(wing.BillEmail.Address);
    }
    
    //Get Costomer Info just for Phone Number
    var url4 = "https://quickbooks.api.intuit.com/v3/company/<company_number>/customer/"+custN+"?minorversion=42"
    var response4 = UrlFetchApp.fetch(url4, headers2);
    var data4 = JSON.parse(response4.getContentText());

    if (data4.Customer.PrimaryPhone) {
      var custPhoneNum = JSON.stringify("1-"+data4.Customer.PrimaryPhone.FreeFormNumber);
      var hashedPhoneNumber = GAS_sha256(custPhoneNum)
    }
    
    if (data4.Customer.DisplayName) {
      //sheet.appendRow([data03.Customer.PrintOnCheckName, BillEmail, hashedEmailAddress, custPhoneNum, hashedPhoneNumber]);

      var unixtime = Math.round(new Date().getTime() / 1000);

      var offlineConversionDataSetId = "";
      var systemUserAccessToken = "";
      var uploadTag = "store_data";

      var dataJson =
      [
        {
          match_keys: {
            phone: hashedPhoneNumber,  // include a hashed phone number and/or email
            email: hashedEmailAddress,
          },
          currency: "USD",
          value: amount,
          event_name: "Purchase",
          event_time: unixtime,
          custom_data: {
            event_source: "in_store",
          },
        },
      ];

      var customer_data = JSON.stringify(dataJson);

      var fb_url = "https://graph.facebook.com/v5.0/"+offlineConversionDataSetId+"/events"
      var options = {
        "method": "POST",
        "payload": "access_token=" + systemUserAccessToken + "&upload_tag=" + uploadTag + "&data=" + customer_data
      }

      var response = UrlFetchApp.fetch(fb_url, options);
      //sheet.appendRow([timeNow, wing.CustomerRef.name, amount, custPhoneNum, hashedPhoneNumber, email, hashedEmailAddress]);
      sheet.appendRow([wing.CustomerRef.name+" Sale info WAS sent to Facebook", '', '', '', '', timeNow]);
    }
  }
}
    
    
    
    
    
    
    
    
    
    




