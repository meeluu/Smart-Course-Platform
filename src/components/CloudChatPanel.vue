<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useCloudStore } from '@/stores/cloud'
import { MAX_ADVISOR_CHAT_QUESTION_LENGTH } from '@/domain/recommendation'
import type { AdvisorFallbackReason } from '@/domain/recommendation'

/**
 * AI 顾问（云端聊天，契约 6.4 / 23.7 / 30）
 * ----------------------------------------------------------------------------
 * 三条边界，写在页面上而不是只写在注释里：
 *   1. 云端项目的对话会存到账号里，刷新、换设备、重新登录后还在；历史没拉到时
 *      只说「没拉到」，不把「这次会话」说成「没有历史」；
 *   2. 失败时保留原问题（`chat.pendingQuestion`），用户可以一键重试，不用重打；
 *   3. 来源与依据说人话：模型 / 服务端规则、引用到哪份材料的哪几行，
 *      历史消息没有来源字段时标「历史记录」，不冒充 AI 模型回答。
 *
 * 会话清空交给 store：切换项目时 `openProject()` 会重置 chat 状态并重新拉历史，
 * 本组件**不再**监听项目变化去 clearChat——那样会把刚恢复的历史又抹掉。
 */
const cloud = useCloudStore()

const question = ref('')
const listRef = ref<HTMLElement | null>(null)

const chat = computed(() => cloud.chat)
const sending = computed(() => chat.value.status === 'loading')
const messages = computed(() => chat.value.messages)
const failed = computed(() => chat.value.error !== null && chat.value.pendingQuestion !== null)

const historyStatus = computed(() => chat.value.historyStatus ?? 'idle')
/** 只有真的拿到会话 ID 才算「已保存到云端」；undefined / null 都按未连接处理 */
const savedToCloud = computed(() => chat.value.sessionId !== null && chat.value.sessionId !== undefined)
const historyLoading = computed(() => historyStatus.value === 'loading')
const historyFailed = computed(() => historyStatus.value === 'error')

const SOURCE_TEXT: Record<'model' | 'fallback', string> = {
  model: 'AI 模型回答',
  fallback: '服务端规则回答',
}

const FALLBACK_TEXT: Record<AdvisorFallbackReason, string> = {
  MODEL_TIMEOUT: '模型响应超时，这条回答由服务端规则生成',
  MODEL_UNAVAILABLE: '模型服务暂时不可用，这条回答由服务端规则生成',
  MODEL_NOT_CONFIGURED: '当前环境没有配置模型，这条回答由服务端规则生成',
  INVALID_MODEL_OUTPUT: '模型输出不合规，这条回答由服务端规则生成',
  RATE_LIMITED: '请求过于频繁，这条回答由服务端规则生成',
}

/**
 * 契约 30.2：历史消息没有 `source`（运行期是 undefined）。
 * 这里显式分支，避免 `SOURCE_TEXT[undefined]` 渲染成空，也避免类型不安全。
 */
function sourceText(message: (typeof messages.value)[number]): string {
  if (message.source === undefined) return '历史记录'
  return SOURCE_TEXT[message.source]
}

function fallbackText(message: (typeof messages.value)[number]): string | null {
  if (message.source !== 'fallback') return null
  const reason = message.fallbackReason as AdvisorFallbackReason | null | undefined
  if (reason === null || reason === undefined) return '这条回答由服务端规则生成'
  return FALLBACK_TEXT[reason] ?? '这条回答由服务端规则生成'
}

/**
 * 保存状态只在**助手消息**上标注：
 * - 学生消息服务端不单独回 messageId，标「已保存」会说了不算；
 * - `messageId === null` 表示没落库（落库失败），此时不能显示「已保存」。
 */
function persistText(message: (typeof messages.value)[number]): string {
  if (message.role !== 'assistant') return ''
  if (message.persisted === true && (message.messageId ?? null) !== null) return '已保存到云端'
  if (savedToCloud.value) return '未保存到云端'
  return ''
}

function citationText(startLine: number, endLine: number, name: string): string {
  return `${name} 第 ${startLine}–${endLine} 行`
}

