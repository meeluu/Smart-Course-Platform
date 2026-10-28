# V5 界面与体验升级交付说明（雍蕾）

> 状态：**开发与回归完成，待推送并创建 PR**（不合并，等李焰彬与队友确认）。
> 分支：`feature/yonglei-v5-ui`　基线：`origin/main` = `35fe671`（PR #46 合并后）
> 范围：`src/` 下的界面与文案、`DESIGN.md`、本目录两份文档；**未改 `server/`**。
> 配套阅读：`docs/v5-terminology.md`（术语表与每页前后文案对照）。

## 1. 三个接入点：逐条对照李焰彬的硬规则

数据层交付说明见 `docs/v5-data-layer-delivery.md` §2。下面按他给的三条接入点逐条对账。

### 1.1 论文检索（替换模板卡片）

| 硬规则（李焰彬 / 契约 29） | 实现 | 测试 |
| --- | --- | --- |
| 用 `cloudStore.searchPapers({ query, limit, requestId })`，状态读 `cloudStore.papers` | `PapersView.vue` 的 `perform()` 只调用 store，不直连 HTTP | `PapersView.test.ts`「检索成功后按契约字段展示…」断言调用参数 `{ query, limit: 5 }` |
| `status === 'fallback'` 必须渲染 notice，**不能**走「没有相关论文」的空列表分支 | `v-if="status === 'fallback'"` 独立分支；空结果分支条件是 `status === 'ready' && papers.length === 0`，两者互斥 | 「降级必须渲染 notice，不能走「没有相关论文」的分支」同时断言 `notice` 文案出现、`这次没有检索到论文` 不出现、`.paper-list` 不存在 |
| `status === 'error'` 时 papers 仍保留上一次数据：列表不动 + 顶部错误条 | 错误条独立渲染；列表条件 `status !== 'fallback' && papers.length > 0`，error 不清空 | 「失败时保留上一次结果…」断言错误条 + 旧标题仍在 |
| `openAccessUrl === null` 时只展示 DOI 链接 | 两个链接各自 `v-if`；都为 null 时输出「这条没有公开链接」而不是空按钮 | 「没有开放获取链接时只给 DOI」「两类链接都没有时说明原因」 |
| 重试传回同一个 `requestId`，换检索词才生成新的 | `perform(text, reuse)`：只有 `reuse && lastQuery === value` 才带 `cloud.papers.requestId`，否则不传、由数据层生成 UUID | 「重试沿用同一个 requestId，换检索词则开新请求」三次断言 |
| `query` 为空 / 超 200 字先在本地拦 | 本地校验 + 字数计数 `n/200`；空方向不发请求 | 「空方向不发请求，直接给出可操作的提示」 |
| 降级不是零结果；零结果要给建议 | 零结果分支给三条换词建议 + 「复制提示词到 GPT 再查」 | 「真的零结果时给出换词建议，与降级严格区分」 |

补充：`papersApi` 已在本地兜底 notice（服务端漏带时用 `PAPERS_FALLBACK_NOTICE`），界面同时再兜一层默认文案，双保险。

**本地项目**：`searchPapers` 需要服务端校验 `projectId` 归属，本地项目没有云端归属，因此**不发真实检索**，改为「复制提示词自己查」并说明原因；预置方向标注为「来自题目模板，不是 AI 现场生成」。这是有意的功能边界，不是漏做。

### 1.2 项目 JSON 导出

| 硬规则 | 实现 |
| --- | --- |
| 本地项目传本地 `project` | `WorkbenchView.vue` 头部「下载项目 JSON」→ `buildLocalProjectExport({ project })` |
| 云端项目只传**已加载**的列表，没加载的不传 | `CloudProjectWorkbench.vue`：`tasksHydrated` / `materialsHydrated` 为真才传 `tasks` / `materials`；`evidence` / `progress` 在项目打开成功时已加载 |
| 云端导出必须**同时**展示 notice | 导出卡里常驻 `CLOUD_EXPORT_NOTICE`（不是只在文件里） |
| `loaded: false` 不要在界面上说成「没有任务 / 没有证据」 | 卡片单列「还没加载完的列表：任务、材料 …**不代表项目里没有**」，并在导出文件里写 `loaded: false` / `items: null` |
| 用 Blob + `a[download]` | 两处都按文档示例实现，文件名去掉 `\ / : * ? " < > |` |
| 默认不导出聊天与材料正文 | 不传 `includeChat`，界面明说「不含聊天记录，也不含材料原文」 |

