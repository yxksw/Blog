// 关于页面数据配置

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
    skills: {
        name: string;
        icon: string;
        color: string;
    }[];
    single: {
        tip: string;
        title: string;
        history: string;
    };
}

export const aboutData: AboutData = {
    author: {
        left: [
            "💻 技术爱好者",
            "📝 喜欢记录",
            "🕊 追求简单",
            "🧱 持续学习"
        ],
        right: [
            "吃饭不如碎觉 💤",
            "乐观 积极 向上 🤝",
            "专攻各种困难 🔨",
            "人不狠话超多 💢"
        ],
        avatar: "https://cdn.jsdmirror.com/gh/zsxcoder/github-img@main/img/yxk-avatar.avif",
        name: "异飨客"
    },
    myinfo: {
        title1: "你好，很高兴认识你👋",
        title2: "我叫",
        bloggerName: "异飨客",
        content1: "是一名 工程师、学生、",
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
        title1: "生活明朗，",
        title2: "万物可爱。"
    },
    skills: [
        { name: "Astro", icon: "🚀", color: "#FF5D01" },
        { name: "React", icon: "⚛️", color: "#61DAFB" },
        { name: "TypeScript", icon: "📘", color: "#3178C6" },
        { name: "Python", icon: "🐍", color: "#3776AB" },
        { name: "Cloudflare", icon: "☁️", color: "#F38020" },
        { name: "Tailwind", icon: "🎨", color: "#06B6D4" }
    ],
    single: {
        tip: "心路历程",
        title: "为何而建站",
        history: "『异飨客』历史进程"
    }
};
