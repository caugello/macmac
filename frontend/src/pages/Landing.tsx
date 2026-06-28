import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Icon } from '@/components/ui/icon'

const FEATURES = [
  {
    tone: 'lime' as const,
    icon: 'calendar_today',
    title: 'Meal plans that know your store',
    body: "Plan your week and MacMac matches every ingredient to real products on real shelves — with today's prices already filled in.",
  },
  {
    tone: 'white' as const,
    icon: 'shopping_cart',
    title: 'Shopping lists with real prices',
    body: 'One click turns a week of meals into a priced, sorted shopping list. Promotions are flagged automatically so you never miss a deal.',
  },
  {
    tone: 'soft-purple' as const,
    icon: 'eco',
    title: 'Buy what you need, use what you buy',
    body: 'Precise quantities calculated from your recipes mean fewer impulse buys, less forgotten produce, and a fridge that makes sense.',
  },
  {
    tone: 'white' as const,
    icon: 'nutrition',
    title: 'Nutri-Score on every product',
    body: 'AI extracts nutritional data from every cataloged product and assigns a Nutri-Score automatically — no manual entry, no guesswork.',
  },
]

const STEPS = [
  {
    label: '1. Add your recipes',
    icon: 'restaurant_menu',
    body: 'Build your family collection or browse what others have shared — each recipe links to real catalog products',
  },
  {
    label: '2. Plan your meals',
    icon: 'calendar_month',
    body: 'Drag recipes into your weekly calendar for breakfast, lunch, and dinner',
  },
  {
    label: '3. AI does the math',
    icon: 'auto_awesome',
    body: 'MacMac matches every ingredient to real store products, calculates quantities, and builds a priced list — sorted by category',
  },
  {
    label: '4. Shop with confidence',
    icon: 'shopping_cart',
    body: 'Walk into the store knowing exactly what to buy, how much it costs, and which items are on promotion this week',
  },
]

export const Landing = () => {
  return (
    <div className="min-h-screen bg-cream text-ink">
      {/* Hero Section */}
      <section className="mx-auto max-w-7xl px-5 pt-12 pb-16 md:px-16 md:pt-20 md:pb-24">
        <span className="font-display text-2xl font-bold lowercase tracking-tight">
          pantry<span className="text-lime">.</span>
        </span>
        <div className="mt-10 grid items-center gap-12 lg:grid-cols-2">
          <div className="space-y-6">
            <p className="font-serif text-2xl italic text-green">Fresh from your store.</p>
            <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight lg:text-6xl">
              AI reads every product at your store.{' '}
              <span className="text-green">Your meal plan writes its own shopping list.</span>
            </h1>
            <p className="font-body text-xl leading-relaxed text-ink/70">
              MacMac crawls real store catalogs, enriches every product with AI, and turns your
              weekly meals into a priced shopping list — automatically.
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
              <Button asChild variant="accent" className="h-14 px-8 text-lg">
                <Link to="/recipes">Get Started Free</Link>
              </Button>
              <Button variant="outline" className="h-14 px-8 text-lg">
                Learn More
              </Button>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -top-6 -right-4 hidden h-24 w-24 rounded-full bg-lime md:block" />
            <div className="rounded-bento border border-border bg-white p-4">
              <img
                src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=600&fit=crop"
                alt="Meal prep preview"
                className="w-full rounded-[14px]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="mx-auto max-w-7xl px-5 py-16 md:px-16 md:py-20">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => (
            <Card key={feature.title} tone={feature.tone} className="h-full">
              <CardContent className="space-y-4 p-6">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-full ${
                    feature.tone === 'lime' ? 'bg-ink text-cream' : 'bg-lime text-ink'
                  }`}
                >
                  <Icon name={feature.icon} size={24} />
                </div>
                <h3 className="font-display text-xl font-bold tracking-tight">{feature.title}</h3>
                <p className="font-body text-base leading-relaxed opacity-80">{feature.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* How It Works Section */}
      <section className="mx-auto max-w-7xl px-5 py-16 md:px-16 md:py-20">
        <div className="mb-12 text-center">
          <h2 className="font-display text-4xl font-bold tracking-tight md:text-5xl">
            How the <span className="text-green">AI pipeline</span> works
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step) => (
            <Card key={step.label} tone="white" className="h-full">
              <CardContent className="space-y-4 p-6">
                <div className="font-display text-lg font-bold text-green">{step.label}</div>
                <div className="flex aspect-video items-center justify-center rounded-2xl bg-cream">
                  <Icon name={step.icon} size={48} className="text-green/40" />
                </div>
                <p className="font-body text-base leading-relaxed text-ink/70">{step.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="mx-auto max-w-7xl px-5 py-16 md:px-16 md:py-24">
        <Card tone="ink" className="mx-auto max-w-3xl">
          <CardContent className="space-y-6 p-10 text-center md:p-14">
            <h2 className="font-display text-4xl font-bold tracking-tight md:text-5xl">
              Your store is already <span className="text-lime">cataloged</span>
            </h2>
            <p className="font-body text-xl leading-relaxed text-cream/70">
              AI has read every product, extracted every price, and scored every Nutri-Score. All
              that&apos;s left is your first recipe.
            </p>
            <div className="flex justify-center">
              <Button asChild variant="accent" className="h-14 px-8 text-lg">
                <Link to="/recipes">Get Started Free</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
