import {Route, BrowserRouter as Router, Routes} from 'react-router-dom'
import BrowserSource from './components/browserSource'



export default function App() {
  return (
    <main>
        <Router>
            <Routes>
                <Route path="/" element={<BrowserSource/>}/>
            </Routes>
        </Router>
    </main>
  )
}