测试：「导出云端项目：同时给出只读投影说明，未加载的列表不冒充空」把 Blob 读回来断言 `scope === 'cloud-projection'`、`lists.tasks.loaded === false`、`lists.materials.loaded === true`，并验证 `a.click()` 与 `revokeObjectURL` 被调用。

### 1.3 聊天历史与保存状态

| 硬规则 | 实现 |
| --- | --- |
| `historyStatus === 'error'` 提示「历史记录暂时没拉到」并保留本次会话 | 黄色 notice + 空态改口「历史没拉到，先从这次会话开始」；有消息时照常渲染，不显示「还没有对话」 |
| `historyStatus === 'loading'` | 徽标「恢复中…」+ 空列表时一行提示 |
| `sessionId` 只用于排查，不建议展示 | 不做原始值展示，只作为「已保存到云端」的判定依据 |
| `historyError` 与 `chat.error` 分开 | 历史失败用 `.notice-warn`；提问失败仍用 `.cloud-error` + 重试 |
| `messageId === null` 时 `persisted` 恒为 false，不显示「已保存」 | `persistText()` 三重条件：`role === 'assistant'`、`persisted === true`、`messageId !== null`；否则在已连会话时标「未保存到云端」 |
| 历史消息没有 `source`，`sourceText()` 要补分支 | `if (message.source === undefined) return '历史记录'`；`CloudChatMessage.source` / `fallbackReason` 改为可选，`cloud.ts` 里 `toHistoryChatMessage()` 的 `as unknown as` 窄转换已删除 |

**额外修掉一个会丢历史的问题**：原 `CloudChatPanel` 在模块作用域记住 `lastChatProjectId`，项目切换时调用 `cloud.clearChat()`。V5 的 `openProject()` 已经会重置聊天并异步恢复历史，面板再清一次可能把刚恢复的消息抹掉。现在删掉这段监听，清理职责只留在 store 一处。

**「清空」语义**：后端没有删除接口，因此按钮改为「清空屏幕」，悬停说明「只清空这一屏；云端已保存的对话下次进入项目还会显示」，不再暗示能删掉云端记录。

## 2. 视觉升级

不改框架、不引依赖。刻度全部写进 `src/styles/platform.css` 的 `:root`，并在 `DESIGN.md` 里立表。

| 项 | 改前 | 改后 |
| --- | --- | --- |
| 圆角 | 12 / 10 / 8 混用，个别写死 | `--r-card:14` / `--r-block:10` / `--r-control:9` / `--r-pill`，四档 |
| 间距 | 13 / 14 / 16 / 18 混用 | `--s1..--s7`（4 的倍数），页面内只用变量 |
| 字号 | 10 / 11 / 12 / 12.5 / 13 / 13.5 / 14 / 14.5 / 16 / 18 / 20 共 11 档 | 收敛为 11 / 12 / 12.5 / 13 / 14 / 16 / 18 / 22，**11px 为下限** |
| 层次 | 只有底色差 + 发丝线 | 加一级 `--shadow-1`（`0 1px 2px`），只让卡片从灰底浮起；二级只给 toast |
| 按钮 | 无 hover / active / disabled 规则（各页自己写） | 统一悬停底色、按下位移 1px、禁用降透明度；主按钮 44px 触控高度（窄屏） |
| 焦点态 | 只有部分输入框有 border 变色 | 全局 `:focus-visible` 2px 蓝描边（对比度 ≥3:1），键盘可见 |
| 动效 | 有的 0.15s、有的 0.3s | 统一 `--ease` + 180ms；`prefers-reduced-motion` 全关 |
| 错误色 | 错误与降级都用琥珀色 | 新增错误红（`#8A2A2A` / `#FDEEEE` / `#F3B9B9`）只给 `role="alert"`；**降级仍用琥珀色**，两者不再混 |
| 跳转链接 | 无 | 新增「跳到主要内容」，键盘第一次 Tab 可见 |

