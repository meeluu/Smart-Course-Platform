import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'
import PapersView from '@/views/PapersView.vue'

/**
 * 论文推荐（契约 29，V5-B 真实检索）
 * ----------------------------------------------------------------------------
 * 这个页面最大的风险是「把降级说成零结果」，所以用例按状态逐条钉：
 *   idle / loading / fallback / error（保留旧结果）/ ready（有结果、零结果）。
 * 另外两条硬规则也在这里测：重试复用 requestId、没有 openAccessUrl 时只给 DOI。
 */
const mocked = vi.hoisted(() => ({
  platform: {
    isCloudSource: true as boolean,
    cloudProject: {
      projectId: 'prj_1',
      name: '近海波浪预测',
      short: '波浪',
      profile: { goal: '预测近海波浪高度' },
      taskStats: { done: 0, total: 0 },
    } as Record<string, unknown> | null,
  },
  cloud: {
    papers: {
      status: 'idle' as 'idle' | 'loading' | 'ready' | 'fallback' | 'error',
      papers: [] as Array<Record<string, unknown>>,
      source: null as 'openalex' | 'fallback' | null,
      notice: null as string | null,
      error: null as { code: string; message: string } | null,
      requestId: null as string | null,
      query: null as string | null,
      loadedAt: null as string | null,
    },
    currentMilestoneId: 'ms_1' as string | null,
    milestones: [{ milestoneId: 'ms_1', name: '资料整理' }] as Array<Record<string, unknown>>,
    searchPapers: vi.fn(
      async (_input: Record<string, unknown>): Promise<Record<string, unknown>> => ({ ok: true, data: {} }),
    ),
  },
  workbench: {
    current: undefined as Record<string, unknown> | undefined,
    toast: vi.fn(),
  },
  push: vi.fn(),
}))

// 组件读的是 store 的实时状态：把 mock 包成响应式，替换 papers 后界面才会更新
mocked.cloud = reactive(mocked.cloud) as typeof mocked.cloud

vi.mock('@/stores/platform', () => ({ usePlatformStore: () => mocked.platform }))
vi.mock('@/stores/cloud', () => ({ useCloudStore: () => mocked.cloud }))
vi.mock('@/stores/workbench', () => ({ useWorkbenchStore: () => mocked.workbench }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: mocked.push }) }))

function paper(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    title: 'Wave height forecasting with a hybrid LSTM model',
    authors: ['Li W.', 'Chen X.', 'Wang Y.', 'Zhao Q.'],
    year: 2024,
    venue: 'Ocean Engineering',
    doi: '10.1016/j.oceaneng.2024.118000',
    openAccessUrl: 'https://example.org/oa.pdf',
    citedByCount: 37,
    ...overrides,
  }
}

function setPapers(patch: Record<string, unknown>): void {
  mocked.cloud.papers = {
    status: 'idle',
    papers: [],
    source: null,
    notice: null,
    error: null,
    requestId: null,
    query: null,
    loadedAt: null,
    ...patch,
  } as typeof mocked.cloud.papers
}

