// content_script.js (带调试日志的版本)
console.log("Magic AI: Content Script Loaded and Running. Timestamp:", new Date().toLocaleTimeString());

function findCodeInPage() {
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
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
        bestCode = selection.toString();
    }
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

// Function to extract a name from the page title or provided code (Enhanced for HTML title)
function extractNameFromTitleOrCode(codeContent = '') {
    const pageTitle = document.title;
    console.log("Magic AI: Page title for name extraction (original):", pageTitle);
    console.log("Magic AI: Code content for name extraction (first 100 chars):", codeContent.substring(0, 100));

    // Helper to apply common name cleaning and capitalization
    const cleanAndCapitalize = (name) => {
        if (!name || name.trim().length === 0) return "";
        let cleaned = name.trim();
        // Remove common ending phrases (e.g., "- 文档", "教程", "页面")
        cleaned = cleaned.replace(/(?:\s*[-–—]\s*)?(文档|教程|指南|介绍|详情|页面)$/i, '').trim();
        // Remove common leading prefixes (e.g., "Magic-API ", "API ", "Web ", "App ")
        cleaned = cleaned.replace(/^(?:magic-api\s*|API\s*|Web\s*|App\s*)/i, '').trim();
        // Capitalize first letter of each word
        return cleaned.replace(/\b\w/g, char => char.toUpperCase());
    };

    // 1. Try to extract from provided HTML code first (Highest priority for HTML title)
    if (codeContent) {
        const isHtmlCode = /<html|<\!doctype\s+html/i.test(codeContent.toLowerCase());
        if (isHtmlCode) {
            const titleMatch = codeContent.match(/<title>(.*?)<\/title>/i);
            if (titleMatch && titleMatch[1]) {
                let htmlTitle = titleMatch[1].trim();
                console.log("Magic AI: Extracted HTML title from code (raw):", htmlTitle);
                
                // Apply cleaning and capitalization specific to HTML title
                let processedHtmlTitle = cleanAndCapitalize(htmlTitle);
                if (processedHtmlTitle.length > 0 && processedHtmlTitle.length <= 100) {
                    console.log("Magic AI: Final extracted HTML title from code (processed):", processedHtmlTitle);
                    return processedHtmlTitle;
                }
            }
        }
    }

    // 2. Fallback to current page title (for non-HTML code or if HTML title not found)
    // This part should also use the refined cleaning helper
    let suggestedNameFromPageTitle = cleanAndCapitalize(pageTitle);
    if (suggestedNameFromPageTitle.length > 0 && suggestedNameFromPageTitle.length <= 100) {
        console.log("Magic AI: Final extracted from Page Title (processed):", suggestedNameFromPageTitle);
        return suggestedNameFromPageTitle;
    }

    console.log("Magic AI: No suitable name extracted.");
    return "";
}


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Magic AI: Message received in content_script:", request);
    if (request.type === "REQUEST_CODE_FROM_PAGE_VIA_CONTENT_SCRIPT") {
        const code = findCodeInPage(); // This is the selected text or pre/code block content
        if (code) {
            // Pass the code content to the extraction function
            sendResponse({ success: true, code: code, suggestedName: extractNameFromTitleOrCode(code) });
        } else {
            sendResponse({ success: false, message: "No suitable code blocks or selected text found on the page." });
        }
        return true; // Keep the message channel open for async response
    } else if (request.type === "SEND_CLIPBOARD_CONTENT") {
        const code = window.getSelection().toString().trim(); // This is the selected text
        if (code) {
            // Pass the selected text to the extraction function
            sendResponse({ success: true, code: code, suggestedName: extractNameFromTitleOrCode(code) });
        } else {
            sendResponse({ success: false, message: "No text selected to simulate clipboard content." });
        }
        return true;
    }
});

