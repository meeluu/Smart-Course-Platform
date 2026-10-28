import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import CloudChatPanel from '@/components/CloudChatPanel.vue'

/**
 * AI 顾问（契约 6.4 / 23.7 / 30）
 * ----------------------------------------------------------------------------
 * V5 起聊天会落库，所以这个套件重点盯三件事：
 *   1. 历史恢复（sessionId / historyStatus）不能把「没拉到」说成「没有历史」；
 *   2. 历史消息没有 source，要标「历史记录」，不能冒充「AI 模型回答」；
 *   3. messageId 为 null 时不能显示「已保存」。
 */
const mocked = vi.hoisted(() => ({
  cloud: {
    chat: {
      status: 'idle' as 'idle' | 'loading' | 'error',
      messages: [] as Array<Record<string, unknown>>,
      error: null as { code: string; message: string } | null,
      pendingQuestion: null as string | null,
      contextAttached: true,
      sessionId: null as string | null,
      historyStatus: 'idle' as 'idle' | 'loading' | 'ready' | 'error',
      historyError: null as { code: string; message: string } | null,
    },
    sendChat: vi.fn(async () => ({ ok: true, data: {} })),
    retryChat: vi.fn(async () => ({ ok: true, data: {} })),
    clearChat: vi.fn(),
  },
}))

vi.mock('@/stores/cloud', () => ({
  useCloudStore: () => mocked.cloud,
}))

function message(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    clientId: 'chat_1',
    role: 'assistant',
    text: '先把 0.5 度分辨率的缺口写成待确认事项。',
    source: 'model',
    fallbackReason: null,
    citations: [],
    createdAt: '2026-10-22T03:00:00.000Z',
    messageId: 'msg_1',
    persisted: true,
    ...overrides,
  }
}

function setChat(patch: Record<string, unknown>): void {
  mocked.cloud.chat = {
    status: 'idle',
    messages: [],
    error: null,
    pendingQuestion: null,
    contextAttached: true,
    sessionId: null,
    historyStatus: 'idle',
    historyError: null,
    ...patch,
  } as typeof mocked.cloud.chat
}

