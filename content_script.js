// content_script.js (带调试日志的版本)
console.log("Magic AI: Content Script Loaded and Running. Timestamp:", new Date().toLocaleTimeString());

function findCodeInPage() {
    // console.log("Magic AI: findCodeInPage called");
    let bestCode = "";
    const preCodeBlocks = document.querySelectorAll('pre > code');
    if (preCodeBlocks.length > 0) {
        preCodeBlocks.forEach(block => { bestCode += block.innerText + "\n\n"; });
    } else {
        const preBlocks = document.querySelectorAll('pre');
        if (preBlocks.length > 0) {
            preBlocks.forEach(block => { bestCode += block.innerText + "\n\n"; });
        }
    }
    if (!bestCode.trim()) {
        const selection = window.getSelection();
        if (selection && selection.toString().trim().length > 0) {
            bestCode = selection.toString();
        }
    }
    // console.log("Magic AI: findCodeInPage found code length:", bestCode.trim().length);
    return bestCode.trim();
}

function showCenteredNotification(message, type = 'info') {
    console.log("Magic AI: showCenteredNotification called. Message:", message, "Type:", type);
    let existingModal = document.getElementById('magic-ai-centered-notification');
    if (existingModal) {
        try {
            document.body.removeChild(existingModal);
        } catch (e) {
            console.warn("Magic AI: Could not remove existing modal, it might have already been removed.", e);
        }
    }

    const notificationModal = document.createElement('div');
    notificationModal.id = 'magic-ai-centered-notification';
    notificationModal.textContent = message;
    notificationModal.style.position = 'fixed';
    notificationModal.style.top = '20px';
    notificationModal.style.left = '50%';
    notificationModal.style.transform = 'translateX(-50%) translateY(-100px)';
    notificationModal.style.padding = '15px 25px';
    notificationModal.style.borderRadius = '8px';
    notificationModal.style.boxShadow = '0 6px 18px rgba(0,0,0,0.15)';
    notificationModal.style.zIndex = '2147483647';
    notificationModal.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
    notificationModal.style.fontSize = '14px';
    notificationModal.style.textAlign = 'center';
    notificationModal.style.opacity = '0';
    notificationModal.style.transition = 'opacity 0.3s ease-out, transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)';

    switch (type) {
        case 'success':
            notificationModal.style.backgroundColor = '#d1e7dd';
            notificationModal.style.color = '#0f5132';
            notificationModal.style.border = '1px solid #badbcc';
            break;
        case 'error':
            notificationModal.style.backgroundColor = '#f8d7da';
            notificationModal.style.color = '#842029';
            notificationModal.style.border = '1px solid #f5c2c7';
            break;
        default:
            notificationModal.style.backgroundColor = '#cff4fc';
            notificationModal.style.color = '#055160';
            notificationModal.style.border = '1px solid #b6effb';
            break;
    }

    try {
        document.body.appendChild(notificationModal);
        console.log("Magic AI: Notification modal appended to body.");
    } catch (e) {
        console.error("Magic AI: Failed to append notification modal to body.", e);
        return; // Stop if appending failed
    }


    setTimeout(() => {
        notificationModal.style.opacity = '1';
        notificationModal.style.transform = 'translateX(-50%) translateY(0)';
        console.log("Magic AI: Notification modal animated into view.");
    }, 50);

    setTimeout(() => {
        notificationModal.style.opacity = '0';
        notificationModal.style.transform = 'translateX(-50%) translateY(-100px)';
        console.log("Magic AI: Notification modal starting hide animation.");
        setTimeout(() => {
            if (document.body.contains(notificationModal)) {
                try {
                    document.body.removeChild(notificationModal);
                    console.log("Magic AI: Notification modal removed from body.");
                } catch (e) {
                     console.warn("Magic AI: Could not remove hidden modal, it might have already been removed during hide.", e);
                }
            }
        }, 400);
    }, 3500);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Magic AI: Message received in content_script:", request);
    if (request.type === "REQUEST_CODE_FROM_PAGE_VIA_CONTENT_SCRIPT") {
        const code = findCodeInPage();
        if (code) {
            sendResponse({ success: true, code: code });
        } else {
            sendResponse({ success: false, message: "No suitable code blocks or selected text found on the page." });
        }
        return true;
    }
});

