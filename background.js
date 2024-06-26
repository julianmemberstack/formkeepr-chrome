// background.js
async function verifyToken(token) {
    try {
        const response = await fetch('https://largest-walrus.vercel.app/api/authToken', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token })
        });

        if (response.ok && response.headers.get("content-type")?.includes("application/json")) {
            const data = await response.json();
            return data.verified;  // Returns true if verified, false otherwise
        } else {
            console.error('Failed to verify token, server response not OK or not JSON.');
            return false;
        }
    } catch (error) {
        console.error('Error verifying token:', error.message);
        return false;
    }
}

// Message listener for real-time verification request
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.verifyTokenNow) {
        verifyToken(request.token).then(verified => {
            sendResponse({authValid: verified});
        });
        return true;  // Indicates an asynchronous response
    }
});

// Example of getting the token from a cookie and verifying it
chrome.cookies.get({url: "https://formkeepr-chrome.webflow.io", name: "authToken"}, function(cookie) {
    if (cookie) {
        verifyToken(cookie.value);
    } else {
        console.error('Auth token cookie not found');
    }
});

chrome.runtime.onInstalled.addListener(() => {
    console.log("Extension installed");
    // Initialization code here
});
  
// Listen for messages from the popup
chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
      if (request.action === "clearAllData") {
        // Example action to clear all localStorage
        chrome.tabs.query({}, function(tabs) {
          tabs.forEach(tab => {
            chrome.scripting.executeScript({
              target: {tabId: tab.id},
              function: clearLocalStorage
            });
          });
        });
        sendResponse({result: "Data cleared"});
        return true;
      }
    }
);
  
// Function to clear localStorage on each tab
function clearLocalStorage() {
    localStorage.clear();
    console.log("Local storage cleared");
}

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "checkAutosavingPermissions") {
        chrome.storage.sync.get('autosaveEnabled', function(globalData) {
            // First, check the global autosave setting
            if (globalData.autosaveEnabled === false) {
                // If global autosaving is disabled, immediately return false
                sendResponse({enabled: false});
            } else {
                // Otherwise, check the site-specific setting
                chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                    if (tabs.length > 0) {
                        const url = new URL(tabs[0].url);
                        const hostname = url.hostname;
                        chrome.storage.sync.get(`autosave_${hostname}`, function(siteData) {
                            const isAutosaveEnabled = siteData[`autosave_${hostname}`] !== false;
                            sendResponse({enabled: isAutosaveEnabled});
                        });
                    } else {
                        // Default to true if no tabs are found
                        sendResponse({enabled: true});
                    }
                });
            }
        });
        return true;  // indicates that the response will be sent asynchronously
    }
});