describe('CloudChatPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setChat({})
    mocked.cloud.sendChat.mockResolvedValue({ ok: true, data: {} })
    mocked.cloud.retryChat.mockResolvedValue({ ok: true, data: {} })
  })

  it('空会话给出可问的问题；没连上会话时不宣称已保存', () => {
    const wrapper = mount(CloudChatPanel)

    expect(wrapper.text()).toContain('还没有对话')
    expect(wrapper.text()).toContain('本次会话')
    expect(wrapper.text()).toContain('还没连上云端会话')
    expect(wrapper.text()).not.toContain('已保存到云端')
  })

  it('拿到会话后说明对话会保存到账号', () => {
    setChat({ sessionId: 'sess_1', historyStatus: 'ready' })

    const wrapper = mount(CloudChatPanel)

    expect(wrapper.text()).toContain('已保存到云端')
    expect(wrapper.text()).toContain('对话会保存到你的账号')
    expect(wrapper.text()).toContain('刷新、换设备、重新登录后还能看到')
  })

  it('历史记录没拉到时说实话，并保留本次会话', () => {
    setChat({
      sessionId: null,
      historyStatus: 'error',
      historyError: { code: 'NETWORK_ERROR', message: '连不上后端服务' },
      messages: [message({ clientId: 'chat_now', text: '这次会话里刚问的问题' })],
    })

    const wrapper = mount(CloudChatPanel)

    expect(wrapper.text()).toContain('历史记录暂时没拉到')
    expect(wrapper.text()).toContain('不代表以前没聊过')
    expect(wrapper.text()).toContain('这次会话里刚问的问题')
    // 不能把失败说成「没有对话」
    expect(wrapper.text()).not.toContain('还没有对话')
  })

  it('历史消息没有来源字段时标「历史记录」，不冒充 AI 模型回答', () => {
    setChat({
      sessionId: 'sess_1',
      historyStatus: 'ready',
      messages: [
        message({
          clientId: 'hist_msg_1',
          text: '这是上次会话里恢复出来的回答。',
          source: undefined,
          fallbackReason: undefined,
        }),
      ],
    })

    const wrapper = mount(CloudChatPanel)

    expect(wrapper.text()).toContain('历史记录')
    expect(wrapper.text()).not.toContain('AI 模型回答')
  })

  it('messageId 为空时不显示「已保存到云端」', () => {
    setChat({
      sessionId: 'sess_1',
      historyStatus: 'ready',
      messages: [
        message({ messageId: null, persisted: false }),
        message({ clientId: 'chat_2', messageId: 'msg_2', persisted: true }),
      ],
    })

    const wrapper = mount(CloudChatPanel)
    const persistLabels = wrapper.findAll('.chat-persist').map((item) => item.text())

    expect(persistLabels).toEqual(['未保存到云端', '已保存到云端'])
  })

  it('发送成功后清空输入框', async () => {
    const wrapper = mount(CloudChatPanel)
    const textarea = wrapper.get('textarea')

    await textarea.setValue('下一步做什么')
    await wrapper.get('form').trigger('submit')

    expect(mocked.cloud.sendChat).toHaveBeenCalledWith({ question: '下一步做什么' })
    expect((textarea.element as HTMLTextAreaElement).value).toBe('')
  })

  it('发送失败保留问题，点重试直接复用原问题', async () => {
    setChat({
      status: 'error',
      error: { code: 'MODEL_UNAVAILABLE', message: '模型服务暂时不可用，请稍后重试' },
      pendingQuestion: '下一步做什么',
    })

    const wrapper = mount(CloudChatPanel)
    expect(wrapper.text()).toContain('模型服务暂时不可用')

    await wrapper.get('.chat-error button').trigger('click')
    expect(mocked.cloud.retryChat).toHaveBeenCalled()
  })

  it('兜底回答说人话，并展示材料引用行号', () => {
    setChat({
      messages: [
        message({
          role: 'user',
          clientId: 'chat_u1',
          text: '下一步做什么',
          messageId: null,
          persisted: false,
        }),
        message({
          source: 'fallback',
          fallbackReason: 'MODEL_TIMEOUT',
          citations: [
            {
              materialId: 'mat_1',
              materialName: '实验手册.md',
              materialVersion: 1,
              segmentId: 'seg_1',
              startLine: 10,
              endLine: 24,
              itemId: null,
            },
          ],
        }),
      ],
    })

    const wrapper = mount(CloudChatPanel)

    expect(wrapper.text()).toContain('服务端规则回答')
    expect(wrapper.text()).toContain('模型响应超时')
    expect(wrapper.text()).toContain('依据：实验手册.md 第 10–24 行')
    expect(wrapper.text()).not.toContain('MODEL_TIMEOUT')
  })

  it('正在思考时禁用发送，避免重复提交', () => {
    setChat({ status: 'loading' })

    const wrapper = mount(CloudChatPanel)

    expect(wrapper.text()).toContain('正在思考')
    expect(wrapper.get('form button').attributes('disabled')).toBeDefined()
    expect(wrapper.get('textarea').attributes('disabled')).toBeDefined()
  })

  it('清空只影响这一屏：调用 store 并重置输入，不谎称删掉云端历史', async () => {
    setChat({ sessionId: 'sess_1', historyStatus: 'ready', messages: [message()] })

    const wrapper = mount(CloudChatPanel)
    const button = wrapper.get('.chat-head button')
    expect(button.text()).toBe('清空屏幕')
    expect(button.attributes('title')).toContain('云端已保存的对话')

    await button.trigger('click')

    expect(mocked.cloud.clearChat).toHaveBeenCalled()
  })
})
