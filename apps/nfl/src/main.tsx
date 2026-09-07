import ReactDOM from 'react-dom/client'
import { configureProduct, GameDayOpsRoot } from '@gamedayops/core'
import { nflProduct } from './product'

// Configure the NFL data universe, then render the shared GameDayOps shell.
configureProduct(nflProduct)
ReactDOM.createRoot(document.getElementById('root')!).render(<GameDayOpsRoot />)
