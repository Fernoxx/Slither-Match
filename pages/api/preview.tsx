import { NextApiRequest, NextApiResponse } from 'next'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { username = 'Player', pfp, mode = 'casual' } = req.query

  // Generate SVG preview
  const svgContent = renderToStaticMarkup(
    <svg width="800" height="418" viewBox="0 0 800 418" xmlns="http://www.w3.org/2000/svg">
      {/* Background gradient */}
      <defs>
        <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#0a0c1a', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#1a1a2e', stopOpacity: 1 }} />
        </linearGradient>
        <linearGradient id="textGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style={{ stopColor: '#00ffff', stopOpacity: 1 }} />
          <stop offset="50%" style={{ stopColor: '#a855f7', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#ec4899', stopOpacity: 1 }} />
        </linearGradient>
      </defs>

      {/* Background */}
      <rect width="800" height="418" fill="url(#bgGradient)" />

      {/* Border */}
      <rect x="2" y="2" width="796" height="414" fill="none" stroke="#2d2d5e" strokeWidth="2" rx="8" />

      {/* Logo/Title */}
      <text x="400" y="80" fontFamily="monospace" fontSize="48" fontWeight="bold" fill="url(#textGradient)" textAnchor="middle">
        🐍 SlitherMatch
      </text>

      {/* Main message */}
      <text x="400" y="180" fontFamily="Arial, sans-serif" fontSize="32" fill="white" textAnchor="middle">
        Join me for a slither match
      </text>

      {/* Game mode and time */}
      <g transform="translate(400, 240)">
        <circle cx="-40" cy="0" r="20" fill="#3b82f6" opacity="0.2" />
        <circle cx="-40" cy="0" r="12" fill="#3b82f6" />
        <text x="0" y="6" fontFamily="Arial, sans-serif" fontSize="18" fill="#94a3b8" textAnchor="middle">
          {mode === 'casual' ? 'FREE' : '1.00'} • 5 min
        </text>
      </g>

      {/* Player info */}
      <g transform="translate(200, 320)">
        {/* Player avatar placeholder */}
        <circle cx="0" cy="0" r="30" fill="#4a5568" />
        <text x="0" y="8" fontFamily="Arial, sans-serif" fontSize="24" fill="white" textAnchor="middle">
          👤
        </text>
        
        {/* Username */}
        <text x="50" y="8" fontFamily="Arial, sans-serif" fontSize="20" fill="white">
          {username}
        </text>
        <text x="50" y="-12" fontFamily="Arial, sans-serif" fontSize="14" fill="#94a3b8">
          1000
        </text>
      </g>

      {/* "You" placeholder */}
      <g transform="translate(600, 320)">
        <circle cx="0" cy="0" r="30" fill="#2d3748" />
        <text x="0" y="8" fontFamily="Arial, sans-serif" fontSize="24" fill="#94a3b8" textAnchor="middle">
          ?
        </text>
        
        <text x="-50" y="8" fontFamily="Arial, sans-serif" fontSize="20" fill="#94a3b8" textAnchor="end">
          You
        </text>
        <text x="-50" y="-12" fontFamily="Arial, sans-serif" fontSize="14" fill="#94a3b8" textAnchor="end">
          ???
        </text>
      </g>

      {/* Active users indicator */}
      <g transform="translate(400, 380)">
        {/* Small avatars */}
        <circle cx="-45" cy="0" r="12" fill="#ef4444" />
        <circle cx="-15" cy="0" r="12" fill="#22c55e" />
        <circle cx="15" cy="0" r="12" fill="#f59e0b" />
        <circle cx="45" cy="0" r="12" fill="#8b5cf6" />
        
        <text x="75" y="5" fontFamily="Arial, sans-serif" fontSize="14" fill="#94a3b8">
          +286 active users
        </text>
      </g>

      {/* Decorative snake elements */}
      <circle cx="100" cy="100" r="8" fill="#00ffd1" opacity="0.6" />
      <circle cx="700" cy="318" r="6" fill="#fc4fff" opacity="0.6" />
      <circle cx="150" cy="350" r="5" fill="#f1ff00" opacity="0.6" />
      <circle cx="650" cy="150" r="7" fill="#ff1f4d" opacity="0.6" />
    </svg>
  )

  // Set content type and send SVG
  res.setHeader('Content-Type', 'image/svg+xml')
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
  res.status(200).send(svgContent)
}