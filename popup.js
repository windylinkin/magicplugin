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
const CODEGEN_API_URL = 'https://jiesuan.jujia618.com/system/codegen/generate_from_llm';
let authToken = null;

function displayStatus(element, message, isError) {
    element.textContent = message;
    element.className = 'status ' + (isError ? 'error' : 'success');
    element.classList.remove('hidden');
}

function toggleMagicApiOptions() {
    magicApiOptionsDiv.style.display = codeTypeEl.value === 'magic-api' ? 'block' : 'none';
}

// New function to process code and update UI
// Added a 'source' parameter to better control name suggestion logic
function processCodeAndSuggestName(code, suggestedName, source = '') {
    if (!code) return; // Do nothing if code is empty

    capturedCodeEl.value = code;

    // Automatically detect code type
    const lowerCaseCode = code.toLowerCase();
    const isHtml = /<html|<\!doctype\s+html/i.test(lowerCaseCode);
    const isMagicApi = /\/\/\s*magic-api:|db\.|request\.|response\.|env\.|magic\.|import\s+(db|http|log|request|response|env|magic);/i.test(lowerCaseCode) ||
                     // Additional patterns for magic-api like function calls or common imports
                     /import\s+org\.ssssssss/i.test(lowerCaseCode) ||
                     /return\s+db\.(select|update|insert|page|table)/i.test(lowerCaseCode) ||
                     /log\.(info|warn|error)/i.test(lowerCaseCode) ||
                     /http\.connect/i.test(lowerCaseCode) ||
                     /redis\.(set|get|hset)/i.test(lowerCaseCode) || // common redis ops
                     /mongo\.database/i.test(lowerCaseCode); // common mongo ops

    if (isHtml) {
        codeTypeEl.value = "html";
    } else if (isMagicApi) {
        codeTypeEl.value = "magic-api";
    } else {
        // If it's neither clearly HTML nor Magic-API, default to magic-api
        codeTypeEl.value = "magic-api";
    }

    // Auto-fill suggested name only if the field is empty,
    // OR if the source is from a copy button click (which implies a fresh capture),
    // OR if it's from SEND_CLIPBOARD_CONTENT (initial popup load, might be relevant text)
    if (suggestedName && suggestedName.trim().length > 0 &&
        (desiredNameEl.value.trim() === '' || source === "copy_button_click" || source === "clipboard_request_on_load")) {
        desiredNameEl.value = suggestedName;
        console.log("Magic AI: Desired name set to:", suggestedName, "Source:", source);
    } else if (suggestedName && suggestedName.trim().length > 0) {
        console.log("Magic AI: Suggested name ignored as field is not empty and not from forced source. Current name:", desiredNameEl.value.trim(), "Suggested:", suggestedName, "Source:", source);
    } else {
        console.log("Magic AI: No valid suggested name received or suggested name is empty.");
    }


    toggleMagicApiOptions();
    displayStatus(statusMessageEl, '代码已捕获并处理。', false); // Indicate success
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
        const confirmLogin = document.createElement('div');
        confirmLogin.textContent = '请先登录后再执行操作。';
        confirmLogin.style.position = 'fixed';
        confirmLogin.style.top = '50%';
        confirmLogin.style.left = '50%';
        confirmLogin.style.transform = 'translate(-50%, -50%)';
        confirmLogin.style.backgroundColor = 'white';
        confirmLogin.style.padding = '20px';
        confirmLogin.style.border = '1px solid black';
        confirmLogin.style.zIndex = '1000';
        const okButton = document.createElement('button');
        okButton.textContent = 'OK';
        okButton.onclick = () => document.body.removeChild(confirmLogin);
        confirmLogin.appendChild(okButton);
        document.body.appendChild(confirmLogin);
        return;
    }
    const codeContent = capturedCodeEl.value.trim();
    const type = codeTypeEl.value;
    const name = desiredNameEl.value.trim();
    const path = apiPathEl.value.trim();
    const method = httpMethodEl.value;
    const groupId = apiGroupIdEl.value.trim();

    if (!codeContent) { displayStatus(statusMessageEl, '错误: "捕获/粘贴的代码"不能为空。', true); return; }
    if (!name) { displayStatus(statusMessageEl, '错误: "名称"不能为空。', true); return; }
    if (type === 'magic-api' && !path) { displayStatus(statusMessageEl, '错误: Magic-API 类型需要填写 "API 路径"。', true); return; }
    if (type === 'magic-api' && (!path.startsWith("/") || path.includes(" ") || path.includes(".."))) {
        displayStatus(statusMessageEl, '错误: Magic-API 路径必须以 "/" 开头，且不能包含空格或 ".."。', true); return;
    }

    const payload = {
        codeContent: codeContent, codeType: type, desiredName: name,
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
            // console.log("Response from background:", JSON.stringify(response, null, 2)); // 调试时可以取消注释查看完整响应
            if (chrome.runtime.lastError) {
                displayStatus(statusMessageEl, `请求发送失败: ${chrome.runtime.lastError.message}`, true);
                generateButton.disabled = false;
                return;
            }

            if (response && response.success) {
                const apiResponse = response.data; // apiResponse 是后端返回的完整JSON对象

                // 检查顶层API响应是否成功
                if (apiResponse && apiResponse.code === 200 && apiResponse.data) {
                    const outerData = apiResponse.data; // 这是 { "code": 200, "message": "HTML page generated successfully.", "data": { ... } }
                    
                    // 显示来自第二层级的消息，例如 "HTML page generated successfully."
                    displayStatus(statusMessageEl, outerData.message || apiResponse.message || '操作成功！', false);

                    const actualResultData = outerData.data; // 这是 { "type": "html", "fileName": "...", "url": "...", ... }

                    let outputHtml = '';
                    if (actualResultData && actualResultData.type === 'html' && actualResultData.url) {
                        // 使用 fileName 作为链接文本（如果存在），否则使用 URL 本身
                        const linkText = actualResultData.fileName || actualResultData.url;
                        outputHtml = `<p>HTML页面: <a href="${actualResultData.url}" target="_blank" title="${actualResultData.url}">${linkText}</a></p>`;
                    } else if (actualResultData && actualResultData.type === 'magic-api' && actualResultData.apiPath) {
                        const fullApiUrl = `https://jiesuan.jujia618.com${actualResultData.apiPath}`;
                        const linkText = actualResultData.apiPath;
                        const httpMethodDisplay = actualResultData.httpMethod ? ` (${actualResultData.httpMethod})` : '';
                        outputHtml = `<p>Magic-API: <a href="${fullApiUrl}" target="_blank" title="${fullApiUrl}">${linkText}</a>${httpMethodDisplay}</p>`;
                    } else {
                        // If result type is unknown or data is incomplete
                        if (outerData.message && (!actualResultData || !actualResultData.type)) {
                             // If there's a second-level message but no deeper data or type, it might be the final message itself
                        } else {
                             displayStatus(statusMessageEl, '结果类型未知或数据不完整。', true);
                        }
                    }

                    resultLinkEl.innerHTML = outputHtml;
                    if (outputHtml) {
                        resultLinkEl.classList.remove('hidden');
                    } else {
                        resultLinkEl.classList.add('hidden');
                    }

                } else { // Top-level API response indicates a problem (e.g., apiResponse.code !== 200 or apiResponse.data doesn't exist)
                    const errorMsg = apiResponse ? (apiResponse.message || '未知API响应错误') : '未收到API响应';
                    const errorCode = apiResponse ? apiResponse.code : 'N/A';
                    displayStatus(statusMessageEl, `API调用失败: ${errorMsg} (Code: ${errorCode})`, true);
                    resultLinkEl.classList.add('hidden');
                    resultLinkEl.innerHTML = '';
                }
            } else { // response.success is false, or background.js communication error
                displayStatus(statusMessageEl, `生成失败: ${response ? response.errorMessage : '未知后端或插件通信错误'}`, true);
                resultLinkEl.classList.add('hidden');
                resultLinkEl.innerHTML = '';
            }
            generateButton.disabled = false;
        }
    );
}

