---
name: llm-wiki
description: |
  个人知识库构建与维护(基于Karpathy的llm-wiki方法论实现)。用于持续构建和维护个人知识库。
  触发条件：用户提到"知识库"、"wiki"、"llm-wiki"、"提取到知识库"等时，或要求对已初始化的知识库执行消化(摄取)、查询、健康检查等操作时, 应该优先使用此技能。
  支持多种素材源（网页、推特、公众号、小红书、知乎、YouTube、PDF、本地文件），自动整理为结构化的 wiki。
  当用户询问"怎么用"时，优先给简短上手说明，不要主动展开目录结构、Obsidian、Node.js、脚本或配置文件。
  不要在用户只是要求"总结这篇文章"时触发,必须是明确的知识库相关意图。
---

# llm-wiki — 个人知识库构建系统

> 把碎片化的信息变成持续积累、互相链接的知识库。你只需要提供素材，AI 做所有的整理工作。

## 这个 skill 做什么

llm-wiki 帮你构建一个**持续增长的个人知识库**。它不是传统的笔记软件，而是一个让 AI 帮你维护的 wiki 系统：

- 你给素材（链接、文件、文本），AI 提取核心知识并整理成互相链接的 wiki 页面
- 知识库随着每次使用变得越来越丰富，而不是每次重新开始
- 所有内容都是本地 Markdown 文件，可用普通编辑器查看，也可按需用 Obsidian 浏览

## 核心理念

传统方式（RAG/聊天记录）的问题：每次问问题，AI 都要从头阅读原始文件，没有积累。知识库的价值在于**知识被编译一次，然后持续维护**，而不是每次重新推导。

## 快速开始

告诉用户这两步就够了：

1. **初始化**：说"帮我初始化一个知识库"
2. **添加素材**：给一个链接或文件，说"帮我消化这篇"

---

## 向用户介绍本 skill

当用户想要了解本技能或者个人知识库, 直接使用下面这段话向用户进行介绍：

> 这个知识库可以帮你把散落的资料变成一个能长期积累、查询和复用的个人知识库。你可以直接把网页、公众号文章、PDF、Word、PPT、本地文件或一段文本发给我。
> 你可以在 codex/claude code/trae/OpenClaw/QwenPaw 等各种agent应用中使用这个技能, 使用这个技能去维护和查询使用你的个人知识库, 也可以在Obsidian中方便地查看知识库的整体脉络和结构
> 你可以这样说：
>
> - "帮我消化这篇文章 / 这个 URL / 这个 PDF"
> - "把这个资料收集到知识库"
> - "只收集，先不要消化"
> - "查询一下 XX"
> - "盘点一下知识库"
> - "做一次健康检查"
>
> 一般来说，你说"消化"或"整理进知识库"，我就会先保存原始资料，再把里面的重要观点和关联整理成以后可以查询、回顾和复用的知识。如果你想仔细了解它的保存方式、目录结构或个性化设置，我可以继续为你详细介绍。

**通常情况下不需要向用户详细介绍本技能的详细原理和高级用法,只有当用户想要更详细地了解时,再向用户详细介绍**

---

## 链接语法（强制规范）

- **始终使用标准 Markdown 链接，并且所有本地文件链接目标都用尖括号包裹**：`[显示名](<相对路径.md>)`、`![](<imgs/img-001.png>)`。这仍然是标准 Markdown，不是 Obsidian 私有语法。
- **不要按路径复杂度分情况**：无论目标路径是否包含空格、中文标点、括号、感叹号、竖线、井号、百分号等字符，只要是指向本库内本地文件的链接，一律写成 `[显示名](<相对路径.md>)` 或 `![](<imgs/xxx.png>)`。
- **指向 `raw/` 原始素材的链接也一律使用尖括号形式**，尤其是公众号、微信收藏、网页标题生成的长文件名；这样 Obsidian 图谱和反链索引更容易稳定识别。
- **本地资源链接也必须尖括号包裹**：`.html/.png/.jpg/.jpeg/.webp/.gif/.svg/.pptx` 等附件链接统一写成 `[HTML 快照](<xxx-captured.html>)`、`![](<imgs/img-001.png>)`。
- **禁止**使用 Obsidian 风格的 `[[页面名]]` 语法，除非用户明确说"用 Obsidian 链接格式"或"用 `[[...]]`"。即使已有知识库中存在 `[[...]]` 风格的页面，新写的内容也一律用标准 Markdown 链接。
- 常用链接示例：
  - 实体页：`[概念名](<../entities/概念名.md>)`
  - 素材摘要：`[来源: 素材标题](<../sources/日期-标题.md>)`
  - 复杂路径：`[原文](<../../raw/wechat/很长的 中文 标题/很长的 中文 标题.md>)`
  - 本地图片：`![图示](<imgs/img-001-640.webp>)`
  - HTML 快照：`[HTML 快照](<文章标题-captured.html>)`
  - 主题页：`[主题名](<../topics/主题名.md>)`

## raw 资源后处理与附件审计

外部抓取/转换工具写入 `raw/` 后，可能留下未加尖括号的图片链接、HTML 快照、重复图片或正文漏图。`llm-wiki` 必须把这视为知识库维护问题，而不是要求每个外部工具都完美遵守本库规范。

- **可自动修复**：本地 `.md/.html/.png/.jpg/.jpeg/.webp/.gif/.svg/.pptx` 链接统一包成 `<...>`。
- **只报告不删除**：`imgs/` 下未被 Markdown 引用的图片、HTML 快照、PPTX 等附件只列为审计项。疑似正文图不得自动删除。
- **疑似正文漏图处理建议**：宽图、长图、代码截图、信息图优先标记为 `needs_review_possible_body_image`；可先补到文章末尾的“未挂接图片”区，重要素材再人工挪回正确段落。
- **噪声附件处理建议**：二维码、头像、点赞/分享图标、空白占位图可标记为 `likely_noise` 或 `ui_or_social_icon`，通常建议在 Obsidian 图谱中过滤附件类型，必要时再清理。
- **项目式 raw 素材**：`raw/我的项目/<项目名>/` 默认视为一个 source bundle；外部知识层只链接项目入口，项目入口负责组织内部材料。

脚本：

```
node "${SKILL_DIR}/scripts/raw-resource-audit.js" <wiki_root> --fix-links
node "${SKILL_DIR}/scripts/raw-resource-audit.js" <wiki_root> --target "<raw 路径>" --fix-links
node "${SKILL_DIR}/scripts/raw-resource-audit.js" <wiki_root> --json
```

---

## 知识库上下文层级

llm-wiki 的默认机制写在本 skill 里；知识库根目录里的文件只提供当前库的内容、状态和可选补充。读取上下文时按下面的语义理解，不要把可选文件当成运行前提。

| 层级 | 文件/来源 | 作用 |
|------|-----------|------|
| 默认机制 | 本 skill | ingest、query、lint、graph、delete 等通用工作流和默认规则。 |
| 当前内容入口 | `index.md`、`wiki/` | 了解这座知识库已经有什么、相关页面在哪里。 |
| 本地约定 | `wiki-schema.md` / Wiki Schema | 当前库相对于默认行为的本地补充。它不是第二份 skill 说明书，不应重复通用流程；没有写明的部分一律使用默认行为。 |
| 用户语境 | `purpose.md` / Purpose | 用户背景与知识库使用语境。它是可选增强上下文，不是维护规则、抽取规范或强约束配置。 |

读取 `purpose.md` 时，只能把它作为理解用户语境的参考：它可以帮助判断素材为什么可能对用户有意义，但不能覆盖原文事实、当前用户指令、Wiki Schema 或本 skill 的流程规则。不要把 `purpose.md` 中的用户背景当作素材事实写入摘要，除非当前素材本身也提供证据。

---

## 运行时依赖

**唯一必要依赖**：**Node.js LTS**（v18 或更高版本）。

