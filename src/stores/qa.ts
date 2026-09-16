import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { Answer, Thread, Turn } from '@/types/qa'
import { answer as resolveAnswer, seedThreads } from '@/data/qa'
import { lessonById } from '@/data/course'

let seq = 0
const nextId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(seq += 1)}`

const now = () =>
  new Date().toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })

/** 智能问答视图状态（DR2） */
export const useQaStore = defineStore('qa', () => {
  const threads = ref<Thread[]>([...seedThreads])
  const turns = ref<Turn[]>([])
  const pending = ref(false)
  /** 当前问答归属的学习单元，用于历史归档 */
  const activeLessonId = ref('L04')
  /** 最近一次回答的问题类型，用于输入区提示 */
  const lastType = ref<Answer['type'] | null>(null)

  const grouped = computed(() => {
    const map = new Map<string, Thread[]>()
    threads.value.forEach((thread) => {
      const list = map.get(thread.lessonId) ?? []
      list.push(thread)
      map.set(thread.lessonId, list)
    })
    return [...map.entries()]
      .map(([lessonId, items]) => ({
        lessonId,
        lesson: lessonById.get(lessonId),
        items: items.sort((a, b) => (a.at < b.at ? 1 : -1)),
      }))
      .sort((a, b) => (a.lesson?.index ?? 0) - (b.lesson?.index ?? 0))
  })

  const hasConversation = computed(() => turns.value.length > 0)

  function setLesson(lessonId: string) {
    activeLessonId.value = lessonId
  }

  async function ask(question: string, lessonId = activeLessonId.value) {
    const text = question.trim()
    if (!text || pending.value) return

    activeLessonId.value = lessonId
    turns.value.push({ id: nextId('u'), role: 'user', text, at: now() })

    const placeholderId = nextId('a')
    turns.value.push({ id: placeholderId, role: 'assistant', at: now(), pending: true })

    pending.value = true
    // 受控生成需要检索与重排，这里保留一个可感知的等待
    await new Promise((resolve) => window.setTimeout(resolve, 620))

    const outcome = resolveAnswer(text)
    const answer: Answer = {
      type: outcome.type,
      body: outcome.body,
      citations: outcome.citations,
      insufficient: outcome.insufficient,
      gapNote: outcome.gapNote,
      followUps: outcome.followUps,
    }

    const index = turns.value.findIndex((turn) => turn.id === placeholderId)
    if (index >= 0) turns.value[index] = { id: placeholderId, role: 'assistant', answer, at: now() }

    lastType.value = outcome.type
    pending.value = false

    if (!threads.value.some((thread) => thread.question === text)) {
      threads.value = [
        {
          id: nextId('t'),
          lessonId,
          question: text,
          type: outcome.type,
          at: now(),
          turns: 2,
        },
        ...threads.value,
      ]
    }
  }

  /** 从历史归档中重新打开一个问题：回放该问题与回答，模拟「复习复用」 */
  function replay(thread: Thread) {
    turns.value = []
    void ask(thread.question, thread.lessonId)
  }

  function reset() {
    turns.value = []
    lastType.value = null
  }

  return {
    threads,
    turns,
    pending,
    activeLessonId,
    lastType,
    grouped,
    hasConversation,
    setLesson,
    ask,
    replay,
    reset,
  }
})
