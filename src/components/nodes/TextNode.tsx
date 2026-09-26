import { NotePencil } from '@phosphor-icons/react'
import { Handle, NodeResizer, Position, type NodeProps } from '@xyflow/react'
import type { CanvasNode } from '../../types'
import { useCanvasStore } from '../../store/canvasStore'

export function TextNode({ id, data, selected }: NodeProps<CanvasNode>) {
  const updateNodeData = useCanvasStore((state) => state.updateNodeData)
  const beginInteraction = useCanvasStore((state) => state.beginInteraction)
  const endInteraction = useCanvasStore((state) => state.endInteraction)

  return (
    <article className={`canvas-node note-node ${selected ? 'is-selected' : ''}`}>
      <NodeResizer
        minWidth={220}
        minHeight={140}
        isVisible={selected}
        onResizeStart={beginInteraction}
        onResizeEnd={endInteraction}
      />
      <Handle type="target" position={Position.Left} />
      <header className="node-header">
        <NotePencil size={15} weight="bold" />
        <input
          className="node-title nodrag"
          aria-label="笔记标题"
          value={data.title}
          onFocus={beginInteraction}
          onBlur={endInteraction}
          onChange={(event) => updateNodeData(id, { title: event.target.value })}
        />
      </header>
      <textarea
        className="node-content nodrag nowheel"
        aria-label="笔记内容"
        placeholder="写下一个想法..."
        value={data.content ?? ''}
        onFocus={beginInteraction}
        onBlur={endInteraction}
        onChange={(event) => updateNodeData(id, { content: event.target.value })}
      />
      <Handle type="source" position={Position.Right} />
    </article>
  )
}
