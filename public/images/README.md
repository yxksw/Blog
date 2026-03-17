# 画廊使用指南

本文档介绍如何在博客中使用画廊功能展示照片。

## 目录结构

```
public/images/albums/
├── 相册1/                    # 相册文件夹
│   ├── cover.jpg            # 相册封面（必需）
│   ├── info.json            # 相册配置（必需）
│   ├── photo1.jpg           # 照片文件
│   ├── photo2.jpg
│   └── ...
├── 相册2/
│   ├── cover.jpg
│   ├── info.json
│   └── ...
└── ...
```

## 创建相册

### 1. 创建相册文件夹

在 `public/images/albums/` 目录下创建一个新的文件夹，文件夹名称将作为相册的 ID。

```bash
mkdir public/images/albums/MyAlbum
```

### 2. 添加封面图片

将封面图片命名为 `cover.jpg` 放入相册文件夹。封面图片将显示在相册列表页面。

支持的图片格式：
- `.jpg` / `.jpeg`
- `.png`
- `.gif`
- `.webp`
- `.avif`
- `.svg`

### 3. 创建配置文件

在相册文件夹中创建 `info.json` 文件：

```json
{
  "title": "相册标题",
  "description": "相册描述",
  "date": "2026-03-17",
  "location": "拍摄地点",
  "tags": ["标签1", "标签2"],
  "layout": "grid",
  "columns": 3
}
```

#### 配置项说明

| 配置项 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| `title` | string | 是 | - | 相册标题 |
| `description` | string | 否 | "" | 相册描述 |
| `date` | string | 否 | 当前日期 | 相册日期，格式：`YYYY-MM-DD` |
| `location` | string | 否 | "" | 拍摄地点 |
| `tags` | array | 否 | [] | 标签数组 |
| `layout` | string | 否 | "grid" | 布局方式：`grid`（网格）或 `masonry`（瀑布流） |
| `columns` | number | 否 | 3 | 列数：2、3 或 4 |
| `hidden` | boolean | 否 | false | 是否隐藏相册 |

### 4. 添加照片

将照片文件放入相册文件夹。系统会自动扫描所有支持的图片格式（除了 `cover.jpg`）。

照片将按文件名排序显示。

## 外链模式

如果照片存储在外部（如 CDN），可以使用外链模式：

```json
{
  "mode": "external",
  "title": "外链相册",
  "description": "使用外部图片链接",
  "date": "2026-03-17",
  "location": "网络",
  "tags": ["风景"],
  "layout": "grid",
  "columns": 3,
  "cover": "https://example.com/cover.jpg",
  "photos": [
    {
      "src": "https://example.com/photo1.jpg",
      "title": "照片标题",
      "description": "照片描述",
      "date": "2026-03-17"
    },
    {
      "src": "https://example.com/photo2.jpg",
      "title": "照片2"
    }
  ]
}
```

外链模式配置项：

| 配置项 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `mode` | string | 是 | 固定值：`external` |
| `cover` | string | 是 | 封面图片 URL |
| `photos` | array | 是 | 照片数组 |

### 照片对象属性

| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `src` | string | 是 | 图片 URL |
| `title` | string | 否 | 照片标题 |
| `description` | string | 否 | 照片描述 |
| `date` | string | 否 | 拍摄日期 |
| `location` | string | 否 | 拍摄地点 |
| `tags` | array | 否 | 标签数组 |

## 访问画廊

- 相册列表：`https://your-domain.com/albums/`
- 相册详情：`https://your-domain.com/albums/{相册ID}/`

## 示例

### 本地相册示例

```json
{
  "title": "春日踏青",
  "description": "记录春天的美好时光",
  "date": "2026-03-15",
  "location": "杭州西湖",
  "tags": ["风景", "春天", "旅行"],
  "layout": "masonry",
  "columns": 3
}
```

### 外链相册示例

```json
{
  "mode": "external",
  "title": "精选壁纸",
  "description": "来自 Bing 的每日壁纸",
  "date": "2026-03-17",
  "tags": ["壁纸", "风景"],
  "layout": "grid",
  "columns": 3,
  "cover": "https://bing.kemeow.top/picture/2026-03-17.webp",
  "photos": [
    {
      "src": "https://bing.kemeow.top/picture/2026-03-16.webp",
      "title": "山间晨雾",
      "description": "清晨的山间云雾缭绕"
    },
    {
      "src": "https://bing.kemeow.top/picture/2026-03-15.webp",
      "title": "海边日落"
    }
  ]
}
```

## 功能特性

- **响应式布局**：自适应桌面端和移动端
- **两种布局模式**：网格布局（grid）和瀑布流布局（masonry）
- **Fancybox 灯箱**：点击照片可放大查看，支持缩放、旋转、幻灯片播放
- **深色模式**：自动适配系统的深色模式设置
- **懒加载**：图片按需加载，优化页面性能
- **标签系统**：为相册添加标签便于分类

## 注意事项

1. 相册文件夹名称将作为 URL 的一部分，建议使用英文或数字
2. 封面图片必须命名为 `cover.jpg`
3. 本地模式下，除 `cover.jpg` 外的所有图片都会被扫描
4. 修改 `info.json` 后需要重新构建网站才能生效
5. 外链模式需要确保图片 URL 可访问

## 故障排除

### 相册不显示

- 检查 `info.json` 是否存在且格式正确
- 检查 `cover.jpg` 是否存在
- 检查 `hidden` 是否为 `false`

### 照片不显示

- 检查图片格式是否支持
- 检查图片文件是否损坏
- 外链模式下检查 URL 是否可访问

### 灯箱无法打开

- 确保浏览器支持 JavaScript
- 检查浏览器控制台是否有错误信息
- 尝试清除浏览器缓存
