<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import ProjectCreate from '@/components/ProjectCreate.vue'
import ProjectMindMap from '@/components/ProjectMindMap.vue'
import { CHINESE_NUM, WEEK_LABELS, useWorkbenchStore } from '@/stores/workbench'
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
                <button class="btn primary" @click="store.claimStep(i)">认领这一步</button>
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
