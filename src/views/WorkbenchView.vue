<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AiStatus from '@/components/AiStatus.vue'
import EvidenceForm from '@/components/EvidenceForm.vue'
import ProjectCreate from '@/components/ProjectCreate.vue'
import ProjectMindMap from '@/components/ProjectMindMap.vue'
import RecommendationList from '@/components/RecommendationList.vue'
import { CHINESE_NUM, WEEK_LABELS, useWorkbenchStore } from '@/stores/workbench'
import { deriveDoubtSnapshots, deriveEvidenceSnapshots } from '@/domain/activity'
import type { AdvisorFallbackReason, Recommendation, SubmitEvidenceInput } from '@/domain/recommendation'
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

/**
 * 空白项目：创建后还没有任何任务、证据与疑问，也就是用户尚未输入任何项目内容。
 * 这类项目不该显示"伪造的建议依据"，而是提示先补材料或目标（见 createProject 的新语义）。
 */
const isBlankProject = computed(() => {
  const p = project.value
  if (!p) return false
  return (
    (p.tasks?.length ?? 0) === 0 &&
    (p.evidenceRecords?.length ?? 0) === 0 &&
    (p.doubtRecords?.length ?? 0) === 0 &&
    (p.materials?.length ?? 0) === 0
  )
})

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
      return isBlankProject.value
        ? '这是一个空白项目。先上传材料、填写项目目标或提交第一条进展，再点「获取建议」，AI 才有可分析的依据。'
        : '还没有建议。点一下「获取建议」，AI 会结合项目当前状态、最近证据和未解决的疑问，给出 1～3 条下一步建议。'
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

const statusTone = computed(() => {
  if (store.aiStatus === 'idle') return 'neutral'
  return store.aiStatus
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
  if (isBlankProject.value) return '等待项目内容'
  if (store.aiStatus === 'idle') return '获取建议'
  if (store.aiStatus === 'error' || store.aiStatus === 'local-rule') return '重试'
  return '重新获取'
})

