"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomSidebarViewProvider = void 0;
const vscode = require("vscode");
const axios_1 = require("axios");
const defaultBaseUrl = 'http://localhost:11434';
// ...existing code...
async function modelList() {
    try {
        const response = await axios_1.default.get(`${defaultBaseUrl}/api/tags`);
        const models = response.data.models;
        if (!Array.isArray(models)) {
            throw new Error('API response is not an array');
        }
        const modelOptions = models.map((model) => `<option value="${model.model}">${model.name}</option>`).join('');
        // console.log(modelOptions);
        return modelOptions;
        // modelOptions burada kullanılabilir
    }
    catch (error) {
        console.error('Error fetching tags:', error);
        return '';
    }
}
// ...existing code...
class CustomSidebarViewProvider {
    constructor(_extensionUri) {
        this._extensionUri = _extensionUri;
    }
    async resolveWebviewView(webviewView, context, token) {
        this._view = webviewView;
        webviewView.webview.options = {
            // Allow scripts in the webview
            enableScripts: true,
            localResourceRoots: [this._extensionUri],
        };
        const modelOptions = await modelList();
        webviewView.webview.html = this.getHtmlContent(webviewView.webview, modelOptions, defaultBaseUrl);
        webviewView.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'sendPrompt':
                    this.handleSendPrompt(message);
                    break;
                // Diğer mesaj komutlarını burada işleyebilirsiniz
            }
        }, undefined);
    }
    async handleSendPrompt(message) {
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
                this._view?.webview.postMessage({
                    type: 'userMessage',
                    text: userMessage.content,
                    model: userMessage.model
                });
                const response = await axios_1.default.post(`${baseUrl}/api/chat`, {
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
                this._view?.webview.postMessage({
                    type: 'response',
                    text: assistantMessage.content,
                    model: assistantMessage.model
                });
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                this._view?.webview.postMessage({
                    type: 'error',
                    text: errorMessage
                });
            }
            finally {
                this._view?.webview.postMessage({
                    type: 'loadingState',
                    isLoading: false
                });
            }
        }
    }
    getHtmlContent(webview, modelOptions, defaultBaseUrl) {
        // Get the local path to main script run in the webview,
        // then convert it to a uri we can use in the webview.
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "script.js"));
        // Same for stylesheet
        const cssUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "styles.css"));
        // Use a nonce to only allow a specific script to be run.
        const nonce = getNonce();
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
    <div class="navbar-container">
      <div class="navbar">
          <div class="navbar-left">
              <button class="icon-button" id="chatHistoryButton">History</button>
              <button class="icon-button" id="newChatButton">+</button>
          </div>
          <label for="baseUrlInput">Base URL:<input type="text" id="baseUrlInput" value="${defaultBaseUrl}"></label>
      </div>
    </div>
    <div id="welcomeMessage" class="welcome-message">
      <img src="${webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "ottollama.png"))}" alt="Welcome Icon" class="welcome-icon">
      <h1>Ottollama</h1>
      <p>Hello! Ottollama Chat is your personal communication tool to interact with the local Ollama model. Customize your own application and enjoy using it just the way you like.<br> How can I assist you today? 😊</p>
    </div>
    <div class="chat-container">

        <div class="chat-messages"></div>
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
}
exports.CustomSidebarViewProvider = CustomSidebarViewProvider;
CustomSidebarViewProvider.viewType = "vscodeSidebar.openview";
function getNonce() {
    let text = "";
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
//# sourceMappingURL=customSidebarViewProvider.js.map