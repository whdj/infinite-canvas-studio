import { useMemo } from 'react'
import {
  Copy,
  FrameCorners,
  ImageSquare,
  NotePencil,
  SelectionAll,
  Sparkle,
  Trash,
} from '@phosphor-icons/react'
import { useCanvasStore } from '../store/canvasStore'

interface CanvasToolbarProps {
  onUpload: () => void
  onFitView: () => void
}

export function CanvasToolbar({ onUpload, onFitView }: CanvasToolbarProps) {
  const addNode = useCanvasStore((state) => state.addNode)
  const deleteSelected = useCanvasStore((state) => state.deleteSelected)
  const duplicateSelected = useCanvasStore((state) => state.duplicateSelected)
  const groupSelected = useCanvasStore((state) => state.groupSelected)
  const ungroupSelected = useCanvasStore((state) => state.ungroupSelected)
  const nodes = useCanvasStore((state) => state.nodes)
  const selected = useMemo(() => nodes.filter((node) => node.selected), [nodes])
  const selectedGroup = selected.some((node) => node.data.kind === 'group')

  return (
    <div className="canvas-toolbar" aria-label="画布工具栏">
      <ToolButton label="添加笔记" onClick={() => addNode('text')}>
        <NotePencil size={18} />
      </ToolButton>
      <ToolButton label="添加提示词" onClick={() => addNode('prompt')}>
        <Sparkle size={18} weight="fill" />
      </ToolButton>
      <ToolButton label="上传图片" onClick={onUpload}>
        <ImageSquare size={18} />
      </ToolButton>
      <span className="tool-divider" />
      <ToolButton label="适应内容" onClick={onFitView}>
        <FrameCorners size={18} />
      </ToolButton>
      <ToolButton label="复制所选" disabled={selected.length === 0} onClick={duplicateSelected}>
        <Copy size={18} />
      </ToolButton>
      <ToolButton
        label={selectedGroup ? '取消分组' : '组合所选'}
        disabled={selectedGroup ? false : selected.length < 2}
        onClick={selectedGroup ? ungroupSelected : groupSelected}
      >
        <SelectionAll size={18} />
      </ToolButton>
      <ToolButton label="删除所选" disabled={selected.length === 0} danger onClick={deleteSelected}>
        <Trash size={18} />
      </ToolButton>
    </div>
  )
}

interface ToolButtonProps {
  label: string
  disabled?: boolean
  danger?: boolean
  onClick: () => void
  children: React.ReactNode
}

function ToolButton({ label, disabled, danger, onClick, children }: ToolButtonProps) {
  return (
    <button
      type="button"
      className={`tool-button ${danger ? 'is-danger' : ''}`}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
