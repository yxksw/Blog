import { getCollection } from 'astro:content';
import rss from '@astrojs/rss';
import { SITE_DESCRIPTION, SITE_TITLE } from '../consts';
import MarkdownIt from 'markdown-it';
import sanitizeHtml from 'sanitize-html';

const BASE = import.meta.env.BASE_URL;
const markdownParser = new MarkdownIt();

export async function GET(context) {
	const posts = await getCollection('blog');
	
	// 按发布日期排序
	const sortedPosts = posts.sort((a, b) => 
		b.data.pubDate.valueOf() - a.data.pubDate.valueOf()
	);
	
	const items = sortedPosts.map((post) => {
		// 将 Markdown 转换为 HTML
		const body = markdownParser.render(post.body || '');
		
		// 清理 HTML，确保安全性
		const content = sanitizeHtml(body, {
			allowedTags: sanitizeHtml.defaults.allowedTags.concat([
				'img', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 
				'pre', 'code', 'blockquote', 'hr', 'br',
				'strong', 'em', 'a', 'p', 'ul', 'ol', 'li'
			]),
			allowedAttributes: {
				...sanitizeHtml.defaults.allowedAttributes,
				img: ['src', 'alt', 'title'],
				a: ['href', 'title'],
				code: ['class'],
				pre: ['class']
			}
		});
		
		return {
			title: post.data.title,
			description: post.data.description,
			pubDate: post.data.pubDate,
			link: `${BASE}blog/${post.id}/`,
			content: content,
			customData: post.data.updatedDate 
				? `<updated>${post.data.updatedDate.toISOString()}</updated>` 
				: ''
		};
	});
	
	return rss({
		title: SITE_TITLE,
		description: SITE_DESCRIPTION,
		site: context.site,
		items: items,
		customData: `<language>zh-CN</language>`,
		xmlns: {
			content: 'http://purl.org/rss/1.0/modules/content/'
		}
	});
}