本 skill 的所有脚本只使用 Node.js 内置模块（`fs`、`path`、`crypto`、`os`、`net`、`child_process`），**无需 npm install**，也不依赖 bash、perl、python3、jq 等外部工具。

可选外挂（有则自动用，无则优雅回退）：
- `baoyu-url-to-markdown` — 普通网页、微信公众号、X/Twitter、知乎提取（需要 Chrome 以调试模式启动）
- `wechat-article-to-markdown` — 微信公众号备选提取器（需要 uv；仅在来源总表显式配置时使用）
- `youtube-transcript` — YouTube 字幕提取（需要 uv）

即使这些外挂全部缺失，核心主线（本地文件、纯文本）仍可正常工作。

---

## Script Directory

Scripts located in `scripts/` subdirectory. All scripts are Node.js and run with:
```
node "${SKILL_DIR}/scripts/<script-name>.js" [args...]
```

**Path Resolution**:
1. `SKILL_DIR` = this SKILL.md's directory
2. Script path = `${SKILL_DIR}/scripts/<script-name>.js`

---

## 外挂状态模型

外挂失败统一分成 `not_installed / env_unavailable / runtime_failed / unsupported / empty_result` 五类。

所有需要枚举来源、读取 `source_label`、`raw_dir`、`adapter_name`、`fallback_hint` 的地方，都先读来源总表：

```
node "${SKILL_DIR}/scripts/source-registry.js" list
```

需要拿单个来源的定义时，用：

```
node "${SKILL_DIR}/scripts/source-registry.js" get <source_id>
```

对 URL 类来源，先运行：

```
node "${SKILL_DIR}/scripts/adapter-state.js" check <source_id>
```

`adapter-state.js check` 返回 8 列：

```text
source_id	source_label	state	state_label	detail	recovery_action	install_hint	fallback_hint
```

- `not_installed`：提示用户可补安装，同时允许改走手动入口
- `env_unavailable`：说明缺少的环境条件，同时允许改走手动入口
- `runtime_failed`：说明本次提取执行失败，允许重试一次，再改走手动入口
- `unsupported`：直接给出手动入口，不尝试自动提取
- `empty_result`：说明自动提取没拿到有效内容，请用户手动补全文本

当自动提取实际执行后，再运行：

```
node "${SKILL_DIR}/scripts/adapter-state.js" classify-run <source_id> <exit_code> <output_path>
```

用返回的 `detail`、`recovery_action`、`install_hint`、`fallback_hint` 生成提示。核心主线不因外挂失败而中断。

---

## 工作流路由

根据用户的意图，路由到对应的工作流：

| 用户意图关键词 | 工作流 |
|---|---|
| "初始化知识库"、"新建 wiki"、"创建知识库" | → **init** |
| URL / 文件路径 / "添加素材"、"消化"、"摄取"、"整理" / 直接给链接 | → **ingest** |
| "只收集"、"先不要消化"、"暂时不摄取"、"只放到原始素材" | → **collect-only**（ingest 的轻量分支） |
| "批量消化"、"把这些都整理" / 给了文件夹路径 | → **batch-ingest** |
| "关于 XX"、"查询"、"XX 是什么"、"总结一下" | → **query** |
| "给我讲讲 XX"、"深度分析 XX"、"综述 XX"、"digest XX" | → **digest** |
| "对比一下 X 和 Y"、"比较 X 和 Y"、"整理一下时间线"、"按时间排列" | → **digest**（指定格式） |
| "检查知识库"、"健康检查"、"lint" | → **lint** |
| "知识库状态"、"现在有什么"、"有多少素材" | → **status** |
| "画个知识图谱"、"看看关联图"、"graph"、"知识库地图" | → **graph** |
| "删除素材"、"remove"、"delete source"、"移除" | → **delete** |
| "结晶化"、"crystallize"、"把这个记进知识库"、"总结这段对话" | → **crystallize** |

**重要**：如果用户直接给了一个 URL 或文件，或说"添加"、"收集到知识库"、"整理一下"，但没有明确说"只收集、不消化"，默认走 **ingest** 工作流，即先保存原始素材，再更新 `wiki/` 知识层。如果用户明确说"只收集"、"先不要消化"、"暂时不摄取"、"只放到原始素材"，才走 **collect-only**。如果知识库还不存在，先自动走 **init** 再继续。

---

## 通用前置检查

除 `init` 外，其他工作流默认先执行这段检查：

1. 先检查**当前工作目录**是否像一个 llm-wiki 知识库：
   - 如果包含 `wiki/`、`raw/`、`index.md`、`.wiki-cache.json`、`wiki-schema.md` 中的至少两个典型结构 → 用当前目录作为知识库根路径，**直接跳到步骤 3**
   - 如果不包含 → 进入步骤 2

2. **读取知识库注册表**（`list` 向 stdout 打印**与 `~/.llm-wiki-paths.json` 相同字段**的 JSON，`lastUsed` 与 `wikis` 齐全；无登记时为 `{"lastUsed":"","wikis":[]}`）：
   ```
   node "${SKILL_DIR}/scripts/wiki-paths.js" list
   ```
   - 如果**只有一个**已注册知识库 → 以输出中 **`wikis[0].path`** 为知识库根路径继续步骤 3（**不要**依赖 `get-last-used`：当 `lastUsed` 为空字符串时该命令会失败）  
   - 如果**有多个**已注册知识库 → 向用户展示该 JSON（或从中读取 `title`/`aliases`），询问要操作哪一个，等用户选定路径后继续步骤 3；**推荐**随后执行 `node "${SKILL_DIR}/scripts/wiki-paths.js" set-last-used "<所选路径>"`，以便后续会话与 `get-last-used` 一致  
     - 若用户用**俗称**指代某库，根据 `list` 输出的 JSON 对照 `title` / `aliases` / `path` 判断；仍不确定时请用户确认  
   - 如果**一个都没有** →
     - `ingest` / `collect-only` / `batch-ingest` → 先运行 `init`
     - `query` / `lint` / `status` / `digest` / `graph` / `delete` → 提示用户先初始化知识库

3. 读取基础上下文：
   - 读取 `index.md` 了解当前知识库概览；不存在时继续，但在后续步骤中补建或更新
   - 如果存在 `wiki-schema.md`，读取其中的本地约定；如果不存在或为空，视为无本地补充，使用 skill 默认行为
   - 如果存在 `purpose.md`，读取为可选用户语境；不存在或为空不影响流程

4. 判断 `WIKI_LANG`：
   - 如果当前工作流刚完成 init，则使用 init 时用户选择的语言
   - 否则如果 `wiki-schema.md` 里显式写了 `语言：中文`、`language: zh` 或 `WIKI_LANG=zh` → `WIKI_LANG=zh`
   - 否则如果 `wiki-schema.md` 里显式写了 `语言：English`、`language: en` 或 `WIKI_LANG=en` → `WIKI_LANG=en`
   - 否则根据 `index.md` / `log.md` / `purpose.md` 的标题和正文语言做轻量判断；例如 `# Wiki Index` 通常为 `en`，`# 知识库索引` 通常为 `zh`
   - 仍无法判断时默认 `WIKI_LANG=zh`

**注意（固定工作目录的 Agent）**：如果当前 Agent 的工作目录是固定的（如 OpenClaw），CWD 检测会失效，**必须走步骤 2 的注册表路径**。注册表文件 `~/.llm-wiki-paths.json` 是多知识库的唯一入口。

**知识库注册表**：路径为 `~/.llm-wiki-paths.json`，**仅**使用下面这一种 JSON 形状（由 `wiki-paths.js` 读写，勿手写其它顶层字段）：

