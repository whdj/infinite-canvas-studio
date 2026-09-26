import { Plus, SquaresFour, Trash } from '@phosphor-icons/react'
import { useCanvasStore } from '../store/canvasStore'

export function ProjectSidebar() {
  const documents = useCanvasStore((state) => state.documents)
  const activeDocumentId = useCanvasStore((state) => state.activeDocumentId)
  const openDocument = useCanvasStore((state) => state.openDocument)
  const createDocument = useCanvasStore((state) => state.createDocument)
  const deleteDocument = useCanvasStore((state) => state.deleteDocument)

  const handleDelete = (id: string, title: string) => {
    if (!window.confirm(`删除“${title}”？本操作无法撤销。`)) return
    void deleteDocument(id)
  }

  return (
    <aside className="project-sidebar" aria-label="画布项目">
      <div className="brand-lockup">
        <div className="brand-mark"><SquaresFour size={19} weight="fill" /></div>
        <div>
          <strong>Framefield</strong>
          <span>本地创作空间</span>
        </div>
      </div>

      <button type="button" className="new-board-button" onClick={() => void createDocument()}>
        <Plus size={16} weight="bold" />
        新建画布
      </button>

      <div className="sidebar-section-title">我的画布</div>
      <nav className="document-list">
        {documents.map((document) => (
          <div
            className={`document-row ${activeDocumentId === document.id ? 'is-active' : ''}`}
            key={document.id}
          >
            <button type="button" onClick={() => void openDocument(document.id)}>
              <span>{document.title}</span>
              <time dateTime={document.updatedAt}>{formatDate(document.updatedAt)}</time>
            </button>
            <button
              type="button"
              className="document-delete"
              aria-label={`删除 ${document.title}`}
              onClick={() => handleDelete(document.id, document.title)}
            >
              <Trash size={14} />
            </button>
          </div>
        ))}
      </nav>

      <div className="local-note">
        <strong>数据保存在此设备</strong>
        <span>使用导出功能备份或迁移完整项目。</span>
      </div>
    </aside>
  )
}

function formatDate(value: string): string {
  const date = new Date(value)
  const today = new Date()
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
}
