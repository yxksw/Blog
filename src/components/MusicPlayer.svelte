<script lang="ts">
  import Icon from "@iconify/svelte";
  import { onDestroy, onMount } from "svelte";
  import { slide } from "svelte/transition";

  // Meting API 配置
const meting_api = "https://meting2.050815.xyz/api?server=netease&type=playlist&id=13681647281&r=";

// localStorage 存储键
const STORAGE_KEY_VOLUME = 'music-player-volume';
const STORAGE_KEY_PLAYING = 'music-player-playing';
const STORAGE_KEY_CURRENT_TIME = 'music-player-current-time';
const STORAGE_KEY_CURRENT_INDEX = 'music-player-current-index';
const STORAGE_KEY_CURRENT_SONG = 'music-player-current-song';

// 播放状态
let isPlaying = false;
let isExpanded = false;
let isHidden = false;
let showPlaylist = false;
let currentTime = 0;
let duration = 0;

let volume = 0.7;
let isMuted = false;
let isLoading = false;
let isShuffled = false;
let isRepeating = 0;
let errorMessage = "";
let showError = false;

// 当前歌曲信息
let currentSong = {
	title: "未播放",
	artist: "",
	cover: "/favicon.ico",
	url: "",
	duration: 0,
};

type Song = {
	id: number;
	title: string;
	artist: string;
	cover: string;
	url: string;
	duration: number;
};

let playlist: Song[] = [];
let currentIndex = 0;
let audio: HTMLAudioElement;
let progressBar: HTMLElement;
let volumeBar: HTMLElement;

// 从localStorage加载设置
function loadSettings() {
	try {
		if (typeof localStorage !== 'undefined') {
			// 加载音量
			const savedVolume = localStorage.getItem(STORAGE_KEY_VOLUME);
			if (savedVolume !== null && !isNaN(parseFloat(savedVolume))) {
				volume = parseFloat(savedVolume);
			}
			
			// 加载播放状态
			const savedPlaying = localStorage.getItem(STORAGE_KEY_PLAYING);
			if (savedPlaying !== null) {
				isPlaying = savedPlaying === 'true';
			}
			
			// 加载当前时间
			const savedTime = localStorage.getItem(STORAGE_KEY_CURRENT_TIME);
			if (savedTime !== null && !isNaN(parseFloat(savedTime))) {
				currentTime = parseFloat(savedTime);
			}
			
			// 加载当前歌曲索引
			const savedIndex = localStorage.getItem(STORAGE_KEY_CURRENT_INDEX);
			if (savedIndex !== null && !isNaN(parseInt(savedIndex))) {
				currentIndex = parseInt(savedIndex);
			}
			
			// 加载当前歌曲信息
			const savedSong = localStorage.getItem(STORAGE_KEY_CURRENT_SONG);
			if (savedSong !== null) {
				const song = JSON.parse(savedSong);
				currentSong = { ...currentSong, ...song };
			}
			
		}
	} catch (e) {
		// 静默处理 localStorage 错误
	}
}

// 保存设置到localStorage
function saveSettings() {
	try {
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem(STORAGE_KEY_VOLUME, volume.toString());
			localStorage.setItem(STORAGE_KEY_PLAYING, isPlaying.toString());
			localStorage.setItem(STORAGE_KEY_CURRENT_TIME, currentTime.toString());
			localStorage.setItem(STORAGE_KEY_CURRENT_INDEX, currentIndex.toString());
			localStorage.setItem(STORAGE_KEY_CURRENT_SONG, JSON.stringify({
				title: currentSong.title,
				artist: currentSong.artist,
				cover: currentSong.cover,
				url: currentSong.url,
				duration: currentSong.duration
			}));
		}
	} catch (e) {
		// 静默处理 localStorage 错误
	}
}

// 保存音量设置
function saveVolumeSettings() {
	saveSettings();
}

async function fetchMetingPlaylist() {
	isLoading = true;
	const apiUrl = meting_api + Date.now();
	try {
		const res = await fetch(apiUrl);
		if (!res.ok) throw new Error("meting api error");
		const list = await res.json();
		playlist = list.map((song: any) => {
			let title = song.name ?? song.title ?? "未知歌曲";
			let artist = song.artist ?? song.author ?? "未知艺术家";
			let dur = song.duration ?? 0;
			if (dur > 10000) dur = Math.floor(dur / 1000);
			if (!Number.isFinite(dur) || dur <= 0) dur = 0;
			return {
				id: song.id,
				title,
				artist,
				cover: song.pic ?? "/favicon.ico",
				url: song.url ?? "",
				duration: dur,
			};
		});
		if (playlist.length > 0) {
			loadSong(playlist[0]);
		}
		isLoading = false;
	} catch (e) {
		showErrorMessage("加载播放列表失败");
		isLoading = false;
	}
}

