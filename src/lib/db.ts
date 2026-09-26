import Dexie, { type EntityTable } from 'dexie'
import { nanoid } from 'nanoid'
import type { CanvasAsset, CanvasDocument } from '../types'
import { SCHEMA_VERSION } from '../types'

class FramefieldDatabase extends Dexie {
  documents!: EntityTable<CanvasDocument, 'id'>
  assets!: EntityTable<CanvasAsset, 'id'>

  constructor() {
    super('framefield-studio')
    this.version(1).stores({
      documents: 'id, updatedAt, title',
      assets: 'id, createdAt, mimeType',
    })
  }
}

export const db = new FramefieldDatabase()

export function createStarterDocument(title = '灵感画布'): CanvasDocument {
  const now = new Date().toISOString()

  return {
    id: nanoid(),
    schemaVersion: SCHEMA_VERSION,
    title,
    createdAt: now,
    updatedAt: now,
    viewport: { x: 0, y: 0, zoom: 1 },
    jobs: [],
    nodes: [
      {
        id: nanoid(),
        type: 'promptNode',
        position: { x: 120, y: 120 },
        style: { width: 340, height: 230 },
        data: {
          kind: 'prompt',
          title: '第一条视觉指令',
          content: '为一款极简户外腕表设计产品主视觉，石墨灰背景，自然侧光，材质细节清晰。',
        },
      },
      {
        id: nanoid(),
        type: 'textNode',
        position: { x: 540, y: 150 },
        style: { width: 280, height: 180 },
        data: {
          kind: 'text',
          title: '画布说明',
          content: '拖动画布探索空间。双击空白处添加笔记，也可以上传图片，再把节点连成一条创作路径。',
        },
      },
    ],
    edges: [],
  }
}

export async function storeAsset(blob: Blob, fileName: string): Promise<CanvasAsset> {
  const asset: CanvasAsset = {
    id: nanoid(),
    blob,
    fileName,
    mimeType: blob.type || 'application/octet-stream',
    createdAt: new Date().toISOString(),
  }
  await db.assets.put(asset)
  return asset
}
