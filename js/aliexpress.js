/**
 * AliExpress商品数据抓取插件
 * 优化版本 - 模块化设计，改进UI和用户体验
 */

// 全局错误处理器
window.addEventListener('error', (event) => {
    if (event.error && event.error.message && event.error.message.includes('Extension context invalidated')) {
        console.error('E-KUATO: 检测到插件上下文失效错误:', event.error);
        // 显示用户友好的错误消息
        if (typeof PageUtils !== 'undefined' && PageUtils.showMessage) {
            PageUtils.showMessage('插件上下文已失效，请刷新页面重试', 'error');
        }
    }
});

// 监听未处理的 Promise 拒绝
window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && event.reason.message && event.reason.message.includes('Extension context invalidated')) {
        console.error('E-KUATO: 检测到未处理的插件上下文失效错误:', event.reason);
        event.preventDefault(); // 阻止错误在控制台显示
        // 显示用户友好的错误消息
        if (typeof PageUtils !== 'undefined' && PageUtils.showMessage) {
            PageUtils.showMessage('插件上下文已失效，请刷新页面重试', 'error');
        }
    }
});

// 配置常量
const CONFIG = {
    API_BASE_URL: 'http://127.0.0.1:8012/api',
    POPUP_WIDTH: '320px',
    BRAND_COLOR: '#FD384F',
    Z_INDEX: 999999,
    DRAG_THRESHOLD: 5,
    AUTO_CLOSE_DELAY: 5000,
    SCRAPE_DELAY: 10000
};

// 全局变量
let selectedProductHrefs = [];
let popupDragState = { isDragging: false, startX: 0, startY: 0 };

// 页面工具函数
const PageUtils = {
    isAliExpressPage: function (url = window.location.href) {
        return url.includes('aliexpress.com') || url.includes('aliexpress.us');
    },
    isItemPage: function (url = window.location.href) {
        return url.includes('/item/');
    },
    isStorePage: function (url = window.location.href) {
        return url.includes('/store/');
    },
    isSearchPage: function (url = window.location.href) {
        return url.includes('/w/');
    },
    isAutoMode: function (url = window.location.href) {
        return url.includes('open_mode=auto');
    },
    cleanPrice: function (priceText) {
        return priceText.replace(/[$￥\s]/g, '').replace('US', '');
    },
    showMessage: function (message, type = 'info') {
        console.log('E-KUATO: 尝试显示消息:', message, '类型:', type);

        // 首先尝试在弹窗内显示消息
        let messageEl = $('#ekuato-message');

        if (messageEl.length === 0) {
            console.log('E-KUATO: 弹窗内消息元素不存在，尝试查找弹窗');

            // 如果弹窗内的消息元素不存在，检查弹窗是否存在
            const popup = $('#ekuato-collector-popup');
            if (popup.length > 0) {
                console.log('E-KUATO: 弹窗存在，在弹窗内查找消息元素');
                messageEl = popup.find('#ekuato-message');
            }

            // 如果还是找不到，创建一个临时的全局消息提示
            if (messageEl.length === 0) {
                console.log('E-KUATO: 创建全局消息提示');
                this.createGlobalMessage(message, type);
                return;
            }
        }

        console.log('E-KUATO: 找到消息元素，显示消息');
        console.log('E-KUATO: 消息元素当前状态:', {
            length: messageEl.length,
            isVisible: messageEl.is(':visible'),
            display: messageEl.css('display'),
            classes: messageEl.attr('class')
        });

        messageEl.removeClass('success error warning info show')
            .addClass(type + ' show')
            .text(message);

        console.log('E-KUATO: 消息元素设置后状态:', {
            isVisible: messageEl.is(':visible'),
            display: messageEl.css('display'),
            classes: messageEl.attr('class'),
            text: messageEl.text()
        });

        setTimeout(() => {
            messageEl.fadeOut(() => {
                messageEl.removeClass('show');
            });
        }, 3000);
    },

    createGlobalMessage: function (message, type = 'info') {
        console.log('E-KUATO: 创建全局消息提示');

        // 移除已存在的全局消息
        $('#ekuato-global-message').remove();

        // 创建全局消息元素
        const globalMessage = $(`
            <div id="ekuato-global-message" style="
                position: fixed !important;
                top: 20px !important;
                right: 20px !important;
                z-index: 999999 !important;
                padding: 12px 16px !important;
                border-radius: 8px !important;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
                font-size: 14px !important;
                font-weight: 500 !important;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
                max-width: 300px !important;
                word-wrap: break-word !important;
                animation: ekuatoSlideIn 0.3s ease-out !important;
            ">
                ${message}
            </div>
        `);

        // 根据类型设置样式
        switch (type) {
            case 'success':
                globalMessage.css({
                    'background': '#d1fae5',
                    'color': '#065f46',
                    'border': '1px solid #a7f3d0'
                });
                break;
            case 'error':
                globalMessage.css({
                    'background': '#fee2e2',
                    'color': '#991b1b',
                    'border': '1px solid #fca5a5'
                });
                break;
            case 'warning':
                globalMessage.css({
                    'background': '#fef3c7',
                    'color': '#92400e',
                    'border': '1px solid #fcd34d'
                });
                break;
            default: // info
                globalMessage.css({
                    'background': '#dbeafe',
                    'color': '#1e40af',
                    'border': '1px solid #93c5fd'
                });
        }

        // 添加动画样式
        if ($('#ekuato-global-message-styles').length === 0) {
            $('head').append(`
                <style id="ekuato-global-message-styles">
                    @keyframes ekuatoSlideIn {
                        from {
                            transform: translateX(100%);
                            opacity: 0;
                        }
                        to {
                            transform: translateX(0);
                            opacity: 1;
                        }
                    }
                    @keyframes ekuatoSlideOut {
                        from {
                            transform: translateX(0);
                            opacity: 1;
                        }
                        to {
                            transform: translateX(100%);
                            opacity: 0;
                        }
                    }
                </style>
            `);
        }

        // 添加到页面
        $('body').append(globalMessage);

        // 3秒后自动消失
        setTimeout(() => {
            globalMessage.css('animation', 'ekuatoSlideOut 0.3s ease-in');
            setTimeout(() => {
                globalMessage.remove();
            }, 300);
        }, 3000);

        console.log('E-KUATO: 全局消息提示已显示');
    },
    scrollToLoadMore: function (callback) {
        const scrollHeight = document.body.scrollHeight * 3;
        let currentPosition = 0;
        const scrollStep = 200;
        const scrollInterval = setInterval(() => {
            if (currentPosition < scrollHeight) {
                currentPosition += scrollStep;
                window.scrollTo(0, currentPosition);
            } else {
                clearInterval(scrollInterval);
                callback();
            }
        }, 150);
    }
};

