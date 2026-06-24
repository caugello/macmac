import { RecipeDifficultyEnum } from './types'

const DIFFICULTY_LABELS: Record<RecipeDifficultyEnum, string> = {
  [RecipeDifficultyEnum.EASY]: 'Easy',
  [RecipeDifficultyEnum.MEDIUM]: 'Medium',
  [RecipeDifficultyEnum.HARD]: 'Hard',
}

/** Human-readable label for a recipe difficulty. */
export const getDifficultyLabel = (difficulty: RecipeDifficultyEnum): string =>
  DIFFICULTY_LABELS[difficulty]

/** Formats prep time in minutes as a compact label, e.g. "25 min" or "1 h 15 min". */
export const formatPrepTime = (minutes: number): string => {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rem = minutes % 60
  return rem === 0 ? `${hours} h` : `${hours} h ${rem} min`
}
