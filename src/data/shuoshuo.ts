// 说说页面数据配置

export interface ShuoshuoItem {
    id: string;
    content: string;
    date: string;
    location?: string;
    link?: string;
    images?: string[];
    video?: {
        player?: string;
        bilibili?: string;
    };
    music?: {
        server: string;
        id: string;
    };
}

export const shuoshuoData: ShuoshuoItem[] = [
    {
        id: '1',
        content: '这是我的第一条说说，欢迎来到我的博客！🎉',
        date: '2024-01-15 10:30',
        location: '上海',
    },
    {
        id: '2',
        content: '今天天气真不错，出去走了走，感觉心情都变好了。☀️',
        date: '2024-01-18 15:20',
        location: '杭州',
        images: [
            'https://picsum.photos/400/300?random=1',
            'https://picsum.photos/400/300?random=2',
        ],
    },
    {
        id: '3',
        content: '分享一首最近一直在听的歌，真的太好听了！🎵',
        date: '2024-01-20 20:45',
        music: {
            server: 'netease',
            id: '1957502053',
        },
    },
    {
        id: '4',
        content: '学习新技术的日子总是充实的，最近在研究 Astro，感觉很不错。💻',
        date: '2024-01-25 14:00',
        link: 'https://astro.build',
    },
    {
        id: '5',
        content: '分享一个有趣的视频，推荐大家看看！🎬',
        date: '2024-02-01 19:30',
        video: {
            bilibili: 'BV1GJ411x7h7',
        },
    },
    {
        id: '6',
        content: '生活不止眼前的苟且，还有诗和远方。✨',
        date: '2024-02-10 08:00',
    },
    {
        id: '7',
        content: '不断完善项目中~',
        date: '2026-03-15 23:20',
    },    
];

// 作者信息
export const authorInfo = {
    name: '异飨客',
    avatar: '/image/yxk-avatar.avif',
};

// 说说页面 Banner 配置
export const bannerConfig = {
    // Banner 背景图片 URL
    cover: 'https://img.314926.xyz/h',
    // 小标题
    tips: '分享生活中的小确幸',
    // 大标题
    title: '说说',
};