对比度：正文 `#2c2c2a`、说明 `#5f5e5a` 对白底 ≥ 4.5:1；`#888780` 只用于 11–12px 辅助信息；琥珀底上只用 `#633806` / `#854F0B`。

## 3. 窄屏（390px）

- 页面内边距 12px，卡片标题栏可换行；顶部账号栏整体换行，导航横向滚动不折行。
- 主操作按钮 ≥44px，其余 ≥38px；输入框、下拉框撑满整行；聊天输入与发送上下排列。
- 长英文标题 / DOI / URL `overflow-wrap:anywhere`，不出现横向滚动。
- 论文检索行、导出按钮、空状态按钮在 520px 以下改为纵向整行。
- 三个核心流程在 390px 下仍可完成：建项目 → 建阶段/任务 → 记工作记录；检索论文；聊天。

## 4. 首页引导

`OnboardingGuide.vue`：3 步、可跳过、写入 `localStorage['scp.onboarding.v5.dismissed']`，只在登录后的工作台首屏出现（地图/论文页不再打扰）。不是遮罩弹窗，下面的页面照常可点。

测试：`tests/ui/OnboardingGuide.test.ts`（3 条）覆盖「最多三步」「跳过即消失且下次不再出现」「知道了同样记住」。

## 5. 空状态与降级清单

| 页面 | 场景 | 现在说什么 | 可做什么 |
| --- | --- | --- | --- |
| 工作台·云端 | 无阶段 | 还没有阶段：先建第一个（解释阶段是什么） | 新建阶段 / 生成候选 |
| 工作台·云端 | 无任务 | 还没有任务 + 写在哪、创建后出现在哪 | 用上方表单创建 |
| 工作台·云端 | 无进展 | 还没有进展 + 例子「这次推进了什么」 | 用上方表单记录 |
| 工作台·云端 | 无工作记录 | 还没有工作记录 + 记了有什么用 | 用右栏表单记录 |
| 工作台·云端 | 任务未读取 | 任务还没读出来，不当成「没有任务」 | 刷新重试 |
| 项目地图 | 任务未读取 / 无阶段 / 无任务 | 分别说明，不画成「没有」 | 回工作台 |
| 论文页 | 未检索 | 先写一个方向（给具体例子与英文术语建议） | 输入 + 检索 |
| 论文页 | 真零结果 | 这次没有检索到论文 + 三条换词建议 | 复制提示词到 GPT |
| 论文页 | 降级 | 没连上检索服务，**不是**没有相关论文 | 重试（同 requestId） |
| 论文页 | 失败 | 这次检索没有完成 + 保留上次结果 | 重试 |
| 聊天 | 无对话 | 还没有对话 + 两个可问的问题 | 输入提问 |
| 聊天 | 历史未拉到 | 历史记录暂时没拉到 + 不代表以前没聊过 | 刷新再试 / 继续提问 |
| 论文页 / 工作台 | 无项目 | 说明先建项目 | 去工作台 |

## 6. 去技术文案

删除或改写（完整对照见 `docs/v5-terminology.md` §2）：

- 删除「能力状态：时间线读取接口仍未接入；材料、阶段候选、AI 建议与聊天已接入」整块。
- 「模型生成（model）」「服务端规则兜底（fallback）」「本地规则兜底（local-rule）」→ 中文，不带枚举。
- 「任务列表尚未成功读取」「服务端已确认的阶段、任务和统计」→ 学生语言。
- 「聊天记录暂不保存」→「对话会保存到你的账号 / 还没连上云端会话」。
- 「AI 已生成专属检索提示词」→「检索提示词已生成，复制到 GPT 里检索即可」。
- 「AI 推荐检索方向」→「模板预置的检索方向」；「本地规则生成的检索方向」（`services/papers.ts` 3 条、`data/topics.ts` 25 条）。
- 删除论文卡的「AI 说明：」标签（V5 没有推荐理由字段，写了就是编）。

## 7. 改动文件

**新增**：`src/components/OnboardingGuide.vue`、`tests/ui/OnboardingGuide.test.ts`、`tests/ui/PapersView.test.ts`、`docs/v5-terminology.md`、`docs/v5-ui-delivery.md`。

**删除**：`src/components/PaperDirectionCard.vue`（旧模板卡；真实检索上线后不能有两套论文卡）、`platform.css` 里对应的 `.paper*` 全局样式。

