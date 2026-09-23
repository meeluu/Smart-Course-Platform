// markdown-it 15 自带类型：默认导出是可 new 的构造函数，实例类型需要单独按类型引入
import MarkdownItCtor, { type MarkdownIt } from 'markdown-it'
import hljs from 'highlight.js/lib/core'
import katex from 'katex'
import DOMPurify from 'dompurify'

// 按需注册语言：只引入课程材料里真实出现的几种，避免打进全部 190+ 种语言
import bash from 'highlight.js/lib/languages/bash'
import cpp from 'highlight.js/lib/languages/cpp'
import java from 'highlight.js/lib/languages/java'
import javascript from 'highlight.js/lib/languages/javascript'
import json from 'highlight.js/lib/languages/json'
import markdownLang from 'highlight.js/lib/languages/markdown'
import python from 'highlight.js/lib/languages/python'
import r from 'highlight.js/lib/languages/r'
import sql from 'highlight.js/lib/languages/sql'
import typescript from 'highlight.js/lib/languages/typescript'
import yaml from 'highlight.js/lib/languages/yaml'

hljs.registerLanguage('bash', bash)
hljs.registerLanguage('shell', bash)
hljs.registerLanguage('cpp', cpp)
hljs.registerLanguage('java', java)
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('js', javascript)
hljs.registerLanguage('json', json)
hljs.registerLanguage('markdown', markdownLang)
hljs.registerLanguage('python', python)
hljs.registerLanguage('py', python)
hljs.registerLanguage('r', r)
hljs.registerLanguage('sql', sql)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('ts', typescript)
hljs.registerLanguage('yaml', yaml)

/** 生成锚点 id：中英文均可，去掉标点并转小写 */
export function slugify(text: string): string {
  const slug = text
    .trim()
    .toLowerCase()
    .replace(/[\s\u3000]+/g, '-')
    .replace(/[^\p{L}\p{N}-]+/gu, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'section'
}

/** 行内公式 $...$ 与块级公式 $$...$$（避免引入停更的第三方插件） */
function katexPlugin(md: MarkdownIt): void {
  md.inline.ruler.after('escape', 'math_inline', (state, silent) => {
    if (state.src[state.pos] !== '$' || state.src[state.pos + 1] === '$') return false
    let cursor = state.pos + 1
    let close = -1
    while (cursor < state.posMax) {
      const ch = state.src[cursor]
      if (ch === '\\') {
        cursor += 2
        continue
      }
      if (ch === '\n') return false
      if (ch === '$') {
        close = cursor
        break
      }
      cursor += 1
    }
    if (close < 0 || close === state.pos + 1) return false
    if (silent) return true
    const token = state.push('math_inline', 'math', 0)
    token.content = state.src.slice(state.pos + 1, close)
    state.pos = close + 1
    return true
  })

  md.renderer.rules.math_inline = (tokens, idx) =>
    katex.renderToString(tokens[idx].content, { throwOnError: false, displayMode: false })

  md.block.ruler.before(
    'fence',
    'math_block',
    (state, startLine, endLine, silent) => {
      const start = state.bMarks[startLine] + state.tShift[startLine]
      const max = state.eMarks[startLine]
      if (state.src.slice(start, start + 2) !== '$$') return false
      if (silent) return true

      const tail = state.src.slice(start + 2, max)
      const inlineClose = tail.indexOf('$$')
      let content: string
      let nextLine: number

      if (inlineClose >= 0) {
        content = tail.slice(0, inlineClose)
        nextLine = startLine + 1
      } else {
        content = tail
        nextLine = startLine + 1
        let closed = false
        for (; nextLine < endLine; nextLine += 1) {
          const lineStart = state.bMarks[nextLine] + state.tShift[nextLine]
          const lineEnd = state.eMarks[nextLine]
          const lineText = state.src.slice(lineStart, lineEnd)
          const closeAt = lineText.indexOf('$$')
          if (closeAt >= 0) {
            content += `\n${lineText.slice(0, closeAt)}`
            closed = true
            nextLine += 1
            break
          }
          content += `\n${lineText}`
        }
        if (!closed) return false
      }

      const token = state.push('math_block', 'math', 0)
      token.block = true
      token.content = content.trim()
      token.map = [startLine, nextLine]
      state.line = nextLine
      return true
    },
    { alt: ['paragraph', 'reference', 'blockquote', 'list'] },
  )

  md.renderer.rules.math_block = (tokens, idx) =>
    `<div class="math-block">${katex.renderToString(tokens[idx].content, {
      throwOnError: false,
      displayMode: true,
    })}</div>\n`
}

const md: MarkdownIt = new MarkdownItCtor({
  html: false,
  linkify: true,
  breaks: false,
  highlight(code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return `<pre class="hljs"><code>${hljs.highlight(code, { language: lang, ignoreIllegals: true }).value}</code></pre>`
      } catch {
        /* 回落到纯文本 */
      }
    }
    return `<pre class="hljs"><code>${md.utils.escapeHtml(code)}</code></pre>`
  },
})

md.use(katexPlugin)

// 标题带锚点 id，供 DR1 的「定位」与引用的原文跳转使用
md.renderer.rules.heading_open = (tokens, idx) => {
  const level = Number(tokens[idx].tag.slice(1))
  const inline = tokens[idx + 1]
  const text = inline?.content ?? ''
  return `<h${level} id="${md.utils.escapeHtml(slugify(text))}">`
}

/** 渲染 markdown 为可安全插入的 HTML */
export function renderMarkdown(source: string): string {
  if (!source) return ''
  return DOMPurify.sanitize(md.render(source), {
    ADD_ATTR: ['target', 'id'],
    ADD_TAGS: ['math'],
  })
}

/** 提取 markdown 中的标题，用于生成证据块与锚点导航 */
export interface Heading {
  level: number
  label: string
  id: string
  /** 在原文行号 */
  line: number
}

export function extractHeadings(source: string): Heading[] {
  const headings: Heading[] = []
  const lines = source.split(/\r?\n/)
  let inFence = false
  lines.forEach((line, index) => {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence
      return
    }
    if (inFence) return
    const match = /^(#{1,4})\s+(.+?)\s*#*\s*$/.exec(line)
    if (!match) return
    const label = match[2].replace(/[*_`]/g, '').trim()
    headings.push({ level: match[1].length, label, id: slugify(label), line: index })
  })
  return headings
}

/** 取某标题下、下一标题前的正文（已去掉 markdown 记号），用于证据块预览 */
export function sectionText(source: string, headings: Heading[], index: number, limit = 260): string {
  const lines = source.split(/\r?\n/)
  const start = headings[index].line + 1
  const end = index + 1 < headings.length ? headings[index + 1].line : lines.length
  const text = lines
    .slice(start, end)
    .join('\n')
    .replace(/^\s*[-*>]\s?/gm, '')
    .replace(/[|#`*_]/g, '')
    .replace(/\[(.+?)\]\(.*?\)/g, '$1')
    .replace(/\s*\n\s*/g, ' ')
    .trim()
  return text.length > limit ? `${text.slice(0, limit)}…` : text
}

/** 取正文首段，用于无标题文档 */
export function firstParagraph(source: string, limit = 220): string {
  const text = source
    .split(/\r?\n\s*\r?\n/)
    .map((block) => block.replace(/[#*_`|>-]/g, '').replace(/\s*\n\s*/g, ' ').trim())
    .find((block) => block.length > 0)
  if (!text) return ''
  return text.length > limit ? `${text.slice(0, limit)}…` : text
}
