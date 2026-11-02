<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { usePlatformStore } from '@/stores/platform'
import { useCloudStore } from '@/stores/cloud'
import { useWorkbenchStore } from '@/stores/workbench'
import {
  PAPERS_QUERY_MAX_LENGTH,
  PAPERS_SEARCH_DEFAULT_LIMIT,
  type PaperSearchItem,
} from '@/services/papersApi'

/**
 * 论文推荐（V5-B 真实检索）
 * ----------------------------------------------------------------------------
 * 数据来自服务端代理的 OpenAlex，**不是模型生成**，所以页面上不出现「AI 已生成」。
 *
 * 五条界面规则（对应 docs/v5-data-layer-delivery.md §2.1 与契约 29.1 规则 4）：
 *   1. `fallback` 是「检索服务暂时不可用」，不是「没有相关论文」：必须展示 notice；
 *   2. `error` 时保留上一次结果，只在顶部加一条错误说明；
 *   3. `openAccessUrl` 为空时只给 DOI 链接，不拼一个不存在的开放获取地址；
 *   4. 重试沿用同一个 requestId（服务端按它重放），换检索词才生成新的；
 *   5. 本地项目没有服务端归属，不发起真实检索——只提供「复制提示词自己查」，并说明原因。
 */
const platform = usePlatformStore()
const cloud = useCloudStore()
const workbench = useWorkbenchStore()
const router = useRouter()

const isCloud = computed(() => platform.isCloudSource === true)
const cloudProject = computed(() => platform.cloudProject)
const localProject = computed(() => workbench.current)
const project = computed(() => (isCloud.value ? cloudProject.value : localProject.value))
const projectName = computed(() => project.value?.name ?? '')

/** 当前阶段名：云端取「当前阶段」，本地取里程碑里标记为进行中的那个 */
const stageName = computed(() => {
  if (isCloud.value) {
    const id = cloud.currentMilestoneId
    return cloud.milestones.find((item) => item.milestoneId === id)?.name ?? null
  }
  const milestones = localProject.value?.ms ?? []
  return milestones.find((item) => item.s === 'cur')?.t ?? null
})

/* ------------------------------------------------------------------ 检索状态 */

const query = ref('')
const lastQuery = ref('')
const searched = ref(false)
const inputError = ref('')
const requestError = ref('')

const status = computed(() => cloud.papers.status)
const papers = computed(() => cloud.papers.papers)
const notice = computed(() => cloud.papers.notice)
const loading = computed(() => status.value === 'loading')

/** 是否有可展示的结果列表（fallback 时不展示，交给 notice 说明） */
const showList = computed(() => status.value !== 'fallback' && papers.value.length > 0)

/** 检索过但确实没有结果：这是**真的零结果**，与 fallback 严格区分 */
const showEmptyResult = computed(
  () => status.value === 'ready' && papers.value.length === 0,
)

const errorMessage = computed(() => requestError.value || cloud.papers.error?.message || '')

async function perform(text: string, reuseRequestId: boolean): Promise<void> {
  const value = text.trim()
  if (value === '') {
    inputError.value = '先写一句你想了解的方向，例如「近海波浪高度预测」'
    return
  }
  if (value.length > PAPERS_QUERY_MAX_LENGTH) {
    inputError.value = `方向最多 ${PAPERS_QUERY_MAX_LENGTH} 字，请精简后再检索`
    return
  }
  inputError.value = ''
  requestError.value = ''

  // 重试沿用上一次的 requestId；换词时不传，由数据层生成新 UUID
  const requestId =
    reuseRequestId && lastQuery.value === value ? cloud.papers.requestId ?? undefined : undefined

  const result = await cloud.searchPapers({
    query: value,
    limit: PAPERS_SEARCH_DEFAULT_LIMIT,
    ...(requestId === undefined ? {} : { requestId }),
  })

  lastQuery.value = value
  searched.value = true
  if (!result.ok) {
    requestError.value = result.message || '这次检索没有完成，请稍后再试'
  }
}

/**
 * 切换项目后必须重置本页状态：store 会清空 `papers`，但输入框、上次检索词、
 * 错误条都是页面内存，留着就会把上个项目的结果解释成这个项目的。
 */
watch(
  () => project.value?.projectId ?? null,
  () => {
    query.value = ''
    lastQuery.value = ''
    searched.value = false
    inputError.value = ''
    requestError.value = ''
  },
)

async function submit(): Promise<void> {
  await perform(query.value, false)
}

async function retry(): Promise<void> {
  await perform(lastQuery.value, true)
}

/* ------------------------------------------------------------ 复制检索提示词 */

