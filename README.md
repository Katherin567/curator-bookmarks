<p align="center">
  <img src="src/assets/icon128.png" alt="Curator Bookmark" width="96" height="96">
</p>

<h1 align="center">Curator Bookmark</h1>

<p align="center">
  本地优先的 Chrome 书签管理扩展，用于搜索、整理、备份、清理和重新组织浏览器书签。
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Chrome%20Manifest-V3-blue?logo=googlechrome" alt="Manifest V3">
  <img src="https://img.shields.io/badge/TypeScript-ES2022-3178c6?logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/License-MIT-green" alt="MIT License">
  <img src="https://img.shields.io/github/v/release/sy0u1ti/curator-bookmarks" alt="GitHub Release">
</p>

---

## 功能概览

Curator Bookmark 面向本地书签重度用户。它不需要账号系统，也不依赖后端服务；核心数据保存在 Chrome 本地存储和 IndexedDB 中。

### Popup 书签管理

- 在扩展弹窗中浏览书签栏、展开文件夹、打开、编辑、移动和删除书签。
- 支持当前网页快速收藏和智能分类。
- 删除书签前会写入扩展回收站，短时间内可撤销。
- 固定入口 `Inbox / 待整理`，方便查看等待整理的收藏。

### 搜索与高级语法

- Popup 和书签仪表盘都支持本地搜索，匹配标题、URL、域名、文件夹路径、AI 标签、手动标签、别名、摘要和中文拼音首字母。
- 支持高级语法：`site:`、`folder:`、`type:`、时间表达和排除词，例如：
  - `site:github.com react`
  - `folder:前端 type:文档`
  - `最近一个月 AI 教程 -youtube`
- Popup 可切换自然语言搜索；配置 AI 渠道后可用 AI 改写查询，未配置或不可用时回退到本地解析。
- 书签仪表盘支持保存、选择和删除搜索条件。

### 零负担收藏 Inbox

- 快捷键 `Alt+Shift+I` 可直接收藏当前网页到 `Inbox / 待整理`。
- 后台可自动分析网页内容、生成标签和摘要，并在置信度足够时移动到推荐文件夹。
- 支持“自动移动到推荐文件夹”和“只打标签，不自动移动”两种偏好。
- 最近一次自动移动可撤销；低置信度结果会保留在 Inbox。

### 书签仪表盘

- 在全屏仪表盘中用卡片方式查看、筛选和批量处理书签。
- 支持批量选择、批量移动、批量删除到回收站，以及拖拽到目标文件夹。
- 支持编辑手动标签、清除 AI 标签和单条重新生成 AI 标签。
- 手动标签优先展示；AI 标签保留并参与搜索，但不会覆盖手动标签。

### 数据与备份

- 可导出完整备份文件 `curator-backup-YYYY-MM-DD.json`。
- 备份包含 Chrome 书签树、标签数据、回收站、忽略规则、重定向历史、新标签页配置和 AI 设置。
- API Key 不会导出到备份文件，敏感字段会脱敏或省略。
- 导入备份后先预览差异，再选择只恢复标签数据、只恢复新标签页配置，或恢复全部可安全恢复的数据。
- 批量删除、批量移动、去重清理、坏链清理、文件夹清理等危险操作前会自动创建本地备份，并限制保留数量。

### 书签检测与清理

- 书签可用性检测会结合后台导航、网络证据和探测结果，识别可访问、重定向、低置信异常和高置信异常。
- 检测历史会记录异常变化、持续异常和已恢复结果。
- 重定向更新可批量把书签 URL 更新为最终落地地址。
- 忽略规则支持按书签、域名或文件夹过滤检测结果。
- 重复书签检测会排除扩展创建的“标签页”文件夹，避免误处理新标签页入口。
- 文件夹清理可扫描空文件夹、深层低价值文件夹、多层单一路径、同名文件夹和超大文件夹，并先预览再确认执行。
- 超大文件夹拆分会记录本次移动，可撤销本次拆分。
- 回收站集中管理已删除书签，支持批量恢复或清除记录。

