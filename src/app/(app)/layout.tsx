import Sidebar from '@/components/Sidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full flex">
      <Sidebar />
      <main className="flex-1 min-h-screen overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