const promptText = computed(() => {
  const stage = stageName.value === null ? '' : `，当前阶段是「${stageName.value}」`
  const direction = lastQuery.value || query.value.trim() || '我的项目方向'
  return (
    `我在做课程项目「${projectName.value}」${stage}。` +
    `请帮我检索近 5 年关于「${direction}」的论文：` +
    '1) 代表性方法与结论；2) 各自使用的数据与实验条件；3) 可以复现的开源实现。' +
    '请列出 5 篇并给出 DOI，说明每篇为什么和我的项目相关。'
  )
})

function copyPrompt(): void {
  const done = (): void => workbench.toast('提示词已复制，粘贴到 GPT 即可检索')
  const fallback = (): void => {
    const area = document.createElement('textarea')
    area.value = promptText.value
    document.body.appendChild(area)
    area.select()
    try {
      document.execCommand('copy')
      done()
    } catch {
      workbench.toast('复制失败，请手动选择文本')
    }
    document.body.removeChild(area)
  }
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(promptText.value).then(done).catch(fallback)
  } else {
    fallback()
  }
}

/* ------------------------------------------------------------------ 展示格式 */

function authorsText(item: PaperSearchItem): string {
  if (item.authors.length === 0) return '作者信息暂缺'
  const head = item.authors.slice(0, 3).join('、')
  return item.authors.length > 3 ? `${head} 等 ${item.authors.length} 人` : head
}

function metaText(item: PaperSearchItem): string {
  const parts: string[] = []
  parts.push(item.year === null ? '年份暂无' : `${item.year} 年`)
  parts.push(item.venue ?? '来源暂无')
  parts.push(`被引 ${item.citedByCount} 次`)
  return parts.join(' · ')
}

function doiHref(doi: string): string {
  return `https://doi.org/${doi.replace(/^https?:\/\/doi\.org\//i, '')}`
}

function loadedText(): string {
  const value = cloud.papers.loadedAt
  if (value === null) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `检索于 ${date.toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit' })}`
}
</script>

