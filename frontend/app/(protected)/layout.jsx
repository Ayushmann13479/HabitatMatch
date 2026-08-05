import Navbar from '@/components/layout/Navbar'
import BottomNav from '@/components/layout/BottomNav'
import { SavedPropertiesProvider } from '@/context/SavedPropertiesContext'

export default function ProtectedLayout({ children }) {
  return (
    <SavedPropertiesProvider>
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pb-16 md:pb-0">
          {children}
        </main>
        <BottomNav />
      </div>
    </SavedPropertiesProvider>
  )
}