// 确保jQuery加载完成后再初始化
(function () {
    'use strict';

    console.log('E-KUATO: 脚本开始加载');

    function initializeCollector() {
        console.log('E-KUATO: 开始初始化采集器');

        if (typeof $ === 'undefined') {
            console.error('E-KUATO: jQuery未加载，延迟初始化');
            setTimeout(initializeCollector, 500);
            return;
        }

        $(document).ready(function () {
            console.log('E-KUATO: DOM就绪，创建采集器实例');
            const aliExpressCollector = new AliExpressCollector();
            aliExpressCollector.init();
        });
    }

    // 立即尝试初始化，如果失败则延迟重试
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeCollector);
    } else {
        initializeCollector();
    }
})();

/**
 * AliExpress数据采集器主类
 */
class AliExpressCollector {
    constructor() {
        this.popup = null;
        this.isAdvancedMode = false;
        this.currentUrl = window.location.href;
    }

    /**
     * 初始化采集器
     */
    init() {
        console.log('E-KUATO: 初始化采集器，当前URL:', this.currentUrl);

        if (!PageUtils.isAliExpressPage(this.currentUrl)) {
            console.log('E-KUATO: 不是AliExpress页面，跳过初始化');
            return;
        }

        console.log('E-KUATO: 是AliExpress页面，继续初始化');
        console.log('E-KUATO: 是否为商品页面:', PageUtils.isItemPage(this.currentUrl));
        console.log('E-KUATO: 是否为店铺页面:', PageUtils.isStorePage(this.currentUrl));
        console.log('E-KUATO: 是否为搜索页面:', PageUtils.isSearchPage(this.currentUrl));

        this.createPopup();
        this.bindEvents();
        this.handleAutoMode();

        // 添加全局调试函数
        window.ekuatoDebug = {
            testScrape: () => {
                console.log('E-KUATO: 手动测试抓取功能');
                this.handleScrape();
            },
            checkButton: () => {
                const btn = $('#ekuato-scrape');
                console.log('E-KUATO: 按钮存在:', btn.length > 0);
                console.log('E-KUATO: 按钮元素:', btn[0]);
                return btn;
            },
            rebindEvents: () => {
                console.log('E-KUATO: 重新绑定事件');
                this.bindButtonEvents();
            },
            testMessage: (message = '测试消息', type = 'info') => {
                console.log('E-KUATO: 测试消息显示功能');
                PageUtils.showMessage(message, type);
            },
            testAllMessages: () => {
                console.log('E-KUATO: 测试所有类型的消息');
                PageUtils.showMessage('这是一条信息消息', 'info');
                setTimeout(() => PageUtils.showMessage('这是一条成功消息', 'success'), 1000);
                setTimeout(() => PageUtils.showMessage('这是一条警告消息', 'warning'), 2000);
                setTimeout(() => PageUtils.showMessage('这是一条错误消息', 'error'), 3000);
            },
            checkMessageElement: () => {
                const messageEl = $('#ekuato-message');
                console.log('E-KUATO: 弹窗内消息元素存在:', messageEl.length > 0);
                console.log('E-KUATO: 消息元素:', messageEl[0]);

                const popup = $('#ekuato-collector-popup');
                console.log('E-KUATO: 弹窗存在:', popup.length > 0);

                if (popup.length > 0) {
                    const popupMessageEl = popup.find('#ekuato-message');
                    console.log('E-KUATO: 弹窗内查找到的消息元素:', popupMessageEl.length > 0);
                }

                return { messageEl, popup };
            }
        };

        console.log('E-KUATO: 初始化完成，可使用 window.ekuatoDebug 进行调试');
    }

