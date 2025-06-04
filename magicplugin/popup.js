// popup.js
const capturedCodeEl = document.getElementById('capturedCode');
const codeTypeEl = document.getElementById('codeType');
const desiredNameEl = document.getElementById('desiredName');
const apiPathEl = document.getElementById('apiPath');
const httpMethodEl = document.getElementById('httpMethod');
const apiGroupIdEl = document.getElementById('apiGroupId');
const magicApiOptionsDiv = document.getElementById('magicApiOptions');
const generateButton = document.getElementById('generateButton');
const statusMessageEl = document.getElementById('statusMessage');
const resultLinkEl = document.getElementById('resultLink');
const usernameEl = document.getElementById('username');
const passwordEl = document.getElementById('password');
const loginButton = document.getElementById('loginButton');
const loginStatusEl = document.getElementById('loginStatus');

const LOGIN_API_URL = 'https://jiesuan.jujia618.com/system/security/login';
// const CODEGEN_API_URL = 'https://jiesuan.jujia618.com/system/codegen/generate_from_llm'; // Not directly used in popup.js for fetch
let authToken = null;

function displayStatus(element, message, isError) {
    element.textContent = message;
    element.className = 'status ' + (isError ? 'error' : 'success');
    element.classList.remove('hidden');
}

function showPopupNotification(message, type = 'info', duration = 3500) {
    const notificationId = 'popup-temp-notification';
    let existingNotification = document.getElementById(notificationId);
    if (existingNotification) {
        existingNotification.remove();
    }

    const notificationDiv = document.createElement('div');
    notificationDiv.id = notificationId;
    notificationDiv.innerHTML = message; // Use innerHTML to allow for simple HTML like line breaks if needed
    
    Object.assign(notificationDiv.style, {
        position: 'fixed',
        bottom: '15px',
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '12px 20px',
        borderRadius: '6px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        zIndex: '2147483647',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        fontSize: '14px',
        textAlign: 'center',
        opacity: '0',
        transition: 'opacity 0.4s ease-out, transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)',
        maxWidth: '90%'
    });

    switch (type) {
        case 'success':
            notificationDiv.style.backgroundColor = '#d1e7dd';
            notificationDiv.style.color = '#0f5132';
            notificationDiv.style.border = '1px solid #badbcc';
            break;
        case 'error':
            notificationDiv.style.backgroundColor = '#f8d7da';
            notificationDiv.style.color = '#842029';
            notificationDiv.style.border = '1px solid #f5c2c7';
            break;
        default: // info
            notificationDiv.style.backgroundColor = '#cff4fc';
            notificationDiv.style.color = '#055160';
            notificationDiv.style.border = '1px solid #b6effb';
            break;
    }

    document.body.appendChild(notificationDiv);

    setTimeout(() => {
        notificationDiv.style.opacity = '1';
        notificationDiv.style.transform = 'translateX(-50%) translateY(-10px)';
    }, 50);

    setTimeout(() => {
        notificationDiv.style.opacity = '0';
        notificationDiv.style.transform = 'translateX(-50%) translateY(20px)';
        setTimeout(() => {
            if (notificationDiv.parentElement) {
                notificationDiv.remove();
            }
        }, 400);
    }, duration);
}


function toggleMagicApiOptions() {
    magicApiOptionsDiv.style.display = codeTypeEl.value === 'magic-api' ? 'block' : 'none';
}

async function handleLogin() {
    const username = usernameEl.value.trim();
    const password = passwordEl.value;
    if (!username || !password) {
        displayStatus(loginStatusEl, '请输入用户名和密码。', true);
        return;
    }
    displayStatus(loginStatusEl, '登录中...', false);
    loginButton.disabled = true;
    try {
        if (typeof CryptoJS === 'undefined') {
            displayStatus(loginStatusEl, '加密库加载失败。', true);
            loginButton.disabled = false; return;
        }
        const hashedPassword = CryptoJS.SHA256(password).toString(CryptoJS.enc.Hex);
        const response = await fetch(LOGIN_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: username, password: hashedPassword })
        });
        const result = await response.json();
        if (response.ok && result.code === 200 && result.data) {
            authToken = result.data;
            chrome.storage.local.set({ authToken: authToken }, () => {
                displayStatus(loginStatusEl, '登录成功！Token已更新。', false);
            });
        } else {
            authToken = null;
            chrome.storage.local.remove('authToken');
            displayStatus(loginStatusEl, `登录失败: ${result.message || '未知错误'}`, true);
        }
    } catch (error) {
        authToken = null;
        chrome.storage.local.remove('authToken');
        displayStatus(loginStatusEl, `登录请求错误: ${error.message}`, true);
    } finally {
        loginButton.disabled = false;
    }
}

