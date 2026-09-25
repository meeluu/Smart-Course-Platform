<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import ProjectCreate from '@/components/ProjectCreate.vue'
import ProjectMindMap from '@/components/ProjectMindMap.vue'
import SuggestionCard from '@/components/SuggestionCard.vue'
import { CHINESE_NUM, WEEK_LABELS, useWorkbenchStore } from '@/stores/workbench'
import { deriveDoubtSnapshots, deriveEvidenceSnapshots } from '@/domain/activity'
import { buildTaskId, deriveProjectId } from '@/domain/progress'
import { buildDraftTaskId } from '@/domain/task'
import type { NewTaskDraft } from '@/domain/task'
import type { AdvisorFallbackReason, Recommendation } from '@/domain/recommendation'
import type { Milestone } from '@/types/platform'

/**
 * 工作台
 * ----------------------------------------------------------------------------
 * 没有项目时是创建页；有项目时是三栏工作台：
 *   左栏  我的项目 / 项目资料 / 里程碑进度 / 近 4 周活跃度 / 未解决的疑问
 *   中栏  AI 项目顾问（步骤建议）/ 项目地图 / 向顾问提问
 *   右栏  提交步骤证据 / 最近证据
 * 布局与内容与 platform-ui-mockup(3).html 一致。
 */
const store = useWorkbenchStore()
const router = useRouter()

const project = computed(() => store.current)

/* ------------------------------------------------------------ 流程条 */

const flowNodes = computed(() =>
  (project.value?.ms ?? []).map((m, i) => ({
    ...m,
    label: CHINESE_NUM[i],
    sub: m.s === 'done' ? '已完成' : m.s === 'cur' ? `${m.sub} · ${m.p}%` : '未开始',
  })),
)

/* -------------------------------------------------------- 里程碑徽标 */

function badge(m: Milestone, i: number) {
  if (m.s === 'done') return { cls: 'ms-dot ms-done', text: '✓' }
  if (m.s === 'cur') return { cls: 'ms-dot ms-cur', text: String(i + 1) }
  return { cls: 'ms-dot ms-todo', text: String(i + 1) }
}

/* ------------------------------------------------------------ 活跃度 */

const weekBars = computed(() => {
  const list = project.value?.weekly ?? [0, 0, 0, 0]
  const max = Math.max(...list, 1)
  return list.map((value, i) => ({
    value,
    height: Math.round((value / max) * 70),
    label: WEEK_LABELS[i].slice(5),
    hot: i === list.length - 1,
  }))
})

/* -------------------------------------------------------- 下一步建议 */

/**
 * 建议区
 * ----------------------------------------------------------------------------
 * 页面只调 store.refreshRecommendations：不直接 fetch、不拼后端地址、不碰任何密钥。
 * 六种状态的文案见 docs/contracts.md 5.3；错误一律映射成人话（5.2 要求不显示英文码）。
 */

/** 服务端规则兜底的原因 → 人话 */
const FALLBACK_REASON_TEXT: Record<AdvisorFallbackReason, string> = {
  MODEL_TIMEOUT: '模型响应超时',
  MODEL_UNAVAILABLE: '模型服务暂时不可用',
  MODEL_NOT_CONFIGURED: '服务端还没接入模型',
  INVALID_MODEL_OUTPUT: '模型返回的内容不符合要求',
  RATE_LIMITED: '请求太频繁',
}

/** 错误码 → 人话（含适配层的前端内部码；保留码也先留文案） */
const ERROR_TEXT: Record<string, string> = {
  INVALID_INPUT: '当前项目数据不符合接口要求',
  RATE_LIMITED: '请求太频繁，稍等再试',
  MODEL_TIMEOUT: '模型响应超时',
  INVALID_MODEL_OUTPUT: '模型返回的内容不符合要求',
  MODEL_UNAVAILABLE: '模型服务暂时不可用',
  MODEL_NOT_CONFIGURED: '服务端还没接入模型',
  NETWORK_ERROR: '连不上后端服务',
  INTERNAL: '服务端内部错误',
  STALE_REVISION: '项目版本和服务端对不上',
  UNAUTHORIZED: '没有通过服务端校验',
}

