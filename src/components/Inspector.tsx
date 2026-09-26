import { useMemo, useState } from 'react'
import { ArrowClockwise, CheckCircle, Clock, Info, Plug, Stop, WarningCircle } from '@phosphor-icons/react'
import { useCanvasStore } from '../store/canvasStore'

export function Inspector() {
  const nodes = useCanvasStore((state) => state.nodes)
  const jobs = useCanvasStore((state) => state.jobs)
  const cancelGeneration = useCanvasStore((state) => state.cancelGeneration)
  const retryGeneration = useCanvasStore((state) => state.retryGeneration)
  const generationSettings = useCanvasStore((state) => state.generationSettings)
  const setGenerationSettings = useCanvasStore((state) => state.setGenerationSettings)
  const selected = useMemo(() => nodes.filter((node) => node.selected), [nodes])
  const item = selected.length === 1 ? selected[0] : null

  return (
    <aside className="inspector" aria-label="检查器">
      <section className="inspector-section">
        <h2>检查器</h2>
        {item ? (
          <div className="selection-details">
            <div className="selection-kind">{kindLabel(item.data.kind)}</div>
            <strong>{item.data.title || '未命名节点'}</strong>
            <dl>
              <div><dt>X</dt><dd>{Math.round(item.position.x)}</dd></div>
              <div><dt>Y</dt><dd>{Math.round(item.position.y)}</dd></div>
              <div><dt>宽</dt><dd>{Math.round(item.measured?.width ?? (Number(item.style?.width) || 0))}</dd></div>
              <div><dt>高</dt><dd>{Math.round(item.measured?.height ?? (Number(item.style?.height) || 0))}</dd></div>
            </dl>
            <p className="inspector-hint"><Info size={15} />按住 Shift 可多选节点，拖动连接点可建立关系。</p>
          </div>
        ) : (
          <div className="inspector-empty">
            <Info size={22} />
            <strong>{selected.length > 1 ? `已选择 ${selected.length} 个节点` : '尚未选择节点'}</strong>
            <span>选择一个节点后查看位置、尺寸和任务状态。</span>
          </div>
        )}
      </section>

      <section className="inspector-section job-section">
        <div className="section-heading">
          <h2>生成任务</h2>
          <span>{jobs.length}</span>
        </div>
        {jobs.length === 0 ? (
          <div className="job-empty">在提示词节点中点击“生成”，任务会显示在这里。</div>
        ) : (
          <div className="job-list">
            {jobs.slice(0, 6).map((job) => (
              <article className="job-row" key={job.id}>
                <JobIcon status={job.status} />
                <div>
                  <strong>{job.prompt}</strong>
                  <span>{job.error ?? jobLabel(job.status, job.resultNodeIds?.length)}</span>
                </div>
                {job.status === 'running' ? (
                  <button type="button" className="job-control" aria-label="取消生成" title="取消生成" onClick={() => cancelGeneration(job.id)}><Stop size={13} weight="fill" /></button>
                ) : job.status === 'failed' || job.status === 'cancelled' ? (
                  <button type="button" className="job-control" aria-label="重试生成" title="重试生成" onClick={() => void retryGeneration(job.id)}><ArrowClockwise size={13} /></button>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>

      <GenerationSettingsPanel
        settings={generationSettings}
        onChange={setGenerationSettings}
      />

      <section className="connector-note">
        <strong><Plug size={14} /> AI 连接器</strong>
        <span>{import.meta.env.VITE_IMAGE_API_URL ? '已连接自定义图像端点' : '未配置。可先使用画布和素材功能。'}</span>
      </section>
    </aside>
  )
}

interface GenerationSettingsPanelProps {
  settings: { model: string; size: string; quality: string; count: number }
  onChange: (settings: Partial<GenerationSettingsPanelProps['settings']>) => void
}

function GenerationSettingsPanel({ settings, onChange }: GenerationSettingsPanelProps) {
  const [health, setHealth] = useState<'idle' | 'checking' | 'online' | 'offline'>('idle')
  const endpoint = import.meta.env.VITE_IMAGE_API_URL?.trim() || ''

  const checkConnection = async () => {
    if (!endpoint) {
      setHealth('offline')
      return
    }
    setHealth('checking')
    const healthUrl = endpoint.replace(/\/generate\/?$/, '/health')
    try {
      const response = await fetch(healthUrl)
      setHealth(response.ok ? 'online' : 'offline')
    } catch {
      setHealth('offline')
    }
  }

  return (
    <section className="inspector-section generation-settings">
      <div className="section-heading">
        <h2>生成设置</h2>
        <button type="button" className="check-connection" onClick={() => void checkConnection()}>
          {health === 'checking' ? '检测中' : health === 'online' ? '已连接' : '检测'}
        </button>
      </div>
      <label>
        <span>模型 ID</span>
        <input
          value={settings.model}
          placeholder="使用服务端默认模型"
          onChange={(event) => onChange({ model: event.target.value })}
        />
      </label>
      <label>
        <span>画布尺寸</span>
        <select value={settings.size} onChange={(event) => onChange({ size: event.target.value })}>
          <option value="1024x1024">1024 x 1024</option>
          <option value="1536x1024">1536 x 1024</option>
          <option value="1024x1536">1024 x 1536</option>
        </select>
      </label>
      <label>
        <span>质量</span>
        <select value={settings.quality} onChange={(event) => onChange({ quality: event.target.value })}>
          <option value="standard">标准</option>
          <option value="hd">高清</option>
        </select>
      </label>
      <label>
        <span>生成数量</span>
        <select value={settings.count} onChange={(event) => onChange({ count: Number(event.target.value) })}>
          <option value={1}>1 张</option>
          <option value={2}>2 张</option>
          <option value={3}>3 张</option>
          <option value={4}>4 张</option>
        </select>
      </label>
      <small className={`health-status ${health}`}>
        {health === 'online' ? '代理服务可用' : health === 'offline' ? '无法连接代理' : '设置保存在当前浏览器'}
      </small>
    </section>
  )
}

function JobIcon({ status }: { status: string }) {
  if (status === 'success') return <CheckCircle size={17} weight="fill" className="success" />
  if (status === 'failed') return <WarningCircle size={17} weight="fill" className="failed" />
  return <Clock size={17} className="running" />
}

function jobLabel(status: string, resultCount?: number): string {
  if (status === 'success') return `${resultCount ?? 1} 张图片已添加到画布`
  if (status === 'running') return '正在等待生成结果'
  return '等待处理'
}

function kindLabel(kind: string): string {
  return { text: '笔记节点', prompt: '提示词节点', image: '图片节点', group: '节点组' }[kind] ?? '节点'
}
