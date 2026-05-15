import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Calendar, ShoppingCart, Trash2, BarChart3 } from 'lucide-react'

export const Landing = () => {
  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
              MacMac: <span className="text-[#00CEB8]">Your AI-Powered</span> Meal Prep Revolution.
            </h1>
            <p className="text-xl text-gray-400">
              Intelligent meal planning meets effortless grocery shopping. Transform your kitchen routine with AI-driven recipes and smart price comparisons.
            </p>
            <div className="flex gap-4">
              <Button asChild className="bg-[#00CEB8] hover:bg-[#00b8a5] text-black font-semibold px-8 py-6 text-lg">
                <Link to="/recipes">Get Started Free</Link>
              </Button>
              <Button variant="outline" className="border-[#00CEB8] text-[#00CEB8] hover:bg-[#00CEB8]/10 px-8 py-6 text-lg">
                Learn Course
              </Button>
            </div>
          </div>

          <div className="relative">
            <div className="bg-gradient-to-br from-[#00CEB8]/20 to-transparent rounded-2xl p-8 backdrop-blur-sm border border-[#00CEB8]/30">
              <img
                src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=600&fit=crop"
                alt="Meal prep preview"
                className="rounded-lg shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-[#141824] border-gray-800 hover:border-[#00CEB8]/50 transition-colors">
            <CardContent className="p-6 space-y-4">
              <div className="w-12 h-12 bg-[#00CEB8]/20 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-[#00CEB8]" />
              </div>
              <h3 className="text-xl font-semibold">AI-Personalized Plans</h3>
              <p className="text-gray-400">
                Get custom meal plans tailored to your preferences, dietary needs, and smart price comparisons.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-[#141824] border-gray-800 hover:border-[#00CEB8]/50 transition-colors">
            <CardContent className="p-6 space-y-4">
              <div className="w-12 h-12 bg-[#00CEB8]/20 rounded-lg flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-[#00CEB8]" />
              </div>
              <h3 className="text-xl font-semibold">Smart Grocery Lists</h3>
              <p className="text-gray-400">
                Automatically generated shopping lists with real-time prices. Save money with intelligent price comparisons.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-[#141824] border-gray-800 hover:border-[#00CEB8]/50 transition-colors">
            <CardContent className="p-6 space-y-4">
              <div className="w-12 h-12 bg-[#00CEB8]/20 rounded-lg flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-[#00CEB8]" />
              </div>
              <h3 className="text-xl font-semibold">Reduce Food Waste</h3>
              <p className="text-gray-400">
                Plan smarter, waste less. Our AI helps you use ingredients efficiently and minimize food waste.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-[#141824] border-gray-800 hover:border-[#00CEB8]/50 transition-colors">
            <CardContent className="p-6 space-y-4">
              <div className="w-12 h-12 bg-[#00CEB8]/20 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-[#00CEB8]" />
              </div>
              <h3 className="text-xl font-semibold">Calorie Tracking & Nutrition</h3>
              <p className="text-gray-400">
                Monitor your nutrition intake with detailed tracking. Make informed decisions for a healthier you.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">
            How <span className="text-[#00CEB8]">MacMac</span> Works
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-[#141824] border-gray-800">
            <CardContent className="p-6 space-y-4">
              <div className="text-[#00CEB8] font-bold text-lg">1. Visualize Meal</div>
              <div className="aspect-video bg-gradient-to-br from-[#00CEB8]/10 to-transparent rounded-lg flex items-center justify-center">
                <Calendar className="w-12 h-12 text-[#00CEB8]/50" />
              </div>
              <p className="text-gray-400">Browse recipes or let AI suggest meals based on your preferences</p>
            </CardContent>
          </Card>

          <Card className="bg-[#141824] border-gray-800">
            <CardContent className="p-6 space-y-4">
              <div className="text-[#00CEB8] font-bold text-lg">2. AI Builds a Meal Plan</div>
              <div className="aspect-video bg-gradient-to-br from-[#00CEB8]/10 to-transparent rounded-lg flex items-center justify-center">
                <BarChart3 className="w-12 h-12 text-[#00CEB8]/50" />
              </div>
              <p className="text-gray-400">Smart algorithm creates balanced meal plans with nutrition insights</p>
            </CardContent>
          </Card>

          <Card className="bg-[#141824] border-gray-800">
            <CardContent className="p-6 space-y-4">
              <div className="text-[#00CEB8] font-bold text-lg">3. Get Smart Lists</div>
              <div className="aspect-video bg-gradient-to-br from-[#00CEB8]/10 to-transparent rounded-lg flex items-center justify-center">
                <ShoppingCart className="w-12 h-12 text-[#00CEB8]/50" />
              </div>
              <p className="text-gray-400">Auto-generated shopping lists with price comparisons across stores</p>
            </CardContent>
          </Card>

          <Card className="bg-[#141824] border-gray-800">
            <CardContent className="p-6 space-y-4">
              <div className="text-[#00CEB8] font-bold text-lg">4. Cook Meals</div>
              <div className="aspect-video bg-gradient-to-br from-[#00CEB8]/10 to-transparent rounded-lg flex items-center justify-center">
                <Trash2 className="w-12 h-12 text-[#00CEB8]/50" />
              </div>
              <p className="text-gray-400">Follow step-by-step instructions and enjoy delicious homemade meals</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-2xl mx-auto space-y-6">
          <h2 className="text-4xl font-bold">
            Get Access to <span className="text-[#00CEB8]">MacMac</span> on the Web
          </h2>
          <p className="text-xl text-gray-400">
            Start your meal prep revolution today. Free to use, easy to master.
          </p>
          <Button asChild className="bg-[#00CEB8] hover:bg-[#00b8a5] text-black font-semibold px-8 py-6 text-lg">
            <Link to="/recipes">Get Started Free</Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
