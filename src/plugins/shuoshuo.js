/**
 * 说说/动态插件
 * 从 Telegram API 获取数据并渲染
 */

(function () {
  "use strict";

  // 配置
  const CONFIG = {
    apiUrl: "https://tg-api.050815.xyz/",
    containerSelector: "#shuoshuo-container",
    loadingSelector: "#shuoshuo-loading",
    loadMoreSelector: "#shuoshuo-load-more",
    avatarUrl: "", // 将在初始化时设置
    authorName: "", // 将在初始化时设置
    pageSize: 10,
  };

  // 状态
  let state = {
    data: null,
    messages: [],
    currentIndex: 0,
    isLoading: false,
    hasMore: true,
  };

  /**
   * 初始化说说功能
   * @param {Object} options - 配置选项
   */
  function init(options = {}) {
    Object.assign(CONFIG, options);

    const container = document.querySelector(CONFIG.containerSelector);
    if (!container) {
      console.error("说说容器未找到:", CONFIG.containerSelector);
      return;
    }

    fetchData();
  }

  /**
   * 获取数据
   */
  async function fetchData() {
    if (state.isLoading) return;

    state.isLoading = true;
    showLoading();

    try {
      const response = await fetch(CONFIG.apiUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      state.data = data;

      // 处理消息数据
      if (data.ChannelMessageData) {
        state.messages = Object.entries(data.ChannelMessageData)
          .map(([id, msg]) => ({
            id,
            ...msg,
          }))
          .sort((a, b) => b.time - a.time); // 按时间倒序
      }

      state.hasMore = state.messages.length > CONFIG.pageSize;
      renderMessages();
    } catch (error) {
      console.error("获取说说数据失败:", error);
      showError();
    } finally {
      state.isLoading = false;
      hideLoading();
    }
  }

  /**
   * 显示加载状态
   */
  function showLoading() {
    const loading = document.querySelector(CONFIG.loadingSelector);
    if (loading) {
      loading.style.display = "block";
    }
  }

  /**
   * 隐藏加载状态
   */
  function hideLoading() {
    const loading = document.querySelector(CONFIG.loadingSelector);
    if (loading) {
      loading.style.display = "none";
    }
  }

  /**
   * 显示错误状态
   */
  function showError() {
    const container = document.querySelector(CONFIG.containerSelector);
    if (!container) return;

    container.innerHTML = `
      <div class="shuoshuo-error">
        <div class="shuoshuo-empty-icon">😵</div>
        <p>加载失败，请稍后重试</p>
        <button class="shuoshuo-retry-btn" onclick="window.shuoshuo.retry()">重试</button>
      </div>
    `;
  }

  /**
   * 渲染消息列表
   */
  function renderMessages() {
    const container = document.querySelector(CONFIG.containerSelector);
    if (!container) return;

    // 清空容器
    container.innerHTML = "";

    if (state.messages.length === 0) {
      container.innerHTML = `
        <div class="shuoshuo-empty">
          <div class="shuoshuo-empty-icon">📝</div>
          <p>暂无动态</p>
        </div>
      `;
      return;
    }

    // 渲染消息
    const endIndex = Math.min(
      state.currentIndex + CONFIG.pageSize,
      state.messages.length,
    );
    const messagesToRender = state.messages.slice(state.currentIndex, endIndex);

    messagesToRender.forEach((message, index) => {
      const item = createMessageElement(message, index);
      container.appendChild(item);
    });

    // 更新加载更多按钮状态
    updateLoadMoreButton();
  }

  /**
   * 创建消息元素
   * @param {Object} message - 消息数据
   * @param {number} index - 索引
   * @returns {HTMLElement}
   */
  function createMessageElement(message, index) {
    const div = document.createElement("div");
    div.className = "shuoshuo-item";
    div.style.animationDelay = `${index * 0.05}s`;

    const timeStr = formatTime(message.time);
    const viewsStr = message.views ? `${message.views} 次浏览` : "";

    // 处理文本内容
    let textContent = message.text || "";
    // 转换 HTML 标签
    textContent = processTextContent(textContent);

    // 处理图片
    let imagesHtml = "";
    if (message.image && message.image.length > 0) {
      const validImages = message.image.filter(
        (img) => img && !img.includes("emoji"),
      );
      if (validImages.length > 0) {
        imagesHtml = `
          <div class="shuoshuo-images" data-count="${validImages.length}">
            ${validImages
              .map(
                (img) => `
              <div class="shuoshuo-image-wrapper" onclick="window.shuoshuo.openLightbox('${img}')">
                <img src="${img}" alt="" class="shuoshuo-image" loading="lazy">
              </div>
            `,
              )
              .join("")}
          </div>
        `;
      }
    }

    div.innerHTML = `
      <img src="${CONFIG.avatarUrl}" alt="${CONFIG.authorName}" class="shuoshuo-avatar">
      <div class="shuoshuo-content">
        <div class="shuoshuo-header">
          <span class="shuoshuo-author">${CONFIG.authorName}</span>
          <span class="shuoshuo-time">${timeStr}</span>
          ${viewsStr ? `<span class="shuoshuo-views">👁 ${viewsStr}</span>` : ""}
        </div>
        <div class="shuoshuo-text">${textContent}</div>
        ${imagesHtml}
      </div>
    `;

    return div;
  }

  /**
   * 处理文本内容
   * @param {string} text - 原始文本
   * @returns {string}
   */
  function processTextContent(text) {
    if (!text) return "";

    // 处理 HTML 标签
    let processed = text
      // 处理换行
      .replace(/\n/g, "<br>")
      // 处理粗体
      .replace(/<b>(.*?)<\/b>/g, "<strong>$1</strong>")
      // 处理斜体
      .replace(/<i>(.*?)<\/i>/g, "<em>$1</em>")
      // 处理代码
      .replace(/<code>(.*?)<\/code>/g, "<code>$1</code>")
      // 处理预格式化文本
      .replace(/<pre>(.*?)<\/pre>/gs, "<pre>$1</pre>")
      // 处理引用
      .replace(/&gt; (.*?)(<br>|$)/g, "<blockquote>$1</blockquote>")
      // 处理链接
      .replace(
        /<a href="(.*?)"(.*?)>(.*?)<\/a>/g,
        '<a href="$1" target="_blank" rel="noopener"$2>$3</a>',
      );

    return processed;
  }

  /**
   * 格式化时间
   * @param {number} timestamp - 时间戳
   * @returns {string}
   */
  function formatTime(timestamp) {
    if (!timestamp) return "";

    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    // 小于1分钟
    if (diff < 60000) {
      return "刚刚";
    }

    // 小于1小时
    if (diff < 3600000) {
      return `${Math.floor(diff / 60000)} 分钟前`;
    }

    // 小于24小时
    if (diff < 86400000) {
      return `${Math.floor(diff / 3600000)} 小时前`;
    }

    // 小于7天
    if (diff < 604800000) {
      return `${Math.floor(diff / 86400000)} 天前`;
    }

    // 大于7天，显示具体日期
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    // 如果是今年，不显示年份
    if (year === now.getFullYear()) {
      return `${month}-${day} ${hours}:${minutes}`;
    }

    return `${year}-${month}-${day} ${hours}:${minutes}`;
  }

  /**
   * 更新加载更多按钮
   */
  function updateLoadMoreButton() {
    const loadMoreBtn = document.querySelector(CONFIG.loadMoreSelector);
    if (!loadMoreBtn) return;

    const endIndex = state.currentIndex + CONFIG.pageSize;

    if (endIndex >= state.messages.length) {
      loadMoreBtn.style.display = "none";
    } else {
      loadMoreBtn.style.display = "inline-flex";
      loadMoreBtn.disabled = false;
      loadMoreBtn.innerHTML = `
        <span>加载更多</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6 9l6 6 6-6"/>
        </svg>
      `;
    }
  }

  /**
   * 加载更多消息
   */
  function loadMore() {
    if (state.isLoading || !state.hasMore) return;

    state.currentIndex += CONFIG.pageSize;
    renderMessages();

    // 滚动到新加载的内容
    const container = document.querySelector(CONFIG.containerSelector);
    const newItems = container.querySelectorAll(".shuoshuo-item");
    if (newItems.length > state.currentIndex) {
      newItems[state.currentIndex].scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }

  /**
   * 打开图片查看器
   * @param {string} src - 图片地址
   */
  function openLightbox(src) {
    let lightbox = document.getElementById("shuoshuo-lightbox");

    if (!lightbox) {
      lightbox = document.createElement("div");
      lightbox.id = "shuoshuo-lightbox";
      lightbox.className = "shuoshuo-lightbox";
      lightbox.innerHTML = `
        <button class="shuoshuo-lightbox-close" onclick="window.shuoshuo.closeLightbox()">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
        <img src="" alt="">
      `;
      document.body.appendChild(lightbox);

      // 点击背景关闭
      lightbox.addEventListener("click", (e) => {
        if (e.target === lightbox) {
          closeLightbox();
        }
      });

      // ESC 键关闭
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          closeLightbox();
        }
      });
    }

    const img = lightbox.querySelector("img");
    img.src = src;
    lightbox.classList.add("active");
    document.body.style.overflow = "hidden";
  }

  /**
   * 关闭图片查看器
   */
  function closeLightbox() {
    const lightbox = document.getElementById("shuoshuo-lightbox");
    if (lightbox) {
      lightbox.classList.remove("active");
      document.body.style.overflow = "";
    }
  }

  /**
   * 重试加载
   */
  function retry() {
    state.currentIndex = 0;
    state.messages = [];
    state.hasMore = true;
    fetchData();
  }

  // 暴露到全局
  window.shuoshuo = {
    init,
    loadMore,
    openLightbox,
    closeLightbox,
    retry,
  };
})();
