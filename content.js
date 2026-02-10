// 获取最相关的视频元素
function getActiveVideo() {
  const videos = Array.from(document.querySelectorAll('video'));
  if (videos.length === 0) return null;

  // 优先选择正在播放的视频
  const playing = videos.find(v => !v.paused);
  if (playing) return playing;

  // 否则返回第一个
  return videos[0];
}

// 显示倍速提示浮层
let toastTimeout;
let toastElement = null;

function getToastElement() {
  // 如果元素已存在，直接返回
  if (toastElement) return toastElement;

  // 创建新元素
  toastElement = document.createElement('div');
  toastElement.id = 'vsc-speed-toast-overlay';
  
  // 设置极高优先级的内联样式
  toastElement.style.cssText = `
    position: absolute;
    top: 20px;
    left: 20px;
    z-index: 2147483647;
    background-color: rgba(0, 0, 0, 0.8);
    color: #fff;
    padding: 10px 18px;
    border-radius: 6px;
    font-family: sans-serif;
    font-size: 24px;
    font-weight: bold;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.2s ease;
    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    text-shadow: 0 1px 2px rgba(0,0,0,0.5);
    display: block !important;
    visibility: visible !important;
  `;

  return toastElement;
}

// 简单的显示函数，支持自定义保持时间
function showToast(text, duration = 1500) {
  const toast = getToastElement();
  
  // 关键修复：动态判断插入位置
  // 如果处于全屏模式，必须将提示框插入到全屏元素内部，否则会被遮挡
  const container = document.fullscreenElement || document.body || document.documentElement;
  
  // 如果父节点变了，重新挂载
  if (toast.parentNode !== container) {
    container.appendChild(toast);
  }

  // 更新内容
  toast.textContent = text;
  
  // 显示
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
  });
  
  // 定时隐藏
  if (toastTimeout) clearTimeout(toastTimeout);
  if (duration > 0) {
    toastTimeout = setTimeout(() => {
      toast.style.opacity = '0';
    }, duration);
  }
}

// 安全设置播放速度（限制范围 0.1 ~ 16.0）
function setPlaybackRate(video, rate) {
  const clamped = Math.min(16.0, Math.max(0.1, parseFloat(rate.toFixed(1))));
  video.playbackRate = clamped;
  console.log(`[Video Speed] Set to ${clamped}x`);
  showToast(`${clamped}x`);
}

// 数字键输入缓冲
let inputBuffer = '';
let inputTimer = null;

// 全局键盘监听（使用捕获阶段，优先触发）
document.addEventListener('keydown', (e) => {
  // 忽略可编辑区域（避免干扰打字）
  if (
    e.target.tagName === 'INPUT' ||
    e.target.tagName === 'TEXTAREA' ||
    e.target.isContentEditable
  ) {
    return;
  }

  const video = getActiveVideo();
  if (!video) return;

  const key = e.key.toLowerCase();
  
  // 处理数字键 (0-9)
  if (/^\d$/.test(key)) {
    // 阻止默认行为（防止网页自身的快捷键，如 YouTube 的 0-9 跳转）
    e.preventDefault();
    e.stopPropagation();

    inputBuffer += key;
    showToast(`输入: ${inputBuffer}`, 0); // 0 表示不自动消失，直到输入完成

    if (inputTimer) clearTimeout(inputTimer);
    inputTimer = setTimeout(() => {
      const rate = parseInt(inputBuffer, 10);
      inputBuffer = '';
      
      // 只有有效的倍速才应用 (0 被视为无效或暂停，这里暂不处理为暂停，避免误操作)
      if (rate > 0) {
        setPlaybackRate(video, rate);
      } else {
        // 如果输入了 0，可以选择重置为 1.0 或者提示无效，这里选择清除提示
        showToast('取消', 1000);
      }
    }, 800); // 800ms 等待时间，允许用户输入多位数字
    return;
  }

  // 如果按下了非数字键，且有缓冲，清除缓冲
  if (inputBuffer) {
    clearTimeout(inputTimer);
    inputBuffer = '';
    // 不 return，允许继续执行 Z/X/C 逻辑
  }

  let newRate;
  if (key === 'z') {
    newRate = video.playbackRate - 0.1;
    setPlaybackRate(video, newRate);
  } else if (key === 'x') {
    setPlaybackRate(video, 1.0);
  } else if (key === 'c') {
    newRate = video.playbackRate + 0.1;
    setPlaybackRate(video, newRate);
  }
}, true); // true = useCapture