- **`lastUsed`**：字符串。最近一次通过 `add` 或 `set-last-used` 选用的知识库根路径；尚无记录时可为 `""`。  
- **`wikis`**：数组，表示已登记的多个知识库。每项为 **`path`**（绝对路径，必填）、**`title`**（显示名）、**`aliases`**（俗称字符串数组，可选）。

若文件不存在，视为空注册表（等价于尚未 `add` 过）。若文件存在但**无法通过校验**（例如缺少 `lastUsed` 或 `wikis`、类型不对），`wiki-paths.js` 会报错退出；应先将该文件**重命名备份**（例如在同目录下改为带时间戳或 `.bak` 后缀的文件名），再用 `add` 按路径重新登记。脚本**不会**自动迁移或改写注册表内容以通过校验。

维护命令（`scripts/wiki-paths.js`）：

- `add <path> [--title <显示名>] [--alias <俗称>] ...`：将路径写入 `wikis`（若已存在则更新该项的 `title`/`aliases`），并把 `lastUsed` 设为该路径  
- `set-last-used <path>`：将已登记路径记为 `lastUsed`  
- `get-last-used`：输出当前 `lastUsed` 指向的路径（无记录或路径不存在则失败）  
- `set-names <path> [--title …] [--alias …] ...`：更新注册表里该库的显示名（`title`）与俗称（`aliases`）  
- `list`：打印**注册表 JSON**（与磁盘文件字段一致）；智能体据此识别多库与称呼  
- `remove <path>`：从注册表**移除**该路径（**不删除**磁盘上的知识库文件夹）；若移除的是当前 `lastUsed`，脚本会自动把 `lastUsed` 改到剩余项或清空  

**称呼与注册表（智能体必须执行）**：若用户要为某个知识库**设定/修改显示名**或**登记俗称、别名**（以后好用说法指代该库，而不只靠路径或文件夹名），在确认知识库根路径后，**必须**用注册表落盘，**不得**只在对话里口头答应而不写文件：

- 该路径**已在** `wikis` 中 → `node "${SKILL_DIR}/scripts/wiki-paths.js" set-names "<路径>" [--title "<显示名>"] [--alias "<俗称>"] ...`（`--alias` 可多次）  
- 该路径**尚未登记** → 先 `add "<路径>"`（可同时带 `--title` / `--alias`），再视需要 `set-names`  

写入后，`list` 与后续会话才能稳定使用这些称呼。

## 输出语言规则

所有面向用户的输出和新写入的 wiki 内容，都按 `WIKI_LANG` 生成：

- `WIKI_LANG=zh` → 使用下文中文示例
- `WIKI_LANG=en` → 保持与中文示例相同的结构、信息量和顺序，仅改为自然英文措辞
- 文件路径、wiki 链接、目录名保持现有约定，不因为语言切换而改动

**术语对照**：
- 素材 → Source
- 收集 → Collect（只保存到 `raw/` 原始素材层）
- 实体 → Entity
- 主题 → Topic
- 摘要 → Summary
- 综合 → Synthesis
- 消化 / 摄取 → Ingest（保存到 `raw/` 并更新 `wiki/` 知识层）
- 对比 → Comparison
- 深度报告 → Deep Dive Report
- 知识图谱 → Knowledge Graph

---

## 工作流 1：init（初始化知识库）

### 前置检查

1. 先检查**当前工作目录**是否像一个 llm-wiki 知识库：
   - 如果包含 `wiki/`、`raw/`、`index.md`、`.wiki-cache.json`、`wiki-schema.md` 中的至少两个典型结构 → 当前目录已经像一个知识库，提示用户已存在并询问是否要重新初始化
2. 如果当前目录不像知识库 → 读取知识库注册表：
   ```
   node "${SKILL_DIR}/scripts/wiki-paths.js" list
   ```
   - 如果注册表里有知识库 → 根据 `list` 打印的 JSON 说明已有库，询问："要新建一个，还是操作某个已有知识库？"（若用户选已有库，可用 `wiki-paths.js set-last-used "<路径>"` 记录为最近使用，或让用户把客户端工作区打开到该路径）
   - 如果注册表为空 → 进入初始化流程

### 步骤

1. **询问知识库主题**（先向用户提问）：
   - "你的知识库要围绕什么主题？比如'AI 学习笔记'、'产品竞品分析'、'读书笔记'"
   - 如果用户没想法，默认用"我的知识库"

2. **询问知识库语言**（先向用户提问）：
   - "知识库内容用什么语言？中文 / English（默认中文）"
   - 选项：`zh`（中文）或 `en`（English）
   - 如果用户没有明确说，默认 `zh`
   - 将选择记录为 `WIKI_LANG`（`zh` 或 `en`）

3. **确认保存路径**（必须与用户交互确认，不得跳过）：

   **3a. 建议默认路径**：
   - 检查当前工作目录（CWD）下是否存在名字包含 `知识库`、`wiki`、`knowledge`、`notes`、`documents`、`docs` 的子目录（不区分大小写），如有则作为候选父目录；
   - 否则以 **CWD 本身**作为候选父目录；
   - 在候选父目录下，建议创建一个以知识库主题命名的**新子文件夹**，例如 `{候选父目录}/{主题名}/`；
   - **不要**默认使用 `~/Documents/`，该目录在 Linux / 部分系统上不存在。

   **3b. 不论用户是否主动给出路径，都必须向用户明确询问**：
   > "我打算把知识库创建在：`{建议路径}`
   > 请选择：
   > 1. 直接用这个路径（在这个目录里初始化，不再新建子文件夹）
   > 2. 在这个路径下新建子文件夹（请告诉我文件夹名）
   > 3. 换一个完全不同的路径"

   用户选择 1 → 最终路径即该目录本身；
   用户选择 2 → 最终路径为 `{建议路径}/{用户输入的文件夹名}/`；
   用户选择 3 → 重新收集路径，并重复本步骤确认。

   **3c. 最终路径确定后，检测目录状态**：
   - 目录**不存在** → 脚本会自动创建，继续下一步；
   - 目录**存在且为空** → 直接继续；
   - 目录**存在且非空** → 必须提示：
     > "这个目录已有文件，直接在里面初始化会混入已有内容。确认继续，还是换一个新路径？"
     收到明确确认后才继续；否则返回 3b 重新选择。

4. **运行初始化脚本**：
   ```
   node "${SKILL_DIR}/scripts/init-wiki.js" "<路径>" "<主题>" "<语言>"
   ```
   - 退出码 `0`：成功，继续下一步
   - 退出码 `2`：目标路径非空，脚本已打印 `[NON_EMPTY]` 信息 → 向用户展示已有文件列表并再次确认；用户确认后加 `--force` 重跑：
     ```
     node "${SKILL_DIR}/scripts/init-wiki.js" "<路径>" "<主题>" "<语言>" --force
     ```
   - 退出码 `1`：其他错误，向用户报告 stderr 内容，停止流程

5. **补充初始化结果说明**：
   - `init-wiki.js` 会生成 `wiki-schema.md`、`purpose.md` 和 `.wiki-cache.json`
   - `wiki-schema.md` 是本地约定文件，默认极简；没有写明的部分使用 llm-wiki 默认行为
   - `purpose.md` 是可选的用户语境文件，用来记录用户背景、知识版图、信息来源、知识库动机、使用场景、思考方式、工具与使用习惯和补充说明；即使为空，知识库也应按默认流程正常工作

6. **本地化种子文件**：
   - 初始化脚本会根据用户选择的语言生成对应的种子文件；`zh` 使用中文模板，`en` 使用英文模板
   - 初始化完成后的当前工作流语言记为 `WIKI_LANG`（`zh` 或 `en`）
   - Wiki Schema 默认保持极简，只记录本知识库相对于默认行为的本地补充；不要把目录结构或通用流程重复写入 Wiki Schema，除非用户明确希望作为本地约定保留

