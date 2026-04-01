# Claude Code 网络协议分析器设计文档

- 日期：2026-04-01
- 目标版本：MVP v1
- 产品定位：个人本地分析工具，纯前端优先
- 输入来源：Reqable 导出的 HAR 文件

## 1. 背景与目标

本产品用于分析 Claude Code 在浏览器中的网络请求，重点不是做通用抓包，而是把网络层事实解释为 Claude Code 的 agent 行为。用户上传 Reqable 导出的 HAR 后，系统应在浏览器端完成解析、重构和语义分析，帮助用户看清每一次 `/v1/messages` 请求在完整 workflow 中扮演的角色。

核心目标：

1. 完整解析 Anthropic `/v1/messages` SSE 流。
2. 重构 assistant 的完整输出，包括 text 与 tool_use。
3. 自动识别请求所属的 agent 步骤，如 Planning、Tool Call、Observation、Final Answer。
4. 按时间顺序还原 Claude Code 的多轮对话与工具调用循环。
5. 自动对比当前请求与上一条同类请求的差异，突出 system、messages、tools、tool results 等关键变化。

## 2. 非目标

以下内容不纳入第一版范围：

- 团队协作、用户系统、云端同步
- mitmproxy 首发支持
- 多模型厂商协议统一分析
- 多 HAR 会话合并分析
- 自动生成完整正式报告
- 可配置规则编辑器

## 3. 用户与使用场景

目标用户：需要分析 Claude Code 行为的开发者、提示词工程师、协议研究者。

第一版主要场景：

1. 上传 Reqable 导出的 HAR。
2. 自动筛选 Claude Code 相关请求。
3. 从左侧请求列表中选择一条请求。
4. 在右侧查看这条请求在 agent workflow 中的角色、重构后的 assistant 输出、工具调用、上下文与差异。
5. 切换到 Timeline 视图理解本轮 User Prompt → Planning → Tool Call → Observation → Final Answer 的完整过程。

## 4. 产品设计原则

1. **纯前端优先**：所有解析尽量在浏览器端完成。
2. **协议层与语义层分离**：原始网络事实与 Claude Code agent 解释解耦。
3. **一次解析，多视图共享**：解析结果同时服务于 Network、Timeline、Detail、Diff。
4. **本地分析优先**：无需后端即可使用。
5. **大文件可用**：必须考虑 Worker、虚拟列表、按需计算。
6. **专业分析体验**：信息密度高，但层级清晰，支持长时间使用。

## 5. 总体架构

采用 Dual-core 架构：

- 左侧是 Network 请求流，负责呈现底层抓包事实。
- 右侧是 Agent 语义视图，负责解释当前请求在 Claude Code workflow 中的角色。
- 中间通过统一解析引擎串联，完成标准化、SSE 重构、步骤识别、Timeline 重建和 Diff 生成。

### 5.1 分层结构

#### A. Ingestion 层
负责读取 Reqable HAR 并提取 `log.entries`。

职责：
- 兼容 Reqable HAR 结构
- 读取文件与基本元信息
- 输出原始 `HarEntry[]`

#### B. Normalization 层
负责把 HAR entry 转成内部统一模型。

职责：
- 解析 request/response headers
- 解析 request body JSON
- 提取 `/v1/messages` 的核心字段
- 解析 SSE 响应
- 重构完整 assistant message

#### C. Semantic Analysis 层
负责把协议数据解释成 Claude Code agent 行为。

职责：
- 识别 step type
- 匹配 tool_use 与 tool_result
- 重建 Conversation Turn / Session Timeline
- 生成请求 Diff 摘要与结构化差异

#### D. View Model 层
负责为 UI 生成稳定、可直接渲染的视图模型。

职责：
- 生成列表摘要
- 生成右侧综合摘要卡片
- 生成 Timeline 节点模型
- 生成 Diff 视图数据

#### E. UI 层
由三类主视图组成：
- Network 表格视图
- Timeline / Session 视图
- Request Detail 详情面板

