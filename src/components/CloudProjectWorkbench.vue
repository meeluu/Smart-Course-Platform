<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useCloudStore, type CloudAdvisorState, type CloudChatState } from '@/stores/cloud'
import { usePlatformStore } from '@/stores/platform'
import { bytesToBase64 } from '@/services/materialsApi'
import type { CloudMaterial, CloudMilestone, CloudTask } from '@/types/platform'

const platform = usePlatformStore()
const cloud = useCloudStore()
const router = useRouter()

const project = computed(() => platform.cloudProject)
/** 云端工作台只由 WorkbenchView 在云端模式下渲染；这里再兜一层，避免本地模式误显示 AI 入口 */
const cloudMode = computed(() => platform.isCloudSource !== false)
const allMilestones = computed(() => cloud.milestones)
const milestones = computed(() => allMilestones.value.filter((item) => item.archivedAt === null))
const tasks = computed(() => cloud.tasks.filter((item) => item.archivedAt === null))
const selectedMilestoneId = ref<string | null>(null)
const currentMilestone = computed(
  () => milestones.value.find((item) => item.milestoneId === selectedMilestoneId.value)
    ?? milestones.value.find((item) => item.milestoneId === cloud.currentMilestoneId)
    ?? milestones.value[0]
    ?? null,
)
const currentTasks = computed(() =>
  currentMilestone.value === null
    ? tasks.value.filter((task) => task.milestoneId === null)
    : tasks.value.filter((task) => task.milestoneId === currentMilestone.value?.milestoneId),
)
/** 没有挂阶段的任务：不主动显示就会“建完就消失” */
const unassignedTasks = computed(() => tasks.value.filter((task) => task.milestoneId === null))
const currentEvidence = computed(() =>
  cloud.evidence.filter(
    (item) => item.status === 'active' && (
      item.milestoneId === currentMilestone.value?.milestoneId ||
      currentTasks.value.some((task) => task.taskId === item.taskId)
    ),
  ),
)
const currentProgress = computed(() =>
  cloud.progress
    .filter((item) => item.status === 'active' && item.milestoneId === currentMilestone.value?.milestoneId)
    .slice()
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)),
)

const actionError = ref('')
/** 已有项目时也能新建：创建表单由本地开关控制，不依赖“当前没有项目” */
const showCreate = ref(false)

/* ------------------------------------------------------------ 云端材料 */
const MAX_MATERIAL_BYTES = 1024 * 1024
const materialUploadError = ref('')
const materialUploadNotice = ref('')
const materialsReloading = ref(false)
/** 本页是否成功完成过一次材料刷新（store 未提供 hydrated 时的兜底） */
const materialsLoadedOnce = ref(false)

const cloudMaterials = computed<CloudMaterial[]>(() =>
  Array.isArray(cloud.materials) ? cloud.materials : [],
)
const materialsStatus = computed(() => cloud.materialsStatus ?? 'idle')
const materialsError = computed(() => cloud.materialsError ?? null)
const materialsHydrated = computed(() => cloud.materialsHydrated === true)
const materialsReady = computed(() => materialsHydrated.value || materialsLoadedOnce.value)
/** 兼容尚未注入材料状态/刷新 action 的旧页面或测试替身 */
const materialsApiAvailable = computed(() =>
  Array.isArray(cloud.materials) && typeof cloud.refreshMaterials === 'function',
)

interface MaterialRowView {
  material: CloudMaterial
  segmentCount: number | null
  confirmedCount: number | null
  loading: boolean
}

const materialRows = computed<MaterialRowView[]>(() =>
  cloudMaterials.value.filter((material) => material.isCurrent !== false).map((material) => {
    const segments = typeof cloud.cachedSegments === 'function'
      ? cloud.cachedSegments(material.materialId, material.materialVersion)
      : null
    const items = typeof cloud.cachedUnderstanding === 'function'
      ? cloud.cachedUnderstanding(material.materialId, material.materialVersion)
      : null
    return {
      material,
      segmentCount: segments === null ? null : segments.length,
      confirmedCount: items === null ? null : items.filter((item) => item.status === 'confirmed').length,
      loading: typeof cloud.isMaterialReadLoading === 'function'
        ? cloud.isMaterialReadLoading(material.materialId, material.materialVersion)
        : false,
    }
  }),
)

/* ------------------------------------------------------------ 云端 AI */
const advisorError = ref('')
const advisorState = computed<CloudAdvisorState | null>(() => cloud.advisor ?? null)

const chatQuestion = ref('')
const chatError = ref('')
const chatState = computed<CloudChatState | null>(() => cloud.chat ?? null)

const advisorLoading = computed(() => advisorState.value?.status === 'loading')
const chatLoading = computed(() => chatState.value?.status === 'loading')
const chatMessages = computed(() => chatState.value?.messages ?? [])

/**
 * 标签页：保持「项目推进｜项目资料」布局（V3-V4 任务 2）。
 * 两个面板都常驻（v-show），切换标签不会卸载表单，输入不会静默丢失。
 */
const CLOUD_TABS = [
  { key: 'progress' as const, label: '项目推进' },
  { key: 'data' as const, label: '项目资料' },
]
const activeTab = ref<'progress' | 'data'>('progress')

const milestoneNameInput = ref<HTMLInputElement | null>(null)
const milestoneCriteriaInput = ref<HTMLTextAreaElement | null>(null)
const taskTitleInput = ref<HTMLInputElement | null>(null)
const progressSummaryInput = ref<HTMLTextAreaElement | null>(null)
const evidenceDidWhatInput = ref<HTMLTextAreaElement | null>(null)

function selectTab(tab: 'progress' | 'data'): void {
  activeTab.value = tab
  if (tab === 'data') void loadMaterials()
}

/** 标签页键盘操作：左右方向键循环，Home / End 到首尾 */
function onTabKeydown(event: KeyboardEvent, index: number): void {
  const last = CLOUD_TABS.length - 1
  let target: number
  if (event.key === 'ArrowRight') target = index === last ? 0 : index + 1
  else if (event.key === 'ArrowLeft') target = index === 0 ? last : index - 1
  else if (event.key === 'Home') target = 0
  else if (event.key === 'End') target = last
  else return
  event.preventDefault()
  const tab = CLOUD_TABS[target]
  if (tab === undefined) return
  selectTab(tab.key)
  void nextTick(() => document.getElementById(`cloud-tab-${tab.key}`)?.focus())
}

async function focusField(target: 'milestone-name' | 'milestone-criteria' | 'task-title' | 'progress' | 'evidence'): Promise<void> {
  activeTab.value = 'progress'
  await nextTick()
  const element =
    target === 'milestone-name' ? milestoneNameInput.value
      : target === 'milestone-criteria' ? milestoneCriteriaInput.value
        : target === 'task-title' ? taskTitleInput.value
          : target === 'progress' ? progressSummaryInput.value
            : evidenceDidWhatInput.value
  if (typeof element?.scrollIntoView === 'function') element.scrollIntoView({ block: 'center' })
  element?.focus()
}

const projectForm = reactive({
  name: '',
  short: '',
  goal: '',
  expectedOutcome: '',
  members: '',
  researchPeriod: '',
  scope: '',
  outOfScope: '',
})
const milestoneForm = reactive({ name: '', goal: '', doneCriteria: '', dueAt: '' })
const editingMilestoneId = ref<string | null>(null)
const taskForm = reactive({ title: '', doneCriteria: '', milestoneId: '' })
const progressForm = reactive({ summary: '', taskId: '' })
const evidenceForm = reactive({ didWhat: '', foundWhat: '', stillUnsure: '', taskId: '', completeTask: false })