7. **注册路径到知识库注册表**（在 `wikis` 中新增或更新该路径；**不删除**其它已登记条目）：
   ```
   node "${SKILL_DIR}/scripts/wiki-paths.js" add "<路径>" [--title "<显示名>"] [--alias "<俗称>"] ...
   ```
   建议将 init 时用户确认的主题作为 `--title`；用户若平时用俗称称呼该库，可一并写入 `--alias`（可多次）。省略 `title` 时，脚本默认用路径**末段文件夹名**作为显示名。  
   这会把新知识库写入 `~/.llm-wiki-paths.json`（`wikis` 中新增或更新一项），并把该路径记为 `lastUsed`。若系统上已有其他知识库，它们仍保留，不会丢失。

8. **输出引导**（根据 `WIKI_LANG` 切换语言）：

   **中文（zh）**：
   ```
   知识库已创建！路径：<路径>

   接下来你可以：
   - 给我一个链接，我会自动提取并整理（网页、X/Twitter、公众号、知乎等）
   - 小红书内容请直接粘贴文本给我（暂不支持自动提取）
   - 给我一个本地文件路径（PDF、Markdown 等）
   - 直接粘贴文本内容
   - 批量消化：给我一个文件夹路径

   推荐：用 Obsidian 打开这个文件夹，可以实时看到知识库的构建效果。
   ```
   （英文版按「输出语言规则」生成，结构相同。）

---

## 工作流 2A：collect-only（只收集原始素材）

这是 `ingest` 的轻量分支，只在用户明确说"只收集"、"先不要消化"、"暂时不摄取"、"只放到原始素材"时使用。普通的"收集到知识库"、"添加素材"、"整理一下"仍默认走完整 `ingest`。

执行规则：

1. 执行**通用前置检查**。
2. 执行与 `ingest` 相同的隐私自查提示，因为素材仍会进入知识库目录。
3. 复用 `ingest` 的**素材提取路由**获取内容。
4. 只保存原始素材到 `raw/` 对应目录，并尽量避免与已有同 URL、同标题或同文件内容的素材重复。
5. 不生成或更新 `wiki/sources/`、`wiki/entities/`、`wiki/topics/`、`index.md`、`log.md` 和 `.wiki-cache.json`。
6. 输出时告诉用户已保存到哪个 `raw/` 文件，并提示以后可以说"把这个 raw 文件摄取一下"来继续消化。

---

## 工作流 2：ingest（消化素材）

这是最核心的工作流。用户给一个素材进来，AI 做所有的整理工作。

### 前置检查

执行**通用前置检查**（见上方定义）。

### 隐私自查提示（首次进入 ingest 必须执行）

在开始提取或分析任何内容之前，AI **必须**先对用户说下面这句话，然后等待确认：

> 在开始分析这份素材前，请先快速确认里面**不**包含这些敏感内容：
>
> - 手机号码（如 138xxxxxxxx）
> - 身份证号（18 位数字）
> - API 密钥（`sk-...`、`AIzaSy...`、`OPENAI_API_KEY=`、`ANTHROPIC_API_KEY=`、`Bearer ...`）
> - 明文密码（`password=`、`passwd=`）
> - 其他你不希望进入知识库的个人信息
>
> 如果素材里有上面任何一项，请先用文本编辑器删除或脱敏后再继续。
> llm-wiki **不会**自动过滤这些内容，处理后的内容会进入你的知识库。
>
> 确认无上述内容请回复 `y`，要中止请回复 `n`。

**流程规则**：

- 用户回复 `y`（或"可以"、"继续"、"没有"等明确肯定）→ 继续执行后续步骤
- 用户回复 `n`（或"停"、"取消"等明确否定）→ 终止本次 ingest，提示用户清理后再来
- 其他不明确的回复 → 再问一次，最多两次；两次都不是明确 y/n 则终止
- **绕过规则**：如果用户在当前对话里已经明确说过"素材里没有敏感信息，直接开始"，
  或者用户是在 `batch-ingest` 流程中（已经在顶层确认过一次），AI 可以跳过这一步

### 素材提取路由

根据素材类型自动路由到最佳提取方式：

**外挂前置判断**：

- URL 先调用 `node "${SKILL_DIR}/scripts/source-registry.js" match-url "<url>"`
- 本地文件先调用 `node "${SKILL_DIR}/scripts/source-registry.js" match-file "<path>"`
- 纯文本粘贴直接调用 `node "${SKILL_DIR}/scripts/source-registry.js" get plain_text`
- `source-registry.js` 返回 10 列：`source_id`、`source_label`、`source_category`、`input_mode`、`match_rule`、`raw_dir`、`adapter_name`、`dependency_name`、`dependency_type`、`fallback_hint`
- 调用 `node "${SKILL_DIR}/scripts/adapter-state.js" check <source_id>`
- 从 `adapter-state.js check` 的 8 列结果里读取 `state`、`detail`、`recovery_action`、`install_hint`、`fallback_hint`
- 如果 `state=not_installed` / `env_unavailable` / `unsupported` → 不调用外挂，直接按 `detail`、`recovery_action`、`install_hint`、`fallback_hint` 告诉用户下一步
- 只有返回 `available` 时，才继续自动提取

**URL 类素材**（统一走来源总表，不手写域名表）：

> **Chrome 提示**（仅当 `adapter_name=baoyu-url-to-markdown` 时）：
> adapter-state.js check 已通过尝试连接 9222 端口确认 Chrome 调试端口状态。
> 如果 check 返回 `env_unavailable`，直接按 `fallback_hint` 引导用户，不要自行检测 Chrome。
> 如果 check 返回 `available`，正常调用外挂。baoyu-url-to-markdown 会自己处理 Chrome 启动，**继续执行，不要等待用户确认**。
> 如果提取仍然失败，提示用户启动 Chrome 调试模式：
> - macOS：`open -na "Google Chrome" --args --remote-debugging-port=9222`
> - Windows：`chrome.exe --remote-debugging-port=9222`
> - Linux：`google-chrome --remote-debugging-port=9222`

- 如果 `source_category=manual_only` → 不调用外挂，直接使用 `fallback_hint`
- 如果 `adapter_name=wechat-article-to-markdown` → 执行 `wechat-article-to-markdown "<URL>"`
- 如果 `adapter_name=youtube-transcript` → 调用 `youtube-transcript`
- 如果 `adapter_name=baoyu-url-to-markdown` → 调用 `baoyu-url-to-markdown`

**raw 原始素材保存形态**：

- `raw/` 中的原始素材可以是**单文件素材**，也可以是**文件夹素材**。
- 单文件素材适用于纯文本、短文、无重要图片/附件的文章，例如 `raw/articles/xxx.md`。
- 文件夹素材适用于包含重要图片、HTML 快照、视频、附件或其他配套资源的文章，例如 `raw/wechat/xxx/xxx.md` + `imgs/`。
- 判断时关注素材本身：如果图片、快照或附件对理解原文有价值，优先保留为文件夹素材；如果主要价值都在正文文本，可以保存为单文件素材。
- 对文件夹素材，`wiki/sources` 里的“原文位置”必须链接到其中的 Markdown 文件，而不是文件夹。

**本地文件**：
- 统一走 `node "${SKILL_DIR}/scripts/source-registry.js" match-file "<path>"`
- 命中后直接读取，不调用外挂

**纯文本粘贴**：
- 统一视为 `plain_text`
- 直接使用用户提供的文本

**统一回退规则**：

- 对自动提取结果，统一运行 `node "${SKILL_DIR}/scripts/adapter-state.js" classify-run <source_id> <exit_code> <output_path>`
- 从 `classify-run` 返回的 8 列结果里读取 `state`、`detail`、`recovery_action`、`fallback_hint`
- 如果返回 `runtime_failed` → 按 `detail`、`recovery_action`、`fallback_hint` 告诉用户"这次自动提取失败，可以先重试一次；如果还不行，就改走手动入口"
- 如果返回 `empty_result` → 按 `detail`、`recovery_action`、`fallback_hint` 告诉用户"自动提取没有拿到有效正文，请手动补全文本后继续"
- 其他状态也使用同一份返回结果，不再手写第二套回退文案

