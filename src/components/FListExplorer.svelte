<script lang="ts">
  import { onMount } from "svelte";

  // FList 配置 - 支持多个来源
  export let configs: FListConfig[] = [
    {
      id: "default",
      name: "GitHub Releases",
      source: "github-release",
      owner: "yxksw",
      repo: "FList"
    }
  ];
  
  // 默认选中的来源 ID
  export let defaultSourceId: string = configs[0]?.id || "default";

  interface FListConfig {
    id: string;
    name: string;
    source: "github-release" | "github-repo" | "huggingface" | "url-list" | "gitee-release";
    owner?: string;
    repo?: string;
    dataset?: string;
    urls?: { name: string; url: string; size?: number }[];
    proxy?: string;
  }

  interface FileItem {
    id: string;
    name: string;
    path: string;
    type: "file" | "directory";
    size?: number;
    downloadUrl: string;
    updatedAt?: string;
    description?: string;
  }

  let items: FileItem[] = [];
  let loading = false;
  let error = "";
  let currentConfig: FListConfig = configs.find(c => c.id === defaultSourceId) || configs[0];
  
  // 文件夹导航栈（用于 github-repo 类型）
  let pathStack: { name: string; path: string }[] = [{ name: "根目录", path: "" }];
  
  // 下拉菜单状态
  let showDropdown = false;

  async function fetchGitHubReleases(config: FListConfig) {
    const { owner, repo } = config;
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/releases`;
    
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`GitHub API 请求失败: ${response.status}`);
    }
    
    const releases = await response.json();
    const fileItems: FileItem[] = [];
    
    for (const release of releases) {
      for (const asset of release.assets) {
        fileItems.push({
          id: asset.id.toString(),
          name: asset.name,
          path: asset.name,
          type: "file",
          size: asset.size,
          downloadUrl: config.proxy 
            ? `${config.proxy}${encodeURIComponent(asset.browser_download_url)}`
            : asset.browser_download_url,
          updatedAt: asset.updated_at,
          description: release.name || release.tag_name,
        });
      }
    }
    
    return fileItems;
  }

  async function fetchGitHubRepo(config: FListConfig, path: string = "") {
    const { owner, repo } = config;
    const apiUrl = path 
      ? `https://api.github.com/repos/${owner}/${repo}/contents/${path}`
      : `https://api.github.com/repos/${owner}/${repo}/contents`;
    
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`GitHub API 请求失败: ${response.status}`);
    }
    
    const contents = await response.json();
    
    return contents.map((item: any) => ({
      id: item.sha,
      name: item.name,
      path: item.path,
      type: item.type === "dir" ? "directory" : "file",
      size: item.size,
      downloadUrl: item.download_url || `https://github.com/${owner}/${repo}/blob/main/${item.path}`,
      updatedAt: undefined,
    }));
  }

  async function fetchHuggingFace(config: FListConfig) {
    const { dataset } = config;
    const apiUrl = `https://huggingface.co/api/datasets/${dataset}/tree/main`;
    
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`Hugging Face API 请求失败: ${response.status}`);
    }
    
    const files = await response.json();
    
    return files.map((item: any) => ({
      id: item.oid || item.path,
      name: item.path.split('/').pop(),
      path: item.path,
      type: item.type === "directory" ? "directory" : "file",
      size: item.size,
      downloadUrl: `https://huggingface.co/datasets/${dataset}/resolve/main/${item.path}`,
      updatedAt: undefined,
    }));
  }

  async function fetchUrlList(config: FListConfig) {
    return (config.urls || []).map((item, index) => ({
      id: index.toString(),
      name: item.name,
      path: item.name,
      type: "file" as const,
      size: item.size,
      downloadUrl: config.proxy 
        ? `${config.proxy}${encodeURIComponent(item.url)}`
        : item.url,
      updatedAt: undefined,
    }));
  }

  async function fetchItems(config: FListConfig = currentConfig, path: string = "") {
    loading = true;
    error = "";
    
    try {
      switch (config.source) {
        case "github-release":
          items = await fetchGitHubReleases(config);
          break;
        case "github-repo":
          items = await fetchGitHubRepo(config, path);
          break;
        case "huggingface":
          items = await fetchHuggingFace(config);
          break;
        case "url-list":
          items = await fetchUrlList(config);
          break;
        default:
          throw new Error("未知的数据源类型");
      }
      
      items.sort((a, b) => {
        // 文件夹排在前面
        if (a.type !== b.type) {
          return a.type === "directory" ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
    } catch (err: any) {
      error = `加载失败: ${err.message}`;
      console.error(err);
    } finally {
      loading = false;
    }
  }

  // 进入文件夹
  async function navigateIntoFolder(item: FileItem) {
    if (item.type !== "directory") return;
    
    pathStack = [...pathStack, { name: item.name, path: item.path }];
    await fetchItems(currentConfig, item.path);
  }

  // 导航到指定层级
  async function navigateToLevel(index: number) {
    pathStack = pathStack.slice(0, index + 1);
    const targetPath = pathStack[index].path;
    await fetchItems(currentConfig, targetPath);
  }

  // 返回上一级
  async function goBack() {
    if (pathStack.length > 1) {
      pathStack = pathStack.slice(0, -1);
      const parentPath = pathStack[pathStack.length - 1].path;
      await fetchItems(currentConfig, parentPath);
    }
  }

  function switchSource(config: FListConfig) {
    currentConfig = config;
    showDropdown = false;
    // 重置路径栈
    pathStack = [{ name: "根目录", path: "" }];
    fetchItems(config, "");
  }

  function formatSize(bytes?: number) {
    if (bytes === undefined || bytes === 0) return "-";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (
      Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
    );
  }

  function formatDate(dateStr?: string) {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getFileIcon(filename: string) {
    const ext = filename.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
      case "svg":
      case "webp":
      case "avif":
        return "image";
      case "mp4":
      case "webm":
      case "mkv":
      case "mov":
      case "avi":
        return "video";
      case "mp3":
      case "wav":
      case "flac":
      case "ogg":
        return "audio";
      case "zip":
      case "rar":
      case "7z":
      case "tar":
      case "gz":
        return "archive";
      case "pdf":
        return "pdf";
      case "doc":
      case "docx":
        return "doc";
      case "xls":
      case "xlsx":
        return "excel";
      case "ppt":
      case "pptx":
        return "ppt";
      case "js":
      case "ts":
      case "html":
      case "css":
      case "py":
      case "go":
      case "json":
      case "md":
        return "code";
      case "exe":
      case "msi":
      case "iso":
      case "dmg":
      case "pkg":
      case "deb":
      case "rpm":
        return "app";
      case "txt":
        return "text";
      default:
        return "file";
    }
  }

  function getFileIconSvg(type: string) {
    switch (type) {
      case "image":
        return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>`;
      case "video":
        return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/></svg>`;
      case "audio":
        return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`;
      case "archive":
        return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/></svg>`;
      case "pdf":
        return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M10 13v-1a2 2 0 0 1 2-2h1"/><path d="M14 13h-2a2 2 0 0 0-2 2v1a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-1a2 2 0 0 0-2-2z"/></svg>`;
      case "doc":
        return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>`;
      case "excel":
        return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M8 13h2"/><path d="M8 17h2"/><path d="M14 13h2"/><path d="M14 17h2"/></svg>`;
      case "ppt":
        return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M10 12a2 2 0 1 0 4 0 2 2 0 1 0-4 0"/></svg>`;
      case "code":
        return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`;
      case "app":
        return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><line x1="12" x2="12" y1="8" y2="16"/><line x1="8" x2="16" y1="12" y2="12"/></svg>`;
      case "text":
        return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>`;
      default:
        return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>`;
    }
  }

  function canPreview(filename: string): boolean {
    const previewExts = ["jpg", "jpeg", "png", "gif", "webp", "mp4", "webm", "mp3", "wav", "pdf"];
    const ext = filename.split(".").pop()?.toLowerCase() || "";
    return previewExts.includes(ext);
  }

  let previewItem: FileItem | null = null;
  let previewType: string = "";

  function openPreview(item: FileItem) {
    if (!canPreview(item.name)) return;
    previewItem = item;
    const ext = item.name.split(".").pop()?.toLowerCase() || "";
    if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) {
      previewType = "image";
    } else if (["mp4", "webm"].includes(ext)) {
      previewType = "video";
    } else if (["mp3", "wav"].includes(ext)) {
      previewType = "audio";
    } else if (ext === "pdf") {
      previewType = "pdf";
    }
  }

  function closePreview() {
    previewItem = null;
    previewType = "";
  }

  // 点击外部关闭下拉菜单
  function handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.source-selector')) {
      showDropdown = false;
    }
  }

  onMount(() => {
    fetchItems(currentConfig, "");
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  });
</script>

