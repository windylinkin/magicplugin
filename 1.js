// server.js
// 这是运行在您本地电脑上的 Node.js 服务器，负责文件操作和 Git 同步。

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors'); // 引入 cors 模块
const fs = require('fs');
const { exec } = require('child_process');
const path = require('path');

const app = express();
const port = 3000; // 服务器监听的端口

// 配置 CORS，允许来自 Chrome 扩展程序的请求
// 在开发阶段，可以设置为允许所有来源 ('*')
// 生产环境或更严格的场景，建议只允许您的 Chrome 扩展程序的 ID
// 例如：cors({ origin: 'chrome-extension://YOUR_EXTENSION_ID' })
app.use(cors());
app.use(bodyParser.json());

// 定义您的浏览器插件项目根目录
// !!! 重要：请将此路径替换为您的实际浏览器插件项目的根目录 !!!
// 例如：如果您的目标插件在 C:\Users\YourUser\Documents\my-browser-extension
// 则 BASE_DIR = 'C:\\Users\\YourUser\\Documents\\my-browser-extension';
// 假设此服务器脚本与您的目标插件项目文件夹在同一个父目录中，并且目标插件文件夹名为 'my-target-extension'
const BASE_DIR = path.resolve(__dirname, '..', 'plugin-automator-extension');

console.log(`服务器将操作的基目录: ${BASE_DIR}`);

/**
 * 辅助函数：执行 shell 命令
 * @param {string} command - 要执行的 shell 命令
 * @returns {Promise<{stdout: string, stderr: string}>} - 包含标准输出和标准错误的 Promise
 */
function executeCommand(command) {
    return new Promise((resolve, reject) => {
        exec(command, { cwd: BASE_DIR }, (error, stdout, stderr) => {
            if (error) {
                console.error(`执行命令失败: ${command}`, error);
                // 捕获 Git 错误信息，例如 "nothing to commit"
                if (stderr.includes('nothing to commit')) {
                    return resolve({ stdout, stderr: 'nothing to commit' }); // 特殊处理，不作为错误抛出
                }
                return reject({ error, stdout, stderr });
            }
            console.log(`stdout: ${stdout}`);
            if (stderr) {
                console.warn(`stderr: ${stderr}`);
            }
            resolve({ stdout, stderr });
        });
    });
}

// API 接口：读取文件内容
app.post('/read-file', async (req, res) => {
    const { filePath } = req.body;
    if (!filePath) {
        return res.status(400).json({ error: '文件路径不能为空。' });
    }

    // 构建完整的文件路径，确保在 BASE_DIR 范围内
    const fullPath = path.join(BASE_DIR, filePath);

    // 安全检查：确保文件路径在 BASE_DIR 内部，防止路径遍历攻击
    if (!fullPath.startsWith(BASE_DIR)) {
        return res.status(403).json({ error: '不允许访问此路径。' });
    }

    try {
        const content = await fs.promises.readFile(fullPath, 'utf8');
        res.json({ content });
    } catch (error) {
        console.error(`读取文件失败: ${fullPath}`, error);
        res.status(500).json({ error: `无法读取文件: ${error.message}` });
    }
});

// API 接口：更新文件内容并同步到 GitHub
app.post('/update-file', async (req, res) => {
    const { filePath, content } = req.body;

    if (!filePath || content === undefined) {
        return res.status(400).json({ error: '文件路径和内容不能为空。' });
    }

    // 构建完整的文件路径
    const fullPath = path.join(BASE_DIR, filePath);

    // 安全检查：确保文件路径在 BASE_DIR 内部
    if (!fullPath.startsWith(BASE_DIR)) {
        return res.status(403).json({ error: '不允许写入此路径。' });
    }

    try {
        // 1. 写入文件
        await fs.promises.writeFile(fullPath, content, 'utf8');
        console.log(`文件已写入: ${fullPath}`);

        // 2. 执行 Git 命令
        // 添加文件到暂存区
        await executeCommand(`git add ${filePath}`);
        // 提交更改
        const commitResult = await executeCommand(`git commit -m "Auto update ${filePath} from browser extension"`);

        if (commitResult.stderr && commitResult.stderr.includes('nothing to commit')) {
            // 如果没有新的提交，直接返回成功消息，不执行 push
            return res.json({ message: `文件 "${filePath}" 已保存，但内容未改变，无需提交。` });
        }

        // 推送到 GitHub
        await executeCommand('git push origin main'); // 假设您的主分支是 'main'，如果不是，请修改

        res.json({ message: `文件 "${filePath}" 已保存并成功同步到 GitHub。` });
    } catch (error) {
        console.error('更新文件或 Git 同步失败:', error);
        let errorMessage = '服务器内部错误。';
        if (error.error && error.error.code === 'ENOENT') {
            errorMessage = '指定的文件或目录不存在。';
        } else if (error.stderr && error.stderr.includes('Authentication failed')) {
            errorMessage = 'Git 认证失败，请检查您的 GitHub 凭证。';
        } else if (error.stderr) {
            errorMessage = `Git 同步失败: ${error.stderr}`;
        } else {
            errorMessage = `操作失败: ${error.message}`;
        }
        res.status(500).json({ error: errorMessage });
    }
});

// 启动服务器
app.listen(port, () => {
    console.log(`本地开发服务器正在运行于 http://localhost:${port}`);
    console.log(`请确保您的目标浏览器插件项目位于: ${BASE_DIR}`);
    console.log('请安装并启用“插件自动化修改器”浏览器扩展程序。');
});