    /**
     * 创建采集弹窗
     */
    createPopup() {
        console.log('E-KUATO: 开始创建弹窗');

        // 检查是否已存在弹窗
        if ($('#ekuato-collector-popup').length > 0) {
            console.log('E-KUATO: 弹窗已存在，跳过创建');
            return;
        }

        this.popup = this.buildPopupElement();
        this.addPopupStyles();

        const content = this.buildPopupContent();
        this.popup.find('.ekuato-popup-content').html(content);

        $('body').append(this.popup);
        this.makePopupDraggable();

        console.log('E-KUATO: 弹窗创建完成');
        console.log('E-KUATO: 弹窗状态:', {
            exists: $('#ekuato-collector-popup').length > 0,
            isVisible: $('#ekuato-collector-popup').is(':visible'),
            messageElExists: $('#ekuato-message').length > 0
        });

        // 确保按钮存在后再绑定特定事件
        setTimeout(() => {
            this.bindButtonEvents();
        }, 100);
    }

    /**
     * 构建弹窗元素
     */
    buildPopupElement() {
        return $(`
            <div id="ekuato-collector-popup" class="ekuato-popup">
                <div class="ekuato-popup-header">
                    <div class="ekuato-popup-title">
                        <i class="ekuato-icon">🛒</i>
                        <span>E-KUATO 采集器</span>
                    </div>
                    <button class="ekuato-popup-close" title="关闭">×</button>
                </div>
                <div class="ekuato-popup-content"></div>
            </div>
        `);
    }

    /**
     * 构建弹窗内容
     */
    buildPopupContent() {
        const isItemPage = PageUtils.isItemPage(this.currentUrl);
        const isStorePage = PageUtils.isStorePage(this.currentUrl);
        const isSearchPage = PageUtils.isSearchPage(this.currentUrl);

        let content = `
            <div class="ekuato-message" id="ekuato-message"></div>
            <div class="ekuato-form-group">
                <label class="ekuato-label">选择模板 (可选)</label>
                <select id="ekuato-template" class="ekuato-select">
                    <option value="">请选择模板</option>
                </select>
            </div>
        `;

        if (isItemPage) {
            content += `
                <button id="ekuato-scrape" class="ekuato-btn ekuato-btn-primary">
                    <span>🚀</span> 立即抓取
                </button>
            `;
        } else if (isStorePage && this.isAdvancedMode) {
            content += `
                <div class="ekuato-btn-group">
                    <button id="ekuato-batch-scrape" class="ekuato-btn ekuato-btn-secondary">
                        <span>📦</span> 批量抓取
                    </button>
                    <button id="ekuato-auto-scrape" class="ekuato-btn ekuato-btn-primary">
                        <span>🤖</span> 自动抓取
                    </button>
                </div>
            `;
        } else if (isSearchPage && this.isAdvancedMode) {
            content += `
                <div class="ekuato-btn-group">
                    <button id="ekuato-batch-scrape" class="ekuato-btn ekuato-btn-secondary">
                        <span>📦</span> 批量抓取 (0)
                    </button>
                    <button id="ekuato-auto-scrape" class="ekuato-btn ekuato-btn-primary">
                        <span>🤖</span> 自动抓取
                    </button>
                </div>
            `;
        }

        return content;
    }

