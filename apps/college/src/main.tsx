import ReactDOM from 'react-dom/client'
import { configureProduct, GameDayOpsRoot } from '@gamedayops/core'
import { collegeProduct } from './product'

// Configure the College Football data universe, then render the shared shell.
configureProduct(collegeProduct)
ReactDOM.createRoot(document.getElementById('root')!).render(<GameDayOpsRoot />)