<template>
  <div class="mode-banner">
    <b>论文推荐</b> 「{{ projectName || '当前项目' }}」：每个项目独立推荐。
    <template v-if="isCloud">论文来自真实的学术检索（OpenAlex），不是模型生成的标题。</template>
    <template v-else>本地项目没有账号归属，不能在站内检索；下面给你可直接粘贴的提示词。</template>
  </div>

  <!-- 项目读取中：先给出状态，不要误报「没有项目」 -->
  <section v-if="!project && platform.cloudLoading" class="card">
    <div class="card-b"><p class="hint">正在读取当前云端项目…</p></div>
  </section>

  <!-- 还没选项目 -->
  <section v-else-if="!project" class="card">
    <div class="card-b">
      <div class="empty-state">
        <h3>还没有项目，所以没有可检索的方向</h3>
        <p>论文检索会带上项目名和当前阶段一起查。先建一个项目，再回到这里检索。</p>
        <button class="btn primary" type="button" @click="router.push('/')">去工作台创建项目</button>
      </div>
    </div>
  </section>

  <template v-else>
    <!-- 本地项目：没有服务端归属，诚实说明只能自己查 -->
    <section v-if="!isCloud" class="card local-papers">
      <div class="card-h">本地项目：自己检索</div>
      <div class="card-b">
        <div class="notice notice-info">
          <div class="notice-text">
            真实论文检索需要登录后使用<strong>云端项目</strong>（检索要校验项目归属）。
            本地项目里可以用下面这段提示词，复制到 GPT 或学术搜索里自己查。
          </div>
        </div>

        <p v-if="stageName" class="local-stage">当前阶段：{{ stageName }}（提示词里会带上它）</p>

        <label class="field-label" for="local-paper-prompt">检索提示词</label>
        <textarea id="local-paper-prompt" class="prompt-box" readonly :value="promptText"></textarea>
        <div class="prompt-actions">
          <button class="btn primary" type="button" @click="copyPrompt">复制提示词</button>
          <button class="btn" type="button" @click="router.push('/')">回工作台</button>
        </div>

        <template v-if="(localProject?.papers ?? []).length">
          <h3 class="local-subtitle">这个项目预置的检索方向</h3>
          <p class="local-note">来自题目模板，不是 AI 现场生成的；每条都附了可直接粘贴的检索提示词。</p>
          <article
            v-for="(item, index) in localProject?.papers ?? []"
            :key="`paper-${index}`"
            class="local-direction"
          >
            <h4>{{ item.title }}</h4>
            <p class="local-meta">{{ item.meta }}</p>
            <p v-if="item.why" class="local-why">{{ item.why }}</p>
            <a
              v-if="item.link"
              class="btn"
              :href="item.link"
              target="_blank"
              rel="noopener noreferrer"
            >打开论文链接</a>
          </article>
        </template>
      </div>
    </section>

    <!-- 云端项目：真实检索 -->
    <template v-else>
      <section class="card search-card">
        <div class="card-h">
          检索论文
          <span class="tag search-tag">真实论文 · 服务端代理 OpenAlex</span>
        </div>
        <div class="card-b">
          <form class="search-form" @submit.prevent="submit">
            <label class="field-label" for="paper-query">你想了解的方向</label>
            <div class="search-row">
              <input
                id="paper-query"
                v-model="query"
                type="text"
                :maxlength="PAPERS_QUERY_MAX_LENGTH"
                placeholder="例如：用 LSTM 预测近海波浪高度"
                autocomplete="off"
                :aria-invalid="inputError !== ''"
                aria-describedby="paper-query-hint"
              />
              <button class="btn primary" type="submit" :disabled="loading">
                {{ loading ? '检索中…' : '检索论文' }}
              </button>
            </div>
            <p id="paper-query-hint" class="search-hint">
              会带上项目名{{ stageName ? `和当前阶段「${stageName}」` : '' }}一起检索，返回最多
              {{ PAPERS_SEARCH_DEFAULT_LIMIT }} 篇；换方向重新检索，失败重试沿用同一次请求。
              <span class="search-count">{{ query.trim().length }}/{{ PAPERS_QUERY_MAX_LENGTH }}</span>
            </p>
            <p v-if="inputError" class="field-error" role="alert">{{ inputError }}</p>
          </form>

          <!-- 状态区：每种状态说的话不一样，不共用一句「暂无数据」 -->
          <p v-if="loading" class="search-loading" role="status">
            正在检索真实论文，通常几秒内返回…
          </p>

          <div v-if="status === 'fallback'" class="notice notice-warn" role="status">
            <div class="notice-text">
              <b>这次没连上论文检索服务，不是「没有相关论文」。</b><br />
              {{ notice || '检索服务暂时不可用，请稍后重试。' }}
            </div>
            <button class="btn" type="button" :disabled="loading" @click="retry">重试</button>
          </div>

          <div v-if="errorMessage !== ''" class="notice notice-error" role="alert">
            <div class="notice-text">
              <b>这次检索没有完成。</b><br />
              {{ errorMessage }}
              <template v-if="papers.length"> 下面保留的是上一次的结果。</template>
            </div>
            <button class="btn" type="button" :disabled="loading" @click="retry">重试</button>
          </div>

          <div v-if="!searched && status === 'idle'" class="empty-state search-idle">
            <h3>先写一个方向，再点「检索论文」</h3>
            <p>
              方向越具体，结果越贴近项目。比如「近海波浪高度预测」比「海洋」更容易命中；
              英文术语（wave height forecasting）通常比中文命中更多。
            </p>
          </div>

          <div v-if="showEmptyResult" class="empty-state">
            <h3>这次没有检索到论文</h3>
            <p>不是服务故障，是这条检索词太窄或太新。可以按顺序试：</p>
            <ul class="empty-tips">
              <li>换成本领域常用的英文术语，例如 wave height forecasting；</li>
              <li>去掉过细的限定词，先查大方向再逐步收窄；</li>
              <li>把方向写短一点（目前写的是 {{ lastQuery.length }} 字）。</li>
            </ul>
            <button class="btn" type="button" @click="copyPrompt">复制提示词到 GPT 再查</button>
          </div>

          <div v-if="showList" class="paper-list">
            <div class="paper-list-head">
              <span>找到 {{ papers.length }} 篇</span>
              <small v-if="loadedText()">{{ loadedText() }}</small>
            </div>
            <article v-for="(item, index) in papers" :key="`${item.title}-${index}`" class="paper">
              <h3 class="paper-title">{{ item.title }}</h3>
              <p class="paper-authors">{{ authorsText(item) }}</p>
              <p class="paper-meta">{{ metaText(item) }}</p>
              <div class="paper-actions">
                <a
                  v-if="item.openAccessUrl"
                  class="btn primary"
                  :href="item.openAccessUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                >开放获取全文</a>
                <a
                  v-if="item.doi"
                  class="btn"
                  :href="doiHref(item.doi)"
                  target="_blank"
                  rel="noopener noreferrer"
                  :title="`DOI：${item.doi}`"
                >DOI 链接</a>
                <span v-if="!item.openAccessUrl && !item.doi" class="paper-nolink">
                  这条没有公开链接，可以复制标题到学校图书馆或 GPT 检索。
                </span>
              </div>
            </article>
          </div>
        </div>
      </section>

      <!-- 提示词通道：检索不理想时的第二条路，保留但不喧宾夺主 -->
      <section class="card prompt-card">
        <div class="card-h">复制提示词到 GPT</div>
        <div class="card-b">
          <p class="search-hint">
            检索结果不满意时，可以把下面这段提示词复制到 GPT，让它按你的项目背景再筛一遍。
            这段提示词由项目名、当前阶段和你写的方向拼成，不调用模型。
          </p>
          <textarea class="prompt-box" readonly :value="promptText" aria-label="检索提示词"></textarea>
          <div class="prompt-actions">
            <button class="btn" type="button" @click="copyPrompt">复制提示词</button>
          </div>
        </div>
      </section>
    </template>
  </template>
