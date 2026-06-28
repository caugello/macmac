import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { Icon } from '@/components/ui/icon'
import type { SmartSuggestion } from './smartSuggestion'

export const SmartSuggestionCard = ({ suggestion }: { suggestion: SmartSuggestion }) => {
  return (
    <Card
      tone="coral"
      role="region"
      aria-label="Smart suggestion"
      className="relative h-full overflow-hidden p-6 md:p-7"
    >
      <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-white/15" aria-hidden />
      <div className="relative flex h-full flex-col gap-4">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 font-body text-caption font-semibold uppercase tracking-wide">
          <Icon name={suggestion.icon} size={16} />
          {suggestion.caption}
        </span>
        <div className="space-y-1.5 max-w-prose">
          <h2 className="font-display text-headline-md font-bold">{suggestion.title}</h2>
          <p className="font-body text-body-md text-white/90">{suggestion.description}</p>
        </div>
        <div className="mt-auto flex flex-wrap gap-3 pt-1">
          <Link
            to={suggestion.primaryTo}
            className="flex min-h-[44px] items-center rounded-full bg-ink px-5 py-2.5 font-body text-label-md font-semibold text-cream transition-transform hover:-translate-y-px"
          >
            {suggestion.primaryLabel}
          </Link>
          {suggestion.secondaryLabel && suggestion.secondaryTo && (
            <Link
              to={suggestion.secondaryTo}
              className="flex min-h-[44px] items-center rounded-full border border-white/50 px-5 py-2.5 font-body text-label-md font-semibold text-white transition-colors hover:bg-white/10"
            >
              {suggestion.secondaryLabel}
            </Link>
          )}
        </div>
      </div>
    </Card>
  )
}