    /**
     * 添加弹窗样式
     */
    addPopupStyles() {
        if ($('#ekuato-popup-styles').length > 0) return;

        const styles = `
            <style id="ekuato-popup-styles">
                .ekuato-popup {
                    position: fixed !important;
                    bottom: 20px !important;
                    right: 20px !important;
                    width: ${CONFIG.POPUP_WIDTH} !important;
                    background: #ffffff !important;
                    border-radius: 12px !important;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15) !important;
                    z-index: ${CONFIG.Z_INDEX} !important;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
                    font-size: 14px !important;
                    line-height: 1.5 !important;
                    border: 2px solid ${CONFIG.BRAND_COLOR} !important;
                    backdrop-filter: blur(10px) !important;
                    max-height: 80vh !important;
                    overflow: hidden !important;
                }

                .ekuato-popup-header {
                    background: linear-gradient(135deg, ${CONFIG.BRAND_COLOR}, #ff6b6b) !important;
                    color: white !important;
                    padding: 12px 16px !important;
                    border-radius: 10px 10px 0 0 !important;
                    display: flex !important;
                    justify-content: space-between !important;
                    align-items: center !important;
                    cursor: move !important;
                }

                .ekuato-popup-title {
                    display: flex !important;
                    align-items: center !important;
                    gap: 8px !important;
                    font-weight: 600 !important;
                    font-size: 14px !important;
                }

                .ekuato-icon {
                    font-size: 16px !important;
                }

                .ekuato-popup-close {
                    background: none !important;
                    border: none !important;
                    color: white !important;
                    font-size: 18px !important;
                    cursor: pointer !important;
                    padding: 0 !important;
                    width: 24px !important;
                    height: 24px !important;
                    border-radius: 50% !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    transition: background-color 0.2s !important;
                }

                .ekuato-popup-close:hover {
                    background-color: rgba(255, 255, 255, 0.2) !important;
                }

                .ekuato-popup-content {
                    padding: 16px !important;
                    max-height: 60vh !important;
                    overflow-y: auto !important;
                }

                .ekuato-form-group {
                    margin-bottom: 16px !important;
                }

                .ekuato-label {
                    display: block !important;
                    margin-bottom: 6px !important;
                    font-weight: 500 !important;
                    color: #374151 !important;
                    font-size: 13px !important;
                }

                .ekuato-input, .ekuato-select {
                    width: 100% !important;
                    padding: 8px 12px !important;
                    border: 1px solid #d1d5db !important;
                    border-radius: 6px !important;
                    font-size: 13px !important;
                    font-family: inherit !important;
                    background-color: #ffffff !important;
                    transition: border-color 0.2s !important;
                    box-sizing: border-box !important;
                }

                .ekuato-input:focus, .ekuato-select:focus {
                    outline: none !important;
                    border-color: ${CONFIG.BRAND_COLOR} !important;
                    box-shadow: 0 0 0 2px rgba(253, 56, 79, 0.1) !important;
                }

                .ekuato-btn {
                    width: 100% !important;
                    padding: 10px 16px !important;
                    border: none !important;
                    border-radius: 6px !important;
                    font-size: 13px !important;
                    font-weight: 500 !important;
                    cursor: pointer !important;
                    transition: all 0.2s !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    gap: 6px !important;
                    margin-bottom: 8px !important;
                }

                .ekuato-btn-primary {
                    background: linear-gradient(135deg, ${CONFIG.BRAND_COLOR}, #ff6b6b) !important;
                    color: white !important;
                }

                .ekuato-btn-primary:hover {
                    transform: translateY(-1px) !important;
                    box-shadow: 0 4px 12px rgba(253, 56, 79, 0.3) !important;
                }

                .ekuato-btn-secondary {
                    background: #6b7280 !important;
                    color: white !important;
                }

                .ekuato-btn-secondary:hover {
                    background: #4b5563 !important;
                    transform: translateY(-1px) !important;
                }

                .ekuato-btn-group {
                    display: flex !important;
                    gap: 8px !important;
                }

                .ekuato-btn-group .ekuato-btn {
                    flex: 1 !important;
                    margin-bottom: 0 !important;
                }

                .ekuato-message {
                    padding: 8px 12px !important;
                    border-radius: 6px !important;
                    margin-bottom: 12px !important;
                    font-size: 12px !important;
                    display: none;
                }

                .ekuato-message.success {
                    background: #d1fae5 !important;
                    color: #065f46 !important;
                    border: 1px solid #a7f3d0 !important;
                }

                .ekuato-message.error {
                    background: #fee2e2 !important;
                    color: #991b1b !important;
                    border: 1px solid #fca5a5 !important;
                }

                .ekuato-message.warning {
                    background: #fef3c7 !important;
                    color: #92400e !important;
                    border: 1px solid #fcd34d !important;
                }

                .ekuato-message.info {
                    background: #dbeafe !important;
                    color: #1e40af !important;
                    border: 1px solid #93c5fd !important;
                }

                .ekuato-message.show {
                    display: block !important;
                }
            </style>
        `;

        $('head').append(styles);
    }

