import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type EdgeChange,
  type NodeChange,
  type Viewport,
  type XYPosition,
} from '@xyflow/react'
import { nanoid } from 'nanoid'
import { create } from 'zustand'
import { generateImages } from '../lib/ai'
import { createStarterDocument, db, defaultGenerationSettings, storeAsset } from '../lib/db'
import type {
  AddNodeOptions,
  CanvasAsset,
  CanvasDocument,
  CanvasEdge,
  CanvasNode,
  CanvasNodeData,
  CanvasNodeKind,
  DocumentSummary,
  GenerationJob,
  GenerationSettings,
} from '../types'
import { SCHEMA_VERSION } from '../types'

interface CanvasSnapshot {
  nodes: CanvasNode[]
  edges: CanvasEdge[]
}

interface CanvasState {
  isReady: boolean
  activeDocumentId: string | null
  createdAt: string
  title: string
  nodes: CanvasNode[]
  edges: CanvasEdge[]
  jobs: GenerationJob[]
  generationSettings: GenerationSettings
  viewport: Viewport
  documents: DocumentSummary[]
  historyPast: CanvasSnapshot[]
  historyFuture: CanvasSnapshot[]
  interactionStart: CanvasSnapshot | null
  lightboxAssetId: string | null
  loadWorkspace: (preferredId?: string) => Promise<void>
  openDocument: (id: string) => Promise<void>
  createDocument: () => Promise<void>
  deleteDocument: (id: string) => Promise<void>
  renameDocument: (title: string) => void
  saveCurrent: () => Promise<void>
  onNodesChange: (changes: NodeChange<CanvasNode>[]) => void
  onEdgesChange: (changes: EdgeChange<CanvasEdge>[]) => void
  onConnect: (connection: Connection) => void
  setViewport: (viewport: Viewport) => void
  addNode: (kind: Exclude<CanvasNodeKind, 'image' | 'group'>, options?: AddNodeOptions) => string
  addImageNode: (asset: CanvasAsset, position: XYPosition, sourceNodeId?: string) => string
  updateNodeData: (id: string, patch: Partial<CanvasNodeData>) => void
  deleteSelected: () => void
  duplicateSelected: () => void
  copySelected: () => void
  pasteClipboard: () => void
  cutSelected: () => void
  groupSelected: () => void
  ungroupSelected: () => void
  beginInteraction: () => void
  endInteraction: () => void
  undo: () => void
  redo: () => void
  startJob: (nodeId: string, prompt: string) => string
  finishJob: (jobId: string, result: { resultNodeId?: string; resultNodeIds?: string[]; error?: string }) => void
  setGenerationSettings: (settings: Partial<GenerationSettings>) => void
  runGeneration: (nodeId: string) => Promise<void>
  cancelGeneration: (jobId: string) => void
  retryGeneration: (jobId: string) => Promise<void>
  openLightbox: (assetId: string | null) => void
}

const defaultViewport: Viewport = { x: 0, y: 0, zoom: 1 }
const generationControllers = new Map<string, AbortController>()

function takeSnapshot(state: Pick<CanvasState, 'nodes' | 'edges'>): CanvasSnapshot {
  return {
    nodes: structuredClone(state.nodes),
    edges: structuredClone(state.edges),
  }
}

function snapshotChanged(a: CanvasSnapshot, b: CanvasSnapshot): boolean {
  return JSON.stringify(a) !== JSON.stringify(b)
}

function withHistory(state: CanvasState): Pick<CanvasState, 'historyPast' | 'historyFuture'> {
  return {
    historyPast: [...state.historyPast.slice(-79), takeSnapshot(state)],
    historyFuture: [],
  }
}

function summarize(document: CanvasDocument): DocumentSummary {
  return { id: document.id, title: document.title, updatedAt: document.updatedAt }
}

function documentFromState(state: CanvasState): CanvasDocument | null {
  if (!state.activeDocumentId) return null
  return {
    id: state.activeDocumentId,
    schemaVersion: SCHEMA_VERSION,
    title: state.title.trim() || '未命名画布',
    nodes: state.nodes,
    edges: state.edges,
    jobs: state.jobs,
    generationSettings: state.generationSettings,
    viewport: state.viewport,
    createdAt: state.createdAt,
    updatedAt: new Date().toISOString(),
  }
}

