# 《大数据分析实践》人机协同项目推进系统

以**项目当前状态（Project State）**为核心的人机协同项目推进系统。

> AI 不替学生定答案，也不替老师确认需求。它在合适的时候提出合适的问题，
> 帮助学生澄清、判断、记录和求助。

## 它不是什么

- 不是课程资源库：课程资源不做一级入口，只在项目需要时以小卡出现
- 不是 AI 聊天框：没有空聊天框，四个动作都是结构化的
- 不是能力画像 / 题库 / 排行榜：这些不能证明学生想得更清楚
- 不是自动写方案的系统：系统不替学生选模型、写结论、写报告

## 演示案例来自真实会议

`src/data/project.ts` 的内容改自《会议纪要.md》（崂山实验室需求对接会，课题
「极端风浪复合事件智能分析」）。组名与成员为占位，问题与取舍都来自纪要原文，
包括：纠正"造新算法"的误区、ERA5 分辨率 gap、16 周里删减需求、
"通用极端风浪 vs 台风及台风浪"二选一、"视觉效果优于国际"不可判定。

## 项目状态：8 项

Goal / **Scope** / Questions / Tasks / Evidence / Decisions / Uncertainties·Blockers / Next

`scope` 是从这次需求对接会里补上的一项：真实项目中最常发生的动作是**删减需求**，
而"明确不做"必须带上理由（时间 / 数据 / 能力），它比"要做"更需要被记录。

## 项目地图：8 类节点

原始需求 → **用户任务** → 团队理解 → 项目问题 → 假设 → 数据/方法 → 证据 → 当前判断

`用户任务`（谁在什么场景下用它做什么）是需求与问题之间必须存在的一层。
缺了它，项目问题就无从判断是否值得做——跑偏检查里专门有一条：
**项目问题没有挂任何用户任务** → 提问"这个问题是谁在什么场景下会遇到的？"

## 三条硬约束（代码里强制，不是文案）

0. **每个建议都要能对着现实约束说明理由**：`suggestNext` 的 rationale 会引用
   剩余周数（`project.meta.totalWeeks - currentWeek`），例如"项目还剩 13 周。
   条目里其他工作都会随这个选择而变，它不定，排期就只能是假的。"
1. **AI 给建议前，先问学生自己的判断**（`actions/NextAction.vue` 第一步）
2. **建议不允许一键采用**：必须选接受 / 部分接受 / 拒绝，并写下理由，
   未写理由时提交按钮禁用（已实测）
3. **AI 从材料里提取的状态必须经学生确认或修改**才能进入项目状态
   （`components/UpdateFeed.vue` 的确认 / 修改 / 驳回三态）

## 四个视图

| 路由 | 视图 | 作用 |
| --- | --- | --- |
| `/` | 项目驾驶舱 | 做到哪、哪里有风险、1~3 件最该先做的事、哪些要找人确认 |
| `/map` | 项目地图 | 需求 → 理解 → 问题 → 假设 → 数据/方法 → 证据 → 判断 的关系图与断裂检测 |
| `/log` | 证据与决定 | 状态更新确认流 + 关键决定记录（选择 / 为什么 / 依据 / 谁参与 / 是否确认） |
| `/start` | 项目启动 | 第一天一次 5~10 分钟的五问快照 |

四个直接动作（我卡住了 / 检查跑偏 / 下一步做什么 / 准备问老师）收敛在
`components/ActionPanel.vue`，可从任何页面唤起，也可用 Ctrl+K 检索面板调用。

## 技术栈

Vue 3.5 · Vite 8 · TypeScript · Pinia · Vue Router 5 · Element Plus 2；
文档渲染使用 markdown-it + KaTeX + highlight.js（语言按需注册）。

## 运行

```
npm install
npm run dev        # 开发预览，默认 http://localhost:5173
npm run build      # 生产构建到 dist
npm run preview    # 预览构建产物
npm run typecheck  # 类型检查
npm run lint       # 代码检查
npm run format     # 格式化
```

## 目录结构

```
src/
  types/project.ts    Project State 领域模型：7 项状态、三档可信度、节点问题标记、
                      八类思考动作、建议与学生判断、求助草稿
  data/
    project.ts        演示项目状态（含 4 处刻意留下的地图断裂）
    thinking.ts       思考引擎：卡点分类、跑偏检测、1~3 条建议、反思问题、知识卡匹配
    materials.ts      课程知识库（证据块），已降级为「知识小卡」的来源
    course.ts         讲次与资源索引，供知识卡标注归属
  stores/project.ts   项目状态中心，强制执行两条红线
  components/
    ActionPanel.vue   四个推进动作的容器
    actions/          我卡住了 / 跑偏检查 / 下一步 / 问老师
    KnowledgeCard.vue 课程知识小卡：知识 → 项目问题 → 学生判断 → 项目节点
    UpdateFeed.vue    状态更新确认流
    DecisionList.vue  关键决定
    ProjectMap 相关    见 views/MapView.vue
  views/              驾驶舱 / 项目地图 / 证据与决定 / 项目启动
  content/            27 份往届经验材料 markdown（知识库语料）
```

## 两个接入点

1. **思考引擎**：`data/thinking.ts` 目前是本地规则。接入模型服务时只替换
   `diagnoseStuck` / `checkDrift` / `suggestNext` 三个函数的实现，
   返回值契约（ThinkingAction / Advice）保持不变，页面无需改动。
   `checkDrift` 的断裂判定已经是纯数据推导，可以直接复用。
2. **材料入库**：`data/project.ts` 里 `stateUpdates` 的 `extracted` 字段，
   正式版由周报 / PPT / Notebook 的解析流程生成；无论谁生成，
   都必须经过 `status: 'pending' → confirmed | edited | rejected` 这一关。

## 当前阶段说明

这一版是可走通全链路的骨架：项目状态、地图、四个动作、确认流都是真实交互，
但项目数据是围绕赛题构造的演示数据，尚未接入真实材料解析与模型服务。
页脚有对应提示，避免把演示数据误当真实结论。