document.addEventListener('click', function(event) {
    const targetIcon = event.target.closest('mat-icon[fonticon="content_copy"], mat-icon[data-mat-icon-name="content_copy"]');
    if (targetIcon) {
        console.log("Magic AI: Detected click on a 'content_copy' mat-icon:", targetIcon);
        setTimeout(() => {
            const codeToCapture = findCodeInPage(); // This is the code captured by the button click
            console.log("Magic AI: Code to capture after icon click:", codeToCapture ? codeToCapture.substring(0,100) + "..." : "NO_CODE_FOUND", "Length:", codeToCapture.length);
            if (codeToCapture) {
                // Pass the captured code to the extraction function
                const suggestedName = extractNameFromTitleOrCode(codeToCapture);
                chrome.runtime.sendMessage({ type: "CODE_CAPTURED_FROM_PAGE", code: codeToCapture, suggestedName: suggestedName, source: "copy_button_click" }, (response) => {
                    console.log("Magic AI: sendMessage callback for copy button. Response:", response, "LastError:", chrome.runtime.lastError);
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
                console.log("Magic AI: Copy icon clicked, but no code found by findCodeInPage.");
            }
        }, 100);
    }
}, true);
console.log("Magic AI: 'click' event listener for mat-icon added.");


// content_script.js (扩展iframe模态框功能)

let pluginIframe = null;
let iframeOverlay = null;
let iframeContainer = null;
const IFRAME_ID = 'magic-ai-plugin-iframe';
const OVERLAY_ID = 'magic-ai-plugin-overlay';
const CONTAINER_ID = 'magic-ai-plugin-container';
const HEADER_ID = 'magic-ai-plugin-header';
const RESIZE_HANDLE_ID = 'magic-ai-plugin-resize-handle';
const OPEN_BUTTON_ID = 'magic-ai-open-plugin-button';

let isDragging = false;
let dragOffsetX, dragOffsetY;

let isResizing = false;
let resizeInitialWidth, resizeInitialHeight, resizeInitialMouseX, resizeInitialMouseY;
const MIN_PLUGIN_WIDTH = 350;
const MIN_PLUGIN_HEIGHT = 300;

function createPluginModalStructure() {
    if (document.getElementById(CONTAINER_ID)) {
        return;
    }
    console.log("Magic AI: Creating plugin modal structure.");

    iframeOverlay = document.createElement('div');
    iframeOverlay.id = OVERLAY_ID;
    Object.assign(iframeOverlay.style, {
        position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.4)', zIndex: '2147483645', display: 'none'
    });
    document.body.appendChild(iframeOverlay);
    iframeOverlay.addEventListener('click', () => togglePluginUI(false));

    iframeContainer = document.createElement('div');
    iframeContainer.id = CONTAINER_ID;
    Object.assign(iframeContainer.style, {
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '440px',
        height: '630px',
        zIndex: '2147483646', boxShadow: '0 5px 25px rgba(0,0,0,0.25)',
        borderRadius: '8px', overflow: 'hidden', display: 'none',
        backgroundColor: '#ffffff',
        display: 'flex', flexDirection: 'column'
    });

    const headerDiv = document.createElement('div');
    headerDiv.id = HEADER_ID;
    Object.assign(headerDiv.style, {
        height: '35px', backgroundColor: '#f0f0f0', cursor: 'move',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 10px', borderBottom: '1px solid #e0e0e0',
        userSelect: 'none'
    });

    const titleSpan = document.createElement('span');
    titleSpan.textContent = "Magic AI 代码生成器";
    titleSpan.style.fontWeight = '500';
    titleSpan.style.color = '#333';
    headerDiv.appendChild(titleSpan);

    const closeButton = document.createElement('button');
    closeButton.innerHTML = '&times;';
    Object.assign(closeButton.style, {
        background: 'transparent', border: 'none', fontSize: '22px',
        cursor: 'pointer', color: '#555', padding: '0 5px', lineHeight: '1'
    });
    closeButton.addEventListener('click', (e) => {
        e.stopPropagation();
        togglePluginUI(false);
    });
    headerDiv.appendChild(closeButton);
    iframeContainer.appendChild(headerDiv);

    pluginIframe = document.createElement('iframe');
    pluginIframe.id = IFRAME_ID;
    pluginIframe.src = chrome.runtime.getURL('popup.html');
    Object.assign(pluginIframe.style, {
        flexGrow: '1',
        border: 'none', display: 'block', width: '100%'
    });
    iframeContainer.appendChild(pluginIframe);

    const resizeHandle = document.createElement('div');
    resizeHandle.id = RESIZE_HANDLE_ID;
    Object.assign(resizeHandle.style, {
        width: '14px', height: '14px',
        backgroundImage: 'linear-gradient(135deg, #aaa 25%, transparent 25%, transparent 50%, #aaa 50%, #aaa 75%, transparent 75%, transparent)',
        position: 'absolute', right: '0px', bottom: '0px', cursor: 'se-resize', zIndex: '1'
    });
    iframeContainer.appendChild(resizeHandle);

    document.body.appendChild(iframeContainer);

    headerDiv.addEventListener('mousedown', onDragMouseDown);
    resizeHandle.addEventListener('mousedown', onResizeMouseDown);

    window.addEventListener('message', function(event) {
        if (event.source !== pluginIframe.contentWindow) return;
        if (event.data && event.data.type === 'magicPluginCloseRequest') {
            togglePluginUI(false);
        }
    });
}

function onDragMouseDown(e) {
    if (e.target.tagName === 'BUTTON' || e.target.parentNode.tagName === 'BUTTON') return;

    isDragging = true;
    iframeContainer.style.userSelect = 'none';

    if (iframeContainer.style.transform.includes('translate')) {
        const rect = iframeContainer.getBoundingClientRect();
        iframeContainer.style.left = `${rect.left}px`;
        iframeContainer.style.top = `${rect.top}px`;
        iframeContainer.style.transform = '';
    }
    dragOffsetX = e.clientX - iframeContainer.offsetLeft;
    dragOffsetY = e.clientY - iframeContainer.offsetTop;

    document.addEventListener('mousemove', onDragMouseMove);
    document.addEventListener('mouseup', onDragMouseUp);
}

function onDragMouseMove(e) {
    if (!isDragging) return;
    let newX = e.clientX - dragOffsetX;
    let newY = e.clientY - dragOffsetY;

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
    iframeContainer.style.userSelect = 'none';

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
    newHeight = Math.max(MIN_PLUGIN_HEIGHT + headerHeight, newHeight);

    iframeContainer.style.width = `${newWidth}px`;
    iframeContainer.style.height = `${newHeight}px`;
}

function onResizeMouseUp() {
    isResizing = false;
    iframeContainer.style.userSelect = '';
    document.removeEventListener('mousemove', onResizeMouseMove);
    document.removeEventListener('mouseup', onResizeMouseUp);
}

function togglePluginUI(forceState) {
    if (!iframeContainer || !iframeOverlay) {
        if (forceState === true || (typeof forceState === 'undefined' && (!iframeContainer || iframeContainer.style.display === 'none'))) {
            createPluginModalStructure();
             setTimeout(() => {
                if (iframeContainer && iframeOverlay) {
                    iframeOverlay.style.display = 'block';
                    iframeContainer.style.display = 'flex';
                    console.log("Magic AI: Plugin UI (iframe) shown.");
                }
             }, 0);
        }
        return;
    }

    const shouldBeVisible = typeof forceState !== 'undefined' ? forceState : iframeContainer.style.display === 'none';

    if (shouldBeVisible) {
        iframeOverlay.style.display = 'block';
        iframeContainer.style.display = 'flex';
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

if (document.readyState === "complete" || document.readyState === "interactive") {
    injectOpenPluginButton();
} else {
    window.addEventListener('load', injectOpenPluginButton, { once: true });
}

console.log("Magic AI: Content script with draggable, resizable, closable in-page UI logic loaded.");