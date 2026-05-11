import React, { useState } from 'react'
import { Copy, Check, Eye, Code, BarChart2 } from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts'
import { CodeArtifact } from './CodeArtifact'

// Cursed Blood theme colors for charts
const COLORS = ['#FF2244', '#8B0000', '#5C1A2A', '#C41E3A', '#ff6b9d', '#ff8c42']

export function ChartArtifact({ language, code }: { language: string; code: string }) {
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview')
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Parse the chart config
  let chartConfig: any = null
  let parseError: string | null = null

  try {
    chartConfig = JSON.parse(code)
  } catch (err: any) {
    parseError = 'Failed to parse chart configuration JSON: ' + err.message
  }

  const renderChart = () => {
    if (parseError) {
      return <div className="text-red-400 font-mono text-sm p-4">{parseError}</div>
    }

    if (!chartConfig || !chartConfig.type || !chartConfig.data) {
      return <div className="text-red-400 font-mono text-sm p-4">Invalid chart configuration. Expected {`{ "type": "line|bar|area|pie", "data": [...] }`}</div>
    }

    const { type, data, config } = chartConfig

    switch (type) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="name" stroke="#888" />
              <YAxis stroke="#888" />
              <Tooltip contentStyle={{ backgroundColor: '#1a050a', borderColor: '#8B0000', color: '#fff' }} />
              <Legend />
              {config?.lines?.map((key: string, idx: number) => (
                <Line key={key} type="monotone" dataKey={key} stroke={COLORS[idx % COLORS.length]} activeDot={{ r: 8 }} />
              )) || <Line type="monotone" dataKey="value" stroke={COLORS[0]} activeDot={{ r: 8 }} />}
            </LineChart>
          </ResponsiveContainer>
        )
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="name" stroke="#888" />
              <YAxis stroke="#888" />
              <Tooltip contentStyle={{ backgroundColor: '#1a050a', borderColor: '#8B0000', color: '#fff' }} cursor={{ fill: '#333' }} />
              <Legend />
              {config?.bars?.map((key: string, idx: number) => (
                <Bar key={key} dataKey={key} fill={COLORS[idx % COLORS.length]} />
              )) || <Bar dataKey="value" fill={COLORS[0]} />}
            </BarChart>
          </ResponsiveContainer>
        )
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="name" stroke="#888" />
              <YAxis stroke="#888" />
              <Tooltip contentStyle={{ backgroundColor: '#1a050a', borderColor: '#8B0000', color: '#fff' }} />
              <Legend />
              {config?.areas?.map((key: string, idx: number) => (
                <Area key={key} type="monotone" dataKey={key} stroke={COLORS[idx % COLORS.length]} fill={COLORS[idx % COLORS.length]} fillOpacity={0.3} />
              )) || <Area type="monotone" dataKey="value" stroke={COLORS[0]} fill={COLORS[0]} fillOpacity={0.3} />}
            </AreaChart>
          </ResponsiveContainer>
        )
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Tooltip contentStyle={{ backgroundColor: '#1a050a', borderColor: '#8B0000', color: '#fff' }} />
              <Legend />
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={100}
                fill="#8884d8"
                dataKey={config?.dataKey || "value"}
                nameKey={config?.nameKey || "name"}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {data.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        )
      default:
        return <div className="text-red-400 font-mono text-sm p-4">Unsupported chart type: {type}</div>
    }
  }

  return (
    <div className="relative group/artifact my-4 rounded-xl overflow-hidden border border-border-glass bg-abyss flex flex-col shadow-lg">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border-glass bg-black/40">
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-text-dim font-mono uppercase tracking-widest flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-pink-400" />
            Data Visualization
          </span>
          <div className="flex items-center bg-white/5 rounded-md p-0.5">
            <button
              onClick={() => setViewMode('preview')}
              className={`px-2 py-1 text-[11px] rounded flex items-center gap-1.5 transition-colors ${
                viewMode === 'preview' ? 'bg-white/10 text-white' : 'text-text-dim hover:text-white'
              }`}
            >
              <Eye size={12} /> Chart
            </button>
            <button
              onClick={() => setViewMode('code')}
              className={`px-2 py-1 text-[11px] rounded flex items-center gap-1.5 transition-colors ${
                viewMode === 'code' ? 'bg-white/10 text-white' : 'text-text-dim hover:text-white'
              }`}
            >
              <Code size={12} /> Data
            </button>
          </div>
        </div>
        
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-[11px] text-text-dim hover:text-red-bright transition-colors"
        >
          {copied ? <><Check size={12} className="text-green-400" /><span className="text-green-400">Copied!</span></> : <><Copy size={12} /> Copy JSON</>}
        </button>
      </div>

      <div className="relative w-full bg-black/20 overflow-hidden min-h-[200px]">
        {viewMode === 'preview' ? (
          <div className="p-6">
            {renderChart()}
          </div>
        ) : (
          <div className="max-h-[500px] overflow-y-auto">
            <CodeArtifact language={language} code={code} />
          </div>
        )}
      </div>
    </div>
  )
}
