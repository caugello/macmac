import { useState } from 'react'
import { format, addDays, startOfWeek, parseISO } from 'date-fns'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Icon } from '@/components/ui/icon'
import { useMealPlans, useCopyWeek } from '@/hooks/useMealPlans'
import { useToast } from '@/components/ui/use-toast'

interface CopyWeekModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sourceWeekStart: Date
}

const formatWeekRange = (weekStart: Date) =>
  `${format(weekStart, 'MMM d')} - ${format(addDays(weekStart, 6), 'MMM d')}`

export const CopyWeekModal = ({ open, onOpenChange, sourceWeekStart }: CopyWeekModalProps) => {
  const [targetWeekStart, setTargetWeekStart] = useState<Date | null>(null)
  const { toast } = useToast()
  const copyWeek = useCopyWeek()

  // Load existing meals in the chosen target week to warn about overwrites.
  const { data: targetMeals } = useMealPlans(
    targetWeekStart
      ? {
          start_date: format(targetWeekStart, 'yyyy-MM-dd'),
          end_date: format(addDays(targetWeekStart, 6), 'yyyy-MM-dd'),
        }
      : undefined
  )
  const targetHasMeals = !!targetWeekStart && (targetMeals?.data.length ?? 0) > 0

  const handleDateChange = (value: string) => {
    if (!value) {
      setTargetWeekStart(null)
      return
    }
    // Snap any chosen day to the Monday of that week so the target is always a Monday.
    setTargetWeekStart(startOfWeek(parseISO(value), { weekStartsOn: 1 }))
  }

  const handleConfirm = () => {
    if (!targetWeekStart) return
    copyWeek.mutate(
      {
        source_week_start: format(sourceWeekStart, 'yyyy-MM-dd'),
        target_week_start: format(targetWeekStart, 'yyyy-MM-dd'),
      },
      {
        onSuccess: () => {
          toast('Week copied', 'success')
          setTargetWeekStart(null)
          onOpenChange(false)
        },
        onError: () => {
          toast('Failed to copy week', 'error')
        },
      }
    )
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) setTargetWeekStart(null)
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Copy Week</DialogTitle>
          <DialogDescription>Copy from {formatWeekRange(sourceWeekStart)}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <label htmlFor="copy-week-target" className="text-label-md font-medium block">
            Target week
          </label>
          <input
            id="copy-week-target"
            type="date"
            value={targetWeekStart ? format(targetWeekStart, 'yyyy-MM-dd') : ''}
            onChange={(e) => handleDateChange(e.target.value)}
            className="w-full h-11 px-3 rounded-lg wireframe-border bg-surface-container-lowest text-body-md"
          />
          {targetWeekStart && (
            <p className="text-caption text-on-surface-variant">
              Copies into week of {formatWeekRange(targetWeekStart)}
            </p>
          )}
        </div>

        {targetHasMeals && (
          <div
            role="alert"
            className="flex items-start gap-2 p-3 rounded-lg bg-error-container text-on-error-container"
          >
            <Icon name="warning" size={20} className="shrink-0 mt-0.5" />
            <p className="text-caption">
              The target week already has meals. They will be replaced.
            </p>
          </div>
        )}

        <DialogFooter className="gap-2">
          <button
            type="button"
            onClick={() => handleOpenChange(false)}
            className="min-h-[44px] px-4 py-2 rounded-lg wireframe-border text-label-md hover:bg-surface-container-low transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!targetWeekStart || copyWeek.isPending}
            className="min-h-[44px] px-4 py-2 rounded-lg bg-tertiary-container text-on-tertiary-container text-label-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {copyWeek.isPending && (
              <Icon name="progress_activity" size={18} className="animate-spin" />
            )}
            {targetHasMeals ? 'Overwrite' : 'Copy Week'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
