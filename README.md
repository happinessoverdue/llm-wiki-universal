# llm-wiki-universal

`llm-wiki-universal` 是一个面向 AI Agent 的个人知识库技能，基于 Andrej Karpathy 提出的 llm-wiki 个人知识库理念制作，并在实际知识库维护中持续打磨优化。

它的目标不是让 AI 临时总结一篇文章，而是帮助你维护一个长期可积累、可查询、可讨论、可持续演化的本地 Markdown 知识库。

本仓库包含两个配套技能：

- `llm-wiki-universal`：知识库构建、摄取、查询、综合分析和健康检查技能。
- `baoyu-url-to-markdown`：将网页转换为高质量 Markdown 的采集技能，适合作为 `llm-wiki-universal` 的网页素材入口。

## 适合做什么

给自己的智能体安装 `llm-wiki-universal` 和 `baoyu-url-to-markdown` 后，你可以把网页链接、公众号链接、PDF/Word/PPT 文件路径、项目文件夹路径交给智能体，让它帮你维护一个长期可积累、可查询、可讨论的本地知识库，作为自己的工作、生活或兴趣爱好的长期知识沉淀。

它不只是“保存资料”，更像是给智能体接上一个属于你的长期知识背景。后续你可以让它继续整理资料、查询已有内容、沉淀专题分析，也可以基于知识库和它深入讨论某个问题。

## 安装

将 `skills/` 目录下的技能复制到你的 Agent 应用的技能目录。

以 Codex 为例：

```bash
mkdir -p ~/.codex/skills
cp -R skills/llm-wiki-universal ~/.codex/skills/
cp -R skills/baoyu-url-to-markdown ~/.codex/skills/
```

如果你的 Agent 应用使用其他技能目录，请把这两个目录复制到对应位置。

## 依赖

`llm-wiki-universal` 的核心脚本只依赖 Node.js LTS，通常不需要额外安装 npm 包。

`baoyu-url-to-markdown` 需要 Bun 或通过 `npx -y bun` 运行。首次使用时，进入它的脚本目录安装依赖：

```bash
cd skills/baoyu-url-to-markdown/scripts
npm install
```

网页采集依赖 Chrome CDP，适合在支持本地浏览器或命令行工具调用的 Agent 环境中使用。

## 可以这样问

### 0. 了解知识库技能的使用、原理等

先让智能体解释这个技能是什么、适合做什么、怎么初始化、怎么和自己的工作流结合。

```text
这个 llm-wiki 技能是做什么的？适合用来解决哪些问题？

我第一次使用 llm-wiki，应该怎么初始化一个知识库？

llm-wiki 和普通的“让 AI 总结文章”有什么区别？

这个知识库里的 raw、wiki、topic、entity、source、synthesis、queries 分别是什么意思？

我应该怎么把这个知识库和 Obsidian 配合起来使用？

如果我平时主要看网页、PDF、公众号文章和项目文档，应该怎么使用这个技能？

使用这个技能时，我需要注意哪些隐私、安全和敏感信息问题？
```

### 1. 收集和消化资料

把网页、文档、PPT、项目资料等原始素材沉淀进知识库，变成后续可以查询和复用的长期知识。

```text
帮我消化一下这篇文章：https://zhuanlan.zhihu.com/p/2024232028762112639

把这个 PDF 整理进知识库：/Users/xxx/Downloads/report.pdf

把这个 Word 文档整理进知识库：/Users/xxx/Downloads/方案说明.docx

帮我消化一下这个 PPT：/Users/xxx/Downloads/技术交流.pptx

帮我把这个项目文件夹整理进知识库：/Users/xxx/Documents/项目资料
```

URL、PDF、Word、PPT、文件夹等是否能成功处理，取决于你使用的 Agent 应用是否具备对应的文件解析和工具调用能力。

### 2. 查询已有知识

基于已经积累的知识库内容，快速找回相关资料、概念、主题和关联线索。

```text
查询一下知识库里关于 Agent Harness 的内容

帮我看看知识库里有没有关于“企业知识库”的资料

基于知识库，帮我梳理一下目前关于 AI Coding 的资料都有哪些

帮我找一下知识库里和“企业知识库”“Agent Skill”相关的内容
```

### 3. 沉淀查询和综合分析

把一次查询、一个专题综述或一组资料对比，沉淀成可复用的 `queries` 或 `synthesis`。

```text
对比一下知识库里 Claude Code、Codex、Cursor 的资料，并保存成一篇综合分析

基于知识库，整理一份“AI Agent 在企业内部落地”的分析，沉淀到 synthesis 里

帮我查询知识库里关于“Agent Skill 技术债”的内容，并把这次查询结果保存到 queries

基于知识库，帮我整理一份 Agent Harness 的主题综述，并沉淀到 synthesis 里
```

### 4. 基于知识库深入讨论

让 AI 基于知识库的长期积累，陪你横跨多领域的知识进行认知拓展、深层思考和宏观推演。

```text
基于我的知识库，陪我聊聊 AI 和企业研发流程之间可能有哪些结合点

结合知识库里关于 Agent、知识库、自动化工具的内容，帮我一起推演：AI Agent 在企业内部最可能先落地在哪些环节？

基于知识库里的材料，和我探讨一下，在“Agent Harness”的理解方面我还有哪些认知盲区

围绕“AI 如何进入真实业务流程”这个话题，结合我的知识库和我进行一轮深入讨论
```

### 5. 维护知识库

检查知识库结构、链接、素材附件和沉淀质量，让长期积累保持可用、清晰、健康。

```text
帮我做一次知识库健康检查

检查一下素材库 raw 里的素材有没有图片或附件没挂接上

帮我看看知识库里有没有孤立节点、断链或者需要补充入口的页面

帮我检查一下最近整理进知识库的资料有没有沉淀到合适的主题 topic、实体 entity 或分析 synthesis
```

## 知识库目录概念

初始化后，知识库通常会包含这些核心区域：

- `raw/`：原始素材库，保存网页、文档、项目资料等原始输入。
- `wiki/sources/`：对单个素材的知识化摘要和来源记录。
- `wiki/topics/`：围绕主题组织的知识页。
- `wiki/entities/`：人物、项目、工具、概念等实体页。
- `wiki/synthesis/`：跨素材、跨主题的综合分析。
- `wiki/queries/`：一次具体查询的可复用记录。
- `index.md`：知识库入口。
- `wiki-schema.md`：当前知识库的本地约定。

## 注意事项

- 不要把包含密钥、密码、身份证号、手机号等敏感信息的资料直接放入知识库。
- 知识库是本地 Markdown 文件系统，适合用 Git 或备份工具自行管理版本。
- 如果使用 Obsidian 查看图谱，建议关注 `wiki/` 中的主题、实体、来源和综合分析节点；`raw/` 里的图片、HTML 快照等附件可能会产生较多图谱节点。

## License

MIT
