import { useState, useRef, useEffect, useCallback } from 'react'
import { Icon } from '@/components/ui/icon'
import { useCreateMealPlan, useDeleteMealPlan, useUpdateMealPlan } from '@/hooks/useMealPlans'
import { RecipeSelectorModal } from './RecipeSelectorModal'
import type { MealPlanOut, MealTypeEnum } from '@/lib/types'

interface MealSlotProps {
  date: string
  mealType: MealTypeEnum
  mealPlan?: MealPlanOut
  /** Desktop matrix cell: drop the thumbnail and tighten for narrow columns. */
  compact?: boolean
  /** Tonight's dinner: dark "TONIGHT" treatment (screen 02). */
  highlight?: boolean
}

type SaveStatus = 'idle' | 'saving' | 'saved'

const TRUNCATE_LENGTH = 50

export const MealSlot = ({
  date,
  mealType,
  mealPlan,
  compact = false,
  highlight = false,
}: MealSlotProps) => {
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
        <div
          className={`group rounded-bento border p-3 ${
            highlight ? 'bg-ink border-transparent' : 'bg-cream border-border'
          }`}
        >
          <div className="flex items-center gap-3">
            {!compact && (
              <div className="w-14 h-14 rounded-bento bg-lime flex items-center justify-center shrink-0 overflow-hidden">
                <Icon name="restaurant_menu" size={24} className="text-ink/70" />
              </div>
            )}
            <div className="flex-grow min-w-0">
              {highlight && (
                <p className="text-[8.5px] font-extrabold uppercase tracking-wide text-lime mb-0.5">
                  Tonight
                </p>
              )}
              <p
                className={`text-label-md font-semibold truncate ${
                  highlight ? 'text-cream' : 'text-ink'
                }`}
              >
                {mealPlan.recipe_title || 'Untitled'}
              </p>
            </div>
            <button
              onClick={handleDelete}
              aria-label="Remove meal"
              className={`p-1.5 rounded-full opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity shrink-0 ${
                highlight ? 'text-coral hover:bg-white/10' : 'text-coral hover:bg-coral/10'
              }`}
            >
              <Icon name="close" size={18} />
            </button>
          </div>

          <div className={compact ? 'mt-1.5' : 'mt-2'}>
            {isEditingNotes ? (
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={handleNotesSave}
                onKeyDown={handleNotesKeyDown}
                maxLength={1000}
                rows={2}
                className="w-full text-body-sm text-ink bg-white rounded-bento p-2 resize-none outline-none focus:ring-2 focus:ring-ink"
                placeholder="Add a note..."
              />
            ) : (
              <button
                onClick={openNotesEditor}
                className={`w-full text-left flex items-center px-1 ${
                  compact ? 'min-h-[28px]' : 'min-h-[44px]'
                }`}
              >
                {truncatedNotes ? (
                  <span
                    className={`text-body-sm ${highlight ? 'text-cream/70' : 'text-on-surface-variant'}`}
                  >
                    {truncatedNotes}
                  </span>
                ) : (
                  <span
                    className={`text-body-sm ${highlight ? 'text-cream/45' : 'text-on-surface-variant/60'}`}
                  >
                    Add notes...
                  </span>
                )}
              </button>
            )}
            {saveStatus === 'saved' && (
              <p
                className={`text-body-sm mt-1 animate-fade ${highlight ? 'text-lime' : 'text-ink/70'}`}
              >
                Saved
              </p>
            )}
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowSelector(true)}
          className={`w-full rounded-bento border-2 border-dashed border-border flex items-center justify-center gap-2 text-on-surface-variant hover:bg-cream hover:border-ink hover:text-ink transition-colors ${
            compact ? 'min-h-[64px] p-2' : 'min-h-[44px] p-4'
          }`}
        >
          <Icon name="add" size={compact ? 22 : 20} />
          {!compact && <span className="text-caption">Add meal</span>}
          {compact && <span className="sr-only">Add meal</span>}
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
