import { Navbar } from './Navbar'
import { BottomNav } from './BottomNav'

interface AppLayoutProps {
  children: React.ReactNode
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="pb-16 md:pb-0">{children}</main>
      <BottomNav />
    </div>
  )
}
