<script lang="ts">
import { onMount } from "svelte";

let leftText = "鸣潮";
let rightText = "牛逼";
let iconName = "arcticons:wuthering-waves";
let fontSize = 64;
let iconSize = 64;
let gap = 20;

// Font state
let customFont: string | null = null;
let customFontName = "";
let fontWeight = 400;
let localFonts: {
	family: string;
	fullName: string;
	postscriptName: string;
	style: string;
}[] = [];
let localFontSearchQuery = "";
let isLoadingLocalFonts = false;
let localFontError = "";

// Color state
let color = "#000000";
let bgColor = "#ffffff";
let bgColorOpacity = 1;
let iconColor = "#000000";
let useOriginalIconColor = true;

// Shadows
let textShadow = { x: 0, y: 0, blur: 0, color: "#000000", alpha: 0 };
let iconShadow = { x: 0, y: 0, blur: 0, color: "#000000", alpha: 0 };
let shadowTarget = "both";

function updateShadow(key: string, value: string | number) {
	if (shadowTarget === "both" || shadowTarget === "text") {
		textShadow = { ...textShadow, [key]: value };
	}
	if (shadowTarget === "both" || shadowTarget === "icon") {
		iconShadow = { ...iconShadow, [key]: value };
	}
}

function hexToRgba(hex: string, alpha: number) {
	const r = Number.parseInt(hex.slice(1, 3), 16);
	const g = Number.parseInt(hex.slice(3, 5), 16);
	const b = Number.parseInt(hex.slice(5, 7), 16);
	return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Icon Background State
let iconBgEnabled = false;
let iconBgRadius = 20;
let iconRadius = 0;
let iconBgColor = "#000000";
let iconBgOpacity = 0.2;
let iconBgBlur = 0;
let iconBgPadding = 10;

// Icon Search
let searchQuery = "";
let searchResults: string[] = [];
let isSearching = false;
let searchDebounce: ReturnType<typeof setTimeout>;

// Aspect Ratios
let ratios = [
	{ label: "1:1", w: 1, h: 1, checked: false },
	{ label: "4:3", w: 4, h: 3, checked: false },
	{ label: "16:9", w: 16, h: 9, checked: true },
	{ label: "21:9", w: 21, h: 9, checked: false },
];

// Linked scaling state
let linkScale = true;

let iconSvg = "";
let localIcon: string | null = null;
let svgContainer: SVGSVGElement;

// Background Image State
let bgImage: string | null = null;
let bgImageX = 0;
let bgImageY = 0;
let bgImageScale = 1;
let bgBlur = 0;
let bgOpacity = 1;
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let initialImageX = 0;
let initialImageY = 0;
let initialPinchDistance = 0;
let initialScale = 1;

// Export Config
let exportConfig = {
	format: "png",
	scales: [1] as number[],
	filename: "cover",
	transparentBg: false,
	exportRatios: [] as string[],
};

onMount(() => {
	bgColor = "#ffffff";
	color = "#000000";
	iconColor = "#000000";
	textShadow = { x: 0, y: 0, blur: 0, color: "#000000", alpha: 0 };
	iconShadow = { x: 0, y: 0, blur: 0, color: "#000000", alpha: 0 };
});

// Color linking state
let linkColor = true;

// Scale Linking Logic
let lastFontSize = fontSize;
let lastIconSize = iconSize;

function handleColorChange(newColor: string, type: "text" | "icon") {
	if (type === "text") {
		color = newColor;
		if (linkColor) iconColor = newColor;
	} else {
		iconColor = newColor;
		if (linkColor) color = newColor;
	}
}

function handleFontSizeChange(e: Event) {
	const newVal = (e.target as HTMLInputElement).valueAsNumber;
	if (linkScale) {
		const ratio = newVal / lastFontSize;
		iconSize = Math.round(iconSize * ratio);
		lastIconSize = iconSize;
	}
	fontSize = newVal;
	lastFontSize = newVal;
}

function handleIconSizeChange(e: Event) {
	const newVal = (e.target as HTMLInputElement).valueAsNumber;
	if (linkScale) {
		const ratio = newVal / lastIconSize;
		fontSize = Math.round(fontSize * ratio);
		lastFontSize = fontSize;
	}
	iconSize = newVal;
	lastIconSize = newVal;
}

function handleBgImageUpload(e: Event) {
	const file = (e.target as HTMLInputElement).files?.[0];
	if (file) {
		const reader = new FileReader();
		reader.onload = (e) => {
			bgImage = e.target?.result as string;
			bgImageX = 0;
			bgImageY = 0;
			bgImageScale = 1;
			bgBlur = 0;
			bgOpacity = 1;
		};
		reader.readAsDataURL(file);
	}
}

function handleFontUpload(e: Event) {
	const file = (e.target as HTMLInputElement).files?.[0];
	if (file) {
		const reader = new FileReader();
		reader.onload = (e) => {
			const fontData = e.target?.result as string;
			customFontName = file.name.replace(/\.[^/.]+$/, "");
			customFont = fontData;
			const fontFace = new FontFace(customFontName, fontData);
			fontFace.load().then((loadedFace) => {
				document.fonts.add(loadedFace);
			});
		};
		reader.readAsArrayBuffer(file);
	}
}

async function loadLocalFonts() {
	if (!("queryLocalFonts" in window)) {
		localFontError = "仅支持 PC端新版Chrome/Edge等Chromium内核的浏览器";
		return;
	}
	isLoadingLocalFonts = true;
	localFontError = "";
	try {
		const fonts = await (window as any).queryLocalFonts();
		localFonts = fonts.map((f: any) => ({
			family: f.family,
			fullName: f.fullName,
			postscriptName: f.postscriptName,
			style: f.style,
		}));
	} catch (e: any) {
		if (e.name === "NotAllowedError") {
			localFontError = "您拒绝了字体访问权限";
		} else {
			localFontError = `加载本地字体失败: ${e.message}`;
		}
	} finally {
		isLoadingLocalFonts = false;
	}
}

function selectLocalFont(font: {
	family: string;
	fullName: string;
	postscriptName: string;
	style: string;
}) {
	customFontName = font.family;
	customFont = null;
	localFonts = [];
	localFontSearchQuery = "";
}

$: filteredLocalFonts = localFonts.filter(
	(f) =>
		f.family.toLowerCase().includes(localFontSearchQuery.toLowerCase()) ||
		f.fullName.toLowerCase().includes(localFontSearchQuery.toLowerCase()),
);

// Pointer state for multi-touch
let activePointers = new Map<number, { x: number; y: number }>();

function handlePointerDown(e: PointerEvent) {
	if (!bgImage) return;
	e.preventDefault();
	(e.currentTarget as Element).setPointerCapture(e.pointerId);
	activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

	if (activePointers.size === 1) {
		isDragging = true;
		dragStartX = e.clientX;
		dragStartY = e.clientY;
		initialImageX = bgImageX;
		initialImageY = bgImageY;
	} else if (activePointers.size === 2) {
		isDragging = false;
		const points = Array.from(activePointers.values());
		initialPinchDistance = Math.hypot(
			points[1].x - points[0].x,
			points[1].y - points[0].y,
		);
		initialScale = bgImageScale;
	}
}

function handlePointerMove(e: PointerEvent) {
	if (!bgImage || !activePointers.has(e.pointerId)) return;
	e.preventDefault();
	activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

	if (activePointers.size === 2) {
		const points = Array.from(activePointers.values());
		const currentDistance = Math.hypot(
			points[1].x - points[0].x,
			points[1].y - points[0].y,
		);
		if (initialPinchDistance > 0) {
			const scaleFactor = currentDistance / initialPinchDistance;
			bgImageScale = Math.max(0.1, Math.min(initialScale * scaleFactor, 10));
		}
	} else if (activePointers.size === 1 && isDragging) {
		const deltaX = e.clientX - dragStartX;
		const deltaY = e.clientY - dragStartY;
		bgImageX = initialImageX + deltaX / bgImageScale;
		bgImageY = initialImageY + deltaY / bgImageScale;
	}
}

function handlePointerUp(e: PointerEvent) {
	activePointers.delete(e.pointerId);
	(e.currentTarget as Element).releasePointerCapture(e.pointerId);
	if (activePointers.size < 2) {
		initialPinchDistance = 0;
	}
	if (activePointers.size === 0) {
		isDragging = false;
	}
}

function handleWheel(e: WheelEvent) {
	if (!bgImage) return;
	e.preventDefault();
	const scaleFactor = 1.1;
	if (e.deltaY < 0) {
		bgImageScale = Math.min(bgImageScale * scaleFactor, 10);
	} else {
		bgImageScale = Math.max(bgImageScale / scaleFactor, 0.1);
	}
}

// Computed Canvas Size
const BASE_HEIGHT = 900;

$: activeRatios = ratios.filter((r) => r.checked);
$: visualRatios = activeRatios.length > 0 ? activeRatios : [ratios[2]];
$: maxWidthRatio = visualRatios.reduce(
	(max, r) => (r.w / r.h > max ? r.w / r.h : max),
	0,
);
$: canvasWidth = Math.round(BASE_HEIGHT * maxWidthRatio);
$: canvasHeight = BASE_HEIGHT;

// Fetch icon SVG
$: {
	if (iconName?.includes(":")) {
		const [prefix, name] = iconName.split(":");
		fetch(`https://api.iconify.design/${prefix}/${name}.svg`)
			.then((res) => {
				if (!res.ok) throw new Error("Icon not found");
				return res.text();
			})
			.then((svg) => {
				let processedSvg = svg
					.replace(/width="[^"]*"/g, "")
					.replace(/height="[^"]*"/g, "");
				processedSvg = processedSvg.replace(
					/<svg\b([^>]*)>/,
					'<svg$1 width="100%" height="100%" preserveAspectRatio="none">',
				);
				if (!useOriginalIconColor) {
					processedSvg = processedSvg.replace(
						/fill="[^"]*"/g,
						'fill="currentColor"',
					);
				}
				iconSvg = processedSvg;
			})
			.catch(() => {
				iconSvg = "";
			});
	} else {
		iconSvg = "";
	}
}