const aiStatus = computed(() => store.aiStatus)
const isRequesting = computed(() => store.aiStatus === 'loading')

/** 兜底/失败原因：优先用响应里的 fallbackReason，其次用适配层保留的错误码 */
const reasonText = computed(() => {
  const fallbackReason = store.advisor.fallbackReason
  if (fallbackReason !== null) return FALLBACK_REASON_TEXT[fallbackReason]

  const code = store.aiError?.code
  if (code !== undefined) {
    const text = ERROR_TEXT[code]
    if (text !== undefined) return text
  }
  return '原因未知'
})

const statusLine = computed(() => {
  switch (store.aiStatus) {
    case 'idle':
      return '还没有建议。点一下「获取建议」，AI 会结合项目当前状态、最近证据和未解决的疑问，给出 1～3 条下一步建议。'
    case 'loading':
      return '正在分析项目状态…'
    case 'model':
      return '以下建议由 AI 模型生成。展开「依据」可以看到它引用的是哪条证据或疑问。'
    case 'fallback':
      return `模型这次没能给出结果，下面是服务端规则生成的建议（原因：${reasonText.value}）。`
    case 'local-rule':
      return `后端这次不可用，下面是本地规则生成的建议（原因：${reasonText.value}）。`
    case 'error':
      return `建议没有生成出来：${reasonText.value}。可以重试，也可以先按自己的判断推进。`
    default:
      return ''
  }
})

const statusStyle = computed(() => {
  switch (store.aiStatus) {
    case 'fallback':
      return 'background:#FAEEDA;border-color:#FAC775;color:#854F0B;'
    case 'local-rule':
      return 'background:#f1efe8;border-color:#d3d1c7;color:#5f5e5a;'
    case 'error':
      return 'background:#FCEBEB;border-color:#F7C1C1;color:#A32D2D;'
    default:
      return ''
  }
})

const statusTag = computed(() => {
  switch (store.aiStatus) {
    case 'idle':
      return '未获取'
    case 'loading':
      return '分析中'
    case 'model':
      return 'AI 模型'
    case 'fallback':
      return '服务端规则'
    case 'local-rule':
      return '本地规则'
    case 'error':
      return '生成失败'
    default:
      return ''
  }
})

const requestLabel = computed(() => {
  if (isRequesting.value) return '分析中…'
  if (store.aiStatus === 'idle') return '获取建议'
  if (store.aiStatus === 'error' || store.aiStatus === 'local-rule') return '重试'
  return '重新获取'
})

/** 契约 5.3：loading 期间禁止重复点击触发并发请求 */
function requestSuggestions() {
  if (isRequesting.value) return

  void store
    .refreshRecommendations({ forceRefresh: store.aiStatus !== 'idle' })
    .catch((error: unknown) => {
      // store 内部已处理大多数失败，这里只兜住"请求还没发出去就出错"的异常
      console.warn('[建议] 请求未能完成', error instanceof Error ? error.name : 'unknown')
      store.toast('建议请求没能完成，请稍后再试')
    })
}

/**
 * 把建议里的 ID 解析回本地数据。
 * 复用 domain 里那套派生函数（ID 的生成规则只有一处），所以解析结果与发出请求时的 ID 必然一致；
 * 这里不自己解析 ID 字符串。
 */
const derived = computed(() => {
  const p = project.value
  if (!p) return null

  const reference = new Date()
  const evidence = deriveEvidenceSnapshots(p, reference)
  const doubts = deriveDoubtSnapshots(p, reference)

  return {
    evidenceById: new Map(
      evidence.map((item, index) => [
        item.evidenceId,
        { id: item.evidenceId, time: p.evidence[index]?.time ?? '', text: item.didWhat },
      ]),
    ),
    doubtById: new Map(doubts.map((item) => [item.doubtId, { id: item.doubtId, text: item.text }])),
  }
})

/* ---------------------------------------------------------------- 认领 */

/**
 * 认领（契约 5.4）
 * ----------------------------------------------------------------------------
 * 页面对外**只用** `claimTask`，两种入参各对应一种建议：
 *   existingTaskId 非空 → `claimTask({ taskId })`：认领已有任务
 *   existingTaskId 为 null → `claimTask({ draft })`：把"新任务候选"落成真实任务
 *
 * "已认领"由**项目状态**推导，不用页面局部状态：
 *   - 已有任务：看它在 store 里的任务状态（doing / done 都算已认领）
 *   - 新任务候选：draft 的 taskId 由内容派生，store 里已有同 id 任务就是已认领
 * 这样切换项目、重新获取建议之后按钮状态都不会说谎。
 */

