<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { useProjectStore } from '@/stores/project'

/**
 * 项目启动快照
 * ----------------------------------------------------------------------------
 * 第一天只做一次，5~10 分钟，不填复杂表。
 * 其中最重要的是「学生自己的理解」——原始需求与团队理解之间的差异，
 * 往往正是整个项目最需要澄清的地方。
 */
const project = useProjectStore()

const editing = ref(!project.kickoff.at)
const saved = ref(false)

const form = reactive({
  need: project.kickoff.need,
  understanding: project.kickoff.understanding,
  assets: project.kickoff.assets,
  uncertainties: [...project.kickoff.uncertainties, '', '', ''].slice(0, 3),
  firstStep: project.kickoff.firstStep,
  dataNeed: project.kickoff.dataNeed,
  dataHave: project.kickoff.dataHave,
  weeksLeft: project.kickoff.weeksLeft,
  coreFeatures: [...project.kickoff.coreFeatures, '', '', ''].slice(0, 3),
})

const ready = computed(() => form.need.trim() && form.understanding.trim() && form.firstStep.trim())

/** 原始需求与团队理解的措辞差异，用于提示“这里可能需要确认” */
const divergence = computed(() => {
  const need = form.need
  const understanding = form.understanding
  if (!need.trim() || !understanding.trim()) return ''
  const needKeywords = ['1950', '2100', '可视化', '气候']
  const missing = needKeywords.filter((word) => need.includes(word) && !understanding.includes(word))
  if (!missing.length) return ''
  return `原始需求里出现了「${missing.join('、')}」，但你们的理解里没有提到。这可能只是措辞，也可能是理解已经偏离——建议拿这条去和助教确认。`
})

/** 数据粒度 gap：需求对接会上最容易事后才发现的一条约束 */
const dataGap = computed(() => {
  if (!form.dataNeed.trim() || !form.dataHave.trim()) return ''
  return `需求方要「${form.dataNeed}」，我们手上是「${form.dataHave}」。先想清楚这个差距在剩余 ${form.weeksLeft} 周里是解决、绕开还是缩范围——它往往决定后面所有排期。`
})

function save() {
  project.saveKickoff({
    need: form.need,
    understanding: form.understanding,
    assets: form.assets,
    uncertainties: form.uncertainties.filter(Boolean),
    firstStep: form.firstStep,
    dataNeed: form.dataNeed,
    dataHave: form.dataHave,
    weeksLeft: Number(form.weeksLeft) || 0,
    coreFeatures: form.coreFeatures.filter(Boolean),
  })
  editing.value = false
  saved.value = true
  window.setTimeout(() => (saved.value = false), 2400)
}
</script>