/** 契约 5.3：loading 期间禁止重复点击触发并发请求 */
function requestSuggestions() {
  if (isRequesting.value || isBlankProject.value) return

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

/** 契约 5.4 第 4 条：同一条建议重复点击只认领一次 */
const claimedIds = ref<string[]>([])

watch(
  () => project.value?.projectId,
  () => {
    claimedIds.value = []
  },
)

type ClaimState = 'claimable' | 'claimed' | 'draft'

function claimStateOf(suggestion: Recommendation): ClaimState {
  if (claimedIds.value.includes(suggestion.id)) return 'claimed'
  if (suggestion.existingTaskId === null) return 'draft'
  return 'claimable'
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

/** 认领已有任务，或把新任务候选保存为进行中的正式任务。 */
function claimSuggestion(suggestion: Recommendation) {
  if (claimedIds.value.includes(suggestion.id)) return

  const result =
    suggestion.existingTaskId === null
      ? store.claimTask({
          draft: {
            title: suggestion.title,
            doneCriteria: suggestion.doneCriteria,
            requestId: suggestion.requestId,
            basisEvidenceIds: suggestion.basisEvidenceIds,
            basisDoubtIds: suggestion.basisDoubtIds,
          },
        })
      : store.claimTask({ taskId: suggestion.existingTaskId })
  if (!result.ok) {
    store.toast(result.message)
    return
  }

  claimedIds.value = [...claimedIds.value, suggestion.id]
}

function claimLegacyStep(stepIndex: number) {
  const task = project.value?.tasks[stepIndex]
  if (task === undefined) {
    store.toast('这条任务已经不在当前项目里，请重新获取建议')
    return
  }

  const result = store.claimTask({ taskId: task.id })
  if (!result.ok) store.toast(result.message)
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

const evidenceForm = ref<InstanceType<typeof EvidenceForm> | null>(null)
const evidenceSubmitting = ref(false)
const savedEvidenceAt = ref('')
const savedEvidenceHint = ref('')

watch(
  () => project.value?.projectId,
  () => {
    savedEvidenceAt.value = ''
    savedEvidenceHint.value = ''
  },
)

async function submitEvidence(input: SubmitEvidenceInput) {
  if (evidenceSubmitting.value) return
  evidenceSubmitting.value = true
  try {
    const result = await store.submitEvidence(input)
    if (result.ok) {
      evidenceForm.value?.reset()
      savedEvidenceAt.value = new Date().toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
      const usedRuleRecommendation = store.aiStatus === 'fallback' || store.aiStatus === 'local-rule'
      savedEvidenceHint.value = usedRuleRecommendation
        ? '建议暂时使用规则结果'
        : store.aiStatus === 'error'
          ? '建议生成失败，请查看建议区并重试'
          : '建议由 AI 模型生成'
      if (store.aiStatus !== 'model') {
        store.toast(`证据已保存，${savedEvidenceHint.value}`)
      }
    } else {
      // 失败时不重置组件，保留用户已经填写的内容以便修正后重试。
      store.toast(result.message)
    }
  } catch (error: unknown) {
    console.warn('[证据] 提交未能完成', error instanceof Error ? error.name : 'unknown')
    store.toast('证据没有保存，请稍后重试')
  } finally {
    evidenceSubmitting.value = false
  }
}

const openDoubts = computed(() =>
  (project.value?.doubtRecords ?? []).filter((doubt) => doubt.status === 'open'),
)
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
              :value="project.projectId"
              @change="store.selectProject(($event.target as HTMLSelectElement).value)"
            >
              <option v-for="item in store.projects" :key="item.projectId" :value="item.projectId">{{ item.name }}</option>
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
            >{{ openDoubts.length }}</span>
          </div>
          <div class="card-b" style="padding-top:6px;">
            <div v-for="doubt in openDoubts" :key="doubt.id" class="doubt">
              {{ doubt.text }}
              <button
                class="btn"
                style="margin-top:6px;padding:3px 10px;font-size:11.5px;"
                @click="store.resolveDoubt(doubt.id)"
              >
                标记已解决
              </button>
            </div>
            <div v-if="!openDoubts.length" class="empty">
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
          </div>
          <div class="card-b">
            <AiStatus
              :tone="statusTone"
              :tag="statusTag"
              :message="statusLine"
              :action-label="requestLabel"
              :busy="isRequesting || isBlankProject"
              @retry="requestSuggestions"
            />

            <RecommendationList :items="suggestionViews" @claim="claimSuggestion" />

            <div
              v-if="!suggestionViews.length && !isRequesting && aiStatus !== 'error'"
              class="empty"
              style="padding:4px 0 0;"
            >
              {{
                aiStatus === 'idle'
                  ? isBlankProject
                    ? '空白项目还没有可分析的依据：先补充材料或项目目标。'
                    : '点上方按钮开始。'
                  : '这次没有生成建议，可以点上方按钮重新获取。'
              }}
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

            <div v-if="!project.steps.length" class="empty">
              当前还没有项目步骤。
            </div>

            <div v-for="(step, index) in project.steps" :key="step.t" class="step-card">
              <div class="sc-top">
                <div class="sc-no">{{ index + 1 }}</div>
                <div class="sc-title">{{ step.t }}</div>
                <span
                  class="tag sc-owner"
                  style="background:#E6F1FB;color:#185FA5;border:1px solid #B5D4F4;"
                >建议：{{ step.owner }}</span>
              </div>
              <div class="sc-why"><b>为什么现在做：</b>{{ step.why }}</div>
              <div class="sc-done">{{ step.done }}</div>
              <div class="sc-actions">
                <button class="btn primary" @click="claimLegacyStep(index)">认领这一步</button>
                <button class="btn" @click="store.askAboutStep(index)">就此提问</button>
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
            <div v-if="!project.steps.length" class="empty" style="padding:4px 0;">
              还没有任务。上传材料或提交项目目标后，AI 会生成项目步骤。
            </div>
            <template v-else>
              <ProjectMindMap :project="project" />
              <div style="font-size:12px;color:#888780;text-align:center;margin-top:4px;">
                左侧为里程碑，右侧为 AI 正在追踪的当前实际步骤 · 绿=已完成，蓝=进行中，灰=未开始
              </div>
            </template>
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
              <div v-if="!project.chat.length" class="empty" style="padding:4px 0;">
                还没有对话。把你卡住的地方或想确认的事写下来，AI 会结合当前项目状态回答。
              </div>
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
          <div class="card-b">
            <div v-if="savedEvidenceAt" class="evidence-save-status" role="status" aria-live="polite">
              <strong>证据已保存（{{ savedEvidenceAt }}）</strong>
              <span> · {{ savedEvidenceHint }}</span>
            </div>
            <EvidenceForm
              ref="evidenceForm"
              :tasks="project.tasks"
              :project-key="project.projectId"
              :submitting="evidenceSubmitting"
              @submit="submitEvidence"
            />
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

<style scoped>
.evidence-save-status {
  border: 1px solid #9FE1CB;
  border-radius: 10px;
  padding: 8px 10px;
  margin-bottom: 12px;
  background: #E1F5EE;
  color: #0F6E56;
  font-size: 12px;
  line-height: 1.5;
}
</style>
