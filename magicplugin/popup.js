// Ensure the DOM is fully loaded before running the script
document.addEventListener('DOMContentLoaded', () => {
    // Get references to the input fields and buttons from the popup HTML
    const nameInput = document.getElementById('name');
    const codeInput = document.getElementById('code');
    const createBtn = document.getElementById('createBtn');
    const messageDiv = document.getElementById('message'); // For displaying messages to the user

    // Function to display messages to the user
    function showMessage(text, type = 'info') {
        if (messageDiv) {
            messageDiv.textContent = text;
            messageDiv.className = type; // Apply 'success' or 'error' class for styling
            messageDiv.style.display = 'block';
        } else {
            console.log("Message area not found, console logging: ", text);
        }
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
        // Force reflow to ensure transition is applied
        void notificationElement.offsetWidth; 
        notificationElement.style.opacity = '1';

        // Hide and remove the notification after the specified duration
        setTimeout(() => {
            notificationElement.style.opacity = '0';
            setTimeout(() => {
                if (notificationElement.parentNode) {
                    notificationElement.parentNode.removeChild(notificationElement);
                }
            }, 500); // Wait for fade out transition to complete
        }, duration);
    }

    // Function to display a modal with the generated link
    function showLinkModal(link) {
        let modal = document.getElementById('generatedLinkModal');
        if (modal && modal.parentNode) { // Remove existing modal if any
            modal.parentNode.removeChild(modal);
        }

        modal = document.createElement('div');
        modal.id = 'generatedLinkModal';
        // Styling for the modal
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
        modal.style.minWidth = '300px'; // Ensure modal is wide enough

        const linkTextElement = document.createElement('p');
        linkTextElement.style.marginBottom = '15px';
        linkTextElement.style.fontSize = '16px';
        linkTextElement.innerHTML = \`链接已生成: <br><a href="${link}" target="_blank" style="color: #007bff; text-decoration: underline;">${link}</a>\`;
        modal.appendChild(linkTextElement);

        const closeButton = document.createElement('button');
        closeButton.textContent = '关闭';
        // Styling for the close button
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
        textarea.style.position = 'absolute'; // Prevent screen scroll
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        textarea.setSelectionRange(0, textarea.value.length); // For mobile devices

        try {
            document.execCommand('copy');
            showTemporaryNotification('这段文字已经赋值到粘贴板');
        } catch (err) {
            console.error('无法复制到剪贴板:', err);
            showTemporaryNotification('复制到剪贴板失败', 3000); // Show error for a bit longer
        }
        document.body.removeChild(textarea);
    }

    // Listen for paste events on the code input field
    if (codeInput) {
        codeInput.addEventListener('paste', (event) => {
            event.preventDefault(); // Prevent default paste behavior to control the input
            const pastedHtml = (event.clipboardData || window.clipboardData).getData('text');
            
            // Ensure full HTML is kept in the codeInput
            codeInput.value = pastedHtml; 

            // Attempt to extract title from the pasted HTML using regex
            let pageTitle = '';
            try {
                const titleMatch = pastedHtml.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i);
                if (titleMatch && titleMatch[1]) {
                    pageTitle = titleMatch[1].trim();
                }
            } catch (e) {
                console.error('提取标题时出错:', e);
            }

            // Set the name input field value
            if (nameInput) {
                if (pageTitle) {
                    nameInput.value = pageTitle;
                } else {
                    // Generate a random name if title is not found
                    nameInput.value = '页面-' + Date.now(); 
                }
            }
            
            // Automatically trigger the create button click if it exists
            if (createBtn) {
                createBtn.click();
            } else {
                console.error('创建按钮未找到');
                showMessage('创建按钮未找到', 'error');
            }
        });
    } else {
        console.error("Code input field not found");
    }


    // Event listener for the create button click
    if (createBtn) {
        createBtn.addEventListener('click', async () => {
            // Get the values from the input fields
            const name = nameInput ? nameInput.value : '未命名页面';
            const code = codeInput ? codeInput.value : '';

            // Basic validation: ensure code content is not empty
            if (!code.trim()) {
                showMessage('代码内容不能为空!', 'error');
                return;
            }
            if (!name.trim()) {
                showMessage('名称不能为空!', 'error');
                return;
            }


            // Prepare data for the API request
            const timestamp = Date.now().toString();
            const randomStr = Math.random().toString(36).substring(2, 12);
            const secret = 'secret'; // Replace with your actual secret key if needed
            const sign = CryptoJS.MD5(timestamp + randomStr + secret).toString();

            const requestData = {
                name: name,
                content: code,
                timestamp: timestamp,
                random_str: randomStr,
                sign: sign,
            };

            // Show loading/processing message
            showMessage('正在创建链接...', 'info');
            createBtn.disabled = true; // Disable button during API call

            try {
                // Make the API request to create the custom link
                const response = await fetch('https://api.link3.cc/api/v1/links_custom', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestData),
                });

                // Parse the JSON response from the API
                const data = await response.json();

                if (response.ok && data && data.url) {
                    // If the request was successful and data contains a URL
                    showMessage('链接创建成功!', 'success');
                    
                    const generatedLink = data.url;
                    const promptText = \`我把上面的html页面发布到了${generatedLink}链接地址${generatedLink}\`;

                    // Show the link in a modal
                    showLinkModal(generatedLink);
                    // Copy the prompt text to clipboard
                    copyToClipboard(promptText);

                    // Optionally, clear input fields after successful creation
                    // if (nameInput) nameInput.value = '';
                    // if (codeInput) codeInput.value = '';

                } else {
                    // If the API returned an error or unexpected response
                    const errorMessage = data.message || '创建链接失败，请稍后再试。';
                    showMessage(errorMessage, 'error');
                    console.error('API Error:', data);
                }
            } catch (error) {
                // If there was a network error or other issue with the fetch request
                showMessage('创建链接时发生网络错误。', 'error');
                console.error('Fetch Error:', error);
            } finally {
                createBtn.disabled = false; // Re-enable button
            }
        });
    } else {
         console.error("Create button not found");
    }
});