interface WorkbenchDraft {
  selectedMilestoneId: string | null
  projectForm: typeof projectForm
  milestoneForm: typeof milestoneForm
  editingMilestoneId: string | null
  taskForm: typeof taskForm
  progressForm: typeof progressForm
  evidenceForm: typeof evidenceForm
}

const drafts = new Map<string, WorkbenchDraft>()

function saveDraft(projectId: string | null | undefined): void {
  if (!projectId) return
  drafts.set(projectId, {
    selectedMilestoneId: selectedMilestoneId.value,
    projectForm: { ...projectForm },
    milestoneForm: { ...milestoneForm },
    editingMilestoneId: editingMilestoneId.value,
    taskForm: { ...taskForm },
    progressForm: { ...progressForm },
    evidenceForm: { ...evidenceForm },
  })
}

function restoreDraft(projectId: string): void {
  const draft = drafts.get(projectId)
  if (draft === undefined) {
    selectedMilestoneId.value = null
    clearMilestoneForm()
    Object.assign(projectForm, { name: '', short: '', goal: '', expectedOutcome: '', members: '', researchPeriod: '', scope: '', outOfScope: '' })
    Object.assign(taskForm, { title: '', doneCriteria: '', milestoneId: '' })
    Object.assign(progressForm, { summary: '', taskId: '' })
    Object.assign(evidenceForm, { didWhat: '', foundWhat: '', stillUnsure: '', taskId: '', completeTask: false })
    return
  }

  selectedMilestoneId.value = draft.selectedMilestoneId
  Object.assign(projectForm, draft.projectForm)
  Object.assign(milestoneForm, draft.milestoneForm)
  editingMilestoneId.value = draft.editingMilestoneId
  Object.assign(taskForm, draft.taskForm)
  Object.assign(progressForm, draft.progressForm)
  Object.assign(evidenceForm, draft.evidenceForm)
}

watch(
  () => project.value?.projectId ?? null,
  (projectId, previousProjectId) => {
    if (previousProjectId !== null && previousProjectId !== undefined) saveDraft(previousProjectId)
    if (projectId !== previousProjectId) {
      materialsLoadedOnce.value = false
      materialUploadError.value = ''
      materialUploadNotice.value = ''
      advisorError.value = ''
      chatError.value = ''
      chatQuestion.value = ''
    }
    if (projectId !== null) restoreDraft(projectId)
    if (projectId !== null && activeTab.value === 'data') void loadMaterials()
  },
  { immediate: true },
)

function setError(result: { ok: boolean; message?: string }): boolean {
  if (result.ok) {
    actionError.value = ''
    return false
  }
  actionError.value = result.message ?? '操作没有完成，请稍后再试'
  return true
}

function isBusy(action: string): boolean {
  return typeof cloud.isActionLoading === 'function' && cloud.isActionLoading(action)
}

function requestMilestoneCandidates(): void {
  actionError.value = '阶段候选接口暂未接入，当前只能手动新建阶段；平台不会用本地或假数据代替候选结果。'
}

type NextStepKind =
  | 'activate-milestone'
  | 'complete-milestone'
  | 'fill-done-criteria'
  | 'create-task'
  | 'start-task'
  | 'submit-evidence'
  | 'record-progress'

interface NextStepHint {
  id: string
  kind: NextStepKind
  title: string
  detail: string
  actionLabel: string
  taskId: string | null
}

/**
 * 「下一步做什么」入口。
 *
 * 这里只按**当前阶段已有数据**推导行动顺序，不调用模型、不伪造 AI 结论；
 * 真正的云端 AI 建议在页面下方单独展示。
 */
const nextSteps = computed<NextStepHint[]>(() => {
  const milestone = currentMilestone.value
  if (milestone === null) return []
  const hints: NextStepHint[] = []
  const todoTasks = currentTasks.value.filter((task) => task.status === 'todo')
  const doingTasks = currentTasks.value.filter((task) => task.status === 'doing')

  if (milestone.status === 'planned') {
    hints.push({
      id: 'activate-milestone',
      kind: 'activate-milestone',
      title: '先把这个阶段开始',
      detail: '阶段还没有开始，开始后新进展和证据才会落在当前阶段上。',
      actionLabel: '开始阶段',
      taskId: null,
    })
  }
  if (milestone.doneCriteria.trim() === '') {
    hints.push({
      id: 'fill-done-criteria',
      kind: 'fill-done-criteria',
      title: '补上这个阶段的完成标准',
      detail: '没有完成标准时，阶段能不能收尾只能靠感觉判断。',
      actionLabel: '去填写',
      taskId: null,
    })
  }
  if (currentTasks.value.length === 0) {
    hints.push({
      id: 'create-task',
      kind: 'create-task',
      title: '给阶段拆一个能做完的任务',
      detail: '一个阶段至少需要一个能在几次工作内完成、可以拿证据的任务。',
      actionLabel: '去新建任务',
      taskId: null,
    })
  }
  for (const task of todoTasks.slice(0, 2)) {
    hints.push({
      id: `start-${task.taskId}`,
      kind: 'start-task',
      title: `开始任务：${task.title}`,
      detail: '任务还是待开始状态，先动手，再回来补进展和证据。',
      actionLabel: '开始',
      taskId: task.taskId,
    })
  }
  for (const task of doingTasks.slice(0, 2)) {
    const hasEvidence = cloud.evidence.some((item) => item.taskId === task.taskId && item.status === 'active')
    if (hasEvidence) continue
    hints.push({
      id: `evidence-${task.taskId}`,
      kind: 'submit-evidence',
      title: `为「${task.title}」补一条证据`,
      detail: '任务在进行中但还没有证据，先写下做了什么、发现了什么。',
      actionLabel: '去记录证据',
      taskId: task.taskId,
    })
  }
  if (currentProgress.value.length === 0) {
    hints.push({
      id: 'record-progress',
      kind: 'record-progress',
      title: '记录一次进展',
      detail: '当前阶段还没有进展记录，写一句也能让后面的建议有依据。',
      actionLabel: '去记录进展',
      taskId: null,
    })
  }
  if (
    currentTasks.value.length > 0 &&
    currentTasks.value.every((task) => task.status === 'done') &&
    milestone.status !== 'completed'
  ) {
    hints.push({
      id: 'complete-milestone',
      kind: 'complete-milestone',
      title: '任务都完成了，可以收尾这个阶段',
      detail: '确认完成标准都满足后再标记完成；已有证据会保留在阶段历史里。',
      actionLabel: '完成阶段',
      taskId: null,
    })
  }
  return hints.slice(0, 4)
})

async function runNextStep(hint: NextStepHint): Promise<void> {
  const milestone = currentMilestone.value
  if (hint.kind === 'activate-milestone' && milestone !== null) {
    await milestoneAction(milestone, 'activate')
    return
  }
  if (hint.kind === 'complete-milestone' && milestone !== null) {
    await milestoneAction(milestone, 'complete')
    return
  }
  if (hint.kind === 'fill-done-criteria' && milestone !== null) {
    editMilestone(milestone)
    await focusField('milestone-criteria')
    return
  }
  if (hint.kind === 'create-task') {
    await focusField('task-title')
    return
  }
  if (hint.kind === 'start-task') {
    const task = currentTasks.value.find((item) => item.taskId === hint.taskId)
    if (task !== undefined) await taskAction(task, 'start')
    return
  }
  if (hint.kind === 'submit-evidence') {
    evidenceForm.taskId = hint.taskId ?? ''
    await focusField('evidence')
    return
  }
  await focusField('progress')
}

function splitMembers(value: string): string[] {
  return value.split(/[、,，;；\s]+/).map((item) => item.trim()).filter((item) => item !== '')
}

