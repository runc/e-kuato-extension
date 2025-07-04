# E-KUATO 插件上下文失效问题修复

## 问题描述

用户在点击"立即抓取"按钮时遇到以下错误：

```
E-KUATO: 立即抓取按钮被点击 (直接绑定)
aliexpress.js:807 E-KUATO: handleScrape 方法被调用
aliexpress.js:810 E-KUATO: 选择的模板: 
aliexpress.js:820 E-KUATO: 开始获取身份设置
aliexpress.js:828 Uncaught Error: Extension context invalidated.
```

## 错误原因

"Extension context invalidated" 错误通常发生在以下情况：

1. **插件被重新加载或更新**：当插件被重新加载时，之前注入到页面的 content script 会失去与插件的连接
2. **Service Worker 被回收**：在 Manifest V3 中，service worker 可能会被浏览器回收，导致 content script 无法访问 chrome API
3. **插件被禁用后重新启用**：插件状态变化会导致上下文失效

## 修复方案

### 1. 增强插件上下文检查

在 `aliexpress.js` 中添加了以下方法：

```javascript
/**
 * 检查插件上下文是否有效
 */
isExtensionContextValid() {
    try {
        return !!(chrome && chrome.runtime && chrome.runtime.id);
    } catch (error) {
        console.error('E-KUATO: 插件上下文检查失败:', error);
        return false;
    }
}
```

### 2. 安全的存储访问

将原来的同步 `chrome.storage` 调用改为异步的安全访问方式：

```javascript
/**
 * 安全地获取存储数据
 */
async safeGetStorage(keys) {
    return new Promise((resolve, reject) => {
        if (!this.isExtensionContextValid()) {
            reject(new Error('插件上下文已失效，请刷新页面重试'));
            return;
        }

        try {
            chrome.storage.sync.get(keys, (result) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                    return;
                }
                resolve(result);
            });
        } catch (error) {
            reject(error);
        }
    });
}
```

### 3. Service Worker 状态检查

添加了 Service Worker 活跃状态检查：

```javascript
/**
 * 检查 service worker 是否活跃
 */
async checkServiceWorker() {
    return new Promise((resolve) => {
        if (!this.isExtensionContextValid()) {
            resolve(false);
            return;
        }

        try {
            chrome.runtime.sendMessage({ action: 'ping' }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('E-KUATO: Service Worker 检查失败:', chrome.runtime.lastError);
                    resolve(false);
                } else {
                    resolve(response && response.status === 'alive');
                }
            });
        } catch (error) {
            console.error('E-KUATO: Service Worker 检查异常:', error);
            resolve(false);
        }
    });
}
```

### 4. 增强的 Background Script

更新了 `background.js` 以提供更好的错误处理和保活机制：

```javascript
// 监听来自 content script 的消息
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    console.log("E-KUATO: 收到消息:", request);
    
    try {
        if (request.action === 'ping') {
            // 用于检查 service worker 是否活跃
            sendResponse({ status: 'alive' });
            return true;
        }
        // ... 其他处理逻辑
    } catch (error) {
        console.error('E-KUATO: 处理消息时发生错误:', error);
        sendResponse({ error: error.message });
    }
    
    return true;
});

// 保持 service worker 活跃
setInterval(() => {
    console.log('E-KUATO: Service Worker 心跳检查');
}, 25000); // 每25秒检查一次，避免被回收
```

### 5. 全局错误处理

在文件开头添加了全局错误处理器：

```javascript
// 全局错误处理器
window.addEventListener('error', (event) => {
    if (event.error && event.error.message && event.error.message.includes('Extension context invalidated')) {
        console.error('E-KUATO: 检测到插件上下文失效错误:', event.error);
        if (typeof PageUtils !== 'undefined' && PageUtils.showMessage) {
            PageUtils.showMessage('插件上下文已失效，请刷新页面重试', 'error');
        }
    }
});
```

### 6. 更新的抓取流程

修改了 `handleScrape` 方法，增加了多层检查：

```javascript
async handleScrape() {
    // 1. 检查页面类型
    if (!PageUtils.isItemPage()) {
        PageUtils.showMessage('请在商品详情页面使用此功能', 'error');
        return;
    }

    // 2. 检查插件上下文
    if (!this.isExtensionContextValid()) {
        PageUtils.showMessage('插件上下文已失效，请刷新页面重试', 'error');
        return;
    }

    // 3. 检查 service worker 状态
    const serviceWorkerActive = await this.checkServiceWorker();
    if (!serviceWorkerActive) {
        PageUtils.showMessage('插件服务不可用，请重新加载插件或刷新页面', 'error');
        return;
    }

    // 4. 安全地获取存储数据
    try {
        const result = await this.safeGetStorage(['scrapeKey']);
        // ... 继续处理
    } catch (error) {
        if (error.message.includes('插件上下文已失效')) {
            PageUtils.showMessage('插件上下文已失效，请刷新页面重试', 'error');
        } else {
            PageUtils.showMessage('获取身份设置失败: ' + error.message, 'error');
        }
    }
}
```

## 测试方法

1. 打开 `test-extension-context.html` 页面
2. 点击各种测试按钮验证修复效果
3. 在 AliExpress 商品页面测试实际抓取功能

## 用户指导

如果用户仍然遇到上下文失效错误，建议：

1. **刷新页面**：这是最简单有效的解决方案
2. **重新加载插件**：在扩展管理页面禁用后重新启用插件
3. **重启浏览器**：如果问题持续存在

## 预防措施

- 插件现在会自动检测上下文状态
- 提供用户友好的错误消息
- Service Worker 保活机制减少被回收的可能性
- 全局错误处理确保错误不会中断用户操作
