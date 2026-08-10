import { Outlet } from 'react-router-dom'

// Root layout. Individual routes (Dashboard / Admin) own their own chrome so
// the TV view can run truly full-bleed with zero surrounding UI.
export default function App() {
  return (
    <div className="h-full w-full field-bg text-white">
      <Outlet />
    </div>
  )
}