function readStoredGenerationSettings(): GenerationSettings {
  if (typeof window === 'undefined') return defaultGenerationSettings
  try {
    const stored = JSON.parse(window.localStorage.getItem('framefield-generation-settings') || 'null')
    return { ...defaultGenerationSettings, ...(stored && typeof stored === 'object' ? stored : {}) }
  } catch {
    return defaultGenerationSettings
  }
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  isReady: false,
  activeDocumentId: null,
  createdAt: new Date().toISOString(),
  title: '未命名画布',
  nodes: [],
  edges: [],
  jobs: [],
  generationSettings: readStoredGenerationSettings(),
  viewport: defaultViewport,
  documents: [],
  historyPast: [],
  historyFuture: [],
  interactionStart: null,
  lightboxAssetId: null,

  loadWorkspace: async (preferredId) => {
    let documents = await db.documents.orderBy('updatedAt').reverse().toArray()
    if (documents.length === 0) {
      const starter = createStarterDocument()
      await db.documents.put(starter)
      documents = [starter]
    }
    const active = documents.find((document) => document.id === preferredId) ?? documents[0]
    set({
      isReady: true,
      activeDocumentId: active.id,
      createdAt: active.createdAt,
      title: active.title,
      nodes: active.nodes,
      edges: active.edges,
      jobs: active.jobs ?? [],
      generationSettings: active.generationSettings ?? readStoredGenerationSettings(),
      viewport: active.viewport ?? defaultViewport,
      documents: documents.map(summarize),
      historyPast: [],
      historyFuture: [],
      interactionStart: null,
    })
  },

  openDocument: async (id) => {
    if (id === get().activeDocumentId) return
    await get().saveCurrent()
    const document = await db.documents.get(id)
    if (!document) return
    set({
      activeDocumentId: document.id,
      createdAt: document.createdAt,
      title: document.title,
      nodes: document.nodes,
      edges: document.edges,
      jobs: document.jobs ?? [],
      generationSettings: document.generationSettings ?? readStoredGenerationSettings(),
      viewport: document.viewport ?? defaultViewport,
      historyPast: [],
      historyFuture: [],
      interactionStart: null,
      lightboxAssetId: null,
    })
  },

  createDocument: async () => {
    await get().saveCurrent()
    const document = createStarterDocument('新画布')
    document.nodes = []
    await db.documents.put(document)
    const documents = await db.documents.orderBy('updatedAt').reverse().toArray()
    set({
      activeDocumentId: document.id,
      createdAt: document.createdAt,
      title: document.title,
      nodes: [],
      edges: [],
      jobs: [],
      generationSettings: get().generationSettings,
      viewport: defaultViewport,
      documents: documents.map(summarize),
      historyPast: [],
      historyFuture: [],
      interactionStart: null,
      lightboxAssetId: null,
    })
  },

  deleteDocument: async (id) => {
    const state = get()
    if (state.documents.length === 1) {
      const replacement = createStarterDocument('新画布')
      replacement.nodes = []
      await db.documents.put(replacement)
    }
    await db.documents.delete(id)
    const remaining = await db.documents.orderBy('updatedAt').reverse().toArray()
    const next = remaining[0]
    if (!next) return
    set({
      activeDocumentId: next.id,
      createdAt: next.createdAt,
      title: next.title,
      nodes: next.nodes,
      edges: next.edges,
      jobs: next.jobs ?? [],
      generationSettings: next.generationSettings ?? get().generationSettings,
      viewport: next.viewport ?? defaultViewport,
      documents: remaining.map(summarize),
      historyPast: [],
      historyFuture: [],
      interactionStart: null,
      lightboxAssetId: null,
    })
  },

  renameDocument: (title) => set({ title }),

  setGenerationSettings: (settings) => {
    set((state) => {
      const next = { ...state.generationSettings, ...settings }
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('framefield-generation-settings', JSON.stringify(next))
      }
      return { generationSettings: next }
    })
  },

  saveCurrent: async () => {
    const state = get()
    if (!state.isReady) return
    const document = documentFromState(state)
    if (!document) return
    await db.documents.put(document)
    set((current) => ({
      documents: current.documents
        .map((item) => (item.id === document.id ? summarize(document) : item))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    }))
  },

  onNodesChange: (changes) => {
    const shouldRecord = changes.some((change) => change.type === 'remove')
    set((state) => ({
      ...(shouldRecord ? withHistory(state) : {}),
      nodes: applyNodeChanges(changes, state.nodes),
    }))
  },

  onEdgesChange: (changes) => {
    const shouldRecord = changes.some((change) => change.type === 'remove')
    set((state) => ({
      ...(shouldRecord ? withHistory(state) : {}),
      edges: applyEdgeChanges(changes, state.edges),
    }))
  },

  onConnect: (connection) => {
    set((state) => ({
      ...withHistory(state),
      edges: addEdge(
        {
          ...connection,
          id: nanoid(),
          type: 'smoothstep',
          animated: false,
          style: { strokeWidth: 1.6 },
        },
        state.edges,
      ),
    }))
  },

  setViewport: (viewport) => set({ viewport }),

  addNode: (kind, options = {}) => {
    const id = nanoid()
    const state = get()
    const position = options.position ?? {
      x: 160 + (state.nodes.length % 5) * 44,
      y: 130 + (state.nodes.length % 4) * 48,
    }
    const node: CanvasNode = {
      id,
      type: kind === 'prompt' ? 'promptNode' : 'textNode',
      position,
      selected: true,
      style: kind === 'prompt' ? { width: 340, height: 230 } : { width: 280, height: 180 },
      data: {
        kind,
        title: options.title ?? (kind === 'prompt' ? '提示词' : '新笔记'),
        content: options.content ?? '',
      },
    }
    set((current) => ({
      ...withHistory(current),
      nodes: [...current.nodes.map((item) => ({ ...item, selected: false })), node],
    }))
    return id
  },

  addImageNode: (asset, position, sourceNodeId) => {
    const id = nanoid()
    const node: CanvasNode = {
      id,
      type: 'imageNode',
      position,
      selected: true,
      style: { width: 360, height: 320 },
      data: {
        kind: 'image',
        title: asset.fileName,
        assetId: asset.id,
        fileName: asset.fileName,
        mimeType: asset.mimeType,
      },
    }
    set((state) => ({
      ...withHistory(state),
      nodes: [...state.nodes.map((item) => ({ ...item, selected: false })), node],
      edges: sourceNodeId
        ? [
            ...state.edges,
            {
              id: nanoid(),
              source: sourceNodeId,
              target: id,
              type: 'smoothstep',
              style: { strokeWidth: 1.6 },
            },
          ]
        : state.edges,
    }))
    return id
  },

  updateNodeData: (id, patch) => {
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, ...patch } } : node,
      ),
    }))
  },

  deleteSelected: () => {
    set((state) => {
      const selected = new Set(state.nodes.filter((node) => node.selected).map((node) => node.id))
      if (selected.size === 0) return state
      let changed = true
      while (changed) {
        changed = false
        for (const node of state.nodes) {
          if (node.parentId && selected.has(node.parentId) && !selected.has(node.id)) {
            selected.add(node.id)
            changed = true
          }
        }
      }
      return {
        ...withHistory(state),
        nodes: state.nodes.filter((node) => !selected.has(node.id)),
        edges: state.edges.filter(
          (edge) => !selected.has(edge.source) && !selected.has(edge.target),
        ),
      }
    })
  },

  duplicateSelected: () => {
    set((state) => {
      const selected = state.nodes.filter((node) => node.selected)
      if (selected.length === 0) return state
      const idMap = new Map(selected.map((node) => [node.id, nanoid()]))
      const copies = selected.map((node) => ({
        ...structuredClone(node),
        id: idMap.get(node.id)!,
        parentId: node.parentId ? idMap.get(node.parentId) : undefined,
        position: { x: node.position.x + 36, y: node.position.y + 36 },
        selected: true,
      }))
      const copiedEdges = state.edges
        .filter((edge) => idMap.has(edge.source) && idMap.has(edge.target))
        .map((edge) => ({
          ...edge,
          id: nanoid(),
          source: idMap.get(edge.source)!,
          target: idMap.get(edge.target)!,
        }))
      return {
        ...withHistory(state),
        nodes: [...state.nodes.map((node) => ({ ...node, selected: false })), ...copies],
        edges: [...state.edges, ...copiedEdges],
      }
    })
  },

  copySelected: () => {
    const state = get()
    const selected = state.nodes.filter((node) => node.selected)
    if (selected.length === 0 || typeof window === 'undefined') return
    const selectedIds = new Set(selected.map((node) => node.id))
    window.localStorage.setItem(
      'framefield-clipboard',
      JSON.stringify({
        nodes: selected,
        edges: state.edges.filter((edge) => selectedIds.has(edge.source) && selectedIds.has(edge.target)),
      }),
    )
  },

  pasteClipboard: () => {
    if (typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem('framefield-clipboard')
      if (!raw) return
      const payload = JSON.parse(raw) as { nodes?: CanvasNode[]; edges?: CanvasEdge[] }
      const sourceNodes = Array.isArray(payload.nodes) ? payload.nodes : []
      if (sourceNodes.length === 0) return
      const idMap = new Map(sourceNodes.map((node) => [node.id, nanoid()]))
      const copies = sourceNodes.map((node) => ({
        ...structuredClone(node),
        id: idMap.get(node.id)!,
        parentId: node.parentId && idMap.has(node.parentId) ? idMap.get(node.parentId) : undefined,
        position: { x: node.position.x + 48, y: node.position.y + 48 },
        selected: true,
      }))
      const copiedEdges = (payload.edges ?? [])
        .filter((edge) => idMap.has(edge.source) && idMap.has(edge.target))
        .map((edge) => ({
          ...edge,
          id: nanoid(),
          source: idMap.get(edge.source)!,
          target: idMap.get(edge.target)!,
        }))
      set((state) => ({
        ...withHistory(state),
        nodes: [...state.nodes.map((node) => ({ ...node, selected: false })), ...copies],
        edges: [...state.edges, ...copiedEdges],
      }))
    } catch {
      window.localStorage.removeItem('framefield-clipboard')
    }
  },

  cutSelected: () => {
    get().copySelected()
    get().deleteSelected()
  },

  groupSelected: () => {
    set((state) => {
      const selected = state.nodes.filter((node) => node.selected && !node.parentId && node.data.kind !== 'group')
      if (selected.length < 2) return state
      const minX = Math.min(...selected.map((node) => node.position.x))
      const minY = Math.min(...selected.map((node) => node.position.y))
      const maxX = Math.max(...selected.map((node) => node.position.x + (node.measured?.width ?? (Number(node.style?.width) || 280))))
      const maxY = Math.max(...selected.map((node) => node.position.y + (node.measured?.height ?? (Number(node.style?.height) || 180))))
      const groupId = nanoid()
      const group: CanvasNode = {
        id: groupId,
        type: 'groupNode',
        position: { x: minX - 28, y: minY - 54 },
        selected: true,
        style: { width: maxX - minX + 56, height: maxY - minY + 82 },
        data: { kind: 'group', title: '节点组' },
      }
      const selectedIds = new Set(selected.map((node) => node.id))
      const children = state.nodes.map((node) =>
        selectedIds.has(node.id)
          ? {
              ...node,
              parentId: groupId,
              extent: 'parent' as const,
              position: { x: node.position.x - minX + 28, y: node.position.y - minY + 54 },
              selected: false,
            }
          : { ...node, selected: false },
      )
      return { ...withHistory(state), nodes: [group, ...children] }
    })
  },

  ungroupSelected: () => {
    set((state) => {
      const groups = state.nodes.filter((node) => node.selected && node.data.kind === 'group')
      if (groups.length === 0) return state
      const groupMap = new Map(groups.map((group) => [group.id, group]))
      const nodes = state.nodes
        .filter((node) => !groupMap.has(node.id))
        .map((node) => {
          const parent = node.parentId ? groupMap.get(node.parentId) : undefined
          if (!parent) return node
          return {
            ...node,
            parentId: undefined,
            extent: undefined,
            position: {
              x: parent.position.x + node.position.x,
              y: parent.position.y + node.position.y,
            },
            selected: true,
          }
        })
      return { ...withHistory(state), nodes }
    })
  },

  beginInteraction: () => {
    const state = get()
    if (!state.interactionStart) set({ interactionStart: takeSnapshot(state) })
  },

  endInteraction: () => {
    set((state) => {
      if (!state.interactionStart) return state
      const current = takeSnapshot(state)
      if (!snapshotChanged(state.interactionStart, current)) return { interactionStart: null }
      return {
        historyPast: [...state.historyPast.slice(-79), state.interactionStart],
        historyFuture: [],
        interactionStart: null,
      }
    })
  },

  undo: () => {
    set((state) => {
      const previous = state.historyPast.at(-1)
      if (!previous) return state
      return {
        nodes: structuredClone(previous.nodes),
        edges: structuredClone(previous.edges),
        historyPast: state.historyPast.slice(0, -1),
        historyFuture: [takeSnapshot(state), ...state.historyFuture.slice(0, 79)],
        interactionStart: null,
      }
    })
  },

  redo: () => {
    set((state) => {
      const next = state.historyFuture[0]
      if (!next) return state
      return {
        nodes: structuredClone(next.nodes),
        edges: structuredClone(next.edges),
        historyPast: [...state.historyPast.slice(-79), takeSnapshot(state)],
        historyFuture: state.historyFuture.slice(1),
        interactionStart: null,
      }
    })
  },

  startJob: (nodeId, prompt) => {
    const id = nanoid()
    const now = new Date().toISOString()
    const job: GenerationJob = {
      id,
      nodeId,
      prompt,
      status: 'running',
      createdAt: now,
      updatedAt: now,
    }
    set((state) => ({
      jobs: [job, ...state.jobs].slice(0, 30),
      nodes: state.nodes.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, generationStatus: 'running', generationError: undefined } }
          : node,
      ),
    }))
    return id
  },

  finishJob: (jobId, result) => {
    set((state) => {
      const job = state.jobs.find((item) => item.id === jobId)
      if (!job) return state
      const status = result.error ? 'failed' : 'success'
      return {
        jobs: state.jobs.map((item) =>
          item.id === jobId
            ? { ...item, ...result, status, updatedAt: new Date().toISOString() }
            : item,
        ),
        nodes: state.nodes.map((node) =>
          node.id === job.nodeId
            ? {
                ...node,
                data: {
                  ...node.data,
                  generationStatus: status,
                  generationError: result.error,
                },
              }
            : node,
        ),
      }
    })
  },

  runGeneration: async (nodeId) => {
    const node = get().nodes.find((item) => item.id === nodeId)
    const prompt = node?.data.content?.trim()
    if (!node || !prompt || node.data.generationStatus === 'running') return
    const jobId = get().startJob(nodeId, prompt)
    const controller = new AbortController()
    generationControllers.set(jobId, controller)
    const isCancelled = () => get().jobs.find((job) => job.id === jobId)?.status === 'cancelled'
    try {
      const generated = await generateImages(prompt, get().generationSettings, controller.signal)
      if (isCancelled()) return
      const source = get().nodes.find((item) => item.id === nodeId) ?? node
      const resultNodeIds: string[] = []
      for (const [index, result] of generated.entries()) {
        if (isCancelled()) return
        const asset = await storeAsset(result.blob, result.fileName)
        resultNodeIds.push(get().addImageNode(
          asset,
          {
            x: source.position.x + 420 + (index % 2) * 400,
            y: source.position.y + Math.floor(index / 2) * 360,
          },
          nodeId,
        ))
      }
      get().finishJob(jobId, { resultNodeIds, resultNodeId: resultNodeIds[0] })
    } catch (error) {
      if (isCancelled()) return
      get().finishJob(jobId, {
        error: error instanceof Error ? error.message : '生成失败，请稍后重试。',
      })
    } finally {
      generationControllers.delete(jobId)
    }
  },

  cancelGeneration: (jobId) => {
    generationControllers.get(jobId)?.abort()
    set((state) => {
      const job = state.jobs.find((item) => item.id === jobId)
      if (!job || job.status !== 'running') return state
      return {
        jobs: state.jobs.map((item) =>
          item.id === jobId ? { ...item, status: 'cancelled', updatedAt: new Date().toISOString() } : item,
        ),
        nodes: state.nodes.map((node) =>
          node.id === job.nodeId
            ? { ...node, data: { ...node.data, generationStatus: 'cancelled' } }
            : node,
        ),
      }
    })
  },

  retryGeneration: async (jobId) => {
    const job = get().jobs.find((item) => item.id === jobId)
    if (!job || (job.status !== 'failed' && job.status !== 'cancelled')) return
    await get().runGeneration(job.nodeId)
  },

  openLightbox: (assetId) => set({ lightboxAssetId: assetId }),
}))

export function getCurrentDocument(): CanvasDocument | null {
  return documentFromState(useCanvasStore.getState())
}
