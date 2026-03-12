/**
 * 说说/动态插件 - 瀑布流布局
 * 从 Telegram API 获取数据并使用 marked 渲染 Markdown
 */

(function () {
  "use strict";

  // 配置
  const CONFIG = {
    apiUrl: "https://tg-api.050815.xyz/",
    containerSelector: "#talk",
    loadingSelector: "#talk-loading",
    spinnerSelector: "#talk-spinner",
    avatarUrl:
      "https://cdn.jsdmirror.com/gh/zsxcoder/github-img@main/img/yxk-avatar.avif",
    authorName: "异飨客",
    pageSize: 15,
  };

  // 状态
  let state = {
    data: null,
    messages: [],
    isLoading: false,
  };

  // 灯箱状态
  let lightboxState = {
    lockedScrollY: 0,
    isBodyLocked: false,
    bodyStyleBeforeLock: {
      position: "",
      top: "",
      left: "",
      right: "",
      width: "",
      overflow: "",
    },
  };

  /**
   * 初始化说说功能
   */
  function init(options = {}) {
    Object.assign(CONFIG, options);

    const container = document.querySelector(CONFIG.containerSelector);
    if (!container) {
      console.error("说说容器未找到:", CONFIG.containerSelector);
      return;
    }

    // 初始化灯箱事件
    initLightbox();

    fetchData();
  }

  /**
   * 初始化灯箱功能
   */
  function initLightbox() {
    // 点击事件委托
    document.addEventListener("click", (event) => {
      const rawTarget = event.target;
      if (!(rawTarget instanceof Element)) return;

      // 检查是否点击了灯箱关闭区域
      const overlay = document.getElementById("img-lightbox");
      if (overlay && !overlay.classList.contains("hidden")) {
        if (
          rawTarget === overlay ||
          rawTarget.closest("[data-lightbox-close]")
        ) {
          event.preventDefault();
          closeLightbox();
          return;
        }
      }

      // 检查是否点击了说说中的图片
      if (!(rawTarget instanceof HTMLImageElement)) return;
      if (!rawTarget.closest(".talk_content")) return;

      // 阻止默认行为（如果有链接包裹）
      const anchor = rawTarget.closest("a");
      if (anchor) event.preventDefault();

      const imgSrc = rawTarget.currentSrc || rawTarget.src;
      if (!imgSrc) return;
      openLightbox(imgSrc, rawTarget.alt || "");
    });

    // ESC 键关闭灯箱
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeLightbox();
      }
    });
  }

  /**
   * 获取灯箱元素
   */
  function getLightboxElements() {
    const overlay = document.getElementById("img-lightbox");
    const target = document.getElementById("img-lightbox-target");
    return { overlay, target };
  }

  /**
   * 关闭灯箱
   */
  function closeLightbox() {
    const { overlay, target } = getLightboxElements();
    if (!overlay || !target || overlay.classList.contains("hidden")) return;

    overlay.classList.add("hidden");
    overlay.classList.remove("flex");
    overlay.setAttribute("aria-hidden", "true");
    target.setAttribute("src", "");
    target.setAttribute("alt", "");

    // 恢复 body 滚动
    if (lightboxState.isBodyLocked) {
      document.body.style.position = lightboxState.bodyStyleBeforeLock.position;
      document.body.style.top = lightboxState.bodyStyleBeforeLock.top;
      document.body.style.left = lightboxState.bodyStyleBeforeLock.left;
      document.body.style.right = lightboxState.bodyStyleBeforeLock.right;
      document.body.style.width = lightboxState.bodyStyleBeforeLock.width;
      document.body.style.overflow = lightboxState.bodyStyleBeforeLock.overflow;
      window.scrollTo(0, lightboxState.lockedScrollY);
      lightboxState.isBodyLocked = false;
    }
  }

  /**
   * 打开灯箱
   */
  function openLightbox(src, altText) {
    const { overlay, target } = getLightboxElements();
    if (!overlay || !target || !src) return;

    // 锁定 body 滚动
    if (!lightboxState.isBodyLocked) {
      lightboxState.lockedScrollY = window.scrollY;
      lightboxState.bodyStyleBeforeLock.position = document.body.style.position;
      lightboxState.bodyStyleBeforeLock.top = document.body.style.top;
      lightboxState.bodyStyleBeforeLock.left = document.body.style.left;
      lightboxState.bodyStyleBeforeLock.right = document.body.style.right;
      lightboxState.bodyStyleBeforeLock.width = document.body.style.width;
      lightboxState.bodyStyleBeforeLock.overflow = document.body.style.overflow;
      document.body.style.position = "fixed";
      document.body.style.top = `-${lightboxState.lockedScrollY}px`;
      document.body.style.left = "0";
      document.body.style.right = "0";
      document.body.style.width = "100%";
      document.body.style.overflow = "hidden";
      lightboxState.isBodyLocked = true;
    }

    target.setAttribute("src", src);
    target.setAttribute("alt", altText || "");
    overlay.classList.remove("hidden");
    overlay.classList.add("flex");
    overlay.setAttribute("aria-hidden", "false");
  }

  /**
   * 获取数据
   */
  async function fetchData() {
    if (state.isLoading) return;

    state.isLoading = true;
    setTalkLoading(true);

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

      renderTalksList(state.messages.slice(0, CONFIG.pageSize));
    } catch (error) {
      console.error("获取说说数据失败:", error);
      showError();
    } finally {
      state.isLoading = false;
      setTalkLoading(false);
    }
  }

  /**
   * 设置加载状态
   */
  function setTalkLoading(isLoading) {
    const loadingEl = document.querySelector(CONFIG.loadingSelector);
    const spinnerEl = document.querySelector(CONFIG.spinnerSelector);
    const container = document.querySelector(CONFIG.containerSelector);

    if (isLoading) {
      // 开始加载：隐藏骨架屏，显示加载动画
      if (loadingEl) {
        loadingEl.style.display = "none";
      }
      if (spinnerEl) {
        spinnerEl.removeAttribute("hidden");
      }
      if (container) {
        container.classList.add("talk-pending");
      }
    } else {
      // 加载完成：隐藏加载动画
      if (spinnerEl) {
        spinnerEl.setAttribute("hidden", "");
      }
      // 注意：talk-pending 类的移除由 renderTalksList 控制
    }
  }

  /**
   * 显示错误状态
   */
  function showError() {
    const container = document.querySelector(CONFIG.containerSelector);
    if (!container) return;

    container.innerHTML = `
      <div class="shuoshuo-error" style="text-align: center; padding: 3rem 2rem; color: #ef4444;">
        <div style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;">😵</div>
        <p>加载失败，请稍后重试</p>
        <button onclick="window.shuoshuo.retry()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #ef4444; color: white; border: none; border-radius: 0.5rem; cursor: pointer;">重试</button>
      </div>
    `;
  }

  /**
   * 渲染说说列表
   */
  function renderTalksList(list) {
    const container = document.querySelector(CONFIG.containerSelector);
    if (!container) return;

    // 清理之前的内容，但保持 talk-pending 类
    container.innerHTML = "";

    if (list.length === 0) {
      container.innerHTML = `
        <div class="shuoshuo-empty" style="text-align: center; padding: 4rem 2rem; color: #6b7280;">
          <div style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;">📝</div>
          <p>暂无动态</p>
        </div>
      `;
      // 移除 pending 类显示内容
      container.classList.remove("talk-pending");
      return;
    }

    // 渲染每条说说
    list.forEach((item) => {
      const formattedItem = formatTalk(item);
      container.appendChild(generateTalkElement(formattedItem));
    });

    // 添加限制提示
    if (state.messages.length > CONFIG.pageSize) {
      const limitNotice = document.createElement("div");
      limitNotice.className = "limit-notice";
      limitNotice.innerHTML = "<span>仅展示最近15条说说</span>";
      container.appendChild(limitNotice);
    }

    // 初始化瀑布流布局，布局完成后再显示
    setupWaterfallLayoutOnce(container, {
      onReady: () => {
        // 瀑布流布局完成后，移除 pending 类显示内容
        container.classList.remove("talk-pending");
      },
    });
  }

  /**
   * 处理 Telegram HTML 内容，转换为可渲染的格式
   */
  function processTelegramHtml(text) {
    if (!text) return "";

    // Telegram 返回的文本已经是 HTML 格式
    // 我们需要处理一些特殊标签和格式

    let processed = text;

    // 处理 <br/> 标签 - 保留为换行
    processed = processed.replace(/<br\s*\/?>/gi, "\n");

    // 处理 <br> 标签
    processed = processed.replace(/<br>/gi, "\n");

    // 处理 HTML 实体
    processed = processed.replace(/&lt;/g, "<");
    processed = processed.replace(/&gt;/g, ">");
    processed = processed.replace(/&amp;/g, "&");
    processed = processed.replace(/&quot;/g, '"');
    processed = processed.replace(/&#39;/g, "'");

    // 处理 <b> 粗体标签
    processed = processed.replace(/<b>(.*?)<\/b>/gi, "<strong>$1</strong>");

    // 处理 <i> 斜体标签
    processed = processed.replace(/<i>(.*?)<\/i>/gi, "<em>$1</em>");

    // 处理 <code> 行内代码
    processed = processed.replace(/<code>(.*?)<\/code>/gi, "<code>$1</code>");

    // 处理 <pre> 代码块 - 保留内容但标记为代码块
    processed = processed.replace(
      /<pre>([\s\S]*?)<\/pre>/gi,
      function (match, content) {
        return "<pre><code>" + content.trim() + "</code></pre>";
      },
    );

    // 处理引用块
    processed = processed.replace(
      /^&gt; (.*?)$/gm,
      "<blockquote>$1</blockquote>",
    );
    processed = processed.replace(/^> (.*?)$/gm, "<blockquote>$1</blockquote>");

    // 处理标题 - Markdown 格式
    // # 标题1
    processed = processed.replace(/^# (.*?)$/gm, "<h1>$1</h1>");
    // ## 标题2
    processed = processed.replace(/^## (.*?)$/gm, "<h2>$1</h2>");
    // ### 标题3
    processed = processed.replace(/^### (.*?)$/gm, "<h3>$1</h3>");
    // #### 标题4
    processed = processed.replace(/^#### (.*?)$/gm, "<h4>$1</h4>");

    // 处理 Markdown 粗体 **text**
    processed = processed.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

    // 处理 Markdown 斜体 *text* (但不在列表项中)
    processed = processed.replace(/\*(.*?)\*/g, "<em>$1</em>");

    // 处理 Markdown 行内代码 `code`
    processed = processed.replace(/`([^`]+)`/g, "<code>$1</code>");

    // 处理 Markdown 代码块 ```code```
    processed = processed.replace(
      /```([\s\S]*?)```/g,
      function (match, content) {
        return "<pre><code>" + content.trim() + "</code></pre>";
      },
    );

    // 处理分割线 ---
    processed = processed.replace(/^-{3,}$/gm, "<hr>");

    // 处理列表 - 需要按行处理
    processed = processLists(processed);

    // 处理换行 - 将剩余的换行符转换为 <br>
    // 但要避免在块级元素内添加多余的 <br>
    const lines = processed.split("\n");
    processed = lines
      .map((line) => {
        line = line.trim();
        if (!line) return "";
        // 如果已经是块级元素，不添加 <br>
        if (line.match(/^<(h[1-6]|ul|ol|li|blockquote|pre|p|div|hr)/)) {
          return line;
        }
        return line;
      })
      .filter((line) => line)
      .join("\n");

    // 将剩余的换行符转换为 <br>
    processed = processed.replace(/\n/g, "<br>");

    return processed;
  }

  /**
   * 处理列表（无序和有序）
   */
  function processLists(text) {
    const lines = text.split("\n");
    const result = [];
    let currentList = null;
    let currentListType = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // 检查无序列表项 (- 或 *)
      const unorderedMatch = line.match(/^[-*]\s+(.+)$/);
      // 检查有序列表项 (数字.)
      const orderedMatch = line.match(/^\d+\.\s+(.+)$/);

      if (unorderedMatch) {
        // 无序列表项
        if (currentListType !== "ul") {
          // 开始新的无序列表
          if (currentList) {
            result.push(currentList + "</" + currentListType + ">");
          }
          currentList = "<ul>";
          currentListType = "ul";
        }
        currentList += "<li>" + unorderedMatch[1] + "</li>";
      } else if (orderedMatch) {
        // 有序列表项
        if (currentListType !== "ol") {
          // 开始新的有序列表
          if (currentList) {
            result.push(currentList + "</" + currentListType + ">");
          }
          currentList = "<ol>";
          currentListType = "ol";
        }
        currentList += "<li>" + orderedMatch[1] + "</li>";
      } else {
        // 非列表项
        if (currentList) {
          result.push(currentList + "</" + currentListType + ">");
          currentList = null;
          currentListType = null;
        }
        result.push(line);
      }
    }

    // 处理最后可能未关闭的列表
    if (currentList) {
      result.push(currentList + "</" + currentListType + ">");
    }

    return result.join("\n");
  }

  /**
   * 格式化说说数据
   */
  function formatTalk(item) {
    const date = formatTime(item.time);

    // 获取原始文本
    let rawText = item.text || "";

    // 处理 Telegram HTML 内容
    let content = processTelegramHtml(rawText);

    content = `<div class="talk_content_text">${content}</div>`;

    // 处理 Telegram 返回的图片（如果有）
    if (Array.isArray(item.image) && item.image.length > 0) {
      const validImages = item.image.filter(
        (img) => img && !img.includes("emoji"),
      );
      if (validImages.length > 0) {
        const imgDiv = document.createElement("div");
        imgDiv.className = "zone_imgbox";
        validImages.forEach((img) => {
          const imgTag = document.createElement("img");
          imgTag.src = img;
          imgTag.className = "zoomable";
          imgTag.loading = "lazy";
          imgTag.style.cursor = "zoom-in";
          imgDiv.appendChild(imgTag);
        });
        content += imgDiv.outerHTML;
      }
    }

    // 处理标签（从文本中提取 Labels）
    let tags = ["日常"];
    const labelMatch = item.text?.match(/Labels:\s*(.+?)(?:<br|\n|$)/i);
    if (labelMatch) {
      tags = labelMatch[1]
        .split(/[,，]/)
        .map((t) => t.trim())
        .filter((t) => t);
    }

    return {
      content,
      user: CONFIG.authorName,
      avatar: CONFIG.avatarUrl,
      date,
      location: "",
      tags: tags,
      text: rawText.replace(/<[^>]*>/g, ""),
      views: item.views,
    };
  }

  /**
   * 生成说说元素
   */
  function generateTalkElement(item) {
    const talkItem = document.createElement("div");
    talkItem.className = "talk_item";

    // 生成 Twitter 认证徽章 SVG
    const generateIconSVG = () => {
      return `<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" class="is-badge icon"><path d="m512 268c0 17.9-4.3 34.5-12.9 49.7s-20.1 27.1-34.6 35.4c.4 2.7.6 6.9.6 12.6 0 27.1-9.1 50.1-27.1 69.1-18.1 19.1-39.9 28.6-65.4 28.6-11.4 0-22.3-2.1-32.6-6.3-8 16.4-19.5 29.6-34.6 39.7-15 10.2-31.5 15.2-49.4 15.2-18.3 0-34.9-4.9-49.7-14.9-14.9-9.9-26.3-23.2-34.3-40-10.3 4.2-21.1 6.3-32.6 6.3-25.5 0-47.4-9.5-65.7-28.6-18.3-19-27.4-42.1-27.4-69.1 0-3 .4-7.2 1.1-12.6-14.5-8.4-26-20.2-34.6-35.4-8.5-15.2-12.8-31.8-12.8-49.7 0-19 4.8-36.5 14.3-52.3s22.3-27.5 38.3-35.1c-4.2-11.4-6.3-22.9-6.3-34.3 0-27 9.1-50.1 27.4-69.1s40.2-28.6 65.7-28.6c11.4 0 22.3 2.1 32.6 6.3 8-16.4 19.5-29.6 34.6-39.7 15-10.1 31.5-15.2 49.4-15.2s34.4 5.1 49.4 15.1c15 10.1 26.6 23.3 34.6 39.7 10.3-4.2 21.1-6.3 32.6-6.3 25.5 0 47.3 9.5 65.4 28.6s27.1 42.1 27.1 69.1c0 12.6-1.9 24-5.7 34.3 16 7.6 28.8 19.3 38.3 35.1 9.5 15.9 14.3 33.4 14.3 52.4zm-266.9 77.1 105.7-158.3c2.7-4.2 3.5-8.8 2.6-13.7-1-4.9-3.5-8.8-7.7-11.4-4.2-2.7-8.8-3.6-13.7-2.9-5 .8-9 3.2-12 7.4l-93.1 140-42.9-42.8c-3.8-3.8-8.2-5.6-13.1-5.4-5 .2-9.3 2-13.1 5.4-3.4 3.4-5.1 7.7-5.1 12.9 0 5.1 1.7 9.4 5.1 12.9l58.9 58.9 2.9 2.3c3.4 2.3 6.9 3.4 10.3 3.4 6.7-.1 11.8-2.9 15.2-8.7z" fill="#1da1f2"></path></svg>`;
    };

    // Meta 区域
    const talkMeta = document.createElement("div");
    talkMeta.className = "talk_meta";

    const avatar = document.createElement("img");
    avatar.className = "no-lightbox avatar";
    avatar.src = item.avatar;
    avatar.alt = item.user;

    const info = document.createElement("div");
    info.className = "info";

    const nick = document.createElement("span");
    nick.className = "talk_nick";
    nick.innerHTML = `${item.user} ${generateIconSVG()}`;

    const date = document.createElement("span");
    date.className = "talk_date";
    date.textContent = item.date;

    info.appendChild(nick);
    info.appendChild(date);
    talkMeta.appendChild(avatar);
    talkMeta.appendChild(info);

    // 内容区域
    const talkContent = document.createElement("div");
    talkContent.className = "talk_content";
    talkContent.innerHTML = item.content;

    // 底部区域
    const talkBottom = document.createElement("div");
    talkBottom.className = "talk_bottom";

    const tags = document.createElement("div");
    const tag = document.createElement("span");
    tag.className = "talk_tag";
    tag.textContent = `🏷️${item.tags.join(", ")}`;
    tags.appendChild(tag);

    const commentLink = document.createElement("a");
    commentLink.href = "javascript:;";
    commentLink.onclick = () => goComment(item.text);
    commentLink.className = "quote-btn";
    commentLink.title = "引用此说说";
    commentLink.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 48 48"><defs><mask id="IconifyId19ce1e4695f2e18811"><g fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round" stroke-width="4"><path fill="#555" d="M44 6H4v30h9v5l10-5h21z"/><path d="M14 19.5v3m10-3v3m10-3v3"/></g></mask></defs><path fill="#0284c7" d="M0 0h48v48H0z" mask="url(#IconifyId19ce1e4695f2e18811)"/></svg>';

    talkBottom.appendChild(tags);
    talkBottom.appendChild(commentLink);

    talkItem.appendChild(talkMeta);
    talkItem.appendChild(talkContent);
    talkItem.appendChild(talkBottom);

    return talkItem;
  }

  /**
   * 引用说说 - 跳转到 Giscus 评论区并填充引用内容
   */
  function goComment(text) {
    // 1. 滚动到评论区
    const giscusSection = document.getElementById("giscus-section");
    if (giscusSection) {
      giscusSection.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    // 2. 存储引用内容到 sessionStorage，供 Giscus 加载后使用
    const quoteContent = `> ${text}\n\n`;
    sessionStorage.setItem("giscus_quote_content", quoteContent);
    sessionStorage.setItem("giscus_quote_timestamp", Date.now().toString());

    // 3. 尝试直接填充到 Giscus  iframe
    fillGiscusTextarea(quoteContent);

    // 4. 显示提示
    if (typeof document !== "undefined") {
      document.dispatchEvent(
        new CustomEvent("toast", {
          detail: {
            message: "已为您引用该说说，请在下方的评论框中查看 ✨",
          },
        }),
      );
    }
  }

  /**
   * 填充 Giscus 评论框
   */
  function fillGiscusTextarea(content) {
    // Giscus 使用 iframe，我们需要通过 postMessage 与其通信
    // 或者等待 Giscus 加载完成后尝试直接操作
    const giscusFrame = document.querySelector("iframe.giscus-frame");
    if (giscusFrame && giscusFrame.contentWindow) {
      // 尝试通过 postMessage 发送消息给 Giscus
      giscusFrame.contentWindow.postMessage(
        {
          giscus: {
            setComment: content,
          },
        },
        "https://giscus.app",
      );
    }

    // 备用方案：尝试直接访问 iframe 内部的 textarea（受同源策略限制可能不成功）
    try {
      const iframeDoc =
        giscusFrame?.contentDocument || giscusFrame?.contentWindow?.document;
      if (iframeDoc) {
        const textarea =
          iframeDoc.querySelector("textarea[name='comment']") ||
          iframeDoc.querySelector(".giscus-input textarea") ||
          iframeDoc.querySelector("textarea[placeholder*='Write']");
        if (textarea) {
          textarea.value = content;
          textarea.focus();
        }
      }
    } catch (e) {
      // 跨域限制，无法直接访问 iframe 内容
      console.log("[Giscus] 无法直接访问 iframe，使用备用方案");
    }
  }

  /**
   * 监听 Giscus 加载完成事件
   */
  function initGiscusQuote() {
    // 监听来自 Giscus 的消息
    window.addEventListener("message", function (event) {
      if (event.origin !== "https://giscus.app") return;

      const data = event.data;
      if (data && data.giscus) {
        // Giscus 加载完成或内容变化时，尝试填充引用
        const quoteContent = sessionStorage.getItem("giscus_quote_content");
        const quoteTimestamp = sessionStorage.getItem("giscus_quote_timestamp");

        if (quoteContent && quoteTimestamp) {
          const now = Date.now();
          const timestamp = parseInt(quoteTimestamp);
          // 只在 5 分钟内的引用有效
          if (now - timestamp < 5 * 60 * 1000) {
            fillGiscusTextarea(quoteContent);
            // 填充后清除，避免重复填充
            sessionStorage.removeItem("giscus_quote_content");
            sessionStorage.removeItem("giscus_quote_timestamp");
          }
        }
      }
    });
  }

  // 初始化 Giscus 引用功能
  if (typeof document !== "undefined") {
    initGiscusQuote();
  }

  /**
   * 格式化时间
   */
  function formatTime(timestamp) {
    if (!timestamp) return "";

    const d = new Date(timestamp);
    const pad = (n) => n.toString().padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  /**
   * 瀑布流布局算法
   */
  function waterfallLayout(container) {
    function getMargin(a, b) {
      const c = window.getComputedStyle(b);
      return parseFloat(c["margin" + a]) || 0;
    }

    function toPx(a) {
      return a + "px";
    }

    function getTop(a) {
      return parseFloat(a.style.top);
    }

    function getLeft(a) {
      return parseFloat(a.style.left);
    }

    function getWidth(a) {
      return a.clientWidth;
    }

    function getHeight(a) {
      return a.clientHeight;
    }

    function getBottom(a) {
      return getTop(a) + getHeight(a) + getMargin("Bottom", a);
    }

    function getRight(a) {
      return getLeft(a) + getWidth(a) + getMargin("Right", a);
    }

    function sortItems(a) {
      a = a.sort(function (a, b) {
        return getBottom(a) === getBottom(b)
          ? getLeft(b) - getLeft(a)
          : getBottom(b) - getBottom(a);
      });
    }

    if (typeof container === "string") {
      container = document.querySelector(container);
    }
    if (!container) return;

    // 获取所有子元素，但排除 limit-notice
    const allItems = [].slice.call(container.children).filter(function (a) {
      return !a.classList.contains("limit-notice");
    });

    if (!allItems.length) {
      container.style.height = "0px";
      return;
    }

    // 重置所有项目的位置
    const items = allItems.map(function (a) {
      a.style.position = "absolute";
      a.style.top = "0px";
      a.style.left = "0px";
      return a;
    });

    container.style.position = "relative";

    const columnItems = [];
    if (items.length) {
      items[0].style.top = "0px";
      items[0].style.left = toPx(getMargin("Left", items[0]));
      columnItems.push(items[0]);
    }

    let i = 1;
    for (; i < items.length; i++) {
      const prev = items[i - 1];
      const curr = items[i];
      const canFit = getRight(prev) + getWidth(curr) <= getWidth(container);
      if (!canFit) break;
      curr.style.top = prev.style.top;
      curr.style.left = toPx(getRight(prev) + getMargin("Left", curr));
      columnItems.push(curr);
    }

    for (; i < items.length; i++) {
      sortItems(columnItems);
      const curr = items[i];
      const shortest = columnItems.pop();
      curr.style.top = toPx(getBottom(shortest) + getMargin("Top", curr));
      curr.style.left = toPx(getLeft(shortest));
      columnItems.push(curr);
    }

    sortItems(columnItems);
    const tallest = columnItems[0];
    container.style.height = toPx(
      getBottom(tallest) + getMargin("Bottom", tallest),
    );
  }

  /**
   * 防抖函数
   */
  function debounce(fn, waitMs = 60) {
    let timer = null;
    return (...args) => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => fn(...args), waitMs);
    };
  }

  /**
   * 等待资源加载
   */
  async function waitForLoadableResources(
    container,
    { timeoutMs = 3500, signal },
  ) {
    const getPendingTargets = () => {
      const pendingImages = [...container.querySelectorAll("img")].filter(
        (img) => !img.complete,
      );
      const pendingIframes = [...container.querySelectorAll("iframe")].filter(
        (iframe) => iframe.contentDocument == null,
      );
      return { pendingImages, pendingIframes };
    };

    const waitForEvent = (target, type) =>
      new Promise((resolve) => {
        target.addEventListener(type, resolve, { once: true, signal });
      });

    const awaitImagesAndIframes = async () => {
      const { pendingImages, pendingIframes } = getPendingTargets();
      const promises = [
        ...pendingImages.flatMap((img) => [
          waitForEvent(img, "load"),
          waitForEvent(img, "error"),
        ]),
        ...pendingIframes.flatMap((iframe) => [
          waitForEvent(iframe, "load"),
          waitForEvent(iframe, "error"),
        ]),
      ];
      if (!promises.length) return;
      await Promise.race([
        Promise.all(promises),
        new Promise((resolve) => window.setTimeout(resolve, timeoutMs)),
      ]);
    };

    const awaitFonts = async () => {
      const ready = document.fonts?.ready;
      if (!ready) return;
      await Promise.race([
        ready,
        new Promise((resolve) => window.setTimeout(resolve, timeoutMs)),
      ]);
    };

    await Promise.allSettled([awaitImagesAndIframes(), awaitFonts()]);
    return getPendingTargets();
  }

  /**
   * 设置瀑布流布局
   */
  function setupWaterfallLayoutOnce(container, { onReady } = {}) {
    const abortController = new AbortController();
    const { signal } = abortController;

    // 记录上一次窗口宽度，用于检测是否发生了列数变化
    let lastWindowWidth = window.innerWidth;

    const relayout = debounce(() => {
      // 强制重置所有项目的位置，避免从移动端切换回桌面端时布局错乱
      const currentWidth = window.innerWidth;
      const widthChanged = Math.abs(currentWidth - lastWindowWidth) > 50;

      if (widthChanged) {
        lastWindowWidth = currentWidth;
        // 临时移除所有项目的定位，强制重新计算
        const items = container.querySelectorAll(
          ".talk_item, .talk-item, [class*='talk_']",
        );
        items.forEach((item) => {
          item.style.position = "";
          item.style.top = "";
          item.style.left = "";
        });
        container.style.height = "";
        container.style.position = "";
      }

      waterfallLayout(container);
    }, 80);

    window.addEventListener("resize", relayout, { signal });

    let didReady = false;
    const markReady = () => {
      if (didReady) return;
      didReady = true;
      if (typeof onReady === "function") onReady();
    };

    const scheduleLateRelayoutOnce = (targets) => {
      let didLateRelayout = false;
      const lateRelayout = () => {
        if (didLateRelayout) return;
        didLateRelayout = true;
        relayout();
      };

      targets.pendingImages.forEach((img) => {
        img.addEventListener("load", lateRelayout, { once: true, signal });
        img.addEventListener("error", lateRelayout, { once: true, signal });
      });
      targets.pendingIframes.forEach((iframe) => {
        iframe.addEventListener("load", lateRelayout, { once: true, signal });
        iframe.addEventListener("error", lateRelayout, { once: true, signal });
      });
    };

    Promise.resolve()
      .then(() =>
        waitForLoadableResources(container, { timeoutMs: 2500, signal }),
      )
      .then((pendingTargets) => {
        relayout();
        requestAnimationFrame(() => {
          relayout();
          markReady();
        });
        if (
          pendingTargets.pendingImages.length ||
          pendingTargets.pendingIframes.length
        ) {
          scheduleLateRelayoutOnce(pendingTargets);
        }
      })
      .catch(() => {
        relayout();
        markReady();
      });

    return () => {
      abortController.abort();
    };
  }

  /**
   * 重试加载
   */
  function retry() {
    state.messages = [];
    fetchData();
  }

  // 暴露到全局
  window.shuoshuo = {
    init,
    retry,
    openLightbox,
    closeLightbox,
  };

  // 自动初始化
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => init());
  } else {
    init();
  }
})();
