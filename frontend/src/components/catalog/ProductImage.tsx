import { useState } from 'react'
import { Icon } from '@/components/ui/icon'

interface ProductImageProps {
  src: string | null | undefined
  alt: string
  iconSize?: number
  className?: string
}

export const ProductImage = ({ src, alt, iconSize = 48, className }: ProductImageProps) => {
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return (
      <div
        className={`w-full h-full bg-gradient-to-br from-surface-container-low to-surface-container flex items-center justify-center ${className ?? ''}`}
      >
        <Icon name="inventory_2" size={iconSize} className="text-outline-variant/30" />
      </div>
    )
  }

  return (
    <div
      className={`w-full h-full bg-surface-container-low flex items-center justify-center p-3 ${className ?? ''}`}
    >
      <img
        src={src}
        alt={alt}
        className="max-w-full max-h-full object-contain"
        loading="lazy"
        onError={() => setFailed(true)}
      />
    </div>
  )
}
