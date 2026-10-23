import { mount } from '@vue/test-utils'
import { vi } from 'vitest'
import CloudProjectWorkbench from '@/components/CloudProjectWorkbench.vue'

const mocked = vi.hoisted(() => ({
  platform: {
    cloudProject: {
      projectId: 'project-1',
      name: '测试云端项目',
      short: '测试',
      profile: { goal: '验证阶段流程' },
      taskStats: { total: 2, done: 0 },
    },
    cloudProjects: [{ projectId: 'project-1', name: '测试云端项目' }],
    selectCloudProject: vi.fn(),
    createCloudProject: vi.fn(),
  },
  cloud: {
    milestones: [] as Array<{
      milestoneId: string
      name: string
      goal: string
      doneCriteria: string
      dueAt: string | null
      status: 'planned' | 'active' | 'completed' | 'archived'
      orderIndex: number
      revision: number
      source: 'manual'
      createdAt: string
      updatedAt: string
      completedAt: string | null
      archivedAt: string | null
      taskStats: { total: number; done: number; doing: number; todo: number; archived: number; progress: number }
    }>,
    tasks: [] as Array<{
      taskId: string
      milestoneId: string | null
      title: string
      doneCriteria: string
      status: 'todo' | 'doing' | 'done'
      archivedAt: string | null
    }>,
    evidence: [] as Array<{ evidenceId: string; status: 'active' | 'redacted'; milestoneId: string | null; taskId: string | null; didWhat: string; foundWhat: string; createdAt: string }>,
    progress: [] as Array<{ progressId: string; status: 'active' | 'superseded'; milestoneId: string | null; taskId: string | null; summary: string; occurredAt: string }>,
    materials: [] as Array<{
      materialId: string
      name: string
      materialVersion: number
      type: 'md' | 'txt'
      status: 'parsed'
      isCurrent: boolean
      readOnly: boolean
      size: number
      encoding: string
      createdAt: string
      updatedAt: string
    }>,
    materialsHydrated: true,
    materialsStatus: 'ready' as 'idle' | 'loading' | 'ready' | 'error',
    materialsError: null as { message: string } | null,
    materialReadError: null as { message: string } | null,
    refreshMaterials: vi.fn(),
    loadMaterialSegments: vi.fn(),
    loadMaterialUnderstanding: vi.fn(),
    cachedSegments: vi.fn((): unknown[] | null => null),
    cachedUnderstanding: vi.fn((): Array<{ status: string }> | null => null),
    isMaterialReadLoading: vi.fn((): boolean => false),
    uploadMaterial: vi.fn(),
    materialUpload: {
      status: 'idle',
      error: null as { message: string } | null,
      lastUpload: null as { deduplicated: boolean; segmentCount: number } | null,
    },
    advisor: null as null | {
      status: 'idle' | 'loading' | 'ready' | 'error'
      source: 'model' | 'fallback' | 'local-rule' | null
      fallbackReason: string | null
      error: { message: string } | null
      suggestions: Array<{ id: string; title: string; whyNow: string; doneCriteria: string }>
    },
    buildAdvisorContext: vi.fn(),
    refreshAdvisor: vi.fn(),
    chat: null as null | {
      status: 'idle' | 'loading' | 'ready' | 'error'
      messages: Array<{
        clientId: string
        role: 'user' | 'assistant'
        text: string
        source: 'model' | 'fallback' | null
        createdAt: string
        citations: Array<{ materialName: string; segmentId: string; startLine: number; endLine: number }>
      }>
      error: { message: string } | null
      pendingQuestion: string | null
    },
    sendChat: vi.fn(),
    retryChat: vi.fn(),
    clearChat: vi.fn(),
    currentMilestoneId: 'milestone-1' as string | null,
    tasksHydrated: true,
    busy: false,
    createMilestone: vi.fn(),
    updateMilestone: vi.fn(),
    reorderMilestones: vi.fn(),
    activateMilestone: vi.fn(),
    completeMilestone: vi.fn(),
    reopenMilestone: vi.fn(),
    archiveMilestone: vi.fn(),
    restoreMilestone: vi.fn(),
    createTask: vi.fn(),
    linkTaskToMilestone: vi.fn(),
    startTask: vi.fn(),
    completeTask: vi.fn(),
    reopenTask: vi.fn(),
    submitProgress: vi.fn(),
    createEvidence: vi.fn(),
    isActionLoading: vi.fn((_name: string): boolean => false),
  },
  push: vi.fn(),
}))

