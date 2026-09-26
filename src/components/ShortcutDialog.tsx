import { X } from '@phosphor-icons/react'

interface ShortcutDialogProps {
  onClose: () => void
}

export function ShortcutDialog({ onClose }: ShortcutDialogProps) {
  return (
    <div className="shortcut-backdrop" role="presentation" onClick={onClose}>
      <section className="shortcut-dialog" role="dialog" aria-modal="true" aria-labelledby="shortcut-title" onClick={(event) => event.stopPropagation()}>
        <header>
          <div>
            <span>WORKSPACE SHORTCUTS</span>
            <h2 id="shortcut-title">快捷键</h2>
          </div>
          <button type="button" aria-label="关闭快捷键" onClick={onClose}><X size={18} /></button>
        </header>
        <div className="shortcut-list">
          <Shortcut keys="双击画布" label="添加笔记" />
          <Shortcut keys="⌘ / Ctrl + C" label="复制所选节点" />
          <Shortcut keys="⌘ / Ctrl + V" label="粘贴节点" />
          <Shortcut keys="⌘ / Ctrl + X" label="剪切所选节点" />
          <Shortcut keys="⌘ / Ctrl + D" label="复制所选节点" />
          <Shortcut keys="⌘ / Ctrl + Z" label="撤销" />
          <Shortcut keys="⌘ / Ctrl + Shift + Z" label="重做" />
          <Shortcut keys="Delete / Backspace" label="删除所选节点" />
          <Shortcut keys="Esc" label="关闭弹窗" />
        </div>
      </section>
    </div>
  )
}

function Shortcut({ keys, label }: { keys: string; label: string }) {
  return <div className="shortcut-row"><kbd>{keys}</kbd><span>{label}</span></div>
}
