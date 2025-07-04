// background.js
console.log('E-KUATO: Service Worker 启动');

// 监听插件安装和启动事件
chrome.runtime.onInstalled.addListener(() => {
    console.log('E-KUATO: 插件已安装/更新');
});

chrome.runtime.onStartup.addListener(() => {
    console.log('E-KUATO: 插件已启动');
});

// 监听来自 content script 的消息
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    console.log("E-KUATO: 收到消息:", request);

    try {
        if (request.action === 'getCookies') {
            chrome.cookies.getAll({ domain: ".amazon.com" }, function (cookies) {
                if (chrome.runtime.lastError) {
                    console.error('E-KUATO: 获取 cookies 失败:', chrome.runtime.lastError);
                    sendResponse({ error: chrome.runtime.lastError.message });
                } else {
                    sendResponse({ cookies: cookies });
                }
            });
            return true; // 保持消息通道打开，直到 sendResponse 被调用
        }

        if (request.action === 'ping') {
            // 用于检查 service worker 是否活跃
            sendResponse({ status: 'alive' });
            return true;
        }

        // 其他消息类型的处理
        sendResponse({ error: 'Unknown action' });
    } catch (error) {
        console.error('E-KUATO: 处理消息时发生错误:', error);
        sendResponse({ error: error.message });
    }

    return true;
});

// 监听连接事件
chrome.runtime.onConnect.addListener((port) => {
    console.log('E-KUATO: 建立连接:', port.name);

    port.onDisconnect.addListener(() => {
        console.log('E-KUATO: 连接断开:', port.name);
    });
});

// 保持 service worker 活跃
setInterval(() => {
    console.log('E-KUATO: Service Worker 心跳检查');
}, 25000); // 每25秒检查一次，避免被回收
