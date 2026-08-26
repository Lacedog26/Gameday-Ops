import { Link } from 'react-router-dom'
import type { Exercise } from '../data/types'
import { CATEGORY_BY_ID, EQUIPMENT_NAME } from '../data/taxonomy'
import { dominantAnatomyView, muscleHighlightMap } from '../data/queries'
import { MUSCLE_BY_ID } from '../data/muscles'
import { useTraining } from '../state/store'
import BodyMap from './anatomy/BodyMap'
import { cx, HeartIcon } from './ui'

// ---------------------------------------------------------------------------
// Library card.
//
// The thumbnail is a live anatomy read-out rather than a stock photo: the same
// body map, at card size, painted with this exercise's muscle roles. When a
// real thumbnail asset is supplied it is used instead.
// ---------------------------------------------------------------------------

export default function ExerciseCard({ exercise, view = 'anterior' }: { exercise: Exercise; view?: 'anterior' | 'posterior' }) {
  const { isFavorite, toggleFavorite, data } = useTraining()
  const favorite = isFavorite('exercises', exercise.id)
  const highlights = muscleHighlightMap(exercise)
  const category = CATEGORY_BY_ID[exercise.category]
  const subcategory = category?.subcategories.find((s) => s.id === exercise.subcategory)?.name ?? exercise.subcategory

  // Show the side of the body this exercise actually loads most.
  const dominantView = dominantAnatomyView(exercise, view)

  const topMuscles = exercise.primaryMuscles
    .map((r) => MUSCLE_BY_ID[r.muscleId]?.group)
    .filter((v, i, arr): v is string => Boolean(v) && arr.indexOf(v) === i)
    .slice(0, 3)

  return (
    <article className="tr-card tr-card-hover group relative flex overflow-hidden rounded-md">
      <Link to={`/train/exercise/${exercise.id}`} className="flex min-w-0 flex-1 items-stretch gap-3 p-3 pr-11">
        <div className="relative flex h-[104px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-[3px] border border-tr-line bg-[#080B11]">
          {exercise.assets.thumbnailUrl ? (
            <img src={exercise.assets.thumbnailUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <BodyMap view={dominantView} highlights={highlights} intensity={data.settings.highlightIntensity} className="h-full w-full" />
          )}
        </div>

        <div className="flex min-w-0 flex-col justify-between py-0.5">
          <div className="min-w-0">
            <div className="tr-eyebrow mb-1 truncate text-tr-dim">
              {category?.name} · {subcategory}
            </div>
            <h3 className="tr-display truncate text-[17px] leading-tight text-tr-text group-hover:text-tr-accent">{exercise.name}</h3>
            <p className="mt-1 line-clamp-2 text-[12.5px] leading-snug text-tr-muted">{exercise.description}</p>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
            {topMuscles.map((group) => (
              <span key={group} className="text-[11px] text-tr-primary/90">
                {group}
              </span>
            ))}
            <span className="text-tr-line2">|</span>
            <span className="tr-mono truncate text-[10px] uppercase tracking-wider text-tr-dim">
              {exercise.equipment.map((e) => EQUIPMENT_NAME[e] ?? e).join(' · ')}
            </span>
          </div>
        </div>
      </Link>

      <button
        type="button"
        onClick={() => toggleFavorite('exercises', exercise.id)}
        aria-pressed={favorite}
        aria-label={favorite ? `Remove ${exercise.name} from favorites` : `Add ${exercise.name} to favorites`}
        className={cx(
          'absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-[3px] border transition-colors',
          favorite ? 'border-[#5A241E] bg-[#26100D] text-tr-primary' : 'border-transparent text-tr-dim hover:border-tr-line hover:text-tr-muted',
        )}
      >
        <HeartIcon filled={favorite} />
      </button>

      {exercise.custom ? (
        <span className="tr-mono absolute bottom-2 right-2 rounded-[2px] border border-tr-line px-1.5 py-[1px] text-[9px] uppercase tracking-wider text-tr-dim">
          Custom
        </span>
      ) : null}
    </article>
  )
}