describe('论文推荐页', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocked.platform.isCloudSource = true
    mocked.platform.cloudProject = {
      projectId: 'prj_1',
      name: '近海波浪预测',
      short: '波浪',
      profile: { goal: '预测近海波浪高度' },
      taskStats: { done: 0, total: 0 },
    }
    mocked.workbench.current = undefined
    setPapers({})
    mocked.cloud.searchPapers.mockResolvedValue({ ok: true, data: {} })
  })

  it('首次进入只给方向和入口，不伪造结果', () => {
    const wrapper = mount(PapersView)

    expect(wrapper.text()).toContain('近海波浪预测')
    expect(wrapper.text()).toContain('每个项目独立推荐')
    expect(wrapper.text()).toContain('先写一个方向')
    expect(wrapper.text()).not.toContain('这次没有检索到论文')
    expect(wrapper.text()).not.toContain('AI 已生成')
  })

  it('空方向不发请求，直接给出可操作的提示', async () => {
    const wrapper = mount(PapersView)

    await wrapper.get('form').trigger('submit')

    expect(mocked.cloud.searchPapers).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('先写一句你想了解的方向')
  })

  it('检索成功后按契约字段展示标题、作者、年份、来源、被引与两类链接', async () => {
    const wrapper = mount(PapersView)
    await wrapper.get('#paper-query').setValue('波浪高度预测')
    await wrapper.get('form').trigger('submit')

    expect(mocked.cloud.searchPapers).toHaveBeenCalledWith({ query: '波浪高度预测', limit: 5 })

    setPapers({
      status: 'ready',
      source: 'openalex',
      papers: [paper()],
      requestId: 'req-1',
      query: '波浪高度预测',
      loadedAt: '2026-10-28T03:00:00.000Z',
    })
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Wave height forecasting with a hybrid LSTM model')
    expect(wrapper.text()).toContain('Li W.、Chen X.、Wang Y. 等 4 人')
    expect(wrapper.text()).toContain('2024 年')
    expect(wrapper.text()).toContain('Ocean Engineering')
    expect(wrapper.text()).toContain('被引 37 次')

    const links = wrapper.findAll('.paper-actions a')
    expect(links.map((item) => item.text())).toEqual(['开放获取全文', 'DOI 链接'])
    expect(links[0]?.attributes('href')).toBe('https://example.org/oa.pdf')
    expect(links[1]?.attributes('href')).toBe('https://doi.org/10.1016/j.oceaneng.2024.118000')
  })

  it('没有开放获取链接时只给 DOI，不拼不存在的地址', async () => {
    setPapers({
      status: 'ready',
      source: 'openalex',
      papers: [paper({ openAccessUrl: null })],
    })

    const wrapper = mount(PapersView)
    const links = wrapper.findAll('.paper-actions a')

    expect(links).toHaveLength(1)
    expect(links[0]?.text()).toBe('DOI 链接')
    expect(wrapper.text()).not.toContain('开放获取全文')
  })

  it('两类链接都没有时说明原因，不渲染空按钮', () => {
    setPapers({
      status: 'ready',
      source: 'openalex',
      papers: [paper({ openAccessUrl: null, doi: null, year: null, venue: null })],
    })

    const wrapper = mount(PapersView)

    expect(wrapper.findAll('.paper-actions a')).toHaveLength(0)
    expect(wrapper.text()).toContain('这条没有公开链接')
    expect(wrapper.text()).toContain('年份暂无')
    expect(wrapper.text()).toContain('来源暂无')
  })

  it('降级必须渲染 notice，不能走「没有相关论文」的分支', () => {
    setPapers({
      status: 'fallback',
      source: 'fallback',
      papers: [],
      notice: '论文检索服务暂时不可用：上游超时，请稍后重试',
    })

    const wrapper = mount(PapersView)

    expect(wrapper.text()).toContain('论文检索服务暂时不可用：上游超时，请稍后重试')
    expect(wrapper.text()).toContain('不是「没有相关论文」')
    expect(wrapper.text()).not.toContain('这次没有检索到论文')
    expect(wrapper.find('.paper-list').exists()).toBe(false)
  })

  it('服务端漏带 notice 时仍给出中文说明（本地兜底）', () => {
    setPapers({ status: 'fallback', source: 'fallback', papers: [], notice: null })

    const wrapper = mount(PapersView)

    expect(wrapper.text()).toContain('检索服务暂时不可用，请稍后重试')
  })

  it('失败时保留上一次结果，并在顶部说明这次没完成', async () => {
    const wrapper = mount(PapersView)
    await wrapper.get('#paper-query').setValue('波浪高度预测')
    mocked.cloud.searchPapers.mockResolvedValue({ ok: false, code: 'NETWORK_ERROR', message: '连不上后端服务' })
    await wrapper.get('form').trigger('submit')
    setPapers({
      status: 'error',
      papers: [paper()],
      error: { code: 'NETWORK_ERROR', message: '连不上后端服务' },
      requestId: 'req-2',
    })
    await wrapper.vm.$nextTick()

    expect(wrapper.get('.notice-error').text()).toContain('这次检索没有完成')
    expect(wrapper.get('.notice-error').text()).toContain('连不上后端服务')
    expect(wrapper.text()).toContain('下面保留的是上一次的结果')
    expect(wrapper.text()).toContain('Wave height forecasting with a hybrid LSTM model')
  })

  it('真的零结果时给出换词建议，与降级严格区分', () => {
    setPapers({ status: 'ready', source: 'openalex', papers: [], notice: null })

    const wrapper = mount(PapersView)

    expect(wrapper.text()).toContain('这次没有检索到论文')
    expect(wrapper.text()).toContain('不是服务故障')
    expect(wrapper.text()).not.toContain('不是「没有相关论文」')
  })

  it('重试沿用同一个 requestId，换检索词则开新请求', async () => {
    setPapers({ status: 'error', requestId: 'req-retry', error: { code: 'X', message: '失败' } })
    mocked.cloud.searchPapers.mockResolvedValue({ ok: false, code: 'X', message: '失败' })

    const wrapper = mount(PapersView)
    await wrapper.get('#paper-query').setValue('波浪高度预测')
    await wrapper.get('form').trigger('submit')

    // 第一次检索：不传 requestId，由数据层生成
    expect(mocked.cloud.searchPapers).toHaveBeenLastCalledWith({ query: '波浪高度预测', limit: 5 })

    await wrapper.get('.notice-error button').trigger('click')

    // 重试：沿用上一次的 requestId
    expect(mocked.cloud.searchPapers).toHaveBeenLastCalledWith({
      query: '波浪高度预测',
      limit: 5,
      requestId: 'req-retry',
    })

    // 换检索词：不带旧 requestId
    setPapers({ status: 'error', requestId: 'req-retry', error: { code: 'X', message: '失败' } })
    await wrapper.get('#paper-query').setValue('叶绿素重建')
    await wrapper.get('form').trigger('submit')
    expect(mocked.cloud.searchPapers).toHaveBeenLastCalledWith({ query: '叶绿素重建', limit: 5 })
  })

  it('本地项目不发真实检索，说明原因并保留提示词路径', () => {
    mocked.platform.isCloudSource = false
    mocked.platform.cloudProject = null
    mocked.workbench.current = {
      projectId: 'prj_local_1',
      name: '论文项目',
      short: '论文',
      ms: [{ t: '资料整理', s: 'cur', p: 40, sub: '进行中' }],
      papers: [
        {
          title: '海洋锋面自动识别方法综述',
          meta: '模板预置的检索方向 · 用提示词到 GPT 检索',
          why: '先看综述建立全局图景。',
          prompt: '请检索 ocean front detection 的综述。',
        },
      ],
    }

    const wrapper = mount(PapersView)

    expect(wrapper.text()).toContain('论文项目')
    expect(wrapper.text()).toContain('每个项目独立推荐')
    expect(wrapper.text()).toContain('真实论文检索需要登录后使用')
    expect(wrapper.text()).toContain('资料整理')
    expect(wrapper.text()).toContain('海洋锋面自动识别方法综述')
    expect(wrapper.text()).toContain('不是 AI 现场生成的')
    expect(wrapper.find('#paper-query').exists()).toBe(false)
    expect(mocked.cloud.searchPapers).not.toHaveBeenCalled()
  })

  it('没有项目时给去工作台的入口', async () => {
    mocked.platform.cloudProject = null

    const wrapper = mount(PapersView)
    expect(wrapper.text()).toContain('还没有项目')

    await wrapper.get('.empty-state button').trigger('click')
    expect(mocked.push).toHaveBeenCalledWith('/')
  })
})