## 6. 核心数据流

```text
上传 HAR
  → 读取 JSON
  → 提取 entries
  → 过滤 Claude Code 请求
  → 标准化 request/response
  → 解析 SSE
  → 重构 assistant message
  → 推导工具调用与 observations
  → 分类步骤类型
  → 构建 timeline / turns
  → 生成 diff 索引
  → 渲染 Network + Timeline + Detail
```

### 6.1 处理顺序

1. 文件导入：使用浏览器读取 HAR 文件。
2. 请求过滤：优先识别 `POST https://api.anthropic.com/v1/messages`。
3. 请求体解析：提取 `model`、`system`、`messages`、`tools`、`thinking` 等字段。
4. 响应体解析：切分 SSE frame，识别事件，重构 assistant 内容。
5. 语义判定：识别 Planning、Tool Call、Observation、Final Answer。
6. 会话重建：串联请求，形成 turn 与 timeline。
7. 差异分析：默认将当前请求与上一条同类请求进行比较。

## 7. 功能模块划分

### 7.1 文件导入与当前会话模块

功能：
- 上传 Reqable HAR
- 显示文件名、大小、总 entry 数、命中 Claude 请求数
- 清空当前会话
- 可选缓存最近一次会话

### 7.2 Claude 请求过滤模块

功能：
- 识别 host 为 `api.anthropic.com`
- 识别 pathname 为 `/v1/messages`
- 识别 method 为 `POST`
- 识别 body 中是否包含 `messages` / `tools` / `system`

输出：
- `ClaudeRequestRecord[]`

### 7.3 SSE 解析与响应重构模块

功能：
- 切分 SSE 事件块
- 解析 `message_start`、`content_block_start`、`content_block_delta`、`message_delta`、`message_stop`
- 合并 text block
- 合并 tool_use block 的 input JSON 增量
- 提取 stop_reason 与 usage
- 同时保留原始事件列表与重构结果

### 7.4 Agent 语义分析模块

功能：
- 判断当前请求属于哪一个 workflow 步骤
- 提供分类置信度与理由
- 识别工具调用与 observation 注入
- 串联上下游请求

### 7.5 Diff 分析模块

功能：
- MVP 默认自动比较当前请求与上一条同类请求
- Phase 3 再补充手动选择任意两条请求比较
- 提供结构化 JSON Diff 与文本 Diff
- 输出自然语言变化摘要

### 7.6 分析视图模块

功能：
- Network 表格视图
- Timeline / Session 视图
- Request Detail 多 Tab 详情面板

## 8. 页面布局设计

## 8.1 总体布局

采用双栏混合视图：

- 顶部：工具栏
- 左侧：请求列表区（默认 Network，可切 Timeline）
- 右侧：详情分析区（顶部摘要卡片 + 多 Tab）

## 8.2 顶部工具栏

包含：
- Upload HAR 按钮
- 当前文件信息
- 搜索框
- 过滤器
- 统计信息
- 视图切换按钮（Network / Timeline / Split）

## 8.3 左侧请求列表区

默认是 Network 表格，但每一行必须包含 Claude Code 语义标签。

建议列：
- 时间
- 序号
- Step 类型
- 摘要
- Tools
- Stop Reason
- Model
- Duration
- Diff 标记

交互：
- 单击查看详情
- 键盘上下浏览
- 支持选择两条请求进行手动 diff

## 8.4 Timeline 视图

按 Claude Code 循环组织：

```text
User Prompt
  ↓
Planning
  ↓
Tool Call
  ↓
Observation
  ↓
Next Action
  ↓
Final Answer
```

节点颜色建议：
- User：灰/蓝
- Planning：紫
- Tool Call：橙
- Observation：青
- Final Answer：绿

## 8.5 右侧详情面板

顶部默认显示综合摘要卡片，内容包括：
- 当前请求序号
- 所属 session / turn
- 判断出的 step type
- 调用了哪些工具
- stop_reason
- 与上一次同类请求的关键变化
- 一句话总结

