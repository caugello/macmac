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
              MacMac: <span className="text-primary">Your Digital</span> Pantry.
            </h1>
            <p className="text-xl text-on-surface-variant leading-relaxed">
              A warm, organized space for your family&apos;s recipes and meal plans. Plan smarter,
              shop better, waste less.
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
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-surface-container-lowest wireframe-border card-hover-shadow">
            <CardContent className="p-6 space-y-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Icon name="calendar_today" size={24} className="text-primary" />
              </div>
              <h3 className="text-xl font-heading font-semibold">Smart Meal Plans</h3>
              <p className="text-on-surface-variant">
                Plan your week with custom meal plans tailored to your family&apos;s preferences and
                dietary needs.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-surface-container-lowest wireframe-border card-hover-shadow">
            <CardContent className="p-6 space-y-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Icon name="shopping_cart" size={24} className="text-primary" />
              </div>
              <h3 className="text-xl font-heading font-semibold">Smart Grocery Lists</h3>
              <p className="text-on-surface-variant">
                Automatically generated shopping lists with real-time prices from your local stores.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-surface-container-lowest wireframe-border card-hover-shadow">
            <CardContent className="p-6 space-y-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Icon name="eco" size={24} className="text-primary" />
              </div>
              <h3 className="text-xl font-heading font-semibold">Reduce Food Waste</h3>
              <p className="text-on-surface-variant">
                Plan smarter, waste less. Use ingredients efficiently and minimize food waste across
                your household.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-surface-container-lowest wireframe-border card-hover-shadow">
            <CardContent className="p-6 space-y-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Icon name="nutrition" size={24} className="text-primary" />
              </div>
              <h3 className="text-xl font-heading font-semibold">Nutrition Tracking</h3>
              <p className="text-on-surface-variant">
                Monitor your nutrition intake with Nutri-Score badges and detailed nutritional
                information.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-heading font-bold mb-4">
            How <span className="text-primary">MacMac</span> Works
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-surface-container-lowest wireframe-border">
            <CardContent className="p-6 space-y-4">
              <div className="text-primary font-heading font-bold text-lg">1. Browse Recipes</div>
              <div className="aspect-video bg-gradient-to-br from-primary/5 to-transparent rounded-lg flex items-center justify-center">
                <Icon name="restaurant_menu" size={48} className="text-primary/30" />
              </div>
              <p className="text-on-surface-variant">
                Browse your collection or create new recipes with ingredients from the catalog
              </p>
            </CardContent>
          </Card>

          <Card className="bg-surface-container-lowest wireframe-border">
            <CardContent className="p-6 space-y-4">
              <div className="text-primary font-heading font-bold text-lg">2. Plan Your Week</div>
              <div className="aspect-video bg-gradient-to-br from-primary/5 to-transparent rounded-lg flex items-center justify-center">
                <Icon name="calendar_month" size={48} className="text-primary/30" />
              </div>
              <p className="text-on-surface-variant">
                Drag recipes into your weekly meal calendar for breakfast, lunch, and dinner
              </p>
            </CardContent>
          </Card>

          <Card className="bg-surface-container-lowest wireframe-border">
            <CardContent className="p-6 space-y-4">
              <div className="text-primary font-heading font-bold text-lg">3. Get Smart Lists</div>
              <div className="aspect-video bg-gradient-to-br from-primary/5 to-transparent rounded-lg flex items-center justify-center">
                <Icon name="shopping_cart" size={48} className="text-primary/30" />
              </div>
              <p className="text-on-surface-variant">
                Auto-generated shopping lists aggregated by category with price estimates
              </p>
            </CardContent>
          </Card>

          <Card className="bg-surface-container-lowest wireframe-border">
            <CardContent className="p-6 space-y-4">
              <div className="text-primary font-heading font-bold text-lg">4. Cook & Enjoy</div>
              <div className="aspect-video bg-gradient-to-br from-primary/5 to-transparent rounded-lg flex items-center justify-center">
                <Icon name="restaurant" size={48} className="text-primary/30" />
              </div>
              <p className="text-on-surface-variant">
                Follow step-by-step instructions and enjoy delicious homemade meals
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-2xl mx-auto space-y-6">
          <h2 className="text-4xl font-heading font-bold">
            Your <span className="text-primary">Digital Pantry</span> Awaits
          </h2>
          <p className="text-xl text-on-surface-variant">
            Start your meal planning journey today. Free to use, easy to master.
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
