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

推荐使用仓库内置的本地代理。它把 API Key 留在 Node 进程里，浏览器只访问本地的 `/generate`。

复制两个环境变量示例：

```bash
cp .env.example .env.local
cp .env.server.example .env.server
```

在 `.env.server` 中填写你的服务商信息：

```env
IMAGE_API_BASE_URL=https://api.example.com/v1
IMAGE_API_KEY=replace-with-your-key
IMAGE_MODEL=your-image-model-id
IMAGE_SIZE=
```

然后在 `.env.local` 中设置：

```env
VITE_IMAGE_API_URL=http://localhost:8787/generate
```

启动两个终端：

```bash
npm run api
npm run dev
```

检查代理配置：

```bash
curl http://localhost:8787/health
```

成功时会返回类似：

```json
{"ok":true,"configured":true,"model":"your-image-model-id"}
```

目前代理调用的是 OpenAI 风格的 `POST {BASE_URL}/images/generations`，请求体为 `{ "model", "prompt", "n" }`，并能识别以下返回格式：

- 直接返回图片响应
- `{ "url": "https://..." }`
- `{ "b64_json": "..." }`
- OpenAI 风格的 `{ "data": [{ "url": "..." }] }`

如果服务商不是 OpenAI 风格接口，先不要把 Key 发给我。把它的 Base URL、模型 ID、图像接口路径和返回示例告诉我，我会调整代理适配器。真实 Key 只放在你本机的 `.env.server` 中。

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