async function handleGenerateCode() {
    if (!authToken) {
        displayStatus(statusMessageEl, '错误: 请先登录。', true);
        showPopupNotification('请先登录后再执行生成操作。', 'error');
        return;
    }
    const codeContent = capturedCodeEl.value; // Keep full code, .trim() only for validation if needed
    const type = codeTypeEl.value;
    const name = desiredNameEl.value.trim();
    const path = apiPathEl.value.trim();
    const method = httpMethodEl.value;
    const groupId = apiGroupIdEl.value.trim();

    if (!codeContent.trim()) { displayStatus(statusMessageEl, '错误: "捕获/粘贴的代码"不能为空。', true); return; }
    if (!name) { displayStatus(statusMessageEl, '错误: "名称"不能为空。', true); return; }
    if (type === 'magic-api' && !path) { displayStatus(statusMessageEl, '错误: Magic-API 类型需要填写 "API 路径"。', true); return; }
    if (type === 'magic-api' && (!path.startsWith("/") || path.includes(" ") || path.includes(".."))) {
        displayStatus(statusMessageEl, '错误: Magic-API 路径必须以 "/" 开头，且不能包含空格或 ".."。', true); return;
    }

    const payload = {
        codeContent: codeContent, // Send full code
        codeType: type, desiredName: name,
        apiPathA: type === 'magic-api' ? path : undefined,
        httpMethod: type === 'magic-api' ? method : undefined,
        apiGroupId: type === 'magic-api' && groupId ? groupId : undefined,
    };
    displayStatus(statusMessageEl, '正在发送请求到后端...', false);
    generateButton.disabled = true;
    resultLinkEl.classList.add('hidden'); resultLinkEl.innerHTML = '';

    chrome.runtime.sendMessage(
        { type: "GENERATE_CODE", payload: payload, token: authToken },
        (response) => {
            if (chrome.runtime.lastError) {
                displayStatus(statusMessageEl, `请求发送失败: ${chrome.runtime.lastError.message}`, true);
                generateButton.disabled = false;
                return;
            }

            if (response && response.success) {
                const apiResponse = response.data;
                if (apiResponse && apiResponse.code === 200 && apiResponse.data) {
                    const outerData = apiResponse.data;
                    displayStatus(statusMessageEl, outerData.message || apiResponse.message || '操作成功！', false);
                    const actualResultData = outerData.data;
                    let outputHtml = '';
                    
                    if (actualResultData && actualResultData.type === 'html' && actualResultData.url) {
                        const linkText = actualResultData.fileName || actualResultData.url;
                        const generatedUrl = actualResultData.url;
                        const copyPromptText = `我把上面的html页面发布到了 ${generatedUrl}`;

                        outputHtml = `<p><strong>🎉 页面生成成功!</strong></p>`;
                        outputHtml += `<p>链接: <a href="${generatedUrl}" target="_blank" title="${generatedUrl}">${linkText}</a></p>`;
                        outputHtml += `<p style="font-size:0.9em; color:#333;">提示已复制: <span style="font-style:italic; color:#555;">"${copyPromptText}"</span></p>`;
                        
                        navigator.clipboard.writeText(copyPromptText).then(() => {
                            showPopupNotification('成功提示已复制到剪贴板！<br>链接已显示在弹窗内。', 'success', 4000);
                        }).catch(err => {
                            console.error('Failed to copy prompt: ', err);
                            showPopupNotification('自动复制提示词失败。请手动复制。<br>链接已显示在弹窗内。', 'error', 4000);
                        });

                    } else if (actualResultData && actualResultData.type === 'magic-api' && actualResultData.apiPath) {
                        const fullApiUrl = `https://jiesuan.jujia618.com${actualResultData.apiPath}`;
                        const linkText = actualResultData.apiPath;
                        const httpMethodDisplay = actualResultData.httpMethod ? ` (${actualResultData.httpMethod})` : '';
                        outputHtml = `<p>Magic-API: <a href="${fullApiUrl}" target="_blank" title="${fullApiUrl}">${linkText}</a>${httpMethodDisplay}</p>`;
                        showPopupNotification('Magic-API 生成成功！链接已显示。', 'success');
                    } else {
                         if (outerData.message && (!actualResultData || !actualResultData.type)) {
                             // This is okay, means the message from outerData is the final one.
                        } else {
                             displayStatus(statusMessageEl, '结果类型未知或数据不完整。', true);
                        }
                    }
                    resultLinkEl.innerHTML = outputHtml;
                    if (outputHtml) resultLinkEl.classList.remove('hidden');
                    else resultLinkEl.classList.add('hidden');

                } else {
                    const errorMsg = apiResponse ? (apiResponse.message || '未知API响应错误') : '未收到API响应';
                    const errorCode = apiResponse ? apiResponse.code : 'N/A';
                    displayStatus(statusMessageEl, `API调用失败: ${errorMsg} (Code: ${errorCode})`, true);
                    resultLinkEl.classList.add('hidden'); resultLinkEl.innerHTML = '';
                }
            } else {
                displayStatus(statusMessageEl, `生成失败: ${response ? response.errorMessage : '未知后端或插件通信错误'}`, true);
                resultLinkEl.classList.add('hidden'); resultLinkEl.innerHTML = '';
            }
            generateButton.disabled = false;
        }
    );
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "CODE_CAPTURED_FROM_PAGE" && capturedCodeEl && request.code) {
        capturedCodeEl.value = request.code; // Ensure full code is set
        const codeLowerCase = request.code.toLowerCase();
        const isHtml = /<html|<\!doctype\s+html|<body/i.test(codeLowerCase);
        const isMagicApi = /\/\/\s*magic-api:|db\.|request\./i.test(codeLowerCase);
        
        let autoGenerate = false;

        if (isHtml) {
            codeTypeEl.value = "html";
            let pageTitle = '';
            try {
                // Basic title extraction, robust parsing might be heavier for a popup
                const titleMatch = request.code.match(/<title[^>]*>([^<]+)<\/title>/i);
                if (titleMatch && titleMatch[1] && titleMatch[1].trim()) {
                    pageTitle = titleMatch[1].trim();
                }
            } catch (e) {
                console.warn("Error extracting title from HTML string:", e);
            }

            if (pageTitle) {
                desiredNameEl.value = pageTitle;
            } else {
                desiredNameEl.value = `GeneratedPage_${Date.now()}`;
            }
            autoGenerate = true; // Mark for auto-generation
        } else if (isMagicApi) {
            codeTypeEl.value = "magic-api";
            // Optionally, try to infer a name for Magic-API if desired, or leave manual
            if (!desiredNameEl.value.trim()) { // If name is empty, suggest one
                 const firstLine = request.code.split('\n')[0];
                 if (firstLine.toLowerCase().includes('function')) {
                     const funcNameMatch = firstLine.match(/function\s+([a-zA-Z0-9_]+)/i);
                     if (funcNameMatch && funcNameMatch[1]) {
                        desiredNameEl.value = funcNameMatch[1];
                     }
                 } else if (firstLine.toLowerCase().includes('magic-api:')) {
                    const commentNameMatch = firstLine.match(/magic-api:\s*([^\s(]+)/i);
                    if (commentNameMatch && commentNameMatch[1]) {
                        desiredNameEl.value = commentNameMatch[1];
                    }
                 }
                 if (!desiredNameEl.value.trim()) {
                    desiredNameEl.value = `GeneratedApi_${Date.now()}`;
                 }
            }
        }
        toggleMagicApiOptions();
        sendResponse({status: "Code received and processed by popup"});

        if (autoGenerate) {
            // Ensure login token is available before auto-generating
            chrome.storage.local.get(['authToken'], (result) => {
                if (result.authToken) {
                    authToken = result.authToken; // Ensure authToken is fresh for this scope
                    setTimeout(() => { // Short delay to allow UI to potentially update from above
                        handleGenerateCode();
                    }, 100);
                } else {
                    displayStatus(statusMessageEl, 'HTML detected. 请先登录以自动生成。', true);
                    showPopupNotification('HTML代码已捕获，请登录后手动点击“生成”。', 'info', 4000);
                }
            });
        }
    }
    return true; // Indicate async response if sendResponse might be called later.
});

