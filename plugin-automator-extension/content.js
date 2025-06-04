// content.js
const SERVER_URL = 'http://localhost:3000';

const automatorContainer = document.createElement('div');
automatorContainer.classList.add('plugin-automator-container');

const collapsedText = document.createElement('div');
collapsedText.classList.add('collapsed-text');
collapsedText.textContent = '插件修改器';
automatorContainer.appendChild(collapsedText);

const expandedContent = document.createElement('div');
expandedContent.classList.add('expanded-content');
expandedContent.innerHTML = `<button class="close-btn">&times;</button>
    <h2>插件文件修改器</h2>
    <div class="mb-4">
        <label for="automatorFilePath">文件路径（相对于服务器配置的基目录）</label>
        <input type="text" id="automatorFilePath" value="./manifest.json" placeholder="例如: ./background.js">
        <p class="text-xs text-gray-500 mt-1">
            请确保路径正确，且服务器有权限访问。
        </p>
    </div>
    <div class="mb-4">
        <label for="automatorFileContent">文件内容</label>
        <textarea id="automatorFileContent" rows="10" placeholder="在此输入您的文件内容..."></textarea>
    </div>
    <div class="button-group">
        <button id="automatorLoadFileBtn" class="load-btn">
            <svg class="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 000 1.414L9 13.414V4a1 1 0 112 0v9.414l2.707-2.707a1 1 0 00-1.414-1.414L10 11.586l-2.293-2.293a1 1 0 00-1.414 0z" clip-rule="evenodd" />
            </svg>
            加载文件内容
        </button>
        <button id="automatorSaveFileBtn" class="save-btn">
            <svg class="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path d="M7.707 10.293a1 1 0 010 1.414l-3 3a1 1 0 01-1.414 0l-1-1a1 1 0 010-1.414l3-3a1 1 0 011.414 0z" />
                <path d="M10.293 7.707a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-1 1a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" />
                <path fill-rule="evenodd" d="M14.707 2.293a1 1 0 011.414 0l2 2a1 1 0 010 1.414l-10 10a1 1 0 01-1.414 0l-2-2a1 1 0 010-1.414l10-10zM11 6a3 3 0 11-6 0 3 3 0 016 0z" clip-rule="evenodd" />
            </svg>
            保存并同步到GitHub
        </button>
    </div>
    <div id="automatorMessageBox" class="message-box"></div>`;
automatorContainer.appendChild(expandedContent);

document.body.appendChild(automatorContainer);

const filePathInput = automatorContainer.querySelector('#automatorFilePath');
const fileContentTextarea = automatorContainer.querySelector('#automatorFileContent');
const loadFileBtn = automatorContainer.querySelector('#automatorLoadFileBtn');
const saveFileBtn = automatorContainer.querySelector('#automatorSaveFileBtn');
const messageBox = automatorContainer.querySelector('#automatorMessageBox');
const closeBtn = automatorContainer.querySelector('.close-btn');

let isExpanded = false;

function showMessage(message, type) {
    messageBox.textContent = message;
    messageBox.className = 'message-box';
    messageBox.classList.add(type);
    messageBox.style.display = 'block';
    setTimeout(() => {
        messageBox.style.display = 'none';
    }, 5000);
}

automatorContainer.addEventListener('mouseenter', () => {
    if (!isExpanded) {
        automatorContainer.classList.add('expanded');
        collapsedText.style.display = 'none';
        expandedContent.style.display = 'block';
        isExpanded = true;
    }
});

closeBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    automatorContainer.classList.remove('expanded');
    collapsedText.style.display = 'block';
    expandedContent.style.display = 'none';
    isExpanded = false;
});

document.addEventListener('click', (event) => {
    if (isExpanded && !automatorContainer.contains(event.target)) {
        automatorContainer.classList.remove('expanded');
        collapsedText.style.display = 'block';
        expandedContent.style.display = 'none';
        isExpanded = false;
    }
});

loadFileBtn.addEventListener('click', async () => {
    const filePath = filePathInput.value.trim();
    if (!filePath) {
        showMessage('请输入文件路径！', 'error');
        return;
    }

    showMessage('正在加载文件内容...', 'info');
    try {
        const response = await chrome.runtime.sendMessage({
            action: 'readFile',
            filePath: filePath
        });

        if (response.error) {
            throw new Error(response.error);
        }

        fileContentTextarea.value = response.content;
        showMessage('文件内容加载成功！', 'success');
    } catch (error) {
        console.error('加载文件失败:', error);
        showMessage(`加载文件失败: ${error.message}`, 'error');
    }
});

saveFileBtn.addEventListener('click', async () => {
    const filePath = filePathInput.value.trim();
    const fileContent = fileContentTextarea.value;

    if (!filePath) {
        showMessage('请输入文件路径！', 'error');
        return;
    }

    showMessage('正在保存文件并同步到GitHub...', 'info');

    try {
        const response = await chrome.runtime.sendMessage({
            action: 'updateFile',
            filePath: filePath,
            content: fileContent
        });

        if (response.error) {
            throw new Error(response.error);
        }

        showMessage(response.message, 'success');
    } catch (error) {
        console.error('保存文件失败:', error);
        showMessage(`保存文件失败: ${error.message}`, 'error');
    }
});