function sendCodeToPopup(code) {
    console.log("Magic AI: sendCodeToPopup called with code length:", code ? code.length : 'null/empty');
    if (code) {
        chrome.runtime.sendMessage({ type: "CODE_CAPTURED_FROM_PAGE", code: code }, (response) => {
            console.log("Magic AI: sendMessage callback. Response:", response, "LastError:", chrome.runtime.lastError);
            if (chrome.runtime.lastError) {
                if (chrome.runtime.lastError.message === "The message port closed before a response was received.") {
                    showCenteredNotification('代码已捕获！(弹窗关闭时不会实时更新)', 'info');
                } else {
                    showCenteredNotification("发送代码到插件弹窗时出错: " + chrome.runtime.lastError.message, 'error');
                }
            } else if (response && response.status === "Code received and processed by popup") {
                showCenteredNotification('代码已捕获并发送到插件弹窗！', 'success');
            } else {
                showCenteredNotification('插件弹窗未正确响应代码。', 'info');
            }
        });
    } else {
        console.log("Magic AI: sendCodeToPopup called with no code.");
        showCenteredNotification('未找到可捕获的代码。', 'info');
    }
}

document.addEventListener('copy', () => {
    console.log("Magic AI: 'copy' event detected.");
    setTimeout(() => {
        const selectedText = window.getSelection().toString().trim();
        console.log("Magic AI: Text selected on copy:", selectedText ? selectedText.substring(0, 100) + "..." : "EMPTY_SELECTION", "Length:", selectedText.length);
        if (selectedText) {
            sendCodeToPopup(selectedText);
        } else {
            console.log("Magic AI: No text selected during copy event or selection is empty.");
            // Optionally: showCenteredNotification('复制操作已执行，但未选择任何文本。', 'info');
        }
    }, 50);
});
console.log("Magic AI: 'copy' event listener added.");

document.addEventListener('click', function(event) {
    // console.log("Magic AI: 'click' event detected on target:", event.target);
    const targetIcon = event.target.closest('mat-icon[fonticon="content_copy"], mat-icon[data-mat-icon-name="content_copy"]');
    if (targetIcon) {
        console.log("Magic AI: Detected click on a 'content_copy' mat-icon:", targetIcon);
        setTimeout(() => {
            const codeToCapture = findCodeInPage();
            console.log("Magic AI: Code to capture after icon click:", codeToCapture ? codeToCapture.substring(0,100) + "..." : "NO_CODE_FOUND", "Length:", codeToCapture.length);
            if (codeToCapture) {
                sendCodeToPopup(codeToCapture);
            } else {
                console.log("Magic AI: Copy icon clicked, but no code found by findCodeInPage.");
                // showCenteredNotification('复制图标已点击，但未找到可捕获的代码。', 'info');
            }
        }, 100);
    }
}, true);
console.log("Magic AI: 'click' event listener for mat-icon added.");


// content_script.js (扩展iframe模态框功能)

// --- In-Page Plugin UI (Iframe Modal with Drag, Resize, Close) ---

let pluginIframe = null;
let iframeOverlay = null;
let iframeContainer = null; // Changed to be globally accessible for drag/resize
const IFRAME_ID = 'magic-ai-plugin-iframe';
const OVERLAY_ID = 'magic-ai-plugin-overlay';
const CONTAINER_ID = 'magic-ai-plugin-container';
const HEADER_ID = 'magic-ai-plugin-header';
const RESIZE_HANDLE_ID = 'magic-ai-plugin-resize-handle';
const OPEN_BUTTON_ID = 'magic-ai-open-plugin-button';

// Drag state
let isDragging = false;
let dragOffsetX, dragOffsetY;

// Resize state
let isResizing = false;
let resizeInitialWidth, resizeInitialHeight, resizeInitialMouseX, resizeInitialMouseY;
const MIN_PLUGIN_WIDTH = 350; // 最小宽度
const MIN_PLUGIN_HEIGHT = 300; // 最小高度 (需要考虑header)