<template>
  <div class="kick">
    <header class="intro">
      <h1>项目启动快照</h1>
      <p class="intro__lead">
        第一天只做这一次，5~10 分钟。不填复杂表格，也不要求你们想清楚所有事——
        写下现在的理解就够了，因为它之后会被反复修正。
      </p>
    </header>

    <!-- 已保存的快照 -->
    <template v-if="!editing">
      <section class="snap">
        <div class="snap__block">
          <p class="snap__label">原始需求</p>
          <p class="snap__text snap__text--need">{{ project.kickoff.need }}</p>
        </div>
        <div class="snap__arrow">
          <AppIcon name="arrow-right" :size="18" />
        </div>
        <div class="snap__block">
          <p class="snap__label">我们自己的理解</p>
          <p class="snap__text snap__text--ours">{{ project.kickoff.understanding }}</p>
        </div>
      </section>

      <section class="block">
        <h2>现有数据、资料与限制</h2>
        <p class="block__text">{{ project.kickoff.assets }}</p>
      </section>

      <section class="block">
        <h2>还不确定的三件事</h2>
        <ul class="unc">
          <li v-for="text in project.kickoff.uncertainties" :key="text">
            <span class="unc__mark">?</span>
            <span>{{ text }}</span>
          </li>
        </ul>
        <p class="block__note">
          这三条已经进入项目状态的「不确定 / 卡点」，并会出现在跑偏检查里。
        </p>
      </section>

      <section class="block">
        <h2>打算先做什么</h2>
        <p class="block__text">{{ project.kickoff.firstStep }}</p>
      </section>

      <section class="block">
        <h2>现实约束</h2>
        <div class="gap">
          <div class="gap__cell">
            <p class="gap__label">需求方要的粒度</p>
            <p class="gap__value">{{ project.kickoff.dataNeed || '未填写' }}</p>
          </div>
          <div class="gap__arrow"><AppIcon name="split" :size="16" /></div>
          <div class="gap__cell">
            <p class="gap__label">我们手上的数据</p>
            <p class="gap__value">{{ project.kickoff.dataHave || '未填写' }}</p>
          </div>
        </div>
        <p class="gap__note">
          剩余 <strong>{{ project.kickoff.weeksLeft }}</strong> 周里必须完成的：
          {{ project.kickoff.coreFeatures.join('、') || '未填写' }}
        </p>
        <p class="block__note">
          这两条会进入驾驶舱的约束区，并在「下一步做什么」里被引用——
          建议必须说得出它与剩余周数的关系，才值得被采纳。
        </p>
      </section>

      <footer class="foot">
        <span v-if="project.kickoff.at" class="foot__at mono">快照保存于 {{ project.kickoff.at }}</span>
        <button type="button" class="primary" @click="editing = true">
          <AppIcon name="refresh" :size="14" />
          修订这份快照
        </button>
        <span v-if="saved" class="foot__saved">已更新项目状态</span>
      </footer>
    </template>

    <!-- 编辑态 -->
    <template v-else>
      <div class="form">
        <label class="field">
          <span class="field__label">① 原始需求是什么</span>
          <span class="field__hint">照抄赛题或老师的话，不要改写</span>
          <textarea v-model="form.need" rows="3"></textarea>
        </label>

        <label class="field">
          <span class="field__label">② 我们用自己的话理解成什么</span>
          <span class="field__hint">这一条最重要——它和原始需求的差异，往往就是项目要澄清的地方</span>
          <textarea v-model="form.understanding" rows="3"></textarea>
        </label>

        <p v-if="divergence" class="diverge">
          <AppIcon name="alert" :size="14" />
          {{ divergence }}
        </p>

        <label class="field">
          <span class="field__label">③ 现在有什么数据、资料和限制</span>
          <textarea v-model="form.assets" rows="3"></textarea>
        </label>

        <div class="field">
          <span class="field__label">④ 还不确定的三件事</span>
          <span class="field__hint">写不出来也正常，但请尽量写满三条</span>
          <input
            v-for="(_, index) in 3"
            :key="index"
            v-model="form.uncertainties[index]"
            type="text"
            :placeholder="`不确定事项 ${index + 1}`"
          />
        </div>

        <label class="field">
          <span class="field__label">⑤ 我们打算先做什么</span>
          <textarea v-model="form.firstStep" rows="2"></textarea>
        </label>

        <label class="field">
          <span class="field__label">⑥ 需求方要什么粒度，我们手上是什么粒度</span>
          <span class="field__hint">
            这一条来自真实教训：数据粒度的差距如果不在启动时摆出来，往往要到项目中期才被发现
          </span>
          <input v-model="form.dataNeed" type="text" placeholder="需求方要的：例：公里级、小时级" />
          <input v-model="form.dataHave" type="text" placeholder="我们手上的：例：ERA5 几十公里级，计划先用日平均" />
        </label>

        <p v-if="dataGap" class="diverge">
          <AppIcon name="alert" :size="14" />
          {{ dataGap }}
        </p>

        <div class="field">
          <span class="field__label">⑦ 还剩几周，核心功能是哪几个</span>
          <span class="field__hint">写进约束区之后，每一条下一步建议都要能对着它说明理由</span>
          <input v-model.number="form.weeksLeft" type="number" min="0" max="40" placeholder="剩余周数" />
          <input
            v-for="(_, index) in 3"
            :key="index"
            v-model="form.coreFeatures[index]"
            type="text"
            :placeholder="`核心功能 ${index + 1}（做不到就该从范围里删掉）`"
          />
        </div>

        <div class="form__actions">
          <button v-if="project.kickoff.at" type="button" class="ghost" @click="editing = false">取消</button>
          <button type="button" class="primary" :disabled="!ready" @click="save">
            <AppIcon name="check" :size="14" />
            保存并建立项目地图
          </button>
        </div>
      </div>
    </template>

    <p class="note">
      快照之后，项目状态不靠你们每天填表：系统会从周报、PPT、组会记录里尝试提取，
      但每一条都要你们确认或修改，才会进入项目状态。
    </p>
  </div>
</template>

<style scoped>
.kick {
  display: grid;
  gap: 34px;
  max-width: 1080px;
}

