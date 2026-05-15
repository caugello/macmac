import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, X } from 'lucide-react'
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
      <Card
        className={`
          h-24 p-2 flex flex-col justify-between cursor-pointer
          ${mealPlan ? 'bg-[#1a2332] border-[#00CEB8]' : 'bg-[#0f1419] border-gray-700'}
          hover:border-[#00CEB8] transition-colors
        `}
        onClick={() => !mealPlan && setShowSelector(true)}
      >
        {mealPlan ? (
          <>
            <div className="text-sm text-white truncate">{mealPlan.recipe_title}</div>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                handleDelete()
              }}
              className="self-end p-1 h-6 w-6"
            >
              <X className="h-4 w-4 text-red-400" />
            </Button>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <Plus className="h-6 w-6" />
          </div>
        )}
      </Card>

      {showSelector && (
        <RecipeSelectorModal
          onSelect={handleRecipeSelected}
          onClose={() => setShowSelector(false)}
        />
      )}
    </>
  )
}