### 网页快照与全文索引

- 默认保存网页摘要、标题层级、canonical URL、final URL、内容类型和提取时间。
- 可选择保存全文纯文本，并在搜索中纳入全文索引。
- 单条全文超过 20KB 时写入 IndexedDB，不写入 `chrome.storage.local`。
- 支持“仅本地保存，不上传 AI”的模式。
- 对 PDF、GitHub README、文档页和 YouTube 描述提供轻量抽取或 fallback 标记。

### AI 标签与命名建议

- 支持 OpenAI 兼容的 Responses API 和 Chat Completions API。
- 可测试连接、拉取模型列表、维护自定义模型。
- 可读取本地网页内容，也可选择启用 Jina Reader 远程解析 URL。
- 可生成摘要、主题、标签、别名、标题建议和推荐收藏位置。

### 新标签页

- 接管 Chrome 新标签页，展示扩展创建的“标签页”书签文件夹。
- 支持自定义图标、拖拽排序、背景图片/视频/颜色、时间日期、搜索栏和图标布局。
- 只展示“标签页”文件夹内的书签，避免和普通书签管理混在一起。

## 界面预览

README 内不再直接渲染大截图，以下链接可在 GitHub 中直接打开图片：

- [Popup 书签管理预览](docs/images/popup-preview.png)
- [书签仪表盘预览 1](docs/images/dashboard-preview.png)
- [书签仪表盘预览 2](docs/images/dashboard-preview2.png)
- [新标签页预览](docs/images/newtabs-preview.png)

## 安装

### 下载发行版

1. 前往 [Releases](https://github.com/sy0u1ti/curator-bookmarks/releases) 下载最新 `curator-bookmarks-*.zip`
2. 解压 zip 文件
3. 打开 `chrome://extensions/`，开启右上角 **开发者模式**
4. 点击 **加载已解压的扩展程序**，选择解压后的 `dist` 文件夹

### 从源码构建

需要 Node.js 18+。

```bash
npm install
npm run build
```

然后按上述步骤 3-4 加载 `dist` 文件夹。

## 快捷键

Chrome 可在 `chrome://extensions/shortcuts` 中修改扩展快捷键。

| 快捷键 | 功能 |
| --- | --- |
| `Alt+Shift+I` | 直接收藏当前网页到 `Inbox / 待整理` |
| `Alt+Shift+S` | 打开 Curator 并聚焦搜索 |
| `Alt+Shift+F` | 打开 Curator 并立即进入智能分类 |

## 开发

```bash
npm run dev          # Vite 开发模式
npm run typecheck    # TypeScript 类型检查
npm test             # 运行测试
npm run validate     # 类型检查 + 测试 + 版本检查 + 构建
npm run pack:zip     # 构建并打包 release zip
```

## 隐私与数据边界

- 书签、检测历史、忽略规则、回收站、标签索引、保存搜索、Inbox 状态、网页快照索引、Popup 偏好和 AI 设置保存在本地。
- 超过 20KB 的全文索引和自动备份 payload 使用 IndexedDB 保存。
- API Key 仅保存在当前扩展的本地存储中，不会导出到完整备份文件。
- 只有用户主动触发 AI 分析、自动分析、智能分类或自然语言搜索，并完成相关配置后，才会访问外部 AI 服务。
- 启用 Jina Reader 远程解析 URL 时，目标网页 URL 会发送给 Jina Reader。
- 本项目不提供账号系统、云同步或后端服务。

## 技术栈

| 类别 | 技术 |
| --- | --- |
| 语言 | TypeScript (ES2022) |
| 构建 | Vite + @crxjs/vite-plugin |
| 扩展格式 | Chrome Manifest V3 |
| 主要运行时依赖 | pinyin-pro |
| UI | 原生 DOM 操作 |
| 存储 | chrome.storage.local + IndexedDB |

## 许可

[MIT](LICENSE)