**修改**：`src/styles/platform.css`、`src/App.vue`、`src/views/PapersView.vue`、`src/views/WorkbenchView.vue`、`src/components/CloudProjectWorkbench.vue`、`src/components/CloudChatPanel.vue`、`src/components/CloudAdvisorPanel.vue`、`src/components/CloudProjectMapView.vue`、`src/types/platform.ts`、`src/stores/cloud.ts`、`src/stores/workbench.ts`、`src/services/papers.ts`、`src/data/topics.ts`、`src/router/index.ts`、`DESIGN.md`。

### 关于「不改 stores / services / domain」

界面层没有新增业务逻辑，但有 4 处必须碰，逐条说明：

1. `src/types/platform.ts`：`CloudChatMessage.source` / `fallbackReason` 改为可选——李焰彬明确要求「补完后可以把类型改可选，把我 store 里那处窄转换去掉」。
2. `src/stores/cloud.ts`：删掉 `toHistoryChatMessage()` 里的 `as unknown as`（类型放宽后不再需要）；更新 3 处过时注释；从 `contractBlockers` 移除「聊天没有会话端点，刷新即丢失」这一条（V5 已实现，留着就是假信息）。**无行为变更**。
3. `src/stores/workbench.ts`：只改 1 个 toast 字符串（「AI 已生成专属检索提示词」→ 实事求是），属于本轮「修正虚假文案」的硬要求。
4. `src/services/papers.ts` / `src/data/topics.ts`：只改 `meta` 文案，不动任何函数。

## 8. 测试变更

**新增 21 条**（单测 1070 → 1091，60 个文件全绿）：

| 文件 | 新增 | 覆盖 |
| --- | --- | --- |
| `tests/ui/PapersView.test.ts` | 12 | 五态、notice、保留旧结果、DOI 分支、requestId 复用、本地项目边界、无项目 |
| `tests/ui/OnboardingGuide.test.ts` | 3 | 三步、跳过、记住 |
| `tests/ui/CloudChatPanel.test.ts` | +4 | 会话徽标、历史失败、历史来源、persisted、清空语义 |
| `tests/ui/CloudProjectWorkbench.test.ts` | +2 | 导出投影 + 未加载标记；不再出现技术状态 |

**修改的既有断言（4 条，全部因文案变更）**：

| 文件 | 原断言 | 新断言 | 原因 |
| --- | --- | --- | --- |
| `CloudAdvisorPanel.test.ts` | `模型生成（model）` | `AI 模型生成` | 去英文枚举 |
| `CloudAdvisorPanel.test.ts` | `服务端规则兜底（fallback）` | `服务端规则回答` | 去英文枚举 + 去“兜底” |
| `CloudProjectWorkbench.test.ts` | 空状态按钮 `新建里程碑` | `新建阶段` | 术语统一 |
| `xssHardening.test.ts` | banner 不含 `onerror=`、包含 `project.short` | 不含 `<img>` 元素、包含 `&lt;img`、包含 `project.name` | 页面不再用 `v-html`（去掉注入面），文本节点里的引号无需转义；断言改为检查“没变成元素” |

`userFacingText.test.ts` 未改：新 banner 仍包含项目名与「每个项目独立推荐」，内部字段名断言继续通过。

## 9. 回归结果

| 命令 | 结果 |
| --- | --- |
| `npm run typecheck` | 通过（无输出） |
| `npm test` | `Test Files 60 passed (60)`、`Tests 1091 passed (1091)` |
| `npx eslint src tests` | 通过，0 error / 0 warning |
| `npm run build` | 通过（`✓ built`，PapersView 单独分包 10.12 kB / gzip 4.69 kB） |
| 集成测试 | 本轮未改数据层，未跑（需本地起服务；由李焰彬的 41 条覆盖） |

## 10. 未验证与交接项

1. **截图未附**：桌面与 390px 截图需要登录态 + 真实云端项目（云端页面没有账号打不开；本地页面只能覆盖一小部分）。请用下面的清单在 `https://course.xinxian-music.xyz` 补拍，或在联调环境补拍后附到 PR：
   - 桌面 1440：工作台·推进（有阶段/任务/记录）、工作台·资料、项目地图、论文页（检索成功 / 降级 / 零结果）、聊天（已保存 + 历史失败）、导出卡。
   - 390px：工作台推进、阶段管理表单、论文检索、聊天输入、导出按钮。
