import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Icon } from '@/components/ui/icon'

export const Landing = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h1 className="text-5xl lg:text-6xl font-heading font-bold leading-tight">
              AI reads every product at your store.{' '}
              <span className="text-primary">Your meal plan writes its own shopping list.</span>
            </h1>
            <p className="text-xl text-on-surface-variant leading-relaxed">
              MacMac crawls real store catalogs, enriches every product with AI, and turns your
              weekly meals into a priced shopping list — automatically.
            </p>
            <div className="flex gap-4">
              <Button
                asChild
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 py-6 text-lg rounded-full"
              >
                <Link to="/recipes">Get Started Free</Link>
              </Button>
              <Button
                variant="outline"
                className="border-outline-variant text-on-surface-variant hover:bg-surface-variant px-8 py-6 text-lg rounded-full"
              >
                Learn More
              </Button>
            </div>
          </div>

          <div className="relative">
            <div className="bg-gradient-to-br from-primary/10 to-transparent rounded-lg p-8 border border-outline-variant">
              <img
                src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=600&fit=crop"
                alt="Meal prep preview"
                className="rounded-lg shadow-lg"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 stagger-grid">
          <Card className="bg-surface-container-lowest wireframe-border card-hover-shadow">
            <CardContent className="p-6 space-y-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Icon name="calendar_today" size={24} className="text-primary" />
              </div>
              <h3 className="text-xl font-heading font-semibold">
                Meal plans that know your store
              </h3>
              <p className="text-on-surface-variant">
                Plan your week and MacMac matches every ingredient to real products on real shelves
                — with today&apos;s prices already filled in.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-surface-container-lowest wireframe-border card-hover-shadow">
            <CardContent className="p-6 space-y-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Icon name="shopping_cart" size={24} className="text-primary" />
              </div>
              <h3 className="text-xl font-heading font-semibold">
                Shopping lists with real prices
              </h3>
              <p className="text-on-surface-variant">
                One click turns a week of meals into a priced, sorted shopping list. Promotions are
                flagged automatically so you never miss a deal.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-surface-container-lowest wireframe-border card-hover-shadow">
            <CardContent className="p-6 space-y-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Icon name="eco" size={24} className="text-primary" />
              </div>
              <h3 className="text-xl font-heading font-semibold">
                Buy what you need, use what you buy
              </h3>
              <p className="text-on-surface-variant">
                Precise quantities calculated from your recipes mean fewer impulse buys, less
                forgotten produce, and a fridge that makes sense.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-surface-container-lowest wireframe-border card-hover-shadow">
            <CardContent className="p-6 space-y-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Icon name="nutrition" size={24} className="text-primary" />
              </div>
              <h3 className="text-xl font-heading font-semibold">Nutri-Score on every product</h3>
              <p className="text-on-surface-variant">
                AI extracts nutritional data from every cataloged product and assigns a Nutri-Score
                automatically — no manual entry, no guesswork.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-heading font-bold mb-4">
            How the <span className="text-primary">AI pipeline</span> works
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 stagger-grid">
          <Card className="bg-surface-container-lowest wireframe-border">
            <CardContent className="p-6 space-y-4">
              <div className="text-primary font-heading font-bold text-lg">1. Add your recipes</div>
              <div className="aspect-video bg-gradient-to-br from-primary/5 to-transparent rounded-lg flex items-center justify-center">
                <Icon name="restaurant_menu" size={48} className="text-primary/30" />
              </div>
              <p className="text-on-surface-variant">
                Build your family collection or browse what others have shared — each recipe links
                to real catalog products
              </p>
            </CardContent>
          </Card>

          <Card className="bg-surface-container-lowest wireframe-border">
            <CardContent className="p-6 space-y-4">
              <div className="text-primary font-heading font-bold text-lg">2. Plan your meals</div>
              <div className="aspect-video bg-gradient-to-br from-primary/5 to-transparent rounded-lg flex items-center justify-center">
                <Icon name="calendar_month" size={48} className="text-primary/30" />
              </div>
              <p className="text-on-surface-variant">
                Drag recipes into your weekly calendar for breakfast, lunch, and dinner
              </p>
            </CardContent>
          </Card>

          <Card className="bg-surface-container-lowest wireframe-border">
            <CardContent className="p-6 space-y-4">
              <div className="text-primary font-heading font-bold text-lg">3. AI does the math</div>
              <div className="aspect-video bg-gradient-to-br from-primary/5 to-transparent rounded-lg flex items-center justify-center">
                <Icon name="auto_awesome" size={48} className="text-primary/30" />
              </div>
              <p className="text-on-surface-variant">
                MacMac matches every ingredient to real store products, calculates quantities, and
                builds a priced list — sorted by category
              </p>
            </CardContent>
          </Card>

          <Card className="bg-surface-container-lowest wireframe-border">
            <CardContent className="p-6 space-y-4">
              <div className="text-primary font-heading font-bold text-lg">
                4. Shop with confidence
              </div>
              <div className="aspect-video bg-gradient-to-br from-primary/5 to-transparent rounded-lg flex items-center justify-center">
                <Icon name="shopping_cart" size={48} className="text-primary/30" />
              </div>
              <p className="text-on-surface-variant">
                Walk into the store knowing exactly what to buy, how much it costs, and which items
                are on promotion this week
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-2xl mx-auto space-y-6">
          <h2 className="text-4xl font-heading font-bold">
            Your store is already <span className="text-primary">cataloged</span>
          </h2>
          <p className="text-xl text-on-surface-variant">
            AI has read every product, extracted every price, and scored every Nutri-Score. All
            that&apos;s left is your first recipe.
          </p>
          <Button
            asChild
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 py-6 text-lg rounded-full"
          >
            <Link to="/recipes">Get Started Free</Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
