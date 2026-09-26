import { createServer } from 'node:http'

const port = Number(process.env.IMAGE_PROXY_PORT || 8787)
const baseUrl = (process.env.IMAGE_API_BASE_URL || '').replace(/\/$/, '')
const apiKey = process.env.IMAGE_API_KEY || ''
const model = process.env.IMAGE_MODEL || ''
const size = process.env.IMAGE_SIZE || ''

const server = createServer(async (request, response) => {
  setCors(response, request)

  if (request.method === 'OPTIONS') {
    response.writeHead(204)
    response.end()
    return
  }

  if (request.method === 'GET' && request.url === '/health') {
    sendJson(response, 200, {
      ok: true,
      configured: Boolean(baseUrl && apiKey),
      model: model || null,
    })
    return
  }

  if (request.method !== 'POST' || request.url !== '/generate') {
    sendJson(response, 404, { error: 'Not found' })
    return
  }

  if (!baseUrl || !apiKey) {
    sendJson(response, 500, {
      error: '请先配置 IMAGE_API_BASE_URL 和 IMAGE_API_KEY。',
    })
    return
  }

  try {
    const body = await readJson(request)
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
    if (!prompt) {
      sendJson(response, 400, { error: 'prompt 不能为空。' })
      return
    }

    const requestedModel = typeof body.model === 'string' && body.model.trim() ? body.model.trim() : model
    if (!requestedModel) {
      sendJson(response, 400, { error: '请在 .env.server 或界面“生成设置”中配置 IMAGE_MODEL。' })
      return
    }
    const providerBody = {
      model: requestedModel,
      prompt,
      n: Number(body.n) > 0 ? Math.min(Number(body.n), 4) : 1,
      ...(typeof body.size === 'string' && body.size.trim() ? { size: body.size.trim() } : size ? { size } : {}),
      ...(typeof body.quality === 'string' && body.quality.trim()
        ? { quality: body.quality.trim() }
        : {}),
    }
    const providerResponse = await fetch(`${baseUrl}/images/generations`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(providerBody),
    })

    const providerType = providerResponse.headers.get('content-type') || ''
    if (!providerResponse.ok) {
      const message = await providerResponse.text()
      sendJson(response, providerResponse.status, {
        error: message || `图像服务返回 ${providerResponse.status}`,
      })
      return
    }

    if (providerType.startsWith('image/')) {
      response.writeHead(200, { 'Content-Type': providerType })
      response.end(Buffer.from(await providerResponse.arrayBuffer()))
      return
    }

    const result = await providerResponse.json()
    const items = Array.isArray(result?.data) ? result.data : [result]
    const output = []
    for (const item of items) {
      if (item?.b64_json) {
        output.push({ b64_json: item.b64_json, mimeType: item.mimeType || 'image/png' })
        continue
      }
      if (item?.url) {
        const imageResponse = await fetch(item.url)
        if (!imageResponse.ok) throw new Error('图像服务返回的图片地址无法下载。')
        const mimeType = imageResponse.headers.get('content-type') || 'image/png'
        const data = Buffer.from(await imageResponse.arrayBuffer()).toString('base64')
        output.push({ b64_json: data, mimeType })
      }
    }
    if (output.length > 0) {
      sendJson(response, 200, { data: output })
      return
    }
    sendJson(response, 502, { error: '图像服务没有返回 url 或 b64_json。' })
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : '代理请求失败。',
    })
  }
})

server.listen(port, '127.0.0.1', () => {
  console.log(`Framefield image proxy listening on http://127.0.0.1:${port}`)
})

function setCors(response, request) {
  const requestOrigin = request.headers.origin
  const allowedOrigin = ['http://localhost:4173', 'http://127.0.0.1:4173'].includes(requestOrigin)
    ? requestOrigin
    : 'http://localhost:4173'
  response.setHeader('Access-Control-Allow-Origin', allowedOrigin)
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

function sendJson(response, status, payload) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  response.end(JSON.stringify(payload))
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let raw = ''
    request.on('data', (chunk) => {
      raw += chunk
      if (raw.length > 1_000_000) request.destroy(new Error('请求体过大。'))
    })
    request.on('end', () => {
      try {
        resolve(JSON.parse(raw || '{}'))
      } catch {
        reject(new Error('请求体不是有效 JSON。'))
      }
    })
    request.on('error', reject)
  })
}