function togglePlay() {
	if (!audio || !currentSong.url) return;
	if (isPlaying) {
		audio.pause();
		isPlaying = false;
	} else {
		audio.play().catch(() => {});
		isPlaying = true;
	}
	// 保存播放状态
	saveSettings();
}

function toggleExpanded() {
	isExpanded = !isExpanded;
	if (isExpanded) {
		showPlaylist = false;
		isHidden = false;
	}
}

function toggleHidden() {
	isHidden = !isHidden;
	if (isHidden) {
		isExpanded = false;
		showPlaylist = false;
	}
}

function togglePlaylist() {
	showPlaylist = !showPlaylist;
}

function toggleShuffle() {
	isShuffled = !isShuffled;
	if (isShuffled) {
		isRepeating = 0;
	}
	saveSettings();
}

function toggleRepeat() {
	isRepeating = (isRepeating + 1) % 3;
	if (isRepeating !== 0) {
		isShuffled = false;
	}
	saveSettings();
}

function previousSong() {
	if (playlist.length <= 1) return;
	const newIndex = currentIndex > 0 ? currentIndex - 1 : playlist.length - 1;
	playSong(newIndex);
}

function nextSong(autoPlay: boolean = true) {
	if (playlist.length <= 1) return;
	
	let newIndex: number;
	if (isShuffled) {
		do {
			newIndex = Math.floor(Math.random() * playlist.length);
		} while (newIndex === currentIndex && playlist.length > 1);
	} else {
		newIndex = currentIndex < playlist.length - 1 ? currentIndex + 1 : 0;
	}
	playSong(newIndex, autoPlay);
}

// 记录切歌时的播放意图
let willAutoPlay = false;

function playSong(index: number, autoPlay = true) {
	if (index < 0 || index >= playlist.length) return;
	
	willAutoPlay = autoPlay;
	currentIndex = index;
	loadSong(playlist[currentIndex]);
	// 保存当前歌曲索引
	saveSettings();
}

function getAssetPath(path: string): string {
	if (path.startsWith("http://") || path.startsWith("https://")) return path;
	if (path.startsWith("/")) return path;
	return `/${path}`;
}

function loadSong(song: typeof currentSong) {
	if (!song) return;
	if (song.url !== currentSong.url) {
		currentSong = { ...song };
		if (song.url) {
			isLoading = true;
		} else {
			isLoading = false;
		}
	}
}

// 标记是否因浏览器策略导致自动播放失败
let autoplayFailed = false;

function handleLoadSuccess() {
	isLoading = false;
	if (audio?.duration && audio.duration > 1) {
		duration = Math.floor(audio.duration);
		if (playlist[currentIndex]) playlist[currentIndex].duration = duration;
		currentSong.duration = duration;
	}
	
	// 恢复之前保存的播放位置
	if (currentTime > 0 && audio) {
		audio.currentTime = currentTime;
	}

	if (willAutoPlay || isPlaying) {
		const playPromise = audio.play();
		if (playPromise !== undefined) {
			playPromise.catch(() => {
				autoplayFailed = true;
				isPlaying = false;
			});
		}
	}
}

function handleUserInteraction() {
	if (autoplayFailed && audio) {
		const playPromise = audio.play();
		if (playPromise !== undefined) {
			playPromise.then(() => {
				autoplayFailed = false;
			}).catch(() => {});
		}
	}
}

function handleLoadError(_event: Event) {
	if (!currentSong.url) return;
	isLoading = false;
	showErrorMessage("歌曲加载失败");
	
	const shouldContinue = isPlaying || willAutoPlay;
	if (playlist.length > 1) {
		setTimeout(() => nextSong(shouldContinue), 1000);
	}
}

function handleLoadStart() {}

function handleAudioEnded() {
	if (isRepeating === 1) {
		audio.currentTime = 0;
		audio.play().catch(() => {});
	} else if (isRepeating === 2 || isShuffled) {
		nextSong(true);
	} else {
		isPlaying = false;
	}
}