async function scrollToBottom(): Promise<void> {
  await nextTick()
  const element = listRef.value
  if (element !== null) element.scrollTop = element.scrollHeight
}

watch(
  () => messages.value.length,
  () => {
    void scrollToBottom()
  },
)

watch(historyStatus, (value) => {
  if (value === 'ready') void scrollToBottom()
})

async function send(): Promise<void> {
  const text = question.value.trim()
  if (text === '' || sending.value) return
  const result = await cloud.sendChat({ question: text })
  if (result.ok) question.value = ''
  await scrollToBottom()
}

async function retry(): Promise<void> {
  if (sending.value) return
  await cloud.retryChat()
  await scrollToBottom()
}

/**
 * 历史拉到一半失败时就地重试。
 *
 * 这里不复用上面那个 `retry()`：它重发的是**最后一条提问**，与「补拉历史」是两件事，
 * 混在一起会让学生以为点一下会把问题再问一遍。
 * `loadChatHistory` 自己会把 historyStatus 置为 loading，界面据此显示「恢复中…」。
 */
async function retryHistory(): Promise<void> {
  if (historyLoading.value) return
  await cloud.loadChatHistory()
  await scrollToBottom()
}

function clear(): void {
  cloud.clearChat()
  question.value = ''
}
</script>

<template>
  <section class="card chat-card">
    <div class="card-h chat-head">
      <span>AI 顾问</span>
      <span class="badge" :class="{ 'badge-warn': historyFailed, 'badge-muted': historyLoading }">
        <template v-if="historyFailed">历史未拉到</template>
        <template v-else-if="historyLoading">恢复中…</template>
        <template v-else-if="savedToCloud">已保存到云端</template>
        <template v-else>本次会话</template>
      </span>
      <button
        v-if="messages.length > 0 || question !== ''"
        class="btn"
        type="button"
        :disabled="sending"
        title="只清空这一屏；云端已保存的对话下次进入项目还会显示"
        @click="clear"
      >
        清空屏幕
      </button>
    </div>

    <div class="card-b">
      <p class="chat-note">
        <template v-if="savedToCloud">
          对话会保存到你的账号：刷新、换设备、重新登录后还能看到。
        </template>
        <template v-else>
          还没连上云端会话：这一屏的对话先从内存显示，连上后会保存。
        </template>
        回答只依据当前阶段、任务、记录和你已确认的材料要点。
      </p>

      <div v-if="historyFailed" class="notice notice-warn chat-history-notice" role="status">
        <div class="notice-text">
          <b>历史记录暂时没拉到。</b><br />
          下面只是这次打开后的对话，不代表以前没聊过。可以点右边再试一次；
          现在提问不会丢，回答照常显示。
        </div>
        <button class="btn" type="button" :disabled="historyLoading" @click="retryHistory">
          {{ historyLoading ? '恢复中…' : '重试' }}
        </button>
      </div>
      <p v-else-if="historyLoading && messages.length === 0" class="hint">正在恢复之前的对话…</p>

      <div ref="listRef" class="chat-list">
        <p v-if="messages.length === 0 && !sending" class="hint">
          <template v-if="historyFailed">
            历史没拉到，先从这次会话开始：可以问「当前阶段下一步该做什么」「这个结论还缺什么记录」。
          </template>
          <template v-else>
            还没有对话。可以问「当前阶段下一步该做什么」「这个结论还缺什么记录」。
          </template>
        </p>

        <div
          v-for="message in messages"
          :key="message.clientId"
          class="chat-message"
          :class="message.role"
        >
          <div class="chat-bubble">
            <p class="chat-text">{{ message.text }}</p>

            <div v-if="message.role === 'assistant'" class="chat-meta">
              <span class="badge">{{ sourceText(message) }}</span>
              <span v-if="persistText(message)" class="chat-persist">{{ persistText(message) }}</span>
              <small v-if="fallbackText(message)">{{ fallbackText(message) }}</small>
            </div>

            <ul v-if="message.role === 'assistant' && message.citations.length" class="chat-citations">
              <li v-for="citation in message.citations" :key="`${message.clientId}-${citation.segmentId}`">
                依据：{{ citationText(citation.startLine, citation.endLine, citation.materialName) }}
              </li>
            </ul>
          </div>
        </div>

        <p v-if="sending" class="hint thinking">正在思考…</p>
      </div>

      <div v-if="failed" class="cloud-error chat-error">
        <span>{{ chat.error?.message ?? '这次提问没有成功，请重试' }}</span>
        <button class="btn" type="button" :disabled="sending" @click="retry">重试</button>
      </div>

      <form class="chat-composer" @submit.prevent="send">
        <textarea
          v-model="question"
          :maxlength="MAX_ADVISOR_CHAT_QUESTION_LENGTH"
          placeholder="问一个和当前阶段有关的具体问题"
          aria-label="向 AI 顾问提问"
          :disabled="sending"
          required
        ></textarea>
        <button class="btn primary" type="submit" :disabled="sending || question.trim() === ''">
          {{ sending ? '发送中…' : '发送' }}
        </button>
      </form>
    </div>
  </section>
