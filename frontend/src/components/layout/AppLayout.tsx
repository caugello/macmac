import { Navbar } from './Navbar'
import { BottomNav } from './BottomNav'
import { MyListLauncher } from '@/components/my-list/MyListLauncher'

interface AppLayoutProps {
  children: React.ReactNode
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="pb-16 md:pb-0">{children}</main>
      <MyListLauncher />
      <BottomNav />
      <footer className="hidden md:block fixed bottom-2 right-3">
        <span className="text-[10px] text-on-surface-variant/40">v{__APP_VERSION__}</span>
      </footer>
    </div>
  )
}