async function handleSearch() {
	if (!searchQuery) {
		searchResults = [];
		return;
	}
	isSearching = true;
	try {
		const res = await fetch(
			`https://api.iconify.design/search?query=${encodeURIComponent(searchQuery)}&limit=20`,
		);
		const data = await res.json();
		searchResults = data.icons || [];
	} catch (e) {
		console.error(e);
		searchResults = [];
	} finally {
		isSearching = false;
	}
}

function onSearchInput(e: Event) {
	const val = (e.target as HTMLInputElement).value;
	searchQuery = val;
	clearTimeout(searchDebounce);
	if (val.trim()) {
		searchDebounce = setTimeout(() => {
			handleSearch();
		}, 500);
	} else {
		searchResults = [];
	}
}

function handleLocalIconUpload(e: Event) {
	const file = (e.target as HTMLInputElement).files?.[0];
	if (file) {
		const reader = new FileReader();
		reader.onload = (e) => {
			localIcon = e.target?.result as string;
			iconName = "本地图片";
			iconSvg = "";
		};
		reader.readAsDataURL(file);
	}
}

function selectIcon(icon: string) {
	iconName = icon;
	localIcon = null;
}

async function doExport() {
	if (!svgContainer) return;

	const guides = svgContainer.querySelectorAll(".ratio-guide");
	for (const g of guides) {
		(g as SVGElement).style.display = "none";
	}

	const border = svgContainer.querySelector(".canvas-border");
	if (border) (border as SVGElement).style.display = "none";

	const svgClone = svgContainer.cloneNode(true) as SVGSVGElement;

	const defs = svgClone.querySelector("defs");
	if (defs) {
		const pattern = defs.querySelector("#checkerboard");
		if (pattern) pattern.remove();
	}

	const bgRects = svgClone.querySelectorAll("rect");
	const fo = svgClone.querySelector("foreignObject");
	if (fo) {
		fo.setAttribute("width", canvasWidth.toString());
		fo.setAttribute("height", canvasHeight.toString());
	}

	const bgImg = svgClone.querySelector("image");
	if (bgImg) {
		bgImg.setAttribute("width", canvasWidth.toString());
		bgImg.setAttribute("height", canvasHeight.toString());
		bgImg.style.filter = `blur(${bgBlur}px)`;
		bgImg.style.opacity = bgOpacity.toString();
	}
	const checkerboardRect = bgRects[0];
	if (checkerboardRect) checkerboardRect.remove();

	const solidBgRect = bgRects[1];
	if (solidBgRect) {
		solidBgRect.setAttribute("width", canvasWidth.toString());
		solidBgRect.setAttribute("height", canvasHeight.toString());
		if (exportConfig.transparentBg) {
			solidBgRect.setAttribute("fill", "none");
		} else {
			solidBgRect.setAttribute("fill", hexToRgba(bgColor, bgColorOpacity));
		}
	}

	const ratiosToExport =
		exportConfig.exportRatios.length > 0
			? ratios.filter((r) => exportConfig.exportRatios.includes(r.label))
			: activeRatios;

	for (const ratio of ratiosToExport) {
		const ratioWidth = Math.round(BASE_HEIGHT * (ratio.w / ratio.h));
		const ratioHeight = BASE_HEIGHT;
		const xOffset = (canvasWidth - ratioWidth) / 2;

		const ratioSvgClone = svgClone.cloneNode(true) as SVGSVGElement;
		ratioSvgClone.setAttribute("width", ratioWidth.toString());
		ratioSvgClone.setAttribute("height", ratioHeight.toString());
		ratioSvgClone.setAttribute(
			"viewBox",
			`${xOffset} 0 ${ratioWidth} ${ratioHeight}`,
		);

		const svgData = new XMLSerializer().serializeToString(ratioSvgClone);

		const ratioFilename =
			activeRatios.length > 1
				? `${exportConfig.filename}-${ratio.label.replace(":", "-")}`
				: exportConfig.filename;

		if (exportConfig.format === "svg") {
			const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
			const url = URL.createObjectURL(blob);
			downloadLink(url, `${ratioFilename}.svg`);
		} else {
			const img = new Image();
			img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgData)))}`;

			await new Promise<void>((resolve) => {
				img.onload = () => resolve();
			});

			const scales = exportConfig.scales.length > 0 ? exportConfig.scales : [1];

			for (const scale of scales) {
				const canvas = document.createElement("canvas");
				canvas.width = ratioWidth * scale;
				canvas.height = ratioHeight * scale;
				const ctx = canvas.getContext("2d");
				if (!ctx) continue;

				ctx.imageSmoothingEnabled = true;
				ctx.imageSmoothingQuality = "high";
				ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

				const suffix = scales.length > 1 ? `@${scale}x` : "";
				downloadLink(
					canvas.toDataURL("image/png"),
					`${ratioFilename}${suffix}.png`,
				);
			}
		}
	}

	for (const g of guides) {
		(g as SVGElement).style.display = "";
	}
	if (border) (border as SVGElement).style.display = "";
}

function downloadLink(url: string, filename: string) {
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
}
</script>

<div class="flex flex-col items-center gap-8 w-full max-w-6xl mx-auto relative">
  <!-- Preview Area -->
  <div 
      class="w-full overflow-hidden flex justify-center card-surface p-4 rounded-xl select-none touch-none"
      on:pointerdown={handlePointerDown}
      on:pointermove={handlePointerMove}
      on:pointerup={handlePointerUp}
      on:pointercancel={handlePointerUp}
      on:pointerleave={handlePointerUp}
  >
      <svg 
        bind:this={svgContainer}
        width={canvasWidth} 
        height={canvasHeight} 
        viewBox="0 0 {canvasWidth} {canvasHeight}"
        xmlns="http://www.w3.org/2000/svg"
        style="max-width: 100%; height: auto; cursor: {bgImage ? (isDragging ? 'grabbing' : 'grab') : 'default'};"
        on:wheel={handleWheel}
      >
        <defs>
            <pattern id="checkerboard" width="20" height="20" patternUnits="userSpaceOnUse">
                <rect width="10" height="10" fill="#e0e0e0" />
                <rect x="10" y="0" width="10" height="10" fill="#ffffff" />
                <rect x="0" y="10" width="10" height="10" fill="#ffffff" />
                <rect x="10" y="10" width="10" height="10" fill="#e0e0e0" />
            </pattern>
        </defs>

        <!-- Background -->
        <rect width="100%" height="100%" fill="url(#checkerboard)" />
        <rect width="100%" height="100%" fill={hexToRgba(bgColor, bgColorOpacity)} />
        
        {#if bgImage}
            <image 
                href={bgImage} 
                x={bgImageX} 
                y={bgImageY} 
                width={canvasWidth} 
                height={canvasHeight} 
                transform="scale({bgImageScale})" 
                style="transform-origin: 50% 50%; filter: blur({bgBlur}px); opacity: {bgOpacity};"
                preserveAspectRatio="xMidYMid meet"
            />
        {/if}

        <!-- Content -->
        <foreignObject x="0" y="0" width="100%" height="100%" style="pointer-events: none;">
            <div 
                xmlns="http://www.w3.org/1999/xhtml" 
                style="
                    width: 100%; 
                    height: 100%; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    gap: {gap}px;
                    font-family: {customFontName || 'sans-serif'};
                    font-weight: {fontWeight};
                "
            >
                <span style="
                    font-size: {fontSize}px; 
                    color: {color}; 
                    text-shadow: {textShadow.x}px {textShadow.y}px {textShadow.blur}px {hexToRgba(textShadow.color, textShadow.alpha)};
                    line-height: 1;
                    white-space: nowrap;
                ">{leftText}</span>
                
                {#if iconSvg || localIcon}
                    <div style="
                        width: {iconSize + iconBgPadding * 2}px; 
                        height: {iconSize + iconBgPadding * 2}px; 
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        background-color: {iconBgEnabled ? hexToRgba(iconBgColor, iconBgOpacity) : 'transparent'};
                        backdrop-filter: {iconBgEnabled && iconBgBlur > 0 ? `blur(${iconBgBlur}px)` : 'none'};
                        -webkit-backdrop-filter: {iconBgEnabled && iconBgBlur > 0 ? `blur(${iconBgBlur}px)` : 'none'};
                        border-radius: {iconBgEnabled ? `${iconBgRadius}%` : '0'};
                    ">
                        <div style="
                            width: {iconSize}px; 
                            height: {iconSize}px; 
                            aspect-ratio: 1 / 1;
                            flex-shrink: 0;
                            color: {useOriginalIconColor ? 'inherit' : iconColor}; 
                            filter: drop-shadow({iconShadow.x}px {iconShadow.y}px {iconShadow.blur}px {hexToRgba(iconShadow.color, iconShadow.alpha)});
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            border-radius: {iconRadius}%;
                            overflow: hidden;
                        ">
                            {#if localIcon}
                                <img src={localIcon} style="width: 100%; height: 100%; object-fit: contain;" alt="Local Icon" />
                            {:else}
                                <div class="icon-svg-box">
                                    {@html iconSvg}
                                </div>
                            {/if}
                        </div>
                    </div>
                {/if}

                <span style="
                    font-size: {fontSize}px; 
                    color: {color}; 
                    text-shadow: {textShadow.x}px {textShadow.y}px {textShadow.blur}px {hexToRgba(textShadow.color, textShadow.alpha)};
                    line-height: 1;
                    white-space: nowrap;
                ">{rightText}</span>
            </div>
        </foreignObject>

        <!-- Canvas Border (Visual only) -->
        <rect 
            x="0" 
            y="0" 
            width={canvasWidth} 
            height={canvasHeight} 
            fill="none" 
            stroke="rgba(255, 0, 0, 0.8)" 
            stroke-width="2" 
            class="canvas-border"
        />

        <!-- Ratio Guides -->
        {#each visualRatios as ratio}
            {#if (BASE_HEIGHT * (ratio.w / ratio.h)) < canvasWidth}
                <g class="ratio-guide">
                    <rect 
                        x={(canvasWidth - (BASE_HEIGHT * (ratio.w / ratio.h))) / 2} 
                        y="0" 
                        width={BASE_HEIGHT * (ratio.w / ratio.h)} 
                        height={BASE_HEIGHT} 
                        fill="none" 
                        stroke="rgba(255, 0, 0, 0.5)" 
                        stroke-width="2" 
                        stroke-dasharray="10 5"
                    />
                    <text 
                        x="{(canvasWidth - (BASE_HEIGHT * (ratio.w / ratio.h))) / 2 + 10}" 
                        y="30" 
                        fill="rgba(255, 0, 0, 0.5)" 
                        font-size="20"
                    >{ratio.label}</text>
                </g>
            {/if}
        {/each}
      </svg>
  </div>

  <!-- Controls -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full card-surface p-6 rounded-xl">
    
    <!-- Left Column: Content -->
    <div class="flex flex-col gap-6">
      <h3 class="text-lg font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2">
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M5 19h1.4l8.625-8.625-1.4-1.4L5 17.6V19ZM19.3 8.925l-4.25-4.2 1.4-1.4q.575-.575 1.413-.575.837 0 1.412.575l1.4 1.4q.575.575.6 1.388.025.812-.55 1.387ZM17.85 10.4 7.25 21H3v-4.25l10.6-10.6 4.25 4.25Zm-3.525-.725-.7-.7 1.4 1.4-.7-.7Z"/></svg>
          内容设置
      </h3>
      
      <div class="space-y-4">
          <div class="flex flex-col gap-2">
              <label class="text-sm font-bold opacity-80">背景图片</label>
              <div class="relative">
                  <input type="file" accept="image/*" on:change={handleBgImageUpload} class="hidden" id="bg-upload" />
                  <label for="bg-upload" class="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-zinc-300 dark:border-zinc-600 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-500/5 transition-all group">
                      <div class="flex flex-col items-center gap-1 opacity-70 group-hover:opacity-100">
                          <svg class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M11 19h2v-4.175l1.6 1.6L16 15l-4-4-4 4 1.4 1.425 1.6-1.6V19Zm-7 3q-.825 0-1.413-.587Q2 20.825 2 20V4q0-.825.587-1.413Q3.175 2 4 2h10l6 6v12q0 .825-.587 1.413Q18.825 22 18 22H4Zm9-13V4H4v16h14V9h-4ZM4 4v5V4v16V4Z"/></svg>
                          <span class="text-xs">{bgImage ? '点击更换图片' : '点击上传背景图'}</span>
                      </div>
                  </label>
                  {#if bgImage}
                      <button 
                          on:click={() => { bgImage = null; bgImageScale = 1; bgImageX = 0; bgImageY = 0; }}
                          class="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-sm"
                          title="移除背景图"
                      >
                          <svg class="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M6.4 19 5 17.6l5.6-5.6L5 6.4 6.4 5l5.6 5.6L17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6Z"/></svg>
                      </button>
                      <div class="mt-2 space-y-1" on:click|stopPropagation>
                          <div class="flex justify-between text-xs opacity-70">
                              <label>模糊程度</label>
                              <span>{bgBlur}px</span>
                          </div>
                          <input type="range" bind:value={bgBlur} min="0" max="20" class="w-full accent-blue-500 h-1" />
                      </div>
                      <div class="mt-2 space-y-1" on:click|stopPropagation>
                          <div class="flex justify-between text-xs opacity-70">
                              <label>不透明度</label>
                              <span>{Math.round(bgOpacity * 100)}%</span>
                          </div>
                          <input type="range" bind:value={bgOpacity} min="0" max="1" step="0.01" class="w-full accent-blue-500 h-1" />
                      </div>
                      <p class="text-[10px] opacity-60 mt-1 text-center">
                          提示: 拖拽移动位置，滚轮缩放大小
                      </p>
                  {/if}
              </div>
          </div>

          <div class="flex flex-col gap-2">
              <label class="text-sm font-bold opacity-80">左侧文字</label>
              <input type="text" bind:value={leftText} class="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-transparent focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>

          <div class="flex flex-col gap-2">
              <label class="text-sm font-bold opacity-80">右侧文字</label>
              <input type="text" bind:value={rightText} class="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-transparent focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>

          <div class="flex flex-col gap-2">
              <label class="text-sm font-bold opacity-80">自定义字体</label>
              <div class="relative">
                  <input type="file" accept=".ttf,.otf,.woff,.woff2" on:change={handleFontUpload} class="hidden" id="font-upload" />
                  <label for="font-upload" class="flex items-center justify-center w-full px-4 py-2 border-2 border-dashed border-zinc-300 dark:border-zinc-600 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-500/5 transition-all group">
                      <div class="flex flex-col items-center gap-1 opacity-70 group-hover:opacity-100">
                          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M4 20q-.825 0-1.413-.587Q2 18.825 2 18V6q0-.825.587-1.413Q3.175 4 4 4h16q.825 0 1.413.587Q22 5.175 22 6v12q0 .825-.587 1.413Q20.825 20 20 20Zm0-2h16V6H4v12Zm4-2h2v-4h4v4h2v-6H8v6Zm2-4v-2h4v2h-4ZM4 18V6v12Z"/></svg>
                          <span class="text-xs">{customFontName ? customFontName : '点击上传字体'}</span>
                      </div>
                  </label>
                  {#if customFontName}
                      <button 
                          on:click={() => { customFont = null; customFontName = ""; }}
                          class="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-sm"
                          title="移除字体"
                      >
                          <svg class="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M6.4 19 5 17.6l5.6-5.6L5 6.4 6.4 5l5.6 5.6L17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6Z"/></svg>
                      </button>
                  {/if}
              </div>
              <div class="flex gap-2 mt-1">
                  <button
                      on:click={loadLocalFonts}
                      disabled={isLoadingLocalFonts}
                      class="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs border border-zinc-300 dark:border-zinc-600 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50"
                  >
                      {#if isLoadingLocalFonts}
                          <svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4m0 12v4M2 12h4m12 0h4M4.93 4.93l2.83 2.83m8.48 8.48 2.83 2.83M4.93 19.07l2.83-2.83m8.48-8.48 2.83-2.83"/></svg>
                      {:else}
                          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M4 16h16V4H4v12Zm-2 4h20V2H2v18ZM2 20V2v18Zm4-6h4v-2H6v2Zm0-3h8V9H6v2Zm0-3h8V6H6v2Z"/></svg>
                      {/if}
                      <span>读取本地字体</span>
                  </button>
              </div>
              {#if localFontError}
                  <p class="text-xs text-red-500">{localFontError}</p>
              {/if}
              {#if localFonts.length > 0}
                  <div class="space-y-2 mt-2 p-2 border border-zinc-300 dark:border-zinc-600 rounded-lg">
                      <input 
                          type="text" 
                          bind:value={localFontSearchQuery}
                          placeholder="搜索字体..."
                          class="w-full px-3 py-1 text-xs rounded border border-zinc-300 dark:border-zinc-600 bg-transparent"
                      />
                      <div class="max-h-40 overflow-y-auto space-y-1">
                          {#each filteredLocalFonts as font (font.postscriptName)}
                              <button 
                                  on:click={() => selectLocalFont(font)}
                                  class="w-full text-left px-2 py-1 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded transition-colors"
                                  style="font-family: '{font.family}'"
                              >
                                  <span class="font-medium">{font.family}</span>
                                  <span class="opacity-60 ml-1">{font.style}</span>
                              </button>
                          {/each}
                      </div>
                      <button 
                          on:click={() => { localFonts = []; localFontSearchQuery = ""; }}
                          class="w-full text-xs opacity-60 hover:text-red-500 transition-colors"
                      >
                          关闭
                      </button>
                  </div>
              {/if}
          </div>

          <div class="flex flex-col gap-2">
              <div class="flex justify-between text-sm"><label class="opacity-80 font-bold">字体粗细</label> <span class="font-mono">{fontWeight}</span></div>
              <input type="range" bind:value={fontWeight} min="100" max="900" step="100" class="w-full accent-blue-500" />
          </div>

          <div class="flex flex-col gap-2">
              <label class="text-sm font-bold opacity-80">图标设置</label>
              <div class="grid grid-cols-2 gap-2">
                  <div class="relative">
                      <input type="file" accept="image/*" on:change={handleLocalIconUpload} class="hidden" id="icon-upload" />
                      <label for="icon-upload" class="flex items-center justify-center w-full px-2 py-2 border-2 border-dashed border-zinc-300 dark:border-zinc-600 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-500/5 transition-all group h-10">
                          <div class="flex items-center gap-1 opacity-70 group-hover:opacity-100">
                              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M5 21q-.825 0-1.413-.587Q3 19.825 3 19V5q0-.825.587-1.413Q4.175 3 5 3h14q.825 0 1.413.587Q21 4.175 21 5v14q0 .825-.587 1.413Q19.825 21 19 21H5Zm0-2h14V5H5v14Zm1-2h12l-3.75-5-3 4L9 13l-3 4Zm2-8q.425 0 .713-.288Q9 8.425 9 8t-.287-.713Q8.425 7 8 7t-.712.287Q7 7.575 7 8t.288.712Q7.575 9 8 9ZM5 19V5v14Z"/></svg>
                              <span class="text-[10px] whitespace-nowrap">{localIcon ? '更换图片' : '上传图标'}</span>
                          </div>
                      </label>
                      {#if localIcon}
                          <button 
                              on:click={() => { localIcon = null; iconName = ""; }}
                              class="absolute -top-1 -right-1 p-0.5 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-sm z-10"
                              title="移除本地图标"
                          >
                              <svg class="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M6.4 19 5 17.6l5.6-5.6L5 6.4 6.4 5l5.6 5.6L17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6Z"/></svg>
                          </button>
                      {/if}
                  </div>
                  <div class="relative">
                      <input 
                          type="text" 
                          value={searchQuery} 
                          on:input={onSearchInput}
                          placeholder="搜索库..." 
                          class="w-full px-3 py-1 text-xs rounded border border-zinc-300 dark:border-zinc-600 bg-transparent h-10" 
                      />
                      {#if isSearching}
                          <div class="absolute right-2 top-1/2 -translate-y-1/2 opacity-60">
                              <svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4m0 12v4M2 12h4m12 0h4M4.93 4.93l2.83 2.83m8.48 8.48 2.83 2.83M4.93 19.07l2.83-2.83m8.48-8.48 2.83-2.83"/></svg>
                          </div>
                      {/if}
                  </div>
              </div>
              
              {#if searchResults.length > 0}
                  <div class="grid grid-cols-4 gap-2 mt-2 h-60 sm:h-40 max-h-[60vh] overflow-y-auto p-2 border border-zinc-300 dark:border-zinc-600 rounded-lg">
                      {#each searchResults as icon}
                          {@const isSelected = icon === iconName}
                          <button 
                              on:click={() => selectIcon(icon)}
                              class="p-2 rounded flex items-center justify-center group transition-colors aspect-square hover:bg-zinc-100 dark:hover:bg-zinc-700"
                              title={icon}
                              aria-pressed={isSelected}
                          >
                              <div class={`w-8 h-8 shrink-0 rounded-md bg-white border flex items-center justify-center overflow-hidden ${
                                  isSelected ? "border-blue-500" : "border-zinc-300"
                              }`}>
                                  <img src={`https://api.iconify.design/${icon.split(':')[0]}/${icon.split(':')[1]}.svg`} class="w-6 h-6" alt={icon} />
                              </div>
                          </button>
                      {/each}
                  </div>
              {/if}
              <div class="flex flex-wrap justify-between items-center text-xs mt-1 gap-2">
                  <span class="opacity-60 break-all select-text" title={iconName}>当前: {iconName}</span>
                  <button on:click={() => window.open('https://icones.js.org/', '_blank')} class="text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap">
                      浏览图标库 ↗
                  </button>
              </div>
          </div>
      </div>
    </div>

    <!-- Middle Column: Style -->
    <div class="flex flex-col gap-6">
        <h3 class="text-lg font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2 justify-between">
            <div class="flex items-center gap-2">
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 22q-2.05 0-3.85-.775-1.8-.775-3.15-2.125Q3.65 17.75 2.875 15.95 2.1 14.15 2.1 12.1q0-2.05.775-3.875Q3.65 6.4 5 5.025q1.35-1.375 3.15-2.15Q9.95 2.1 12 2.1q2.05 0 3.875.775 1.825.775 3.175 2.125 1.35 1.35 2.125 3.15.775 1.8.775 3.85 0 2.05-.775 3.85-.775 1.8-2.125 3.15-1.35 1.35-3.175 2.125Q14.05 22 12 22Zm0-2.1q3.35 0 5.625-2.35T19.9 12q0-3.35-2.275-5.7T12 3.95q-3.35 0-5.625 2.35T4.1 12q0 3.35 2.275 5.7T12 19.9ZM12 12Zm0 6q2.5 0 4.25-1.75T18 12q0-.45-.075-.875t-.175-.825q-.45.35-.975.525-.525.175-1.075.175-1.45 0-2.475-1.025Q12.175 8.925 12.175 7.5q0-.55.175-1.075.175-.525.525-.975-.4-.1-.825-.175Q11.625 6.2 11.175 6.2q-2.55 0-4.325 1.775Q5.075 9.75 5.075 12.3q0 2.55 1.775 4.325Q8.625 18.4 11.175 18.4h.825Z"/></svg>
                样式设置
            </div>
            <label class="flex items-center gap-2 text-xs font-normal cursor-pointer select-none border border-zinc-300 dark:border-zinc-600 px-2 py-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors">
                <input type="checkbox" bind:checked={linkScale} class="accent-blue-500" />
                等比缩放
            </label>
        </h3>

        <!-- Sizes -->
        <div class="space-y-6">
            <div class="flex flex-col gap-2">
                <div class="flex justify-between text-sm"><label class="opacity-80 font-bold">字体大小</label> <span class="font-mono">{fontSize}px</span></div>
                <input type="range" value={fontSize} on:input={handleFontSizeChange} min="20" max="700" class="w-full accent-blue-500" />
            </div>
            <div class="flex flex-col gap-2">
                <div class="flex justify-between text-sm"><label class="opacity-80 font-bold">图标大小</label> <span class="font-mono">{iconSize}px</span></div>
                <input type="range" value={iconSize} on:input={handleIconSizeChange} min="20" max="700" class="w-full accent-blue-500" />
            </div>
            <div class="flex flex-col gap-2">
                <div class="flex justify-between text-sm"><label class="opacity-80 font-bold">图标圆角</label> <span class="font-mono">{iconRadius}%</span></div>
                <input type="range" bind:value={iconRadius} min="0" max="50" class="w-full accent-blue-500" />
            </div>
            <div class="flex flex-col gap-2">
                <div class="flex justify-between text-sm"><label class="opacity-80 font-bold">间距</label> <span class="font-mono">{gap}px</span></div>
                <input type="range" bind:value={gap} min="0" max="200" class="w-full accent-blue-500" />
            </div>
        </div>

        <div class="w-full h-px bg-zinc-300 dark:bg-zinc-600"></div>

        <!-- Colors -->
        <div class="space-y-4">
            <div class="flex items-center justify-between mb-2 flex-wrap gap-2">
                <label class="flex items-center gap-2 text-xs font-normal cursor-pointer select-none border border-zinc-300 dark:border-zinc-600 px-2 py-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors">
                    <input type="checkbox" bind:checked={linkColor} class="accent-blue-500" />
                    颜色同步
                </label>
                <label class="flex items-center gap-2 text-xs font-normal cursor-pointer select-none border border-zinc-300 dark:border-zinc-600 px-2 py-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors">
                    <input type="checkbox" bind:checked={useOriginalIconColor} class="accent-blue-500" />
                    原色图标
                </label>
            </div>

            <div class="flex items-center justify-between flex-wrap gap-2">
                <label class="text-sm font-bold opacity-80 min-w-[4rem]">文字颜色</label>
                <div class="flex items-center gap-2">
                    <input type="text" value={color} on:input={(e) => handleColorChange(e.currentTarget.value, 'text')} class="px-2 py-1 text-xs rounded border border-zinc-300 dark:border-zinc-600 bg-transparent w-24 font-mono text-center" />
                    <div class="relative w-8 h-8 rounded-full overflow-hidden border border-zinc-300 dark:border-zinc-600 shadow-sm shrink-0">
                        <input type="color" value={color} on:input={(e) => handleColorChange(e.currentTarget.value, 'text')} class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] p-0 m-0 border-0 cursor-pointer" />
                    </div>
                </div>
            </div>
            
            <div class="flex items-center justify-between flex-wrap gap-2">
                <label class="text-sm font-bold opacity-80 min-w-[4rem]">图标颜色</label>
                <div class="flex items-center gap-2">
                    <input type="text" value={iconColor} disabled={useOriginalIconColor} on:input={(e) => handleColorChange(e.currentTarget.value, 'icon')} class="px-2 py-1 text-xs rounded border border-zinc-300 dark:border-zinc-600 bg-transparent w-24 font-mono text-center disabled:opacity-50" />
                    <div class="relative w-8 h-8 rounded-full overflow-hidden border border-zinc-300 dark:border-zinc-600 shadow-sm shrink-0 {useOriginalIconColor ? 'opacity-50 pointer-events-none' : ''}">
                        <input type="color" value={iconColor} on:input={(e) => handleColorChange(e.currentTarget.value, 'icon')} class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] p-0 m-0 border-0 cursor-pointer" />
                    </div>
                </div>
            </div>

            <div class="flex items-center justify-between flex-wrap gap-2">
                <label class="text-sm font-bold opacity-80 min-w-[4rem]">背景颜色</label>
                <div class="flex items-center gap-2">
                    <div class="flex flex-col items-end gap-1">
                        <div class="flex items-center gap-2">
                            <input type="text" bind:value={bgColor} class="px-2 py-1 text-xs rounded border border-zinc-300 dark:border-zinc-600 bg-transparent w-24 font-mono text-center" />
                            <div class="relative w-8 h-8 rounded-full overflow-hidden border border-zinc-300 dark:border-zinc-600 shadow-sm shrink-0">
                                <input type="color" bind:value={bgColor} class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] p-0 m-0 border-0 cursor-pointer" />
                            </div>
                        </div>
                        <div class="flex items-center gap-2 w-full justify-end">
                            <span class="text-[10px] opacity-50">不透明度 {Math.round(bgColorOpacity * 100)}%</span>
                            <input type="range" bind:value={bgColorOpacity} min="0" max="1" step="0.01" class="w-16 accent-blue-500 h-1" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Right Column: Effects & Export -->
    <div class="flex flex-col gap-6 md:col-span-2 lg:col-span-1">
        <h3 class="text-lg font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="m19.35 10.04-3.75-3.75-1.85 1.85 3.75 3.75 1.85-1.85Zm-5.88-5.88L9.72 9.81l3.75 3.75 3.75-3.75-3.75-3.75ZM6.35 17.66l3.75-3.75-1.85-1.85-3.75 3.75 1.85 1.85Zm11.3-11.3-1.85-1.85-1.41 1.41 1.85 1.85 1.41-1.41ZM12 4c-4.42 0-8 3.58-8 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8Zm0 14c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6Z"/></svg>
            特效与导出
        </h3>

        <!-- Icon Background -->
        <div class="rounded-lg p-4 space-y-4 border border-zinc-300 dark:border-zinc-600">
            <div class="flex items-center justify-between">
                <h4 class="text-sm font-bold opacity-80">图标背景</h4>
                <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" bind:checked={iconBgEnabled} class="sr-only peer">
                    <div class="w-9 h-5 bg-zinc-300 dark:bg-zinc-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
                </label>
            </div>

            {#if iconBgEnabled}
                <div class="space-y-3 pt-2 border-t border-zinc-300 dark:border-zinc-600">
                    <div class="flex items-center justify-between flex-wrap gap-2">
                        <label class="text-xs opacity-60">背景颜色</label>
                        <div class="flex items-center gap-2">
                            <input type="text" bind:value={iconBgColor} class="px-2 py-1 text-xs rounded border border-zinc-300 dark:border-zinc-600 bg-transparent w-20 font-mono" />
                            <div class="relative w-6 h-6 rounded-full overflow-hidden border border-zinc-300 dark:border-zinc-600 shadow-sm shrink-0">
                                <input type="color" bind:value={iconBgColor} class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] p-0 m-0 border-0 cursor-pointer" />
                            </div>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div class="flex flex-col gap-1">
                            <div class="flex justify-between text-[10px] opacity-60">
                                <label>内边距</label>
                                <span>{iconBgPadding}px</span>
                            </div>
                            <input type="range" bind:value={iconBgPadding} min="0" max="100" class="w-full accent-blue-500 h-1" />
                        </div>
                        <div class="flex flex-col gap-1">
                            <div class="flex justify-between text-[10px] opacity-60">
                                <label>圆角半径</label>
                                <span>{iconBgRadius}%</span>
                            </div>
                            <input type="range" bind:value={iconBgRadius} min="0" max="50" class="w-full accent-blue-500 h-1" />
                        </div>
                        <div class="flex flex-col gap-1">
                            <div class="flex justify-between text-[10px] opacity-60">
                                <label>模糊</label>
                                <span>{iconBgBlur}px</span>
                            </div>
                            <input type="range" bind:value={iconBgBlur} min="0" max="20" class="w-full accent-blue-500 h-1" />
                        </div>
                        <div class="flex flex-col gap-1">
                            <div class="flex justify-between text-[10px] opacity-60">
                                <label>不透明度</label>
                                <span>{Math.round(iconBgOpacity * 100)}%</span>
                            </div>
                            <input type="range" bind:value={iconBgOpacity} min="0" max="1" step="0.01" class="w-full accent-blue-500 h-1" />
                        </div>
                    </div>
                </div>
            {/if}
        </div>

        <!-- Shadows -->
        <div class="rounded-lg p-4 space-y-4 border border-zinc-300 dark:border-zinc-600">
            <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-bold opacity-80">阴影设置</span>
                <div class="flex rounded-lg p-1 border border-zinc-300 dark:border-zinc-600">
                    {#each [
                        { id: 'both', icon: 'layers', label: '全部' },
                        { id: 'text', icon: 'title', label: '文字' },
                        { id: 'icon', icon: 'star', label: '图标' }
                    ] as target}
                        <button
                            class="p-1.5 rounded transition-all {shadowTarget === target.id ? 'bg-blue-500 text-white shadow-sm' : 'opacity-50 hover:opacity-100'}"
                            on:click={() => shadowTarget = target.id}
                            title={target.label}
                        >
                            {#if target.icon === 'layers'}
                                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 22 1.5 16.65l1.9-1.05 8.6 4.75 8.6-4.75 1.9 1.05L12 22Zm0-6.65L1.5 10l10.5-5.65L22.5 10 12 15.35Zm0-2.35 6.85-3.8L12 5.4 5.15 10.2 12 14Zm0-8.65Z"/></svg>
                            {:else if target.icon === 'title'}
                                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M5 21v-2h4v-9H6V8h12v2h-3v9h4v2H5Zm6-11V5h2v5h-2Z"/></svg>
                            {:else}
                                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="m5.825 22 2.325-7.6L2 10h7.6L12 2l2.4 8H22l-6.15 4.4 2.325 7.6-6.175-4.8L5.825 22Z"/></svg>
                            {/if}
                        </button>
                    {/each}
                </div>
            </div>

            <div class="text-sm font-bold flex items-center justify-between flex-wrap gap-2">
                <span class="text-xs opacity-60 font-normal">颜色 ({shadowTarget === 'both' ? '统一' : (shadowTarget === 'text' ? '仅文字' : '仅图标')})</span>
                <div class="flex items-center gap-2">
                    <input type="text" value={shadowTarget === 'icon' ? iconShadow.color : textShadow.color} on:input={(e) => updateShadow('color', e.currentTarget.value)} class="px-2 py-1 text-xs rounded border border-zinc-300 dark:border-zinc-600 bg-transparent w-20 font-mono" />
                    <div class="relative w-6 h-6 rounded-full overflow-hidden border border-zinc-300 dark:border-zinc-600 shadow-sm shrink-0">
                        <input type="color" value={shadowTarget === 'icon' ? iconShadow.color : textShadow.color} on:input={(e) => updateShadow('color', e.currentTarget.value)} class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] p-0 m-0 border-0 cursor-pointer" />
                    </div>
                </div>
            </div>
            
            <div class="grid grid-cols-3 gap-2">
                <div class="flex flex-col gap-1">
                    <label class="text-[10px] opacity-60 uppercase">模糊</label>
                    <input type="number" value={shadowTarget === 'icon' ? iconShadow.blur : textShadow.blur} on:input={(e) => updateShadow('blur', e.currentTarget.valueAsNumber)} class="px-1 py-1 text-sm rounded border border-zinc-300 dark:border-zinc-600 bg-transparent" />
                </div>
                <div class="flex flex-col gap-1">
                    <label class="text-[10px] opacity-60 uppercase">水平偏移</label>
                    <input type="number" value={shadowTarget === 'icon' ? iconShadow.x : textShadow.x} on:input={(e) => updateShadow('x', e.currentTarget.valueAsNumber)} class="px-1 py-1 text-sm rounded border border-zinc-300 dark:border-zinc-600 bg-transparent" />
                </div>
                <div class="flex flex-col gap-1">
                    <label class="text-[10px] opacity-60 uppercase">垂直偏移</label>
                    <input type="number" value={shadowTarget === 'icon' ? iconShadow.y : textShadow.y} on:input={(e) => updateShadow('y', e.currentTarget.valueAsNumber)} class="px-1 py-1 text-sm rounded border border-zinc-300 dark:border-zinc-600 bg-transparent" />
                </div>
                <div class="col-span-3 flex flex-col gap-1 mt-1">
                    <div class="flex justify-between text-[10px] opacity-60 uppercase">
                        <label>不透明度</label>
                        <span>{Math.round((shadowTarget === 'icon' ? iconShadow.alpha : textShadow.alpha) * 100)}%</span>
                    </div>
                    <input type="range" value={shadowTarget === 'icon' ? iconShadow.alpha : textShadow.alpha} on:input={(e) => updateShadow('alpha', parseFloat(e.currentTarget.value))} min="0" max="1" step="0.01" class="w-full accent-blue-500 h-1" />
                </div>
            </div>
        </div>

        <!-- Ratios -->
        <div class="flex flex-col gap-3">
            <label class="text-sm font-bold opacity-80">画板比例 (多选)</label>
            <div class="grid grid-cols-2 gap-2">
                {#each ratios as ratio}
                    <label class="flex items-center gap-2 p-2 border border-zinc-300 dark:border-zinc-600 rounded-lg cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors select-none">
                        <input type="checkbox" bind:checked={ratio.checked} class="accent-blue-500 w-4 h-4" />
                        <span class="text-sm font-mono">{ratio.label}</span>
                    </label>
                {/each}
            </div>
        </div>

        <!-- Export -->
        <div class="rounded-lg p-4 space-y-4 border border-zinc-300 dark:border-zinc-600">
            <h4 class="text-sm font-bold opacity-80">导出设置</h4>
            
            <div class="space-y-3">
                <div class="flex flex-col gap-1">
                    <label class="text-xs opacity-60">文件名</label>
                    <input type="text" bind:value={exportConfig.filename} class="w-full px-3 py-1 text-sm rounded border border-zinc-300 dark:border-zinc-600 bg-transparent" />
                </div>

                <div class="flex flex-col gap-1">
                    <label class="text-xs opacity-60">格式</label>
                    <div class="flex gap-2">
                        <label class="flex-1 flex items-center justify-center gap-1 p-2 border rounded-lg cursor-pointer transition-all text-xs {exportConfig.format === 'png' ? 'border-blue-500 bg-blue-500/5 text-blue-600 dark:text-blue-400' : 'border-zinc-300 dark:border-zinc-600 bg-transparent'}">
                            <input type="radio" bind:group={exportConfig.format} value="png" class="hidden" />
                            <span class="font-bold">PNG</span>
                        </label>
                        <label class="flex-1 flex items-center justify-center gap-1 p-2 border rounded-lg cursor-pointer transition-all text-xs {exportConfig.format === 'svg' ? 'border-blue-500 bg-blue-500/5 text-blue-600 dark:text-blue-400' : 'border-zinc-300 dark:border-zinc-600 bg-transparent'}">
                            <input type="radio" bind:group={exportConfig.format} value="svg" class="hidden" />
                            <span class="font-bold">SVG</span>
                        </label>
                    </div>
                </div>

                {#if exportConfig.format === 'png'}
                    <div class="flex flex-col gap-1">
                        <div class="flex justify-between text-xs opacity-60">
                            <label>缩放倍率</label>
                        </div>
                        <div class="grid grid-cols-4 gap-1">
                            {#each [1, 2, 3, 4] as scale}
                                <label class="flex items-center justify-center gap-1 p-1 border rounded cursor-pointer transition-all text-xs {exportConfig.scales.includes(scale) ? 'border-blue-500 bg-blue-500/5 text-blue-600 dark:text-blue-400' : 'border-zinc-300 dark:border-zinc-600 bg-transparent'}">
                                    <input 
                                        type="checkbox" 
                                        class="hidden" 
                                        checked={exportConfig.scales.includes(scale)} 
                                        on:change={(e) => {
                                            if (e.currentTarget.checked) {
                                                exportConfig.scales = [...exportConfig.scales, scale].sort();
                                            } else {
                                                exportConfig.scales = exportConfig.scales.filter(s => s !== scale);
                                            }
                                        }}
                                    />
                                    <span class="font-mono font-bold">{scale}x</span>
                                </label>
                            {/each}
                        </div>
                        <p class="text-[10px] opacity-60 text-right mt-0.5">
                            {Math.round(canvasWidth)}x{Math.round(canvasHeight)} px
                        </p>
                    </div>
                {/if}

                <label class="flex items-center justify-between p-2 rounded border border-zinc-300 dark:border-zinc-600 cursor-pointer">
                    <span class="text-xs font-bold opacity-80">背景透明</span>
                    <input type="checkbox" bind:checked={exportConfig.transparentBg} class="accent-blue-500 w-4 h-4" />
                </label>

                <div class="flex flex-col gap-1">
                    <div class="flex justify-between text-xs opacity-60">
                        <label>导出尺寸 (可多选)</label>
                    </div>
                    <div class="grid grid-cols-4 gap-1">
                        {#each activeRatios.length === 0 ? [] : (activeRatios.length === 1 ? [] : ratios) as ratio}
                            {#if activeRatios.find(r => r.label === ratio.label)}
                                <label class="flex items-center justify-center gap-1 p-1 border rounded cursor-pointer transition-all text-xs {exportConfig.exportRatios.includes(ratio.label) ? 'border-blue-500 bg-blue-500/5 text-blue-600 dark:text-blue-400' : 'border-zinc-300 dark:border-zinc-600 bg-transparent'}">
                                    <input 
                                        type="checkbox" 
                                        class="hidden" 
                                        checked={exportConfig.exportRatios.includes(ratio.label)} 
                                        on:change={(e) => {
                                            if (e.currentTarget.checked) {
                                                exportConfig.exportRatios = [...exportConfig.exportRatios, ratio.label];
                                            } else {
                                                exportConfig.exportRatios = exportConfig.exportRatios.filter(r => r !== ratio.label);
                                            }
                                        }}
                                    />
                                    <span class="font-mono font-bold">{ratio.label}</span>
                                </label>
                            {/if}
                        {/each}
                    </div>
                    {#if activeRatios.length === 0}
                        <p class="text-[10px] text-red-500 text-left mt-0.5 font-bold">
                            请至少选择一个画板比例以进行导出
                        </p>
                    {:else if activeRatios.length === 1}
                        <p class="text-[10px] opacity-60 text-left mt-0.5">
                            当前仅预览 {activeRatios[0].label}，将导出此尺寸
                        </p>
                    {:else}
                        <p class="text-[10px] opacity-60 text-right mt-0.5">
                            不选默认导出预览选中比例
                        </p>
                    {/if}
                </div>
            </div>

            <button 
                on:click={doExport} 
                disabled={activeRatios.length === 0}
                class="w-full px-4 py-3 bg-blue-600 dark:bg-blue-500 text-white hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:brightness-100 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/30 text-sm flex items-center justify-center gap-2 mt-2"
            >
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M6 20q-.825 0-1.413-.587Q4 18.825 4 18v-3h2v3h12v-3h2v3q0 .825-.587 1.413Q18.825 20 18 20H6Zm6-4-5-5 1.4-1.45 2.6 2.6V4h2v8.15l2.6-2.6L17 11l-5 5Z"/></svg>
                导出图片
            </button>
        </div>
    </div>
  </div>
</div>

<style>
    .icon-svg-box {
        width: 100%;
        height: 100%;
        aspect-ratio: 1 / 1;
    }
    .icon-svg-box :global(svg) {
        width: 100% !important;
        height: 100% !important;
        display: block;
    }
</style>