下方采用 Tabs：
- Overview
- Request
- Response
- Tools
- Diff
- Timeline Context

## 9. 技术选型

### 9.1 框架与 UI
- Next.js 15（App Router）
- TypeScript
- Tailwind CSS
- shadcn/ui

### 9.2 状态管理
- Zustand

推荐 store：
- `useSessionStore`
- `useSelectionStore`
- `useFilterStore`
- `useUiStore`

### 9.3 数据验证与解析
- Zod：用于 HAR、SSE、内部模型校验

### 9.4 列表与性能
- TanStack Table：Network 表格
- TanStack Virtual：虚拟滚动

### 9.5 Worker 与异步计算
- Web Worker
- 可选 Comlink 简化通信

### 9.6 Diff 与代码展示
- JSON Viewer 组件
- 文本 / JSON Diff 组件
- Shiki 或 PrismJS 做语法高亮

### 9.7 本地持久化
- IndexedDB（首版可先预留接口）

## 10. 前端工程结构建议

```text
src/
  app/
    page.tsx
    layout.tsx

  components/
    layout/
    network/
    timeline/
    detail/
    common/

  features/
    har-import/
    parsing/
    semantic/
    diff/
    filters/
    sessions/

  lib/
    models/
    utils/

  stores/

  workers/
    parser.worker.ts
```

模块原则：
- `features/parsing` 只做协议解析
- `features/semantic` 只做语义分析
- `features/diff` 只做比较逻辑
- `components` 只负责展示

## 11. 核心数据模型

建议分四层：
- HAR 原始层
- 标准化协议层
- Claude 语义层
- UI 视图层

关键模型包括：
- `HarEntry`
- `NormalizedClaudeRequest`
- `AnthropicMessagesRequest`
- `AnthropicSseEvent`
- `ReconstructedAssistantMessage`
- `ClassifiedRequest`
- `ConversationTurn`
- `TimelineStep`
- `RequestDiffSummary`
- `RequestSummaryCardVM`

## 12. SSE 解析设计

解析流程：

1. 切分 SSE frame
2. 解析 `event:` 与 `data:`
3. 将事件转成 `AnthropicSseEvent[]`
4. 遍历事件流重构 assistant message

### 12.1 text block 合并
- `content_block_start(type=text)` 建立 block
- `content_block_delta(text_delta)` 追加文本
- block 结束时拼接 text

### 12.2 tool_use block 合并
- `content_block_start(type=tool_use)` 建立 block
- `content_block_delta(input_json_delta)` 追加 partial JSON
- 在流结束时尝试解析完整 input
- 如果 JSON 仍不合法，则保留 `inputText`

### 12.3 必须保留的信息
- 原始事件列表
- block index
- stop_reason
- usage
- 重构后的完整 assistant content

## 13. 工具调用高亮策略

维护统一工具注册表，对 Claude Code 常见工具做高亮。

重点高亮：
- WebSearch
- WebFetch
- Bash
- Read
- Write
- Edit
- Glob
- Grep
- `mcp__*`

按类别展示颜色：
- web
- shell
- filesystem
- editor
- search
- mcp
- other

## 14. 智能步骤识别设计

步骤类型：
- `user_prompt`
- `planning`
- `tool_call`
- `observation`
- `final_answer`
- `mixed`
- `unknown`

采用评分式分类，而非纯 if/else。

### 14.1 Tool Call 强信号
- reconstructed content 中包含 `tool_use`
- `stop_reason === tool_use`

### 14.2 Observation 强信号
- 相比前一请求，messages 末尾新增 `tool_result`
- 本次请求主要变化来自 observation 注入

### 14.3 Final Answer 强信号
- reconstructed content 仅包含 text
- 没有 tool_use
- 出现终止型 stop_reason

### 14.4 Planning 信号
- 请求启用 thinking
- 工具调用前的推理文本较明显
- 没有新增 tool_result

### 14.5 UI 要求
分类结果必须展示：
- `stepType`
- `confidence`
- `reasons[]`