<div class="flist-explorer-container">
  <!-- 来源选择器 -->
  <div class="flex items-center justify-between mb-4 p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
    <div class="flex items-center gap-3">
      <!-- 下拉选择器 -->
      <div class="source-selector relative">
        <button 
          on:click={() => showDropdown = !showDropdown}
          class="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-zinc-700 rounded-lg border border-zinc-200 dark:border-zinc-600 hover:border-blue-500 dark:hover:border-blue-500 transition-colors text-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-blue-500">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" x2="12" y1="3" y2="15"/>
          </svg>
          <span class="text-zinc-700 dark:text-zinc-300 font-medium">{currentConfig.name}</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-zinc-400 transition-transform" class:rotate-180={showDropdown}>
            <path d="m6 9 6 6 6-6"/>
          </svg>
        </button>
        
        <!-- 下拉菜单 -->
        {#if showDropdown}
          <div class="absolute top-full left-0 mt-1 w-56 bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700 py-1 z-10">
            {#each configs as config}
              <button
                on:click={() => switchSource(config)}
                class="w-full text-left px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors flex items-center gap-2 {config.id === currentConfig.id ? 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'text-zinc-700 dark:text-zinc-300'}"
              >
                {#if config.id === currentConfig.id}
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20 6 9 17l-5-5"/>
                  </svg>
                {:else}
                  <span class="w-3.5"></span>
                {/if}
                {config.name}
              </button>
            {/each}
          </div>
        {/if}
      </div>
      
      <!-- 来源类型标签 -->
      <span class="text-xs px-2 py-1 bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 rounded">
        {currentConfig.source === 'github-release' ? 'GitHub Releases' : 
         currentConfig.source === 'github-repo' ? 'GitHub' :
         currentConfig.source === 'huggingface' ? 'Hugging Face' : 'URL'}
      </span>
      
      <!-- FList 官网链接 -->
      <a 
        href="https://flist.261770.xyz/"
        target="_blank"
        rel="noopener noreferrer"
        class="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-sm font-medium"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
          <polyline points="15 3 21 3 21 9"/>
          <line x1="10" x2="21" y1="14" y2="3"/>
        </svg>
        点此
      </a>
    </div>
    
    <button 
      on:click={() => fetchItems(currentConfig, pathStack[pathStack.length - 1]?.path || "")}
      class="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
      title="刷新"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-zinc-500" class:animate-spin={loading}>
        <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
        <path d="M3 3v5h5"/>
        <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
        <path d="M16 16h5v5"/>
      </svg>
    </button>
  </div>

  {#if error}
    <div class="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>
      </svg>
      {error}
      <button on:click={() => fetchItems(currentConfig, pathStack[pathStack.length - 1]?.path || "")} class="ml-auto underline hover:no-underline">重试</button>
    </div>
  {/if}

  <!-- 面包屑导航（仅 github-repo 类型显示） -->
  {#if currentConfig.source === 'github-repo' && pathStack.length > 1}
    <div class="flex items-center gap-1 mb-4 p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg text-sm overflow-x-auto">
      {#each pathStack as folder, i}
        {#if i > 0}
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-zinc-400 flex-shrink-0">
            <path d="m9 18 6-6-6-6"/>
          </svg>
        {/if}
        <button
          on:click={() => navigateToLevel(i)}
          class="px-2 py-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors whitespace-nowrap {i === pathStack.length - 1 ? 'text-blue-500 font-medium' : 'text-zinc-600 dark:text-zinc-400'}"
        >
          {folder.name}
        </button>
      {/each}
    </div>
  {/if}

  <!-- 表头 -->
  <div class="file-list-header grid grid-cols-[1fr_100px_140px_50px] gap-2 px-3 py-2 text-xs font-medium text-zinc-400 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-700 mb-1">
    <span>名称</span>
    <span class="text-right">大小</span>
    <span class="text-right">更新时间</span>
    <span></span>
  </div>

  <div class="file-list min-h-[200px] relative">
    {#if loading && items.length === 0}
      <div class="absolute inset-0 flex items-center justify-center text-zinc-400">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="animate-spin">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
      </div>
    {/if}

    <!-- 返回上一级（仅 github-repo 类型且在子目录时显示） -->
    {#if currentConfig.source === 'github-repo' && pathStack.length > 1}
      <div
        class="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors group"
        on:click={goBack}
      >
        <div class="flex items-center justify-center w-6 h-6 text-zinc-400 group-hover:text-blue-500 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m15 18-6-6 6-6"/>
          </svg>
        </div>
        <span class="text-zinc-500 dark:text-zinc-400 font-medium group-hover:text-zinc-700 dark:group-hover:text-zinc-200 transition-colors">.. (返回上一级)</span>
      </div>
    {/if}

    {#each items as item}
      <div class="item-row">
        {#if item.type === "directory"}
          <div 
            class="folder-item grid grid-cols-[1fr_100px_140px_50px] gap-2 py-2 px-3 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors group items-center"
            on:click={() => navigateIntoFolder(item)}
          >
            <div class="flex items-center gap-2">
              <div class="flex items-center justify-center w-6 h-6 text-blue-500 group-hover:scale-110 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/>
                </svg>
              </div>
              <span class="text-zinc-700 dark:text-zinc-300 font-medium">{item.name}</span>
            </div>
            <span class="text-right text-zinc-400 text-xs">-</span>
            <span class="text-right text-zinc-400 text-xs">{formatDate(item.updatedAt)}</span>
            <div class="flex justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-zinc-400 group-hover:text-zinc-600">
                <path d="m9 18 6-6-6-6"/>
              </svg>
            </div>
          </div>
        {:else}
          <div class="file-item grid grid-cols-[1fr_100px_140px_50px] gap-2 py-2 px-3 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors group items-center">
            <div class="flex items-center gap-2 min-w-0">
              <div class="flex items-center justify-center w-6 h-6 text-zinc-400 flex-shrink-0">
                {@html getFileIconSvg(getFileIcon(item.name))}
              </div>
              <div class="min-w-0 flex-1">
                <span class="text-zinc-600 dark:text-zinc-400 block truncate" title={item.name}>{item.name}</span>
                {#if item.description}
                  <span class="text-zinc-400 text-xs block truncate">{item.description}</span>
                {/if}
              </div>
            </div>
            <span class="text-right text-zinc-400 text-xs">{formatSize(item.size)}</span>
            <span class="text-right text-zinc-400 text-xs">{formatDate(item.updatedAt)}</span>
            <div class="flex items-center justify-center gap-1">
              {#if canPreview(item.name)}
                <button 
                  on:click={() => openPreview(item)}
                  class="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded transition-colors text-zinc-500 hover:text-blue-500"
                  title="预览"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                </button>
              {/if}
              <a 
                href={item.downloadUrl}
                download={item.name}
                target="_blank"
                rel="noopener noreferrer"
                class="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded transition-colors text-zinc-500 hover:text-blue-500"
                title="下载"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" x2="12" y1="15" y2="3"/>
                </svg>
              </a>
            </div>
          </div>
        {/if}
      </div>
    {/each}

    {#if !loading && items.length === 0}
      <div class="py-12 text-center text-zinc-400 dark:text-zinc-500">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="mx-auto mb-3">
          <path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"/>
        </svg>
        <p>暂无文件</p>
      </div>
    {/if}
  </div>
</div>

<!-- 预览模态框 -->
{#if previewItem}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" on:click={closePreview}>
    <div class="relative max-w-4xl max-h-[90vh] w-full bg-white dark:bg-zinc-900 rounded-lg overflow-hidden" on:click|stopPropagation>
      <!-- 头部 -->
      <div class="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-700">
        <span class="font-medium text-zinc-700 dark:text-zinc-300 truncate pr-4">{previewItem.name}</span>
        <button on:click={closePreview} class="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-zinc-500">
            <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
          </svg>
        </button>
      </div>
      
      <!-- 预览内容 -->
      <div class="p-4 flex items-center justify-center min-h-[300px]">
        {#if previewType === "image"}
          <img src={previewItem.downloadUrl} alt={previewItem.name} class="max-w-full max-h-[70vh] object-contain rounded" />
        {:else if previewType === "video"}
          <video src={previewItem.downloadUrl} controls class="max-w-full max-h-[70vh] rounded">
            <track kind="captions" />
          </video>
        {:else if previewType === "audio"}
          <audio src={previewItem.downloadUrl} controls class="w-full max-w-md" />
        {:else if previewType === "pdf"}
          <iframe src={previewItem.downloadUrl} title={previewItem.name} class="w-full h-[70vh] rounded border-0" />
        {/if}
      </div>
      
      <!-- 底部操作 -->
      <div class="flex items-center justify-end gap-2 p-4 border-t border-zinc-200 dark:border-zinc-700">
        <a 
          href={previewItem.downloadUrl}
          download={previewItem.name}
          class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" x2="12" y1="15" y2="3"/>
          </svg>
          下载文件
        </a>
      </div>
    </div>
  </div>
{/if}

<style>
  .flist-explorer-container {
    display: flex;
    flex-direction: column;
  }

  .item-row {
    width: 100%;
  }

  :global(.flist-explorer-container a) {
    text-decoration: none !important;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .animate-spin {
    animation: spin 1s linear infinite;
  }

  .rotate-180 {
    transform: rotate(180deg);
  }
</style>