</template>

<style scoped>
.mode-banner { overflow-wrap: anywhere; }
.field-label { display: block; font-size: 12.5px; font-weight: 600; color: #444441; margin-bottom: 6px; }
.search-form { display: grid; }
.search-row { display: flex; gap: 8px; align-items: stretch; }
.search-row input {
  flex: 1;
  min-width: 0;
  border: 1px solid #d3d1c7;
  border-radius: 9px;
  padding: 9px 12px;
  font: inherit;
  font-size: 13.5px;
  outline: none;
  transition: border-color .18s cubic-bezier(.2,.7,.3,1);
}
.search-row input:focus { border-color: #378ADD; }
.search-row input[aria-invalid='true'] { border-color: #F3B9B9; }
.search-row .btn { flex-shrink: 0; }
.search-hint { margin-top: 8px; font-size: 12px; color: #5f5e5a; line-height: 1.7; }
.search-count { float: right; color: #888780; font-variant-numeric: tabular-nums; }
.field-error { margin-top: 6px; font-size: 12px; color: #8A2A2A; }
.search-loading { margin-top: 12px; font-size: 12.5px; color: #185FA5; }
.search-idle { margin-top: 14px; }
.empty-tips { margin: 4px 0 10px; padding-left: 18px; font-size: 12.5px; color: #5f5e5a; line-height: 1.8; }
.notice { margin-top: 14px; }
.paper-list { margin-top: 16px; }
.paper-list-head { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; font-size: 12.5px; color: #444441; margin-bottom: 8px; }
.paper-list-head small { color: #888780; font-size: 11.5px; }
.paper { border: 1px solid #e3e2dd; border-radius: 12px; padding: 14px 15px; margin-bottom: 12px; background: #fff; }
.paper:last-child { margin-bottom: 0; }
.paper-title { font-size: 14px; font-weight: 600; line-height: 1.55; color: #2c2c2a; }
.paper-authors { margin-top: 6px; font-size: 12.5px; color: #444441; line-height: 1.6; }
.paper-meta { margin-top: 3px; font-size: 12px; color: #888780; }
.paper-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-top: 12px; }
.paper-nolink { font-size: 12px; color: #5f5e5a; line-height: 1.6; }
.prompt-card { margin-top: 14px; }
.prompt-box {
  width: 100%;
  min-height: 96px;
  margin-top: 8px;
  border: 1px solid #d3d1c7;
  border-radius: 9px;
  padding: 10px 12px;
  font: inherit;
  font-size: 12.5px;
  line-height: 1.7;
  color: #444441;
  background: #fbfaf7;
  resize: vertical;
}
.prompt-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
.local-papers { margin-bottom: 14px; }
.local-stage { margin-top: 10px; font-size: 12.5px; color: #444441; }
.local-subtitle { margin-top: 20px; font-size: 13.5px; font-weight: 600; }
.local-note { margin-top: 4px; font-size: 12px; color: #5f5e5a; line-height: 1.7; }
.local-direction { border-top: 1px dashed #efeee9; padding-top: 12px; margin-top: 12px; }
.local-direction h4 { font-size: 13.5px; line-height: 1.55; }
.local-meta { margin-top: 4px; font-size: 12px; color: #888780; }
.local-why { margin-top: 6px; font-size: 12.5px; color: #5f5e5a; line-height: 1.7; }
.local-direction .btn { margin-top: 10px; }
@media (max-width: 520px) {
  .search-row { flex-direction: column; }
  .search-row .btn { width: 100%; }
  .search-count { float: none; display: block; margin-top: 2px; }
  .paper { padding: 13px 12px; }
  .paper-actions .btn { flex: 1 1 auto; }
}
</style>
