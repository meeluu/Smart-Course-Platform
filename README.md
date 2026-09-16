# 《大数据分析实践》智慧课程平台

以课程资源为证据底座、贯穿「学—问—测」学习闭环的智慧课程平台（第一版骨架）。

三个设计需求：DR1 沿学习路径组织课程资源；DR2 课程内可溯源智能问答；DR3 细粒度能力诊断与反馈。

## 技术栈

Vue 3.5 / Vite 8 / TypeScript / Pinia / Vue Router 5 / Element Plus 2 / ECharts 6；
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
  data/        课程知识库与演示数据（materials 证据块、course 学习路径、qa、quiz、portrait）
  types/       领域模型：Resource / EvidenceBlock / Citation / MasteryRecord
  stores/      viewer 原文面板、course 学习状态、qa 对话、assessment 测评与画像
  utils/       markdown 渲染管线、content 证据块切分与检索、resourceMeta
  components/  自绘图标、引用卡片、资源行、原文阅览器、测评组件
  views/       Overview 概览 / Content DR1 / Ask DR2 / Profile DR3
  content/     27 份往届经验材料 markdown
```

## 后续开发接入点

1. 后端接口：契约集中在 `src/types/`。把 `data/qa.ts` 的 `answer()` 换成检索问答接口，
   把 `data/quiz.ts` 与 `data/portrait.ts` 换成测评与画像接口即可，页面无需改动。
2. 知识库入库：`data/materials.ts` 目前内置证据块，正式版应由入库脚本生成；
   证据块 id 形如 `slides#L04`，引用与画像建议都依赖它保持稳定。
3. 新增材料：markdown 放进 `src/content/experience/`，再在 `materials.ts` 的
   `experienceSeeds` 登记标题与所属讲次，即可出现在学习路径上。

## 当前阶段说明

这一版是需求文档「阶段一（第 1~4 周）」要求的静态骨架：课程材料已按证据块入库、
四个视图可走通完整路径，但问答与画像仍是本地演示逻辑，尚未接入检索与模型服务。
页脚有对应提示，避免把演示数据误当真实结论。
