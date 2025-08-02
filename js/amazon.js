/**
 * Amazon商品数据抓取插件
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
    API_BASE_URL: 'http://127.0.0.1:8012/api/v1/open',
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
    isAmazonPage: function (url = window.location.href) {
        return url.includes('amazon.com');
    },
    isItemPage: function (url = window.location.href) {
        return url.includes('/dp/');
    },
    isStorePage: function (url = window.location.href) {
        return url.includes('/stores/');
    },
    isSearchPage: function (url = window.location.href) {
        return url.includes('/s?') || url.includes('/b/');
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
            const amazonCollector = new AmazonCollector();
            amazonCollector.init();
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
 * Amazon数据采集器主类
 */
class AmazonCollector {
    constructor() {
        this.popup = null;
        this.isAdvancedMode = true;
        this.currentUrl = window.location.href;
    }

    /**
     * 初始化采集器
     */
    init() {
        if (!PageUtils.isAmazonPage(this.currentUrl)) {
            return;
        }

        this.createPopup();
        this.bindEvents();
        this.handleAutoMode();
    }

    /**
     * 创建采集弹窗
     */
    createPopup() {
        // 检查是否已存在弹窗
        if ($('#ekuato-collector-popup').length > 0) {
            return;
        }

        this.popup = this.buildPopupElement();
        this.addPopupStyles();

        const content = this.buildPopupContent();
        this.popup.find('.ekuato-popup-content').html(content);

        $('body').append(this.popup);
        this.makePopupDraggable();

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
                <div class="ekuato-btn-group">
                    <button id="ekuato-background-scrape" class="ekuato-btn ekuato-btn-warning">
                        <span>⚡</span> 后台抓取
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
                    font-family: inherit !important;
                    text-decoration: none !important;
                    box-sizing: border-box !important;
                }

