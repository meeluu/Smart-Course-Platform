import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AiStatus from '@/components/AiStatus.vue'
import EvidenceForm from '@/components/EvidenceForm.vue'
import RecommendationList from '@/components/RecommendationList.vue'
import SuggestionCard from '@/components/SuggestionCard.vue'
import type { Recommendation } from '@/domain/recommendation'
import { useWorkbenchStore } from '@/stores/workbench'
import type { Task } from '@/types/platform'
import WorkbenchView from '@/views/WorkbenchView.vue'

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

type WorkbenchStore = ReturnType<typeof useWorkbenchStore>

function freshStore(): WorkbenchStore {
  setActivePinia(createPinia())
  return useWorkbenchStore()
}

function createProject(store: WorkbenchStore, name = '测试项目'): string {
  const result = store.createProject({ topicId: '__custom__', customName: name, members: 3 })
  if (!result.ok) throw new Error(`创建项目失败：${result.message}`)
  return result.data.projectId
}

function createProjectWithTask(store: WorkbenchStore, name: string): { projectId: string; taskId: string } {
  const projectId = createProject(store, name)
  const result = store.claimTask({
    draft: {
      title: `${name}的测试任务`,
      doneCriteria: '完成测试并提交证据',
      requestId: null,
      basisEvidenceIds: [],
      basisDoubtIds: [],
    },
  })
  if (!result.ok) throw new Error(`创建测试任务失败：${result.message}`)
  return { projectId, taskId: result.data.taskId }
}

function makeRecommendation(index: number, source: Recommendation['source'] = 'local-rule'): Recommendation {
  return {
    id: `rec_test_${index}`,
    source,
    requestId: null,
    projectRevision: 1,
    generatedAt: '2026-09-30T00:00:00.000Z',
    title: `建议 ${index}`,
    whyNow: `现在需要处理建议 ${index}`,
    doneCriteria: `建议 ${index} 的完成标准`,
    existingTaskId: null,
    basisEvidenceIds: [],
    basisDoubtIds: [],
  }
}

/** 建议接口替身：按请求体的 projectId / revision / requestId 现造一条建议 */
function stubAdvisor(
  build: (request: { projectId: string; projectRevision: number; requestId: string }) => Response,
): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const request = JSON.parse(String(init?.body ?? '{}')) as {
        projectId?: unknown
        projectRevision?: unknown
        requestId?: unknown
      }
      if (
        typeof request.projectId !== 'string' ||
        typeof request.projectRevision !== 'number' ||
        typeof request.requestId !== 'string'
      ) {
        throw new Error('测试请求字段不完整')
      }
      return build({
        projectId: request.projectId,
        projectRevision: request.projectRevision,
        requestId: request.requestId,
      })
    }),
  )
}

/**
 * 直接放一条真实任务进当前项目。
 * 公开 action 只能创建 doing 任务（认领即进行中），所以等待认领的 todo 任务只在测试里这样造。
 */
