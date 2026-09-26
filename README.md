# Framefield

Framefield 是一个本地优先的 AI 无限画布工作台，用于组织灵感、提示词、图片素材和生成结果。

## 功能

- 无限画布缩放、平移、框选和节点连线
- 笔记、提示词、图片和节点组
- 撤销、重做、复制、删除与分组
- 图片上传、拖放和大图预览
- IndexedDB 本地自动保存
- 完整项目 JSON 导入与导出
- 浅色与深色主题
- 可接入自定义 AI 图像生成后端

## 本地运行

```bash
npm install
npm run dev
```

生产构建：

```bash
npm run typecheck
npm run build
```

## 配置 AI 图像生成

复制环境变量示例：

```bash
cp .env.example .env.local
```

然后设置：

```env
VITE_IMAGE_API_URL=https://your-backend.example.com/generate
```

该端点接收 JSON 请求 `{ "prompt": "...", "n": 1 }`，并可返回以下任一格式：

- 直接返回图片响应
- `{ "url": "https://..." }`
- `{ "b64_json": "..." }`
- OpenAI 风格的 `{ "data": [{ "url": "..." }] }`

请勿把供应商 API 密钥写入前端环境变量。应由你自己的后端端点保存密钥并代理生成请求。

## 技术栈

- React 19 + TypeScript + Vite
- React Flow
- Zustand
- Dexie / IndexedDB
- Phosphor Icons

## 数据说明

画布和图片默认仅保存在当前浏览器的 IndexedDB 中。切换设备、清除浏览器数据或更换域名之前，请先使用界面中的“导出项目”功能备份。

## License

MIT
