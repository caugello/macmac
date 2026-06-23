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
 * Ivory Flux nutrition panel: a 2x2 card grid (per 100g) with daily-value bars.
 */
export const ProductDetailNutrition = ({ nutrition }: ProductDetailNutritionProps) => {
  const rows: NutrientRow[] = [
    { label: 'Energy', value: nutrition.energy_kcal, unit: 'kcal', daily: 2000, bar: 'bg-primary' },
    { label: 'Fat', value: nutrition.fat_g, unit: 'g', daily: 70, bar: 'bg-tertiary' },
    { label: 'Carbs', value: nutrition.carbs_g, unit: 'g', daily: 260, bar: 'bg-secondary' },
    { label: 'Protein', value: nutrition.protein_g, unit: 'g', daily: 50, bar: 'bg-primary' },
  ]

  const present = rows.filter((r) => r.value != null)
  if (present.length === 0) return null

  return (
    <section>
      <h2 className="text-headline-md font-heading font-semibold mb-4">
        Nutritional Values (100g)
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {present.map((r) => {
          const pct = Math.min(Math.round(((r.value ?? 0) / r.daily) * 100), 100)
          return (
            <div
              key={r.label}
              className="bg-surface-container-lowest wireframe-border rounded-xl p-4"
            >
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-label-md font-medium text-on-surface">{r.label}</span>
                <span className="text-label-md font-semibold">
                  {r.value}
                  {r.unit}
                  <span className="text-on-surface-variant font-normal ml-1.5">{pct}% DV</span>
                </span>
              </div>
              <div className="h-2 bg-surface-container rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${r.bar} transition-all duration-700 ease-out`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
      {nutrition.serving_size && (
        <p className="text-caption text-on-surface-variant mt-3">
          Serving size: {nutrition.serving_size}
        </p>
      )}
    </section>
  )
}