vi.mock('@/stores/platform', () => ({
  usePlatformStore: () => mocked.platform,
}))

vi.mock('@/stores/cloud', () => ({
  useCloudStore: () => mocked.cloud,
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mocked.push }),
}))

function milestone(
  milestoneId: string,
  name: string,
  orderIndex: number,
  archivedAt: string | null = null,
): (typeof mocked.cloud.milestones)[number] {
  return {
    milestoneId,
    name,
    goal: name + '目标',
    doneCriteria: name + '完成标准',
    dueAt: null,
    status: archivedAt === null ? 'planned' : 'archived',
    orderIndex,
    revision: 1,
    source: 'manual',
    createdAt: '2026-10-21T00:00:00.000Z',
    updatedAt: '2026-10-21T00:00:00.000Z',
    completedAt: null,
    archivedAt,
    taskStats: { total: 1, done: 0, doing: 0, todo: 1, archived: 0, progress: 0 },
  }
}

function resetState(): void {
  mocked.cloud.milestones = [
    milestone('milestone-1', '资料整理', 0),
    milestone('milestone-2', '结论验证', 1),
  ]
  mocked.cloud.tasks = [
    { taskId: 'task-1', milestoneId: 'milestone-1', title: '整理资料', doneCriteria: '', status: 'todo', archivedAt: null },
    { taskId: 'task-2', milestoneId: 'milestone-2', title: '验证结论', doneCriteria: '', status: 'todo', archivedAt: null },
  ]
  mocked.cloud.currentMilestoneId = 'milestone-1'
}

