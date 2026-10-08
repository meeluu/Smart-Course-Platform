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

  it('keeps a draft recommendation claimable with the contract label', async () => {
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
    expect(button.text()).toContain('就按这个做')
    await button.trigger('click')
    expect(wrapper.emitted('claim')).toHaveLength(1)
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
    const wrapper = mount(WorkbenchView)

    await wrapper.get('button.ai-status-action').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('本地规则')
    expect(wrapper.findAll('.step-card').length).toBeGreaterThan(0)
  })

  it('claims a new-task recommendation through the draft action', async () => {
    const store = freshStore()
    const projectId = createProject(store)
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

  it('clears claimed recommendation ids when switching projects', async () => {
    const store = freshStore()
    const firstProjectId = createProject(store, '项目一')
    const secondProjectId = createProject(store, '项目二')
    const firstProject = store.projects.find((item) => item.projectId === firstProjectId)
    const secondProject = store.projects.find((item) => item.projectId === secondProjectId)
    if (firstProject === undefined || secondProject === undefined) throw new Error('缺少测试项目')
    const firstTaskId = firstProject.tasks[0]?.id
    const secondTaskId = secondProject.tasks[0]?.id
    if (firstTaskId === undefined || secondTaskId === undefined) throw new Error('缺少测试任务')
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
        const taskId = request.projectId === secondProjectId ? secondTaskId : firstTaskId
        return advisorResponse(request.projectId, request.projectRevision, taskId, '切换项目后的建议', request.requestId)
      }),
    )
    const wrapper = mount(WorkbenchView)

    await wrapper.get('button.ai-status-action').trigger('click')
    await flushPromises()
    const secondClaimButton = wrapper.get('.recommendation-list .sc-actions button')
    await secondClaimButton.trigger('click')
    expect(secondClaimButton.attributes('disabled')).toBeDefined()

    await wrapper.find('select.proj-select').setValue(firstProjectId)
    await wrapper.get('button.ai-status-action').trigger('click')
    await flushPromises()

    const firstClaimButton = wrapper.get('.recommendation-list .sc-actions button')
    expect(firstClaimButton.attributes('disabled')).toBeUndefined()
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
    const secondProjectId = createProject(store, '项目二')
    const wrapper = mount(WorkbenchView)

    const secondTask = store.current?.tasks[0]
    if (secondTask === undefined) throw new Error('缺少第二个项目任务')
    await wrapper.get('#evidence-task').setValue(secondTask.id)
    await wrapper.get('#evidence-did').setValue('项目二的进展')
    await wrapper.find('select.proj-select').setValue(firstProjectId)
    await wrapper.vm.$nextTick()

    expect((wrapper.get('#evidence-did').element as HTMLTextAreaElement).value).toBe('')
    expect((wrapper.get('#evidence-task').element as HTMLSelectElement).value).toBe('')
    expect(store.current?.projectId).toBe(firstProjectId)
    expect(store.current?.projectId).not.toBe(secondProjectId)
  })
})