function seedTask(
  store: WorkbenchStore,
  status: Task['status'] = 'todo',
  title = '等待认领的步骤',
): Task {
  const project = store.current
  if (project === undefined) throw new Error('缺少测试项目')
  const timestamp = new Date().toISOString()
  const task: Task = {
    id: `tsk_seed_${project.tasks.length + 1}`,
    projectId: project.projectId,
    title,
    status,
    doneCriteria: '写出一页结论',
    owner: null,
    suggestedOwner: null,
    milestone: null,
    why: null,
    draftKey: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
  project.tasks = [...project.tasks, task]
  return task
}

function makeTask(status: Task['status'] = 'doing'): Task {
  return {
    id: 'tsk_ui_1',
    projectId: 'prj_ui_1',
    title: '完成 UI 测试',
    status,
    doneCriteria: '测试通过',
    owner: null,
    suggestedOwner: null,
    milestone: '选题确认与文献调研',
    why: null,
    // v2（契约 3.2 约束 4）：模板任务与认领已有任务的 draft 幂等键为 null
    draftKey: null,
    createdAt: '2026-09-30T00:00:00.000Z',
    updatedAt: '2026-09-30T00:00:00.000Z',
  }
}

function advisorResponse(
  projectId: string,
  projectRevision: number,
  existingTaskId: string | null,
  title = '测试建议',
  requestId = 'ui-test-request',
): Response {
  return new Response(
    JSON.stringify({
      contractVersion: '1.0',
      requestId,
      projectId,
      projectRevision,
      source: 'model',
      fallbackReason: null,
      cached: false,
      promptVersion: 'mvp-prompt-v1',
      suggestions: [{
        title,
        whyNow: '现在需要处理这项建议',
        doneCriteria: '完成这项建议并留下证据',
        existingTaskId,
        basisEvidenceIds: [],
        basisDoubtIds: [],
      }],
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  )
}

describe('AI UI components', () => {
  it.each([
    ['neutral', 'is-neutral'],
    ['loading', 'is-loading'],
    ['model', 'is-model'],
    ['fallback', 'is-fallback'],
    ['local-rule', 'is-local-rule'],
    ['error', 'is-error'],
  ] as const)('renders the %s advisor state', (tone, className) => {
    const wrapper = mount(AiStatus, {
      props: {
        tone,
        tag: tone,
        message: `${tone} message`,
        actionLabel: '重试',
      },
    })

    expect(wrapper.find('.ai-status').classes()).toContain(className)
    expect(wrapper.text()).toContain(`${tone} message`)
  })

  it('disables retry while the advisor is busy', () => {
    const wrapper = mount(AiStatus, {
      props: {
        tone: 'loading',
        tag: 'loading',
        message: 'loading message',
        actionLabel: 'retry',
        busy: true,
      },
    })

    expect(wrapper.get('button.ai-status-action').attributes('disabled')).toBeDefined()
  })

  it('limits the recommendation list to three cards', () => {
    const wrapper = mount(RecommendationList, {
      props: {
        items: [0, 1, 2, 3].map((index) => ({
          suggestion: makeRecommendation(index),
          index,
          claimState: 'draft' as const,
          evidence: [],
          doubts: [],
        })),
      },
    })

    expect(wrapper.findAll('.step-card')).toHaveLength(3)
    expect(wrapper.text()).toContain('建议 0')
    expect(wrapper.text()).toContain('建议 2')
    expect(wrapper.text()).not.toContain('建议 3')
  })

  it('renders evidence and doubt source text, not only their IDs', () => {
    const wrapper = mount(RecommendationList, {
      props: {
        items: [{
          suggestion: makeRecommendation(1),
          index: 0,
          claimState: 'claimable',
          evidence: [{ id: 'evd_1', time: '10:20', text: 'evidence source text' }],
          doubts: [{ id: 'dbt_1', text: 'doubt source text' }],
        }],
      },
    })

    expect(wrapper.text()).toContain('evidence source text')
    expect(wrapper.text()).toContain('doubt source text')
    expect(wrapper.text()).not.toContain('evd_1')
    expect(wrapper.text()).not.toContain('dbt_1')
  })

  it('keeps an unclaimed recommendation clickable with the 认领这一步 label', async () => {
    const wrapper = mount(SuggestionCard, {
      props: {
        suggestion: makeRecommendation(1),
        index: 0,
        claimState: 'draft',
        evidence: [],
        doubts: [],
      },
    })

    const button = wrapper.get('button')
    expect(button.attributes('disabled')).toBeUndefined()
    expect(button.text()).toContain('认领这一步')
    await button.trigger('click')
    expect(wrapper.emitted('claim')).toHaveLength(1)
  })

  it('shows 已认领 · 进行中 and disables the button once claimed', async () => {
    const wrapper = mount(SuggestionCard, {
      props: {
        suggestion: makeRecommendation(2),
        index: 0,
        claimState: 'claimed',
        evidence: [],
        doubts: [],
      },
    })

    const button = wrapper.get('button')
    expect(button.text()).toContain('已认领')
    expect(button.text()).toContain('进行中')
    expect(button.attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('AI 项目顾问')
  })
})

describe('EvidenceForm', () => {
  it('emits separate progress and completion submissions', async () => {
    const task = makeTask()
    const wrapper = mount(EvidenceForm, {
      props: { tasks: [task], projectKey: task.projectId },
    })

    await wrapper.find('#evidence-did').setValue('记录了一次进展')
    await wrapper.find('form').trigger('submit')
    expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({
      taskId: null,
      complete: false,
      didWhat: '记录了一次进展',
    })

    await wrapper.find('#evidence-task').setValue(task.id)
    await wrapper.get('button.mode-option.complete').trigger('click')
    await wrapper.find('#evidence-did').setValue('确认任务完成')
    await wrapper.find('form').trigger('submit')
    expect(wrapper.emitted('submit')?.[1]?.[0]).toMatchObject({
      taskId: task.id,
      complete: true,
      didWhat: '确认任务完成',
    })
  })

  it('keeps the same submissionId across a failed retry', async () => {
    const task = makeTask()
    const wrapper = mount(EvidenceForm, {
      props: { tasks: [task], projectKey: task.projectId },
    })

    await wrapper.find('#evidence-did').setValue('第一次尝试')
    await wrapper.find('form').trigger('submit')
    await wrapper.find('form').trigger('submit')

    const submissions = wrapper.emitted('submit') ?? []
    expect(submissions).toHaveLength(2)
    expect(submissions[0]?.[0]).toEqual(submissions[1]?.[0])
  })

  it('disables completion submission unless the selected task is doing', async () => {
    const doingTask = makeTask('doing')
    const wrapper = mount(EvidenceForm, {
      props: { tasks: [doingTask], projectKey: doingTask.projectId },
    })

    await wrapper.find('#evidence-task').setValue(doingTask.id)
    await wrapper.get('button.mode-option.complete').trigger('click')
    await wrapper.find('#evidence-task').setValue('')

    expect(wrapper.get('button.submit').attributes('disabled')).toBeDefined()
  })
})

describe('WorkbenchView', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            contractVersion: '1.0',
            requestId: null,
            code: 'INVALID_INPUT',
            message: 'UI test response',
            retryable: false,
            retryAfterSeconds: null,
          }),
          { status: 400, headers: { 'content-type': 'application/json' } },
        ),
      ),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows local-rule recommendations after the advisor request fails', async () => {
    const store = freshStore()
    createProject(store)
    const seeded = store.claimTask({
      draft: {
        title: '用于兜底测试的任务',
        doneCriteria: '完成测试',
        requestId: null,
        basisEvidenceIds: [],
        basisDoubtIds: [],
      },
    })
    expect(seeded.ok).toBe(true)
    const wrapper = mount(WorkbenchView)

    await wrapper.get('button.ai-status-action').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('本地规则')
    expect(wrapper.findAll('.step-card').length).toBeGreaterThan(0)
  })

  it('claims a new-task recommendation through the draft action', async () => {
    const store = freshStore()
    const projectId = createProject(store)
    const seeded = store.claimTask({
      draft: {
        title: '已有用户输入的任务',
        doneCriteria: '完成测试',
        requestId: null,
        basisEvidenceIds: [],
        basisDoubtIds: [],
      },
    })
    expect(seeded.ok).toBe(true)
    const project = store.current
    if (project === undefined) throw new Error('缺少测试项目')
    const initialTaskCount = project.tasks.length
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
        const request = JSON.parse(String(init?.body ?? '{}')) as { requestId?: unknown }
        if (typeof request.requestId !== 'string') throw new Error('测试请求缺少 requestId')
        return advisorResponse(projectId, project.projectRevision, null, '创建一个新任务', request.requestId)
      }),
    )
    const wrapper = mount(WorkbenchView)

    await wrapper.get('button.ai-status-action').trigger('click')
    await flushPromises()
    await wrapper.get('.recommendation-list .sc-actions button').trigger('click')

    expect(store.current?.tasks).toHaveLength(initialTaskCount + 1)
    expect(store.current?.tasks.some((task) => task.title === '创建一个新任务' && task.status === 'doing')).toBe(true)
  })

  it('derives claim state from the real task of each project（切换项目不串状态）', async () => {
    const store = freshStore()
    // 项目一：任务仍是 todo（还没认领）；项目二：任务已经 doing（已认领）
    const firstProjectId = createProject(store, '项目一')
    const firstTask = seedTask(store, 'todo')
    const second = createProjectWithTask(store, '项目二')

    stubAdvisor(({ projectId, projectRevision, requestId }) =>
      advisorResponse(
        projectId,
        projectRevision,
        projectId === second.projectId ? second.taskId : firstTask.id,
        '切换项目后的建议',
        requestId,
      ),
    )
    const wrapper = mount(WorkbenchView)

    // 当前是项目二：任务已 doing → 建议直接显示已认领
    await wrapper.get('button.ai-status-action').trigger('click')
    await flushPromises()
    const secondClaimButton = wrapper.get('.recommendation-list .sc-actions button')
    expect(secondClaimButton.text()).toContain('已认领')
    expect(secondClaimButton.attributes('disabled')).toBeDefined()

    // 切到项目一：任务还没认领 → 按钮恢复可点击（状态来自该项目自己的任务）
    await wrapper.find('select.proj-select').setValue(firstProjectId)
    await wrapper.get('button.ai-status-action').trigger('click')
    await flushPromises()
    const firstClaimButton = wrapper.get('.recommendation-list .sc-actions button')
    expect(firstClaimButton.text()).toContain('认领这一步')
    expect(firstClaimButton.attributes('disabled')).toBeUndefined()

    // 在项目一认领，再切回项目二：两个项目的状态互不影响
    await firstClaimButton.trigger('click')
    expect(store.projects.find((item) => item.projectId === firstProjectId)?.tasks[0]?.status).toBe('doing')

    await wrapper.find('select.proj-select').setValue(second.projectId)
    await wrapper.get('button.ai-status-action').trigger('click')
    await flushPromises()
    expect(wrapper.get('.recommendation-list .sc-actions button').text()).toContain('已认领')
  })

  it('shows 已认领 · 进行中 and disables the claim button right after claiming', async () => {
    const store = freshStore()
    const projectId = createProject(store)
    const task = seedTask(store, 'todo')
    stubAdvisor(({ projectRevision, requestId }) =>
      advisorResponse(projectId, projectRevision, task.id, '把目标写清楚', requestId),
    )
    const wrapper = mount(WorkbenchView)

    await wrapper.get('button.ai-status-action').trigger('click')
    await flushPromises()

    const button = wrapper.get('.recommendation-list .sc-actions button')
    expect(button.text()).toContain('认领这一步')
    await button.trigger('click')

    const claimed = wrapper.get('.recommendation-list .sc-actions button')
    expect(claimed.text()).toContain('已认领')
    expect(claimed.text()).toContain('进行中')
    expect(claimed.attributes('disabled')).toBeDefined()
    expect(store.current?.tasks.find((item) => item.id === task.id)?.status).toBe('doing')

    // 顾问区：同一个任务只出现一次，且直接显示真实状态「进行中」，按钮不再可点
    const advisorCard = wrapper.get('.advisor-steps .step-card')
    expect(advisorCard.text()).toContain('等待认领的步骤')
    expect(advisorCard.text()).toContain('进行中')
    expect(advisorCard.get('button').attributes('disabled')).toBeDefined()
  })

  it('keeps the claim state after re-fetching suggestions（建议重新生成也不回退）', async () => {
    const store = freshStore()
    const projectId = createProject(store)
    const task = seedTask(store, 'todo', '把目标写清楚')
    let round = 0
    stubAdvisor(({ projectRevision, requestId }) => {
      round += 1
      // 第二轮模拟 AI 重新生成：给出同标题的候选建议（existingTaskId 为空、requestId 是新的）
      return advisorResponse(
        projectId,
        projectRevision,
        round === 1 ? task.id : null,
        '把目标写清楚',
        requestId,
      )
    })
    const wrapper = mount(WorkbenchView)

    await wrapper.get('button.ai-status-action').trigger('click')
    await flushPromises()
    await wrapper.get('.recommendation-list .sc-actions button').trigger('click')
    expect(store.current?.tasks.find((item) => item.id === task.id)?.status).toBe('doing')

    // 重新获取建议：建议是新的一批（id / requestId 都变了），但任务已经在项目里
    await wrapper.get('button.ai-status-action').trigger('click')
    await flushPromises()

    const button = wrapper.get('.recommendation-list .sc-actions button')
    expect(button.text()).toContain('已认领')
    expect(button.attributes('disabled')).toBeDefined()
    expect(store.current?.tasks).toHaveLength(1)
  })

  it('keeps repeated claims idempotent（不重复建任务、不递增 revision）', async () => {
    const store = freshStore()
    const projectId = createProject(store)
    const task = seedTask(store, 'todo')
    stubAdvisor(({ projectRevision, requestId }) =>
      advisorResponse(projectId, projectRevision, task.id, '把目标写清楚', requestId),
    )
    const wrapper = mount(WorkbenchView)

    await wrapper.get('button.ai-status-action').trigger('click')
    await flushPromises()
    const button = wrapper.get('.recommendation-list .sc-actions button')
    await button.trigger('click')

    const taskCount = store.current?.tasks.length
    const revision = store.current?.projectRevision

    // 按钮虽然已经禁用，仍然再点两次：不得新建任务、不得递增 revision
    await button.trigger('click')
    await button.trigger('click')

    expect(store.current?.tasks).toHaveLength(taskCount ?? 0)
    expect(store.current?.projectRevision).toBe(revision)
    expect(store.toastText).toContain('已认领')
  })

  it('keeps the claimed state after a reload（刷新后不再是「认领这一步」）', async () => {
    const store = freshStore()
    const projectId = createProject(store)
    const task = seedTask(store, 'todo')
    stubAdvisor(({ projectRevision, requestId }) =>
      advisorResponse(projectId, projectRevision, task.id, '把目标写清楚', requestId),
    )
    const wrapper = mount(WorkbenchView)
    await wrapper.get('button.ai-status-action').trigger('click')
    await flushPromises()
    await wrapper.get('.recommendation-list .sc-actions button').trigger('click')
    wrapper.unmount()

    // 重新加载：新的 pinia / store，项目状态从 localStorage 恢复
    const reloaded = freshStore()
    expect(reloaded.current?.projectId).toBe(projectId)
    expect(reloaded.current?.tasks.find((item) => item.id === task.id)?.status).toBe('doing')

    const reloadedWrapper = mount(WorkbenchView)
    await reloadedWrapper.get('button.ai-status-action').trigger('click')
    await flushPromises()

    const button = reloadedWrapper.get('.recommendation-list .sc-actions button')
    expect(button.text()).toContain('已认领')
    expect(button.attributes('disabled')).toBeDefined()
    expect(reloadedWrapper.text()).not.toContain('认领这一步')
  })

  it('hides the blank-project hint after the first progress', async () => {
    const store = freshStore()
    createProject(store)
    const wrapper = mount(WorkbenchView)

    expect(wrapper.text()).toContain('这是一个空白项目')
    expect(store.current?.banner).toContain('空白项目')

    await wrapper.get('#evidence-did').setValue('读了 2 篇文献并整理了结论')
    await wrapper.get('form.evidence-form').trigger('submit')
    await flushPromises()

    expect(store.current?.evidenceRecords).toHaveLength(1)
    expect(store.current?.banner).not.toContain('空白项目')
    expect(wrapper.text()).not.toContain('这是一个空白项目')
  })

  it('never shows the blank-project hint when the project already has tasks', () => {
    const store = freshStore()
    createProjectWithTask(store, '已有任务的项目')
    const wrapper = mount(WorkbenchView)

    expect(store.current?.banner).toContain('进行中')
    expect(store.current?.banner).not.toContain('空白项目')
    expect(wrapper.text()).not.toContain('这是一个空白项目')
  })

  it('hides the blank-project hint after uploading a material', async () => {
    const store = freshStore()
    createProject(store)
    const wrapper = mount(WorkbenchView)
    expect(wrapper.text()).toContain('这是一个空白项目')

    store.uploadMaterial('实验手册', '实验手册.pdf')
    await wrapper.vm.$nextTick()

    expect(store.current?.banner).not.toContain('空白项目')
    expect(wrapper.text()).not.toContain('这是一个空白项目')
  })

  it('keeps chat history per project and signs replies as local tips', async () => {
    // 聊天回复走 window.setTimeout：用假定时器把它推进完，避免残留定时器污染后续用例
    vi.useFakeTimers()
    try {
      const store = freshStore()
      const firstProjectId = createProject(store, '项目一')
      const secondProjectId = createProject(store, '项目二')
      const wrapper = mount(WorkbenchView)

      store.sendChat('项目二的问题')
      await vi.advanceTimersByTimeAsync(700)

      const chat = store.current?.chat ?? []
      expect(chat[0]?.text).toBe('项目二的问题')
      // 回复署名是「本地提示」，不伪装成真实 AI
      expect(chat[1]?.who).toBe('本地提示')
      expect(chat[1]?.who).not.toBe('AI 顾问')

      await wrapper.find('select.proj-select').setValue(firstProjectId)
      expect(store.current?.chat).toHaveLength(0)

      await wrapper.find('select.proj-select').setValue(secondProjectId)
      expect(store.current?.chat).toHaveLength(2)
      expect(store.current?.chat[1]?.who).toBe('本地提示')
    } finally {
      vi.useRealTimers()
    }
  })

  it('does not request suggestions for a completely blank project', async () => {
    const store = freshStore()
    createProject(store)
    const wrapper = mount(WorkbenchView)

    const action = wrapper.get('button.ai-status-action')
    expect(action.attributes('disabled')).toBeDefined()
    expect(action.text()).toContain('等待项目内容')
    await action.trigger('click')
    await flushPromises()

    expect(store.aiStatus).toBe('idle')
    expect(wrapper.findAll('.recommendation-list .step-card')).toHaveLength(0)
  })

  it('shows a persistent saved-evidence hint when the advisor falls back', async () => {
    const store = freshStore()
    createProject(store)
    const wrapper = mount(WorkbenchView)

    await wrapper.get('#evidence-did').setValue('提交了一条进展证据')
    await wrapper.get('form.evidence-form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('.evidence-save-status').text()).toContain('证据已保存')
    expect(wrapper.get('.evidence-save-status').text()).toContain('建议暂时使用规则结果')
  })

  it('keeps the evidence form after a failed store submission', async () => {
    const store = freshStore()
    createProject(store)
    vi.spyOn(store, 'submitEvidence').mockResolvedValue({
      ok: false,
      code: 'INVALID_INPUT',
      message: '测试提交失败',
    })
    const wrapper = mount(WorkbenchView)

    const didWhat = wrapper.get('#evidence-did')
    await didWhat.setValue('这段内容应该保留')
    await wrapper.get('form.evidence-form').trigger('submit')
    await flushPromises()

    expect((didWhat.element as HTMLTextAreaElement).value).toBe('这段内容应该保留')
  })

  it('clears the selected task and evidence fields when switching projects', async () => {
    const store = freshStore()
    const firstProjectId = createProject(store, '项目一')
    const second = createProjectWithTask(store, '项目二')
    const secondProjectId = second.projectId
    const wrapper = mount(WorkbenchView)

    await wrapper.get('#evidence-task').setValue(second.taskId)
    await wrapper.get('#evidence-did').setValue('项目二的进展')
    await wrapper.find('select.proj-select').setValue(firstProjectId)
    await wrapper.vm.$nextTick()

    expect((wrapper.get('#evidence-did').element as HTMLTextAreaElement).value).toBe('')
    expect((wrapper.get('#evidence-task').element as HTMLSelectElement).value).toBe('')
    expect(store.current?.projectId).toBe(firstProjectId)
    expect(store.current?.projectId).not.toBe(secondProjectId)
  })
})
