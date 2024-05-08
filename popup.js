// Clear data button click
document.getElementById('clearSiteDataBtn').addEventListener('click', function() {
    const button = this; // Reference to the button
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs.length > 0) { // Ensure there's an active tab
            chrome.tabs.sendMessage(tabs[0].id, {action: "clearSiteData"}, function(response) {
                if (response && response.success) {
                    const originalText = button.textContent; // Save the original button text
                    button.textContent = "Site data cleared!"; // Change the button text

                    // Set a timeout to revert the button text back to original after 4000ms
                    setTimeout(function() {
                        button.textContent = originalText;
                    }, 4000);
                }
            });
        }
    });
});

// Toggle for global autosaving
document.getElementById('toggleAutosave').addEventListener('change', function() {
    const isPaused = this.checked; // if checked, autosaving should be paused
    chrome.storage.sync.set({autosaveEnabled: !isPaused}, function() {
        console.log('Global autosave enabled:', !isPaused);
    });
});

// Toggle for site-specific autosaving
document.getElementById('toggleAutosaveSite').addEventListener('change', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs.length === 0) {
            console.error('No active tabs found.'); // Log error if no active tab
            return;
        }
        const url = new URL(tabs[0].url);
        const hostname = url.hostname;
        const isPaused = document.getElementById('toggleAutosaveSite').checked; // if checked, autosaving should be paused
        chrome.storage.sync.set({[`autosave_${hostname}`]: !isPaused}, function() {
            console.log('Site-specific autosave for', hostname, 'enabled:', !isPaused);
        });
    });
});

// Initialize toggles
document.addEventListener('DOMContentLoaded', function() {
    // Initialize toggle for global autosaving
    chrome.storage.sync.get('autosaveEnabled', function(data) {
        if (chrome.runtime.lastError) {
            console.error('Failed to retrieve global autosaving settings:', chrome.runtime.lastError);
            return;
        }
        document.getElementById('toggleAutosave').checked = data.autosaveEnabled === false; // Set based on stored value
    });

    // Initialize toggle for current site autosaving
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs.length === 0) {
            console.error('No active tabs found for initializing site-specific toggle.');
            return;
        }
        const url = new URL(tabs[0].url);
        const hostname = url.hostname;
        chrome.storage.sync.get(`autosave_${hostname}`, function(data) {
            if (chrome.runtime.lastError) {
                console.error('Failed to retrieve site-specific autosaving settings:', chrome.runtime.lastError);
                return;
            }
            document.getElementById('toggleAutosaveSite').checked = data[`autosave_${hostname}`] === false; // Set based on stored value
        });
    });
});

// Disable site-level switch if global is paused
document.addEventListener('DOMContentLoaded', function() {
    const globalToggle = document.getElementById('toggleAutosave');
    const siteToggleWrapper = document.getElementById('autosaveSiteWrap');

    // Function to update the disabled state based on the global toggle
    function updateSiteToggleState() {
        if (globalToggle.checked) {
            siteToggleWrapper.classList.add('disabled');
            siteToggleWrapper.querySelector('input').disabled = true; // Optionally disable the input
        } else {
            siteToggleWrapper.classList.remove('disabled');
            siteToggleWrapper.querySelector('input').disabled = false; // Re-enable the input
        }
    }

    // Event listener for changes on the global autosave toggle
    globalToggle.addEventListener('change', function() {
        updateSiteToggleState();
    });

    // Call once on load to set the initial state correctly
    updateSiteToggleState();
});