const projectId = computed(() => (project.value ? deriveProjectId(project.value) : null))

/** 取建议里能作为任务的内容（字段与契约 3.2 的 NewTaskDraft 一致） */
function draftOf(suggestion: Recommendation): NewTaskDraft {
  return {
    title: suggestion.title,
    doneCriteria: suggestion.doneCriteria,
    requestId: suggestion.requestId,
    basisEvidenceIds: suggestion.basisEvidenceIds,
    basisDoubtIds: suggestion.basisDoubtIds,
  }
}

/** 与 store 创建任务时用的是同一个函数，避免两处各写一份 id 规则 */
function draftTaskIdOf(suggestion: Recommendation): string | null {
  const id = projectId.value
  if (id === null) return null
  return buildDraftTaskId(id, draftOf(suggestion))
}

type ClaimState = 'claimable' | 'claimed'

function claimStateOf(suggestion: Recommendation): ClaimState {
  if (suggestion.existingTaskId === null) {
    const draftTaskId = draftTaskIdOf(suggestion)
    return draftTaskId !== null && store.tasks.some((task) => task.taskId === draftTaskId)
      ? 'claimed'
      : 'claimable'
  }

  const status = store.taskStatusById[suggestion.existingTaskId]
  return status === 'doing' || status === 'done' ? 'claimed' : 'claimable'
}

/** 认领失败 → 中文提示（契约 3.3 的本地错误码，不把英文码给用户看） */
const CLAIM_ERROR_TEXT: Record<string, string> = {
  NOT_FOUND: '这个任务已经不在当前项目里，请重新获取建议',
  TASK_NOT_CLAIMABLE: '这个任务已经完成，不需要再认领',
  INVALID_INPUT: '这条建议缺少必要内容，暂时无法创建任务',
  PROJECT_MISMATCH: '这条建议属于另一个项目，已忽略',
  STORAGE_FULL: '本地存储已满，任务没有保存成功',
}

function claimFailureMessage(code: string): string {
  return CLAIM_ERROR_TEXT[code] ?? '认领没能完成，请稍后再试'
}

const suggestionViews = computed(() =>
  store.recommendations.map((suggestion, index) => {
    const d = derived.value
    return {
      suggestion,
      index,
      claimState: claimStateOf(suggestion),
      evidence:
        d === null
          ? []
          : suggestion.basisEvidenceIds.map(
              (id) => d.evidenceById.get(id) ?? { id, time: '', text: '（本次请求里没有这条证据）' },
            ),
      doubts:
        d === null
          ? []
          : suggestion.basisDoubtIds.map(
              (id) => d.doubtById.get(id) ?? { id, text: '（本次请求里没有这条疑问）' },
            ),
    }
  }),
)

/** 认领一条建议：已有任务传 taskId，新任务候选传 draft */
function claimSuggestion(suggestion: Recommendation) {
  const result =
    suggestion.existingTaskId === null
      ? store.claimTask({ draft: draftOf(suggestion) })
      : store.claimTask({ taskId: suggestion.existingTaskId })

  if (!result.ok) store.toast(claimFailureMessage(result.code))
}

/** 顾问列表里的「认领这一步」：同样只走 claimTask（taskId 由步骤下标换算） */
function claimStepTask(stepIndex: number) {
  const id = projectId.value
  if (id === null) return

  const result = store.claimTask({ taskId: buildTaskId(id, stepIndex) })
  if (!result.ok) store.toast(claimFailureMessage(result.code))
}

/* -------------------------------------------------------------- 材料 */

const manualInput = ref<HTMLInputElement | null>(null)
const dataInput = ref<HTMLInputElement | null>(null)
const otherInput = ref<HTMLInputElement | null>(null)

function upload(type: '实验手册' | '数据集' | '材料', event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  store.uploadMaterial(type, file.name)
  input.value = ''
}

