"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = __importStar(require("vscode"));
const axios_1 = __importDefault(require("axios"));
let panels = new Map();
function activate(context) {
    context.subscriptions.push(vscode.commands.registerCommand('ottollama.start', () => startChat(context)), vscode.commands.registerCommand('ottollama.showHistory', () => {
        const activeChatId = context.globalState.get('activeChatId');
        if (activeChatId) {
            const panel = panels.get(activeChatId);
            if (panel) {
                panel.webview.postMessage({ command: 'toggleHistory' });
            }
        }
    }), vscode.commands.registerCommand('ottollama.newChat', () => {
        startChat(context);
    }), vscode.commands.registerCommand('ottollama.clearHistory', () => __awaiter(this, void 0, void 0, function* () {
        const historyPath = vscode.Uri.joinPath(context.globalStorageUri, 'chat-history.json');
        try {
            yield vscode.workspace.fs.delete(historyPath);
            vscode.window.showInformationMessage('Chat history cleared.');
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to clear chat history: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    })));
}
exports.activate = activate;
function startChat(context, chatId) {
    return __awaiter(this, void 0, void 0, function* () {
        vscode.commands.executeCommand('setContext', 'ottollama.webviewActive', true);
        chatId = chatId || `chat-${Date.now()}`;
        let panel = panels.get(chatId);
        if (!panel) {
            panel = vscode.window.createWebviewPanel('ottollama.webviewActive', `${chatId}`, vscode.ViewColumn.One, // Open in the secondary side bar
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')]
            });
            panel.onDidChangeViewState((event) => {
                const isActive = event.webviewPanel.active;
                vscode.commands.executeCommand('setContext', 'ottollama.webviewActive', isActive);
            });
            panel.onDidDispose(() => {
                vscode.commands.executeCommand('setContext', 'ottollama.webviewActive', false);
                panels.delete(chatId);
            });
            context.globalState.update('activeChatId', chatId);
            panels.set(chatId, panel);
        }
        const defaultBaseUrl = 'http://localhost:11434';
        panel.webview.html = '';
        try {
            const response = yield axios_1.default.get(`${defaultBaseUrl}/api/tags`);
            const models = response.data.models;
            if (!Array.isArray(models)) {
                throw new Error('API yanıtı bir dizi değil');
            }
            const modelOptions = models.map((model) => `<option value="${model.model}">${model.name}</option>`).join('');
            panel.webview.html = getWebviewContent(panel, context, modelOptions, defaultBaseUrl);
            panel.webview.onDidReceiveMessage((message) => __awaiter(this, void 0, void 0, function* () {
                if (message.command === 'newChatSession' && panel) {
                    yield handleNewChatSession(context, panel, defaultBaseUrl);
                    return;
                }
                if (panel) {
                    yield handleWebviewMessage(chatId, message, panel, context);
                }
            }));
            panel.onDidDispose(() => panels.delete(chatId));
        }
        catch (error) {
            vscode.window.showErrorMessage(`Modeller alınamadı: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
        }
    });
}
function handleNewChatSession(context, panel, defaultBaseUrl) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Yeni Sohbet Oturumu Başlatılıyor...');
        const chatId = `chat-${Date.now()}`;
        context.globalState.update('activeChatId', chatId);
        panel.title = chatId;
        panel.webview.html = '';
        try {
            const response = yield axios_1.default.get(`${defaultBaseUrl}/api/tags`);
            const models = response.data.models;
            if (!Array.isArray(models)) {
                throw new Error('API yanıtı bir dizi değil');
            }
            const modelOptions = models.map((model) => `<option value="${model.model}">${model.name}</option>`).join('');
            panel.webview.html = getWebviewContent(panel, context, modelOptions, defaultBaseUrl);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Yeni sohbet başlatılamadı: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
        }
    });
}
function getWebviewContent(panel, context, modelOptions, defaultBaseUrl) {
    const cssPath = vscode.Uri.joinPath(context.extensionUri, 'media', 'styles.css');
    const cssUri = panel.webview.asWebviewUri(cssPath);
    const scriptPath = vscode.Uri.joinPath(context.extensionUri, 'media', 'script.js');
    const scriptUri = panel.webview.asWebviewUri(scriptPath);
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chat Dialog</title>
    <link href="${cssUri}" rel="stylesheet">
    <meta name="color-scheme" content="dark light">
</head>
<body class="vscode-dark">
    <div class="navbar">
        <div class="navbar-left">
            <button class="icon-button" id="chatHistoryButton">History</button>
            <button class="icon-button" id="newChatButton">+</button>
            <button class="icon-button" id="showHistory"><span class="codicon codicon-history"></span> History</button>
            <button class="icon-button" id="startNewChat"><span class="codicon codicon-add"></span> New Chat</button>
        </div>
        <label for="baseUrlInput">Base URL:<input type="text" id="baseUrlInput" value="${defaultBaseUrl}"></label>
    </div>
    <div class="chat-container">
        <div class="chat-messages"></div>
        <div id="responseArea">
            <pre><code class="language-javascript"></code></pre>
        </div>
        <div class="chat-input-container">
            <div class="chat-input">
                <textarea id="promptInput" placeholder="Type your message here..." style="resize: none;"></textarea>
            </div>
            <div class="controls">
                <select id="modelSelect">
                    ${modelOptions}
                </select>
                <button id="sendButton"><span class="icon">➔</span></button>
            </div>
        </div>
    </div>
    <div class="history-panel" id="chatHistoryDiv">
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px;">
            <h3>Chat History</h3>
            <button class="icon-button" id="closeHistoryButton">✖</button> 
        </div>
        <div id="historyContainer"></div>
    </div>

    <script src="${scriptUri}"></script>
</body>
</html>
    `;
}
function handleWebviewMessage(chatId, message, panel, context) {
    return __awaiter(this, void 0, void 0, function* () {
        const baseUrl = message.baseUrl || 'http://localhost:11434';
        if (message.command === 'sendPrompt') {
            try {
                const userMessage = {
                    role: 'user',
                    content: message.text || '',
                    model: message.model,
                    title: 'User Message',
                    timestamp: new Date().toISOString()
                };
                panel.webview.postMessage({
                    type: 'userMessage',
                    text: userMessage.content,
                    model: userMessage.model
                });
                const response = yield axios_1.default.post(`${baseUrl}/api/chat`, {
                    model: message.model,
                    messages: [{ role: 'user', content: message.text }],
                    stream: false
                });
                const assistantMessage = {
                    role: 'assistant',
                    content: response.data.message.content,
                    model: response.data.model,
                    title: 'Assistant Response',
                    timestamp: new Date().toISOString()
                };
                panel.webview.postMessage({
                    type: 'response',
                    text: assistantMessage.content,
                    model: assistantMessage.model
                });
                const historyPath = vscode.Uri.joinPath(context.globalStorageUri, 'chat-history.json');
                const chatHistory = { id: chatId, messages: [userMessage, assistantMessage] };
                yield vscode.workspace.fs.writeFile(historyPath, Buffer.from(JSON.stringify(chatHistory, null, 2)));
            }
            catch (error) {
                panel.webview.postMessage({
                    type: 'error',
                    text: error instanceof Error ? error.message : 'Unknown error'
                });
            }
            finally {
                panel.webview.postMessage({
                    type: 'loadingState',
                    isLoading: false
                });
            }
        }
    });
}
function deactivate() {
    panels.forEach(panel => panel.dispose());
    panels.clear();
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map