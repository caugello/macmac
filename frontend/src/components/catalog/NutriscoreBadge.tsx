import { cn } from '@/lib/utils'

const scoreStyles: Record<string, string> = {
  a: 'bg-nutri-a text-white',
  b: 'bg-nutri-b text-white',
  c: 'bg-nutri-c text-black',
  d: 'bg-nutri-d text-white',
  e: 'bg-nutri-e text-white',
}

interface NutriscoreBadgeProps {
  score: string
  size?: 'sm' | 'lg'
  className?: string
}

export const NutriscoreBadge = ({ score, size = 'sm', className }: NutriscoreBadgeProps) => {
  const key = score.toLowerCase()
  return (
    <span
      className={cn(
        'flex items-center justify-center font-bold rounded-lg',
        size === 'sm' ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-lg',
        scoreStyles[key],
        className
      )}
    >
      {score.toUpperCase()}
    </span>
  )
}