// Listen for messages from content script (e.g., from copy button click)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "CODE_CAPTURED_FROM_PAGE" && capturedCodeEl && request.code) {
        // Always process if the code is new or from a copy button click.
        // The source parameter from content_script.js helps differentiate
        const currentCode = capturedCodeEl.value.trim();
        const newCode = request.code.trim();

        if (currentCode !== newCode || request.source === "copy_button_click") {
            processCodeAndSuggestName(request.code, request.suggestedName, request.source);
            sendResponse({status: "Code received and processed by popup"});
        } else {
            console.log("Magic AI Popup: Received same code or not a force-update source. Skipping processing.");
            sendResponse({status: "Code already present or not new."});
        }
    }
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

    // Request current page's selected text/simulated clipboard content from content script on popup load
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].id) {
            chrome.tabs.sendMessage(tabs[0].id, { type: "SEND_CLIPBOARD_CONTENT" }, (response) => {
                if (chrome.runtime.lastError) {
                    console.warn("Error sending message to content script:", chrome.runtime.lastError.message);
                    return;
                }
                if (response && response.success && response.code) {
                    // Pass a source to indicate this is an initial load capture
                    processCodeAndSuggestName(response.code, response.suggestedName, "clipboard_request_on_load");
                    displayStatus(statusMessageEl, '已从当前页面捕获代码。', false);
                } else if (response && !response.success) {
                    console.log("Magic AI Popup: No code from clipboard request:", response.message);
                } else {
                    console.log("Magic AI Popup: No response or malformed response from clipboard request.");
                }
            });
        }
    });

    toggleMagicApiOptions();
});

// Listen for manual input/paste changes in the textarea
capturedCodeEl.addEventListener('input', () => {
    const currentCode = capturedCodeEl.value.trim();
    // On manual input, force process and clear any previous suggested name as it's a new manual entry
    processCodeAndSuggestName(currentCode, '', "manual_input");
    displayStatus(statusMessageEl, '已手动粘贴/输入代码。', false);
});


codeTypeEl.addEventListener('change', toggleMagicApiOptions);
generateButton.addEventListener('click', handleGenerateCode);
loginButton.addEventListener('click', handleLogin);