import { useState } from 'react'
import { Icon } from '@/components/ui/icon'
import { useCreateMealPlan, useDeleteMealPlan } from '@/hooks/useMealPlans'
import { RecipeSelectorModal } from './RecipeSelectorModal'
import type { MealPlanOut, MealTypeEnum } from '@/lib/types'

interface MealSlotProps {
  date: string
  mealType: MealTypeEnum
  mealPlan?: MealPlanOut
}

export const MealSlot = ({ date, mealType, mealPlan }: MealSlotProps) => {
  const [showSelector, setShowSelector] = useState(false)
  const createMutation = useCreateMealPlan()
  const deleteMutation = useDeleteMealPlan()

  const handleRecipeSelected = (recipeId: string) => {
    createMutation.mutate(
      { date, meal_type: mealType, recipe_id: recipeId },
      {
        onSuccess: () => setShowSelector(false),
      }
    )
  }

  const handleDelete = () => {
    if (mealPlan) {
      deleteMutation.mutate(mealPlan.id)
    }
  }

  return (
    <>
      {mealPlan ? (
        <div className="flex items-center gap-3 bg-surface rounded-lg wireframe-border p-3 card-hover-shadow group">
          <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-surface-container-low to-surface-container flex items-center justify-center shrink-0 overflow-hidden">
            <Icon name="restaurant_menu" size={24} className="text-outline-variant/40" />
          </div>
          <div className="flex-grow min-w-0">
            <p className="text-label-md font-semibold text-on-surface truncate">
              {mealPlan.recipe_title || 'Untitled'}
            </p>
          </div>
          <button
            onClick={handleDelete}
            className="p-1.5 text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          >
            <Icon name="close" size={18} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowSelector(true)}
          className="w-full dashed-outline rounded-lg p-4 flex items-center justify-center gap-2 text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-colors"
        >
          <Icon name="add_circle" size={20} />
          <span className="text-label-sm">Add meal</span>
        </button>
      )}

      {showSelector && (
        <RecipeSelectorModal
          date={date}
          mealType={mealType}
          onSelect={handleRecipeSelected}
          onClose={() => setShowSelector(false)}
        />
      )}
    </>
  )
}
