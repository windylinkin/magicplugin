// Ensure the DOM is fully loaded before running the script
document.addEventListener('DOMContentLoaded', () => {
    // Get references to the input fields and buttons from the popup HTML
    const nameInput = document.getElementById('name');
    const codeInput = document.getElementById('code');
    const createBtn = document.getElementById('createBtn');
    const messageDiv = document.getElementById('message'); 

    // Function to display messages to the user
    function showMessage(text, type = 'info') {
        if (messageDiv) {
            messageDiv.textContent = text;
            messageDiv.className = type; // Apply 'success' or 'error' class for styling
            messageDiv.style.display = 'block';
            console.log(`Message to user: ${text} (type: ${type})`);
        } else {
            // Fallback if messageDiv is not found in the HTML
            console.log(`Message area (id='message') not found. UI Message: ${text} (type: ${type})`);
        }
    }
    
    // Initial check for essential elements
    if (!codeInput) {
        const errorMsg = "关键元素 'codeInput' (id='code') 未在 popup.html 中找到。粘贴功能将无法工作。";
        console.error(errorMsg);
        if (messageDiv) showMessage("错误: 代码输入区域未找到!", 'error');
        else alert(errorMsg); // Fallback alert if messageDiv is also missing
        return; // Stop further execution if codeInput is missing as it's critical
    }
    if (!nameInput) {
        console.warn("元素 'nameInput' (id='name') 未在 popup.html 中找到。将无法自动填充名称。");
    }
    if (!createBtn) {
        const errorMsg = "关键元素 'createBtn' (id='createBtn') 未在 popup.html 中找到。创建链接功能将无法工作。";
        console.error(errorMsg);
        if (messageDiv) showMessage("错误: 创建按钮未找到!", 'error');
    }
    if (!messageDiv) {
        console.warn("元素 'messageDiv' (id='message') 未在 popup.html 中找到。状态消息将仅输出到控制台。");
    }


    // Function to create and show a temporary notification at the bottom of the popup
    function showTemporaryNotification(message, duration = 3000) {
        let notificationElement = document.getElementById('clipboardNotification');
        if (!notificationElement) {
            notificationElement = document.createElement('div');
            notificationElement.id = 'clipboardNotification';
            // Basic styling for the notification
            notificationElement.style.position = 'fixed';
            notificationElement.style.bottom = '10px';
            notificationElement.style.left = '50%';
            notificationElement.style.transform = 'translateX(-50%)';
            notificationElement.style.padding = '10px 20px';
            notificationElement.style.backgroundColor = '#28a745'; // Green background
            notificationElement.style.color = 'white';
            notificationElement.style.borderRadius = '5px';
            notificationElement.style.zIndex = '10000';
            notificationElement.style.fontSize = '14px';
            notificationElement.style.opacity = '0';
            notificationElement.style.transition = 'opacity 0.5s ease-in-out';
            document.body.appendChild(notificationElement);
        }

        notificationElement.textContent = message;
        notificationElement.style.display = 'block';
        void notificationElement.offsetWidth; 
        notificationElement.style.opacity = '1';

        setTimeout(() => {
            notificationElement.style.opacity = '0';
            setTimeout(() => {
                if (notificationElement.parentNode) {
                    notificationElement.parentNode.removeChild(notificationElement);
                }
            }, 500); 
        }, duration);
    }

    // Function to display a modal with the generated link
    function showLinkModal(link) {
        let modal = document.getElementById('generatedLinkModal');
        if (modal && modal.parentNode) { 
            modal.parentNode.removeChild(modal);
        }

        modal = document.createElement('div');
        modal.id = 'generatedLinkModal';
        modal.style.position = 'fixed';
        modal.style.top = '50%';
        modal.style.left = '50%';
        modal.style.transform = 'translate(-50%, -50%)';
        modal.style.padding = '20px';
        modal.style.backgroundColor = 'white';
        modal.style.border = '1px solid #ccc';
        modal.style.borderRadius = '8px';
        modal.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
        modal.style.zIndex = '10001';
        modal.style.textAlign = 'center';
        modal.style.minWidth = '300px';

        const linkTextElement = document.createElement('p');
        linkTextElement.style.marginBottom = '15px';
        linkTextElement.style.fontSize = '16px';
        linkTextElement.style.wordBreak = 'break-all'; // Ensure long links wrap
        linkTextElement.innerHTML = `链接已生成: <br><a href="${link}" target="_blank" style="color: #007bff; text-decoration: underline;">${link}</a>`;
        modal.appendChild(linkTextElement);

        const closeButton = document.createElement('button');
        closeButton.textContent = '关闭';
        closeButton.style.padding = '8px 15px';
        closeButton.style.border = 'none';
        closeButton.style.borderRadius = '4px';
        closeButton.style.backgroundColor = '#007bff';
        closeButton.style.color = 'white';
        closeButton.style.cursor = 'pointer';
        closeButton.onclick = () => {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        };
        modal.appendChild(closeButton);
        document.body.appendChild(modal);
    }

    // Function to copy text to clipboard
    function copyToClipboard(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'absolute'; 
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        textarea.setSelectionRange(0, textarea.value.length); 

        try {
            const success = document.execCommand('copy');
            if (success) {
                showTemporaryNotification('这段文字已经赋值到粘贴板');
                console.log('成功复制到剪贴板:', text);
            } else {
                showTemporaryNotification('复制到剪贴板失败 (execCommand返回false)', 3000);
                console.error('execCommand copy returned false.');
            }
        } catch (err) {
            console.error('无法复制到剪贴板:', err);
            showTemporaryNotification('复制到剪贴板失败', 3000); 
        }
        document.body.removeChild(textarea);
    }

    // Listen for paste events on the code input field
    if (codeInput) {
        codeInput.addEventListener('paste', (event) => {
            console.log('Paste event triggered on codeInput.');
            event.preventDefault(); 
            
            let pastedContent = '';
            const clipboardData = event.clipboardData || window.clipboardData;

            if (clipboardData) {
                console.log('Available clipboard types:', clipboardData.types ? Array.from(clipboardData.types) : 'N/A');
                if (clipboardData.types && Array.from(clipboardData.types).includes('text/html')) {
                    pastedContent = clipboardData.getData('text/html');
                    console.log('Pasted as text/html (first 200 chars):', pastedContent.substring(0,200) + (pastedContent.length > 200 ? "..." : ""));
                } else if (clipboardData.types && Array.from(clipboardData.types).includes('text/plain')) {
                    pastedContent = clipboardData.getData('text/plain');
                    console.log('Pasted as text/plain (first 200 chars):', pastedContent.substring(0,200) + (pastedContent.length > 200 ? "..." : ""));
                } else { 
                     pastedContent = clipboardData.getData('text'); 
                     console.log('Pasted as default text (first 200 chars):', pastedContent.substring(0,200) + (pastedContent.length > 200 ? "..." : ""));
                }
            } else {
                console.error('Clipboard data is not available.');
                showMessage('无法访问剪贴板数据。', 'error');
                return;
            }
            
            if (!pastedContent || !pastedContent.trim()) {
                console.warn('Pasted content is empty or whitespace.');
                showMessage('粘贴的内容为空。', 'warning');
                codeInput.value = pastedContent; 
                return; 
            }

            codeInput.value = pastedContent; 

            let pageTitle = '';
            try {
                const parser = new DOMParser();
                const doc = parser.parseFromString(pastedContent, 'text/html');
                const titleElement = doc.querySelector('title');
                if (titleElement && titleElement.textContent) {
                    pageTitle = titleElement.textContent.trim();
                    console.log('使用 DOMParser 提取的标题:', pageTitle);
                } else {
                    console.log('DOMParser 未找到标题, 尝试使用正则表达式。');
                    const titleMatch = pastedContent.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i);
                    if (titleMatch && titleMatch[1]) {
                        pageTitle = titleMatch[1].trim();
                        console.log('使用正则表达式提取的标题:', pageTitle);
                    } else {
                        console.log('未在粘贴内容中找到标题。');
                    }
                }
            } catch (e) {
                console.error('提取标题时出错:', e);
                try {
                    const titleMatch = pastedContent.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i);
                    if (titleMatch && titleMatch[1]) {
                        pageTitle = titleMatch[1].trim();
                        console.log('发生错误后，使用正则表达式提取的标题:', pageTitle);
                    }
                } catch (regexError) {
                    console.error('正则表达式提取标题也失败:', regexError);
                }
            }

            if (nameInput) {
                if (pageTitle) {
                    nameInput.value = pageTitle;
                } else {
                    const randomName = '页面-' + Date.now();
                    nameInput.value = randomName; 
                    console.log('已生成随机名称:', randomName);
                }
            } else {
                 console.error('名称输入框 (id="name") 未找到。');
            }
            
            if (createBtn) {
                console.log('尝试自动点击创建按钮。');
                createBtn.disabled = false; 
                createBtn.click();
            } else {
                console.error('创建按钮 (id="createBtn") 未找到，无法自动点击。');
                showMessage('创建按钮未找到', 'error');
            }
        });
    } 

    // Event listener for the create button click
    if (createBtn) {
        createBtn.addEventListener('click', async () => {
            console.log('创建按钮被点击。');
            const name = nameInput ? nameInput.value.trim() : '未命名页面';
            const code = codeInput ? codeInput.value : ''; 

            if (!code) { 
                showMessage('代码内容不能为空!', 'error');
                console.warn('创建尝试失败: 代码内容为空。');
                return;
            }
            if (!name) {
                showMessage('名称不能为空!', 'error');
                console.warn('创建尝试失败: 名称为空。');
                return;
            }

            const timestamp = Date.now().toString();
            const randomStr = Math.random().toString(36).substring(2, 12);
            const secret = 'secret'; 
            const signInput = timestamp + randomStr + secret;
            const sign = CryptoJS.MD5(signInput).toString();
            console.log(`签名参数: timestamp=${timestamp}, random_str=${randomStr}, secret=${secret}, combined=${signInput}, sign=${sign}`);

            const requestData = {
                name: name,
                content: code,
                timestamp: timestamp,
                random_str: randomStr,
                sign: sign,
            };
            console.log('发送到API的请求数据 (内容截断显示):', { ...requestData, content: requestData.content.substring(0, 200) + (requestData.content.length > 200 ? "..." : "") });


            showMessage('正在创建链接...', 'info');
            createBtn.disabled = true; 

            try {
                const response = await fetch('https://api.link3.cc/api/v1/links_custom', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestData),
                });
                console.log('API响应状态:', response.status);
                const responseText = await response.text(); 
                console.log('API原始响应文本:', responseText);

                let data;
                try {
                    data = JSON.parse(responseText); 
                } catch (jsonError) {
                    console.error('API响应不是有效的JSON:', jsonError);
                    showMessage(`创建链接失败: 服务器响应格式错误。 (${response.status})`, 'error');
                    createBtn.disabled = false;
                    return;
                }

                if (response.ok && data && data.url) {
                    showMessage('链接创建成功!', 'success');
                    console.log('API成功响应:', data);
                    
                    const generatedLink = data.url;
                    const promptText = `我把上面的html页面发布到了${generatedLink}链接地址${generatedLink}`;

                    showLinkModal(generatedLink);
                    copyToClipboard(promptText);

                } else {
                    const errorMessage = data.message || data.msg || `创建链接失败，请稍后再试。 (状态码: ${response.status})`;
                    showMessage(errorMessage, 'error');
                    console.error('API错误响应:', data);
                }
            } catch (error) {
                showMessage('创建链接时发生网络错误或脚本错误。', 'error');
                console.error('Fetch或脚本执行错误:', error);
            } finally {
                createBtn.disabled = false; 
            }
        });
    } 
});