## 15. 对话历史与 Timeline 重建

核心思想不是按请求平铺，而是按 turn 组织。

### 15.1 Turn 识别
当出现新的 user message 时，开启新 turn。对于“上下文显著切换”这类启发式判定，首版不作为主规则，只作为低优先级辅助信号，避免过早引入不稳定的切分逻辑。

### 15.2 同一 turn 内部
允许以下循环：

```text
Planning
→ Tool Call
→ Observation
→ Planning
→ Tool Call
→ Observation
→ Final Answer
```

### 15.3 Turn 收尾
出现高置信度 Final Answer 时，视为该 turn 基本结束。

## 16. Diff 设计

分三层：

### 16.1 轻量摘要 Diff
用于摘要卡片，快速说明：
- system 是否变化
- tools 是否变化
- messages 是否变化
- 新增了多少 tool_result
- assistant output 是否变化

### 16.2 结构化 Diff
面向 Diff Tab，重点对比：
- `system`
- `tools`
- `messages`
- `thinking`
- `reconstructed assistant message`

### 16.3 文本 Diff
用于展示：
- system prompt
- assistant text
- tool input / output 文本变化

## 17. 性能设计

### 17.1 Worker 优先
HAR 解析、SSE 重构、timeline 构建、diff 计算放入 Worker，避免阻塞主线程。

### 17.2 精简状态
React / Zustand 中仅存储精简后的 normalized / semantic 数据，不存整份 HAR 原文。

### 17.3 增量呈现
上传后按阶段提供结果：
1. 先显示请求列表
2. 再补语义分类与时间线
3. 最后按需计算重 diff 与格式化详情

### 17.4 虚拟滚动
请求列表必须支持虚拟滚动，以适配大 HAR 文件。

### 17.5 按需计算
仅在用户打开详情或 Diff Tab 时再做深度格式化和复杂比较。

## 18. 可扩展性设计

### 18.1 Parser Adapter
为未来支持更多输入来源预留统一接口。

### 18.2 Provider Adapter
当前只支持 Anthropic `/v1/messages`，但未来可扩展到其他 provider。

### 18.3 Rule Engine
步骤识别规则应从组件中抽离，便于未来增强与维护。

## 19. MVP 开发路线图

### Phase 1：协议打底
交付：
- HAR 上传
- Claude 请求过滤
- request body 解析
- SSE 事件解析
- assistant 输出重构
- Request / Response 详情展示

### Phase 2：语义理解
交付：
- step classification
- tool 高亮
- timeline 构建
- 摘要卡片
- 上下文跳转

### Phase 3：分析效率
交付：
- 自动 diff
- 手动双请求 diff
- 搜索 / 筛选 / 排序
- 虚拟列表
- 懒加载详情

### Phase 4：打磨与稳定性
交付：
- IndexedDB 缓存
- 错误容错
- UI 优化
- 大文件性能优化

## 20. 风险与应对

### 风险 1：HAR 格式差异
应对：使用宽容解析与原始文本 fallback。

### 风险 2：SSE 增量 JSON 不完整
应对：先拼接 raw chunk，最后 parse，失败时保留文本。

### 风险 3：步骤识别误判
应对：采用评分分类，并展示 reasons 与 confidence。

### 风险 4：大 HAR 卡顿
应对：Worker、虚拟滚动、按需格式化、精简状态。

### 风险 5：信息密度过高
应对：默认突出摘要卡片，把复杂信息下沉到 Tabs。

## 21. 成功标准

第一版成功的标志不是“能打开 HAR”，而是用户能够在较短时间内回答以下问题：

1. 当前请求在 Claude Code workflow 中属于哪一步？
2. assistant 本次完整输出了什么？
3. 调用了哪些工具？工具输入是什么？
4. tool_result 如何影响下一步？
5. 当前请求相比上一条同类请求发生了什么关键变化？
6. 这一轮 User Prompt 最终如何演化为 Final Answer？

只要这些问题能被系统稳定回答，第一版就达成目标。
