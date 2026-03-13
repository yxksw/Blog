/**
 * 为 MD/MDX 文章生成并写入 AI 摘要（静态）
 * 使用方法：运行 tsx scripts/generateSummary.ts
 * 配置来源：.env 文件中的环境变量
 *
 * 说明：
 * - 若未配置 API，将使用本地简易规则生成摘要（截取正文前 200~300 字）。
 * - 脚本会扫描 src/content/blog/** 下的 .md 或 .mdx 文件，读取正文与前言并写入 summary 字段。
 */

import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import dotenv from 'dotenv'

// 加载 .env 文件
dotenv.config()

const ROOT = process.cwd()
const BLOG_DIR = path.join(ROOT, 'src', 'content', 'blog')
// 摘要目标长度（150字以内，确保完整性）
const SUMMARY_MAX_LEN = 150

/**
 * 日志等级类型定义
 * 0：仅错误；1：信息（生成与裁剪等）；2：调试（详细输出）
 */
type LogLevel = 0 | 1 | 2

/**
 * 已有摘要的覆盖策略
 * ask：逐篇询问；always：总是覆盖；never：从不覆盖（跳过写入）
 */
type OverwritePolicy = 'ask' | 'always' | 'never'

// 运行时日志等级（默认 1），由配置读取后在 run() 中设定
let currentLogLevel: LogLevel = 1

/**
 * 从环境变量读取字数限制（AISUMMARY_WORD_LIMIT）
 */
function readWordLimitFromEnv(): number | null {
  const envVal = process.env.AISUMMARY_WORD_LIMIT || ''
  const v = parseInt(envVal, 10)
  return Number.isFinite(v) && v > 0 ? v : null
}

/**
 * 获取最大字数限制（默认 5000）
 */
function getWordLimit(): number {
  return readWordLimitFromEnv() ?? 5000
}

/**
 * 从环境变量读取日志等级（AISUMMARY_LOG_LEVEL），允许 0/1/2
 */
function readLogLevelFromEnv(): LogLevel | null {
  const envVal = process.env.AISUMMARY_LOG_LEVEL || ''
  const v = parseInt(envVal, 10)
  return (v === 0 || v === 1 || v === 2) ? (v as LogLevel) : null
}

/**
 * 获取日志等级，默认 1
 */
function getLogLevel(): LogLevel {
  return readLogLevelFromEnv() ?? 1
}

/**
 * 从环境变量读取并发处理数（AISUMMARY_CONCURRENCY）
 */
function readConcurrencyFromEnv(): number | null {
  const envVal = process.env.AISUMMARY_CONCURRENCY || ''
  const v = parseInt(envVal, 10)
  return Number.isFinite(v) && v > 0 ? v : null
}

/**
 * 将并发处理数限制在区间 [1, 5]
 */
function clampConcurrency(n: number): number {
  return Math.max(1, Math.min(5, n))
}

/**
 * 获取并发处理数（默认 2），限定在 [1,5]
 */
function getConcurrency(): number {
  const c = readConcurrencyFromEnv() ?? 2
  return clampConcurrency(c)
}

/**
 * 统一日志输出入口（根据 currentLogLevel 控制）
 * 等级 0（错误）始终输出；等级 1（信息）和 2（调试）受 currentLogLevel 控制。
 * @param level 日志等级：0 错误；1 信息；2 调试
 * @param message 要输出的文本消息
 */
function log(level: LogLevel, message: string): void {
  const label = level === 0 ? '❌ 错误' : level === 1 ? 'ℹ️ 信息' : '🐞 调试'
  const time = level === 2 ? ` ${formatTime()}` : ''
  const line = `${label}${time ? ' |' + time : ''} | ${message}`
  if (level === 0) {
    console.error(line)
    return
  }
  if (level <= currentLogLevel) {
    console.log(line)
  }
}

/**
 * 格式化当前时间为 HH:MM:SS，用于调试级日志的时间标记。
 * @returns 形如 "12:34:56" 的时间字符串
 */
