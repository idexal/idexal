/**
 * Sample Extension: Weather Dashboard
 * Demonstrates the Idexal Plugin SDK capabilities.
 *
 * This extension registers:
 * - A custom panel with weather data
 * - A command to refresh weather
 * - A status bar item
 */

import { defineExtension } from '../../services/pluginSDK'
import React, { useState, useEffect } from 'react'

// ── Panel Component ────────────────────────────────────

function WeatherPanel() {
  const [city, setCity] = useState('San Francisco')
  const [weather, setWeather] = useState<{
    temp: number
    condition: string
    humidity: number
    wind: number
  } | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchWeather = async (c: string) => {
    setLoading(true)
    // Simulated weather data
    setTimeout(() => {
      setWeather({
        temp: Math.round(15 + Math.random() * 20),
        condition: ['Sunny', 'Cloudy', 'Rainy', 'Windy'][Math.floor(Math.random() * 4)],
        humidity: Math.round(40 + Math.random() * 40),
        wind: Math.round(5 + Math.random() * 25),
      })
      setLoading(false)
    }, 500)
  }

  useEffect(() => { fetchWeather(city) }, [])

  return (
    <div style={{ padding: 16, color: '#c9d1d9', fontFamily: 'system-ui' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <span style={{ fontSize: 24 }}>🌤️</span>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Weather Dashboard</h2>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          value={city}
          onChange={e => setCity(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && fetchWeather(city)}
          placeholder="City name"
          style={{
            flex: 1, padding: '6px 10px', background: '#161b22', border: '1px solid #30363d',
            borderRadius: 6, color: '#c9d1d9', fontSize: 12, outline: 'none',
          }}
        />
        <button
          onClick={() => fetchWeather(city)}
          disabled={loading}
          style={{
            padding: '6px 12px', background: '#238636', color: '#fff', border: 'none',
            borderRadius: 6, fontSize: 12, cursor: 'pointer',
          }}
        >
          {loading ? '...' : 'Refresh'}
        </button>
      </div>

      {weather && (
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
        }}>
          {[
            { label: 'Temperature', value: `${weather.temp}°C`, icon: '🌡️' },
            { label: 'Condition', value: weather.condition, icon: '☁️' },
            { label: 'Humidity', value: `${weather.humidity}%`, icon: '💧' },
            { label: 'Wind', value: `${weather.wind} km/h`, icon: '🌬️' },
          ].map((item, i) => (
            <div key={i} style={{
              padding: 12, background: '#161b22', border: '1px solid #30363d',
              borderRadius: 8, textAlign: 'center',
            }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>{item.icon}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#58a6ff' }}>{item.value}</div>
              <div style={{ fontSize: 10, color: '#8b949e', marginTop: 2 }}>{item.label}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{
        marginTop: 16, padding: 10, background: '#161b22', border: '1px solid #30363d',
        borderRadius: 8, fontSize: 10, color: '#8b949e',
      }}>
        <strong>Sample Extension</strong> — Demonstrates the Idexal Plugin SDK.
        Register panels, commands, status bar items, and more.
      </div>
    </div>
  )
}

// ── Extension Definition ───────────────────────────────

export default defineExtension({
  manifest: {
    id: 'idexal-sample-weather',
    name: 'Weather Dashboard',
    version: '1.0.0',
    description: 'A sample extension showing weather data in a custom panel',
    author: 'Idexal Team',
    icon: '🌤️',
    tags: ['sample', 'demo', 'panel'],
    contributes: {
      panels: [{
        id: 'weather-dashboard',
        title: 'Weather',
        icon: '🌤️',
        location: 'right',
      }],
      commands: [{
        command: 'weather.refresh',
        title: 'Weather: Refresh',
        category: 'Weather',
      }],
      statusBarItems: [{
        id: 'weather-status',
        text: '🌤️ Weather',
        position: 'right',
        command: 'weather.refresh',
      }],
    },
  },

  activate(ctx) {
    // Register the panel
    ctx.registerPanel({
      id: 'weather-dashboard',
      title: 'Weather',
      icon: '🌤️',
      component: WeatherPanel,
    })

    // Register commands
    ctx.registerCommand({
      id: 'weather.refresh',
      label: 'Refresh Weather',
      category: 'Weather',
      callback: () => {
        ctx.showInformationMessage('Weather refreshed!')
      },
    })

    console.log('[extension] Weather Dashboard activated')
  },

  deactivate() {
    console.log('[extension] Weather Dashboard deactivated')
  },
})
