<script lang="ts">
  import { onMount } from "svelte";

  // 从环境变量或配置中读取 API 基础地址
  export let apiBase = "https://e3.2x.nz/api/";

  interface FileItem {
    id: string;
    name: string;
    path: string;
    type: "file" | "directory";
    size?: number;
    downloadUrl?: string;
  }

  let items: FileItem[] = [];
  let pathStack: { name: string; path: string; items: FileItem[] }[] = [];
  let loading = false;
  let error = "";

  async function fetchItems(currentPath = "/") {
    loading = true;
    items = []; // 立即清空当前列表，防止显示旧数据
    error = "";
    try {
      const url = `${apiBase}?path=${encodeURIComponent(currentPath)}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`API 请求失败: ${response.status}`);
      }

      const data = await response.json();
      const folderValue = data.folder?.value || [];

      items = folderValue
        .map((item: any) => {
          const isFolder = !!item.folder;
          // 拼接完整路径用于下载或下级导航
          const fullPath =
            currentPath === "/" ? `/${item.name}` : `${currentPath}/${item.name}`;

          return {
            id: item.id,
            name: item.name,
            path: fullPath,
            type: isFolder ? "directory" : "file",
            size: item.size,
            // 下载链接拼接规则
            downloadUrl: isFolder
              ? undefined
              : `${apiBase}raw/?path=${encodeURIComponent(fullPath)}`,
          };
        })
        .sort((a: FileItem, b: FileItem) => {
          if (a.type === b.type) return a.name.localeCompare(b.name);
          return a.type === "directory" ? -1 : 1;
        });

      if (pathStack.length === 0) {
        pathStack = [{ name: "OneDrive 根目录", path: "/", items }];
      } else {
        pathStack[pathStack.length - 1].items = items;
      }
    } catch (err: any) {
      error = `加载失败: ${err.message}`;
      console.error(err);
    } finally {
      loading = false;
    }
  }

  async function navigateInto(item: FileItem) {
    if (item.type === "directory") {
      pathStack = [...pathStack, { name: item.name, path: item.path, items: [] }];
      await fetchItems(item.path);
    }
  }

  async function navigateToLevel(index: number) {
    pathStack = pathStack.slice(0, index + 1);
    await fetchItems(pathStack[index].path);
  }

  async function goBack() {
    if (pathStack.length > 1) {
      pathStack = pathStack.slice(0, -1);
      await fetchItems(pathStack[pathStack.length - 1].path);
    }
  }

  function formatSize(bytes?: number) {
    if (bytes === undefined || bytes === 0) return "";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (
      Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
    );
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
      case "folder":
        return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>`;
      default:
        return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>`;
    }
  }

  onMount(() => {
    fetchItems("/");
  });

  $: currentView = pathStack[pathStack.length - 1] || { items: [] };
</script>

<div class="onedrive-explorer-container">
  <!-- 面包屑导航 -->
  <div
    class="breadcrumb-bar flex items-center gap-1 mb-4 p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-sm overflow-x-auto whitespace-nowrap"
  >
    {#each pathStack as folder, i}
      {#if i > 0}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="text-zinc-400 flex-shrink-0"
          ><path d="m9 18 6-6-6-6" /></svg
        >
      {/if}
      <button
        class="px-2 py-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors {i ===
        pathStack.length - 1
          ? 'text-blue-500 font-medium'
          : 'text-zinc-600 dark:text-zinc-400'}"
        on:click={() => navigateToLevel(i)}
      >
        {folder.name}
      </button>
    {/each}

    {#if loading}
      <div class="ml-auto flex items-center gap-2 text-zinc-400 text-xs">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="animate-spin"
          ><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg
        >
        正在加载...
      </div>
    {/if}
  </div>

  {#if error}
    <div
      class="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm flex items-center gap-2"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        ><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line
          x1="12"
          x2="12.01"
          y1="16"
          y2="16"
        /></svg
      >
      {error}
      <button
        on:click={() => fetchItems(currentView.path)}
        class="ml-auto underline hover:no-underline">重试</button
      >
    </div>
  {/if}

  <!-- 表头 -->
  <div
    class="file-list-header flex items-center px-3 py-2 text-xs font-medium text-zinc-400 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-700 mb-1"
  >
    <span class="flex-1">名称</span>
    <span class="w-24 text-right">大小</span>
    <span class="w-12"></span>
  </div>

  <div class="file-list min-h-[200px] relative">
    {#if loading && items.length === 0}
      <div class="absolute inset-0 flex items-center justify-center text-zinc-400">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="animate-spin"
          ><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg
        >
      </div>
    {/if}

    <!-- 返回上一级 -->
    {#if pathStack.length > 1}
      <button
        type="button"
        class="w-full text-left item-row flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors group"
        on:click={goBack}
      >
        <div
          class="flex items-center justify-center w-6 h-6 text-zinc-400 group-hover:text-blue-500 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            ><path d="m18 15-6-6-6 6" /></svg
          >
        </div>
        <span
          class="text-zinc-500 dark:text-zinc-400 font-medium group-hover:text-zinc-700 dark:group-hover:text-zinc-200 transition-colors"
          >... (返回上一级)</span
        >
      </button>
    {/if}

    {#each items as item}
      <div class="item-row">
        {#if item.type === "directory"}
          <button
            type="button"
            class="w-full text-left folder-item flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors group"
            on:click={() => navigateInto(item)}
          >
            <div
              class="flex items-center justify-center w-6 h-6 text-blue-500 group-hover:scale-110 transition-transform"
            >
              {@html getFileIconSvg("folder")}
            </div>
            <span class="text-zinc-700 dark:text-zinc-300 font-medium flex-1"
              >{item.name}</span
            >
            <div
              class="text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-400 transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                ><path d="m9 18 6-6-6-6" /></svg
              >
            </div>
          </button>
        {:else}
          <a
            href={item.downloadUrl}
            download={item.name}
            target="_blank"
            rel="noopener noreferrer"
            class="file-item flex items-center justify-between py-2 px-3 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors group no-underline"
          >
            <div class="flex items-center gap-2 flex-1">
              <div
                class="flex items-center justify-center w-6 h-6 text-zinc-400 group-hover:text-blue-500 transition-colors"
              >
                {@html getFileIconSvg(getFileIcon(item.name))}
              </div>
              <span
                class="text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-800 dark:group-hover:text-zinc-200 transition-colors"
                >{item.name}</span
              >
            </div>
            <div class="flex items-center gap-4 text-xs text-zinc-400">
              <span class="w-24 text-right">{formatSize(item.size)}</span>
              <div
                class="opacity-0 group-hover:opacity-100 p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded transition-all text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 w-12 flex justify-center"
                title="下载"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  ><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline
                    points="7 10 12 15 17 10"
                  /><line x1="12" x2="12" y1="15" y2="3" /></svg
                >
              </div>
            </div>
          </a>
        {/if}
      </div>
    {/each}

    {#if !loading && items.length === 0}
      <div class="py-12 text-center text-zinc-400 dark:text-zinc-500">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="mx-auto mb-3"
          ><path
            d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"
          /></svg
        >
        <p>文件夹为空</p>
      </div>
    {/if}
  </div>
</div>

<style>
  .onedrive-explorer-container {
    display: flex;
    flex-direction: column;
  }

  .item-row {
    width: 100%;
  }

  :global(.onedrive-explorer-container a) {
    text-decoration: none !important;
  }

  .breadcrumb-bar::-webkit-scrollbar {
    height: 2px;
  }
  .breadcrumb-bar::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.1);
    border-radius: 10px;
  }

  :global(.dark) .breadcrumb-bar::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .animate-spin {
    animation: spin 1s linear infinite;
  }
</style>
