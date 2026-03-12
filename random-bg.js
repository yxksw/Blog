/**
 * Random Background Image Loader
 * Based on Static_RandomPicAPI - https://github.com/afoim/Static_RandomPicAPI
 * API: https://img.050815.xyz/
 *
 * Features:
 * - Responsive: Mobile uses vertical images, desktop uses horizontal
 * - Session persistence: Same image during a session
 * - Preloading: Prevents flash of blank background
 * - Astro View Transitions support
 * - Dark overlay for better text readability
 */
(function() {
    "use strict";

    const API_BASE = "https://img.050815.xyz";
    const STORAGE_KEY = "blog_bg_image_url";
    const SESSION_KEY = "blog_bg_session";

    // Generate a session ID (persists until page is closed)
    function getSessionId() {
        let sessionId = sessionStorage.getItem(SESSION_KEY);
        if (!sessionId) {
            sessionId = "sess_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem(SESSION_KEY, sessionId);
        }
        return sessionId;
    }

    // Get random image index
    function getRandomIndex(max) {
        return Math.floor(Math.random() * max) + 1;
    }

    // Fetch image list from API
    async function fetchImageList() {
        try {
            const response = await fetch(`${API_BASE}/ri/h/`);
            if (!response.ok) throw new Error("Failed to fetch image list");
            const html = await response.text();
            // Parse HTML to find image count
            const match = html.match(/(\d+)\.webp/g);
            if (match) {
                const numbers = match.map((m) => parseInt(m.replace(".webp", "")));
                return Math.max(...numbers);
            }
            return 100; // Default fallback
        } catch (error) {
            console.warn("Failed to fetch image list:", error);
            return 100; // Default fallback
        }
    }

    // Get random image URL
    async function getRandomImageUrl() {
        const maxIndex = await fetchImageList();
        const index = getRandomIndex(maxIndex);
        return `${API_BASE}/ri/h/${index}.webp`;
    }

    // Get or set background image URL (session-based)
    async function getBackgroundUrl() {
        const currentSession = getSessionId();
        const storedData = localStorage.getItem(STORAGE_KEY);

        if (storedData) {
            try {
                const { url, session } = JSON.parse(storedData);
                // If same session, reuse the image
                if (session === currentSession && url) {
                    return url;
                }
            } catch (e) {
                // Invalid stored data, fetch new
            }
        }

        // Fetch new random image
        const newUrl = await getRandomImageUrl();
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
                url: newUrl,
                session: currentSession,
            }),
        );
        return newUrl;
    }

    // Preload image
    function preloadImage(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(url);
            img.onerror = () => reject(new Error("Failed to load image"));
            img.src = url;
        });
    }

    // Apply background to element
    function applyBackground(url) {
        // Find or create background container
        let bgContainer = document.getElementById("random-bg-container");

        if (!bgContainer) {
            bgContainer = document.createElement("div");
            bgContainer.id = "random-bg-container";
            bgContainer.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: -2;
                background-size: cover;
                background-position: center;
                background-attachment: fixed;
                transition: opacity 0.5s ease;
                opacity: 0;
            `;

            // Add dark overlay for better text readability
            const overlay = document.createElement("div");
            overlay.id = "random-bg-overlay";
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: -1;
                background: rgba(255, 255, 255, 0.88);
                transition: background 0.3s ease;
            `;

            // Dark mode overlay style
            const darkOverlayStyle = document.createElement("style");
            darkOverlayStyle.id = "random-bg-dark-style";
            darkOverlayStyle.textContent = `
                html.dark #random-bg-overlay {
                    background: rgba(0, 0, 0, 0.80) !important;
                }
            `;

            document.head.appendChild(darkOverlayStyle);
            document.body.insertBefore(overlay, document.body.firstChild);
            document.body.insertBefore(bgContainer, document.body.firstChild);
        }

        // Preload and then show
        preloadImage(url)
            .then(() => {
                bgContainer.style.backgroundImage = `url(${url})`;
                bgContainer.style.opacity = "1";
                console.log("[Random BG] Loaded:", url);
            })
            .catch((err) => {
                console.error("[Random BG] Failed to load:", err);
                // If failed, try to fetch a new one next time
                localStorage.removeItem(STORAGE_KEY);
            });
    }

    // Initialize background
    async function initBackground() {
        try {
            const url = await getBackgroundUrl();
            applyBackground(url);
        } catch (err) {
            console.error("[Random BG] Init failed:", err);
        }
    }

    // Expose global functions
    window.getRandomBackgroundUrl = getBackgroundUrl;
    window.refreshRandomBackground = async function() {
        localStorage.removeItem(STORAGE_KEY);
        sessionStorage.removeItem(SESSION_KEY);
        const url = await getRandomImageUrl();
        applyBackground(url);
        return url;
    };

    // Initialize on page load
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initBackground);
    } else {
        initBackground();
    }

    // Re-apply after Astro View Transitions
    document.addEventListener("astro:after-swap", initBackground);
    document.addEventListener("astro:page-load", initBackground);
})();
