// content_script.js
// console.log("Magic AI Code Gen: Content Script Injected & Running on", window.location.href);

function findCodeInPage() {
    let bestCode = "";
    // Prioritize <pre><code>, then <pre>, then try to find markdown blocks
    const preCodeBlocks = document.querySelectorAll('pre > code');
    if (preCodeBlocks.length > 0) {
        preCodeBlocks.forEach(block => { bestCode += block.innerText + "\n\n"; });
    } else {
        const preBlocks = document.querySelectorAll('pre');
        if (preBlocks.length > 0) {
            preBlocks.forEach(block => { bestCode += block.innerText + "\n\n"; });
        }
    }
   
    // If multiple code blocks found, they are concatenated. User might need to clean it up in popup.
    // Fallback to selected text if no <pre> or <code> blocks found or they are empty
    if (!bestCode.trim()) {
        const selection = window.getSelection();
        if (selection && selection.toString().trim().length > 0) {
            bestCode = selection.toString();
        }
    }
    return bestCode.trim();
}

// Listen for a message from the popup to get code
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "REQUEST_CODE_FROM_PAGE_VIA_CONTENT_SCRIPT") {
        const code = findCodeInPage();
        if (code) {
            sendResponse({ success: true, code: code });
        } else {
            sendResponse({ success: false, message: "No suitable code blocks or selected text found on the page." });
        }
        return true; // For async response if needed, though findCodeInPage is sync here
    }
});

// Function to send code to popup (can be triggered by a button injected by this script)
function sendCodeToPopup(code) {
    if (code) {
        chrome.runtime.sendMessage({ type: "CODE_CAPTURED_FROM_PAGE", code: code }, (response) => {
            if (chrome.runtime.lastError) {
                console.error("Magic AI: Error sending code to popup:", chrome.runtime.lastError.message);
                // A custom modal would be better than alert here.
                // Create a simple div to act as a modal
                const errorModal = document.createElement('div');
                errorModal.textContent = "无法将代码发送到插件弹窗: " + chrome.runtime.lastError.message;
                errorModal.style.position = 'fixed';
                errorModal.style.top = '10px';
                errorModal.style.left = '50%';
                errorModal.style.transform = 'translateX(-50%)';
                errorModal.style.backgroundColor = '#f8d7da';
                errorModal.style.color = '#721c24';
                errorModal.style.padding = '10px 20px';
                errorModal.style.border = '1px solid #f5c6cb';
                errorModal.style.borderRadius = '5px';
                errorModal.style.zIndex = '2147483647';
                document.body.appendChild(errorModal);
                setTimeout(() => {
                    if (document.body.contains(errorModal)) {
                         document.body.removeChild(errorModal);
                    }
                }, 3000);

            } else if (response && response.status) {
                // console.log("Magic AI: Code sent to popup:", response.status);
                // Potentially show a success message, also via a custom modal/toast
            } else {
                // console.warn("Magic AI: Popup did not acknowledge code reception or reported an issue.");
            }
        });
    } else {
        // console.log("Magic AI: No code to send.");
    }
}

// --- Example: Auto-send last pre/code block on a key combination or after a delay ---
// This is more advanced and can be intrusive. For now, rely on user copy-pasting or popup requesting.

// --- Better: Inject a small, non-intrusive UI element (e.g., a button next to code blocks) ---
// This requires more complex DOM manipulation and handling various website structures.

// --- Simple "Capture Visible Code" button injected into the page ---
// (Debounced to avoid multiple additions if script re-runs, though "run_at": "document_idle" helps)
let captureBtnInjected = false;
function injectCaptureButton() {
    if (captureBtnInjected || document.getElementById('magic-ai-page-capture-btn')) return;

    const btn = document.createElement('button');
    btn.id = 'magic-ai-page-capture-btn';
    btn.textContent = 'Magic插件捕获'; // Changed text for clarity
    btn.style.position = 'fixed';
    btn.style.bottom = '15px';
    btn.style.right = '15px';
    btn.style.zIndex = '2147483647'; // Max z-index
    btn.style.padding = '8px 12px';
    btn.style.backgroundColor = '#007bff';
    btn.style.color = 'white';
    btn.style.border = 'none';
    btn.style.borderRadius = '5px';
    btn.style.cursor = 'pointer';
    btn.style.boxShadow = '0px 2px 10px rgba(0,0,0,0.2)';
    btn.style.fontSize = '13px';
    btn.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';


    btn.addEventListener('click', () => {
        const code = findCodeInPage();
        const messageModal = document.createElement('div');
        messageModal.style.position = 'fixed';
        messageModal.style.bottom = '50px'; // Position above the button
        messageModal.style.right = '15px';
        messageModal.style.padding = '10px 15px';
        messageModal.style.borderRadius = '5px';
        messageModal.style.zIndex = '2147483647';
        messageModal.style.boxShadow = '0px 2px 8px rgba(0,0,0,0.15)';
        messageModal.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
        messageModal.style.fontSize = '13px';

        if (code) {
            sendCodeToPopup(code);
            btn.textContent = '已发送!';
            messageModal.textContent = '代码已发送到插件弹窗！';
            messageModal.style.backgroundColor = '#d1e7dd'; // Success green
            messageModal.style.color = '#0f5132';
            setTimeout(() => { btn.textContent = 'Magic插件捕获'; }, 2000);
        } else {
            messageModal.textContent = '未找到可捕获的代码。';
            messageModal.style.backgroundColor = '#f8d7da'; // Error red
            messageModal.style.color = '#842029';
        }
        document.body.appendChild(messageModal);
        setTimeout(() => {
            if(document.body.contains(messageModal)) {
                document.body.removeChild(messageModal);
            }
        }, 2500);
    });
    document.body.appendChild(btn);
    captureBtnInjected = true;
}

// Inject button once the page is likely settled
if (document.readyState === "complete" || document.readyState === "interactive") {
    injectCaptureButton();
} else {
    window.addEventListener('load', injectCaptureButton, { once: true });
}