document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.local.get(['authToken'], (result) => {
        if (result.authToken) {
            authToken = result.authToken;
            displayStatus(loginStatusEl, '已登录 (Token已加载)。', false);
        } else {
            displayStatus(loginStatusEl, '未登录。请先登录。', true);
        }
    });
    toggleMagicApiOptions();

    // Set default username if not already set (example)
    if (!usernameEl.value) {
        usernameEl.value = "admin";
    }
});
codeTypeEl.addEventListener('change', toggleMagicApiOptions);
generateButton.addEventListener('click', handleGenerateCode);
loginButton.addEventListener('click', handleLogin);

// If popup is opened by content script's iframe message for close:
window.addEventListener('message', function(event) {
    // Optional: Check event.origin for security if the message could come from elsewhere
    if (event.data && event.data.type === 'magicPluginCloseRequestFromContent') {
        // The popup itself doesn't "close" in the same way an iframe modal does.
        // This is more for if the iframe (popup.html) wants to tell its parent (content_script) to close the modal.
        // However, if the popup logic needs to react to such a message, it can.
        // For now, this is not directly used for the user's request but kept for structural context.
    }
});

// To tell the content script to close the iframe modal if the user clicks a conceptual "close" within the popup
// (if this popup is indeed inside an iframe managed by content_script).
// This is not the standard browser action popup behavior.
// This part is more relevant if popup.html is used *as an iframe source* by content_script.
// For the standard browser action popup, users close it by clicking away or the extension icon again.
function requestCloseFromIframe() {
    if (window.parent !== window) { // Check if inside an iframe
        window.parent.postMessage({ type: 'magicPluginCloseRequest' }, '*'); // Adjust target origin if known
    }
}
// Example: You could have a close button in popup.html that calls requestCloseFromIframe()
// <button id="closePluginButton">关闭插件视图</button>
// document.getElementById('closePluginButton')?.addEventListener('click', requestCloseFromIframe);