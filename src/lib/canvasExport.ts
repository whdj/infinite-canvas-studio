import { getNodesBounds, getViewportForBounds } from '@xyflow/react'
import { toPng } from 'html-to-image'
import type { CanvasNode } from '../types'

export async function downloadCanvasImage(nodes: CanvasNode[], title: string): Promise<void> {
  if (nodes.length === 0) throw new Error('画布没有可导出的内容。')
  const viewportElement = document.querySelector<HTMLElement>('.react-flow__viewport')
  const canvasElement = document.querySelector<HTMLElement>('.canvas-area')
  if (!viewportElement || !canvasElement) throw new Error('画布尚未准备好，请稍后重试。')

  const padding = 64
  const bounds = getNodesBounds(nodes)
  const width = Math.max(1, Math.ceil(bounds.width + padding * 2))
  const height = Math.max(1, Math.ceil(bounds.height + padding * 2))
  const viewport = getViewportForBounds(
    { ...bounds, x: bounds.x - padding, y: bounds.y - padding, width, height },
    width,
    height,
    0.1,
    2,
    0,
  )
  const backgroundColor = getComputedStyle(canvasElement).backgroundColor || '#eeeee9'
  const dataUrl = await toPng(viewportElement, {
    backgroundColor,
    width,
    height,
    pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
    style: {
      width: `${width}px`,
      height: `${height}px`,
      transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
      transformOrigin: 'top left',
    },
  })

  const anchor = document.createElement('a')
  anchor.href = dataUrl
  anchor.download = `${safeFileName(title)}.png`
  anchor.click()
}

function safeFileName(value: string): string {
  return value.replace(/[\\/:*?"<>|]/g, '-').trim() || 'framefield-canvas'
}