function showErrorMessage(message: string) {
	errorMessage = message;
	showError = true;
	setTimeout(() => {
		showError = false;
	}, 3000);
}

function hideError() {
	showError = false;
}

function setProgress(event: MouseEvent) {
	if (!audio || !progressBar) return;
	const rect = progressBar.getBoundingClientRect();
	const percent = (event.clientX - rect.left) / rect.width;
	const newTime = percent * duration;
	audio.currentTime = newTime;
	currentTime = newTime;
}

let isVolumeDragging = false;
let isPointerDown = false;
let volumeBarRect: DOMRect | null = null;
let rafId: number | null = null;

function startVolumeDrag(event: PointerEvent) {
	if (!volumeBar) return;
	event.preventDefault();
	
	isPointerDown = true;
	volumeBar.setPointerCapture(event.pointerId);

	volumeBarRect = volumeBar.getBoundingClientRect();
	updateVolumeLogic(event.clientX);
}

function handleVolumeMove(event: PointerEvent) {
	if (!isPointerDown) return;
	event.preventDefault();

	isVolumeDragging = true;
	if (rafId) return;

	rafId = requestAnimationFrame(() => {
		updateVolumeLogic(event.clientX);
		rafId = null;
	});
}

function stopVolumeDrag(event: PointerEvent) {
	if (!isPointerDown) return;
	isPointerDown = false;
	isVolumeDragging = false;
	volumeBarRect = null;
	if (volumeBar) {
		volumeBar.releasePointerCapture(event.pointerId);
	}

	if (rafId) {
		cancelAnimationFrame(rafId);
		rafId = null;
	}
	saveVolumeSettings();
}

function updateVolumeLogic(clientX: number) {
	if (!audio || !volumeBar) return;

	const rect = volumeBarRect || volumeBar.getBoundingClientRect();
	const percent = Math.max(
		0,
		Math.min(1, (clientX - rect.left) / rect.width),
	);
	volume = percent;
}

function toggleMute() {
	isMuted = !isMuted;
}

function formatTime(seconds: number): string {
	if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
	const mins = Math.floor(seconds / 60);
	const secs = Math.floor(seconds % 60);
	return `${mins}:${secs.toString().padStart(2, "0")}`;
}

const interactionEvents = ['click', 'keydown', 'touchstart'];

// 定期保存播放状态
let saveInterval: ReturnType<typeof setInterval> | null = null;

// 处理页面切换前保存状态
function handleBeforeSwap() {
	if (audio) {
		currentTime = audio.currentTime;
	}
	saveSettings();
}

// 处理页面切换后恢复状态
function handleAfterSwap() {
	// 状态会通过 loadSettings 自动恢复
	if (audio && currentTime > 0) {
		audio.currentTime = currentTime;
	}
}

onMount(() => {
	// 先加载保存的设置
	loadSettings();
	
	interactionEvents.forEach(event => {
		document.addEventListener(event, handleUserInteraction, { capture: true });
	});
	
	// 监听 Astro 页面切换事件
	if (typeof document !== 'undefined') {
		document.addEventListener('astro:before-swap', handleBeforeSwap);
		document.addEventListener('astro:after-swap', handleAfterSwap);
	}

	// 加载播放列表
	fetchMetingPlaylist().then(() => {
		// 播放列表加载后，如果有保存的歌曲，尝试恢复
		if (currentSong.url && playlist.length > 0) {
			const savedIndex = playlist.findIndex(s => s.url === currentSong.url);
			if (savedIndex !== -1) {
				currentIndex = savedIndex;
				loadSong(playlist[currentIndex]);
			}
		}
	});
	
	// 定期保存播放状态（每5秒）
	saveInterval = setInterval(() => {
		if (isPlaying && audio) {
			currentTime = audio.currentTime;
			saveSettings();
		}
	}, 5000);
});

onDestroy(() => {
	// 保存最终状态
	saveSettings();
	
	if (saveInterval) {
		clearInterval(saveInterval);
	}
	
	if (typeof document !== 'undefined') {
		interactionEvents.forEach(event => {
			document.removeEventListener(event, handleUserInteraction, { capture: true });
		});
		document.removeEventListener('astro:before-swap', handleBeforeSwap);
		document.removeEventListener('astro:after-swap', handleAfterSwap);
	}
});
</script>

