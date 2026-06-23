import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui/icon'
import type { SmartSuggestion } from './smartSuggestion'

export const SmartSuggestionCard = ({ suggestion }: { suggestion: SmartSuggestion }) => {
  return (
    <section
      aria-label="Smart suggestion"
      className="relative overflow-hidden rounded-xl ambient-shadow p-6 md:p-7 bg-gradient-to-br from-primary to-primary-container text-primary-foreground"
    >
      <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/10" aria-hidden />
      <div className="relative space-y-4">
        <span className="inline-flex items-center gap-1.5 text-caption font-semibold uppercase tracking-wide bg-white/15 px-2.5 py-1 rounded-full">
          <Icon name={suggestion.icon} size={16} />
          {suggestion.caption}
        </span>
        <div className="space-y-1.5 max-w-prose">
          <h2 className="text-title-lg font-heading font-bold">{suggestion.title}</h2>
          <p className="text-body-md text-primary-foreground/90">{suggestion.description}</p>
        </div>
        <div className="flex flex-wrap gap-3 pt-1">
          <Link
            to={suggestion.primaryTo}
            className="bg-white text-primary px-5 py-2.5 rounded-full text-label-md font-semibold hover:brightness-95 transition-all min-h-[44px] flex items-center"
          >
            {suggestion.primaryLabel}
          </Link>
          {suggestion.secondaryLabel && suggestion.secondaryTo && (
            <Link
              to={suggestion.secondaryTo}
              className="border border-white/40 text-primary-foreground px-5 py-2.5 rounded-full text-label-md font-semibold hover:bg-white/10 transition-all min-h-[44px] flex items-center"
            >
              {suggestion.secondaryLabel}
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}