function materialStyle(type: string) {
  if (type === '实验手册') return 'background:#EEEDFE;color:#3C3489;border:1px solid #CECBF6;'
  if (type === '数据集') return 'background:#E1F5EE;color:#0F6E56;border:1px solid #9FE1CB;'
  return 'background:#f1efe8;color:#5f5e5a;border:1px solid #d3d1c7;'
}

/* -------------------------------------------------------------- 问答 */

const chat = ref('')
const chatLog = ref<HTMLElement | null>(null)

async function send() {
  const text = chat.value
  if (!text.trim()) return
  chat.value = ''
  store.sendChat(text)
  await scrollChat()
}

async function scrollChat() {
  await nextTick()
  if (chatLog.value) chatLog.value.scrollTop = chatLog.value.scrollHeight
}

watch(() => project.value?.chat.length, scrollChat)

/* -------------------------------------------------------- 提交证据 */

const form = reactive({
  stepLabel: '',
  didWhat: '',
  foundWhat: '',
  solved: '',
  unsure: '',
  attachment: null as string | null,
})

const evidenceInput = ref<HTMLInputElement | null>(null)

const stepOptions = computed(() =>
  (project.value?.steps ?? []).map((s, i) => `步骤 ${i + 1} · ${s.t}`).concat(['其他进展']),
)

watch(
  () => project.value,
  (p) => {
    if (p && !form.stepLabel) form.stepLabel = `步骤 1 · ${p.steps[0]?.t ?? ''}`
  },
  { immediate: true },
)

function pickEvidenceFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  form.attachment = file.name
}

function submitEvidence() {
  store.submitEvidence({ ...form })
  if (!store.toastText.startsWith('请先')) {
    form.didWhat = ''
    form.foundWhat = ''
    form.solved = ''
    form.unsure = ''
    form.attachment = null
  }
}
</script>