async function createProject(): Promise<void> {
  if (projectForm.name.trim() === '') return
  const result = await platform.createCloudProject({
    name: projectForm.name,
    short: projectForm.short,
    profile: {
      goal: projectForm.goal.trim() || null,
      expectedOutcome: projectForm.expectedOutcome.trim() || null,
      memberNames: splitMembers(projectForm.members),
      researchPeriod: projectForm.researchPeriod.trim() || null,
      scope: projectForm.scope.trim() || null,
      outOfScope: projectForm.outOfScope.trim() || null,
    },
  })
  if (setError(result)) return
  projectForm.name = ''
  projectForm.short = ''
  projectForm.goal = ''
  projectForm.expectedOutcome = ''
  projectForm.members = ''
  projectForm.researchPeriod = ''
  projectForm.scope = ''
  projectForm.outOfScope = ''
  showCreate.value = false
}

async function selectProject(event: Event): Promise<void> {
  const value = (event.target as HTMLSelectElement).value
  saveDraft(project.value?.projectId)
  const result = await platform.selectCloudProject(value.replace(/^cloud:/, ''))
  setError(result)
}

function selectMilestone(event: Event): void {
  const value = (event.target as HTMLSelectElement).value
  selectedMilestoneId.value = value === '' ? null : value
  saveDraft(project.value?.projectId)
}

/**
 * 新建任务默认挂到当前阶段。
 * 否则新建的任务会以「待办任务」落库，而阶段视图只按 milestoneId 过滤，用户会觉得任务凭空消失。
 */
watch(
  () => currentMilestone.value?.milestoneId ?? '',
  (milestoneId) => {
    if (milestoneId !== '' && taskForm.milestoneId === '') taskForm.milestoneId = milestoneId
  },
  { immediate: true },
)

async function linkUnassignedTask(task: CloudTask): Promise<void> {
  if (currentMilestone.value === null) return
  setError(await cloud.linkTaskToMilestone({
    taskId: task.taskId,
    milestoneId: currentMilestone.value.milestoneId,
    expectedRevision: task.revision,
  }))
}

/** ISO 字符串 → datetime-local 的值。直接截取 UTC 字符串会让编辑框里的时间偏 8 小时。 */
function toLocalDateTimeInput(value: string | null): string {
  if (value === null) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (input: number): string => String(input).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function editMilestone(milestone: CloudMilestone): void {
  editingMilestoneId.value = milestone.milestoneId
  milestoneForm.name = milestone.name
  milestoneForm.goal = milestone.goal
  milestoneForm.doneCriteria = milestone.doneCriteria
  milestoneForm.dueAt = toLocalDateTimeInput(milestone.dueAt)
}

function clearMilestoneForm(): void {
  editingMilestoneId.value = null
  milestoneForm.name = ''
  milestoneForm.goal = ''
  milestoneForm.doneCriteria = ''
  milestoneForm.dueAt = ''
}

async function saveMilestone(): Promise<void> {
  if (milestoneForm.name.trim() === '') {
    actionError.value = '请先填写阶段名称'
    return
  }
  const dueAt = milestoneForm.dueAt === '' ? null : new Date(milestoneForm.dueAt).toISOString()
  const editing = milestones.value.find((item) => item.milestoneId === editingMilestoneId.value)
  const result = editing === undefined
    ? await cloud.createMilestone({ name: milestoneForm.name.trim(), goal: milestoneForm.goal, doneCriteria: milestoneForm.doneCriteria, dueAt, status: 'planned', source: 'manual' })
    : await cloud.updateMilestone({ milestoneId: editing.milestoneId, expectedRevision: editing.revision, name: milestoneForm.name.trim(), goal: milestoneForm.goal, doneCriteria: milestoneForm.doneCriteria, dueAt })
  if (setError(result)) return
  // 新建后直接切到该阶段，避免“建完还停在旧阶段”的错觉
  if (editing === undefined && result.ok) selectedMilestoneId.value = result.data.milestoneId
  clearMilestoneForm()
}

async function moveMilestone(milestone: CloudMilestone, direction: -1 | 1): Promise<void> {
  const index = milestones.value.findIndex((item) => item.milestoneId === milestone.milestoneId)
  const target = index + direction
  if (index < 0 || target < 0 || target >= milestones.value.length) return
  const order = milestones.value.map((item) => item.milestoneId)
  ;[order[index], order[target]] = [order[target], order[index]]
  setError(await cloud.reorderMilestones({ order }))
}

function activeMilestoneIndex(milestoneId: string): number {
  return milestones.value.findIndex((item) => item.milestoneId === milestoneId)
}

async function milestoneAction(milestone: CloudMilestone, action: 'activate' | 'complete' | 'reopen' | 'archive' | 'restore'): Promise<void> {
  const input = { milestoneId: milestone.milestoneId, expectedRevision: milestone.revision }
  const result = action === 'activate' ? await cloud.activateMilestone(input)
    : action === 'complete' ? await cloud.completeMilestone(input)
      : action === 'reopen' ? await cloud.reopenMilestone(input)
        : action === 'archive' ? await cloud.archiveMilestone(input)
          : await cloud.restoreMilestone(input)
  setError(result)
}

async function createTask(): Promise<void> {
  const result = await cloud.createTask({
    title: taskForm.title,
    doneCriteria: taskForm.doneCriteria,
    milestoneId: taskForm.milestoneId || null,
    status: 'todo',
  })
  if (!setError(result)) {
    taskForm.title = ''
    taskForm.doneCriteria = ''
  }
}

async function taskAction(task: CloudTask, action: 'start' | 'complete' | 'reopen'): Promise<void> {
  const result = action === 'start'
    ? await cloud.startTask({ taskId: task.taskId, expectedRevision: task.revision })
    : action === 'complete'
      ? await cloud.completeTask({ taskId: task.taskId, expectedRevision: task.revision })
      : await cloud.reopenTask({ taskId: task.taskId, expectedRevision: task.revision })
  setError(result)
}

async function submitProgress(): Promise<void> {
  const result = await cloud.submitProgress({
    milestoneId: currentMilestone.value?.milestoneId ?? null,
    taskId: progressForm.taskId || null,
    summary: progressForm.summary,
  })
  if (!setError(result)) {
    progressForm.summary = ''
    progressForm.taskId = ''
  }
}

async function submitEvidence(): Promise<void> {
  const task = tasks.value.find((item) => item.taskId === evidenceForm.taskId) ?? null
  const result = await cloud.createEvidence({
    taskId: task?.taskId ?? null,
    milestoneId: task?.milestoneId ?? currentMilestone.value?.milestoneId ?? null,
    didWhat: evidenceForm.didWhat,
    foundWhat: evidenceForm.foundWhat,
    stillUnsure: evidenceForm.stillUnsure,
    completeTask: evidenceForm.completeTask,
    ...(evidenceForm.completeTask && task !== null ? { expectedTaskRevision: task.revision } : {}),
  })
  if (!setError(result)) {
    evidenceForm.didWhat = ''
    evidenceForm.foundWhat = ''
    evidenceForm.stillUnsure = ''
    evidenceForm.completeTask = false
  }
}

/* ------------------------------------------------------------ 材料读取 */

/** 当前版本材料：列表由 refreshMaterials 负责，片段数/已确认条目数按材料+版本读取。 */
async function loadMaterialMetrics(): Promise<void> {
  if (typeof cloud.loadMaterialSegments !== 'function' || typeof cloud.loadMaterialUnderstanding !== 'function') {
    return
  }
  const current = cloudMaterials.value.filter(
    (material) =>
      material.isCurrent &&
      material.readOnly !== true &&
      (material.type === 'md' || material.type === 'txt'),
  )
  await Promise.allSettled(current.map(async (material) => {
    const input = { version: material.materialVersion, forceRefresh: true }
    await cloud.loadMaterialSegments(material.materialId, input)
    await cloud.loadMaterialUnderstanding(material.materialId, input)
  }))
}

async function loadMaterials(): Promise<void> {
  if (materialsReloading.value) return
  materialUploadError.value = ''
  if (typeof cloud.refreshMaterials !== 'function') return
  materialsReloading.value = true
  try {
    const result = await cloud.refreshMaterials()
    if (result.ok) {
      materialsLoadedOnce.value = true
      await loadMaterialMetrics()
    }
  } finally {
    materialsReloading.value = false
  }
}

function materialStatusText(status: CloudMaterial['status']): string {
  return ({
    registered: '仅登记',
    parsed: '已解析',
    parse_failed: '解析失败',
    unsupported: '格式不支持',
    archived: '已归档',
  } as Record<string, string>)[status] ?? status
}

async function onMaterialFileChange(event: Event): Promise<void> {
  materialUploadError.value = ''
  materialUploadNotice.value = ''
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] ?? null
  // 允许用户重新选择同一个文件：先清空 value，失败时也能再次触发 change
  input.value = ''
  if (file === null) return

  const extension = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')).toLowerCase() : ''
  if (extension !== '.md' && extension !== '.txt') {
    materialUploadError.value = '当前只支持 md、txt 文件；CSV、XLSX、PDF、DOCX、ZIP 暂不支持。'
    return
  }
  if (file.size > MAX_MATERIAL_BYTES) {
    materialUploadError.value = '文件超过 1 MB，请压缩或拆分后再上传。'
    return
  }
  if (file.size === 0) {
    materialUploadError.value = '文件内容为空，请检查后再上传。'
    return
  }
  if (typeof cloud.uploadMaterial !== 'function') {
    materialUploadError.value = '当前页面没有连接材料上传接口，请刷新页面后重试。'
    return
  }

  try {
    const bytes = new Uint8Array(await file.arrayBuffer())
    const result = await cloud.uploadMaterial({
      name: file.name,
      contentBase64: bytesToBase64(bytes),
    })
    if (!result.ok) {
      materialUploadError.value = result.message || '材料上传失败，请稍后重试。'
      return
    }
    const upload = cloud.materialUpload?.lastUpload
    materialUploadNotice.value = upload?.deduplicated === true
      ? '服务端已存在相同内容的材料，本次没有新建版本。'
      : `已上传 ${result.data.name}（版本 ${result.data.materialVersion}，${upload?.segmentCount ?? 0} 个片段）。`
    await loadMaterials()
  } catch {
    materialUploadError.value = '读取文件失败，请重新选择文件后再试。'
  }
}

