# V5 集成验收记录

> 状态：**通过**——生产环境论文检索与聊天持久化两条核心链路均已在真机浏览器验证。
> 责任人：姜厚禄（后端 / 集成）｜验收对象：论文检索（OpenAlex）+ 云端聊天持久化 + 前端易用性改版
> 依据：`docs/contracts.md` §29（论文检索）、§30（聊天持久化）、`V5任务分配与实施计划.md`
> 执行时间：2026-11-04 21:0x–23:3x｜执行方式：Edge 156（CDP 9222）+ 页面上下文
> `fetch(credentials:'include')` 脚本驱动，无人工点击；对应 commit `b6900c4`（部署构建同源）

---

## 1. 本轮验收范围

V5 两条新增/修复链路在生产环境（真实域名 + 真实上游）下的端到端验证：

1. **论文检索**（PR #51）：`course` 页面请求 `api` 的 `/api/papers/search` 跨源放行，
   返回 OpenAlex 真实文献（不是模型编造的标题）。
2. **云端聊天持久化**（PR #53）：聊天请求带 Cookie → 服务端落库 →
   刷新页面后历史消息仍在。

随版一并上线的 PR #50（雍蕾前端易用性改版）与 #52（死代码清理）不设独立验收项，
以「新构建生效 + 既有链路不回归」覆盖（§3 第 1、2 项）。

不在本轮（失败场景兜底与文档外事项，用户指示暂缓）：
论文检索降级路径（超时 / 429）、V3 未确认片段拒绝的生产实测。

## 2. 判定标准

| # | 标准 | 结果 |
| --- | --- | --- |
| B1 | 新前端构建生效（页面引用 `index-C5XlJW3y.js`） | ✅ 通过 |
| B2 | 既有链路不回归：注册 → 登录态 → 建项目全部成功 | ✅ 通过 |
| B3 | 论文检索返回 `source: "openalex"` 的真实文献（含标题/年份/期刊/引用数），非 fallback | ✅ 通过 |
| B4 | 聊天响应携带非空 `sessionId` / `messageId`（服务端已落库） | ✅ 通过 |
| B5 | 刷新页面后 messages 接口仍返回同一组消息（user + assistant） | ✅ 通过 |
| B6 | 验收数据可清理：测试项目删除成功，生产库无残留项目 | ✅ 通过 |

## 3. 执行记录（生产环境，2026-11-04）

域名：`https://course.xinxian-music.xyz` / `https://api.xinxian-music.xyz`；
服务单元 `course-wzh-jhl-backend.service`；一次性验收账号 `accept_mw299w58`
（生产邀请码已配置，明文不入库不入档）。

| 步骤 | 操作 | 实际结果 | 判定 |
| --- | --- | --- | --- |
| 1 | 打开 `/#/papers` | 标题正常渲染；资源为 `index-C5XlJW3y.js`（V5 构建） | B1 ✅ |
| 2 | 注册 `accept_mw299w58` → `GET /api/auth/me` | 注册 200 + Cookie 下发；me 200 | B2 ✅ |
| 3 | `POST /api/projects` | 200，`projectId` 返回 | B2 ✅ |
| 4 | `GET /api/papers/search?query=深度学习 时序预测&limit=5` | 200，`source: openalex`，5 篇真实文献（首条：光学遥感图像小目标检测深度学习算法综述，2025，Journal of Image and Graphics，被引 1） | B3 ✅ |
| 5 | `POST /api/advisor/chat`（`advisor-chat-v3` + 空 `milestoneContext`） | 200，`source: model`，携带 `sessionId: chat_01M6…`、`messageId: msg_01M6…` | B4 ✅ |
| 6 | `GET …/chat/sessions/{id}/messages?limit=200` | 200，count=2，roles=`user,assistant`，内容与问答一致 | B4 ✅ |
| 7 | `location.reload()` 后重复步骤 6 | 仍 200，count=2，roles 与内容不变 | B5 ✅ |
| 8 | `POST /api/projects/{id}/delete` | 200 | B6 ✅ |

### 3.1 部署前置检查（同日完成）

- 后端仅上传 `dist/src`（**不含 `dist/data`**，避免本地测试库覆盖生产库）；
- `/etc/course-platform/backend.env` 追加 `OPENALEX_MAILTO`（契约 29.5，缺它检索会走降级）；
- 重启后：服务 `active (running)`、`/health` 200、papers CORS 预检
  `204 + credentials:true + methods:GET,POST,OPTIONS + origin 回显`。
- 部署步骤与踩坑全文：`docs/deployment/backend-sqlite.md` §10。

### 3.2 验收过程中的两个「假 bug」（记录在案，避免重复排查）

1. `promptVersion` 为 `advisor-chat-v1` / `advisor-chat-v2` 的聊天返回
   `sessionId: null` **是设计行为**：只有 `advisor-chat-v3`（携带 `milestoneContext`）
   才进入持久化分支。云端项目前端固定发 v3，不影响真实用户。
2. 对**已删除项目**发聊天仍返回 200 + `sessionId: null`：落库前 `loadProject`
   抛 `PROJECT_NOT_FOUND` 被有意静默（本地项目兼容设计）。排查落库问题前先确认项目存在。

两条均已写入 `docs/deployment/backend-sqlite.md` §10.3。

## 4. 自动化证据（以 CI 最新结果为准）

| 项 | 结果 |
| --- | --- |
| 前端单测（PR #52/#53 合并时） | 1095–1096 pass |
| 后端单测 | 全绿（含 papers CORS 专项 3 条、`credentials:'include'` 断言 1 条） |
| CI | PR #51/#52/#53 合并时四 job 全绿 |

## 5. 已知限制

- 论文检索降级路径（上游超时 / 429 / 503）本轮**未实测**，接口层有单测覆盖；
  用户指示暂缓，M2 联调补。
- V3 未确认材料片段拒绝的生产实测同上（集成测试已覆盖）。
- 验收账号 `accept_mw299w58` 无自助注销通道，留存在生产 `users` 表（项目已删）；
  无害，下次上服务器可顺手清理。
- 聊天历史换设备可见性依赖同一账号登录（本条为产品语义，非缺陷）。

## 6. 结论

- [x] **通过**：V5 两条核心链路（论文检索真实化、聊天持久化）生产环境真机验证通过
- [ ] 有条件通过
- [ ] 不通过

验收人：姜厚禄　日期：2026-11-04　对应 commit：`b6900c4`（前端构建 index-C5XlJW3y.js + 后端 dist 同源）
