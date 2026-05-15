import { Navbar } from './Navbar'

interface AppLayoutProps {
  children: React.ReactNode
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white">
      <Navbar />
      <main>{children}</main>
    </div>
  )
}
