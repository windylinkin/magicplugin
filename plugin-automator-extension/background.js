// background.js
const SERVER_URL = 'http://localhost:3000';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    (async () => {
        try {
            let response;
            switch (request.action) {
                case 'readFile':
                    response = await fetch(`${SERVER_URL}/read-file`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ filePath: request.filePath }),
                    });
                    break;
                case 'updateFile':
                    response = await fetch(`${SERVER_URL}/update-file`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ filePath: request.filePath, content: request.content }),
                    });
                    break;
                default:
                    sendResponse({ error: '未知动作。' });
                    return;
            }

            if (!response.ok) {
                const errorData = await response.json();
                sendResponse({ error: errorData.error || `服务器错误: ${response.status}` });
                return;
            }

            const data = await response.json();
            sendResponse(data);
        } catch (error) {
            console.error('与本地服务器通信失败:', error);
            sendResponse({ error: `无法连接到本地服务器或请求失败: ${error.message}` });
        }
    })();
    return true;
});