/* ------------------------------------------------------------ 云端 AI */

function advisorSourceText(source: 'model' | 'fallback' | 'local-rule' | null): string {
  if (source === 'model') return '模型生成（model）'
  if (source === 'fallback') return '服务端规则兜底（fallback）'
  if (source === 'local-rule') return '本地规则兜底（local-rule）'
  return '尚未生成'
}

function fallbackReasonText(reason: string | null): string {
  const map: Record<string, string> = {
    MODEL_TIMEOUT: '模型调用超时，已使用服务端规则建议。',
    INVALID_MODEL_OUTPUT: '模型输出不合法，已使用服务端规则建议。',
    MODEL_UNAVAILABLE: '模型服务暂不可用，已使用服务端规则建议。',
    MODEL_NOT_CONFIGURED: '服务端未配置模型密钥，已使用服务端规则建议。',
    RATE_LIMITED: '请求过于频繁，已使用服务端规则建议。',
  }
  return reason === null ? '本次未使用模型生成。' : (map[reason] ?? '模型未参与本次生成，已使用服务端规则建议。')
}

async function requestAdvisor(): Promise<void> {
  advisorError.value = ''
  if (typeof cloud.buildAdvisorContext !== 'function' || typeof cloud.refreshAdvisor !== 'function') {
    advisorError.value = '云端 AI 建议接口未就绪，请刷新页面后重试。'
    return
  }
  const context = cloud.buildAdvisorContext()
  if (!context.ok) {
    advisorError.value = context.message || '当前项目上下文不完整，暂时无法获取建议。'
    return
  }
  const result = await cloud.refreshAdvisor({ forceRefresh: true })
  if (!result.ok) advisorError.value = result.message || '获取云端 AI 建议失败，请稍后重试。'
}

/* ------------------------------------------------------------ 云端聊天 */

async function submitChat(): Promise<void> {
  chatError.value = ''
  const question = chatQuestion.value.trim()
  if (question === '') {
    chatError.value = '请先写下要问的问题。'
    return
  }
  if (typeof cloud.sendChat !== 'function') {
    chatError.value = '云端聊天接口未就绪，请刷新页面后重试。'
    return
  }
  const result = await cloud.sendChat({ question })
  if (!result.ok) {
    chatError.value = result.message || '发送失败，请稍后重试。'
    return
  }
  chatQuestion.value = ''
}

async function retryChat(): Promise<void> {
  chatError.value = ''
  if (typeof cloud.retryChat !== 'function') {
    chatError.value = '云端聊天接口未就绪，请刷新页面后重试。'
    return
  }
  const result = await cloud.retryChat()
  if (!result.ok) {
    chatError.value = result.message || '重试失败，请稍后重试。'
    return
  }
  chatQuestion.value = ''
}

function clearChat(): void {
  chatError.value = ''
  chatQuestion.value = ''
  if (typeof cloud.clearChat === 'function') cloud.clearChat()
}

function statusText(status: CloudMilestone['status'] | CloudTask['status']): string {
  return ({ planned: '未开始', active: '进行中', completed: '已完成', archived: '已归档', todo: '待开始', doing: '进行中', done: '已完成' } as Record<string, string>)[status]
}

function timeText(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '时间未知' : date.toLocaleString('zh-CN', { hour12: false })
}

function dueText(value: string | null): string {
  if (value === null) return '未设置截止时间'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? '截止时间未知'
    : `截止 ${date.toLocaleString('zh-CN', { hour12: false, dateStyle: 'medium', timeStyle: 'short' })}`
}
</script>

