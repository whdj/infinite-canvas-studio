import { X } from '@phosphor-icons/react'
import { useEffect } from 'react'
import { useAssetUrl } from '../hooks/useAssetUrl'
import { useCanvasStore } from '../store/canvasStore'

export function Lightbox() {
  const assetId = useCanvasStore((state) => state.lightboxAssetId)
  const openLightbox = useCanvasStore((state) => state.openLightbox)
  const { url } = useAssetUrl(assetId ?? undefined)

  useEffect(() => {
    if (!assetId) return
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') openLightbox(null)
    }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [assetId, openLightbox])

  if (!assetId) return null

  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label="图片预览" onClick={() => openLightbox(null)}>
      <button type="button" aria-label="关闭预览" onClick={() => openLightbox(null)}>
        <X size={20} weight="bold" />
      </button>
      {url ? <img src={url} alt="放大的画布图片" onClick={(event) => event.stopPropagation()} /> : null}
    </div>
  )
}
