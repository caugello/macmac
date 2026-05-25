import { useState, useRef, useEffect, useCallback } from 'react'
import { Icon } from '@/components/ui/icon'
import { useCreateMealPlan, useDeleteMealPlan, useUpdateMealPlan } from '@/hooks/useMealPlans'
import { RecipeSelectorModal } from './RecipeSelectorModal'
import type { MealPlanOut, MealTypeEnum } from '@/lib/types'

interface MealSlotProps {
  date: string
  mealType: MealTypeEnum
  mealPlan?: MealPlanOut
}

type SaveStatus = 'idle' | 'saving' | 'saved'

const TRUNCATE_LENGTH = 50

export const MealSlot = ({ date, mealType, mealPlan }: MealSlotProps) => {
  const [showSelector, setShowSelector] = useState(false)
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [draft, setDraft] = useState('')
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout>>()

  const createMutation = useCreateMealPlan()
  const deleteMutation = useDeleteMealPlan()
  const updateMutation = useUpdateMealPlan()

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (isEditingNotes && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [isEditingNotes])

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

  const openNotesEditor = useCallback(() => {
    setDraft(mealPlan?.notes || '')
    setIsEditingNotes(true)
    setSaveStatus('idle')
  }, [mealPlan?.notes])

  const handleNotesSave = useCallback(() => {
    if (!mealPlan) return
    const trimmed = draft.trim()
    const current = mealPlan.notes || ''
    if (trimmed === current) {
      setIsEditingNotes(false)
      return
    }
    setSaveStatus('saving')
    updateMutation.mutate(
      { id: mealPlan.id, data: { notes: trimmed } },
      {
        onSuccess: () => {
          setIsEditingNotes(false)
          setSaveStatus('saved')
          savedTimerRef.current = setTimeout(() => setSaveStatus('idle'), 1500)
        },
        onError: () => {
          setSaveStatus('idle')
        },
      }
    )
  }, [mealPlan, draft, updateMutation])

  const handleNotesKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      setIsEditingNotes(false)
      setSaveStatus('idle')
    }
  }, [])

  const truncatedNotes =
    mealPlan?.notes && mealPlan.notes.length > TRUNCATE_LENGTH
      ? mealPlan.notes.slice(0, TRUNCATE_LENGTH) + '...'
      : mealPlan?.notes

  return (
    <>
      {mealPlan ? (
        <div className="bg-surface rounded-lg wireframe-border p-3 card-hover-shadow group">
          <div className="flex items-center gap-3">
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

          <div className="mt-2">
            {isEditingNotes ? (
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={handleNotesSave}
                onKeyDown={handleNotesKeyDown}
                maxLength={1000}
                rows={2}
                className="w-full text-body-sm text-on-surface bg-surface-container-low rounded-md p-2 resize-none outline-none focus:ring-1 focus:ring-primary"
                placeholder="Add a note..."
              />
            ) : (
              <button
                onClick={openNotesEditor}
                className="w-full text-left min-h-[44px] flex items-center px-1"
              >
                {truncatedNotes ? (
                  <span className="text-body-sm text-on-surface-variant">{truncatedNotes}</span>
                ) : (
                  <span className="text-body-sm text-outline-variant/60">Add notes...</span>
                )}
              </button>
            )}
            {saveStatus === 'saved' && (
              <p className="text-body-sm text-primary mt-1 animate-fade">Saved</p>
            )}
          </div>
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
