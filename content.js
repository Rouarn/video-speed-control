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

function showToast(rate) {
  const toast = getToastElement();
  
  // 关键修复：动态判断插入位置
  // 如果处于全屏模式，必须将提示框插入到全屏元素内部，否则会被遮挡
  const container = document.fullscreenElement || document.body || document.documentElement;
  
  // 如果父节点变了，重新挂载
  if (toast.parentNode !== container) {
    container.appendChild(toast);
  }

  // 更新内容
  toast.textContent = `${rate}x`;
  
  // 强制重绘
  // void toast.offsetWidth; 
  
  // 显示
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
  });
  
  // 定时隐藏
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.style.opacity = '0';
    // 动画结束后可选：从 DOM 移除以保持清洁，这里选择仅隐藏
  }, 1500);
}

// 安全设置播放速度（限制范围 0.1 ~ 16.0）
function setPlaybackRate(video, rate) {
  const clamped = Math.min(16.0, Math.max(0.1, parseFloat(rate.toFixed(1))));
  video.playbackRate = clamped;
  console.log(`[Video Speed] Set to ${clamped}x`);
  showToast(clamped);
}

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