function createPluginModalStructure() {
    if (document.getElementById(CONTAINER_ID)) {
        return; // Structure already exists
    }
    console.log("Magic AI: Creating plugin modal structure.");

    // 1. Create Overlay
    iframeOverlay = document.createElement('div');
    iframeOverlay.id = OVERLAY_ID;
    Object.assign(iframeOverlay.style, {
        position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.4)', zIndex: '2147483645', display: 'none'
    });
    document.body.appendChild(iframeOverlay);
    iframeOverlay.addEventListener('click', () => togglePluginUI(false)); // Click overlay to close

    // 2. Create Iframe Container
    iframeContainer = document.createElement('div');
    iframeContainer.id = CONTAINER_ID;
    Object.assign(iframeContainer.style, {
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)', // Initial centering
        width: '440px', // Initial width, slightly more than popup content
        height: '630px', // Initial height (includes header)
        zIndex: '2147483646', boxShadow: '0 5px 25px rgba(0,0,0,0.25)',
        borderRadius: '8px', overflow: 'hidden', display: 'none',
        backgroundColor: '#ffffff', // Container background
        display: 'flex', flexDirection: 'column' // For header + iframe layout
    });

    // 3. Create Header (for Dragging and Close Button)
    const headerDiv = document.createElement('div');
    headerDiv.id = HEADER_ID;
    Object.assign(headerDiv.style, {
        height: '35px', backgroundColor: '#f0f0f0', cursor: 'move',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 10px', borderBottom: '1px solid #e0e0e0',
        userSelect: 'none' // Prevent text selection when dragging header
    });

    const titleSpan = document.createElement('span');
    titleSpan.textContent = "Magic AI 代码生成器";
    titleSpan.style.fontWeight = '500';
    titleSpan.style.color = '#333';
    headerDiv.appendChild(titleSpan);

    const closeButton = document.createElement('button');
    closeButton.innerHTML = '&times;'; // Close symbol
    Object.assign(closeButton.style, {
        background: 'transparent', border: 'none', fontSize: '22px',
        cursor: 'pointer', color: '#555', padding: '0 5px', lineHeight: '1'
    });
    closeButton.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent header's mousedown if close is part of header
        togglePluginUI(false);
    });
    headerDiv.appendChild(closeButton);
    iframeContainer.appendChild(headerDiv);

    // 4. Create Iframe
    pluginIframe = document.createElement('iframe');
    pluginIframe.id = IFRAME_ID;
    pluginIframe.src = chrome.runtime.getURL('popup.html');
    Object.assign(pluginIframe.style, {
        flexGrow: '1', // Iframe takes remaining space in flex container
        border: 'none', display: 'block', width: '100%' // Iframe width is 100% of container
        // Height will be implicitly set by flex-grow
    });
    iframeContainer.appendChild(pluginIframe);

    // 5. Create Resize Handle
    const resizeHandle = document.createElement('div');
    resizeHandle.id = RESIZE_HANDLE_ID;
    Object.assign(resizeHandle.style, {
        width: '14px', height: '14px',
        // Simple diagonal lines for grip, or use an SVG/image
        backgroundImage: 'linear-gradient(135deg, #aaa 25%, transparent 25%, transparent 50%, #aaa 50%, #aaa 75%, transparent 75%, transparent)',
        position: 'absolute', right: '0px', bottom: '0px', cursor: 'se-resize', zIndex: '1' // z-index relative to container
    });
    iframeContainer.appendChild(resizeHandle); // Append to container, not header

    document.body.appendChild(iframeContainer);

    // --- Attach Event Listeners ---
    // Dragging
    headerDiv.addEventListener('mousedown', onDragMouseDown);
    // Resizing
    resizeHandle.addEventListener('mousedown', onResizeMouseDown);

    // Communication from iframe
    window.addEventListener('message', function(event) {
        if (event.source !== pluginIframe.contentWindow) return;
        if (event.data && event.data.type === 'magicPluginCloseRequest') {
            togglePluginUI(false);
        }
    });
}

function onDragMouseDown(e) {
    // Prevent dragging if clicking on the close button itself
    if (e.target.tagName === 'BUTTON' || e.target.parentNode.tagName === 'BUTTON') return;

    isDragging = true;
    iframeContainer.style.userSelect = 'none'; // Prevent text selection on iframe during drag

    // If centered with transform, calculate initial absolute position
    if (iframeContainer.style.transform.includes('translate')) {
        const rect = iframeContainer.getBoundingClientRect();
        iframeContainer.style.left = `${rect.left}px`;
        iframeContainer.style.top = `${rect.top}px`;
        iframeContainer.style.transform = ''; // Remove transform for direct positioning
    }
    dragOffsetX = e.clientX - iframeContainer.offsetLeft;
    dragOffsetY = e.clientY - iframeContainer.offsetTop;

    document.addEventListener('mousemove', onDragMouseMove);
    document.addEventListener('mouseup', onDragMouseUp);
    // e.preventDefault(); // Can prevent focus changes, be careful
}

function onDragMouseMove(e) {
    if (!isDragging) return;
    let newX = e.clientX - dragOffsetX;
    let newY = e.clientY - dragOffsetY;

    // Boundary checks (optional, to keep it within viewport)
    const containerWidth = iframeContainer.offsetWidth;
    const containerHeight = iframeContainer.offsetHeight;
    newX = Math.max(0, Math.min(newX, window.innerWidth - containerWidth));
    newY = Math.max(0, Math.min(newY, window.innerHeight - containerHeight));

    iframeContainer.style.left = `${newX}px`;
    iframeContainer.style.top = `${newY}px`;
}

