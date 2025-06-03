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
        // Consider using a custom modal instead of alert for better UX in extensions
        // For now, alert is kept as per original code, but it's not ideal.
        // A custom modal would be part of the popup's HTML/CSS.
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
        apiPath: type === 'magic-api' ? path : undefined,
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
                generateButton.disabled = false; return;
            }
            if (response && response.success) {
                const resData = response.data.data; // Accessing the innermost data
                displayStatus(statusMessageEl, resData.message || '代码已成功部署！', false);
                let outputHtml = '';
                if (resData.type === 'html' && resData.url) {
                    outputHtml = `<p>HTML页面: <a href="${resData.url}" target="_blank">${resData.url}</a></p>`;
                } else if (resData.type === 'magic-api' && resData.apiPath) {
                    const fullApiUrl = `https://jiesuan.jujia618.com${resData.apiPath}`;
                    outputHtml = `<p>Magic-API: <a href="${fullApiUrl}" target="_blank">${resData.apiPath}</a> (${resData.httpMethod})</p>`;
                }
                resultLinkEl.innerHTML = outputHtml;
                resultLinkEl.classList.remove('hidden');
            } else {
                displayStatus(statusMessageEl, `生成失败: ${response ? response.errorMessage : '未知后端错误'}`, true);
            }
            generateButton.disabled = false;
        }
    );
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "CODE_CAPTURED_FROM_PAGE" && capturedCodeEl && request.code) {
        capturedCodeEl.value = request.code;
        const code = request.code.toLowerCase();
        const isHtml = /<html|<\!doctype\s+html/i.test(code);
        const isMagicApi = /\/\/\s*magic-api:|db\.|request\./i.test(code);
        if (isHtml) codeTypeEl.value = "html";
        else if (isMagicApi) codeTypeEl.value = "magic-api";
        toggleMagicApiOptions();
        sendResponse({status: "Code received and processed by popup"});
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
    toggleMagicApiOptions();
});
codeTypeEl.addEventListener('change', toggleMagicApiOptions);
generateButton.addEventListener('click', handleGenerateCode);
loginButton.addEventListener('click', handleLogin);
