export interface NavLink {
	href: string;
	label: string;
	children?: NavLink[];
}

export const getNavLinks = (base: string): NavLink[] => [
	{ href: `${base}`, label: '首页' },
	{
		href: `${base}blog/`,
		label: '文章',
		children: [
			{ href: `${base}blog/`, label: '所有文章' },
			{ href: `${base}tags/`, label: '标签' },
			{ href: `${base}important/`, label: '推荐文章' },
		]
	},
	{
		href: `${base}essays/`,
		label: '即刻',
		children: [
			{ href: `${base}essays/`, label: '说说' },
			{ href: `${base}daily/`, label: '日常' },
		],
	},
	{
		href: `${base}bangumi/`,
		label: '更多页面',
		children: [
			{ href: `${base}bangumi/`, label: '追番' },
			{ href: `${base}music/`, label: '音乐' },
			{ href: `${base}equipment/`, label: '装备' },
			{ href: `${base}sponsors/`, label: '赞助' },
            { href: `${base}timetable/`, label: '课表' },
            { href: `${base}cover/`, label: '封面' },
            { href: `${base}files/`, label: '文件' },
            { href: `${base}albums/`, label: '画廊' },
		],
	},
	{
		href: `${base}links/`,
		label: '友链',
		children: [
			{ href: `${base}links/`, label: '友情链接' },
			{ href: `${base}fc/`, label: '友链朋友圈' },
		],
	},
	{ href: `${base}me/`, label: '关于' },
];
