import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { TrainingStoreProvider } from './state/store'
import TrainingLayout from './layout/TrainingLayout'
import Home from './pages/Home'
import './styles.css'

// ---------------------------------------------------------------------------
// Training & Anatomy module entry point.
//
// Mounted by the host app at /train/*. Home loads eagerly so the dashboard
// paints immediately; every other page is code-split so the initial bundle
// stays small.
// ---------------------------------------------------------------------------

const Library = lazy(() => import('./pages/Library'))
const ExerciseDetail = lazy(() => import('./pages/ExerciseDetail'))
const AddExercise = lazy(() => import('./pages/AddExercise'))
const MuscleExplorer = lazy(() => import('./pages/MuscleExplorer'))
const MuscleDetail = lazy(() => import('./pages/MuscleDetail'))
const Anatomy = lazy(() => import('./pages/Anatomy'))
const Programs = lazy(() => import('./pages/Programs'))
const Favorites = lazy(() => import('./pages/Favorites'))
const Settings = lazy(() => import('./pages/Settings'))
const CategoryIndex = lazy(() => import('./pages/Categories').then((m) => ({ default: m.CategoryIndex })))
const CategoryDetail = lazy(() => import('./pages/Categories').then((m) => ({ default: m.CategoryDetail })))

function RouteFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-live="polite">
      <div className="text-center">
        <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-tr-line border-t-tr-accent" />
        <p className="tr-eyebrow text-tr-dim">Loading</p>
      </div>
    </div>
  )
}

export default function TrainingApp() {
  return (
    <TrainingStoreProvider>
      <Routes>
        <Route element={<TrainingLayout />}>
          <Route index element={<Home />} />
          <Route
            path="*"
            element={
              <Suspense fallback={<RouteFallback />}>
                <Routes>
                  <Route path="library" element={<Library />} />
                  {/* `new` is matched before `:id` so it never resolves to an exercise. */}
                  <Route path="exercise/new" element={<AddExercise />} />
                  <Route path="exercise/:id" element={<ExerciseDetail />} />
                  <Route path="muscles" element={<MuscleExplorer />} />
                  <Route path="muscles/:id" element={<MuscleDetail />} />
                  <Route path="anatomy" element={<Anatomy />} />
                  <Route path="categories" element={<CategoryIndex />} />
                  <Route path="categories/:id" element={<CategoryDetail />} />
                  <Route path="programs" element={<Programs />} />
                  <Route path="favorites" element={<Favorites />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="*" element={<Navigate to="/train" replace />} />
                </Routes>
              </Suspense>
            }
          />
        </Route>
      </Routes>
    </TrainingStoreProvider>
  )
}
