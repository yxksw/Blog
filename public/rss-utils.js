/**
 * RSS 工具库 - 用于存储 RSS 到 IndexedDB 并进行 diff 比较
 */

const DB_NAME = 'blog-rss-store';
const DB_VERSION = 1;
const STORE_NAME = 'rss';

// RSS 存储键
const RSS_CACHE_KEY = 'rss-cache';
const RSS_TIMESTAMP_KEY = 'rss-timestamp';

/**
 * 打开 IndexedDB 数据库
 */
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'key' });
            }
        };
    });
}

/**
 * 获取存储的数据
 */
async function getStoredData(key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction([STORE_NAME], 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result?.value || null);
        req.onerror = () => reject(req.error);
        db.close();
    });
}

/**
 * 存储数据
 */
async function setStoredData(key, value) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction([STORE_NAME], 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put({ key, value });
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
        db.close();
    });
}

/**
 * 获取当前 RSS feed
 */
async function fetchRSS() {
    try {
        const response = await fetch('/rss.xml', { cache: 'no-store' });
        if (!response.ok) throw new Error('Failed to fetch RSS');
        const text = await response.text();
        return parseRSS(text);
    } catch (error) {
        console.error('[RSS] Failed to fetch:', error);
        return null;
    }
}

/**
 * 解析 RSS XML
 */
function parseRSS(xmlText) {
    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlText, 'text/xml');
    const items = [];
    
    const itemElements = xml.querySelectorAll('item');
    itemElements.forEach(item => {
        const title = item.querySelector('title')?.textContent || '';
        const link = item.querySelector('link')?.textContent || '';
        const description = item.querySelector('description')?.textContent || '';
        const pubDate = item.querySelector('pubDate')?.textContent || '';
        const guid = item.querySelector('guid')?.textContent || link;
        
        // 获取 content:encoded
        const contentEncoded = item.getElementsByTagNameNS(
            'http://purl.org/rss/1.0/modules/content/', 
            'encoded'
        )[0]?.textContent || '';
        
        items.push({
            title,
            link,
            description,
            pubDate,
            guid,
            content: contentEncoded || description
        });
    });
    
    return {
        title: xml.querySelector('channel > title')?.textContent || '',
        link: xml.querySelector('channel > link')?.textContent || '',
        description: xml.querySelector('channel > description')?.textContent || '',
        lastBuildDate: xml.querySelector('channel > lastBuildDate')?.textContent || '',
        items
    };
}

/**
 * 比较两个 RSS 数据
 */
function diffRSS(oldRSS, newRSS) {
    if (!oldRSS || !newRSS) return { newPosts: [], updatedPosts: [] };
    
    const oldItems = new Map(oldRSS.items.map(item => [item.guid, item]));
    const newItems = new Map(newRSS.items.map(item => [item.guid, item]));
    
    const newPosts = [];
    const updatedPosts = [];
    
    // 查找新文章和更新文章
    for (const [guid, newItem] of newItems) {
        const oldItem = oldItems.get(guid);
        if (!oldItem) {
            newPosts.push(newItem);
        } else if (oldItem.pubDate !== newItem.pubDate || 
                   oldItem.description !== newItem.description ||
                   oldItem.content !== newItem.content) {
            updatedPosts.push({
                ...newItem,
                oldContent: oldItem.content,
                oldDescription: oldItem.description
            });
        }
    }
    
    return { newPosts, updatedPosts };
}

/**
 * 检查 RSS 更新
 */
async function checkRSSUpdate() {
    const newRSS = await fetchRSS();
    if (!newRSS) return null;
    
    const oldRSS = await getStoredData(RSS_CACHE_KEY);
    const diff = diffRSS(oldRSS, newRSS);
    
    // 存储新的 RSS
    await setStoredData(RSS_CACHE_KEY, newRSS);
    await setStoredData(RSS_TIMESTAMP_KEY, Date.now());
    
    return {
        hasUpdate: diff.newPosts.length > 0 || diff.updatedPosts.length > 0,
        newPosts: diff.newPosts,
        updatedPosts: diff.updatedPosts,
        isFirstVisit: !oldRSS
    };
}

/**
 * 获取文章在 RSS 中的内容
 */
async function getPostContentFromRSS(pathname) {
    const rss = await getStoredData(RSS_CACHE_KEY);
    if (!rss) return null;
    
    const post = rss.items.find(item => {
        const itemPath = new URL(item.link, window.location.origin).pathname;
        return itemPath === pathname;
    });
    
    return post || null;
}

// 导出 API
window.RSSUtils = {
    fetchRSS,
    parseRSS,
    diffRSS,
    checkRSSUpdate,
    getStoredData,
    setStoredData,
    getPostContentFromRSS,
    RSS_CACHE_KEY,
    RSS_TIMESTAMP_KEY
};
