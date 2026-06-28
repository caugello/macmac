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
        'inline-flex items-center justify-center font-display font-extrabold leading-none',
        size === 'sm' ? 'w-7 h-7 text-sm rounded-[10px]' : 'w-10 h-10 text-xl rounded-xl',
        scoreStyles[key],
        className
      )}
    >
      {score.toUpperCase()}
    </span>
  )
}
