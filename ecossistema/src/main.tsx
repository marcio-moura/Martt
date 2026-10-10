import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { criarDemoBackend } from './lib/demoBackend'
import { criarSupabaseBackend } from './lib/supabaseBackend'
import './styles.css'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const chave = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
const backend = url && chave ? criarSupabaseBackend(url, chave) : criarDemoBackend()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App backend={backend} />
  </StrictMode>,
)
