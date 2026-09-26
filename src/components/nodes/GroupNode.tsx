import { SelectionAll } from '@phosphor-icons/react'
import { NodeResizer, type NodeProps } from '@xyflow/react'
import { useCanvasStore } from '../../store/canvasStore'
import type { CanvasNode } from '../../types'

export function GroupNode({ id, data, selected }: NodeProps<CanvasNode>) {
  const updateNodeData = useCanvasStore((state) => state.updateNodeData)
  const beginInteraction = useCanvasStore((state) => state.beginInteraction)
  const endInteraction = useCanvasStore((state) => state.endInteraction)

  return (
    <section className={`group-node ${selected ? 'is-selected' : ''}`}>
      <NodeResizer
        minWidth={360}
        minHeight={240}
        isVisible={selected}
        onResizeStart={beginInteraction}
        onResizeEnd={endInteraction}
      />
      <div className="group-label">
        <SelectionAll size={15} weight="bold" />
        <input
          aria-label="节点组名称"
          className="nodrag"
          value={data.title}
          onFocus={beginInteraction}
          onBlur={endInteraction}
          onChange={(event) => updateNodeData(id, { title: event.target.value })}
        />
      </div>
    </section>
  )
}