### 内容分级处理

根据素材长度和信息密度自动选择处理级别：

**判断标准**：
- 素材内容 > 1000 字 → **完整处理**
- 素材内容 <= 1000 字（短推文、小红书笔记等）→ **简化处理**

### 完整处理流程（长素材 > 1000 字）

1. **提取素材内容**：按上面的路由获取素材文本

2. **保存原始素材**到 `raw/` 对应目录：
   - 根据素材类型保存到对应目录（articles/、tweets/、wechat/、xiaohongshu/、zhihu/ 等）
   - 根据上方 raw 原始素材保存形态，保存为单文件素材或文件夹素材；文件夹素材的入口是其中的 Markdown 文件
   - 单文件素材的文件名格式：`{日期}-{短标题}.md`
   - 如果是 URL 类素材，在文件头部记录原始 URL
   - **raw 目录原则上是原始素材区**：保存完成后不做内容性改写；但允许执行机械维护后处理（本地链接尖括号规范化、附件审计报告），不得自动删除附件或重写原文含义

3. **raw 资源后处理**（URL/外部工具产出的素材必须执行；本地纯文本可跳过）：
   - 保存 raw 文件后，运行：
     ```
     node "${SKILL_DIR}/scripts/raw-resource-audit.js" <wiki_root> --target "<raw 文件或目录路径>" --fix-links
     ```
   - 读取输出中的未引用资源列表：只作为本次 ingest 的风险提示，不自动删除。
   - 如果发现 `needs_review_possible_body_image`，在最终回复中提醒用户“可能有正文漏图”；必要时建议后续补到“未挂接图片”区。

4. **读取上下文**：
   - 读取 `index.md` 和相关 `wiki/` 页面，了解当前知识库已有内容
   - 如果存在 Wiki Schema（`wiki-schema.md`），读取为本地约定；不存在或为空则使用默认行为
   - 如果存在 Purpose（`purpose.md`），读取为可选用户语境；不存在或为空不影响流程

5. **缓存检查**：
   - 在进入 LLM 处理前，先运行：
     ```
     node "${SKILL_DIR}/scripts/cache.js" check "<raw 文件路径>"
     ```
   - 如果返回 `HIT` → 跳过本次 LLM 调用，直接读取已有 wiki 页面，并告诉用户这是"无变化，直接复用已有结果"
   - 如果返回 `MISS` → 继续执行下面的两步流程

6. **Step 1：结构化分析**：
   - 输入：原始内容 + 现有 wiki 结构（至少读取 `index.md` 概要）+ 可选的 Wiki Schema 本地约定 + 可选的 Purpose 用户语境
   - 输出：JSON 格式的分析结果，不持久化，只在当前 ingest 流程里临时传递
   - JSON 至少包含 `entities`、`topics`、`connections`
   - `confidence` 是必需字段，缺失就视为格式异常并触发单步回退

   ```json
   {
     "source_summary": "一句话概括",
     "entities": [{"name": "xxx", "type": "concept", "relevance": "high", "confidence": "EXTRACTED"}],
     "topics": [{"name": "xxx", "importance": "high"}],
     "connections": [{"from": "A", "to": "B", "type": "因果", "confidence": "INFERRED"}],
     "contradictions": [{"claim_a": "...", "claim_b": "...", "context": "..."}],
     "new_vs_existing": {"new_entities": [], "updates": []}
   }
   ```

   置信度赋值规则（Claude 必须遵守）：
   - EXTRACTED：信息直接出现在原文里，字面可以找到
   - INFERRED：信息是从多处原文推断出来的，原文没有直接说
   - AMBIGUOUS：原文说法不清楚，或者有歧义
   - UNVERIFIED：信息来自 Claude 的背景知识，原文没有证据

   Step 1 完成后，必须执行验证：
   1. mkdir -p {wiki_root}/.wiki-tmp
   2. 将 Step 1 JSON 写入 {wiki_root}/.wiki-tmp/step1-latest.json
   3. 调用 `node "${SKILL_DIR}/scripts/validate-step1.js" {wiki_root}/.wiki-tmp/step1-latest.json`
   4. 验证完成后删除 {wiki_root}/.wiki-tmp/step1-latest.json

   如果脚本返回非 0，自动回退到单步 ingest（不进行 Step 2）。

7. **Step 2：页面生成**：
   - 输入：原始内容 + Step 1 的分析结果 + 现有相关 wiki 页面 + 可选的 Wiki Schema 本地约定 + 可选的 Purpose 用户语境
   - 输出：所有需要创建或更新的 wiki 页面内容
   - Step 2 负责完成原流程中的素材摘要、实体页、主题页、index、log 更新

8. **容错回退**：
   - 如果 Step 1 不是有效 JSON，或者缺少 `entities`、`topics`、`confidence` 等必需字段，自动回退到原来的单步流程
   - 回退时，所有本次新生成内容统一加上：
     ```markdown
     <!-- confidence: UNVERIFIED -->
     ```
   - 同时在页面顶部加注释说明本次处理因格式问题降级，避免出现"部分标注、部分没标注"的状态

9. **生成素材摘要页**（`wiki/sources/{日期}-{短标题}.md`）：
   - 参考 `templates/source-template.md` 的格式
   - 包含：基本信息、核心观点、关键概念、与其他素材的关联、原文精彩摘录
   - **原文位置字段必须是可点击的 Markdown 链接**，指向 raw 原始文件（相对于摘要页的路径）：
     ```markdown
     - **原文位置**：[raw/articles/{日期}-{短标题}.md](<../../raw/articles/{日期}-{短标题}.md>)
     ```
   - **关键概念部分的每个概念必须链接到对应实体页**（不存在的写 `[待创建: 概念名]`）：
     ```markdown
     - [概念名](<../entities/概念名.md>)
     ```
   - 对 Step 1 中标记为 `INFERRED` 或 `AMBIGUOUS` 的关系，用 HTML 注释保留置信度：
     ```markdown
     <!-- confidence: INFERRED -->
     <!-- confidence: AMBIGUOUS -->
     ```

10. **更新或创建实体页**（`wiki/entities/`）：
   - 对每个关键概念，检查 `wiki/entities/` 下是否已有对应页面
   - 如果已有 → 追加新信息，并在"不同素材中的观点"部分**追加一条指向本次素材摘要页的链接**：
     ```markdown
     - [素材标题](<../sources/{日期}-{短标题}.md>)：该素材中关于此实体的核心描述...
     ```
   - 如果没有 → 创建新实体页，参考 `templates/entity-template.md`，"不同素材中的观点"部分**必须包含指向本次素材摘要页的链接**（同上格式）
   - 互链使用标准 Markdown 链接，例如 `[实体名](<../entities/实体名.md>)`

11. **更新或创建主题页**（`wiki/topics/`）：
   - 识别素材涉及的主要研究主题
   - 如果已有对应主题页 → 在"素材汇总"表**追加本次素材摘要页的链接行**：
     ```markdown
     | [素材标题](<../sources/{日期}-{短标题}.md>) | 核心贡献一句话 | {日期} |
     ```
   - 如果没有 → 创建新主题页，参考 `templates/topic-template.md`，"素材汇总"表**必须包含本次素材摘要页的链接**（同上格式）

12. **更新 index.md**：
   - 在对应分类下添加新条目
   - 更新概览统计数字

13. **更新 log.md 和缓存**：
   - log.md 追加格式：`## {日期} ingest | {素材标题}`
   - 记录新增和更新的页面列表
   - 当前流程成功写完后，运行：
     ```
     node "${SKILL_DIR}/scripts/cache.js" update "<raw 文件路径>" "wiki/sources/{日期}-{短标题}.md"
     ```

