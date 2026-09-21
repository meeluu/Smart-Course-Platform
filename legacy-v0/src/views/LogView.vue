<script setup lang="ts">
import { reactive, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import UpdateFeed from '@/components/UpdateFeed.vue'
import DecisionList from '@/components/DecisionList.vue'
import { useProjectStore } from '@/stores/project'
import type { Decision } from '@/types/project'

/**
 * 证据与决定
 * ----------------------------------------------------------------------------
 * 学生要记录的不是每一步操作，而是会改变项目方向的关键选择。
 * 另一件同样重要的事：系统从材料里提取的状态必须由学生确认，这一页就是那道关卡。
 */
const project = useProjectStore()

const form = reactive({
  kind: 'approach' as Decision['kind'],
  chose: '',
  why: '',
  basis: '',
  status: 'tentative' as Decision['status'],
})
const saved = ref(false)

function submit() {
  if (!form.chose.trim() || !form.why.trim()) return
  project.addDecision({ ...form })
  form.chose = ''
  form.why = ''
  form.basis = ''
  form.status = 'tentative'
  saved.value = true
  window.setTimeout(() => (saved.value = false), 2400)
}
</script>

<template>
  <div class="log">
    <header class="intro">
      <h1>证据与决定</h1>
      <p class="intro__lead">
        汇报时最难回答的问题不是「你们做了什么」，而是「为什么这么做、后来又被什么改变了」。
        这一页就是为了让那个问题有答案。
      </p>
    </header>

    <section class="block">
      <header class="block__head">
        <h2>状态更新</h2>
        <p class="block__note">
          系统从你们的周报、组会记录或一句话里提取「新发现 / 任务 / 风险 / 下一步」。
          提取结果只是待办，确认或修改之后才会写进项目状态。
        </p>
      </header>
      <UpdateFeed />
    </section>

    <section class="block">
      <header class="block__head">
        <h2>记录一个关键决定</h2>
        <p class="block__note">不记录每一步操作，只记录会改变方向的选择。</p>
      </header>

      <div class="form">
        <label class="field field--inline">
          <span class="field__label">决定类别</span>
          <el-select v-model="form.kind" size="small" style="width: 168px">
            <el-option value="approach" label="技术路线" />
            <el-option value="delivery" label="交付形态" />
            <el-option value="scope" label="范围取舍" />
            <el-option value="standard" label="评价标准" />
            <el-option value="other" label="其他" />
          </el-select>
          <span class="field__hint">「评价标准」单独成类：什么算做得好，本身就是一个必须被记录的决定</span>
        </label>
        <label class="field">
          <span class="field__label">选择了什么</span>
          <input v-model="form.chose" type="text" placeholder="例：用日平均数据，不用小时数据" />
        </label>
        <label class="field">
          <span class="field__label">为什么</span>
          <input v-model="form.why" type="text" placeholder="例：当前问题关注季节尺度，小时尺度属于噪声" />
        </label>
        <label class="field">
          <span class="field__label">依据（用分号分隔）</span>
          <input v-model="form.basis" type="text" placeholder="例：研究问题；数据量；老师反馈" />
        </label>
        <label class="field field--inline">
          <span class="field__label">是否确认</span>
          <el-select v-model="form.status" size="small" style="width: 168px">
            <el-option value="confirmed" label="已确认" />
            <el-option value="tentative" label="临时决定" />
            <el-option value="unverified" label="待验证" />
          </el-select>
          <button type="button" class="primary" :disabled="!form.chose.trim() || !form.why.trim()" @click="submit">
            <AppIcon name="check" :size="14" />
            记入项目状态
          </button>
          <span v-if="saved" class="saved">已写入项目地图</span>
        </label>
      </div>
    </section>

    <section class="block">
      <header class="block__head">
        <h2>关键决定</h2>
        <p class="block__note">共 {{ project.decisions.length }} 条，按时间倒序。</p>
      </header>
      <DecisionList />
    </section>

    <section v-if="project.escalations.length" class="block">
      <header class="block__head">
        <h2>向老师确认的问题</h2>
        <p class="block__note">
          这类信息只有老师能给。系统负责整理，确认与发送由你们决定。
        </p>
      </header>
      <ul class="escs">
        <li v-for="item in project.escalations" :key="item.id">
          <span class="chip" :class="item.sentAt ? 'chip--ok' : 'chip--warn'">
            {{ item.sentAt ? '已发送' : '待确认发送' }}
          </span>
          <span class="escs__q">{{ item.question }}</span>
          <button type="button" class="escs__go" @click="project.openAction('teacher')">
            {{ item.sentAt ? '查看' : '去确认' }}
          </button>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.log {
  display: grid;
  gap: 46px;
}

.intro {
  padding-top: 8px;
}

.intro h1 {
  font-size: 1.95rem;
}

.intro__lead {
  margin-top: 12px;
  max-width: 68ch;
  font-size: 0.93rem;
  line-height: 1.85;
  color: var(--ink-soft);
}

.block {
  display: grid;
  gap: 18px;
}

.block__head h2 {
  font-size: 1.22rem;
}

.block__note {
  margin-top: 8px;
  max-width: 70ch;
  font-size: 0.82rem;
  line-height: 1.75;
  color: var(--ink-faint);
}

.form {
  display: grid;
  gap: 14px;
  padding: 20px 22px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-lg);
  background: var(--glass);
}

.field {
  display: grid;
  gap: 6px;
}

.field__label {
  font-size: 0.8rem;
  color: var(--ink-mute);
}

.field__hint {
  font-size: 0.76rem;
  color: var(--ink-faint);
}

.field input {
  width: 100%;
  padding: 9px 12px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-sm);
  background: var(--fill);
  color: var(--ink);
  font-family: var(--font-body);
  font-size: 0.87rem;
}

.field input:focus {
  outline: none;
  border-color: var(--accent-line);
}

.field--inline {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;
}

.primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 0;
  border-radius: var(--r-sm);
  background: var(--grad-accent);
  color: var(--ink-on-accent);
  font-size: 0.84rem;
  font-weight: 600;
  cursor: pointer;
}

.primary:disabled {
  opacity: 0.42;
  cursor: not-allowed;
}

.saved {
  font-size: 0.8rem;
  color: var(--ok);
}

.escs {
  list-style: none;
  padding: 0;
  display: grid;
  gap: 10px;
}

.escs li {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 14px;
  align-items: center;
  padding: 14px 16px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-md);
}

.escs__q {
  font-size: 0.86rem;
  line-height: 1.7;
  color: var(--ink-soft);
}

.escs__go {
  padding: 6px 13px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-sm);
  background: transparent;
  color: var(--ink-mute);
  font-size: 0.78rem;
  cursor: pointer;
}

.escs__go:hover {
  color: var(--cyan);
  border-color: var(--accent-line);
}
</style>
