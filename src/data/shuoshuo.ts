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
    github?: {
        owner: string;
        repo: string;
    };
}
let isHidden = true;
export const shuoshuoData: ShuoshuoItem[] = [
    {
        id: '8',
        content: '发现下一个博客的仓库了~',
    github: {
        owner: 'yxksw',
        repo: 'yxk'
    },        
        date: '2026-03-16 22:47',
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
