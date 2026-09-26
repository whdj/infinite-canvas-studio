import {
  ArrowClockwise,
  ArrowCounterClockwise,
  DownloadSimple,
  Moon,
  Sun,
  UploadSimple,
} from '@phosphor-icons/react'
import { useCanvasStore } from '../store/canvasStore'

interface TopbarProps {
  saveStatus: 'saved' | 'saving'
  theme: 'light' | 'dark'
  onThemeToggle: () => void
  onExport: () => void
  onImport: () => void
}

export function Topbar({ saveStatus, theme, onThemeToggle, onExport, onImport }: TopbarProps) {
  const title = useCanvasStore((state) => state.title)
  const renameDocument = useCanvasStore((state) => state.renameDocument)
  const undo = useCanvasStore((state) => state.undo)
  const redo = useCanvasStore((state) => state.redo)
  const canUndo = useCanvasStore((state) => state.historyPast.length > 0)
  const canRedo = useCanvasStore((state) => state.historyFuture.length > 0)

  return (
    <header className="topbar">
      <div className="document-heading">
        <input
          value={title}
          onChange={(event) => renameDocument(event.target.value)}
          aria-label="画布名称"
        />
        <span className={`save-state ${saveStatus}`}>{saveStatus === 'saving' ? '保存中' : '已保存'}</span>
      </div>

      <div className="topbar-actions">
        <div className="button-pair" aria-label="历史记录">
          <IconButton label="撤销" disabled={!canUndo} onClick={undo}>
            <ArrowCounterClockwise size={17} />
          </IconButton>
          <IconButton label="重做" disabled={!canRedo} onClick={redo}>
            <ArrowClockwise size={17} />
          </IconButton>
        </div>
        <span className="topbar-divider" />
        <IconButton label="导入项目" onClick={onImport}>
          <UploadSimple size={17} />
        </IconButton>
        <IconButton label="导出项目" onClick={onExport}>
          <DownloadSimple size={17} />
        </IconButton>
        <IconButton label={theme === 'dark' ? '切换到浅色' : '切换到深色'} onClick={onThemeToggle}>
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </IconButton>
      </div>
    </header>
  )
}

interface IconButtonProps {
  label: string
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}

function IconButton({ label, disabled, onClick, children }: IconButtonProps) {
  return (
    <button type="button" className="icon-button" aria-label={label} title={label} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  )
}
