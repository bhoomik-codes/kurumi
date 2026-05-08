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
    <>
      <ParticleBackground />
      <div className="flex flex-col h-screen relative z-10">
        <TopBar />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto">
            <Routes>
              <Route path="/" element={<Chat />} />
              <Route path="/models" element={<Models />} />
              <Route path="/documents" element={<Documents />} />
              <Route path="/imagegen" element={<ImageGen />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/system" element={<SystemInfo />} />
              <Route path="/setup" element={<OllamaSetup />} />
            </Routes>
          </main>
        </div>
        <StatusBar />
      </div>
    </>
  )
}
