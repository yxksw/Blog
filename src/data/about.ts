// 关于页面数据配置

export type SkillIconType = 'emoji' | 'iconify' | 'url';

export interface SkillItem {
    name: string;
    icon: string;
    iconType: SkillIconType;
    color: string;
}

export interface AboutData {
    author: {
        left: string[];
        right: string[];
        avatar: string;
        name: string;
    };
    myinfo: {
        title1: string;
        title2: string;
        bloggerName: string;
        content1: string;
        content2: string;
    };
    siteTips: {
        tips: string;
        connect1: string;
        connect2: string;
        inlineWord: string;
        mask: string[];
    };
    maxim: {
        tip: string;
        title1: string;
        title2: string;
    };
    skills: SkillItem[];
    single: {
        tip: string;
        title: string;
        history: string;
    };
}

export const aboutData: AboutData = {
    author: {
        left: [
            "💻 前端入门者",
            "📝 博客写作者",
            "🕊 本质内向",
            "🧱 持续学习"
        ],
        right: [
            "长时间熬夜者 💤",
            "和朋友关系好 🤝",
            "喜欢钻研项目 🔨",
            "只会CTRL CV 🤖"
        ],
        avatar: "/image/yxk-avatar.avif",
        name: "异飨客"
    },
    myinfo: {
        title1: "你好，很高兴认识你👋",
        title2: "我叫",
        bloggerName: "异飨客",
        content1: "是一名 前端入门者、学生、",
        content2: "博主"
    },
    siteTips: {
        tips: "追求",
        connect1: "源于",
        connect2: "热爱而去",
        inlineWord: "感受",
        mask: ["学习", "生活", "程序", "体验"]
    },
    maxim: {
        tip: "座右铭",
        title1: "每一段旅行，",
        title2: "都有终点。"
    },
    skills: [
        // emoji 类型（默认）
        { name: "Astro", icon: "lineicons:astro", iconType: "iconify", color: "#FFFFFF" },
        { name: "React", icon: "material-icon-theme:react", iconType: "iconify", color: "#FFFFFF" },
        { name: "TypeScript", icon: "catppuccin:typescript", iconType: "iconify", color: "#FFFFFF" },
        { name: "Python", icon: "material-icon-theme:python", iconType: "iconify", color: "#FFFFFF" },
        { name: "Cloudflare", icon: "devicon:cloudflare", iconType: "iconify", color: "#FFFFFF" },
        { name: "Tailwind", icon: "material-icon-theme:tailwindcss", iconType: "iconify", color: "#06B6D4" },
        // iconify 类型示例
        { name: "Vue", icon: "logos:vue", iconType: "iconify", color: "#4FC08D" },
        { name: "Node.js", icon: "logos:nodejs-icon", iconType: "iconify", color: "#339933" },
        // url 类型示例（外链图标）
        { name: "GitHub", icon: "https://api.iconify.design/logos:github-icon.svg", iconType: "url", color: "#181717" }
    ],
    single: {
        tip: "建站历程",
        title: "如何建站",
        history: "『异飨客』历史进程"
    }
};
