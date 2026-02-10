// 更新 UI 显示
function updateUI(rate) {
  // 更新文本显示
  const display = document.getElementById('speed-display');
  if (display) {
    display.textContent = `当前倍速: ${rate}x`;
  }

  // 更新按钮高亮
  document.querySelectorAll('button').forEach(btn => {
    const btnRate = parseFloat(btn.dataset.rate);
    if (btnRate === rate) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

// 获取当前页面视频倍速
function getCurrentVideoSpeed(tabId) {
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: () => {
      const videos = document.querySelectorAll('video');
      if (videos.length === 0) return null;
      // 优先正在播放的视频
      const video = Array.from(videos).find(v => !v.paused) || videos[0];
      return video.playbackRate;
    }
  }, (results) => {
    if (results && results[0] && results[0].result !== null) {
      const currentRate = results[0].result;
      updateUI(currentRate);
    } else {
      document.getElementById('speed-display').textContent = '未检测到视频';
    }
  });
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length === 0) return;
    const tabId = tabs[0].id;
    
    // 初始化时获取当前速度
    getCurrentVideoSpeed(tabId);

    // 为每个按钮绑定点击事件
    document.querySelectorAll('button').forEach(button => {
      button.addEventListener('click', () => {
        const rate = parseFloat(button.dataset.rate);
        
        // 立即更新 UI（乐观更新）
        updateUI(rate);

        // 向页面注入脚本以设置倍速
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          func: (targetRate) => {
            const videos = document.querySelectorAll('video');
            if (videos.length === 0) return;
            const video = Array.from(videos).find(v => !v.paused) || videos[0];
            video.playbackRate = targetRate;
          },
          args: [rate]
        });
      });
    });
  });
});