14. **向用户展示结果**（按 `WIKI_LANG` 切换语言）：

   **中文（zh）**：
   ```
   已消化：{素材标题}

   新增页面：
   - {素材摘要页}
   - {新实体页1}
   - {新主题页1}

   更新页面：
   - {已有实体页2}（追加了新信息）

   发现关联：
   - 这篇素材和 [已有素材](<../sources/日期-已有素材.md>) 在 {某概念} 上有联系
   ```
   （英文版按「输出语言规则」生成，结构相同。）

### 简化处理流程（短素材 <= 1000 字）

适用于短推文、小红书笔记、简短评论等。

1. **保存原始素材**到对应 `raw/` 目录
2. **raw 资源后处理**：
   - 如果素材来自 URL/外部抓取工具，运行 `node "${SKILL_DIR}/scripts/raw-resource-audit.js" <wiki_root> --target "<raw 文件或目录路径>" --fix-links`
   - 未引用附件只报告，不自动删除
3. **读取上下文并检查缓存**：
   - 读取 `index.md`；如果存在 Wiki Schema 和 Purpose，分别作为可选本地约定和可选用户语境读取
   - 仍然先运行 `node "${SKILL_DIR}/scripts/cache.js" check "<raw 文件路径>"`
   - 如果缓存命中，直接复用已有结果
4. **生成简化摘要页**（`wiki/sources/`）：
   - 只包含基本信息和核心观点
   - 不写"原文精彩摘录"部分
5. **提取 1-3 个关键概念**：
   - 如果对应实体页已存在 → 追加一句话说明
   - 如果不存在 → 在摘要页中用 `[待创建: 概念名]` 标记
6. **更新 index.md、log.md 和缓存**
7. **跳过**：主题页创建/更新、overview 更新

8. **向用户展示简化结果**（按 `WIKI_LANG` 切换语言）：

   **中文（zh）**：
   ```
   已消化：{素材标题}（短内容，简化处理）

   新增：
   - 素材摘要页

   待完善：
   - [待创建: 概念名]（积累更多素材后整理）
   ```
   （英文版按「输出语言规则」生成，结构相同。）

---

## 工作流 3：batch-ingest（批量消化）

当用户给了一个文件夹路径，或者说"把这些都整理一下"。

### 步骤

1. **确认知识库路径**：
   - 执行**通用前置检查**（见上方定义），获取知识库根路径和 `WIKI_LANG`

2. **列出所有可处理文件**：
   - 支持的格式：`.md`, `.txt`, `.pdf`, `.html`
   - 忽略：隐藏文件、`.git` 目录、`node_modules` 等

3. **展示文件列表**，确认处理范围（按 `WIKI_LANG` 切换语言）：

   **zh**：
   ```
   发现 {N} 个文件待处理：
   1. file1.pdf
   2. file2.md
   3. file3.txt

   预计需要 {N} 轮处理。是否开始？
   ```
   （英文版按「输出语言规则」生成，结构相同。）

4. **逐个处理**：对每个文件执行 ingest 工作流
   - 每个文件先 `cache check`
   - 命中缓存的文件直接跳过，不再进入 LLM 处理
   - 只有 `MISS` 的文件才继续执行完整或简化处理

5. **每 5 个文件后暂停**，展示进度并询问是否继续（按 `WIKI_LANG` 切换语言）：

   **zh**：
   ```
   进度：5/{N} 已完成

   本批处理结果：
   - 新增素材摘要：5
   - 新增实体页：3
   - 更新已有页面：7

   继续处理剩余 {M} 个文件？
   ```
   （英文版按「输出语言规则」生成，结构相同。）

6. **全部完成后**：
   - 运行一次 index.md 全量更新
   - 输出总结报告（按 `WIKI_LANG` 切换语言）：

   **zh**：
   ```
   批量消化完成！

   处理了 {N} 个文件：
   - 已跳过 N 个（无变化），处理 M 个（新增/更新）
   - 成功：{S}
   - 跳过（内容为空/格式不支持）：{K}
   - 失败：{F}

   新增页面：{total_new}
   更新页面：{total_updated}
   ```
   （英文版按「输出语言规则」生成，结构相同。）

---

## 工作流 4：query（查询知识库）

### 步骤

1. **确认知识库路径**：
   - 执行**通用前置检查**（见上方定义），获取知识库根路径和 `WIKI_LANG`
   - 如果没有可用知识库，提示用户先初始化
2. **读取 index.md** 了解知识库全貌
3. **搜索相关页面**：
   - 先在 index.md 中定位相关分类和条目
   - 再用 Grep 在 `wiki/` 目录下搜索关键词
   - 读取最相关的 3-5 个页面
4. **综合回答**：
   - 按 `WIKI_LANG` 用对应语言回答用户的问题
   - 标注信息来源（引用 wiki 页面，用标准 Markdown 链接 `[显示名](<相对路径.md>)`）
   - 如果多个素材有不同观点，分别列出并标注来源
5. **判断是否值得持久化**：
   - 如果回答引用了 3 个及以上来源的综合分析，提示用户："是否保存此回答到知识库？"
   - 少于 3 个来源时，默认只做即时回答，不主动建议持久化

6. **重复检测**：
   - 持久化前，先在 `wiki/queries/` 下搜索同主题页面
   - 通过 frontmatter tags 和 title 匹配，判断是否已有同主题 query 页面
   - 如果已有，提示用户是"更新现有页面"还是"新建一页"
   - 如果用户选择更新旧页面，旧版页面增加 `superseded-by` 标记

7. **保存 query 页面**：
   - 用 `templates/query-template.md` 生成页面
   - 保存路径使用 `wiki/queries/{date}-{short-hash}.md`，避免同主题命名冲突
   - frontmatter 必须包含 `type: query` 和 `derived: true`
   - `derived: true` 表示这是衍生内容，不是一手素材

8. **自引用防护**：
   - query 页面在后续 ingest 分析里视为二级来源，不作为主要知识来源
   - 如果后续页面引用 query 页面里的信息，相关关系统一按 `INFERRED` 处理
   - ingest 不主动扫描 `wiki/queries/`；只有当前问题确实需要时，才把 query 页面作为补充材料读取

9. **更新索引和日志**：
   - 保存成功后，在 index.md 中加入 query 条目
   - 同时在 log.md 中追加一条 query 保存记录

---

## 工作流 5：lint（健康检查）

### 触发时机

- 用户主动说"检查知识库"
- 每次 ingest 后，如果素材总数是 10 的倍数，主动建议运行 lint

### 前置检查

执行**通用前置检查**（见上方定义）。如果没有可用知识库，提示用户先初始化。

1. **确定检查范围**：
   - 最近更新的 10 个页面（按文件修改时间排序）
   - 随机抽查的 10 个页面（避免遗漏旧页面的问题）
   - 如果页面总数 <= 20，检查全部

2. **Step 0：调用脚本做机械检查**（必须先做，不要跳过）：

   ```
   node "${SKILL_DIR}/scripts/lint-runner.js" <wiki_root>
   node "${SKILL_DIR}/scripts/raw-resource-audit.js" <wiki_root> --json
   ```

   `lint-runner.js` 负责三项**机械检查**（只需要精确匹配，不需要判断）：
   - 孤立页面（`entities/` 下没有被其他页面引用的实体）
   - 断链（`[text](<path.md>)` 链接指向的文件不存在；遗留 `[[X]]` 格式同样检查）
   - index 一致性（index.md 里有记录但文件缺失的条目）

   `raw-resource-audit.js` 负责 raw 资源检查：
   - 本地资源链接是否已规范为 `<...>`（lint 中只报告；需要修复时再用 `--fix-links`）
   - 图片、HTML 快照、PPTX 等附件是否被 Markdown 引用
   - 未引用附件分类：`needs_review_possible_body_image`、`likely_noise`、`ui_or_social_icon`、`html_snapshot_or_capture`

   退出码：`0` = 运行完成，`1` = 脚本自身错误（路径不存在、index.md 缺失）。
   如果 exit 1，向用户报告错误，不要继续。
   如果 exit 0，把脚本 stdout 读进上下文，作为后续 AI 判断类检查的基础素材。