    /**
     * 使弹窗可拖拽
     */
    makePopupDraggable() {
        const header = this.popup.find('.ekuato-popup-header');

        header.on('mousedown', (e) => {
            popupDragState.isDragging = true;
            popupDragState.startX = e.clientX - this.popup.offset().left;
            popupDragState.startY = e.clientY - this.popup.offset().top;

            $(document).on('mousemove.drag', (e) => {
                if (!popupDragState.isDragging) return;

                const newLeft = e.clientX - popupDragState.startX;
                const newTop = e.clientY - popupDragState.startY;

                // 确保弹窗在视窗范围内
                const maxLeft = $(window).width() - this.popup.outerWidth();
                const maxTop = $(window).height() - this.popup.outerHeight();

                this.popup.css({
                    left: Math.max(0, Math.min(newLeft, maxLeft)) + 'px',
                    top: Math.max(0, Math.min(newTop, maxTop)) + 'px',
                    right: 'auto',
                    bottom: 'auto'
                });
            });

            $(document).on('mouseup.drag', () => {
                popupDragState.isDragging = false;
                $(document).off('.drag');
            });
        });
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        console.log('E-KUATO: 开始绑定事件');

        // 关闭按钮事件
        $(document).on('click', '.ekuato-popup-close', () => {
            console.log('E-KUATO: 关闭按钮被点击');
            this.popup.remove();
        });

        // 模板选择事件
        $(document).on('change', '#ekuato-template', this.handleTemplateChange.bind(this));

        // 抓取按钮事件 - 使用更强的事件绑定
        $(document).off('click', '#ekuato-scrape').on('click', '#ekuato-scrape', (e) => {
            console.log('E-KUATO: 立即抓取按钮被点击');
            e.preventDefault();
            e.stopPropagation();
            this.handleScrape();
        });

        $(document).off('click', '#ekuato-batch-scrape').on('click', '#ekuato-batch-scrape', (e) => {
            console.log('E-KUATO: 批量抓取按钮被点击');
            e.preventDefault();
            e.stopPropagation();
            this.handleBatchScrape();
        });

        $(document).off('click', '#ekuato-auto-scrape').on('click', '#ekuato-auto-scrape', (e) => {
            console.log('E-KUATO: 自动抓取按钮被点击');
            e.preventDefault();
            e.stopPropagation();
            this.handleAutoScrape();
        });

        // 加载模板列表和保存的数据
        this.loadTemplateList();
        this.loadSavedData();

        console.log('E-KUATO: 事件绑定完成');
    }

    /**
     * 绑定按钮特定事件
     */
    bindButtonEvents() {
        console.log('E-KUATO: 开始绑定按钮特定事件');

        // 检查按钮是否存在
        const scrapeBtn = $('#ekuato-scrape');
        if (scrapeBtn.length > 0) {
            console.log('E-KUATO: 找到立即抓取按钮，绑定点击事件');

            // 移除之前的事件绑定，避免重复绑定
            scrapeBtn.off('click.ekuato');

            // 绑定新的点击事件
            scrapeBtn.on('click.ekuato', (e) => {
                console.log('E-KUATO: 立即抓取按钮被点击 (直接绑定)');
                e.preventDefault();
                e.stopPropagation();
                this.handleScrape();
            });

            // 添加视觉反馈
            scrapeBtn.on('mousedown.ekuato', function () {
                $(this).css('transform', 'scale(0.95)');
            });

            scrapeBtn.on('mouseup.ekuato mouseleave.ekuato', function () {
                $(this).css('transform', '');
            });

            console.log('E-KUATO: 立即抓取按钮事件绑定完成');
        } else {
            console.log('E-KUATO: 未找到立即抓取按钮');
        }

        // 绑定其他按钮事件
        const batchBtn = $('#ekuato-batch-scrape');
        if (batchBtn.length > 0) {
            batchBtn.off('click.ekuato').on('click.ekuato', (e) => {
                console.log('E-KUATO: 批量抓取按钮被点击 (直接绑定)');
                e.preventDefault();
                e.stopPropagation();
                this.handleBatchScrape();
            });
        }

        const autoBtn = $('#ekuato-auto-scrape');
        if (autoBtn.length > 0) {
            autoBtn.off('click.ekuato').on('click.ekuato', (e) => {
                console.log('E-KUATO: 自动抓取按钮被点击 (直接绑定)');
                e.preventDefault();
                e.stopPropagation();
                this.handleAutoScrape();
            });
        }
    }

