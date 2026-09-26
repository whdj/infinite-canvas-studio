import { useEffect, useState } from 'react'
import { db } from '../lib/db'

export function useAssetUrl(assetId?: string, remoteUrl?: string): {
  url: string | null
  loading: boolean
  error: string | null
} {
  const [state, setState] = useState<{ url: string | null; loading: boolean; error: string | null }>({
    url: remoteUrl ?? null,
    loading: Boolean(assetId),
    error: null,
  })

  useEffect(() => {
    let objectUrl: string | null = null
    let cancelled = false

    if (!assetId) {
      setState({ url: remoteUrl ?? null, loading: false, error: null })
      return
    }

    setState((current) => ({ ...current, loading: true, error: null }))
    void db.assets
      .get(assetId)
      .then((asset) => {
        if (cancelled) return
        if (!asset) {
          setState({ url: null, loading: false, error: '本地图片已丢失' })
          return
        }
        objectUrl = URL.createObjectURL(asset.blob)
        setState({ url: objectUrl, loading: false, error: null })
      })
      .catch(() => {
        if (!cancelled) setState({ url: null, loading: false, error: '图片读取失败' })
      })

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [assetId, remoteUrl])

  return state
}
