import { useMemo } from 'react'
import { CheckCircle, Clock, Info, WarningCircle } from '@phosphor-icons/react'
import { useCanvasStore } from '../store/canvasStore'

export function Inspector() {
  const nodes = useCanvasStore((state) => state.nodes)
  const jobs = useCanvasStore((state) => state.jobs)
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
                  <span>{job.error ?? jobLabel(job.status)}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="connector-note">
        <strong>AI 连接器</strong>
        <span>{import.meta.env.VITE_IMAGE_API_URL ? '已连接自定义图像端点' : '未配置。可先使用画布和素材功能。'}</span>
      </section>
    </aside>
  )
}

function JobIcon({ status }: { status: string }) {
  if (status === 'success') return <CheckCircle size={17} weight="fill" className="success" />
  if (status === 'failed') return <WarningCircle size={17} weight="fill" className="failed" />
  return <Clock size={17} className="running" />
}

function jobLabel(status: string): string {
  if (status === 'success') return '图片已添加到画布'
  if (status === 'running') return '正在等待生成结果'
  return '等待处理'
}

function kindLabel(kind: string): string {
  return { text: '笔记节点', prompt: '提示词节点', image: '图片节点', group: '节点组' }[kind] ?? '节点'
}
