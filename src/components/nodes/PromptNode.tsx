import { ArrowRight, Sparkle } from '@phosphor-icons/react'
import { Handle, NodeResizer, Position, type NodeProps } from '@xyflow/react'
import type { CanvasNode } from '../../types'
import { useCanvasStore } from '../../store/canvasStore'

export function PromptNode({ id, data, selected }: NodeProps<CanvasNode>) {
  const updateNodeData = useCanvasStore((state) => state.updateNodeData)
  const beginInteraction = useCanvasStore((state) => state.beginInteraction)
  const endInteraction = useCanvasStore((state) => state.endInteraction)
  const runGeneration = useCanvasStore((state) => state.runGeneration)
  const isRunning = data.generationStatus === 'running'

  return (
    <article className={`canvas-node prompt-node ${selected ? 'is-selected' : ''}`}>
      <NodeResizer
        minWidth={290}
        minHeight={210}
        isVisible={selected}
        onResizeStart={beginInteraction}
        onResizeEnd={endInteraction}
      />
      <Handle type="target" position={Position.Left} />
      <header className="node-header">
        <Sparkle size={15} weight="fill" />
        <input
          className="node-title nodrag"
          aria-label="提示词标题"
          value={data.title}
          onFocus={beginInteraction}
          onBlur={endInteraction}
          onChange={(event) => updateNodeData(id, { title: event.target.value })}
        />
      </header>
      <textarea
        className="node-content nodrag nowheel"
        aria-label="图像提示词"
        placeholder="描述你想生成的画面..."
        value={data.content ?? ''}
        onFocus={beginInteraction}
        onBlur={endInteraction}
        onChange={(event) => updateNodeData(id, { content: event.target.value })}
      />
      <footer className="prompt-footer">
        <span className={`job-state ${data.generationStatus ?? 'idle'}`}>
          {isRunning ? '生成中' : data.generationStatus === 'failed' ? '需要处理' : '图像任务'}
        </span>
        <button
          type="button"
          className="node-action nodrag"
          disabled={isRunning || !data.content?.trim()}
          onClick={() => void runGeneration(id)}
        >
          {isRunning ? '处理中' : '生成'}
          <ArrowRight size={14} weight="bold" />
        </button>
      </footer>
      {data.generationError ? <p className="node-error">{data.generationError}</p> : null}
      <Handle type="source" position={Position.Right} />
    </article>
  )
}
