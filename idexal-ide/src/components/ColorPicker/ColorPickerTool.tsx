import React, { useState, useMemo } from 'react'
import {
  FaTimes, FaCopy, FaCheck, FaUndo, FaCode
} from '../Icon'

interface ColorPickerToolProps {
  onClose: () => void
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const match = hex.replace('#', '').match(/^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i)
  if (!match) return null
  return { r: parseInt(match[1], 16), g: parseInt(match[2], 16), b: parseInt(match[3], 16) }
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0, l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
    else if (max === g) h = ((b - r) / d + 2) / 6
    else h = ((r - g) / d + 4) / 6
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
}

function generatePalette(hex: string): string[] {
  const rgb = hexToRgb(hex)
  if (!rgb) return []
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
  const palette: string[] = []
  for (let i = 0; i <= 10; i++) {
    const lightness = Math.max(0, Math.min(100, 95 - i * 9))
    const saturation = Math.max(0, Math.min(100, hsl.s + (i < 5 ? 10 : -10)))
    palette.push(hslToHex(hsl.h, saturation, lightness))
  }
  return palette
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

function generateComplementary(hex: string): string[] {
  const rgb = hexToRgb(hex)
  if (!rgb) return []
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
  return [
    hex,
    hslToHex((hsl.h + 30) % 360, hsl.s, hsl.l),
    hslToHex((hsl.h + 60) % 360, hsl.s, hsl.l),
    hslToHex((hsl.h + 180) % 360, hsl.s, hsl.l),
    hslToHex((hsl.h + 210) % 360, hsl.s, hsl.l),
    hslToHex((hsl.h + 240) % 360, hsl.s, hsl.l),
  ]
}

const PRESET_COLORS = [
  '#0ea5e9', '#6366f1', '#10b981', '#f59e0b', '#ef4444',
  '#ec4899', '#8b5cf6', '#14b8a6', '#f97316', '#06b6d4',
  '#84cc16', '#a855f7', '#22d3ee', '#fb923c', '#e879f9',
  '#34d399', '#facc15', '#f43f5e', '#2dd4bf', '#818cf8',
]

export default function ColorPickerTool({ onClose }: ColorPickerToolProps) {
  const [color, setColor] = useState('#0ea5e9')
  const [copied, setCopied] = useState('')
  const [history, setHistory] = useState<string[]>(['#0ea5e9'])

  const rgb = useMemo(() => hexToRgb(color), [color])
  const hsl = useMemo(() => rgb ? rgbToHsl(rgb.r, rgb.g, rgb.b) : null, [rgb])
  const palette = useMemo(() => generatePalette(color), [color])
  const complementary = useMemo(() => generateComplementary(color), [color])

  const copyValue = (label: string, value: string) => {
    navigator.clipboard.writeText(value)
    setCopied(label)
    setTimeout(() => setCopied(''), 2000)
  }

  const handleColorChange = (hex: string) => {
    setColor(hex)
    setHistory(prev => [hex, ...prev.filter(h => h !== hex)].slice(0, 20))
  }

  return (
    <div className="h-full flex flex-col bg-ide-bg overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-ide-border sticky top-0 bg-ide-bg z-10">
        <div className="flex items-center gap-2">
          <FaCode className="w-4 h-4 text-ide-accent" />
          <span className="text-sm font-medium text-ide-text">Color Picker</span>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-ide-border">
          <FaTimes className="w-4 h-4 text-ide-text-muted" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Color Preview + Picker */}
        <div className="flex gap-4">
          <div className="w-32 h-32 rounded-lg border border-ide-border overflow-hidden relative" style={{ backgroundColor: color }}>
            <input
              type="color"
              value={color}
              onChange={e => handleColorChange(e.target.value)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
          <div className="flex-1 space-y-2">
            {/* Hex */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-ide-text-muted w-10">HEX</span>
              <input
                value={color}
                onChange={e => { if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) handleColorChange(e.target.value) }}
                className="flex-1 px-2 py-1 bg-ide-surface border border-ide-border rounded text-xs font-mono text-ide-text outline-none focus:border-ide-accent"
              />
              <button onClick={() => copyValue('hex', color)} className="p-1 rounded hover:bg-ide-border">
                {copied === 'hex' ? <FaCheck className="w-3 h-3 text-green-400" /> : <FaCopy className="w-3 h-3 text-ide-text-muted" />}
              </button>
            </div>
            {/* RGB */}
            {rgb && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-ide-text-muted w-10">RGB</span>
                <span className="flex-1 px-2 py-1 bg-ide-surface rounded text-xs font-mono text-ide-text">
                  {rgb.r}, {rgb.g}, {rgb.b}
                </span>
                <button onClick={() => copyValue('rgb', `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`)} className="p-1 rounded hover:bg-ide-border">
                  {copied === 'rgb' ? <FaCheck className="w-3 h-3 text-green-400" /> : <FaCopy className="w-3 h-3 text-ide-text-muted" />}
                </button>
              </div>
            )}
            {/* HSL */}
            {hsl && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-ide-text-muted w-10">HSL</span>
                <span className="flex-1 px-2 py-1 bg-ide-surface rounded text-xs font-mono text-ide-text">
                  {hsl.h}°, {hsl.s}%, {hsl.l}%
                </span>
                <button onClick={() => copyValue('hsl', `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`)} className="p-1 rounded hover:bg-ide-border">
                  {copied === 'hsl' ? <FaCheck className="w-3 h-3 text-green-400" /> : <FaCopy className="w-3 h-3 text-ide-text-muted" />}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Palette */}
        <div>
          <div className="text-[10px] text-ide-text-muted mb-1.5">Shade Palette</div>
          <div className="flex gap-1">
            {palette.map((hex, i) => (
              <button
                key={i}
                onClick={() => copyValue(`shade-${i}`, hex)}
                className="flex-1 h-8 rounded transition-transform hover:scale-110 relative group"
                style={{ backgroundColor: hex }}
                title={hex}
              >
                <span className="absolute inset-x-0 bottom-0 text-center text-[8px] opacity-0 group-hover:opacity-100 text-white drop-shadow">
                  {hex}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Complementary */}
        <div>
          <div className="text-[10px] text-ide-text-muted mb-1.5">Harmony</div>
          <div className="flex gap-1">
            {complementary.map((hex, i) => (
              <button
                key={i}
                onClick={() => handleColorChange(hex)}
                className="flex-1 h-8 rounded border border-ide-border transition-transform hover:scale-110"
                style={{ backgroundColor: hex }}
                title={hex}
              />
            ))}
          </div>
        </div>

        {/* Preset Colors */}
        <div>
          <div className="text-[10px] text-ide-text-muted mb-1.5">Preset Colors</div>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_COLORS.map(hex => (
              <button
                key={hex}
                onClick={() => handleColorChange(hex)}
                className={`w-7 h-7 rounded border-2 transition-transform hover:scale-110 ${
                  color === hex ? 'border-white scale-110' : 'border-transparent'
                }`}
                style={{ backgroundColor: hex }}
                title={hex}
              />
            ))}
          </div>
        </div>

        {/* Contrast Checker */}
        {rgb && (
          <div>
            <div className="text-[10px] text-ide-text-muted mb-1.5">Contrast on White/Black</div>
            <div className="flex gap-2">
              <div className="flex-1 p-3 rounded border border-ide-border" style={{ backgroundColor: '#ffffff', color }}>
                <div className="text-sm font-medium">Aa White</div>
                <div className="text-[10px]">Sample text</div>
              </div>
              <div className="flex-1 p-3 rounded border border-ide-border" style={{ backgroundColor: '#000000', color }}>
                <div className="text-sm font-medium">Aa Black</div>
                <div className="text-[10px]">Sample text</div>
              </div>
            </div>
          </div>
        )}

        {/* History */}
        {history.length > 1 && (
          <div>
            <div className="text-[10px] text-ide-text-muted mb-1.5">Recent</div>
            <div className="flex gap-1">
              {history.slice(0, 10).map((hex, i) => (
                <button
                  key={`${hex}-${i}`}
                  onClick={() => handleColorChange(hex)}
                  className="w-6 h-6 rounded border border-ide-border"
                  style={{ backgroundColor: hex }}
                  title={hex}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