<template>
  <!-- 空状态：创建项目 -->
  <ProjectCreate v-if="store.creating || !project" />

  <!-- 项目工作台 -->
  <div v-else>
    <!-- 穿插可视化①：流程条 -->
    <div class="card">
      <div class="card-b" style="padding:10px 14px 4px;">
        <div class="flow">
          <template v-for="(node, index) in flowNodes" :key="index">
            <div class="flow-node" :class="node.s">
              <div class="fn-t">{{ node.label }} {{ node.t }}</div>
              <div class="fn-s">{{ node.sub }}</div>
            </div>
            <div v-if="index < flowNodes.length - 1" class="flow-arrow">→</div>
          </template>
        </div>
      </div>
    </div>

    <div class="stu-grid">
      <!-- ---------------------------------------------------------- 左栏 -->
      <div>
        <div class="card" style="margin-bottom:14px;">
          <div class="card-h">我的项目</div>
          <div class="card-b">
            <select
              class="proj-select"
              :value="store.curIdx"
              @change="store.selectProject(Number(($event.target as HTMLSelectElement).value))"
            >
              <option v-for="(item, i) in store.projects" :key="i" :value="i">{{ item.name }}</option>
            </select>
            <div style="font-size:12px;color:#888780;line-height:1.7;margin-bottom:8px;">
              {{ project.group }} · {{ project.members }}<br />{{ project.updated }}
            </div>
            <button class="btn" style="width:100%;" @click="store.showCreate()">＋ 新建项目</button>
          </div>
        </div>

        <div class="card" style="margin-bottom:14px;">
          <div class="card-h">
            项目资料
            <span class="tag" style="background:#EEEDFE;color:#3C3489;border:1px solid #CECBF6;">
              AI 追踪依据
            </span>
          </div>
          <div class="card-b">
            <div v-if="project.materials.length">
              <div v-for="(m, i) in project.materials" :key="i" class="mat-item">
                <span class="mat-name" :title="m.name">{{ m.name }}</span>
                <span class="tag mat-tag" :style="materialStyle(m.type)">{{ m.type }}</span>
              </div>
            </div>
            <div v-else class="empty" style="padding:4px 0 8px;">
              还没有上传材料。上传实验手册或数据集后，AI 会解析内容并更精准地追踪步骤。
            </div>

            <div class="up-row">
              <button class="btn" @click="manualInput?.click()">＋手册</button>
              <button class="btn" @click="dataInput?.click()">＋数据</button>
              <button class="btn" @click="otherInput?.click()">＋其他</button>
            </div>
            <input ref="manualInput" type="file" style="display:none" @change="upload('实验手册', $event)" />
            <input ref="dataInput" type="file" style="display:none" @change="upload('数据集', $event)" />
            <input ref="otherInput" type="file" style="display:none" @change="upload('材料', $event)" />
          </div>
        </div>

        <div class="card" style="margin-bottom:14px;">
          <div class="card-h">里程碑进度</div>
          <div class="card-b">
            <div v-for="(m, i) in project.ms" :key="i" class="milestone">
              <div :class="badge(m, i).cls">{{ badge(m, i).text }}</div>
              <div style="flex:1">
                <div class="ms-name">{{ m.t }}</div>
                <div class="ms-sub">{{ m.sub }}</div>
                <div v-if="m.s === 'cur'" class="ms-bar"><i :style="`width:${m.p}%`"></i></div>
              </div>
            </div>
          </div>
        </div>

        <div class="card" style="margin-bottom:14px;">
          <div class="card-h">近 4 周活跃度</div>
          <div class="card-b" style="padding:8px;">
            <div class="week-bars">
              <div v-for="(bar, i) in weekBars" :key="i" class="wb" :class="{ hot: bar.hot }">
                <b>{{ bar.value }}</b>
                <i :style="`height:${bar.height}px`"></i>
                <span>{{ bar.label }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-h">
            未解决的疑问
            <span
              class="tag"
              style="background:#FAEEDA;color:#854F0B;border:1px solid #FAC775;"
            >{{ project.doubts.length }}</span>
          </div>
          <div class="card-b" style="padding-top:6px;">
            <div v-for="(d, i) in project.doubts" :key="i" class="doubt">
              {{ d }}
              <button
                class="btn"
                style="margin-top:6px;padding:3px 10px;font-size:11.5px;"
                @click="store.resolveDoubt(i)"
              >
                标记已解决
              </button>
            </div>
            <div v-if="!project.doubts.length" class="empty">
              暂无疑问。推进中产生的不确定会记录在这里。
            </div>
          </div>
        </div>
      </div>

      <!-- ---------------------------------------------------------- 中栏 -->
      <div>
        <!-- 建议区：六种状态与文案见 docs/contracts.md 5.3，请求只经过 store -->
        <div class="card" style="margin-bottom:14px;">
          <div class="card-h">
            AI 下一步建议
            <span class="tag" style="background:#E6F1FB;color:#185FA5;border:1px solid #B5D4F4;">
              {{ statusTag }}
            </span>
          </div>
          <div class="card-b">
            <div class="ai-banner" :style="statusStyle">{{ statusLine }}</div>

            <div class="sc-actions" style="margin-top:0;margin-bottom:4px;">
              <button class="btn primary" :disabled="isRequesting" @click="requestSuggestions">
                {{ requestLabel }}
              </button>
            </div>

            <SuggestionCard
              v-for="view in suggestionViews"
              :key="view.suggestion.id"
              :suggestion="view.suggestion"
              :index="view.index"
              :claim-state="view.claimState"
              :evidence="view.evidence"
              :doubts="view.doubts"
              @claim="claimSuggestion(view.suggestion)"
            />

            <div
              v-if="!suggestionViews.length && !isRequesting && aiStatus !== 'error'"
              class="empty"
              style="padding:4px 0 0;"
            >
              {{ aiStatus === 'idle' ? '点上方按钮开始。' : '这次没有生成建议，可以点上方按钮重新获取。' }}
            </div>
          </div>
        </div>

        <div class="card" style="margin-bottom:14px;">
          <div class="card-h">
            AI 项目顾问
            <span class="tag" style="background:#EEEDFE;color:#3C3489;border:1px solid #CECBF6;">
              基于项目状态与上传材料
            </span>
          </div>
          <div class="card-b">
            <div class="ai-banner">{{ project.banner }}</div>

            <div v-for="(s, i) in project.steps" :key="i" class="step-card">
              <div class="sc-top">
                <div class="sc-no">{{ i + 1 }}</div>
                <div class="sc-title">{{ s.t }}</div>
                <span
                  class="tag sc-owner"
                  style="background:#E6F1FB;color:#185FA5;border:1px solid #B5D4F4;"
                >建议：{{ s.owner }}</span>
              </div>
              <div class="sc-why"><b>为什么现在做：</b>{{ s.why }}</div>
              <div class="sc-done">{{ s.done }}</div>
              <div class="sc-actions">
                <button class="btn primary" @click="claimStepTask(i)">认领这一步</button>
                <button class="btn" @click="store.askAboutStep(i)">就此提问</button>
                <button class="btn" @click="router.push('/papers')">相关论文</button>
              </div>
            </div>
          </div>
        </div>

        <!-- 穿插可视化②：项目地图 -->
        <div class="card" style="margin-bottom:14px;">
          <div class="card-h">
            项目地图
            <span
              class="tag"
              style="background:#E6F1FB;color:#185FA5;border:1px solid #B5D4F4;"
            >{{ project.short }}</span>
          </div>
          <div class="card-b">
            <ProjectMindMap :project="project" />
            <div style="font-size:12px;color:#888780;text-align:center;margin-top:4px;">
              左侧为里程碑，右侧为 AI 正在追踪的当前实际步骤 · 绿=已完成，蓝=进行中，灰=未开始
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-h">
            向顾问提问
            <span class="tag" style="background:#f1efe8;color:#5f5e5a;border:1px solid #d3d1c7;">
              答疑模式 · 给提示不给答案
            </span>
          </div>
          <div class="card-b">
            <div ref="chatLog" class="chat-log">
              <div v-for="(msg, i) in project.chat" :key="i" class="msg" :class="{ me: msg.me }">
                <div>
                  <div class="who" :style="msg.me ? 'text-align:right;' : ''">{{ msg.who }}</div>
                  <div class="bubble">{{ msg.text }}</div>
                </div>
              </div>
            </div>
            <div class="chat-input">
              <input
                v-model="chat"
                placeholder="描述你卡住的问题，AI 会结合项目状态回答…"
                @keydown.enter="send"
              />
              <button class="btn primary" @click="send">发送</button>
            </div>
          </div>
        </div>
      </div>

      <!-- ---------------------------------------------------------- 右栏 -->
      <div>
        <div class="card" style="margin-bottom:14px;">
          <div class="card-h">提交步骤证据</div>
          <div class="card-b evi-form">
            <label>对应步骤</label>
            <select v-model="form.stepLabel" class="proj-select" style="margin-bottom:0;">
              <option v-for="opt in stepOptions" :key="opt" :value="opt">{{ opt }}</option>
            </select>

            <label>完成了什么</label>
            <textarea v-model="form.didWhat" placeholder="一句话说明产出"></textarea>

            <label>发现了什么 <small>（意外收获、异常现象都算）</small></label>
            <textarea v-model="form.foundWhat"></textarea>

            <label>解决了哪个问题</label>
            <textarea v-model="form.solved"></textarea>

            <label>还有什么不确定</label>
            <textarea v-model="form.unsure" placeholder="写下来的会进入左侧「未解决的疑问」"></textarea>

            <div class="upbox" style="margin-top:12px;" :class="{ has: form.attachment }" @click="evidenceInput?.click()">
              <template v-if="form.attachment">✓ 附件：{{ form.attachment }}</template>
              <template v-else>＋ 附加 notebook、截图或结果文件</template>
            </div>
            <input ref="evidenceInput" type="file" style="display:none" @change="pickEvidenceFile" />

            <button class="submit" @click="submitEvidence">提交并更新项目状态</button>
          </div>
        </div>

        <div class="card">
          <div class="card-h">最近证据</div>
          <div class="card-b" style="padding-top:8px;">
            <div class="tl">
              <div v-for="(item, i) in project.evidence" :key="i" class="tl-item">
                <div class="tl-time">{{ item.time }}</div>
                <div class="tl-text">{{ item.text }}</div>
                <div class="tl-who">{{ item.who }}</div>
              </div>
              <div v-if="!project.evidence.length" class="empty" style="padding-left:0;">
                还没有证据记录。完成第一步后，记得回来提交——AI 会根据你的证据更新项目状态，再给出下一步建议。
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
