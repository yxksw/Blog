/**
 * 图标工具函数
 * 用于根据域名匹配对应的图标
 */

/** 主域名图标映射 */
const mainDomainIcons: Record<string, string> = {
  // 社交媒体
  'bilibili.com': 'ri:bilibili-fill',
  'qq.com': 'ri:qq-fill',
  'weibo.com': 'ri:weibo-fill',
  'weixin.qq.com': 'ri:wechat-fill',
  'zhihu.com': 'ri:zhihu-line',
  'v2ex.com': 'simple-icons:v2ex',
  'twitter.com': 'ri:twitter-x-fill',
  'x.com': 'ri:twitter-x-fill',
  'facebook.com': 'ri:facebook-fill',
  'instagram.com': 'ri:instagram-fill',
  'linkedin.com': 'ri:linkedin-fill',
  'youtube.com': 'ri:youtube-fill',
  
  // 开发者平台
  'github.com': 'ri:github-fill',
  'github.io': 'ri:github-fill',
  'gitlab.com': 'ri:gitlab-fill',
  'stackoverflow.com': 'ri:stack-overflow-fill',
  'npmjs.com': 'simple-icons:npm',
  'docker.com': 'ri:docker-fill',
  'vercel.com': 'simple-icons:vercel',
  'vercel.app': 'simple-icons:vercel',
  'netlify.com': 'simple-icons:netlify',
  'netlify.app': 'simple-icons:netlify',
  'cloudflare.com': 'simple-icons:cloudflare',
  'pages.dev': 'simple-icons:cloudflare',
  
  // 云服务
  'aws.amazon.com': 'simple-icons:amazonaws',
  'azure.com': 'simple-icons:microsoftazure',
  'google.com': 'ri:google-fill',
  'google.cn': 'ri:google-fill',
  'firebase.google.com': 'simple-icons:firebase',
  
  // 文档与学习
  'microsoft.com': 'ri:microsoft-fill',
  'docs.microsoft.com': 'ri:microsoft-fill',
  'learn.microsoft.com': 'ri:microsoft-fill',
  'mozilla.org': 'simple-icons:mdnwebdocs',
  'developer.mozilla.org': 'simple-icons:mdnwebdocs',
  'w3schools.com': 'simple-icons:w3schools',
  
  // 国内服务
  'baidu.com': 'simple-icons:baidu',
  'aliyun.com': 'simple-icons:alibabadotcom',
  'tencent.com': 'simple-icons:tencentqq',
  'taobao.com': 'ri:taobao-fill',
  'tmall.com': 'ri:taobao-fill',
  'jd.com': 'arcticons:jd-sports',
  
  // 开源协议
  'creativecommons.org': 'ri:creative-commons-line',
  'opensource.org': 'simple-icons:opensourceinitiative',
  'apache.org': 'simple-icons:apache',
  'mit-license.org': 'simple-icons:mit',
  
  // 设计资源
  'figma.com': 'simple-icons:figma',
  'dribbble.com': 'ri:dribbble-fill',
  'behance.net': 'ri:behance-fill',
  
  // 通讯工具
  'slack.com': 'ri:slack-fill',
  'discord.com': 'ri:discord-fill',
  'telegram.org': 'ri:telegram-fill',
  'zoom.us': 'simple-icons:zoom',
  
  // 其他常用
  'notion.so': 'simple-icons:notion',
  'trello.com': 'simple-icons:trello',
  'jira.com': 'simple-icons:jira',
  'medium.com': 'simple-icons:medium',
  'dev.to': 'simple-icons:devdotto',
  'hashnode.com': 'simple-icons:hashnode',
};

/** 专门域名图标映射，优先级高于主域名图标 */
export const domainIcons: Record<string, string> = {
  'developer.mozilla.org': 'simple-icons:mdnwebdocs',
  'mp.weixin.qq.com': 'ri:wechat-fill',
  'docs.github.com': 'ri:github-fill',
  'github.com': 'ri:github-fill',
  'support.microsoft.com': 'ri:microsoft-fill',
  'learn.microsoft.com': 'ri:microsoft-fill',
};

/**
 * 判断是否为外部链接
 */
export function isExtLink(url: string): boolean {
  if (!url) return false;
  return url.startsWith('http://') || url.startsWith('https://');
}

/**
 * 从 URL 中提取完整域名
 */
export function getDomain(url: string): string {
  if (!url) return '';
  
  try {
    // 处理相对路径
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return url;
    }
    
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return url;
  }
}

/**
 * 从 URL 中提取主域名（不含子域名）
 * @param includeSecondLevel - 是否包含二级域名
 */
export function getMainDomain(url: string, includeSecondLevel = false): string {
  if (!url) return '';
  
  try {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return url;
    }
    
    const urlObj = new URL(url);
    const parts = urlObj.hostname.split('.');
    
    if (parts.length <= 2) {
      return urlObj.hostname;
    }
    
    // 处理特殊域名如 .com.cn, .co.uk 等
    const specialTlds = ['com.cn', 'co.uk', 'org.uk', 'net.cn', 'gov.cn', 'ac.uk', 'co.jp', 'or.jp'];
    const lastTwo = parts.slice(-2).join('.');
    const lastThree = parts.slice(-3).join('.');
    
    if (specialTlds.includes(lastThree)) {
      return parts.slice(-4, -2).join('.') + '.' + lastThree;
    }
    
    if (includeSecondLevel) {
      // 返回二级域名 + 顶级域名
      return parts.slice(-3).join('.');
    }
    
    return lastTwo;
  } catch {
    return url;
  }
}

/**
 * 根据 URL 获取对应的图标
 * 优先匹配专门域名，然后匹配主域名
 */
export function getDomainIcon(url: string): string | undefined {
  if (!url) return undefined;
  
  const domain = getDomain(url);
  const mainDomain = getMainDomain(url, true);
  
  // 优先匹配完整域名
  if (domain in domainIcons) {
    return domainIcons[domain];
  }
  
  // 然后匹配主域名
  if (mainDomain in mainDomainIcons) {
    return mainDomainIcons[mainDomain];
  }
  
  // 尝试匹配二级域名
  const parts = domain.split('.');
  if (parts.length >= 2) {
    const secondLevelDomain = parts.slice(-2).join('.');
    if (secondLevelDomain in mainDomainIcons) {
      return mainDomainIcons[secondLevelDomain];
    }
  }
  
  return undefined;
}

/**
 * 安全解码 URI 组件
 */
export function safelyDecodeUriComponent(str: string): string {
  try {
    return decodeURIComponent(str);
  } catch {
    return str;
  }
}