3. **逐项检查**（AI 判断类，脚本做不了）：

   **矛盾信息**（阅读相关页面，检查是否有互相矛盾的说法）：
   - 列出发现的矛盾
   - 标注每处矛盾的来源页面

   **交叉引用缺失**（检查相关主题的页面之间是否应该互相链接但没链）：
   - 建议添加的交叉引用

   **置信度报告**（统计 `EXTRACTED` / `INFERRED` / `AMBIGUOUS` / `UNVERIFIED`）：
   - 高亮 `AMBIGUOUS` 条目，提醒用户优先验证
   - 抽查标注为 EXTRACTED 的条目，检查是否能在原始素材里找到对应原文
   - 如果发现 EXTRACTED 无法回溯到原文，提示用户回退为更低置信度或重新整理

   **补充建议**：基于 Step 0 脚本的孤立页/断链输出，给出修复建议（脚本只列问题，不给方案）
   - 孤立页面 → 建议从哪些相关页面添加标准 Markdown 链接
   - 断链 → 建议为哪些概念创建新页面，或改写引用为已有页面
   - 未引用 raw 附件 → 不建议直接删除；先区分正文漏图、HTML 快照、二维码/头像/分享图标，再建议“补到未挂接图片区”“过滤附件类型”或“待人工确认”

4. **输出报告**（按 `WIKI_LANG` 切换语言，整合 Step 0 脚本输出 + Step 3 AI 判断结果）：

   **zh**：
   ```
   知识库健康检查报告

   检查范围：最近更新 10 页 + 随机抽查 10 页（共 {N} 页）

   孤立页面（没有其他页面链接到它）：
   - 某页面 → 建议从 相关页面 添加链接

   断链（被链接但不存在）：
   - 某概念 → 建议创建新页面

   矛盾信息：
   - 关于"XX"，页面A 说是 Y，但 页面B 说是 Z

   缺失索引：
   - {文件名} 存在但未记录在 index.md 中

   置信度报告：
   - EXTRACTED：{N}
   - INFERRED：{N}
   - AMBIGUOUS：{N}
   - UNVERIFIED：{N}
   ```
   （英文版按「输出语言规则」生成，结构相同。）

5. **询问用户**：要自动修复哪些问题？（按 `WIKI_LANG` 用对应语言提问）

---

## 工作流 6：status（查看状态）

### 前置检查

执行**通用前置检查**（见上方定义）。如果没有可用知识库，提示用户先初始化。

### 步骤

1. 先运行 `node "${SKILL_DIR}/scripts/source-registry.js" list` 读取来源总表
2. 获取知识库路径（按上面的 CWD 检查逻辑）
3. 统计：
   - 按来源总表中的 `source_label` 和 `raw_dir` 逐项统计 `raw/` 文件数
   - `wiki/entities/` 下的页面数
   - `wiki/topics/` 下的页面数
   - `wiki/sources/` 下的页面数
   - `wiki/comparisons/` 和 `wiki/synthesis/` 下的页面数
   - `purpose.md 是否存在`
4. 读取 `log.md` 最后 5 条记录
5. 读取 `index.md` 获取主题概览
6. 运行 `node "${SKILL_DIR}/scripts/adapter-state.js" summary-human` 获取外挂状态
7. **输出报告**（按 `WIKI_LANG` 切换语言）：

   **zh**：
   ```
   知识库状态：{主题}

   素材分布（按来源总表）：
   - {source_label}：{N}
   - {source_label}：{N}
   ...

   Wiki 页面：{总数} 页
     - 实体页：{N}
     - 主题页：{N}
     - 素材摘要：{N}
     - 对比分析：{N}
     - 综合分析：{N}

   用户语境：
   - purpose.md 是否存在：{是/否}

   最近活动：
   - {日期} ingest | {素材标题}
   - {日期} ingest | {素材标题}
   ...

   外挂状态：
   {summary-human 原文}

   建议：
   - 你可能想深入了解 {某主题}，已有 {N} 篇相关素材
   - {某实体} 被 {N} 篇素材提到，值得整理成独立页面
   ```
   （英文版按「输出语言规则」生成，结构相同。）

   外挂状态直接使用 `node "${SKILL_DIR}/scripts/adapter-state.js" summary-human` 的输出，不要自己再重写一套来源清单。

---

## 工作流 7：digest（深度综合报告）

**区别于 query**：query 是快速问答，不生成新页面；digest 是跨素材深度综合，生成持久化报告。

### 触发关键词

- 默认深度报告格式：`"给我讲讲 XX"、"深度分析 XX"、"综述 XX"、"digest XX"、"全面总结一下 XX"`
- 对比表格式：`"对比一下 X 和 Y"、"比较 X 和 Y"、"X 和 Y 有什么区别"`
- 时间线格式：`"整理一下时间线"、"按时间排列"、"时间顺序"`

### 前置检查

执行**通用前置检查**（见上方定义）。如果没有可用知识库，提示用户先初始化。

1. **搜索相关页面**：
   - 用 Grep 在 `wiki/` 下搜索主题关键词
   - 列出将要综合的页面（让用户了解报告覆盖范围）

2. **深度阅读所有相关页面 + 选择输出格式**：
   - 读取找到的所有相关 wiki 页面（sources/、entities/、topics/）
   - 归纳每个页面的核心观点和来源信息
   - **根据触发关键词决定输出格式**：
     - 用户说"对比"/"比较"类 → 使用**对比表格式**（见下方模板 B）
     - 用户说"时间线"/"按时间"类 → 使用**时间线格式**（见下方模板 C）
     - 其他默认 → 使用**深度报告格式**（见下方模板 A）

3. **生成结构化深度报告**，保存到 `wiki/synthesis/{主题}-{格式}.md`（按 `WIKI_LANG` 切换语言）：

   > 文件名规则：默认格式用 `{主题}-深度报告.md`，对比表用 `{主题}-对比.md`，时间线用 `{主题}-时间线.md`

   **模板 A：深度报告格式（默认）**

   **zh**：
   ```markdown
   # {主题} 深度报告

   > 综合自 {N} 篇素材 | 生成日期：{日期}

   ## 背景概述
   （简要说明这个主题的背景和重要性）

   ## 核心观点
   （按重要性排列，每个观点标注来源）
   - 观点一（来源：[素材A](<../sources/日期-素材A.md>)、[素材B](<../sources/日期-素材B.md>)）
   - 观点二（来源：[素材C](<../sources/日期-素材C.md>)）

   ## 不同视角对比
   （如有多个素材观点不同，在此对比）
   | 维度 | 来源A的观点 | 来源B的观点 |
   |------|------------|------------|

   ## 知识脉络
   （按时间或逻辑顺序梳理该主题的发展）

   ## 尚待解决的问题
   （现有素材中尚未回答的问题，可作为下次搜集素材的方向）

   ## 相关页面
   （列出所有综合来源的链接）
   ```
   （英文版按「输出语言规则」生成，结构相同。）

   **模板 B：对比表格式**（触发词：对比 / 比较）

   ```markdown
   # {对比主题} 对比分析

   > 对比 {N} 个对象 | 生成日期：{日期}

   ## 对比对象
   - [对象 A](<../entities/对象A.md>)
   - [对象 B](<../entities/对象B.md>)
   - [对象 C](<../entities/对象C.md>)（如有）

   ## 对比表

   | 维度       | 对象 A | 对象 B | 对象 C |
   |-----------|--------|--------|--------|
   | 核心观点   | ...    | ...    | ...    |
   | 适用场景   | ...    | ...    | ...    |
   | 优点       | ...    | ...    | ...    |
   | 缺点 / 限制 | ...   | ...    | ...    |
   | 来源素材   | [素材1](<../sources/日期-素材1.md>) | [素材2](<../sources/日期-素材2.md>) | [素材3](<../sources/日期-素材3.md>) |

   ## 关键差异
   （用 1-2 句话说清最重要的差异点）

   ## 相关页面
   ```

   **模板 C：时间线格式**（触发词：时间线 / 按时间）

   ```markdown
   # {主题} 时间线

   > 时间跨度：{起始年} ~ {结束年} | 生成日期：{日期}

   ```mermaid
   gantt
     title {主题} 时间线
     dateFormat YYYY-MM-DD
     section 主要事件
       事件 A : 2023-01-01, 1d
       事件 B : 2024-03-15, 1d
       事件 C : 2025-06-20, 1d
   ```

   ## 事件说明
   - **2023-01-01 — 事件 A**：简要说明（来源：[素材A](<../sources/日期-素材A.md>)）
   - **2024-03-15 — 事件 B**：简要说明（来源：[素材B](<../sources/日期-素材B.md>)）
   - **2025-06-20 — 事件 C**：简要说明（来源：[素材C](<../sources/日期-素材C.md>)）

   ## 相关页面
   ```

   > **时间线格式注意事项**：
   > - `gantt` 要求 `YYYY-MM-DD` 精度
   > - 如果素材只有年份（如 "2023 年"），把日期补为该年第一天（`2023-01-01`）
   > - 如果连年份都不确定，改用**纯文字时间线**（无序列表按时间排序），不用 Mermaid gantt
   > - 如果事件超过 15 个，建议按 section 分组，避免图太长

