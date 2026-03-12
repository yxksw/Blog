// ============================================
// 友链等级配置
// ============================================

export interface LevelInfo {
    days: number;
    level: number;
    title: string;
    icon: string; // SVG path
    theme: string;
    border: string;
    color: string;
}

export const DISCONNECTED_LEVEL: LevelInfo = {
    days: 0,
    level: 0,
    title: '失联',
    icon: 'M9 10h.01M15 10h.01M12 2a8 8 0 0 0-8 8v1.5c0 1.5.5 2 1.5 2.5v2a1.5 1.5 0 0 0 3 0V14h5v2a1.5 1.5 0 0 0 3 0v-2c1-.5 1.5-1 1.5-2.5V10a8 8 0 0 0-8-8z',
    theme: 'text-gray-400 dark:text-gray-500',
    color: 'text-gray-400 dark:text-gray-500',
    border: 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20'
};

// 15级友链等级配置
export const FRIEND_LEVELS: LevelInfo[] = [
    {
        days: 30, level: 1, title: '初遇',
        icon: 'M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .962 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .962L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.962 0z',
        theme: 'text-slate-600 dark:text-slate-400',
        border: 'border-slate-200 dark:border-slate-800 group-hover:border-slate-400 dark:group-hover:border-slate-600',
        color: 'text-slate-600 dark:text-slate-400'
    },
    {
        days: 60, level: 2, title: '萌芽',
        icon: 'M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10',
        theme: 'text-lime-600 dark:text-lime-400',
        border: 'border-lime-200 dark:border-lime-800 group-hover:border-lime-400 dark:group-hover:border-lime-600',
        color: 'text-lime-600 dark:text-lime-400'
    },
    {
        days: 90, level: 3, title: '抽叶',
        icon: 'M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10M2 21c0-3 2.5-5 5-5s5 2 5 5',
        theme: 'text-green-600 dark:text-green-400',
        border: 'border-green-200 dark:border-green-800 group-hover:border-green-400 dark:group-hover:border-green-600',
        color: 'text-green-600 dark:text-green-400'
    },
    {
        days: 180, level: 4, title: '绽放',
        icon: 'M12 7.5a4.5 4.5 0 1 1 4.5 4.5M12 7.5A4.5 4.5 0 1 0 7.5 12M12 7.5V9m-4.5 3a4.5 4.5 0 1 0 4.5 4.5M7.5 12H9m3 4.5V15m4.5-3H15m-3-4.5V9m0 3v.01',
        theme: 'text-emerald-600 dark:text-emerald-400',
        border: 'border-emerald-200 dark:border-emerald-800 group-hover:border-emerald-400 dark:group-hover:border-emerald-600',
        color: 'text-emerald-600 dark:text-emerald-400'
    },
    {
        days: 270, level: 5, title: '轻语',
        icon: 'M12 22c4.97 0 9-3.58 9-8 0-3.35-2.08-6.23-5-7.4V5a3 3 0 0 0-6 0v1.6C7.08 7.77 5 10.65 5 14c0 4.42 4.03 8 9 8z',
        theme: 'text-teal-600 dark:text-teal-400',
        border: 'border-teal-200 dark:border-teal-800 group-hover:border-teal-400 dark:group-hover:border-teal-600',
        color: 'text-teal-600 dark:text-teal-400'
    },
    {
        days: 365, level: 6, title: '听风',
        icon: 'M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2M9.6 4.6A2 2 0 1 1 11 8H2m10.6 11.4A2 2 0 1 0 14 16H2',
        theme: 'text-cyan-600 dark:text-cyan-400',
        border: 'border-cyan-200 dark:border-cyan-800 group-hover:border-cyan-400 dark:group-hover:border-cyan-600',
        color: 'text-cyan-600 dark:text-cyan-400'
    },
    {
        days: 450, level: 7, title: '云游',
        icon: 'M17.5 19c0-1.7-1.3-3-3-3c-1.1 0-2 .6-2.6 1.5c-.5-.9-1.5-1.5-2.6-1.5c-1.7 0-3 1.3-3 3M17.5 19H22v-5.3c0-2.8-2.2-5-5-5c-1.9 0-3.5 1-4.4 2.6c-.9-1.5-2.5-2.6-4.4-2.6c-2.8 0-5 2.2-5 5V19h4.5',
        theme: 'text-sky-600 dark:text-sky-400',
        border: 'border-sky-200 dark:border-sky-800 group-hover:border-sky-400 dark:group-hover:border-sky-600',
        color: 'text-sky-600 dark:text-sky-400'
    },
    {
        days: 540, level: 8, title: '润泽',
        icon: 'M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z',
        theme: 'text-blue-600 dark:text-blue-400',
        border: 'border-blue-200 dark:border-blue-800 group-hover:border-blue-400 dark:group-hover:border-blue-600',
        color: 'text-blue-600 dark:text-blue-400'
    },
    {
        days: 630, level: 9, title: '凝冰',
        icon: 'M12 3v18M8 7l8 10M8 17l8-10',
        theme: 'text-indigo-600 dark:text-indigo-400',
        border: 'border-indigo-200 dark:border-indigo-800 group-hover:border-indigo-400 dark:group-hover:border-indigo-600',
        color: 'text-indigo-600 dark:text-indigo-400'
    },
    {
        days: 730, level: 10, title: '磐石',
        icon: 'M8 3l4 8 5-5 2 10H3L8 3z',
        theme: 'text-stone-600 dark:text-stone-400',
        border: 'border-stone-200 dark:border-stone-800 group-hover:border-stone-400 dark:group-hover:border-stone-600',
        color: 'text-stone-600 dark:text-stone-400'
    },
    {
        days: 900, level: 11, title: '坚守',
        icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
        theme: 'text-amber-600 dark:text-amber-400',
        border: 'border-amber-200 dark:border-amber-800 group-hover:border-amber-400 dark:group-hover:border-amber-600',
        color: 'text-amber-600 dark:text-amber-400'
    },
    {
        days: 1080, level: 12, title: '燃情',
        icon: 'M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z',
        theme: 'text-orange-600 dark:text-orange-400',
        border: 'border-orange-200 dark:border-orange-800 group-hover:border-orange-400 dark:group-hover:border-orange-600',
        color: 'text-orange-600 dark:text-orange-400'
    },
    {
        days: 1460, level: 13, title: '烈阳',
        icon: 'M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z',
        theme: 'text-red-600 dark:text-red-400',
        border: 'border-red-200 dark:border-red-800 group-hover:border-red-400 dark:group-hover:border-red-600',
        color: 'text-red-600 dark:text-red-400'
    },
    {
        days: 1825, level: 14, title: '雷鸣',
        icon: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
        theme: 'text-purple-600 dark:text-purple-400',
        border: 'border-purple-200 dark:border-purple-800 group-hover:border-purple-400 dark:group-hover:border-purple-600',
        color: 'text-purple-600 dark:text-purple-400'
    },
    {
        days: 2190, level: 15, title: '传世',
        icon: 'M5 16L3 5l8.5 5L19 4l-2 16H5zm2-2h10v-2H7v2z',
        theme: 'text-fuchsia-600 dark:text-fuchsia-400',
        border: 'border-fuchsia-200 dark:border-fuchsia-800 group-hover:border-fuchsia-400 dark:group-hover:border-fuchsia-600',
        color: 'text-fuchsia-600 dark:text-fuchsia-400'
    },
];