                .ekuato-btn-primary {
                    background: linear-gradient(135deg, ${CONFIG.BRAND_COLOR}, #ff6b6b) !important;
                    color: white !important;
                }

                .ekuato-btn-primary:hover {
                    background: linear-gradient(135deg, #e6325a, #ff5252) !important;
                    transform: translateY(-1px) !important;
                    box-shadow: 0 4px 12px rgba(253, 56, 79, 0.3) !important;
                }

                .ekuato-btn-secondary {
                    background: linear-gradient(135deg, #6366f1, #8b5cf6) !important;
                    color: white !important;
                }

                .ekuato-btn-secondary:hover {
                    background: linear-gradient(135deg, #5855eb, #7c3aed) !important;
                    transform: translateY(-1px) !important;
                    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3) !important;
                }

                .ekuato-btn-warning {
                    background: linear-gradient(135deg, #f59e0b, #f97316) !important;
                    color: white !important;
                }

                .ekuato-btn-warning:hover {
                    background: linear-gradient(135deg, #d97706, #ea580c) !important;
                    transform: translateY(-1px) !important;
                    box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3) !important;
                }

                .ekuato-btn-group {
                    display: flex !important;
                    gap: 8px !important;
                    margin-bottom: 12px !important;
                }

                .ekuato-btn-group .ekuato-btn {
                    flex: 1 !important;
                }

                .ekuato-message {
                    padding: 8px 12px !important;
                    border-radius: 6px !important;
                    margin-bottom: 12px !important;
                    font-size: 13px !important;
                    font-weight: 500 !important;
                    display: none !important;
                    opacity: 0 !important;
                    transition: all 0.3s ease !important;
                }

                .ekuato-message.show {
                    display: block !important;
                    opacity: 1 !important;
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

                /* 产品选择样式 */
                .ekuato-product-selected {
                    border: 3px solid #10b981 !important;
                    background-color: rgba(16, 185, 129, 0.1) !important;
                }

                .ekuato-select-btn {
                    position: absolute !important;
                    top: 8px !important;
                    left: 8px !important;
                    background: #10b981 !important;
                    color: white !important;
                    border: none !important;
                    padding: 4px 8px !important;
                    border-radius: 4px !important;
                    font-size: 12px !important;
                    cursor: pointer !important;
                    z-index: 10 !important;
                    transition: all 0.2s !important;
                }

                .ekuato-select-btn:hover {
                    background: #059669 !important;
                    transform: scale(1.05) !important;
                }

                .ekuato-select-btn.selected {
                    background: #dc2626 !important;
                }

                .ekuato-select-btn.selected:hover {
                    background: #b91c1c !important;
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
                if (popupDragState.isDragging) {
                    const newX = e.clientX - popupDragState.startX;
                    const newY = e.clientY - popupDragState.startY;
                    
                    this.popup.css({
                        left: Math.max(0, Math.min(newX, $(window).width() - this.popup.outerWidth())),
                        top: Math.max(0, Math.min(newY, $(window).height() - this.popup.outerHeight())),
                        right: 'auto',
                        bottom: 'auto'
                    });
                }
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
        // 关闭弹窗
        $(document).on('click', '.ekuato-popup-close', () => {
            this.popup.fadeOut();
        });

        // 模板选择变化
        $(document).on('change', '#ekuato-template', (e) => {
            const selectedTemplate = $(e.target).val();
            if (selectedTemplate) {
                chrome.storage.sync.set({ 'template': selectedTemplate }, () => {
                    console.log('E-KUATO: 模板已保存:', selectedTemplate);
                });
            }
        });

        // 绑定产品选择事件
        this.bindProductSelection();

        // 加载模板列表
        this.loadTemplateList();
    }

    /**
     * 绑定按钮事件
     */
    bindButtonEvents() {
        console.log('E-KUATO: 绑定按钮事件');

        // 立即抓取按钮
        $(document).off('click', '#ekuato-scrape').on('click', '#ekuato-scrape', () => {
            console.log('E-KUATO: 点击立即抓取按钮');
            this.handleScrape();
        });

        // 批量抓取按钮
        $(document).off('click', '#ekuato-batch-scrape').on('click', '#ekuato-batch-scrape', () => {
            console.log('E-KUATO: 点击批量抓取按钮');
            this.handleBatchScrape();
        });

        // 自动抓取按钮
        $(document).off('click', '#ekuato-auto-scrape').on('click', '#ekuato-auto-scrape', () => {
            console.log('E-KUATO: 点击自动抓取按钮');
            this.handleAutoScrape();
        });

        // 后台抓取按钮
        $(document).off('click', '#ekuato-background-scrape').on('click', '#ekuato-background-scrape', () => {
            console.log('E-KUATO: 点击后台抓取按钮');
            this.handleBackgroundScrape();
        });
    }

    /**
     * 绑定产品选择事件
     */
    bindProductSelection() {
        if (!this.isAdvancedMode || !PageUtils.isSearchPage()) return;

        // 搜索结果页面产品选择
        $(document).on('mouseenter', '.s-result-item', function() {
            if ($(this).find('.ekuato-select-btn').length === 0) {
                const selectBtn = $('<button class="ekuato-select-btn">选择</button>');
                $(this).css('position', 'relative').prepend(selectBtn);
            }
        }).on('mouseleave', '.s-result-item', function() {
            if (!$(this).hasClass('ekuato-product-selected')) {
                $(this).find('.ekuato-select-btn').remove();
            }
        });

        // 类目页面产品选择
        $(document).on('mouseenter', '.dcl-carousel-element', function() {
            if ($(this).find('.ekuato-select-btn').length === 0) {
                const selectBtn = $('<button class="ekuato-select-btn">选择</button>');
                $(this).css('position', 'relative').prepend(selectBtn);
            }
        }).on('mouseleave', '.dcl-carousel-element', function() {
            if (!$(this).hasClass('ekuato-product-selected')) {
                $(this).find('.ekuato-select-btn').remove();
            }
        });

        // 选择按钮点击事件
        $(document).on('click', '.ekuato-select-btn', (e) => {
            e.stopPropagation();
            e.preventDefault();
            
            const $btn = $(e.target);
            const $item = $btn.closest('.s-result-item, .dcl-carousel-element');
            
            if ($item.hasClass('ekuato-product-selected')) {
                // 取消选择
                $item.removeClass('ekuato-product-selected');
                $btn.removeClass('selected').text('选择');
                
                // 从选择列表中移除
                const href = this.getProductHref($item);
                selectedProductHrefs = selectedProductHrefs.filter(h => h !== href);
            } else {
                // 选择产品
                $item.addClass('ekuato-product-selected');
                $btn.addClass('selected').text('已选');
                
                // 添加到选择列表
                const href = this.getProductHref($item);
                if (href && !selectedProductHrefs.includes(href)) {
                    selectedProductHrefs.push(href);
                }
            }
            
            // 更新批量抓取按钮文本
            this.updateBatchButtonText();
        });
    }

    /**
     * 获取产品链接
     */
    getProductHref($item) {
        let href = null;
        
        if ($item.hasClass('s-result-item')) {
            // 搜索结果页面
            href = $item.find('a[href*="/dp/"]').first().attr('href');
        } else if ($item.hasClass('dcl-carousel-element')) {
            // 类目页面
            href = $item.find('a.dcl-product-link').attr('href');
        }
        
        return href ? href.split('ref=')[0] : null;
    }

    /**
     * 更新批量抓取按钮文本
     */
    updateBatchButtonText() {
        const $batchBtn = $('#ekuato-batch-scrape');
        if ($batchBtn.length > 0) {
            $batchBtn.html(`<span>📦</span> 批量抓取 (${selectedProductHrefs.length})`);
        }
    }

    /**
     * 加载模板列表
     */
    loadTemplateList() {
        $.ajax({
            url: 'http://127.0.0.1:8012/api/get_all_catalog',
            method: 'GET',
            success: (data) => {
                const options = data.result || [];
                const $select = $('#ekuato-template');
                
                options.forEach(option => {
                    $select.append($('<option>', {
                        value: option.catalog,
                        text: option.catalog_title
                    }));
                });
                
                // 恢复之前选择的模板
                chrome.storage.sync.get(['template'], (result) => {
                    if (result.template) {
                        $select.val(result.template);
                    }
                });
            },
            error: (xhr, status, error) => {
                console.error('E-KUATO: 加载模板列表失败:', error);
                PageUtils.showMessage('加载模板列表失败', 'error');
            }
        });
    }

    /**
     * 处理自动模式
     */
    handleAutoMode() {
        if (!PageUtils.isAutoMode()) return;

        if (PageUtils.isItemPage()) {
            // 商品详情页自动抓取
            setTimeout(() => {
                this.handleScrape();
                setTimeout(() => {
                    window.close();
                }, CONFIG.SCRAPE_DELAY);
            }, 5000);
        } else if (PageUtils.isSearchPage()) {
            // 搜索页面自动抓取
            setTimeout(() => {
                this.autoScrapeList();
            }, CONFIG.SCRAPE_DELAY);
        }
    }

    /**
     * 处理单个商品抓取
     */
    async handleScrape() {
        console.log('E-KUATO: 开始抓取商品');
        
        const selectedTemplate = $('#ekuato-template').val();
        
        try {
            const result = await new Promise((resolve, reject) => {
                chrome.storage.sync.get(['scrapeKey', 'timeRange', 'productRatingCheck', 'descriptionImageCheck'], (result) => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                    } else {
                        resolve(result);
                    }
                });
            });
            
            const selectedIdentity = result.scrapeKey;
            
            if (!selectedIdentity) {
                PageUtils.showMessage('请在插件弹窗中设置身份标识', 'error');
                return;
            }
            
            // 获取配置项，设置默认值
            const timeRange = result.timeRange || '2025';
            const productRatingCheck = result.productRatingCheck || 'false';
            const descriptionImageCheck = result.descriptionImageCheck || 'false';
            
            console.log('E-KUATO: 配置项:', { timeRange, productRatingCheck, descriptionImageCheck });

            // 检查配置项并给出相应提示
            const configChecks = await this.checkCollectionConfig(timeRange, productRatingCheck, descriptionImageCheck);
            if (!configChecks.canProceed) {
                return;
            }
            
            this.performScrape(selectedTemplate, selectedIdentity);
        } catch (error) {
            console.error('E-KUATO: 获取存储数据失败:', error);
            PageUtils.showMessage('获取配置失败: ' + error.message, 'error');
        }
    }

    /**
     * 处理批量抓取
     */
    handleBatchScrape() {
        if (selectedProductHrefs.length === 0) {
            PageUtils.showMessage('请先选择要抓取的商品', 'warning');
            return;
        }
        
        PageUtils.showMessage(`开始批量抓取 ${selectedProductHrefs.length} 个商品`, 'info');
        
        selectedProductHrefs.forEach((href, index) => {
            const autoUrl = href + (href.includes('?') ? '&' : '?') + 'open_mode=auto';
            setTimeout(() => {
                window.open(autoUrl, '_blank');
            }, index * 10000);
        });
        
        // 清空选择
        selectedProductHrefs = [];
        $('.ekuato-product-selected').removeClass('ekuato-product-selected');
        $('.ekuato-select-btn.selected').removeClass('selected').text('选择');
        this.updateBatchButtonText();
    }

    /**
     * 处理自动抓取
     */
    handleAutoScrape() {
        PageUtils.showMessage('开始自动抓取所有页面', 'info');
        this.autoScrapePage();
    }

    /**
     * 处理后台抓取
     */
    async handleBackgroundScrape() {
        const selectedTemplate = $('#ekuato-template').val();
        
        try {
            // 获取所有配置
            const result = await new Promise((resolve) => {
                chrome.storage.sync.get(['scrapeKey', 'timeRange', 'productRatingCheck', 'descriptionImageCheck'], resolve);
            });
            
            const selectedIdentity = result.scrapeKey;
            const timeRange = result.timeRange || 'all';
            const productRatingCheck = result.productRatingCheck || 'false';
            const descriptionImageCheck = result.descriptionImageCheck || 'false';
            
            if (!selectedIdentity) {
                PageUtils.showMessage('请在插件弹窗中设置身份标识', 'error');
                return;
            }
            
            // 检查采集配置
            const configCheck = await this.checkCollectionConfig(timeRange, productRatingCheck, descriptionImageCheck);
            if (!configCheck.canProceed) {
                return;
            }
            
            this.performBackgroundScrape(selectedTemplate, selectedIdentity);
        } catch (error) {
            console.error('E-KUATO: 后台抓取配置检查失败:', error);
            PageUtils.showMessage('配置检查失败，请重试', 'error');
        }
    }

    /**
     * 检查采集配置
     */
    async checkCollectionConfig(timeRange, productRatingCheck, descriptionImageCheck) {
        console.log('E-KUATO: 开始检查采集配置');
        
        // 时间范围检查
        if (timeRange === '2025') {
            const currentYear = new Date().getFullYear();
            if (currentYear !== 2025) {
                const confirmMessage = `当前配置为仅采集2025年商品，但现在是${currentYear}年。是否继续采集？`;
                if (!confirm(confirmMessage)) {
                    PageUtils.showMessage('用户取消采集操作', 'info');
                    return { canProceed: false };
                }
            }
        } else if (timeRange === 'recent-2-years') {
            const currentYear = new Date().getFullYear();
            const confirmMessage = `当前配置为采集最近两年（${currentYear-1}-${currentYear}）的商品。是否继续？`;
            if (!confirm(confirmMessage)) {
                PageUtils.showMessage('用户取消采集操作', 'info');
                return { canProceed: false };
            }
        }
        
        // 选品评分检查
        if (productRatingCheck === 'true') {
            const ratingScore = await this.showProductRatingDialog();
            if (ratingScore === null) {
                PageUtils.showMessage('用户取消评分，采集终止', 'info');
                return { canProceed: false };
            }
            console.log('E-KUATO: 用户评分:', ratingScore);
        }
        
        // 描述图为空检查
        if (descriptionImageCheck === 'true') {
            const hasDescImages = this.checkDescriptionImages();
            if (!hasDescImages) {
                const confirmMessage = '检测到商品描述图片为空，是否继续采集？';
                if (!confirm(confirmMessage)) {
                    PageUtils.showMessage('用户取消采集操作', 'info');
                    return { canProceed: false };
                }
            }
        }
        
        return { canProceed: true };
    }
    
    /**
     * 显示商品评分对话框
     */
    async showProductRatingDialog() {
        return new Promise((resolve) => {
            const rating = prompt('请为此商品打分（1-10分，10分为最高）：');
            if (rating === null) {
                resolve(null); // 用户取消
            } else {
                const score = parseInt(rating);
                if (isNaN(score) || score < 1 || score > 10) {
                    alert('请输入1-10之间的有效数字');
                    resolve(this.showProductRatingDialog()); // 递归重新询问
                } else {
                    resolve(score);
                }
            }
        });
    }
    
    /**
     * 检查商品描述图片是否为空
     */
    checkDescriptionImages() {
        const productDetailImages = [];
        // Amazon商品详情图片选择器
        $('#feature-bullets img, #aplus img, #productDescription img').each(function () {
            const src = $(this).attr('src');
            if (src && !src.includes('data:image')) {
                productDetailImages.push(src);
            }
        });
        
        console.log('E-KUATO: 检测到的描述图片数量:', productDetailImages.length);
        return productDetailImages.length > 0;
    }

    /**
     * 执行实际的抓取操作
     */
    performScrape(selectedTemplate, selectedIdentity) {
        console.log('E-KUATO: 执行商品抓取');
        
        const productInfo = this.extractProductInfo();
        
        if (!productInfo) {
            PageUtils.showMessage('无法提取商品信息', 'error');
            return;
        }
        
        const sendData = {
            template: selectedTemplate,
            scrapeKey: selectedIdentity,
            item_url: window.location.href,
            product_info: productInfo,
            scrape_type: 'single'
        };
        
        fetch('http://127.0.0.1:8012/api/v1/open/scrape', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(sendData)
        })
        .then(response => response.json())
        .then(data => {
            if (!PageUtils.isAutoMode()) {
                PageUtils.showMessage('抓取成功', 'success');
            }
            console.log('E-KUATO: 抓取成功', data);
        })
        .catch(error => {
            if (!PageUtils.isAutoMode()) {
                PageUtils.showMessage('抓取失败', 'error');
            }
            console.error('E-KUATO: 抓取失败', error);
        });
    }

    /**
     * 执行后台抓取
     */
    performBackgroundScrape(selectedTemplate, selectedIdentity) {
        const sendData = {
            template: selectedTemplate,
            scrapeKey: selectedIdentity,
            scrape_type: 'batch',
            item_url: window.location.href,
            cookies: this.getCookies()
        };
        
        fetch('http://127.0.0.1:8012/api/v1/open/scrape', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(sendData)
        })
        .then(response => response.json())
        .then(data => {
            PageUtils.showMessage('后台抓取任务已提交', 'success');
            console.log('E-KUATO: 后台抓取成功', data);
        })
        .catch(error => {
            PageUtils.showMessage('后台抓取失败', 'error');
            console.error('E-KUATO: 后台抓取失败', error);
        });
    }

    /**
     * 获取Cookie信息
     */
    getCookies() {
        const cookies = document.cookie;
        const cookiesAttrs = [];
        
        cookies.split(';').forEach(cookie => {
            const [name, value] = cookie.split('=');
            if (name && value) {
                cookiesAttrs.push({
                    name: name.trim(),
                    value: value.trim(),
                    domain: '.amazon.com',
                    path: '/',
                    secure: false,
                    httpOnly: false
                });
            }
        });
        
        return cookiesAttrs;
    }

    /**
     * 自动抓取页面
     */
    autoScrapePage() {
        let pageNum = 1;
        
        // 获取总页数
        $('.s-pagination-container .s-pagination-item').each(function() {
            const text = $(this).text().trim();
            if (text && !text.includes('Next') && !text.includes('Previous') && !isNaN(text)) {
                pageNum = Math.max(pageNum, parseInt(text));
            }
        });
        
        // 依次打开每一页
        for (let i = 1; i <= pageNum; i++) {
            const urlParams = new URLSearchParams(window.location.search);
            urlParams.set('page', i);
            urlParams.set('ref', `sr_pg_${i - 1}`);
            urlParams.set('open_mode', 'auto');
            
            const autoUrl = `${window.location.origin}${window.location.pathname}?${urlParams.toString()}`;
            
            setTimeout(() => {
                window.open(autoUrl, '_blank');
            }, i * 10000);
        }
    }

    /**
     * 自动抓取列表页面
     */
    autoScrapeList() {
        PageUtils.scrollToLoadMore(() => {
            const itemLinks = $('div[data-component-type="s-search-result"] a[href*="/dp/"]');
            const cleanHrefs = [];
            const autoUrls = [];
            
            itemLinks.each(function() {
                const href = $(this).attr('href');
                const cleanHref = href.split('ref=')[0];
                
                if (cleanHref && !cleanHrefs.includes(cleanHref) && cleanHref.includes('/dp/')) {
                    cleanHrefs.push(cleanHref);
                    const autoUrl = href + (href.includes('?') ? '&' : '?') + 'open_mode=auto';
                    autoUrls.push(autoUrl);
                }
            });
            
            autoUrls.forEach((autoUrl, index) => {
                setTimeout(() => {
                    window.open(autoUrl, '_blank');
                }, index * 5000);
            });
        });
    }

    /**
     * 提取商品信息
     */
    extractProductInfo() {
        const productInfo = {};
        
        try {
            // 获取品牌
            let brandText = $('#bylineInfo').text();
            let brandName = '';
            
            if (brandText && brandText.includes('Visit the')) {
                const regex = /Visit the (.*?) Store/;
                const matched = brandText.match(regex);
                if (matched) {
                    brandName = matched[1];
                }
            }
            
            if (brandText && !brandName) {
                brandName = brandText.replace('Brand: ', '').trim();
            }
            
            // 获取售价
            let sellPriceText = $('.apexPriceToPay .a-offscreen').text();
            if (!sellPriceText) {
                sellPriceText = $('#corePriceDisplay_desktop_feature_div .aok-offscreen').text();
            }
            
            if (!sellPriceText) {
                console.warn('E-KUATO: 无法获取商品价格');
                return null;
            }
            
            const sellPrice = PageUtils.cleanPrice(sellPriceText);
            
            // 获取商品标题
            const productTitleText = $('#productTitle').text();
            const productTitle = productTitleText.replace(brandName, '').trim();
            
            productInfo.product_title = productTitle;
            productInfo.sell_price = sellPrice;
            productInfo.origin_price = sellPrice;
            
            // 获取尺码
            const sizeOptions = [];
            $('#native_dropdown_selected_size_name option').each(function() {
                const sizeVal = $(this).val();
                if (sizeVal && sizeVal !== '-1') {
                    sizeOptions.push($(this).text());
                }
            });
            
            productInfo.size_props = sizeOptions.length > 0 ? sizeOptions : ['One Size'];
            
            // 获取颜色
            const colorOptions = {};
            $('#variation_color_name img').each(function() {
                const colorName = $(this).attr('alt');
                const colorImage = $(this).attr('src');
                if (colorName) {
                    colorOptions[colorName] = colorImage || '';
                }
            });
            
            if (Object.keys(colorOptions).length > 0) {
                productInfo.color_props = colorOptions;
            } else {
                const colorName = $('#variation_color_name .selection').text() || 'oneColor';
                productInfo.color_props = { [colorName]: '' };
            }
            
            // 获取颜色图片信息
            this.extractColorImages(productInfo);
            
            // 获取商品规格
            const productSpecifications = [];
            $('div[class*="product-facts-detail"]').each(function() {
                const title = $(this).find('div[class*="a-col-left"]').text().trim();
                const value = $(this).find('div[class*="a-col-right"]').text().trim();
                if (title && value) {
                    productSpecifications.push({ title, value });
                }
            });
            
            productInfo.spec_props = productSpecifications;
            
            // 商品描述
            const productDescs = [];
            $('div[class*="a-list-item a-size-base a-color-base"]').each(function() {
                const desc = $(this).text().replace(brandName, '').trim();
                if (desc) {
                    productDescs.push(desc);
                }
            });
            
            productInfo.product_offical_arrs = productDescs;
            
            // 处理产品描述HTML
            const descHtml = $('#productDescription').html();
            if (descHtml) {
                const specsArrs = descHtml.split(/<br\s*\/?>/i);
                const cleanedSpecs = specsArrs
                    .map(line => line.replace(/<[^>]+>/g, '').trim())
                    .filter(line => line !== '');
                
                const diyArrs = [];
                cleanedSpecs.forEach(line => {
                    if (line.includes(':')) {
                        const [title, value] = line.split(':');
                        productSpecifications.push({
                            title: title.trim(),
                            value: value.trim()
                        });
                    } else {
                        diyArrs.push(line);
                    }
                });
                
                productInfo.spec_props = productSpecifications;
                productInfo.product_diy_arrs = diyArrs;
            }
            
            // 尺码表
            const sizeChartHtml = $('#a-popover-sizeChartV2').html();
            if (sizeChartHtml) {
                productInfo.size_chart_html = sizeChartHtml;
            }
            
            console.log('E-KUATO: 提取的商品信息:', productInfo);
            return productInfo;
            
        } catch (error) {
            console.error('E-KUATO: 提取商品信息时出错:', error);
            return null;
        }
    }

    /**
     * 提取颜色图片信息
     */
    extractColorImages(productInfo) {
        $('script').each(function() {
            const scriptContent = $(this).html();
            const startSplit = 'var obj = jQuery.parseJSON(';
            const endSplit = ');\ndata["alwaysIncludeVideo"] = obj.alwaysIncludeVideo';
            
            if (scriptContent.includes('var obj = jQuery.parseJSON(\'{"dataInJson":null,"alwaysIncludeVideo":true,"autoplayVideo":false,"defaultColor":"initial"')) {
                try {
                    let colorJsonTxt = scriptContent.substring(
                        scriptContent.indexOf(startSplit) + startSplit.length + 1,
                        scriptContent.indexOf(endSplit)
                    );
                    
                    let colorJson = {};
                    try {
                        colorJson = jQuery.parseJSON(colorJsonTxt);
                    } catch (e) {
                        colorJsonTxt = colorJsonTxt.replace(/\\/g, '\\\\');
                        colorJson = jQuery.parseJSON(colorJsonTxt);
                    }
                    
                    const colorImages = colorJson.colorImages;
                    if (colorImages) {
                        const colorImagesArr = [];
                        
                        for (const key in colorImages) {
                            const colorName = key;
                            const colorImageArr = colorImages[key];
                            const colorItem = { color_name: colorName };
                            const otherImages = [];
                            
                            colorImageArr.forEach(imageItem => {
                                if (imageItem.variant === 'MAIN') {
                                    colorItem.main_image = imageItem.hiRes;
                                } else {
                                    otherImages.push(imageItem.hiRes);
                                }
                            });
                            
                            colorItem.other_images = otherImages;
                            colorImagesArr.push(colorItem);
                        }
                        
                        productInfo.color_images = colorImagesArr;
                    }
                } catch (error) {
                    console.warn('E-KUATO: 解析颜色图片信息失败:', error);
                }
            }
        });
    }
}

// 初始化Amazon收集器
if (PageUtils.isAmazonPage()) {
    const amazonCollector = new AmazonCollector();
    amazonCollector.init();
    
    // 调试工具
    window.ekuatoDebug = {
        collector: amazonCollector,
        config: CONFIG,
        utils: PageUtils,
        selectedProducts: selectedProductHrefs
    };
}
