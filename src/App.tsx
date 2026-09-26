import { useEffect, useRef, useState } from 'react'
import { CanvasBoard } from './components/CanvasBoard'
import { Inspector } from './components/Inspector'
import { Lightbox } from './components/Lightbox'
import { ProjectSidebar } from './components/ProjectSidebar'
import { Topbar } from './components/Topbar'
import { downloadProject, importProject } from './lib/projectFiles'
import { getCurrentDocument, useCanvasStore } from './store/canvasStore'

export default function App() {
  const loadWorkspace = useCanvasStore((state) => state.loadWorkspace)
  const saveCurrent = useCanvasStore((state) => state.saveCurrent)
  const openDocument = useCanvasStore((state) => state.openDocument)
  const isReady = useCanvasStore((state) => state.isReady)
  const activeDocumentId = useCanvasStore((state) => state.activeDocumentId)
  const nodes = useCanvasStore((state) => state.nodes)
  const edges = useCanvasStore((state) => state.edges)
  const jobs = useCanvasStore((state) => state.jobs)
  const title = useCanvasStore((state) => state.title)
  const viewport = useCanvasStore((state) => state.viewport)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved')
  const [notice, setNotice] = useState<string | null>(null)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => initialTheme())
  const importInputRef = useRef<HTMLInputElement>(null)
  const loadStartedRef = useRef(false)

  useEffect(() => {
    if (loadStartedRef.current) return
    loadStartedRef.current = true
    void loadWorkspace()
  }, [loadWorkspace])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem('framefield-theme', theme)
  }, [theme])

  useEffect(() => {
    if (!isReady || !activeDocumentId) return
    setSaveStatus('saving')
    const timer = window.setTimeout(() => {
      void saveCurrent().then(() => setSaveStatus('saved'))
    }, 650)
    return () => window.clearTimeout(timer)
  }, [activeDocumentId, edges, isReady, jobs, nodes, saveCurrent, title, viewport])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(null), 3600)
    return () => window.clearTimeout(timer)
  }, [notice])

  const handleExport = async () => {
    await saveCurrent()
    const document = getCurrentDocument()
    if (!document) return
    try {
      await downloadProject(document)
      setNotice('项目文件已导出。')
    } catch {
      setNotice('导出失败，请重试。')
    }
  }

  const handleImport = async (file: File) => {
    try {
      const document = await importProject(file)
      await loadWorkspace(document.id)
      await openDocument(document.id)
      setNotice('项目已导入，并作为新画布打开。')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '导入失败。')
    }
  }

  if (!isReady) {
    return (
      <div className="app-loading">
        <div className="loading-mark" />
        <strong>正在打开画布</strong>
        <span>读取本地项目和素材...</span>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <input
        ref={importInputRef}
        className="visually-hidden"
        type="file"
        accept=".json,.framefield.json,application/json"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) void handleImport(file)
          event.target.value = ''
        }}
      />
      <ProjectSidebar />
      <section className="workspace">
        <Topbar
          saveStatus={saveStatus}
          theme={theme}
          onThemeToggle={() => setTheme((value) => (value === 'dark' ? 'light' : 'dark'))}
          onExport={() => void handleExport()}
          onImport={() => importInputRef.current?.click()}
        />
        <CanvasBoard />
      </section>
      <Inspector />
      <Lightbox />
      {notice ? <div className="notice" role="status">{notice}</div> : null}
    </div>
  )
}

function initialTheme(): 'light' | 'dark' {
  const stored = window.localStorage.getItem('framefield-theme')
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}
