// 新标签打开网页
$("#store_home").click(() => {
  chrome.tabs.create({ url: "http://127.0.0.1:8123" });
});


$(document).ready(function () {
  var apiKey = "";

  // 显示状态消息
  function showMessage(message, type = 'info') {
    const messageEl = $('#statusMessage');
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

  // 初始化
  loadSavedIdentity();

  // 绑定保存按钮事件
  $("#saveIdentity").click(function () {
    saveIdentity();
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


});
