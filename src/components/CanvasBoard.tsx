import { useCallback, useEffect, useRef } from 'react'
import type { MouseEvent } from 'react'
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  SelectionMode,
  useReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { storeAsset } from '../lib/db'
import { useCanvasStore } from '../store/canvasStore'
import { CanvasToolbar } from './CanvasToolbar'
import { GroupNode } from './nodes/GroupNode'
import { ImageNode } from './nodes/ImageNode'
import { PromptNode } from './nodes/PromptNode'
import { TextNode } from './nodes/TextNode'

const nodeTypes = {
  textNode: TextNode,
  promptNode: PromptNode,
  imageNode: ImageNode,
  groupNode: GroupNode,
}

export function CanvasBoard() {
  return (
    <ReactFlowProvider>
      <CanvasBoardInner />
    </ReactFlowProvider>
  )
}

function CanvasBoardInner() {
  const nodes = useCanvasStore((state) => state.nodes)
  const edges = useCanvasStore((state) => state.edges)
  const viewport = useCanvasStore((state) => state.viewport)
  const activeDocumentId = useCanvasStore((state) => state.activeDocumentId)
  const onNodesChange = useCanvasStore((state) => state.onNodesChange)
  const onEdgesChange = useCanvasStore((state) => state.onEdgesChange)
  const onConnect = useCanvasStore((state) => state.onConnect)
  const setViewport = useCanvasStore((state) => state.setViewport)
  const addNode = useCanvasStore((state) => state.addNode)
  const addImageNode = useCanvasStore((state) => state.addImageNode)
  const beginInteraction = useCanvasStore((state) => state.beginInteraction)
  const endInteraction = useCanvasStore((state) => state.endInteraction)
  const deleteSelected = useCanvasStore((state) => state.deleteSelected)
  const duplicateSelected = useCanvasStore((state) => state.duplicateSelected)
  const undo = useCanvasStore((state) => state.undo)
  const redo = useCanvasStore((state) => state.redo)
  const { screenToFlowPosition, fitView } = useReactFlow()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const addFiles = useCallback(
    async (files: File[], origin?: { x: number; y: number }) => {
      const images = files.filter((file) => file.type.startsWith('image/'))
      for (const [index, file] of images.entries()) {
        const asset = await storeAsset(file, file.name)
        addImageNode(asset, {
          x: (origin?.x ?? 160) + index * 42,
          y: (origin?.y ?? 160) + index * 42,
        })
      }
    },
    [addImageNode],
  )

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const isEditing = target?.matches('input, textarea, [contenteditable="true"]')
      const command = event.metaKey || event.ctrlKey
      if (isEditing) return
      if (command && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        event.shiftKey ? redo() : undo()
      } else if (command && event.key.toLowerCase() === 'd') {
        event.preventDefault()
        duplicateSelected()
      } else if (event.key === 'Backspace' || event.key === 'Delete') {
        event.preventDefault()
        deleteSelected()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [deleteSelected, duplicateSelected, redo, undo])

  return (
    <main
      className="canvas-area"
      onDragOver={(event) => {
        event.preventDefault()
        event.dataTransfer.dropEffect = 'copy'
      }}
      onDrop={(event) => {
        event.preventDefault()
        const position = screenToFlowPosition({ x: event.clientX, y: event.clientY })
        void addFiles(Array.from(event.dataTransfer.files), position)
      }}
    >
      <input
        ref={fileInputRef}
        className="visually-hidden"
        type="file"
        accept="image/*"
        multiple
        onChange={(event) => {
          void addFiles(Array.from(event.target.files ?? []))
          event.target.value = ''
        }}
      />

      <ReactFlow
        key={activeDocumentId}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        defaultViewport={viewport}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStart={beginInteraction}
        onNodeDragStop={endInteraction}
        onMoveEnd={(_, nextViewport) => setViewport(nextViewport)}
        onDoubleClick={(event: MouseEvent) => {
          const position = screenToFlowPosition({ x: event.clientX, y: event.clientY })
          addNode('text', { position })
        }}
        selectionMode={SelectionMode.Partial}
        panOnScroll
        selectionOnDrag
        panOnDrag={[1, 2]}
        minZoom={0.12}
        maxZoom={2.8}
        deleteKeyCode={null}
        snapToGrid
        snapGrid={[8, 8]}
        defaultEdgeOptions={{ type: 'smoothstep' }}
        fitViewOptions={{ padding: 0.22, duration: 420 }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1.2} color="var(--canvas-dot)" />
        <MiniMap
          pannable
          zoomable
          nodeStrokeWidth={3}
          nodeColor={(node) => minimapColor(node.data?.kind as string)}
          maskColor="var(--minimap-mask)"
        />
        <Controls showInteractive={false} position="bottom-center" />
      </ReactFlow>

      <CanvasToolbar
        onUpload={() => fileInputRef.current?.click()}
        onFitView={() => void fitView({ padding: 0.22, duration: 420 })}
      />

      {nodes.length === 0 ? (
        <div className="canvas-empty" aria-live="polite">
          <strong>这张画布还是空的</strong>
          <span>双击空白处写笔记，或从工具栏添加提示词和图片。</span>
          <button type="button" onClick={() => addNode('prompt')}>添加第一条提示词</button>
        </div>
      ) : null}
    </main>
  )
}

function minimapColor(kind: string): string {
  if (kind === 'prompt') return '#d97745'
  if (kind === 'image') return '#738071'
  if (kind === 'group') return '#a7a39a'
  return '#8a8d91'
}