</template>

<style scoped>
.chat-card { margin-bottom: 20px; }
.chat-head { flex-wrap: wrap; gap: 8px; }
.chat-head .badge { background: #eef4fb; color: #185FA5; border-color: #b8d3ee; }
.chat-head .badge-warn { background: #FAEEDA; color: #854F0B; border-color: #FAC775; }
.chat-head .badge-muted { background: #f1efe8; color: #5f5e5a; border-color: #d3d1c7; }
.chat-head .btn { margin-left: auto; padding: 4px 10px; font-size: 11.5px; }
.chat-note { margin-bottom: 10px; padding: 8px 10px; background: #fbfaf7; border: 1px solid #e4e2da; border-radius: 8px; color: #5f5e5a; font-size: 12px; line-height: 1.7; }
.chat-history-notice { margin-bottom: 10px; }
.chat-list { max-height: 360px; overflow: auto; display: grid; gap: 10px; padding: 2px; }
.hint { color: #5f5e5a; font-size: 12.5px; line-height: 1.7; }
.thinking { color: #185FA5; }
.chat-message { display: flex; }
.chat-message.user { justify-content: flex-end; }
.chat-bubble { max-width: 88%; border-radius: 12px; padding: 9px 12px; border: 1px solid #e3e2dd; background: #fcfcfa; }
.chat-message.user .chat-bubble { background: #eef4fb; border-color: #b8d3ee; }
.chat-text { white-space: pre-wrap; font-size: 13px; line-height: 1.7; color: #2c2c2a; overflow-wrap: anywhere; }
.chat-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 7px; }
.chat-meta small { color: #854F0B; font-size: 11.5px; }
.chat-persist { font-size: 11.5px; color: #5f5e5a; }
.badge { display: inline-block; padding: 1px 7px; border-radius: 999px; font-size: 11px; font-weight: 600; background: #f1efe8; color: #5f5e5a; border: 1px solid #d3d1c7; }
.chat-citations { margin-top: 7px; padding-left: 16px; list-style: disc; }
.chat-citations li { font-size: 11.5px; color: #5f5e5a; line-height: 1.6; }
.chat-error { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 10px; }
.chat-error .btn { padding: 4px 10px; font-size: 11.5px; }
.chat-composer { display: flex; gap: 8px; align-items: flex-end; margin-top: 12px; }
.chat-composer textarea { flex: 1; min-height: 56px; max-height: 160px; resize: vertical; border: 1px solid #d3d1c7; border-radius: 10px; padding: 9px 11px; font: inherit; font-size: 13px; outline: none; }
.chat-composer textarea:focus { border-color: #378ADD; }
.chat-composer .btn { flex-shrink: 0; padding: 9px 16px; }
@media (max-width: 520px) {
  .chat-composer { flex-direction: column; align-items: stretch; }
  .chat-composer .btn { width: 100%; }
  .chat-error { flex-direction: column; align-items: flex-start; }
  .chat-bubble { max-width: 100%; }
}
</style>
