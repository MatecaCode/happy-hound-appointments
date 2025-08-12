import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import '@/styles/brand.css'
import '@/styles/components.css'

createRoot(document.getElementById("root")!).render(<App />);
