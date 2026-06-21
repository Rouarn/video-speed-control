/**
 * Popup Script - 弹窗面板交互逻辑
 * 负责与浏览器扩展 API 通信，获取视频倍速状态并更新 UI
 */

/**
 * 更新弹窗 UI 显示
 * 设置当前倍速文本和按钮高亮状态
 * @param {number} rate - 当前视频倍速值
 */
function updateUI(rate) {
  // 更新倍速显示文本
  const display = document.getElementById("speed-display");
  if (display) {
    display.textContent = `当前倍速: ${rate}x`;
  }

  // 更新按钮高亮状态
  document.querySelectorAll("button").forEach(btn => {
    const btnRate = parseFloat(btn.dataset.rate);
    if (btnRate === rate) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });
}

/**
 * 判断 URL 是否为受限协议
 * 浏览器内部页面（如 chrome://、about://）不支持注入脚本
 * @param {string} url - 要检查的 URL
 * @returns {boolean} 是否为受限 URL
 */
function isRestrictedUrl(url) {
  const restrictedProtocols = [
    "chrome://", // Chrome 内部页面
    "edge://", // Edge 内部页面
    "about://", // 通用浏览器内部页面
    "moz://", // Mozilla 内部页面
    "opera://", // Opera 内部页面
  ];
  return restrictedProtocols.some(protocol =>
    url.toLowerCase().startsWith(protocol),
  );
}

/**
 * 显示受限页面提示
 * 在浏览器内部页面禁用所有功能并显示提示信息
 */
function showRestrictedMessage() {
  const display = document.getElementById("speed-display");
  if (display) {
    display.textContent = "不支持此页面";
    display.style.color = "#e53935"; // 红色提示
  }

  // 禁用所有按钮
  document.querySelectorAll("button").forEach(btn => {
    btn.disabled = true;
    btn.style.opacity = "0.5";
    btn.style.cursor = "not-allowed";
  });
}

/**
 * 获取当前标签页视频的播放速度
 * 通过 chrome.scripting API 在页面中执行脚本获取倍速值
 * @param {number} tabId - 当前标签页 ID
 */
function getCurrentVideoSpeed(tabId) {
  chrome.scripting.executeScript(
    {
      target: { tabId: tabId },
      // 在目标页面执行的函数
      func: () => {
        const videos = document.querySelectorAll("video");
        if (videos.length === 0) return null;
        // 优先选择正在播放的视频，否则返回第一个
        const video = Array.from(videos).find(v => !v.paused) || videos[0];
        return video.playbackRate;
      },
    },
    results => {
      // 处理执行错误
      if (chrome.runtime.lastError) {
        console.log("executeScript error:", chrome.runtime.lastError.message);
        return;
      }

      // 更新 UI 显示
      if (results && results[0] && results[0].result !== null) {
        const currentRate = results[0].result;
        updateUI(currentRate);
      } else {
        const display = document.getElementById("speed-display");
        if (display) {
          display.textContent = "未检测到视频";
        }
      }
    },
  );
}

/**
 * 弹窗加载完成后的初始化逻辑
 * 获取当前活动标签页信息，检测页面类型并绑定按钮事件
 */
document.addEventListener("DOMContentLoaded", () => {
  // 获取当前活动标签页
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (tabs.length === 0) return;

    const tab = tabs[0];
    const tabId = tab.id;
    const url = tab.url || "";

    // 检查是否为受限页面
    if (isRestrictedUrl(url)) {
      showRestrictedMessage();
      return;
    }

    // 获取当前视频倍速并更新 UI
    getCurrentVideoSpeed(tabId);

    // 为每个倍速按钮绑定点击事件
    document.querySelectorAll("button").forEach(button => {
      button.addEventListener("click", () => {
        const rate = parseFloat(button.dataset.rate);

        // 更新弹窗 UI
        updateUI(rate);

        // 在目标页面执行脚本设置倍速
        chrome.scripting.executeScript(
          {
            target: { tabId: tabId },
            // 在目标页面执行的函数
            func: targetRate => {
              const videos = document.querySelectorAll("video");
              if (videos.length === 0) return;
              // 优先选择正在播放的视频，否则返回第一个
              const video =
                Array.from(videos).find(v => !v.paused) || videos[0];
              video.playbackRate = targetRate;
            },
            args: [rate], // 传递给目标函数的参数
          },
          () => {
            // 处理执行错误
            if (chrome.runtime.lastError) {
              console.log(
                "executeScript error:",
                chrome.runtime.lastError.message,
              );
            }
          },
        );
      });
    });
  });
});
