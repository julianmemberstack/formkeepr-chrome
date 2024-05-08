// content.js
chrome.runtime.sendMessage({checkAuth: true}, response => {
    if (response.authValid) {
        console.log("Authentication token valid. Executing content script.");
        // Code for modifying the DOM or other operations goes here
    } else {
        console.error("Authentication token not valid. Content script execution stopped.");
        // Possibly remove some event listeners or clear data if needed
    }
});

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.action === "authStatus") {
        if (message.isVerified) {
            console.log("Authentication verified. Running content script.");
            // Rest of your code here...
        } else {
            console.log("Authentication not verified. Redirecting to login page.");
            window.location.href = "https://formkeepr-chrome.webflow.io";
        }
    }
});

// Function to handle form data saving with autosaving permissions check
function saveAllFormData() {
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('input', debounce(() => {
            // Send a message to check if autosaving is enabled
            chrome.runtime.sendMessage({action: "checkAutosavingPermissions"}, function(response) {
                if (response.enabled) {
                    console.log("Autosaving is enabled.");
                    // Proceed with autosaving logic
                    const formData = {};
                    Array.from(form.elements).forEach(element => {
                        if (element.name) {
                            if (element.type === "checkbox") {
                                formData[element.name] = element.checked ? element.value : '';
                            } else if (element.type === "radio") {
                                if (element.checked) {
                                    formData[element.name] = element.value;
                                } else if (!formData.hasOwnProperty(element.name)) {
                                    formData[element.name] = ''; // Ensure every radio group has a key even if not checked
                                }
                            } else {
                                formData[element.name] = element.value;
                            }
                        }
                    });
                    const formId = `${window.location.hostname}_${form.name || form.id}`;
                    localStorage.setItem(formId, JSON.stringify(formData));
                    showAutosaveNotification(); // Show notification on save
                } else {
                    console.log("Autosaving is disabled, no data will be saved.");
                }
            });
        }, 2000));
    });
}

// Debounce inputs
function debounce(func, delay) {
    let timer;
    return function() {
        const context = this, args = arguments;
        clearTimeout(timer);
        timer = setTimeout(() => func.apply(context, args), delay);
    };
}

// Show notification when autosave happens
function showAutosaveNotification() {
    let notification = document.querySelector('.autosave-notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.className = 'autosave-notification';
        document.body.appendChild(notification);

        // Create and append the logo image
        const img = document.createElement('img');
        img.src = chrome.runtime.getURL('icon.png'); // Make sure 'icon.png' is the correct path
        img.alt = 'Logo';
        img.style.width = '30px';
        img.style.height = '30px';
        img.style.marginRight = '10px';
        notification.appendChild(img);

        // Create and append the text span for dynamic text
        const text = document.createElement('span');
        text.textContent = 'Autosaved just now';
        notification.appendChild(text);
    } else {
        // If the notification already exists, just update the text
        const text = notification.querySelector('span');
        text.textContent = 'Autosaved just now';
    }

    // Clear any existing interval to reset the timer
    if (notification.intervalId) {
        clearInterval(notification.intervalId);
    }
    
    let startTime = Date.now();
    notification.style.opacity = '1';

    // Update the notification text every second
    notification.intervalId = setInterval(() => {
        let seconds = Math.round((Date.now() - startTime) / 1000);
        const text = notification.querySelector('span');
        if (seconds === 1) {
            text.textContent = 'Autosaved 1 second ago';
        } else {
            text.textContent = `Autosaved ${seconds} seconds ago`;
        }
        if (seconds >= 60) {
            clearInterval(notification.intervalId);
            notification.style.opacity = '0';
        }
    }, 1000);

    // Automatically fade out after some time
    setTimeout(() => {
        clearInterval(notification.intervalId);
        notification.style.opacity = '0';
    }, 5000);
}

