import React from 'react'
import { MessageSquare, Box, FileText, Image as ImageIcon, Settings, Activity, ShoppingBag } from 'lucide-react'
import { NavLink } from 'react-router-dom'

export default function Sidebar() {
  const navItems = [
    { icon: <MessageSquare size={20} />, label: 'Chat', path: '/' },
    { icon: <Box size={20} />, label: 'Models', path: '/models' },
    { icon: <ShoppingBag size={20} />, label: 'Model Store', path: '/store' },
    { icon: <FileText size={20} />, label: 'Documents', path: '/documents' },
    { icon: <ImageIcon size={20} />, label: 'Image Gen', path: '/image-gen' },
  ]

  const bottomItems = [
    { icon: <Activity size={20} />, label: 'System', path: '/system' },
    { icon: <Settings size={20} />, label: 'Settings', path: '/settings' },
  ]

  const renderLink = (item: any) => (
    <NavLink
      key={item.path}
      to={item.path}
      title={item.label}
      className={({ isActive }) => `
        w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300
        ${isActive 
          ? 'bg-red-muted/40 text-red-glow border border-red-vein shadow-[0_0_15px_rgba(255,34,68,0.2)]' 
          : 'text-text-secondary hover:text-red-bright hover:bg-white/5'
        }
      `}
    >
      {item.icon}
    </NavLink>
  )

  return (
    <aside className="w-16 flex flex-col items-center py-4 border-r border-border-glass glass-deep z-40">
      <div className="flex-1 flex flex-col gap-4">
        {navItems.map(renderLink)}
      </div>
      
      <div className="flex flex-col gap-4">
        {bottomItems.map(renderLink)}
      </div>
    </aside>
  )
}