describe('CloudProjectWorkbench', () => {
  beforeEach(() => {
    resetState()
    mocked.cloud.isActionLoading = vi.fn(() => false)
    mocked.cloud.materials = []
    mocked.cloud.materialsHydrated = true
    mocked.cloud.materialsStatus = 'ready'
    mocked.cloud.materialsError = null
    mocked.cloud.materialReadError = null
    mocked.cloud.refreshMaterials = vi.fn(async () => ({ ok: true, data: [] }))
    mocked.cloud.loadMaterialSegments = vi.fn(async () => ({ ok: true, data: [] }))
    mocked.cloud.loadMaterialUnderstanding = vi.fn(async () => ({ ok: true, data: [] }))
    mocked.cloud.cachedSegments = vi.fn((): unknown[] | null => null)
    mocked.cloud.cachedUnderstanding = vi.fn((): Array<{ status: string }> | null => null)
    mocked.cloud.isMaterialReadLoading = vi.fn((): boolean => false)
    mocked.cloud.uploadMaterial = vi.fn()
    mocked.cloud.materialUpload = { status: 'idle', error: null, lastUpload: null }
    mocked.cloud.advisor = null
    mocked.cloud.buildAdvisorContext = vi.fn(() => ({ ok: true, data: {} }))
    mocked.cloud.refreshAdvisor = vi.fn(async () => ({ ok: true, data: null }))
    mocked.cloud.chat = null
    mocked.cloud.sendChat = vi.fn(async () => ({ ok: false, message: '聊天服务暂不可用' }))
    mocked.cloud.retryChat = vi.fn(async () => ({ ok: false, message: '仍然失败' }))
    mocked.cloud.clearChat = vi.fn()
  })

  it('切换查看阶段后只展示所选阶段的任务', async () => {
    const wrapper = mount(CloudProjectWorkbench, {
      global: { stubs: { RouterLink: true } },
    })

    expect(wrapper.text()).toContain('整理资料')
    expect(wrapper.text()).not.toContain('验证结论')

    await wrapper.get('select.stage-select').setValue('milestone-2')

    expect(wrapper.text()).toContain('验证结论')
    expect(wrapper.text()).not.toContain('整理资料')
  })

  it('归档阶段不影响活动阶段排序按钮的边界', () => {
    mocked.cloud.milestones = [
      milestone('milestone-1', '资料整理', 0),
      milestone('milestone-archived', '旧阶段', 1, '2026-10-20T00:00:00.000Z'),
      milestone('milestone-2', '结论验证', 2),
    ]
    mocked.cloud.currentMilestoneId = 'milestone-1'

    const wrapper = mount(CloudProjectWorkbench)
    const rows = wrapper.findAll('.milestone-row')

    expect(rows[0]?.findAll('button')[0]?.attributes('disabled')).toBeDefined()
    expect(rows[0]?.findAll('button')[1]?.attributes('disabled')).toBeUndefined()
    expect(rows[2]?.findAll('button')[0]?.attributes('disabled')).toBeUndefined()
    expect(rows[2]?.findAll('button')[1]?.attributes('disabled')).toBeDefined()
  })

  it('点击阶段候选入口时明确提示接口尚未接入', async () => {
    const wrapper = mount(CloudProjectWorkbench)

    await wrapper.get('.candidate-entry button').trigger('click')

    expect(wrapper.text()).toContain('阶段候选接口暂未接入')
  })

  it('无里程碑时显示新建与候选两个入口，新建会聚焦名称输入', async () => {
    mocked.cloud.milestones = []
    mocked.cloud.tasks = []

    const host = document.createElement('div')
    document.body.appendChild(host)
    const wrapper = mount(CloudProjectWorkbench, { attachTo: host })
    const actions = wrapper.findAll('.empty-actions button')

    expect(actions.map((item) => item.text())).toEqual(['新建里程碑', '根据项目资料生成候选'])
    await actions[0]?.trigger('click')
    await vi.waitFor(() => {
      expect(document.activeElement?.getAttribute('aria-label')).toBe('阶段名称')
    })

    wrapper.unmount()
    host.remove()
  })

  it('切换标签页不卸载表单，输入不会丢失；项目资料页显示材料空态', async () => {
    const wrapper = mount(CloudProjectWorkbench)

    await wrapper.get('input[aria-label="阶段名称"]').setValue('未提交的阶段草稿')
    const tabs = wrapper.findAll('[role="tab"]')
    expect(tabs[0]?.text()).toContain('项目推进')
    expect(tabs[1]?.text()).toContain('项目资料')

    await tabs[1]?.trigger('click')

    expect(wrapper.get('#cloud-panel-data').isVisible()).toBe(true)
    expect(wrapper.get('#cloud-panel-data').text()).toContain('还没有材料，上传一份 md 或 txt 开始')
    expect((wrapper.get('input[aria-label="阶段名称"]').element as HTMLInputElement).value).toBe('未提交的阶段草稿')

    await tabs[0]?.trigger('click')
    expect(wrapper.get('#cloud-panel-progress').isVisible()).toBe(true)
  })

  it('「下一步做什么」按当前阶段数据给出行动，并明确不是 AI 建议', async () => {
    const wrapper = mount(CloudProjectWorkbench)

    expect(wrapper.get('.next-step').text()).toContain('开始任务：整理资料')
    expect(wrapper.get('.next-step').text()).toContain('不是 AI 建议')

    const startButton = wrapper.findAll('.next-step-list button').find((item) => item.text() === '开始')
    mocked.cloud.startTask.mockResolvedValue({ ok: true })
    await startButton?.trigger('click')

    expect(mocked.cloud.startTask).toHaveBeenCalledWith({ taskId: 'task-1', expectedRevision: undefined })
  })

  it('任务按钮按各自 action 键显示忙碌态', async () => {
    mocked.cloud.isActionLoading = vi.fn((name: string): boolean => name === 'task.start')

    const wrapper = mount(CloudProjectWorkbench)
    const startButton = wrapper.findAll('.task-row button').find((item) => item.text() === '开始')
    const completeButton = wrapper.findAll('.task-row button').find((item) => item.text() === '完成')

    expect(startButton?.attributes('disabled')).toBeDefined()
    expect(completeButton?.attributes('disabled')).toBeUndefined()
  })

  it('新建任务默认挂当前阶段，未挂阶段的任务可以补挂', async () => {
    mocked.cloud.tasks = [
      { taskId: 'task-9', milestoneId: null, title: '未挂阶段的任务', doneCriteria: '', status: 'todo', archivedAt: null },
    ]
    mocked.cloud.linkTaskToMilestone.mockResolvedValue({ ok: true })
    mocked.cloud.isActionLoading = vi.fn((name: string): boolean => name === 'linkTaskToMilestone')

    const wrapper = mount(CloudProjectWorkbench)
    const milestoneSelect = wrapper.get('select[aria-label="任务所属阶段"]')

    expect((milestoneSelect.element as HTMLSelectElement).value).toBe('milestone-1')
    expect(wrapper.get('.unassigned').text()).toContain('未挂阶段的任务')
    expect(wrapper.get('.unassigned button').attributes('disabled')).toBeDefined()

    mocked.cloud.isActionLoading = vi.fn((_name: string): boolean => false)
    const idle = mount(CloudProjectWorkbench)
    expect(idle.get('.unassigned button').attributes('disabled')).toBeUndefined()
    await idle.get('.unassigned button').trigger('click')

    expect(mocked.cloud.linkTaskToMilestone).toHaveBeenCalledWith({
      taskId: 'task-9',
      milestoneId: 'milestone-1',
      expectedRevision: undefined,
    })
  })

  it('材料区区分空态与失败态，失败时不显示空列表', async () => {
    const wrapper = mount(CloudProjectWorkbench)
    await wrapper.findAll('[role="tab"]')[1]?.trigger('click')

    await vi.waitFor(() => {
      expect(wrapper.get('#cloud-panel-data').text()).toContain('还没有材料，上传一份 md 或 txt 开始')
    })
    expect(wrapper.get('#cloud-panel-data').find('.empty').exists()).toBe(true)
    wrapper.unmount()

    mocked.cloud.materialsHydrated = false
    mocked.cloud.materialsStatus = 'error'
    mocked.cloud.materialsError = { message: '材料服务暂时不可用' }
    mocked.cloud.refreshMaterials = vi.fn(async () => ({ ok: false, message: '材料服务暂时不可用' }))

    const failed = mount(CloudProjectWorkbench)
    await failed.findAll('[role="tab"]')[1]?.trigger('click')

    await vi.waitFor(() => {
      expect(failed.get('#cloud-panel-data').text()).toContain('材料服务暂时不可用')
    })
    expect(failed.get('#cloud-panel-data').find('.empty').exists()).toBe(false)
  })

  it('AI 建议 fallback 显示服务端规则兜底和原因，不出现空白卡片', async () => {
    mocked.cloud.advisor = {
      status: 'ready',
      source: 'fallback',
      fallbackReason: 'MODEL_TIMEOUT',
      error: null,
      suggestions: [
        {
          id: 'suggestion-1',
          title: '补齐字段口径说明',
          whyNow: '当前阶段的完成标准要求确认字段口径。',
          doneCriteria: '写出一页字段说明并标注缺失率。',
        },
      ],
    }

    const wrapper = mount(CloudProjectWorkbench)
    await wrapper.get('.cloud-ai .ai-actions button').trigger('click')

    await vi.waitFor(() => {
      expect(wrapper.get('.cloud-ai').text()).toContain('服务端规则兜底（fallback）')
    })
    expect(wrapper.get('.cloud-ai').text()).toContain('模型调用超时，已使用服务端规则建议。')
    expect(wrapper.get('.cloud-ai').text()).toContain('补齐字段口径说明')
    expect(wrapper.get('.cloud-ai').text()).toContain('写出一页字段说明并标注缺失率。')
    expect(wrapper.get('.cloud-ai').findAll('.ai-suggestion')).toHaveLength(1)
    expect(wrapper.get('.cloud-ai').find('.cloud-error').exists()).toBe(false)
  })

  it('聊天发送失败时保留问题并允许重试', async () => {
    mocked.cloud.chat = {
      status: 'idle',
      messages: [],
      error: null,
      pendingQuestion: null,
    }
    mocked.cloud.sendChat = vi.fn(async ({ question }: { question: string }) => {
      if (mocked.cloud.chat) mocked.cloud.chat.pendingQuestion = question
      return { ok: false, message: '聊天服务暂时不可用' }
    })

    const wrapper = mount(CloudProjectWorkbench)
    const textarea = wrapper.get('.chat-form textarea')
    await textarea.setValue('下一步应该做什么？')
    await wrapper.get('.chat-form').trigger('submit')

    await vi.waitFor(() => {
      expect(wrapper.get('.cloud-chat').text()).toContain('聊天服务暂时不可用')
    })
    expect((wrapper.get('.chat-form textarea').element as HTMLTextAreaElement).value).toBe('下一步应该做什么？')

    const retry = wrapper.findAll('.cloud-chat button').find((button) => button.text() === '重试')
    expect(retry).toBeTruthy()
    await retry?.trigger('click')
    expect(mocked.cloud.retryChat).toHaveBeenCalledTimes(1)
  })
})