// Show notification
function showNotification(message, duration = 5000) {
    let notification = document.querySelector('.form-notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.className = 'form-notification';
        document.body.appendChild(notification);

        // Styles for the notification
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.right = '20px';
        notification.style.backgroundColor = 'white';
        notification.style.color = 'black';
        notification.style.padding = '10px';
        notification.style.borderRadius = '10px';
        notification.style.boxShadow = '0 2px 6px rgba(0,0,0,0.2)';
        notification.style.zIndex = '10000';
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.5s';
        notification.style.display = 'flex';
        notification.style.alignItems = 'center';
        notification.style.fontSize = '16px';
        notification.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';

        // Create and style the icon element
        const icon = document.createElement('img');
        icon.src = chrome.runtime.getURL('icon.png'); // Ensure the icon.png is available in your extension's package
        icon.style.width = '30px';
        icon.style.height = '30px';
        icon.style.marginRight = '10px';
        notification.appendChild(icon);

        // Create and style the text element
        const text = document.createElement('div');
        text.className = 'notification-text';
        notification.appendChild(text);
    }
    notification.querySelector('.notification-text').textContent = message;
    notification.style.opacity = '1';
    setTimeout(() => {
        notification.style.opacity = '0';
    }, duration); // Fade out after the specified duration
}

// Prefill form data
function prefillFormData() {
    // Assume the token is stored or retrieved from somewhere in the extension
    const userToken = getTokenFromStorage();  // Implement this function based on your storage strategy

    chrome.runtime.sendMessage({verifyTokenNow: true, token: userToken}, response => {
        if (response.authValid) {
            console.log("Token validated, pre-filling form data.");
            const forms = document.querySelectorAll('form');
            let formDataRestored = false; // Track if any data was restored
        
            forms.forEach(form => {
                const formId = `${window.location.hostname}_${form.name || form.id}`;
                const savedData = localStorage.getItem(formId);
                if (savedData) {
                    const formData = JSON.parse(savedData);
                    Array.from(form.elements).forEach(element => {
                        if (element.type === "checkbox") {
                            if (formData[element.name] === "on" !== element.checked) {
                                element.click(); // Trigger click for visual update on custom styled checkboxes
                                element.dispatchEvent(new Event('change'));
                            }
                        } else if (element.type === "radio") {
                            if (formData[element.name] === element.value && !element.checked) {
                                element.click(); // Trigger click for visual update on custom styled radios
                                element.dispatchEvent(new Event('change'));
                            }
                        } else if (element.name && formData[element.name] !== undefined) {
                            element.value = formData[element.name];
                            formDataRestored = true;
                        }
                    });
                }
            });
        
            if (formDataRestored) {
                showNotification("Form inputs restored! Please review everything before submitting.");
            }
        } else {
            console.error("Token validation failed, cannot pre-fill form data.");
        }
    });
}

// Change event
function triggerChangeEvent(element) {
    const event = new Event('change', { 'bubbles': true });
    element.dispatchEvent(event);
}

// Notification styles
function addNotificationStyles() {
    const style = document.createElement('style');
    document.head.appendChild(style);
    style.textContent = `
        .autosave-notification {
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: white;
            color: black;
            padding: 10px;
            border-radius: 10px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            z-index: 10000;
            opacity: 0;
            transition: opacity 0.5s;
            display: flex;
            align-items: center;
            font-size: 16px;
        }
        .autosave-notification img {
            width: 30px;
            height: 30px;
            margin-right: 10px;
        }
    `;
}

// Clear site data
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "clearSiteData") {
        const hostname = window.location.hostname;
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith(hostname + '_')) {
                localStorage.removeItem(key);
            }
        });
        sendResponse({success: true})
    }
});

// Get everything ready
document.addEventListener('DOMContentLoaded', () => {
    addNotificationStyles(); // Add styles for the notification
    prefillAllFormData();
    saveAllFormData();
});

// Clear localstorage on form submission
function setupFormSubmitListener() {
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', function(event) {
            // Construct the key used to store the data in localStorage
            const formId = `${window.location.hostname}_${form.name || form.id}`;

            // Remove the specific form data from localStorage
            localStorage.removeItem(formId);

            console.log(`Cleared data for: ${formId}`);
        });
    });
}

// Ensure this runs after the DOM is fully loaded or on a specific document state
if (document.readyState === "loading") {
    document.addEventListener('DOMContentLoaded', setupFormSubmitListener);
} else {
    setupFormSubmitListener(); // DOM is already ready
}