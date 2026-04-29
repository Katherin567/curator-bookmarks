<p align="center">
  <img src="src/assets/icon128.png" alt="Curator Bookmark" width="96" height="96">
</p>

<h1 align="center">Curator Bookmark</h1>

<p align="center">
  本地优先的 Chrome 书签管理扩展 — 查找、整理、清理和重新组织你的浏览器书签
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Chrome%20Manifest-V3-blue?logo=googlechrome" alt="Manifest V3">
  <img src="https://img.shields.io/badge/TypeScript-ES2022-3178c6?logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/License-MIT-green" alt="MIT License">
  <img src="https://img.shields.io/github/v/release/shangy1yi/curator-bookmarks" alt="GitHub Release">
</p>

---

## 功能特性

**书签弹窗管理** — 在扩展弹窗中浏览、搜索、编辑、移动和删除书签，支持模糊搜索和当前网页快速收藏。

**书签新标签页** — 接管 Chrome 新标签页，将书签文件夹展示为可视化图标入口。支持自定义布局预设、时钟、搜索栏和背景。

**书签检测与清理** — 检测不可访问书签、处理重定向、清理重复书签，配合历史记录、忽略规则和回收站保障操作可追溯。

**AI 书签整理** — 配置 OpenAI 兼容的 AI 服务，自动优化书签标题、推荐收藏位置、新增书签后智能归类到合适文件夹。

## 安装

### 下载发行版

1. 前往 [Releases](https://github.com/shangy1yi/curator-bookmarks/releases) 下载最新 `curator-bookmarks-*.zip`
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

## 开发

```bash
npm run dev          # Vite 开发模式（HMR）
npm run typecheck    # TypeScript 类型检查
npm test             # 运行测试
npm run validate     # 完整校验（类型检查 + 测试 + 版本检查 + 构建）
npm run pack:zip     # 构建并打包 release zip
```

## 隐私

Curator 将数据留在本地：

- 书签、历史、忽略规则、回收站和 AI 设置存储在 `chrome.storage.local`
- API Key 仅保存在扩展本地存储中
- 仅在用户主动触发检测、AI 分析或智能分类时，才会访问外部服务
- 启用 Jina Reader 远程解析时，目标网页 URL 会发送给 Jina Reader

## 技术栈

| 类别 | 技术 |
|---|---|
| 语言 | TypeScript (ES2022) |
| 构建 | Vite + @crxjs/vite-plugin |
| 扩展格式 | Chrome Manifest V3 |
| 运行时依赖 | 无 |
| UI | 原生 DOM 操作 |

## 许可

[MIT](LICENSE)