<template>
  <div class="cloud-workbench">
    <div class="mode-banner">
      <b>云端项目</b> 当前数据来自服务端。项目、阶段、任务、证据和进展会按账号保存；未实现的时间线和阶段候选不会用本地数据代替。
    </div>

    <section v-if="!project || showCreate" class="card cloud-create">
      <div class="card-h">
        <span>创建云端项目</span>
        <button v-if="project" class="btn" type="button" @click="showCreate = false">返回当前项目</button>
      </div>
      <form class="card-b cloud-form" @submit.prevent="createProject">
        <label for="cloud-project-name">项目名称</label>
        <input id="cloud-project-name" v-model="projectForm.name" required maxlength="120" />
        <label for="cloud-project-short">短名 <small>（可选）</small></label>
        <input id="cloud-project-short" v-model="projectForm.short" maxlength="20" />
        <label for="cloud-project-goal">项目目标</label>
        <textarea id="cloud-project-goal" v-model="projectForm.goal" maxlength="300"></textarea>
        <label for="cloud-project-outcome">预期产出</label>
        <textarea id="cloud-project-outcome" v-model="projectForm.expectedOutcome" maxlength="300"></textarea>
        <label for="cloud-project-members">成员姓名</label>
        <input id="cloud-project-members" v-model="projectForm.members" placeholder="张三、李四" />
        <label for="cloud-project-period">研究周期</label>
        <input id="cloud-project-period" v-model="projectForm.researchPeriod" maxlength="100" />
        <label for="cloud-project-scope">项目范围</label>
        <textarea id="cloud-project-scope" v-model="projectForm.scope" maxlength="300"></textarea>
        <label for="cloud-project-out">暂不处理</label>
        <textarea id="cloud-project-out" v-model="projectForm.outOfScope" maxlength="300"></textarea>
        <p v-if="actionError" class="cloud-error" role="alert">{{ actionError }}</p>
        <button class="btn primary" type="submit">创建云端项目</button>
      </form>
    </section>

    <template v-else>
      <section class="card cloud-head">
        <div class="card-h">
          <span>当前云端项目</span>
          <span class="tag" style="background:#E6F1FB;color:#185FA5;border:1px solid #B5D4F4;">{{ project.short }}</span>
        </div>
        <div class="card-b cloud-head-row">
          <select class="proj-select" :value="`cloud:${project.projectId}`" @change="selectProject">
            <option v-for="item in platform.cloudProjects" :key="item.projectId" :value="`cloud:${item.projectId}`">{{ item.name }}</option>
          </select>
          <button class="btn" type="button" @click="showCreate = true">新建云端项目</button>
          <button class="btn" type="button" @click="router.push('/map')">查看项目地图</button>
        </div>
        <p class="cloud-meta">{{ project.profile.goal || '还没有填写项目目标' }} · {{ project.taskStats.done }}/{{ project.taskStats.total }} 个任务已完成</p>
      </section>

      <div class="cloud-tabs" role="tablist" aria-label="云端项目视图">
        <button
          v-for="(tab, index) in CLOUD_TABS"
          :id="`cloud-tab-${tab.key}`"
          :key="tab.key"
          class="cloud-tab"
          type="button"
          role="tab"
          :aria-selected="activeTab === tab.key"
          :aria-controls="`cloud-panel-${tab.key}`"
          :tabindex="activeTab === tab.key ? 0 : -1"
          @click="selectTab(tab.key)"
          @keydown="onTabKeydown($event, index)"
        >
          {{ tab.label }}
          <span v-if="tab.key === 'progress' && milestones.length" class="tag cloud-tab-count">{{ milestones.length }}</span>
        </button>
      </div>

      <div v-show="activeTab === 'progress'" id="cloud-panel-progress" role="tabpanel" aria-labelledby="cloud-tab-progress">
        <p v-if="actionError" class="cloud-error action-error" role="alert">{{ actionError }}</p>

        <section v-if="!milestones.length" class="card empty-stage">
          <div class="card-b">
            <h2>还没有里程碑</h2>
            <p>空白项目不会自动生成阶段。你可以自己建第一个，也可以先按项目资料生成候选，再由你逐条确认写入。</p>
            <div class="empty-actions">
              <button class="btn primary" type="button" @click="focusField('milestone-name')">新建里程碑</button>
              <button class="btn" type="button" @click="requestMilestoneCandidates">根据项目资料生成候选</button>
            </div>
          </div>
        </section>

        <section class="card current-stage">
        <div class="card-h">
          <span>查看阶段</span>
          <select
            v-if="milestones.length"
            class="stage-select"
            :value="currentMilestone?.milestoneId ?? ''"
            aria-label="选择要查看的阶段"
            @change="selectMilestone"
          >
            <option v-for="milestone in milestones" :key="milestone.milestoneId" :value="milestone.milestoneId">
              {{ milestone.name }}
            </option>
          </select>
          <span v-if="currentMilestone" class="tag" style="background:#E6F1FB;color:#185FA5;border:1px solid #B5D4F4;">{{ statusText(currentMilestone.status) }}</span>
        </div>
        <div class="card-b">
          <template v-if="currentMilestone">
            <h2>{{ currentMilestone.name }}</h2>
            <p>阶段目标：{{ currentMilestone.goal || '暂未填写' }}</p>
            <p>完成标准：{{ currentMilestone.doneCriteria || '暂未填写' }}</p>
            <p>截止时间：{{ dueText(currentMilestone.dueAt) }}</p>
            <div class="stage-progress"><i :style="{ width: `${currentMilestone.taskStats.progress}%` }"></i></div>
            <small>{{ currentMilestone.taskStats.done }}/{{ currentMilestone.taskStats.total }} 个任务已完成（{{ currentMilestone.taskStats.progress }}%）</small>
          </template>
          <p v-else class="empty">还没有阶段，下面的「里程碑管理」可以直接新建。</p>
        </div>
      </section>

      <section class="card next-step">
        <div class="card-h">下一步做什么 <span class="tag">按当前阶段数据整理</span></div>
        <div class="card-b">
          <ol v-if="nextSteps.length" class="next-step-list">
            <li v-for="hint in nextSteps" :key="hint.id">
              <div>
                <strong>{{ hint.title }}</strong>
                <p>{{ hint.detail }}</p>
              </div>
              <button class="btn" type="button" :disabled="cloud.busy" @click="runNextStep(hint)">{{ hint.actionLabel }}</button>
            </li>
          </ol>
          <p v-else class="empty">当前阶段没有待办提示，可以先记录一次进展，或去「阶段任务」补充新任务。</p>
          <p class="next-step-note">这里的顺序由当前阶段的任务、证据和进展推导，不是 AI 建议；云端 AI 建议在下方单独展示。</p>
        </div>
      </section>

      <section v-if="cloudMode" class="card cloud-ai">
        <div class="card-h">
          <span>云端 AI 建议</span>
          <span class="tag">{{ advisorSourceText(advisorState?.source ?? null) }}</span>
        </div>
        <div class="card-b">
          <p v-if="!advisorState || advisorState.status === 'idle'" class="empty">结合当前阶段、任务、进展和已确认材料，生成下一步可执行建议。</p>
          <p v-else-if="advisorLoading" class="empty">正在结合当前阶段生成建议…</p>
          <p v-if="advisorError || advisorState?.error" class="cloud-error" role="alert">
            {{ advisorError || advisorState?.error?.message }}
            <button class="btn" type="button" :disabled="advisorLoading" @click="requestAdvisor">重试</button>
          </p>
          <p v-else-if="advisorState?.status === 'error'" class="cloud-error" role="alert">
            获取云端 AI 建议失败，请稍后重试。
            <button class="btn" type="button" :disabled="advisorLoading" @click="requestAdvisor">重试</button>
          </p>
          <p v-if="advisorState?.status === 'ready' && advisorState.source === 'fallback'" class="ai-note">
            {{ fallbackReasonText(advisorState.fallbackReason) }}
          </p>
          <div class="ai-actions">
            <button class="btn primary" type="button" :disabled="advisorLoading" @click="requestAdvisor">
              {{ advisorLoading ? '生成中…' : (advisorState?.status === 'ready' ? '重新判断下一步' : '获取云端 AI 建议') }}
            </button>
          </div>
          <div v-if="advisorState?.status === 'ready'" class="ai-suggestions">
            <p v-if="(advisorState.suggestions ?? []).length === 0" class="cloud-error" role="alert">
              本次没有返回可用建议，请稍后重试。
            </p>
            <article v-for="suggestion in (advisorState.suggestions ?? [])" :key="suggestion.id" class="ai-suggestion">
              <h3>{{ suggestion.title }}</h3>
              <p>{{ suggestion.whyNow }}</p>
              <p><b>完成标准：</b>{{ suggestion.doneCriteria }}</p>
            </article>
          </div>
        </div>
      </section>

      <section v-if="cloudMode" class="card cloud-chat">
        <div class="card-h">
          <span>云端 AI 对话</span>
          <button
            v-if="chatMessages.length > 0 || chatState?.pendingQuestion || chatError || chatState?.error"
            class="btn"
            type="button"
            @click="clearChat"
          >清空对话</button>
        </div>
        <div class="card-b">
          <div class="chat-log" aria-live="polite">
            <p v-if="chatMessages.length === 0 && !chatLoading" class="empty">还没有对话，问一个和当前阶段有关的问题。</p>
            <div
              v-for="message in chatMessages"
              :key="message.clientId"
              class="chat-message"
              :class="message.role === 'user' ? 'chat-message-user' : 'chat-message-assistant'"
            >
              <small>
                {{ message.role === 'user' ? '你' : 'AI 顾问' }} · {{ timeText(message.createdAt) }}
                <span v-if="message.role === 'assistant'"> · {{ advisorSourceText(message.source) }}</span>
              </small>
              <p>{{ message.text }}</p>
              <small v-for="citation in (message.citations ?? [])" :key="citation.segmentId">
                依据：{{ citation.materialName }} 第 {{ citation.startLine }}–{{ citation.endLine }} 行
              </small>
            </div>
            <p v-if="chatLoading" class="empty">AI 正在回答…</p>
          </div>
          <p class="chat-note">聊天记录只保存在本页，刷新后清空（服务端尚未保存历史）</p>
          <p v-if="chatError || chatState?.error" class="cloud-error" role="alert">
            {{ chatError || chatState?.error?.message }}
            <button v-if="chatState?.pendingQuestion" class="btn" type="button" :disabled="chatLoading" @click="retryChat">重试</button>
          </p>
          <p v-if="chatState?.pendingQuestion && !chatState?.error && !chatError" class="ai-note">
            上次问题：{{ chatState.pendingQuestion }}
          </p>
          <form class="chat-form" @submit.prevent="submitChat">
            <textarea
              v-model="chatQuestion"
              placeholder="问一个和当前阶段有关的问题"
              aria-label="云端 AI 对话问题"
              maxlength="2000"
              :disabled="chatLoading"
            ></textarea>
            <button class="btn primary" type="submit" :disabled="chatLoading || chatQuestion.trim() === ''">
              {{ chatLoading ? '回答中…' : '发送' }}
            </button>
          </form>
        </div>
      </section>

      <div class="cloud-grid">
        <section class="card">
          <div class="card-h">里程碑管理 <span class="tag">{{ milestones.length }}</span></div>
          <div class="card-b">
            <form class="compact-form" @submit.prevent="saveMilestone">
              <strong>{{ editingMilestoneId ? '编辑阶段' : '新建阶段' }}</strong>
              <input ref="milestoneNameInput" v-model="milestoneForm.name" placeholder="阶段名称" aria-label="阶段名称" maxlength="60" required />
              <textarea v-model="milestoneForm.goal" placeholder="阶段目标" aria-label="阶段目标" maxlength="300"></textarea>
              <textarea ref="milestoneCriteriaInput" v-model="milestoneForm.doneCriteria" placeholder="完成标准" aria-label="完成标准" maxlength="300"></textarea>
              <input v-model="milestoneForm.dueAt" type="datetime-local" aria-label="截止时间" />
              <div class="form-actions"><button class="btn primary" type="submit">{{ editingMilestoneId ? '保存阶段' : '新建阶段' }}</button><button v-if="editingMilestoneId" class="btn" type="button" @click="clearMilestoneForm">取消</button></div>
            </form>
            <div class="candidate-entry">
              <button class="btn" type="button" @click="requestMilestoneCandidates">根据项目资料生成候选</button>
              <span>候选接口接入后，生成结果需由你确认才会写入项目。</span>
            </div>
            <div v-for="milestone in allMilestones" :key="milestone.milestoneId" class="milestone-row" :class="{ archived: milestone.archivedAt !== null }">
              <div class="milestone-row-main"><strong>{{ milestone.name }}</strong><span class="tag">{{ statusText(milestone.status) }}</span><small>{{ milestone.taskStats.done }}/{{ milestone.taskStats.total }} · {{ milestone.taskStats.progress }}%</small><small>{{ dueText(milestone.dueAt) }}</small></div>
              <div class="row-actions">
                <button v-if="milestone.archivedAt === null" class="btn" type="button" :aria-label="`将${milestone.name}上移`" :disabled="isBusy('reorderMilestones') || activeMilestoneIndex(milestone.milestoneId) <= 0" @click="moveMilestone(milestone, -1)">↑</button>
                <button v-if="milestone.archivedAt === null" class="btn" type="button" :aria-label="`将${milestone.name}下移`" :disabled="isBusy('reorderMilestones') || activeMilestoneIndex(milestone.milestoneId) < 0 || activeMilestoneIndex(milestone.milestoneId) >= milestones.length - 1" @click="moveMilestone(milestone, 1)">↓</button>
                <button class="btn" type="button" :disabled="isBusy('updateMilestone')" @click="editMilestone(milestone)">编辑</button>
                <button v-if="milestone.status === 'planned'" class="btn" type="button" :disabled="isBusy('milestone.activate')" @click="milestoneAction(milestone, 'activate')">开始</button>
                <button v-if="milestone.status === 'active' || milestone.status === 'planned'" class="btn" type="button" :disabled="isBusy('completeMilestone')" @click="milestoneAction(milestone, 'complete')">完成</button>
                <button v-if="milestone.status === 'completed'" class="btn" type="button" :disabled="isBusy('milestone.reopen')" @click="milestoneAction(milestone, 'reopen')">重开</button>
                <button v-if="milestone.status !== 'archived'" class="btn" type="button" :disabled="isBusy('milestone.archive')" @click="milestoneAction(milestone, 'archive')">归档</button>
                <button v-else class="btn" type="button" :disabled="isBusy('milestone.restore')" @click="milestoneAction(milestone, 'restore')">恢复</button>
              </div>
            </div>
          </div>
        </section>

        <section class="card">
          <div class="card-h">阶段任务</div>
          <div class="card-b">
            <form class="compact-form" @submit.prevent="createTask">
              <input ref="taskTitleInput" v-model="taskForm.title" placeholder="任务标题" aria-label="任务标题" maxlength="200" required />
              <input v-model="taskForm.doneCriteria" placeholder="完成标准（可选）" aria-label="任务完成标准" maxlength="300" />
              <select v-model="taskForm.milestoneId" aria-label="任务所属阶段"><option value="">待办任务</option><option v-for="milestone in milestones" :key="milestone.milestoneId" :value="milestone.milestoneId">{{ milestone.name }}</option></select>
              <button class="btn primary" type="submit" :disabled="isBusy('createTask')">{{ isBusy('createTask') ? '创建中…' : '创建任务' }}</button>
            </form>
            <p v-if="!cloud.tasksHydrated" class="not-supported">任务列表还没有成功加载，页面不会把空列表当成“没有任务”。</p>
            <div v-for="task in currentTasks" :key="task.taskId" class="task-row">
              <div><strong>{{ task.title }}</strong><p v-if="task.doneCriteria">完成标准：{{ task.doneCriteria }}</p><small>{{ statusText(task.status) }}</small></div>
              <div class="row-actions"><button v-if="task.status === 'todo'" class="btn" type="button" :disabled="isBusy('task.start')" @click="taskAction(task, 'start')">开始</button><button v-if="task.status !== 'done'" class="btn" type="button" :disabled="isBusy('task.complete')" @click="taskAction(task, 'complete')">完成</button><button v-else class="btn" type="button" :disabled="isBusy('task.reopen')" @click="taskAction(task, 'reopen')">重开</button></div>
            </div>
            <p v-if="cloud.tasksHydrated && !currentTasks.length" class="empty">当前阶段还没有任务。</p>
            <div v-if="unassignedTasks.length" class="unassigned">
              <p>还有 {{ unassignedTasks.length }} 个任务没有挂到阶段：</p>
              <div v-for="task in unassignedTasks" :key="task.taskId" class="unassigned-row">
                <strong>{{ task.title }}</strong>
                <button class="btn" type="button" :disabled="!currentMilestone || isBusy('linkTaskToMilestone')" @click="linkUnassignedTask(task)">
                  挂到当前阶段
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div class="cloud-grid lower-grid">
        <section class="card">
          <div class="card-h">最近进展</div>
          <div class="card-b">
            <form class="compact-form" @submit.prevent="submitProgress">
              <select v-model="progressForm.taskId" aria-label="进展关联任务"><option value="">只关联当前阶段</option><option v-for="task in currentTasks" :key="task.taskId" :value="task.taskId">{{ task.title }}</option></select>
              <textarea ref="progressSummaryInput" v-model="progressForm.summary" placeholder="记录这次推进了什么" aria-label="进展内容" maxlength="1000" required></textarea>
              <button class="btn primary" type="submit" :disabled="isBusy('submitProgress')">{{ isBusy('submitProgress') ? '保存中…' : '保存进展' }}</button>
            </form>
            <div v-for="item in currentProgress" :key="item.progressId" class="activity-row"><small>{{ timeText(item.occurredAt) }}</small><p>{{ item.summary }}</p></div>
            <p v-if="!currentProgress.length" class="empty">当前阶段还没有进展记录。</p>
          </div>
        </section>

        <section class="card">
          <div class="card-h">关联证据</div>
          <div class="card-b">
            <form class="compact-form" @submit.prevent="submitEvidence">
              <select v-model="evidenceForm.taskId" aria-label="证据关联任务"><option value="">关联当前阶段</option><option v-for="task in currentTasks" :key="task.taskId" :value="task.taskId">{{ task.title }}</option></select>
              <textarea ref="evidenceDidWhatInput" v-model="evidenceForm.didWhat" placeholder="做了什么" aria-label="证据：做了什么" maxlength="300" required></textarea>
              <textarea v-model="evidenceForm.foundWhat" placeholder="发现了什么（可选）" aria-label="证据：发现了什么" maxlength="500"></textarea>
              <textarea v-model="evidenceForm.stillUnsure" placeholder="仍不确定什么（可选）" aria-label="证据：仍不确定什么" maxlength="500"></textarea>
              <label class="checkbox-line"><input v-model="evidenceForm.completeTask" type="checkbox" :disabled="!evidenceForm.taskId" /> 提交后确认完成所选任务</label>
              <button class="btn green" type="submit" :disabled="isBusy('createEvidence')">{{ isBusy('createEvidence') ? '保存中…' : '保存证据' }}</button>
            </form>
            <div v-for="item in currentEvidence" :key="item.evidenceId" class="activity-row"><small>{{ timeText(item.createdAt) }}</small><p>{{ item.didWhat }}</p><small v-if="item.foundWhat">发现：{{ item.foundWhat }}</small></div>
            <p v-if="!currentEvidence.length" class="empty">当前阶段还没有关联证据。</p>
          </div>
        </section>
      </div>

      <section class="card unsupported-card">
        <div class="card-h">能力状态</div>
        <div class="card-b"><p>时间线读取接口和阶段候选接口暂未接入；材料读取与上传、云端 AI 建议和云端聊天已接入。未接入的部分不会用前端拼接结果或本地结果冒充服务端能力。</p></div>
      </section>
      </div>

      <div v-show="activeTab === 'data'" id="cloud-panel-data" role="tabpanel" aria-labelledby="cloud-tab-data">
        <section class="card cloud-material-state">
          <div class="card-h">
            <span>项目资料</span>
            <button class="btn" type="button" :disabled="materialsReloading || materialsStatus === 'loading'" @click="loadMaterials">
              {{ materialsReloading || materialsStatus === 'loading' ? '刷新中…' : '刷新材料' }}
            </button>
          </div>
          <div class="card-b">
            <div class="material-upload">
              <label class="btn primary file-label" for="cloud-material-file">上传 md/txt</label>
              <input
                id="cloud-material-file"
                class="material-file-input"
                type="file"
                accept=".md,.txt,text/markdown,text/plain"
                @change="onMaterialFileChange"
              />
              <small>只支持 md、txt；单个文件不超过 1 MB。上传成功后服务端保存材料并解析片段。</small>
            </div>
            <p v-if="materialUploadError || cloud.materialUpload?.error" class="cloud-error" role="alert">
              {{ materialUploadError || cloud.materialUpload?.error?.message }}
            </p>
            <p v-if="materialUploadNotice" class="material-notice">{{ materialUploadNotice }}</p>

            <p v-if="materialsStatus === 'loading' && !materialsReady" class="empty">正在读取材料列表…</p>
            <p v-else-if="materialsError" class="cloud-error" role="alert">
              材料列表读取失败：{{ materialsError.message }}
              <button class="btn" type="button" :disabled="materialsReloading" @click="loadMaterials">重试</button>
            </p>
            <p v-else-if="!materialsReady && !materialsApiAvailable" class="not-supported">云端材料列表还没有接入本页：当前页面没有拿到云端材料状态，不会把本地材料当成云端材料显示。</p>
            <p v-else-if="!materialsReady" class="not-supported">材料列表还没有成功加载，页面不会把空列表当成“没有材料”。</p>
            <p v-else-if="materialRows.length === 0" class="empty">还没有材料，上传一份 md 或 txt 开始</p>
            <table v-else class="material-table">
              <thead>
                <tr>
                  <th scope="col">材料名</th>
                  <th scope="col">版本</th>
                  <th scope="col">片段数</th>
                  <th scope="col">已确认条目数</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in materialRows" :key="row.material.materialId">
                  <td>
                    <strong>{{ row.material.name }}</strong>
                    <small>{{ materialStatusText(row.material.status) }}</small>
                  </td>
                  <td>v{{ row.material.materialVersion }}</td>
                  <td>{{ row.loading ? '读取中…' : (row.segmentCount ?? '—') }}</td>
                  <td>{{ row.loading ? '读取中…' : (row.confirmedCount ?? '—') }}</td>
                </tr>
              </tbody>
            </table>
            <p v-if="cloud.materialReadError" class="cloud-error" role="alert">
              片段或理解条目读取失败：{{ cloud.materialReadError.message }}
              <button class="btn" type="button" :disabled="materialsReloading" @click="loadMaterials">重试</button>
            </p>
            <p class="material-hint">只有已确认的理解条目会进入 AI 上下文；未确认草稿不会发送。</p>
          </div>
        </section>
      </div>
    </template>
  </div>
