import type { Edge, Node, Viewport, XYPosition } from '@xyflow/react'

export const SCHEMA_VERSION = 1

export type CanvasNodeKind = 'text' | 'prompt' | 'image' | 'group'
export type GenerationStatus = 'queued' | 'running' | 'success' | 'failed' | 'cancelled'

export interface CanvasNodeData extends Record<string, unknown> {
  kind: CanvasNodeKind
  title: string
  content?: string
  assetId?: string
  remoteUrl?: string
  fileName?: string
  mimeType?: string
  generationStatus?: GenerationStatus
  generationError?: string
}

export type CanvasNode = Node<CanvasNodeData>
export type CanvasEdge = Edge

export interface GenerationJob {
  id: string
  nodeId: string
  prompt: string
  status: GenerationStatus
  createdAt: string
  updatedAt: string
  resultNodeId?: string
  resultNodeIds?: string[]
  error?: string
}

export interface GenerationSettings {
  model: string
  size: string
  quality: string
  count: number
}

export interface CanvasDocument {
  id: string
  schemaVersion: number
  title: string
  nodes: CanvasNode[]
  edges: CanvasEdge[]
  jobs: GenerationJob[]
  generationSettings?: GenerationSettings
  viewport: Viewport
  createdAt: string
  updatedAt: string
}

export interface DocumentSummary {
  id: string
  title: string
  updatedAt: string
}

export interface CanvasAsset {
  id: string
  blob: Blob
  fileName: string
  mimeType: string
  createdAt: string
}

export interface ProjectExport {
  format: 'framefield-project'
  schemaVersion: number
  exportedAt: string
  document: CanvasDocument
  assets: Array<{
    id: string
    fileName: string
    mimeType: string
    dataUrl: string
  }>
}

export interface AddNodeOptions {
  position?: XYPosition
  content?: string
  title?: string
}