function onDragMouseUp() {
    isDragging = false;
    iframeContainer.style.userSelect = '';
    document.removeEventListener('mousemove', onDragMouseMove);
    document.removeEventListener('mouseup', onDragMouseUp);
}

function onResizeMouseDown(e) {
    isResizing = true;
    resizeInitialWidth = iframeContainer.offsetWidth;
    resizeInitialHeight = iframeContainer.offsetHeight;
    resizeInitialMouseX = e.clientX;
    resizeInitialMouseY = e.clientY;
    iframeContainer.style.userSelect = 'none'; // Prevent text selection on iframe during resize

    document.addEventListener('mousemove', onResizeMouseMove);
    document.addEventListener('mouseup', onResizeMouseUp);
    e.preventDefault();
    e.stopPropagation();
}

function onResizeMouseMove(e) {
    if (!isResizing) return;
    const dx = e.clientX - resizeInitialMouseX;
    const dy = e.clientY - resizeInitialMouseY;

    let newWidth = resizeInitialWidth + dx;
    let newHeight = resizeInitialHeight + dy;

    const headerHeight = document.getElementById(HEADER_ID) ? document.getElementById(HEADER_ID).offsetHeight : 35;

    newWidth = Math.max(MIN_PLUGIN_WIDTH, newWidth);
    newHeight = Math.max(MIN_PLUGIN_HEIGHT + headerHeight, newHeight); // Min height should account for header

    iframeContainer.style.width = `${newWidth}px`;
    iframeContainer.style.height = `${newHeight}px`;

    // Iframe width is 100% of container, height is container height minus header
    // pluginIframe.style.height will be handled by flexGrow if its parent (iframeContainer) has explicit height
    // and flexDirection is column. The iframe itself is set to flex-grow: 1.
    // So, we only need to ensure container has the correct height.
}

function onResizeMouseUp() {
    isResizing = false;
    iframeContainer.style.userSelect = '';
    document.removeEventListener('mousemove', onResizeMouseMove);
    document.removeEventListener('mouseup', onResizeMouseUp);
}

function togglePluginUI(forceState) {
    if (!iframeContainer || !iframeOverlay) { // If structure not created yet
        if (forceState === true || (typeof forceState === 'undefined' && (!iframeContainer || iframeContainer.style.display === 'none'))) {
            createPluginModalStructure(); // Create it
            // Ensure elements are ready before trying to access them for display logic
             setTimeout(() => {
                if (iframeContainer && iframeOverlay) { // Check again after creation
                    iframeOverlay.style.display = 'block';
                    iframeContainer.style.display = 'flex'; // Changed from 'block' to 'flex'
                    console.log("Magic AI: Plugin UI (iframe) shown.");
                }
             }, 0);
        }
        return;
    }

    const shouldBeVisible = typeof forceState !== 'undefined' ? forceState : iframeContainer.style.display === 'none';

    if (shouldBeVisible) {
        iframeOverlay.style.display = 'block';
        iframeContainer.style.display = 'flex'; // Use 'flex' due to flexDirection: 'column'
        console.log("Magic AI: Plugin UI (iframe) shown.");
    } else {
        iframeOverlay.style.display = 'none';
        iframeContainer.style.display = 'none';
        console.log("Magic AI: Plugin UI (iframe) hidden.");
    }
}

function injectOpenPluginButton() {
    if (document.getElementById(OPEN_BUTTON_ID)) return;
    const btn = document.createElement('button');
    btn.id = OPEN_BUTTON_ID;
    btn.textContent = '打开 Magic';
    Object.assign(btn.style, {
        position: 'fixed', bottom: '20px', right: '20px', zIndex: '2147483640',
        padding: '10px 18px', backgroundColor: '#007bff', color: 'white',
        border: 'none', borderRadius: '25px', cursor: 'pointer',
        boxShadow: '0px 3px 12px rgba(0,0,0,0.25)', fontSize: '14px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        transition: 'background-color 0.2s ease'
    });
    btn.onmouseover = () => btn.style.backgroundColor = '#0056b3';
    btn.onmouseout = () => btn.style.backgroundColor = '#007bff';

    btn.addEventListener('click', () => {
        console.log("Magic AI: Open plugin button clicked.");
        togglePluginUI();
    });
    document.body.appendChild(btn);
    console.log("Magic AI: Open plugin button injected.");
}

// --- Initialization ---
// Ensure all other event listeners (copy, specific icon click) are defined before this if they are separate
if (document.readyState === "complete" || document.readyState === "interactive") {
    injectOpenPluginButton();
} else {
    window.addEventListener('load', injectOpenPluginButton, { once: true });
}

console.log("Magic AI: Content script with draggable, resizable, closable in-page UI logic loaded.");