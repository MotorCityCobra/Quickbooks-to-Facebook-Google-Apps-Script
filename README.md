# Quickbooks-to-Facebook-Google-Apps-Script

Modification to goelp's Google Apps Script Oauth2 script [here](https://gist.github.com/goelp/945ee0583e1df9663cc9e17ae5a2b9bb)

This script will grab all previous Quickbooks Online invoices from the past 24 hours (or time you specify) and send the amount, customer email, and phone number to your Offline Conversion set of your Ad Account in Facebook. You'll need to set up an app in Intuit (quickbooks for developers) and an app in Facebook and create a System User for it in your Facebook Business Settings. This Google Apps Script will innitially connect to Quickbooks via Oauth2 and your Facebook credentials will go in the function Past24hConversions().

1. Enter your Client ID and Client Secret from Intuit in the top of the script.
2. Publish the app. 'Publish > Deploy as web app...'
3. Run the function logRedirectUri() and go to view > Logs and paste the link in bottom of top code block and in your Intuit app.
4. Run the Run() function and Oauth2 the app with Quickbooks.
5. Add all credentials in Past24hConversions(). Company ID, Facebook conversion ID and access token.
6. Test running Past24hConversions(). Set the 'yesterday' var to a date you want to grab new invoices from, such as the past 15 minutes or past 720 days. Uncomment near the last line in the function to print results to the spreadsheet. (Your Quickbooks Online account might need make API calls for the sales receipts instead of invoices. Test in Intuit's API explorer.)
7. After you are happy to have the app run on its own every day set a trigger at 'edit > Current project's triggers > add trigger' and select the function Past24hConversions() to run daily. If you want it to look back weekly change the 'yesterday' var to look at the last seven days.  

    var yesterday = Utilities.formatDate(new Date(Date.now() - 864e5), 'Etc/GMT', 'yyyy-MM-dd\'T\'HH:mm:ss.SSS\'Z\'')  
    
If you want a time other than 24 hours to run repeadedly you'll have to figure out what the number 864e5 should be instead to get the time you want. Google Apps Script also lets you set the function for every hour or minute. Just make sure it is looking backwards to the last time the script ran so you are not missing transactions or sending duplicate transactions.

![Purchase to Facebook](https://files.catbox.moe/zilo06.png)
