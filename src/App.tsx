import { Routes, Route } from 'react-router-dom'
import TopBar from './components/layout/TopBar'
import Sidebar from './components/layout/Sidebar'
import StatusBar from './components/layout/StatusBar'
import ParticleBackground from './components/layout/ParticleBackground'
import Chat from './pages/Chat'
import Models from './pages/Models'
import Documents from './pages/Documents'
import ImageGen from './pages/ImageGen'
import Settings from './pages/Settings'
import SystemInfo from './pages/SystemInfo'
import OllamaSetup from './pages/OllamaSetup'

export default function App() {
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-void text-text-primary font-sans">
      <ParticleBackground />
      
      <TopBar />
      
      <div className="flex-1 flex overflow-hidden relative z-10">
        <Sidebar />
        
        <main className="flex-1 relative overflow-hidden bg-abyss/40 backdrop-blur-sm">
          <Routes>
            <Route path="/" element={<Chat />} />
            <Route path="/models" element={<Models />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/image-gen" element={<ImageGen />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/system" element={<SystemInfo />} />
            <Route path="/setup" element={<OllamaSetup />} />
          </Routes>
        </main>
      </div>
      <StatusBar />
    </div>
  )
}
