/**
 * Content Script - 视频倍速控制器核心逻辑
 * 注入到每个页面中，负责快捷键监听、视频控制和浮层显示
 */

/**
 * 获取当前页面中最相关的视频元素
 * 优先选择正在播放的视频，其次返回第一个视频
 * @returns {HTMLVideoElement|null} 视频元素或 null
 */
function getActiveVideo() {
  const videos = Array.from(document.querySelectorAll('video'));
  if (videos.length === 0) return null;

  // 优先选择正在播放的视频
  const playing = videos.find(v => !v.paused);
  if (playing) return playing;

  // 否则返回第一个视频
  return videos[0];
}

/**
 * 倍速提示浮层相关变量
 * toastTimeout: 控制浮层自动消失的定时器
 * toastElement: 浮层 DOM 元素引用（单例）
 */
let toastTimeout;
let toastElement = null;

/**
 * 创建或获取倍速提示浮层元素（单例模式）
 * 使用极高的 z-index 确保浮层在最上层显示
 * @returns {HTMLDivElement} 浮层元素
 */
function getToastElement() {
  // 如果元素已存在，直接返回
  if (toastElement) return toastElement;

  // 创建新元素
  toastElement = document.createElement('div');
  toastElement.id = 'vsc-speed-toast-overlay';
  
  toastElement.style.cssText = `
    position: absolute;
    top: 20px;
    left: 20px;
    z-index: 2147483647;
    background: linear-gradient(135deg, #18a058, #36ad6a);
    color: #fff;
    padding: 10px 20px;
    border-radius: 12px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    font-size: 22px;
    font-weight: 600;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.25s ease;
    box-shadow: 0 4px 16px rgba(24, 160, 88, 0.35);
    display: block !important;
    visibility: visible !important;
  `;

  return toastElement;
}

/**
 * 显示倍速提示浮层
 * 支持自定义显示时长，0 表示不自动消失
 * @param {string} text - 要显示的文本内容
 * @param {number} duration - 显示时长（毫秒），默认 1500ms
 */
function showToast(text, duration = 1500) {
  const toast = getToastElement();
  
  // 关键修复：动态判断插入位置
  // 如果处于全屏模式，必须将提示框插入到全屏元素内部，否则会被遮挡
  const container = document.fullscreenElement || document.body || document.documentElement;
  
  // 如果父节点变了，重新挂载到新容器
  if (toast.parentNode !== container) {
    container.appendChild(toast);
  }

  // 更新内容
  toast.textContent = text;
  
  // 使用 requestAnimationFrame 确保样式生效
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

/**
 * 安全设置视频播放速度
 * 将输入值限制在 0.1 ~ 16.0 范围内，并保留一位小数
 * @param {HTMLVideoElement} video - 视频元素
 * @param {number} rate - 目标倍速值
 */
function setPlaybackRate(video, rate) {
  // 限制范围并保留一位小数
  const clamped = Math.min(16.0, Math.max(0.1, parseFloat(rate.toFixed(1))));
  video.playbackRate = clamped;
  console.log(`[Video Speed] Set to ${clamped}x`);
  showToast(`${clamped}x`);
}

/**
 * 数字键输入缓冲相关变量
 * inputBuffer: 存储用户输入的数字序列（支持多位输入）
 * inputTimer: 输入完成等待定时器（800ms 无输入则确认）
 */
let inputBuffer = '';
let inputTimer = null;

/**
 * 全局键盘监听（使用捕获阶段，优先触发）
 * 处理 Z/X/C 快捷键和数字键输入
 */
document.addEventListener('keydown', (e) => {
  // 智能防误触：忽略可编辑区域（输入框、文本域、富文本编辑器）
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
  
  // 处理数字键 (0-9) - 支持多位输入设置倍速
  if (/^\d$/.test(key)) {
    // 阻止默认行为（防止网页自身的快捷键，如 YouTube 的 0-9 跳转）
    e.preventDefault();
    e.stopPropagation();

    inputBuffer += key;
    showToast(`输入: ${inputBuffer}`, 0); // 0 表示不自动消失，直到输入完成

    // 重置输入等待定时器
    if (inputTimer) clearTimeout(inputTimer);
    inputTimer = setTimeout(() => {
      const rate = parseInt(inputBuffer, 10);
      inputBuffer = '';
      
      // 只有有效的倍速才应用 (0 被视为无效)
      if (rate > 0) {
        setPlaybackRate(video, rate);
      } else {
        // 输入了 0，提示取消
        showToast('取消', 1000);
      }
    }, 800); // 800ms 等待时间，允许用户输入多位数字
    return;
  }

  // 如果按下了非数字键，且有缓冲，清除缓冲状态
  if (inputBuffer) {
    clearTimeout(inputTimer);
    inputBuffer = '';
    // 不 return，允许继续执行 Z/X/C 逻辑
  }

  // 处理 Z/X/C 快捷键
  let newRate;
  if (key === 'z') {
    // Z 键：减速 0.1x
    newRate = video.playbackRate - 0.1;
    setPlaybackRate(video, newRate);
  } else if (key === 'x') {
    // X 键：重置为 1.0x
    setPlaybackRate(video, 1.0);
  } else if (key === 'c') {
    // C 键：加速 0.1x
    newRate = video.playbackRate + 0.1;
    setPlaybackRate(video, newRate);
  }
}, true); // true = useCapture：使用捕获阶段优先触发
