import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import { default as App } from '@/App.tsx'

const root_el = document.getElementById('root')
if (!root_el) {
    throw new Error('#root 根节点不存在，请检查 index.html')
}

createRoot(root_el).render(
    <StrictMode>
        <BrowserRouter>
            <App />
        </BrowserRouter>
    </StrictMode>,
)
