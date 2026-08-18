<div align="center">

# 🖱️ dsh-click

**DeepSeek Harness 的跨平台原生桌面控制 —— Windows 优先。**

*先看清屏幕，再动手 —— 每次点击都过审批，每次操作都留审计。*

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![DSH plugin](https://img.shields.io/badge/dsh-plugin-✅-green)](https://github.com/topics/dsh-plugin)
[![Node](https://img.shields.io/badge/node-%5E22.19%20%7C%7C%20%3E%3D24-brightgreen.svg)](#)
[![CI](https://img.shields.io/github/actions/workflow/status/PerryLink/dsh-click/ci.yml?branch=main&label=CI)](https://github.com/PerryLink/dsh-click/actions)
[![Version](https://img.shields.io/github/v/tag/PerryLink/dsh-click?label=version)](https://github.com/PerryLink/dsh-click/releases)
[![npm version](https://img.shields.io/npm/v/dsh-click)](https://www.npmjs.com/package/dsh-click)
[![npm downloads](https://img.shields.io/npm/dm/dsh-click)](https://www.npmjs.com/package/dsh-click)

[English](README.md) · [简体中文](README.zh.md) · [Español](README.es.md) · [Português](README.pt.md) · [हिन्दी](README.hi.md)

</div>

---

## 兼容性

| 方面 | 状态 |
|---|---|
| Harness | DeepSeek Harness `0.1.0-rc.6`（声明兼容 `0.1.0-rc.5`–`0.1.0-rc.6`） |
| Node | `^22.19.0 \|\| >=24.0.0` |
| 平台 | **Windows 优先**（UIAutomation + Win32 输入，经由内置 PowerShell 辅助进程）；macOS/Linux 后端已预留，失败时以明确原因关闭 |
| 模型 | 纯文本模型完整可用（`screen_read` 输出结构化文本）；视觉模型额外获得 `screen_shot` 图像 |

## 你能得到什么

`dsh-click` 为 harness 提供完整的「观察 → 行动」闭环，作用于原生桌面应用：

- **`screen_shot`** —— 截取窗口（或主屏幕）截图，按可配置上限缩放。视觉模型会附带图像；纯文本模型则获得文字描述，照常可用。
- **`screen_read`** —— 结构化观察：窗口的无障碍树（元素 id、类型、名称、矩形、支持的模式）加像素位置提示与颜色 —— 纯文本，无需图像模型。
- **`click` / `type` / `scroll` / `key`** —— 以元素 id 或坐标寻址的窗口级操作。优先 UIA invoke，回退到 post 窗口消息 —— 且**绝不抢占前台焦点**。
- **`app_list` / `app_launch`** —— 枚举运行中的应用及其窗口；按名称或路径启动应用。

每个变更性操作都穿过同一条安全边界：

1. **新鲜度** —— 操作必须引用 `basedOn` 观察；执行前重新捕获窗口，屏幕变化（像素哈希 + 最大时限）即拒绝。
2. **审批** —— 默认经 `ctx.approval` 门禁；可用窗口标题/可执行路径正则放行特定窗口（仍记录审计）。
3. **进程身份** —— 操作前后分别校验所属进程 pid 与可执行路径；发生变化即大声拒绝。
4. **审计** —— 观察与操作以 `dsh-click/observed` / `dsh-click/action` 事件写入会话日志（脱敏、仅日志）。

```text
模型                           harness
  │ screen_read ──▶ observationId (+ 元素、像素)              ← 结构化文本
  │ click {basedOn, target} ──▶ 新鲜度校验 ──▶ 审批 ──▶ helper (UIA)
  │                             像素哈希变化? ── 拒绝并要求重新观察
  │                             操作后 pid/exe 变化? ── PROCESS_CHANGED
  │ ◀── 规范 JSON + 审计事件 (dsh-click/action)
```

## 快速开始

```sh
# 1. 把 bundle 装进你的 profile
dsh plugin --profile web add "github:PerryLink/dsh-click#main"

# 或从 npm 安装（正式发布版）
dsh plugin --profile web add dsh-click

# 2. 重启并核实行
dsh --profile web --dump-config | grep -A2 'id: dsh-click'
```

然后让 agent 观察窗口并操作 —— 每次变更性操作都会弹出审批：

```
> 打开记事本，输入 "hello"，再读回屏幕上的内容。
```

## 安装与卸载

- **git 通道**（最新 `main`）：`dsh plugin --profile web add "github:PerryLink/dsh-click#main"` —— `prepare` 脚本仅用生产依赖构建。
- **npm 通道**（正式发布版）：`dsh plugin --profile web add dsh-click`。
- **tarball 通道**：在本仓库执行 `pnpm pack`，然后 `dsh plugin --profile web add ./dsh-click-<version>.tgz`。
- **卸载**：`dsh plugin --profile web remove dsh-click`（或从 profile patch 中删除该行）。

> 如果 pnpm 对本包报 `ERR_PNPM_IGNORED_BUILDS`（esbuild 的平台二进制无害校验），在你的 `pnpm-workspace.yaml` 中加入 `allowBuilds: { esbuild: true }` —— `dsh` CLI 会打印确切片段。

## 配置

所有可调项都是 Schemastery `Config` 字段（可在 cordis.yml 中修改）。按 id 定向覆盖会替换整行 —— 需要重新声明每个键。`cordis.patch.yml` 内联说明了每个键。

| 键 | 默认值 | 含义 |
|---|---|---|
| `requireApproval` | `true` | 每个变更性操作都过审批；观察类工具从不询问 |
| `autoApproveWindows` | `[]` | 跳过审批询问的窗口标题/可执行路径正则（仍做新鲜度校验并审计） |
| `auditSessionEvents` | `true` | 是否向会话追加 `dsh-click/observed`/`dsh-click/action` 审计事件；当 harness 会话读取器不识别这些事件类型时（DeepSeek Harness rc.6/rc.7 静态事件白名单）设为 `false`——含此类事件的日志会拒绝恢复 |
| `focusFallback` | `never` | 操作是否可在最后手段下把目标窗口带到前台（`never` / `allow`） |
| `imageMode` | `auto` | `screen_shot` 渲染：`auto`（模型支持图像时附图像，否则文字）或 `text` |
| `helperTimeoutMs` | `30000` | 每次 helper 调用的超时（毫秒，1..300000） |
| `maxHelperOutputBytes` | `25165824` | 单次 helper 响应的字节上限（1024..67108864） |
| `maxScreenshotSide` | `2560` | 截图最长边像素（320..7680）；超出即缩放 |
| `staleCheckPixels` | `true` | 每次操作前对比新像素哈希，变化即拒绝 |
| `maxObservationAgeMs` | `30000` | 操作可引用观察的最大时限（毫秒，1000..600000） |
| `maxCachedObservations` | `8` | 观察缓存 LRU 上限（1..64） |
| `maxElements` | `500` | 每次 `screen_read` 的无障碍元素上限（1..2000） |
| `maxTreeDepth` | `32` | 无障碍树遍历最大深度（1..64） |
| `maxTextLength` | `200` | 脱敏后模型可见字符串的截断长度（16..10000） |
| `rollbackEnabled` | `true` | `type` 失败时备份并还原控件文本 |

profile patch 中的覆盖示例：

```yaml
- insert:
    - id: dsh-click
      name: dsh-click
      config:
        requireApproval: true
        autoApproveWindows: ['^Notepad']
        focusFallback: never
```

## 工具与界面

| 工具 | 只读 | 需要审批 | 说明 |
|---|---|---|---|
| `screen_shot` | ✅ | — | 返回 `observationId` 供后续操作在 `basedOn` 中引用；模型支持图像时附带图片 |
| `screen_read` | ✅ | — | 无障碍树 + 像素提示；元素 id 是操作的寻址方式 |
| `click` | | ✅ | `elementId` 与 `(x, y)` 二选一；优先 UIA invoke，回退 post 消息 |
| `type` | | ✅ | 仅限 value 模式元素；失败时备份并还原控件文本 |
| `scroll` | | ✅ | 元素（scroll 模式）或窗口（post 滚轮） |
| `key` | | ✅ | post 按键组合（`"Ctrl+S"`）；忽略 post 输入的应用会大声拒绝 |
| `app_list` | ✅ | — | 运行中的应用及其可见窗口 |
| `app_launch` | | ✅ | 按名称或可执行路径启动，可带参数 |

## 权限与数据

- **权限**：变更性操作走官方 `ctx.approval` 接缝 —— 插件从不重实现或绕过它。白名单只会*对特定窗口跳过询问*，不能关闭新鲜度或进程身份校验。
- **数据**：除 attachment store 保存的截图（内容寻址、受 harness 自身附件策略约束）外，插件不落盘任何东西。观察仅存内存（有界 LRU）。无网络请求，不存凭据。
- **会话日志**：`dsh-click/observed` 与 `dsh-click/action` 是仅日志的审计事件，携带脱敏后的窗口/进程事实 —— 标题、路径与自由文本在写入或展示前均先脱敏并截断。

## 安全边界

- **先观察后行动，每次如此。** 操作必须引用新鲜观察；屏幕变化（像素哈希）或观察过期即拒绝，并以模型可读的原因要求重新观察。
- **审批是默认。** 除非你显式放行特定窗口，否则 `requireApproval: true`；每次操作 —— 无论放行与否 —— 都记录审计。
- **不抢前台焦点。** helper 从不把目标窗口带到前台（默认 `focusFallback: 'never'`）；输入经 UIA 或 post 消息送达，不打扰后台窗口。
- **进程身份前后复验。** 每个操作前后立即校验进程身份；操作中途进程被替换则判失败（`PROCESS_CHANGED`）。
- **输出脱敏。** 控制字符被剥离、制表符折叠、凭据形态内容（密钥、token、JWT、bearer 头）在到达模型或日志前一律打码。
- **失败关闭。** 不支持的平台、缺失的 subprocess 服务或不可用的 helper 都会大声拒绝每个调用 —— profile 在任何地方都能正常启动。

## 已知限制

- **Windows 优先。** macOS 与 Linux 后端已预留；在这些平台上每次调用都以明确原因失败关闭。
- **纯文本保真度。** `screen_read` 依赖应用暴露 UIAutomation；没有无障碍树的应用只有像素提示。坐标点击仍然可用。
- **post 输入类应用。** 部分应用忽略 post 窗口消息（游戏、部分 Electron 界面）；`key` 会如实报告而非假装成功。
- **较新 harness 构建上的会话审计。** 审计事件使用两参数 `Session.append` 形式（钉住的 `0.1.0-rc.6` peers 没有 append envelope 选项）；在 post-rc.6 构建上事件为 required-on-read，只要安装了本插件即无碍，因为本插件声明了这些事件类型。

## 开发

```sh
pnpm install        # node ^22.19 || >=24
pnpm run typecheck  # tsc：src + tests，对照本地 harness checkout
pnpm run typecheck:ci  # tsc：对照已发布的 0.1.0-rc.6 类型（无 paths）
pnpm test           # vitest：56 个测试、8 个套件（helper 冒烟在 Windows 上运行）
pnpm run build      # tsdown bundle + tsc 声明（lib/）
pnpm run verify:self-contained  # 依赖声明全部来自 registry
pnpm run verify:artifacts       # 构建产物 ESM 面 + 原生 helper 齐全
pnpm pack           # 发布用 tarball
```

## Topics

`dsh`, `dsh-plugin`, `deepseek-harness`, `deepseek`, `cordis`, `computer-use`, `windows-automation`, `uiautomation`, `desktop-control`, `screen-reader`

## Contributors

- [@PerryLink](https://github.com/PerryLink) —— 创建者与维护者：工具面、操作安全边界、Windows 原生 helper、脱敏层与五语文档。

## PerryLink DSH Plugin Family

本项目是由 [PerryLink](https://github.com/PerryLink) 维护的 [29 个 DeepSeek Harness 插件](https://github.com/PerryLink)之一。如果这个对你有用，其他插件很可能也会：

| Plugin | One-liner |
|---|---|
| [dsh-auto-review](https://github.com/PerryLink/dsh-auto-review) | 审批链上的第二模型自动审查，默认失败关闭 |
| [dsh-background-agents](https://github.com/PerryLink/dsh-background-agents) | 持久化后台子代理，带 Web UI 侧边栏、消息与打断 |
| [dsh-budget](https://github.com/PerryLink/dsh-budget) | DeepSeek Harness 的成本治理：预算、碳排与延迟一屏呈现。 |
| [dsh-checkpoint-rewind](https://github.com/PerryLink/dsh-checkpoint-rewind) | Claude Code /rewind 等价物：快照、会话分叉、一次性恢复 |
| [dsh-claude-move](https://github.com/PerryLink/dsh-claude-move) | 将 Claude Code 会话、记忆、技能与 CLAUDE.md 迁入 DSH |
| **[dsh-click](https://github.com/PerryLink/dsh-click)** | 跨平台原生桌面控制（DeepSeek Harness），Windows 优先。 |
| [dsh-composer-history](https://github.com/PerryLink/dsh-composer-history) | Web 输入框的终端式输入历史：方向键、Ctrl+R 搜索 |
| [dsh-defend](https://github.com/PerryLink/dsh-defend) | DeepSeek Harness 的提示注入、越狱与密钥泄露防护。 |
| [dsh-doublecheck](https://github.com/PerryLink/dsh-doublecheck) | 工程纪律门禁：需求质询、测试门禁、对抗式审查 |
| [dsh-draw](https://github.com/PerryLink/dsh-draw) | DeepSeek Harness 的统一静态图像生成路由。 |
| [dsh-fast](https://github.com/PerryLink/dsh-fast) | DeepSeek Harness 的只读性能诊断。 |
| [dsh-github](https://github.com/PerryLink/dsh-github) | DSH 的 GitHub PR/issue 集成，每次写入都经审批门 |
| [dsh-library](https://github.com/PerryLink/dsh-library) | DeepSeek Harness 的本地文档知识库。 |
| [dsh-local-ai](https://github.com/PerryLink/dsh-local-ai) | DeepSeek Harness 的本地模型（Ollama）接入。 |
| [dsh-lsp-actions](https://github.com/PerryLink/dsh-lsp-actions) | 经语言服务器的 LSP 诊断、格式化、补全、代码操作与重命名 |
| [dsh-mask](https://github.com/PerryLink/dsh-mask) | DeepSeek Harness 的 PII 脱敏中间件——数据到模型前匿名化，展示层还原。 |
| [dsh-mcp-panel](https://github.com/PerryLink/dsh-mcp-panel) | 只读 MCP 运行时面板：/mcp 命令 + 带状态、工具与错误的设置页 |
| [dsh-memento](https://github.com/PerryLink/dsh-memento) | 带审批门的跨会话记忆：ctx.memory 接缝 + SQLite + memory 工具 |
| [dsh-observe](https://github.com/PerryLink/dsh-observe) | DeepSeek Harness 的 OpenTelemetry 与 Langfuse 可观测导出器。 |
| [dsh-output-styles](https://github.com/PerryLink/dsh-output-styles) | Claude Code outputStyles 等价的运行时样式切换 |
| [dsh-permission-rules](https://github.com/PerryLink/dsh-permission-rules) | Claude Code 风格声明式 allow/deny/ask 权限规则，带审计 |
| [dsh-plugin-guide](https://github.com/PerryLink/dsh-plugin-guide) | 按需 agent 技能形式的插件开发知识库 |
| [dsh-score](https://github.com/PerryLink/dsh-score) | DeepSeek Harness 插件的多指标质量评分。 |
| [dsh-session-pin](https://github.com/PerryLink/dsh-session-pin) | 在 Web 侧边栏置顶会话，顺序持久化 |
| [dsh-session-sync](https://github.com/PerryLink/dsh-session-sync) | DeepSeek Harness 的跨设备会话同步——会话存储的专用 git 镜像。 |
| [dsh-skill-pack-security](https://github.com/PerryLink/dsh-skill-pack-security) | 安全审计技能包：密钥扫描、依赖与供应链审查 |
| [dsh-talk](https://github.com/PerryLink/dsh-talk) | DeepSeek Harness 的语音优先会话闭环：对它说，听它答。 |
| [dsh-test-drive](https://github.com/PerryLink/dsh-test-drive) | DeepSeek Harness 插件的隔离式安装冒烟实测。 |
| [dsh-translate](https://github.com/PerryLink/dsh-translate) | DeepSeek Harness 的厂商参数翻译与确定性 JSON 修复。 |

## License

[Apache License 2.0](LICENSE) © 2026 dsh-click contributors