function formatTime(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/**
 * 判断 frontmatter 中是否已有 summary 字段
 * @param frontmatter frontmatter 字符串（包含分隔线）
 * @returns 是否存在 summary
 */
function hasSummaryInFrontmatter(frontmatter: string): boolean {
  if (!frontmatter) return false
  return /(^|\n)\s*summary\s*:/i.test(frontmatter)
}

/**
 * 从 frontmatter 中读取现有 summary 文本（仅单行）用于提示预览
 * @param frontmatter frontmatter 字符串
 * @returns 摘要文本（去除引号与首尾空白）
 */
function readSummaryFromFrontmatter(frontmatter: string): string {
  if (!frontmatter) return ''
  const lines = frontmatter.split(/\r?\n/)
  const endIdx = lines.findIndex((l, i) => i > 0 && l.trim() === '---')
  const inner = endIdx > -1 ? lines.slice(1, endIdx) : lines.slice(1)
  for (const l of inner) {
    const m = l.match(/^\s*summary\s*:\s*(.*)$/i)
    if (m) {
      return m[1].trim().replace(/^['"]/, '').replace(/['"]$/, '')
    }
  }
  return ''
}

/**
 * 从环境变量读取覆盖策略（AISUMMARY_COVER_ALL）
 * true: 覆盖所有; false: 仅处理无摘要的文章
 */
function readOverwritePolicyFromEnv(): OverwritePolicy {
  const raw = (process.env.AISUMMARY_COVER_ALL || '').trim().toLowerCase()
  if (raw === 'true' || raw === '1' || raw === 'yes') return 'always'
  return 'never'
}

/**
 * 获取覆盖策略，默认：never
 */
function getOverwritePolicy(): OverwritePolicy {
  return readOverwritePolicyFromEnv()
}

/**
 * 交互式询问是否覆盖现有摘要（逐篇）
 * @param question 提示文本
 * @param defaultYes 默认答案（true 为 yes，false 为 no）
 */
async function promptYesNo(question: string, defaultYes = false): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  const suffix = defaultYes ? ' [Y/N] ' : ' [y/n] '
  return await new Promise<boolean>((resolve) => {
    rl.question(question + suffix, (ans) => {
      rl.close()
      const v = (ans || '').trim().toLowerCase()
      if (!v) return resolve(defaultYes)
      resolve(v === 'y' || v === 'yes')
    })
  })
}

/**
 * 移除 MDX/Astro 组件与 import/export 语句，避免摘要受组件干扰。
 */
function stripAstroAndMDXComponents(text: string): string {
  if (!text) return ''
  let s = String(text)
  // 移除 import/export 行（整行）
  s = s.replace(/^[ \t]*import[^\n]*;?\s*$/gm, '')
  s = s.replace(/^[ \t]*export[^\n]*;?\s*$/gm, '')
  // 移除自闭合组件标签：<Component ... />
  s = s.replace(/<([A-Z][A-Za-z0-9_.-]*)\b[^>]*\/>/g, '')
  // 移除成对组件标签及其中内容：<Component ...> ... </Component>
  s = s.replace(/<([A-Z][A-Za-z0-9_.-]*)\b[^>]*>[\s\S]*?<\/\1>/g, '')
  return s
}

/**
 * 针对提交到摘要 API 的正文清洗
 */
function sanitizeBodyForAPI(body: string): string {
  if (!body) return ''
  let s = stripAstroAndMDXComponents(String(body))
  return s
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]*`/g, '')
    .replace(/!\[[^\]]*\]\([^\)]+\)/g, '')
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    .replace(/^[ \t]*#{1,6}[^\n]*\n/gm, '')
    .replace(/^>\s+/gm, '')
    .replace(/^[ \t]*[-*+]\s+/gm, '')
    .replace(/^[ \t]*\d+\.\s+/gm, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\r?\n+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/**
 * 安全截取文本前若干字符用于日志预览
 */
function previewText(text: string, max = 120): string {
  const s = (text || '')
    .replace(/\r?\n+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
  return s.length > max ? s.slice(0, max) + '…' : s
}

/**
 * 根据限制截断正文到指定最大字符数
 */
function limitBody(body: string, maxChars: number): string {
  if (!Number.isFinite(maxChars) || maxChars <= 0) return body
  return body.length > maxChars ? body.slice(0, maxChars) : body
}

/**
 * 递归查找目录下所有 .md 或 .mdx 文件
 */
function findMarkdownEntries(dir: string): string[] {
  const results: string[] = []
  const items = fs.readdirSync(dir, { withFileTypes: true })
  for (const item of items) {
    const fp = path.join(dir, item.name)
    if (item.isDirectory()) {
      results.push(...findMarkdownEntries(fp))
    } else if (item.isFile() && /\.mdx?$/.test(item.name)) {
      results.push(fp)
    }
  }
  return results
}

/**
 * 提取 frontmatter 与正文
 */
function splitFrontmatterAndBody(content: string): { frontmatter: string; body: string } {
  content = content.replace(/^\uFEFF?/, '').trimStart()
  const re = /^---\r?\n[\s\S]*?\r?\n---(?=\r?\n|$)/
  const match = re.exec(content)

  if (!match) {
    return { frontmatter: '', body: content }
  }

  const start = match.index
  let fm = match[0]
  let tail = content.slice(start + fm.length)

  const second = re.exec(tail)
  if (second && second.index === 0) {
    const fm2 = second[0]
    fm = mergeFrontmatterBlocks(fm, fm2)
    tail = tail.slice(fm2.length)
  }

  const body = tail.replace(/^\r?\n*/, '')
  return { frontmatter: fm, body }
}

/**
 * 仅提取正文
 */
function extractBodyOnly(content: string): string {
  let s = String(content || '').replace(/^\uFEFF?/, '').trimStart()
  const re = /^---\r?\n[\s\S]*?\r?\n---(?=\r?\n|$)/
  const m = re.exec(s)
  if (!m) return s
  let tail = s.slice(m.index + m[0].length)
  const second = re.exec(tail)
  if (second && second.index === 0) {
    tail = tail.slice(second[0].length)
  }
  return tail.replace(/^\r?\n*/, '')
}

/**
 * 合并两个相邻的 YAML frontmatter 块
 */
function mergeFrontmatterBlocks(fm1: string, fm2: string): string {
  const lines1 = fm1.split(/\r?\n/)
  const lines2 = fm2.split(/\r?\n/)
  const endIdx1 = lines1.findIndex((l, i) => i > 0 && l.trim() === '---')
  const endIdx2 = lines2.findIndex((l, i) => i > 0 && l.trim() === '---')
  const inner1 = endIdx1 > -1 ? lines1.slice(1, endIdx1) : lines1.slice(1)
  const inner2 = endIdx2 > -1 ? lines2.slice(1, endIdx2) : lines2.slice(1)

  const cleaned1 = inner1.filter(l => !/^\s*summary\s*:/i.test(l))
  const cleaned2 = inner2.filter(l => !/^\s*summary\s*:/i.test(l))

  const combined = ['---', ...cleaned1, ...cleaned2, '---']
  const fmStr = combined.join('\n')
  return fmStr.endsWith('\n') ? fmStr : fmStr + '\n'
}

/**
 * 清洗任意文本为摘要友好格式
 */
function sanitizeSummaryText(text: string, maxLen = SUMMARY_MAX_LEN): string {
  if (!text) return ''
  let s = String(text)
  // 移除 Markdown 语法
  s = s.replace(/```[\s\S]*?```/g, '')
  s = s.replace(/!\[[^\]]*\]\([^\)]+\)/g, '')
  s = s.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
  s = s.replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
  s = s.replace(/__([^_]+)__/g, '$1').replace(/_([^_]+)_/g, '$1')
  s = s.replace(/^[ \t]*#{1,6}[^\n]*\n/gm, '')
  s = s.replace(/^>\s+/gm, '')
  s = s.replace(/^[ \t]*[-*+]\s+/gm, '')
  s = s.replace(/^[ \t]*\d+\.\s+/gm, '')
  s = s.replace(/<[^>]+>/g, '')
  s = s.replace(/\r?\n+/g, ' ')
  s = s.replace(/\s{2,}/g, ' ').trim()

  if (!s) return ''
  
  // 限制长度，确保完整性
  if (s.length > maxLen) {
    // 在最后一个句号处截断
    const lastPeriod = s.lastIndexOf('。', maxLen)
    if (lastPeriod > 30) {
      s = s.slice(0, lastPeriod + 1)
    } else {
      s = s.slice(0, maxLen - 1) + '。'
    }
  }
  
  // 确保以句号结尾
  if (!s.endsWith('。') && !s.endsWith('.')) {
    s = s + '。'
  }
  
  return s
}

/**
 * 判断文本是否包含代码特征
 */
function looksLikeCode(text: string): boolean {
  if (!text) return false
  let score = 0
  if (/```[\s\S]*?```/.test(text)) score += 2
  if (/`[^`]+`/.test(text)) score += 1
  if (/\b(import|export|const|let|var|function|interface|class|return|new)\b/.test(text)) score += 2
  if (/\w+\s*=>/.test(text)) score += 1
  if (/\w+\.\w+/.test(text)) score += 1
  const punctCount = (text.match(/[{}();\[\]]/g) || []).length
  if (punctCount >= 3) score += 1
  return score >= 2
}

/**
 * 基于正文生成本地摘要（无 API 时的兜底）
 */
function localGenerateSummary(title: string, body: string, maxLen = SUMMARY_MAX_LEN): string {
  let clean = stripAstroAndMDXComponents(body)
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]*`/g, '')
    .replace(/!\[[^\]]*\]\([^\)]+\)/g, '')
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    .replace(/^[ \t]*#{1,6}[^\n]*\n/gm, '')
    .replace(/^>\s+/gm, '')
    .replace(/^[ \t]*[-*+]\s+/gm, '')
    .replace(/^[ \t]*\d+\.\s+/gm, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\r?\n+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()

  if (!clean) {
    return '本文介绍了' + (title || '相关主题') + '的内容。'
  }
  
  // 取前100字作为摘要基础
  const preview = clean.slice(0, 100)
  // 简单提取第一句或前100字
  const firstSentence = preview.split(/[。！？.!?]/)[0] || preview
  const summary = firstSentence.slice(0, maxLen - 1)
  return summary.endsWith('。') ? summary : summary + '。'
}

/**
 * 将任意纯文本整形成单句陈述句摘要
 */
function toDeclarativeSentence(text: string, maxLen = SUMMARY_MAX_LEN): string {
  let s = String(text)
  s = s
    .replace(/[\.;]{1,}/g, '。')
    .replace(/[!?]+/g, '！')
    .replace(/[,，]+/g, '，')
    .replace(/[:：]+/g, '：')
    .replace(/[;；]+/g, '；')

  s = s
    .replace(/["'`~^_*@#$%&+=<>]/g, '')
    .replace(/[\(\)\[\]\{\}（ ）【 】]/g, '')
    .replace(/[|\\/]/g, '')

  const parts = s
    .split(/[。！？!?？…]+/)
    .map(t => t.trim())
    .filter(Boolean)
  let merged = parts.join('，')

  merged = merged.replace(/\s{2,}/g, ' ').replace(/，{2,}/g, '，').trim()
  const coreMax = Math.max(1, maxLen - 1)
  if (merged.length > coreMax) {
    merged = merged.slice(0, coreMax)
    merged = merged.replace(/[，、：；]+$/g, '')
  } else {
    merged = merged.replace(/[，、：；]+$/g, '')
  }
  return merged.endsWith('。') ? merged : merged + '。'
}

