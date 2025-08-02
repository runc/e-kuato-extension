// 新标签打开网页
$("#store_home").click(() => {
  chrome.tabs.create({ url: "http://127.0.0.1:8123" });
});


$(document).ready(function () {
  var apiKey = "";
  var timeRange = "2025"; // 默认时间范围
  var productRatingCheck = "false"; // 默认不检查商品评分
  var descriptionImageCheck = "false"; // 默认不检查描述图

  // 显示状态消息
  function showMessage(message, type = 'info', elementId = 'statusMessage') {
    const messageEl = $('#' + elementId);
    messageEl.removeClass('success error info')
      .addClass(type)
      .text(message)
      .show();

    // 3秒后自动隐藏
    setTimeout(() => {
      messageEl.fadeOut();
    }, 3000);
  }

  // 加载保存的身份设置
  function loadSavedIdentity() {
    chrome.storage.sync.get(['scrapeKey'], function (result) {
      if (result.scrapeKey) {
        $("#scrape-key").val(result.scrapeKey);
        apiKey = result.scrapeKey;
        showMessage('已加载保存的身份设置', 'info');
      }
    });
  }

  // 加载保存的采集配置
  function loadSavedCollectionConfig() {
    chrome.storage.sync.get(['timeRange', 'productRatingCheck', 'descriptionImageCheck'], function (result) {
      if (result.timeRange) {
        $("#time-range").val(result.timeRange);
        timeRange = result.timeRange;
      }
      if (result.productRatingCheck !== undefined) {
        $("#product-rating-check").val(result.productRatingCheck);
        productRatingCheck = result.productRatingCheck;
      }
      if (result.descriptionImageCheck !== undefined) {
        $("#description-image-check").val(result.descriptionImageCheck);
        descriptionImageCheck = result.descriptionImageCheck;
      }
      if (result.timeRange || result.productRatingCheck !== undefined || result.descriptionImageCheck !== undefined) {
        showMessage('已加载保存的采集配置', 'info', 'collectionStatusMessage');
      }
    });
  }

  // 保存身份设置
  function saveIdentity() {
    const identity = $("#scrape-key").val().trim();

    if (!identity) {
      showMessage('请输入身份标识', 'error');
      return;
    }

    chrome.storage.sync.set({ scrapeKey: identity }, function () {
      if (chrome.runtime.lastError) {
        showMessage('保存失败: ' + chrome.runtime.lastError.message, 'error');
      } else {
        apiKey = identity;
        showMessage('身份设置保存成功！', 'success');
        console.log('身份已保存:', identity);
      }
    });
  }

  // 保存采集配置
  function saveCollectionConfig() {
    const selectedTimeRange = $("#time-range").val();
    const selectedRatingCheck = $("#product-rating-check").val();
    const selectedImageCheck = $("#description-image-check").val();

    const configData = {
      timeRange: selectedTimeRange,
      productRatingCheck: selectedRatingCheck,
      descriptionImageCheck: selectedImageCheck
    };

    chrome.storage.sync.set(configData, function () {
      if (chrome.runtime.lastError) {
        showMessage('保存失败: ' + chrome.runtime.lastError.message, 'error', 'collectionStatusMessage');
      } else {
        timeRange = selectedTimeRange;
        productRatingCheck = selectedRatingCheck;
        descriptionImageCheck = selectedImageCheck;
        showMessage('采集配置保存成功！', 'success', 'collectionStatusMessage');
        console.log('采集配置已保存:', configData);
      }
    });
  }

  // 初始化
  loadSavedIdentity();
  loadSavedCollectionConfig();

  // 绑定保存按钮事件
  $("#saveIdentity").click(function () {
    saveIdentity();
  });

  // 绑定采集配置保存按钮事件
  $("#saveCollectionConfig").click(function () {
    saveCollectionConfig();
  });

  // 绑定输入框回车事件
  $("#scrape-key").keypress(function (e) {
    if (e.which === 13) { // Enter键
      saveIdentity();
    }
  });

  // 绑定输入框失焦事件（自动保存）
  $("#scrape-key").blur(function () {
    const identity = $(this).val().trim();
    if (identity && identity !== apiKey) {
      saveIdentity();
    }
  });

  // 绑定配置选择器变化事件（自动保存）
  $("#time-range, #product-rating-check, #description-image-check").change(function () {
    saveCollectionConfig();
  });


});