    /**
     * 加载模板列表
     */
    loadTemplateList() {
        $.ajax({
            url: `${CONFIG.API_BASE_URL}/api/get_all_catalog`,
            method: "GET",
            success: async (data) => {
                const options = data.result || [];
                const selectElement = $('#ekuato-template');

                selectElement.empty().append('<option value="">请选择模板</option>');

                options.forEach(option => {
                    selectElement.append($('<option>', {
                        value: option.catalog,
                        text: option.catalog_title
                    }));
                });

                // 恢复之前保存的模板选择
                try {
                    const result = await this.safeGetStorage(['template']);
                    if (result.template) {
                        selectElement.val(result.template);
                    }
                } catch (error) {
                    console.error('E-KUATO: 恢复模板选择失败:', error);
                }
            },
            error: (xhr, status, error) => {
                console.error("E-KUATO: 加载模板列表失败:", error, "状态:", status);
                PageUtils.showMessage("加载模板列表失败", "error");
            }
        });
    }

    /**
     * 安全地设置存储数据
     */
    async safeSetStorage(data) {
        return new Promise((resolve, reject) => {
            if (!this.isExtensionContextValid()) {
                reject(new Error('插件上下文已失效，请刷新页面重试'));
                return;
            }

            try {
                chrome.storage.sync.set(data, () => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                        return;
                    }
                    resolve();
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * 加载保存的数据
     */
    async loadSavedData() {
        try {
            const result = await this.safeGetStorage(['template']);
            if (result.template) {
                $('#ekuato-template').val(result.template);
            }
        } catch (error) {
            console.error('E-KUATO: 加载保存的数据失败:', error);
        }
    }

    /**
     * 处理模板选择变化
     */
    async handleTemplateChange(event) {
        const selectedTemplate = $(event.target).val();
        if (selectedTemplate) {
            try {
                await this.safeSetStorage({ 'template': selectedTemplate });
                console.log('模板已保存:', selectedTemplate);
            } catch (error) {
                console.error('E-KUATO: 保存模板失败:', error);
            }
        }
    }

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

    /**
     * 处理单个商品抓取
     */
    async handleScrape() {
        console.log('E-KUATO: handleScrape 方法被调用');

        const selectedTemplate = $('#ekuato-template').val();
        console.log('E-KUATO: 选择的模板:', selectedTemplate);

        // 检查是否在商品页面
        if (!PageUtils.isItemPage()) {
            console.log('E-KUATO: 不在商品页面');
            PageUtils.showMessage('请在商品详情页面使用此功能', 'error');
            return;
        }

        // 检查插件上下文
        if (!this.isExtensionContextValid()) {
            console.error('E-KUATO: 插件上下文已失效');
            PageUtils.showMessage('插件上下文已失效，请刷新页面重试', 'error');
            return;
        }

        // 检查 service worker 状态
        const serviceWorkerActive = await this.checkServiceWorker();
        if (!serviceWorkerActive) {
            console.error('E-KUATO: Service Worker 不活跃');
            PageUtils.showMessage('插件服务不可用，请重新加载插件或刷新页面', 'error');
            return;
        }

        // 从chrome.storage中获取身份设置
        console.log('E-KUATO: 开始获取身份设置');

        if (typeof chrome === 'undefined' || !chrome.storage) {
            console.error('E-KUATO: Chrome storage API 不可用');
            PageUtils.showMessage('浏览器存储API不可用，请检查插件权限', 'error');
            return;
        }

        try {
            const result = await this.safeGetStorage(['scrapeKey']);
            console.log('E-KUATO: 获取到的存储结果:', result);

            const selectedIdentity = result.scrapeKey;
            console.log('E-KUATO: 身份标识:', selectedIdentity);

            if (!selectedIdentity) {
                console.log('E-KUATO: 未设置身份标识');
                PageUtils.showMessage('请在插件弹窗中设置身份标识', 'error');
                return;
            }

            PageUtils.showMessage('正在抓取商品数据...', 'info');
            console.log('E-KUATO: 开始抓取商品数据');

            try {
                const productInfo = this.extractProductInfo();
                console.log('E-KUATO: 提取的商品信息:', productInfo);
                this.sendProductData(selectedTemplate, selectedIdentity, productInfo);
            } catch (error) {
                console.error('E-KUATO: 抓取失败:', error);
                PageUtils.showMessage('抓取失败: ' + error.message, 'error');
            }
        } catch (error) {
            console.error('E-KUATO: 获取存储数据失败:', error);
            if (error.message.includes('插件上下文已失效')) {
                PageUtils.showMessage('插件上下文已失效，请刷新页面重试', 'error');
            } else {
                PageUtils.showMessage('获取身份设置失败: ' + error.message, 'error');
            }
        }
    }

    /**
     * 提取商品信息
     */
    extractProductInfo() {
        const productInfo = {};

        // 售价
        const sellPriceText = $('.pdp-comp-price-current.product-price-value').text();
        const sellPrice = PageUtils.cleanPrice(sellPriceText);

        // 原价
        const originPriceText = $('span[class*="price--originalText--"]').text();
        const originPrice = PageUtils.cleanPrice(originPriceText);

        // 获取商品标题
        const productTitle = $('h1[data-pl="product-title"]').text().trim();

        productInfo.product_title = productTitle;
        productInfo.sell_price = sellPrice;
        productInfo.origin_price = originPrice;

        // 获取商品图片
        const productImages = [];
        $('div[class*="slider--slider--"] img').each(function () {
            const src = $(this).attr('src');
            if (src) productImages.push(src);
        });
        productInfo.other_images = productImages;

        // 获取SKU属性
        this.extractSkuProperties(productInfo);

        // 获取规格信息
        this.extractSpecifications(productInfo);

        // 获取商品描述
        this.extractProductDescription(productInfo);

        return productInfo;
    }

    /**
     * 提取SKU属性
     */
    extractSkuProperties(productInfo) {
        const skuProperties = $('div[class*="sku-item--property--"]');

        skuProperties.each(function () {
            const titleText = $(this).find('div[class*="sku-item--title--"]').text();

            if (titleText.includes('Color')) {
                const colorMap = {};
                $(this).find('div[class*="sku-item--skus--"] img').each(function () {
                    const src = $(this).attr('src');
                    const alt = $(this).attr('alt');
                    if (src && alt) colorMap[alt] = src;
                });
                productInfo.color_props = colorMap;
            } else {
                const sizeArr = [];
                $(this).find('div[class*="sku-item--skus--"] span').each(function () {
                    const sizeText = $(this).text().trim();
                    if (sizeText) sizeArr.push(sizeText);
                });
                productInfo.size_props = sizeArr;
            }
        });

        // 如果没有尺码属性，设置默认值
        if (!productInfo.size_props || productInfo.size_props.length === 0) {
            productInfo.size_props = ['oneSize'];
        }
    }

    /**
     * 提取规格信息
     */
    extractSpecifications(productInfo) {
        // 点击展开更多规格信息
        $('button[type="button"][style*="min-width: 160px;"]').click();

        const specMap = {};
        const specProperties = $('div[class*="specification--prop--"]');

        specProperties.each(function () {
            const specTitle = $(this).find('div[class*="specification--title--"]').text().trim();
            const specDesc = $(this).find('div[class*="specification--desc--"]').text().trim();
            if (specTitle && specDesc) {
                specMap[specTitle] = specDesc;
            }
        });

        productInfo.spec_props = specMap;
    }

    /**
     * 提取商品描述和详情图片
     */
    extractProductDescription(productInfo) {
        const productDesc = $('div[class*="detail-desc-decorate-richtext"]');
        if (productDesc.length > 0) {
            productInfo.product_desc = productDesc.text().trim();
        }

        // 获取商品详情图片
        const productDetailImages = [];
        $('div[id="nav-description"] img').each(function () {
            const src = $(this).attr('src');
            if (src) productDetailImages.push(src);
        });
        productInfo.product_desc_images = productDetailImages;
    }

    /**
     * 发送商品数据到服务器
     */
    sendProductData(template, identity, productInfo) {
        console.log('E-KUATO: 开始发送商品数据到服务器');

        const sendData = {
            template: template,
            scrapeKey: identity,
            item_url: window.location.href,
            product_info: productInfo
        };

        console.log('E-KUATO: 发送的数据:', sendData);
        console.log('E-KUATO: API地址:', `${CONFIG.API_BASE_URL}/save_product_data`);

        fetch(`${CONFIG.API_BASE_URL}/save_product_data`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(sendData)
        })
            .then(response => {
                console.log('E-KUATO: 服务器响应状态:', response.status);

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                return response.json();
            })
            .then(data => {
                console.log('E-KUATO: 服务器响应数据:', data);

                // 只在非自动模式下显示成功消息
                if (!PageUtils.isAutoMode()) {
                    PageUtils.showMessage('商品抓取成功！', 'success');
                }
                console.log('E-KUATO: 抓取成功:', data);
            })
            .catch(error => {
                console.error('E-KUATO: 抓取失败:', error);

                let errorMessage = '抓取失败，请重试';
                if (error.message.includes('Failed to fetch')) {
                    errorMessage = '无法连接到服务器，请检查服务器是否运行';
                } else if (error.message.includes('HTTP error')) {
                    errorMessage = `服务器错误: ${error.message}`;
                }

                if (!PageUtils.isAutoMode()) {
                    PageUtils.showMessage(errorMessage, 'error');
                }
            });
    }

    /**
     * 处理批量抓取
     */
    handleBatchScrape() {
        if (selectedProductHrefs.length === 0) {
            PageUtils.showMessage('请先选择要抓取的商品', 'warning');
            return;
        }

        PageUtils.showMessage(`开始批量抓取 ${selectedProductHrefs.length} 个商品...`, 'info');

        selectedProductHrefs.forEach((href, index) => {
            const autoUrl = href + '&open_mode=auto';
            setTimeout(() => {
                window.open(autoUrl, '_blank');
            }, index * CONFIG.SCRAPE_DELAY);
        });

        // 清空选择
        selectedProductHrefs = [];
        this.updateBatchButton();
    }

    /**
     * 处理自动抓取
     */
    handleAutoScrape() {
        PageUtils.showMessage('开始自动抓取...', 'info');

        if (PageUtils.isStorePage(this.currentUrl)) {
            this.autoScrapeStorePage();
        } else if (PageUtils.isSearchPage(this.currentUrl)) {
            this.autoScrapeSearchPage();
        }
    }

    /**
     * 更新批量抓取按钮文本
     */
    updateBatchButton() {
        const button = $('#ekuato-batch-scrape');
        if (button.length > 0) {
            button.html(`<span>📦</span> 批量抓取 (${selectedProductHrefs.length})`);
        }
    }

    /**
     * 自动抓取搜索页面
     */
    autoScrapeSearchPage() {
        // 滚动到页面底部加载更多商品
        PageUtils.scrollToLoadMore(() => {
            const itemLinks = $('a[class*="search-card-item"]');
            if (itemLinks.length > 0) {
                itemLinks.each((index, element) => {
                    const href = $(element).attr('href');
                    if (href) {
                        const autoUrl = href + '&open_mode=auto';
                        setTimeout(() => {
                            window.open(autoUrl, '_blank');
                        }, index * CONFIG.SCRAPE_DELAY);
                    }
                });
            }
        });
    }

    /**
     * 自动抓取店铺页面
     */
    autoScrapeStorePage() {
        // 实现店铺页面的自动抓取逻辑
        PageUtils.showMessage('店铺页面自动抓取功能开发中...', 'info');
    }

    /**
     * 处理自动模式
     */
    handleAutoMode() {
        // 检查是否为自动模式
        if (!PageUtils.isAutoMode(this.currentUrl)) return;

        if (PageUtils.isItemPage(this.currentUrl)) {
            // 自动抓取商品详情页面
            setTimeout(() => {
                this.handleScrape();
                // 延迟关闭页面
                setTimeout(() => {
                    window.close();
                }, CONFIG.AUTO_CLOSE_DELAY);
            }, 10000);
        } else if (PageUtils.isSearchPage(this.currentUrl)) {
            // 自动抓取搜索页面
            this.autoScrapeSearchPage();
        }
    }
}
