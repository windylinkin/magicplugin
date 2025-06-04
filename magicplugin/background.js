// background.js
// Ensure this URL is correct and your server is configured for CORS if necessary,
// though background script fetch usually bypasses some browser CORS for extensions.
const CODEGEN_API_URL = 'https://jiesuan.jujia618.com/system/codegen/generate_from_llm';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "GENERATE_CODE") {
        const { payload, token } = request;

        if (!token) {
            sendResponse({ success: false, errorMessage: "Authentication token is missing." });
            return true; // Keep channel open for async response (though we responded sync here)
        }

        fetch(CODEGEN_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Token': token 
            },
            body: JSON.stringify(payload)
        })
        .then(response => {
            if (!response.ok) { // Check for non-2xx HTTP status codes
                // Try to parse error response from server if it's JSON
                return response.json().then(errData => {
                    throw new Error(errData.message || `HTTP error! status: ${response.status}`);
                }).catch(() => { // Fallback if error response isn't JSON
                    throw new Error(`HTTP error! status: ${response.status}`);
                });
            }
            return response.json();
        })
        .then(data => {
            // Assuming your API directly returns the { code, message, data: actualResult } structure
            // and the very nested structure was an example of the full HTTP response.
            // The backend script already returns the inner 'data' as the primary 'data' field.
            // So, data.data should contain the {type, fileName, url, message} or {type, scriptName, apiPath, message}
            if (data.code === 200 && data.data) { // Check for your application-level success code
                sendResponse({ success: true, data: data }); // Send the whole data object from your API
            } else {
                sendResponse({ success: false, errorMessage: data.message || 'API call returned an error structure' });
            }
        })
        .catch(error => {
            console.error("Error in background fetch:", error);
            sendResponse({ success: false, errorMessage: error.message || "Network or parsing error" });
        });
       
        return true; // Crucial for asynchronous sendResponse
    }
});