4. **更新 index.md 和 log.md**：
   - index.md 的"综合分析"分类下添加新报告条目
   - log.md 追加：`## {日期} digest | {主题}`

5. **向用户展示结果**（按 `WIKI_LANG` 切换语言）：

   **zh**：
   ```
   已生成深度报告：{主题}

   综合了 {N} 篇素材：
   - [素材1](<../sources/日期-素材1.md>)、[素材2](<../sources/日期-素材2.md>)...

   报告已保存：wiki/synthesis/{主题}-深度报告.md

   发现这些待解决问题，可以继续搜集素材：
   - {问题1}
   - {问题2}
   ```
   （英文版按「输出语言规则」生成，结构相同。）

---

## 工作流 8：graph（Mermaid 知识图谱）

### 触发关键词

"画个知识图谱"、"看看关联图"、"graph"、"知识库地图"、"展示知识关联"

### 前置检查

执行**通用前置检查**（见上方定义）。如果没有可用知识库，提示用户先初始化。

1. **扫描双向链接**：
   - 遍历 `wiki/` 下所有 `.md` 文件
   - 提取每个文件中的链接（标准 Markdown `[text](<path.md>)` 和遗留 `[[链接]]` 均识别），建立关系列表：`页面A → 页面B`

2. **生成 Mermaid 图表文件** `wiki/knowledge-graph.md`：
   ````markdown
   # 知识图谱

   > 自动生成 | {日期} | 共 {N} 个节点，{M} 条关联

   ```mermaid
   graph LR
     A[概念1] --> B[概念2]
     A --> C[素材1]
     D[主题1] --> A
     D --> E[概念3]
   ```

   查看方式：用 Typora、VS Code（Markdown Preview Enhanced）、或直接在 GitHub 上查看。
   ````

   **生成规则**：
   - 节点名用中括号 `[名称]`，名称太长则截断到 10 字
   - 只展示有双向链接关系的节点（孤立节点不纳入图谱）
   - 如果关系超过 50 条，只保留被引用次数最多的 30 个节点，避免图谱过于密集
   - **默认全部使用 `A --> B` 无标注箭头**，不自动判断关系类型

3. **向用户展示结果**（按 `WIKI_LANG` 切换语言）：

   **zh**：
   ```
   知识图谱已生成！

   共 {N} 个节点，{M} 条关联
   文件：wiki/knowledge-graph.md

   查看方式：
   - Obsidian：直接打开即可渲染
   - VS Code：安装 Markdown Preview Enhanced 插件
   - GitHub：上传后自动渲染
   - Typora：直接打开

   孤立页面（未纳入图谱）：
   - 某页面（建议添加到相关实体页或主题页）
   ```
   （英文版按「输出语言规则」生成，结构相同。）

---

## 工作流 9：delete（删除素材）

### 触发关键词

"删除素材"、"remove"、"delete source"、"移除"

### 前置检查

执行**通用前置检查**（见上方定义）。如果没有可用知识库，提示用户先初始化。

### 步骤

1. **识别目标素材**：
   - 在 `raw/` 下搜索用户提到的素材名
   - 如果匹配到多个候选，先列出候选文件让用户确认

2. **扫描影响范围**：
   - 先运行：
     ```
     node "${SKILL_DIR}/scripts/delete-helper.js" scan-refs "<wiki 根目录>" "<素材文件名>"
     ```
   - 用脚本返回的页面列表作为引用扫描结果
   - 逐页判断是"删除整页"还是"保留页面但移除该素材引用"

3. **安全确认**：
   - 如果影响超过 5 个页面时，先把受影响页面完整列给用户，再做二次确认
   - 如果某个实体或主题只被这个素材引用，提示用户是否连同页面一起删除

4. **执行级联清理**：
   - 删除 `raw/` 下对应原始文件
   - 删除 `wiki/sources/` 下对应素材摘要页
   - 对 `wiki/entities/`、`wiki/topics/`、`wiki/comparisons/`、`wiki/synthesis/` 中仍需保留的页面，只移除该素材相关的引用段落
   - 更新 `index.md`
   - 在 `log.md` 追加删除记录
   - 标记 `wiki/overview.md` 需要重新生成

5. **清理缓存**：
   - 删除完成后，对对应 raw 文件运行：
     ```
     node "${SKILL_DIR}/scripts/cache.js" invalidate "<raw 文件路径>"
     ```

6. **断链检查**：
   - 用 Grep 或 `delete-helper.js` 再扫一遍指向已删除页面的链接
   - 清理明确可判定的断链；如果归属不清，保留原文并提示用户后续人工确认

7. **向用户报告结果**：

   **zh**：
   ```
   已删除：
     - raw/articles/2024-01-15-ai-article.md
     - wiki/sources/2024-01-15-ai-article.md
   已更新（移除引用）：
     - wiki/entities/AI-Agent.md
     - wiki/topics/大语言模型.md
   需要重新生成：
     - wiki/overview.md
   ```
   （英文版按「输出语言规则」生成，结构相同。）

---

## 工作流 10：crystallize（结晶化）

**触发条件**：
用户说"结晶化"、"crystallize"、"把这个记进知识库"、"这段对话很有价值"

**输入**：
用户主动提供的内容（文字粘贴进对话，或明确引用某段上下文）。
用户必须主动提供内容，Claude 不自动提取当前会话。

**处理步骤（MVP）**：

1. 用户提供内容（文字粘贴进对话）
2. Claude 从内容中提取：
   - 核心洞见（3-5 条）
   - 关键决策和原因
   - 值得记录的结论
3. 生成 `wiki/synthesis/sessions/{主题}-{日期}.md`，格式参考 `templates/synthesis-template.md`
4. 更新 `log.md`（记录本次结晶化操作）

> MVP 版本不自动创建 entity 页面，不自动更新 index.md。

**confidence 规则**：
结晶化来源的内容默认标记为 `INFERRED`（来自推断/对话，非原始文档）。

**输出示例**：
已创建 wiki/synthesis/sessions/AI-agent-设计决策-20260413.md
已更新 log.md
