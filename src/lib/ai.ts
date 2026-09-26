interface ImageApiResult {
  url?: string
  b64_json?: string
  mimeType?: string
  data?: Array<{ url?: string; b64_json?: string; mimeType?: string }>
}

export interface ImageGenerationOptions {
  model?: string
  size?: string
  quality?: string
  count?: number
}

export async function generateImages(
  prompt: string,
  options: ImageGenerationOptions = {},
  signal?: AbortSignal,
): Promise<Array<{ blob: Blob; fileName: string }>> {
  const endpoint = import.meta.env.VITE_IMAGE_API_URL?.trim()
  if (!endpoint) {
    throw new Error('尚未配置图像生成服务。请在 .env.local 中设置 VITE_IMAGE_API_URL。')
  }

  const { count, ...providerOptions } = options
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, n: count ?? 1, ...providerOptions }),
    signal,
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `生成服务返回 ${response.status}`)
  }

  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.startsWith('image/')) {
    const blob = await response.blob()
    return [{ blob, fileName: `generated-${Date.now()}.${extensionFor(blob.type)}` }]
  }

  const result = (await response.json()) as ImageApiResult
  const items = result.data?.length ? result.data : [result]
  const outputs = await Promise.all(items.map(async (item, index) => {
    if (item.b64_json) {
      const binary = atob(item.b64_json)
      const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
      const mimeType = item.mimeType || 'image/png'
      const blob = new Blob([bytes], { type: mimeType })
      return { blob, fileName: `generated-${Date.now()}-${index + 1}.${extensionFor(mimeType)}` }
    }

    if (item.url) {
      const imageResponse = await fetch(item.url, { signal })
      if (!imageResponse.ok) throw new Error('生成成功，但图片下载失败。请检查跨域设置。')
      const blob = await imageResponse.blob()
      return { blob, fileName: `generated-${Date.now()}-${index + 1}.${extensionFor(blob.type)}` }
    }

    throw new Error('生成服务没有返回可识别的图片。')
  }))

  if (outputs.length === 0) throw new Error('生成服务没有返回图片。')
  return outputs
}

function extensionFor(mimeType: string): string {
  if (mimeType.includes('jpeg')) return 'jpg'
  if (mimeType.includes('webp')) return 'webp'
  if (mimeType.includes('avif')) return 'avif'
  return 'png'
}
