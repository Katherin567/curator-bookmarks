# Curator Bookmark

Curator Bookmarks：一个可信、开源、本地优先的 Chrome 原生书签清理与 AI 整理扩展。

## 主要功能

### 弹窗

- 快速搜索Chrome 书签。
- 快速编辑、移动和删除书签。
- 为当前网页推荐合适的收藏位置。

### 书签管理

- **书签可用性检测**：批量检测网页书签是否可访问。
- **重定向更新**：把检测到的最终 URL 批量同步回原书签。
- **重复书签**：查找并清理重复收藏。

### AI 功能

- 支持自定义 OpenAI 兼容 AI 渠道。
- **AI 智能命名**：批量生成更清晰的书签标题建议。
- **弹窗智能分类**：为当前网页推荐保存文件夹。
- **自动分析**：添加网页书签后，自动分析并归类到合适文件夹。


## 隐私与权限

Curator 尽量把数据留在本地：

- 书签、历史、忽略规则、回收站和 AI 设置保存在 `chrome.storage.local`。
- `API Key` 仅保存在当前扩展的本地存储中。
- 只有在你主动进行检测、AI 分析或智能分类时，才会请求访问相关网站或 AI 服务地址。
- 启用 Jina Reader 远程解析后，目标网页 URL 会发送给 Jina Reader；请谨慎用于隐私页面。

扩展使用的主要 Chrome 权限：

- `bookmarks`：读取、移动、编辑、创建和删除书签。
- `storage`：保存设置、历史、忽略规则和回收站。
- `alarms`：在后台自动分析任务被浏览器回收后唤醒并继续处理。
- `activeTab`：读取当前标签页信息，用于弹窗智能分类。
- `webNavigation` / `webRequest`：执行可用性检测并收集主请求证据。
- `notifications`：自动分析完成后发送 Chrome 通知。
- `optional_host_permissions`：按需请求访问 `http://*/*`、`https://*/*` 或 AI 服务地址。

## 安装与加载

### 方式一：下载发行版

这是最方便的安装方式，不需要安装 Node.js，也不需要自己构建。

1. 打开 [GitHub Releases](https://github.com/shangy1yi/curator-bookmarks/releases)
2. 下载最新版本里的 `curator-bookmarks-*.zip`
3. 解压 zip 文件
4. 打开 `chrome://extensions/`
5. 打开右上角的“开发者模式”
6. 点击“加载已解压的扩展程序”
7. 选择解压后的 `dist` 文件夹

### 方式二：从源码构建

适合需要本地开发或修改源码的情况。需要 Node.js 18+。

1. 安装依赖：

```bash
npm install
```

2. 构建扩展：

```bash
npm run build
```

构建完成后会生成 `dist` 目录。

3. 打开 `chrome://extensions/`
4. 打开右上角的“开发者模式”
5. 点击“加载已解压的扩展程序”
6. 选择项目根目录下的 `dist` 文件夹


## 开发命令

```bash
# 启动 Vite 开发模式
npm run dev

# 类型检查
npm run typecheck

# 运行测试
npm test

# 完整校验：类型检查、测试、版本一致性检查、构建
npm run validate

# 构建并打包 release zip
npm run pack:zip
```




测试