.intro {
  padding-top: 8px;
}

.intro h1 {
  font-size: 1.95rem;
}

.intro__lead {
  margin-top: 12px;
  max-width: 72ch;
  font-size: 0.93rem;
  line-height: 1.85;
  color: var(--ink-soft);
}

/* ------------------------------------------------------------ 快照 */

.snap {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  gap: 22px;
  align-items: center;
  padding: 24px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-lg);
  background: linear-gradient(180deg, var(--fill), var(--fill));
}

.snap__label {
  font-size: 0.74rem;
  color: var(--ink-faint);
}

.snap__text {
  margin-top: 7px;
  font-size: 0.9rem;
  line-height: 1.85;
}

.snap__text--need {
  color: var(--ink-mute);
}

.snap__text--ours {
  color: var(--ink);
}

.snap__arrow {
  color: var(--cyan);
}

/* ------------------------------------------------------------ 区块 */

.block {
  display: grid;
  gap: 10px;
}

.block h2 {
  font-size: 1.05rem;
}

.block__text {
  font-size: 0.9rem;
  line-height: 1.85;
  color: var(--ink-soft);
  max-width: 80ch;
}

.block__note {
  font-size: 0.78rem;
  color: var(--ink-faint);
}

.unc {
  list-style: none;
  padding: 0;
  display: grid;
  gap: 8px;
}

.unc li {
  display: flex;
  align-items: baseline;
  gap: 11px;
  font-size: 0.88rem;
  line-height: 1.75;
  color: var(--ink-soft);
}

.unc__mark {
  display: grid;
  place-items: center;
  width: 18px;
  height: 18px;
  border-radius: var(--r-xs);
  background: var(--warn-tint);
  color: var(--warn);
  font-size: 0.72rem;
  flex: none;
}

.gap {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  gap: 20px;
  align-items: center;
  padding: 18px 20px;
  border-radius: var(--r-md);
  background: var(--surface-2);
}

.gap__label {
  font-size: 0.75rem;
  color: var(--ink-faint);
}

.gap__value {
  margin-top: 5px;
  font-size: 0.88rem;
  line-height: 1.7;
  color: var(--ink);
}

.gap__arrow {
  color: var(--warn);
}

.gap__note {
  margin-top: 10px;
  font-size: 0.86rem;
  line-height: 1.75;
  color: var(--ink-soft);
}

.foot {
  display: flex;
  align-items: center;
  gap: 16px;
  padding-top: 6px;
}

.foot__at {
  font-size: 0.76rem;
  color: var(--ink-faint);
}

.foot__saved {
  font-size: 0.8rem;
  color: var(--ok);
}

/* ------------------------------------------------------------ 表单 */

.form {
  display: grid;
  gap: 18px;
  padding: 22px 24px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-lg);
}

.field {
  display: grid;
  gap: 6px;
}

.field__label {
  font-size: 0.9rem;
  color: var(--ink);
  font-weight: 500;
}

.field__hint {
  font-size: 0.76rem;
  color: var(--ink-faint);
}

.field textarea,
.field input {
  width: 100%;
  margin-top: 4px;
  padding: 10px 12px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-sm);
  background: var(--fill);
  color: var(--ink);
  font-family: var(--font-body);
  font-size: 0.88rem;
  line-height: 1.75;
  resize: vertical;
}

.field textarea:focus,
.field input:focus {
  outline: none;
  border-color: var(--accent-line);
}

.diverge {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  padding: 12px 14px;
  border: 1px solid var(--warn-line);
  border-radius: var(--r-sm);
  background: var(--warn-tint);
  font-size: 0.85rem;
  line-height: 1.75;
  color: var(--warn);
}

.form__actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 17px;
  border: 0;
  border-radius: var(--r-sm);
  background: var(--grad-accent);
  color: var(--ink-on-accent);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}

.primary:disabled {
  opacity: 0.42;
  cursor: not-allowed;
}

.ghost {
  padding: 9px 17px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-sm);
  background: transparent;
  color: var(--ink-mute);
  font-size: 0.85rem;
  cursor: pointer;
}

.note {
  font-size: 0.78rem;
  line-height: 1.8;
  color: var(--ink-faint);
  max-width: 80ch;
}

@media (max-width: 820px) {
  .snap {
    grid-template-columns: minmax(0, 1fr);
  }

  .snap__arrow {
    transform: rotate(90deg);
  }
}
</style>
