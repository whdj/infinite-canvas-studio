import { ImageSquare } from '@phosphor-icons/react'
import { Handle, NodeResizer, Position, type NodeProps } from '@xyflow/react'
import { useAssetUrl } from '../../hooks/useAssetUrl'
import { useCanvasStore } from '../../store/canvasStore'
import type { CanvasNode } from '../../types'

export function ImageNode({ data, selected }: NodeProps<CanvasNode>) {
  const { url, loading, error } = useAssetUrl(data.assetId, data.remoteUrl)
  const openLightbox = useCanvasStore((state) => state.openLightbox)

  return (
    <figure
      className={`canvas-node image-node ${selected ? 'is-selected' : ''}`}
      onDoubleClick={() => data.assetId && openLightbox(data.assetId)}
    >
      <NodeResizer minWidth={220} minHeight={180} isVisible={selected} keepAspectRatio={false} />
      <Handle type="target" position={Position.Left} />
      <div className="image-stage">
        {url ? <img src={url} alt={data.title || '画布图片'} draggable={false} /> : null}
        {loading ? <div className="image-skeleton" aria-label="正在读取图片" /> : null}
        {error ? (
          <div className="image-error">
            <ImageSquare size={30} />
            <span>{error}</span>
          </div>
        ) : null}
      </div>
      <figcaption>
        <ImageSquare size={14} />
        <span>{data.title}</span>
        <small>双击预览</small>
      </figcaption>
      <Handle type="source" position={Position.Right} />
    </figure>
  )
}
