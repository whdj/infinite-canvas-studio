import { nanoid } from 'nanoid'
import { db } from './db'
import type { CanvasDocument, ProjectExport } from '../types'
import { SCHEMA_VERSION } from '../types'

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, encoded] = dataUrl.split(',')
  const mimeType = header.match(/data:(.*?);base64/)?.[1] ?? 'application/octet-stream'
  const binary = atob(encoded)
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
  return new Blob([bytes], { type: mimeType })
}

export async function downloadProject(document: CanvasDocument): Promise<void> {
  const assetIds = Array.from(
    new Set(document.nodes.map((node) => node.data.assetId).filter((id): id is string => Boolean(id))),
  )
  const storedAssets = await db.assets.bulkGet(assetIds)
  const assets = await Promise.all(
    storedAssets.filter(Boolean).map(async (asset) => ({
      id: asset!.id,
      fileName: asset!.fileName,
      mimeType: asset!.mimeType,
      dataUrl: await blobToDataUrl(asset!.blob),
    })),
  )

  const payload: ProjectExport = {
    format: 'framefield-project',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    document,
    assets,
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = window.document.createElement('a')
  anchor.href = url
  anchor.download = `${safeFileName(document.title)}.framefield.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

export async function importProject(file: File): Promise<CanvasDocument> {
  const payload = JSON.parse(await file.text()) as ProjectExport
  if (payload.format !== 'framefield-project' || !payload.document) {
    throw new Error('这不是有效的 Framefield 项目文件。')
  }
  if (payload.schemaVersion > SCHEMA_VERSION) {
    throw new Error('项目文件来自更高版本，请升级应用后再导入。')
  }

  const assetMap = new Map<string, string>()
  for (const asset of payload.assets ?? []) {
    const nextId = nanoid()
    assetMap.set(asset.id, nextId)
    await db.assets.put({
      id: nextId,
      blob: dataUrlToBlob(asset.dataUrl),
      fileName: asset.fileName,
      mimeType: asset.mimeType,
      createdAt: new Date().toISOString(),
    })
  }

  const now = new Date().toISOString()
  const nodeIdMap = new Map(payload.document.nodes.map((node) => [node.id, nanoid()]))
  const document: CanvasDocument = {
    ...payload.document,
    id: nanoid(),
    title: `${payload.document.title}（导入）`,
    createdAt: now,
    updatedAt: now,
    nodes: payload.document.nodes.map((node) => ({
      ...node,
      id: nodeIdMap.get(node.id)!,
      parentId: node.parentId ? nodeIdMap.get(node.parentId) : undefined,
      data: {
        ...node.data,
        assetId: node.data.assetId ? assetMap.get(node.data.assetId) : undefined,
      },
    })),
    edges: payload.document.edges.map((edge) => ({
      ...edge,
      id: nanoid(),
      source: nodeIdMap.get(edge.source)!,
      target: nodeIdMap.get(edge.target)!,
    })),
    jobs: [],
  }

  await db.documents.put(document)
  return document
}

function safeFileName(value: string): string {
  return value.replace(/[\\/:*?"<>|]/g, '-').trim() || 'framefield-project'
}