<audio
	bind:this={audio}
	src={getAssetPath(currentSong.url)}
	bind:volume
	bind:muted={isMuted}
	on:play={() => { isPlaying = true; saveSettings(); }}
	on:pause={() => { isPlaying = false; saveSettings(); }}
	on:timeupdate={() => { currentTime = audio.currentTime; }}
	on:ended={handleAudioEnded}
	on:error={handleLoadError}
	on:loadeddata={handleLoadSuccess}
	on:loadstart={handleLoadStart}
	preload="auto"
></audio>

<svelte:window 
	on:pointermove={handleVolumeMove} 
	on:pointerup={stopVolumeDrag} 
/>

{#if showError}
<div class="fixed bottom-20 right-4 z-[60] max-w-sm">
	<div class="bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-slide-up">
		<Icon icon="material-symbols:error" class="text-xl shrink-0" />
		<span class="text-sm flex-1">{errorMessage}</span>
		<button on:click={hideError} class="text-white/80 hover:text-white transition-colors">
			<Icon icon="material-symbols:close" class="text-lg" />
		</button>
	</div>
</div>
{/if}

<div class="music-player fixed bottom-4 right-4 z-50 transition-all duration-300 ease-in-out"
	 class:expanded={isExpanded}
	 class:hidden-mode={isHidden}>

	<!-- 隐藏状态的小圆球 -->
	<div class="orb-player w-12 h-12 bg-blue-500 rounded-full shadow-lg cursor-pointer transition-all duration-500 ease-in-out flex items-center justify-center hover:scale-110 active:scale-95"
		 class:opacity-0={!isHidden}
		 class:scale-0={!isHidden}
		 class:pointer-events-none={!isHidden}
		 on:click={toggleHidden}
		 on:keydown={(e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				toggleHidden();
			}
		 }}
		 role="button"
		 tabindex="0"
		 aria-label="显示播放器">
		{#if isLoading}
			<Icon icon="eos-icons:loading" class="text-white text-lg" />
		{:else if isPlaying}
			<div class="flex space-x-0.5">
				<div class="w-0.5 h-3 bg-white rounded-full animate-pulse"></div>
				<div class="w-0.5 h-4 bg-white rounded-full animate-pulse" style="animation-delay: 150ms;"></div>
				<div class="w-0.5 h-2 bg-white rounded-full animate-pulse" style="animation-delay: 300ms;"></div>
			</div>
		{:else}
			<Icon icon="material-symbols:music-note" class="text-white text-lg" />
		{/if}
	</div>

	<!-- 收缩状态的迷你播放器 -->
	<div class="mini-player bg-white dark:bg-zinc-800 shadow-xl rounded-2xl p-3 transition-all duration-500 ease-in-out"
		 class:opacity-0={isExpanded || isHidden}
		 class:scale-95={isExpanded || isHidden}
		 class:pointer-events-none={isExpanded || isHidden}>
		<div class="flex items-center gap-3">
			<!-- 封面区域 -->
			<div class="cover-container relative w-12 h-12 rounded-full overflow-hidden cursor-pointer"
				 on:click={togglePlay}
				 on:keydown={(e) => {
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						togglePlay();
					}
				 }}
				 role="button"
				 tabindex="0"
				 aria-label={isPlaying ? "暂停" : "播放"}>
				<img src={getAssetPath(currentSong.cover)} alt="封面"
					 class="w-full h-full object-cover transition-transform duration-300"
					 class:spinning={isPlaying && !isLoading}
					 class:animate-pulse={isLoading} />
				<div class="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
					{#if isLoading}
						<Icon icon="eos-icons:loading" class="text-white text-xl" />
					{:else if isPlaying}
						<Icon icon="material-symbols:pause" class="text-white text-xl" />
					{:else}
						<Icon icon="material-symbols:play-arrow" class="text-white text-xl" />
					{/if}
				</div>
			</div>
			<!-- 歌曲信息区域 -->
			<div class="flex-1 min-w-0 cursor-pointer"
				 on:click={toggleExpanded}
				 on:keydown={(e) => {
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						toggleExpanded();
					}
				 }}
				 role="button"
				 tabindex="0"
				 aria-label="展开播放器">
				<div class="text-sm font-medium text-zinc-900 dark:text-white truncate">{currentSong.title}</div>
				<div class="text-xs text-zinc-500 dark:text-zinc-400 truncate">{currentSong.artist}</div>
			</div>
			<div class="flex items-center gap-1">
				<button class="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
						on:click|stopPropagation={toggleHidden}
						title="隐藏">
					<Icon icon="material-symbols:visibility-off" class="text-lg text-zinc-600 dark:text-zinc-300" />
				</button>
				<button class="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
						on:click|stopPropagation={toggleExpanded}>
					<Icon icon="material-symbols:expand-less" class="text-lg text-zinc-600 dark:text-zinc-300" />
				</button>
			</div>
		</div>
	</div>

	<!-- 展开状态的完整播放器 -->
	<div class="expanded-player bg-white dark:bg-zinc-800 shadow-xl rounded-2xl p-4 transition-all duration-500 ease-in-out"
		 class:opacity-0={!isExpanded}
		 class:scale-95={!isExpanded}
		 class:pointer-events-none={!isExpanded}>
		<div class="flex items-center gap-4 mb-4">
			<div class="cover-container relative w-16 h-16 rounded-full overflow-hidden shrink-0">
				<img src={getAssetPath(currentSong.cover)} alt="封面"
					 class="w-full h-full object-cover transition-transform duration-300"
					 class:spinning={isPlaying && !isLoading}
					 class:animate-pulse={isLoading} />
			</div>
			<div class="flex-1 min-w-0">
				<div class="text-lg font-bold text-zinc-900 dark:text-white truncate mb-1">{currentSong.title}</div>
				<div class="text-sm text-zinc-500 dark:text-zinc-400 truncate">{currentSong.artist}</div>
				<div class="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
					{formatTime(currentTime)} / {formatTime(duration)}
				</div>
			</div>
			<div class="flex items-center gap-1">
				<button class="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
						on:click={toggleHidden}
						title="隐藏">
					<Icon icon="material-symbols:visibility-off" class="text-lg text-zinc-600 dark:text-zinc-300" />
				</button>
				<button class="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
						class:text-blue-500={showPlaylist}
						on:click={togglePlaylist}
						title="播放列表">
					<Icon icon="material-symbols:queue-music" class="text-lg" />
				</button>
			</div>
		</div>

		<!-- 进度条 -->
		<div class="progress-section mb-4">
			<div class="progress-bar flex-1 h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full cursor-pointer"
				 bind:this={progressBar}
				 on:click={setProgress}
				 on:keydown={(e) => {
					 if (e.key === 'Enter' || e.key === ' ') {
						 e.preventDefault();
						 const percent = 0.5;
						 const newTime = percent * duration;
						 if (audio) {
							 audio.currentTime = newTime;
							 currentTime = newTime;
						 }
					 }
				 }}
				 role="slider"
				 tabindex="0"
				 aria-label="进度"
				 aria-valuemin="0"
				 aria-valuemax="100"
				 aria-valuenow={duration > 0 ? (currentTime / duration * 100) : 0}>
				<div class="h-full bg-blue-500 rounded-full transition-all duration-100"
					 style="width: {duration > 0 ? (currentTime / duration) * 100 : 0}%"></div>
			</div>
		</div>

		<!-- 控制按钮 -->
		<div class="controls flex items-center justify-center gap-2 mb-4">
			<button class="w-10 h-10 rounded-lg flex items-center justify-center transition-colors"
					class:bg-blue-100={isShuffled}
					class:dark:bg-blue-900={isShuffled}
					class:text-blue-500={isShuffled}
					class:hover:bg-zinc-100={!isShuffled}
					class:dark:hover:bg-zinc-700={!isShuffled}
					on:click={toggleShuffle}
					disabled={playlist.length <= 1}>
				<Icon icon="material-symbols:shuffle" class="text-lg" />
			</button>
			<button class="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
					on:click={previousSong}
					disabled={playlist.length <= 1}>
				<Icon icon="material-symbols:skip-previous" class="text-xl" />
			</button>
			<button class="w-12 h-12 rounded-full bg-blue-500 text-white flex items-center justify-center hover:bg-blue-600 transition-colors"
					class:opacity-50={isLoading}
					disabled={isLoading}
					on:click={togglePlay}>
				{#if isLoading}
					<Icon icon="eos-icons:loading" class="text-xl" />
				{:else if isPlaying}
					<Icon icon="material-symbols:pause" class="text-xl" />
				{:else}
					<Icon icon="material-symbols:play-arrow" class="text-xl" />
				{/if}
			</button>
			<button class="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
					on:click={() => nextSong()}
					disabled={playlist.length <= 1}>
				<Icon icon="material-symbols:skip-next" class="text-xl" />
			</button>
			<button class="w-10 h-10 rounded-lg flex items-center justify-center transition-colors"
					class:bg-blue-100={isRepeating > 0}
					class:dark:bg-blue-900={isRepeating > 0}
					class:text-blue-500={isRepeating > 0}
					class:hover:bg-zinc-100={isRepeating === 0}
					class:dark:hover:bg-zinc-700={isRepeating === 0}
					on:click={toggleRepeat}>
				{#if isRepeating === 1}
					<Icon icon="material-symbols:repeat-one" class="text-lg" />
				{:else if isRepeating === 2}
					<Icon icon="material-symbols:repeat" class="text-lg" />
				{:else}
					<Icon icon="material-symbols:repeat" class="text-lg opacity-50" />
				{/if}
			</button>
		</div>

		<!-- 音量控制 -->
		<div class="bottom-controls flex items-center gap-2">
			<button class="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
					on:click={toggleMute}>
				{#if isMuted || volume === 0}
					<Icon icon="material-symbols:volume-off" class="text-lg" />
				{:else if volume < 0.5}
					<Icon icon="material-symbols:volume-down" class="text-lg" />
				{:else}
					<Icon icon="material-symbols:volume-up" class="text-lg" />
				{/if}
			</button>
			<div class="flex-1 h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full cursor-pointer touch-none"
				 bind:this={volumeBar}
				 on:pointerdown={startVolumeDrag}
				 on:keydown={(e) => {
					 if (e.key === 'Enter' || e.key === ' ') {
						 e.preventDefault();
						 if (e.key === 'Enter') toggleMute();
					 }
				 }}
				 role="slider"
				 tabindex="0"
				 aria-label="音量"
				 aria-valuemin="0"
				 aria-valuemax="100"
				 aria-valuenow={volume * 100}>
				<div class="h-full bg-blue-500 rounded-full transition-all"
					 class:duration-100={!isVolumeDragging}
					 class:duration-0={isVolumeDragging}
					 style="width: {volume * 100}%"></div>
			</div>
			<button class="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
					on:click={toggleExpanded}
					title="收起">
				<Icon icon="material-symbols:expand-more" class="text-lg" />
			</button>
		</div>
	</div>

	<!-- 播放列表 -->
	{#if showPlaylist}
		<div class="playlist-panel fixed bottom-20 right-4 w-80 max-h-96 bg-white dark:bg-zinc-800 shadow-xl rounded-2xl overflow-hidden z-50"
			 transition:slide={{ duration: 300, axis: 'y' }}>
			<div class="playlist-header flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-700">
				<h3 class="text-lg font-semibold text-zinc-900 dark:text-white">播放列表</h3>
				<button class="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
						on:click={togglePlaylist}>
					<Icon icon="material-symbols:close" class="text-lg" />
				</button>
			</div>
			<div class="playlist-content overflow-y-auto max-h-80">
				{#each playlist as song, index}
					<div class="playlist-item flex items-center gap-3 p-3 hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer transition-colors"
						 class:bg-blue-50={index === currentIndex}
						 class:dark:bg-blue-900={index === currentIndex}
						 class:text-blue-500={index === currentIndex}
						 on:click={() => playSong(index)}
						 on:keydown={(e) => {
							 if (e.key === 'Enter' || e.key === ' ') {
								 e.preventDefault();
								 playSong(index);
							 }
						 }}
						 role="button"
						 tabindex="0"
						 aria-label="播放 {song.title} - {song.artist}">
						<div class="w-6 h-6 flex items-center justify-center">
							{#if index === currentIndex && isPlaying}
								<Icon icon="material-symbols:graphic-eq" class="text-blue-500 animate-pulse" />
							{:else if index === currentIndex}
								<Icon icon="material-symbols:pause" class="text-blue-500" />
							{:else}
								<span class="text-sm text-zinc-400">{index + 1}</span>
							{/if}
						</div>
						<div class="w-10 h-10 rounded-lg overflow-hidden bg-zinc-200 dark:bg-zinc-700 shrink-0">
							<img src={getAssetPath(song.cover)} alt={song.title} loading="lazy" class="w-full h-full object-cover" />
						</div>
						<div class="flex-1 min-w-0">
							<div class="font-medium truncate" class:text-blue-500={index === currentIndex} class:text-zinc-900={index !== currentIndex} class:dark:text-white={index !== currentIndex}>
								{song.title}
							</div>
							<div class="text-sm text-zinc-500 truncate" class:text-blue-400={index === currentIndex}>
								{song.artist}
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
.orb-player {
	position: relative;
	backdrop-filter: blur(10px);
	-webkit-backdrop-filter: blur(10px);
}
.orb-player::before {
	content: '';
	position: absolute;
	inset: -0.125rem;
	background: linear-gradient(45deg, #3b82f6, transparent, #3b82f6);
	border-radius: 50%;
	z-index: -1;
	opacity: 0;
	transition: opacity 0.3s ease;
}
.orb-player:hover::before {
	opacity: 0.3;
	animation: rotate 2s linear infinite;
}
.orb-player .animate-pulse {
	animation: musicWave 1.5s ease-in-out infinite;
}
@keyframes rotate {
	from { transform: rotate(0deg); }
	to { transform: rotate(360deg); }
}
@keyframes musicWave {
	0%, 100% { transform: scaleY(0.5); }
	50% { transform: scaleY(1); }
}
.music-player.hidden-mode {
	width: 3rem;
	height: 3rem;
}
.music-player {
	max-width: 20rem;
	user-select: none;
}
.mini-player {
	width: 17.5rem;
	position: absolute;
	bottom: 0;
	right: 0;
}
.expanded-player {
	width: 20rem;
	position: absolute;
	bottom: 0;
	right: 0;
}

.animate-pulse {
	animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
@keyframes pulse {
	0%, 100% {
		opacity: 1;
	}
	50% {
		opacity: 0.5;
	}
}
.progress-section div:hover,
.bottom-controls > div:hover {
	transform: scaleY(1.2);
	transition: transform 0.2s ease;
}
@media (max-width: 768px) {
	.music-player {
		max-width: 280px !important;
		bottom: 0.5rem !important;
		right: 0.5rem !important;
	}
	.mini-player {
		width: 280px;
	}
	.music-player.expanded {
		width: calc(100vw - 16px);
		max-width: none;
		right: 0.5rem !important;
	}
	.playlist-panel {
		width: calc(100vw - 16px) !important;
		right: 0.5rem !important;
		max-width: none;
	}
	.controls {
		gap: 8px;
	}
	.controls button {
		width: 36px;
		height: 36px;
	}
	.controls button:nth-child(3) {
		width: 44px;
		height: 44px;
	}
}
@media (max-width: 480px) {
	.music-player {
		max-width: 260px;
	}
	.controls {
		gap: 6px;
		margin-bottom: 12px;
	}
	.controls button {
		width: 32px;
		height: 32px;
	}
	.controls button:nth-child(3) {
		width: 40px;
		height: 40px;
	}
	.playlist-item {
		padding: 8px 12px;
	}
	.playlist-item .w-10 {
		width: 32px;
		height: 32px;
	}
}
@keyframes slide-up {
	from {
		transform: translateY(100%);
		opacity: 0;
	}
	to {
		transform: translateY(0);
		opacity: 1;
	}
}
.animate-slide-up {
	animation: slide-up 0.3s ease-out;
}
@media (hover: none) and (pointer: coarse) {
	.music-player button,
	.playlist-item {
		min-height: 44px;
	}
	.progress-section > div,
	.bottom-controls > div:nth-child(2) {
		height: 12px;
	}
}

/* 封面旋转动画 */
.cover-container img {
	animation: spin-continuous 3s linear infinite;
	animation-play-state: paused;
}

.cover-container img.spinning {
	animation-play-state: running;
}

@keyframes spin-continuous {
	from {
		transform: rotate(0deg);
	}
	to {
		transform: rotate(360deg);
	}
}

/* 滚动条隐藏 */
.playlist-content {
	scrollbar-width: thin;
	scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
}
.playlist-content::-webkit-scrollbar {
	width: 6px;
}
.playlist-content::-webkit-scrollbar-track {
	background: transparent;
}
.playlist-content::-webkit-scrollbar-thumb {
	background: rgba(156, 163, 175, 0.5);
	border-radius: 3px;
}
</style>