/**
 * 在 frontmatter 中写入/更新 summary 字段
 */
function upsertSummaryInFrontmatter(frontmatter: string, summary: string): string {
  if (!frontmatter) {
    return `---\nsummary: ${escapeYaml(summary)}\n---\n`
  }

  const lines = frontmatter.split('\n')
  let endIdx = lines.findIndex((l, i) => i > 0 && l.trim() === '---')
  if (endIdx === -1) endIdx = lines.length

  const bodyLines = lines
    .slice(1, endIdx)
    .filter(l => {
      if (/^\s*summary\s*:/i.test(l)) return false
      if (/^\s*```/.test(l)) return false
      const yamlKey = /^\s*[A-Za-z_][\w-]*\s*:/
      const yamlListItem = /^\s*-\s+.+/
      const yamlComment = /^\s*#/
      const empty = /^\s*$/
      return yamlKey.test(l) || yamlListItem.test(l) || yamlComment.test(l) || empty.test(l)
    })
  const rebuilt = [
    '---',
    ...bodyLines,
    `summary: ${escapeYaml(summary)}`,
    '---'
  ]
  const fmStr = rebuilt.join('\n')
  return fmStr.endsWith('\n') ? fmStr : fmStr + '\n'
}

/**
 * 简易 YAML 转义（单行文本）
 */
function escapeYaml(text: string): string {
  const s = (text || '').replace(/"/g, '\\"')
  return '"' + s + '"'
}

/**
 * 调用外部 API 生成摘要
 */
async function callSummaryAPI(title: string, body: string, limit: number): Promise<string | null> {
  const api = process.env.AI_SUMMARY_API
  const key = process.env.AI_SUMMARY_KEY
  const model = process.env.AI_SUMMARY_MODEL || 'lite'

  if (!api) return null

  const limited = limitBody(body, limit)
  // 构建提示词
  const prompt = `你是一个文章摘要生成助手。请用一句话（不超过120字）简洁总结给定文章的核心内容，使用陈述句，结尾必须用句号。只返回摘要内容，不要有任何前缀或解释。不要罗列细节，只概括文章主旨。

标题：${title}

正文：${limited}`

  const payload: Record<string, unknown> = {
    model,
    content: prompt
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }

  if (key) {
    headers['Authorization'] = 'Bearer ' + key
  }

  try {
    const res = await fetch(api, { method: 'POST', headers, body: JSON.stringify(payload) })
    if (!res.ok) {
      const errorText = await res.text().catch(() => '')
      log(2, `API 错误响应: ${errorText}`)
      throw new Error('HTTP ' + res.status)
    }
    const data = await res.json() as any
    let summary = data.choices?.[0]?.message?.content || data.summary || data.content
    if (typeof summary !== 'string') return null
    summary = summary.trim()
    // 清理可能的 markdown 代码块
    summary = summary.replace(/^```[\s\S]*?\n/, '').replace(/```$/, '').trim()
    // 移除可能的标题标记
    summary = summary.replace(/^#+\s*/, '').trim()
    // 确保摘要以句号结尾
    if (!summary.endsWith('。') && !summary.endsWith('.')) {
      summary = summary + '。'
    }
    // 限制长度
    if (summary.length > SUMMARY_MAX_LEN) {
      // 在最后一个句号处截断
      const lastPeriod = summary.lastIndexOf('。', SUMMARY_MAX_LEN)
      if (lastPeriod > 50) {
        summary = summary.slice(0, lastPeriod + 1)
      } else {
        summary = summary.slice(0, SUMMARY_MAX_LEN - 1) + '。'
      }
    }
    return summary
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    log(0, 'AI 摘要 API 调用失败：' + msg)
    return null
  }
}

/**
 * 从 frontmatter 中读取标题
 */
function readTitleFromFrontmatter(frontmatter: string): string {
  const m = frontmatter.match(/\ntitle:\s*['"]?([^'"]+)['"]?\s*\n/)
  return m ? m[1].trim() : ''
}

/**
 * 主流程：扫描文章、生成摘要并写入文件
 */
async function run(): Promise<void> {
  currentLogLevel = getLogLevel()
  log(1, `日志等级已设置为 ${currentLogLevel}（${currentLogLevel === 0 ? '错误' : currentLogLevel === 1 ? '信息' : '调试'}）`)
  let concurrency = getConcurrency()
  const overwritePolicy = getOverwritePolicy()

  const files = findMarkdownEntries(BLOG_DIR)
  if (!files.length) {
    log(1, '未找到任何 Markdown 文章。')
    return
  }
  const wordLimit = getWordLimit()
  const hasAPI = !!process.env.AI_SUMMARY_API

  log(1, `待处理文章数：${files.length}，字数限制：${wordLimit}，并发：${concurrency}`)
  log(1, `API 配置状态：${hasAPI ? '已配置' : '未配置（将使用本地摘要）'}`)
  log(1, `覆盖策略：${overwritePolicy}`)

  if (overwritePolicy === 'ask' && concurrency > 1) {
    log(1, `交互式覆盖策略启用：并发由 ${concurrency} 调整为 1`)
    concurrency = 1
  }

  async function processOne(file: string, limit: number): Promise<void> {
    try {
      const content = fs.readFileSync(file, 'utf8')
      const { frontmatter, body } = splitFrontmatterAndBody(content)
      const bodyOnly = extractBodyOnly(content)
      const title = readTitleFromFrontmatter(frontmatter)
      const limitedBody = limitBody(bodyOnly, limit)

      if (hasSummaryInFrontmatter(frontmatter)) {
        const existing = readSummaryFromFrontmatter(frontmatter)
        if (overwritePolicy === 'never') {
          log(1, `跳过已有摘要：${path.relative(ROOT, file)}`)
          return
        }
        if (overwritePolicy === 'ask') {
          const q = `文件已含摘要，是否覆盖？${path.relative(ROOT, file)}\n当前摘要：${previewText(existing, 80)}\n>`
          const yes = await promptYesNo(q, false)
          if (!yes) {
            log(1, `用户选择跳过：${path.relative(ROOT, file)}`)
            return
          }
          log(1, `用户选择覆盖：${path.relative(ROOT, file)}`)
        }
      }

      if (bodyOnly.length > limitedBody.length) {
        log(1, `正文超长，已裁剪到 ${limit} 字：${path.relative(ROOT, file)}`)
      }

      const apiSummary = hasAPI ? await callSummaryAPI(title, limitedBody, limit) : null
      let summary = apiSummary ?? ''
      if (!summary || looksLikeCode(summary)) {
        log(1, `使用本地规则生成摘要：${path.relative(ROOT, file)}`)
        summary = localGenerateSummary(title, limitedBody, SUMMARY_MAX_LEN)
      } else {
        log(1, `API 生成摘要成功：${path.relative(ROOT, file)}`)
        // API 返回的摘要已经在 callSummaryAPI 中处理过了
      }

      const nextFrontmatter = upsertSummaryInFrontmatter(frontmatter, summary)
      const nextContent = nextFrontmatter + body
      fs.writeFileSync(file, nextContent, 'utf8')
      log(1, '已写入摘要：' + path.relative(ROOT, file))
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      log(0, `处理失败：${path.relative(ROOT, file)} - ${msg}`)
    }
  }

  const queue = files.slice()
  async function worker() {
    while (queue.length) {
      const f = queue.shift()!
      await processOne(f, wordLimit)
    }
  }
  const workers = Array.from({ length: concurrency }, () => worker())
  await Promise.all(workers)
}

run().catch((e) => {
  console.error('摘要生成脚本执行失败：', e)
  process.exitCode = 1
})
