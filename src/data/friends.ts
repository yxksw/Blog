// ============================================
// 友情链接配置
// ============================================

export interface FriendLink {
    name: string;
    description: string;
    url: string;
    avatar: string;
    addDate?: string;
    recommended?: boolean;
    disconnected?: boolean; // 是否失联
}

// 从远程加载友链数据
export async function loadFriends(): Promise<FriendLink[]> {
    try {
        const response = await fetch('https://cdn.jsdmirror.com/gh/yxksw/Friends@main/data/friends.ts');
        if (!response.ok) {
            throw new Error('Failed to load friends data');
        }
        const text = await response.text();
        // 提取数组内容
        const match = text.match(/export\s+const\s+FRIEND_LINKS[^[]*(\[[\s\S]*\])/);
        if (match) {
            return eval(match[1]);
        }
        return [];
    } catch (error) {
        console.error('Failed to load friends:', error);
        return [];
    }
}

// 本地备用数据
export const FRIEND_LINKS: FriendLink[] = [
    {
        name: "纸鹿摸鱼处",
        description: "纸鹿至麓不知路，支炉制露不止漉",
        url: "https://blog.zhilu.site/",
        avatar: "https://www.zhilu.site/api/avatar.png",
        addDate: "2025-09-03",
        recommended: true
    },
    {
        name: "Luxynth",
        description: "我心匪石不可转",
        url: "https://www.luxynth.cn",
        avatar: "https://www.luxynth.cn/assets/images/avatar.jpg",
        addDate: "2025-09-09",
        disconnected: true
    },
    {
        name: "鈴奈咲桜のBlog",
        description: "愛することを忘れないで",
        url: "https://blog.sakura.ink",
        avatar: "https://q2.qlogo.cn/headimg_dl?dst_uin=2731443459&spec=5",
        addDate: "2025-09-09",
        recommended: true
    },
];