</template>

<style scoped>
.cloud-workbench { margin-top: 4px; overflow-wrap: anywhere; }
.cloud-create { max-width: 760px; margin: 22px auto; }
.cloud-form, .compact-form { display:grid; gap:8px; }
.cloud-form label { font-size:12.5px; font-weight:600; margin-top:6px; }
.cloud-form input, .cloud-form textarea, .compact-form input, .compact-form textarea, .compact-form select { width:100%; border:1px solid #d3d1c7; border-radius:8px; padding:8px 10px; font:inherit; outline:none; }
.cloud-form textarea, .compact-form textarea { min-height:48px; resize:vertical; }
.cloud-form input:focus, .cloud-form textarea:focus, .compact-form input:focus, .compact-form textarea:focus, .compact-form select:focus { border-color:#378ADD; }
.cloud-head { margin-bottom:14px; }
.cloud-head-row { display:flex; gap:10px; align-items:center; }
.cloud-head-row .proj-select { margin-bottom:0; max-width:420px; }
.current-stage .card-h { flex-wrap:wrap; }
.stage-select { margin-left:auto; min-width:180px; max-width:300px; border:1px solid #d3d1c7; border-radius:8px; padding:5px 8px; font:inherit; background:#fff; }
.cloud-meta { padding:0 16px 14px; color:#5f5e5a; line-height:1.6; }
.current-stage { margin-bottom:14px; }
.current-stage h2 { font-size:18px; margin-bottom:8px; }
.current-stage p { line-height:1.7; color:#5f5e5a; }
.stage-progress { height:7px; background:#f1efe8; border-radius:4px; margin:12px 0 5px; overflow:hidden; }
.stage-progress i { display:block; height:100%; background:#378ADD; border-radius:4px; }
.cloud-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; align-items:start; margin-bottom:14px; }
.milestone-row, .task-row, .activity-row { border-top:1px dashed #efeee9; padding:10px 0; }
.milestone-row.archived { opacity:.68; }
.milestone-row-main { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.milestone-row-main small { color:#888780; }
.row-actions { display:flex; gap:6px; flex-wrap:wrap; margin-top:8px; }
.row-actions .btn { padding:4px 8px; font-size:11.5px; }
.row-actions .btn:disabled, .compact-form .btn:disabled { cursor:not-allowed; opacity:.6; }
.task-row { display:flex; justify-content:space-between; gap:10px; }
.task-row p, .activity-row p { margin-top:4px; font-size:12.5px; color:#5f5e5a; line-height:1.5; }
.task-row small, .activity-row small { color:#888780; font-size:11.5px; }
.form-actions { display:flex; gap:8px; }
.not-supported { margin:12px 0; padding:8px 10px; background:#FAEEDA; border:1px solid #FAC775; border-radius:8px; color:#633806; font-size:12px; line-height:1.6; }
.candidate-entry { display:flex; align-items:center; gap:10px; margin:12px 0; padding:8px 10px; background:#FAEEDA; border:1px solid #FAC775; border-radius:8px; color:#633806; font-size:12px; line-height:1.6; }
.cloud-error { color:#854F0B; background:#FAEEDA; border:1px solid #FAC775; border-radius:8px; padding:8px 10px; line-height:1.6; }
.action-error { margin-bottom:14px; }
.checkbox-line { display:flex; align-items:center; gap:6px; font-size:12px; color:#5f5e5a; }
.unsupported-card { margin-bottom:20px; }
.unsupported-card p { color:#5f5e5a; line-height:1.6; }
.cloud-tabs { display:flex; gap:2px; border-bottom:1px solid #e4e2da; margin:0 0 14px; }
.cloud-tab { display:flex; align-items:center; gap:6px; border:0; border-bottom:2px solid transparent; background:transparent; padding:9px 14px; font:inherit; font-size:13px; color:#5f5e5a; cursor:pointer; }
.cloud-tab:hover { color:#185FA5; }
.cloud-tab[aria-selected='true'] { color:#185FA5; font-weight:600; border-bottom-color:#378ADD; }
.cloud-tab:focus-visible { outline:2px solid #378ADD; outline-offset:2px; border-radius:6px 6px 0 0; }
.cloud-tab-count { background:#f1efe8; color:#5f5e5a; border:1px solid #d3d1c7; }
.empty-stage { margin-bottom:14px; }
.empty-stage h2 { font-size:17px; margin-bottom:8px; }
.empty-stage p { color:#5f5e5a; line-height:1.7; }
.empty-actions { display:flex; flex-wrap:wrap; gap:10px; margin-top:12px; }
.next-step { margin-bottom:14px; }
.next-step-list { display:grid; gap:10px; padding-left:20px; list-style:decimal; }
.next-step-list li { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }
.next-step-list strong { font-size:13px; }
.next-step-list p { margin-top:4px; font-size:12px; color:#5f5e5a; line-height:1.5; }
.next-step-list .btn { flex-shrink:0; padding:5px 10px; font-size:12px; }
.next-step-note { margin-top:12px; padding:8px 10px; background:#f4f3ec; border:1px solid #e4e2da; border-radius:8px; color:#5f5e5a; font-size:12px; line-height:1.6; }
.cloud-material-state { margin-bottom:20px; }
.cloud-material-state p { margin-bottom:10px; color:#5f5e5a; line-height:1.7; }
.unassigned { margin-top:12px; padding:8px 10px; background:#FAEEDA; border:1px solid #FAC775; border-radius:8px; color:#633806; font-size:12px; line-height:1.6; }
.unassigned-row { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-top:6px; }
.unassigned-row .btn { padding:4px 8px; font-size:11.5px; }
.material-upload { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:12px; }
.file-label { cursor:pointer; }
.material-file-input { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0 0 0 0); white-space:nowrap; border:0; }
.material-upload small { color:#5f5e5a; line-height:1.6; }
.material-notice { margin:10px 0; padding:8px 10px; background:#EAF3DE; border:1px solid #C0DD97; border-radius:8px; color:#27500A; font-size:12px; line-height:1.6; }
.material-table { width:100%; border-collapse:collapse; margin-top:12px; font-size:12.5px; }
.material-table th, .material-table td { text-align:left; padding:8px 6px; border-bottom:1px dashed #efeee9; vertical-align:top; }
.material-table th { color:#5f5e5a; font-weight:600; }
.material-table td small { display:block; margin-top:3px; color:#888780; font-size:11.5px; }
.material-hint { margin-top:12px; color:#5f5e5a; font-size:12px; line-height:1.6; }
.cloud-ai, .cloud-chat { margin-bottom:14px; }
.ai-actions { margin:12px 0; }
.ai-note { margin:10px 0; padding:8px 10px; background:#f4f3ec; border:1px solid #e4e2da; border-radius:8px; color:#5f5e5a; font-size:12px; line-height:1.6; }
.ai-suggestions { display:grid; gap:10px; margin-top:12px; }
.ai-suggestion { border-top:1px dashed #efeee9; padding-top:10px; }
.ai-suggestion h3 { margin:0 0 6px; font-size:14px; }
.ai-suggestion p { margin:0 0 5px; color:#5f5e5a; font-size:12.5px; line-height:1.6; }
.chat-log { max-height:360px; overflow:auto; padding:2px 0 8px; }
.chat-message { margin:8px 0; padding:8px 10px; border-radius:8px; background:#f7f6f1; }
.chat-message-user { background:#E6F1FB; margin-left:18%; }
.chat-message-assistant { margin-right:8%; }
.chat-message small { color:#888780; font-size:11.5px; line-height:1.5; }
.chat-message p { margin:4px 0; color:#2c2c2a; font-size:13px; line-height:1.65; white-space:pre-wrap; }
.chat-note { margin:8px 0 12px; padding:8px 10px; background:#FAEEDA; border:1px solid #FAC775; border-radius:8px; color:#633806; font-size:12px; line-height:1.6; }
.chat-form { display:grid; grid-template-columns:1fr auto; gap:8px; align-items:end; }
.chat-form textarea { min-height:64px; resize:vertical; border:1px solid #d3d1c7; border-radius:8px; padding:8px 10px; font:inherit; outline:none; }
.chat-form textarea:focus { border-color:#378ADD; }
@media (max-width:800px) { .cloud-grid { grid-template-columns:1fr; } }
@media (max-width:520px) {
  .cloud-head-row { align-items:stretch; flex-direction:column; }
  .cloud-head-row .proj-select, .stage-select { max-width:none; width:100%; }
  .stage-select { margin-left:0; }
  .task-row { flex-direction:column; }
  .row-actions .btn { flex:1 1 auto; }
  .cloud-tabs { overflow-x:auto; }
  .cloud-tab { flex:0 0 auto; }
  .next-step-list li { flex-direction:column; align-items:stretch; }
  .next-step-list .btn { width:100%; }
  .empty-actions .btn { flex:1 1 auto; }
  .chat-form { grid-template-columns:1fr; }
  .chat-message-user { margin-left:0; }
  .material-table { font-size:11.5px; }
  .material-table th, .material-table td { padding:7px 4px; }
}
</style>
