# legacy-v0 · 已归档的 v0 框架

这里放的是 v1 之前那一版框架的页面与组件，**不参与构建**（`tsconfig.json` 只包含 `src/**`）。

v1 把它们砍掉了，原因写在 `项目文档v1.md` 第 6 节：

| 文件 | 对应功能 | 为什么砍掉 |
| --- | --- | --- |
| `src/views/MapView.vue` | 项目地图（8 列关系图、断裂检测） | 状态四块 + 问题列表已能回答「做到哪了」，地图是最大的一块工程 |
| `src/views/LogView.vue` | 证据与决定 | 内容已并入首页的「进展记录」区段 |
| `src/views/KickoffView.vue` | 项目启动快照（7 问） | 改成「先交材料、系统先读、学生只做确认」 |
| `src/views/CockpitView.vue` | 项目驾驶舱（8 项状态板 + 4 个动作） | 收窄为首页：4 块状态 + 1~3 步 + 进展记录 |
| `src/components/ActionPanel.vue` + `src/components/actions/*` | 四个直接动作（我卡住了 / 跑偏检查 / 下一步 / 问老师） | 只保留「下一步」，且不再做成抽屉 |
| `src/components/DecisionList.vue` | 关键决定记录 | 延后到 v1.1 |
| `src/components/ThinkingQuestions.vue` | 追问清单 | 属于「我卡住了」，一并延后 |
| `src/components/UpdateFeed.vue` | 状态更新确认流 | 改为材料整理结果上的「确认 / 改一下 / 删掉」 |
| `src/components/KnowledgeCard.vue` | 课程知识小卡 + 追问 | 简化为步骤详情页的「推荐资料」 |
| `src/components/SearchPalette.vue` + `src/stores/course.ts` | 全局检索面板 | v1 的资料推荐由步骤驱动，不需要学生自己搜 |
| `src/data/thinking.ts` | 思考引擎（八类思考动作） | 只保留 `suggestNext` 的思路，重写为 `src/data/steps.ts` |
| `src/data/course.ts` | 学习路径（模块 / 讲次 / 知识点） | v1 没有学习路径页；课程资料库仍在 `src/data/materials.ts` |

其中 `src/data/course.ts`、`src/stores/course.ts`、`src/components/SearchPalette.vue` 已在
git 提交 `3daf799` 中，可以从历史取回。其余文件在当时还没有提交，因此移到这里而不是直接删除。

确认 v1 没问题之后，这个目录可以整个删掉。