2. **聊天历史「重试」按钮**：`loadChatHistory()` 没有从 `cloud` store 导出，界面现在只能提示「刷新页面会再试一次」。若要就地重试，需要李焰彬把它加入 store 的返回对象（一个字段，无逻辑改动）。
3. **导出文件里的过时说明**：`domain/projectExport.ts` 的 `meta.omitted` 仍写「云端聊天尚无持久化端点（契约第 30 节尚未合入 main）」——V5 已落库。属于 domain 文案，按分工留给李焰彬改（改成「已定稿：默认不导出聊天」）。
4. **`PENDING_DECISION_CHAT`** 同上是旧口径，建议与上一条一起改。
5. **本地项目路径的术语**（`WorkbenchView.vue` 仍用「里程碑 / 证据」）本阶段未动，理由与后续计划见 `docs/v5-terminology.md` §3。
6. **真实降级路径**：`fallback` 与 `503` 的界面分支由单测覆盖，尚未在真实 OpenAlex 超时/未配置 `OPENALEX_MAILTO` 的环境下走一遍（属 M2 联调，需姜厚禄配合）。

## 11. PR 草稿

**标题**：`feat(v5-ui): 论文真实检索界面、项目导出、聊天历史与视觉/窄屏升级`

**描述**：

- 基线 `35fe671`；分支 `feature/yonglei-v5-ui`；只改前端与文档，`server/` 未动。
- 论文页：替换模板卡为真实检索，五态齐备；`fallback` 必渲染 notice、`error` 保留旧结果、无开放获取只给 DOI、重试复用 `requestId`。
- 导出：云端「带走我的项目」+ 本地「下载项目 JSON」，两处都按投影/本地语义区分，notice 常驻。
- 聊天：接入 `sessionId` / `historyStatus` / `historyError` / `persisted` / `messageId`；历史消息标「历史记录」；`source` 类型放宽并去掉 store 窄转换；修掉切项目可能清掉历史的问题。
- 视觉：刻度收敛到 CSS 变量（圆角/间距/字号/阴影/动效），新增焦点态、错误色、跳转链接；390px 全流程可用。
- 引导：3 步、可跳过、记住状态。
- 去技术文案：删除「能力状态 / 时间线未接入」，清理 `model`/`fallback` 枚举与「AI 已生成」。
- 测试：单测 1070 → 1091；改 4 条既有断言（文案变更，见 §8）。
- 已知限制：截图待补；历史重试按钮待数据层导出；`projectExport.meta` 旧口径待李焰彬更新。

**合并前请确认**：

- 李焰彬：`source` 可选 + 去窄转换是否与你的预期一致；`loadChatHistory` 是否愿意导出（用于就地重试）。
- 吴佳璐：`docs/v5-terminology.md` §1 与 §4 的审校点。
- 姜厚禄：M2 联调时按 §10.6 跑一次真实 fallback 与 503。

## 12. 手动验收清单

1. 登录 → 工作台：首次出现「三步开始」，点「跳过引导」后刷新不再出现。
2. 建阶段 → 建任务 → 开始 → 记一条工作记录：文案中不出现「里程碑 / 证据 / 接口 / fallback」。
3. 阶段管理：归档/重开按钮在窄屏不溢出；390px 下表单可填、可提交。
4. 论文页：输入方向检索 → 结果卡展示标题/作者/年份/来源/被引 + 两个链接；断网或上游不可用时出现琥珀 notice（不是「没有相关论文」）。
5. 论文页：把方向改成乱码再检索 → 出现真零结果与三条换词建议。
6. 聊天：发一条 → 刷新 → 历史仍在，助手消息标「已保存到云端」；断网刷新 → 出现「历史记录暂时没拉到」且不显示「还没有对话」。
7. 导出：下载 JSON，打开确认 `scope: "cloud-projection"`、`lists.tasks.loaded` 与界面提示一致、文件里没有聊天与材料正文。
8. 键盘：Tab 第一下出现「跳到主要内容」；所有按钮有可见焦点环。
