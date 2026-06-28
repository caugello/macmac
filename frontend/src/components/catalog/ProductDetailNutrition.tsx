import { Card } from '@/components/ui/card'
import type { NutritionData } from '@/lib/types'

interface ProductDetailNutritionProps {
  nutrition: NutritionData
}

interface NutrientRow {
  label: string
  value: number | null | undefined
  unit: string
  daily: number
  bar: string
}

/**
 * Pantry Fresh nutrition panel: a 2x2 bento-tile grid (per 100g) where each
 * nutrient shows a large display number and a daily-value progress bar.
 */
export const ProductDetailNutrition = ({ nutrition }: ProductDetailNutritionProps) => {
  const rows: NutrientRow[] = [
    { label: 'Energy', value: nutrition.energy_kcal, unit: 'kcal', daily: 2000, bar: 'bg-lime' },
    { label: 'Fat', value: nutrition.fat_g, unit: 'g', daily: 70, bar: 'bg-coral' },
    { label: 'Carbs', value: nutrition.carbs_g, unit: 'g', daily: 260, bar: 'bg-yellow' },
    { label: 'Protein', value: nutrition.protein_g, unit: 'g', daily: 50, bar: 'bg-soft-purple' },
  ]

  const present = rows.filter((r) => r.value != null)
  if (present.length === 0) return null

  return (
    <section>
      <h2 className="text-headline-md font-display font-bold text-ink mb-4">
        Nutritional Values (100g)
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {present.map((r) => {
          const pct = Math.min(Math.round(((r.value ?? 0) / r.daily) * 100), 100)
          return (
            <Card key={r.label} tone="white" className="p-4">
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-label-md font-semibold text-muted-foreground uppercase tracking-wider">
                  {r.label}
                </span>
                <span className="text-caption text-muted-foreground">{pct}% DV</span>
              </div>
              <p className="text-headline-md font-display font-bold text-ink mb-3">
                {r.value}
                <span className="text-body-md font-body font-normal text-muted-foreground ml-1">
                  {r.unit}
                </span>
              </p>
              <div className="h-2 bg-cream rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${r.bar} transition-all duration-700 ease-out`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </Card>
          )
        })}
      </div>
      {nutrition.serving_size && (
        <p className="text-caption text-muted-foreground mt-3">
          Serving size: {nutrition.serving_size}
        </p>
      )}
    </section>
  )
}
