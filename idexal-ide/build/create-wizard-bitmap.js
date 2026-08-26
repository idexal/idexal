#!/usr/bin/env node

/**
 * Generate wizard bitmaps for NSIS installer
 * Creates:
 * - wizard.bmp (sidebar: 164x314) - for wizard pages
 * - header.bmp (header: 493x58) - for header area
 *
 * Brand colors: #3b82f6 (blue), #8b5cf6 (purple), #0a0e1a (dark)
 */

const fs = require('fs');
const path = require('path');

const BUILD_DIR = __dirname;

// Brand colors
const BRAND_BLUE = '#3b82f6';
const BRAND_PURPLE = '#8b5cf6';
const BRAND_DARK = '#0a0e1a';
const BRAND_SURFACE = '#111827';

function createWizardSidebarSVG() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="164" height="314" viewBox="0 0 164 314">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${BRAND_DARK};stop-opacity:1" />
      <stop offset="50%" style="stop-color:#0f1729;stop-opacity:1" />
      <stop offset="100%" style="stop-color:${BRAND_DARK};stop-opacity:1" />
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:${BRAND_BLUE};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${BRAND_PURPLE};stop-opacity:1" />
    </linearGradient>
    <linearGradient id="glow" x1="50%" y1="0%" x2="50%" y2="100%">
      <stop offset="0%" style="stop-color:${BRAND_BLUE};stop-opacity:0.15" />
      <stop offset="100%" style="stop-color:${BRAND_BLUE};stop-opacity:0" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="164" height="314" fill="url(#bg)"/>
  
  <!-- Subtle glow effect -->
  <ellipse cx="82" cy="120" rx="80" ry="100" fill="url(#glow)"/>
  
  <!-- Grid pattern -->
  <g opacity="0.05" stroke="${BRAND_BLUE}" stroke-width="0.5" fill="none">
    <line x1="0" y1="40" x2="164" y2="40"/>
    <line x1="0" y1="80" x2="164" y2="80"/>
    <line x1="0" y1="120" x2="164" y2="120"/>
    <line x1="0" y1="160" x2="164" y2="160"/>
    <line x1="0" y1="200" x2="164" y2="200"/>
    <line x1="0" y1="240" x2="164" y2="240"/>
    <line x1="0" y1="280" x2="164" y2="280"/>
    <line x1="41" y1="0" x2="41" y2="314"/>
    <line x1="82" y1="0" x2="82" y2="314"/>
    <line x1="123" y1="0" x2="123" y2="314"/>
  </g>
  
  <!-- Decorative circles -->
  <circle cx="30" cy="60" r="2" fill="${BRAND_BLUE}" opacity="0.3"/>
  <circle cx="140" cy="80" r="1.5" fill="${BRAND_PURPLE}" opacity="0.4"/>
  <circle cx="50" cy="200" r="2.5" fill="${BRAND_BLUE}" opacity="0.2"/>
  <circle cx="120" cy="240" r="1.5" fill="${BRAND_PURPLE}" opacity="0.3"/>
  <circle cx="80" cy="280" r="2" fill="${BRAND_BLUE}" opacity="0.25"/>
  
  <!-- Logo "I" mark -->
  <g transform="translate(82, 100)">
    <!-- Glow behind logo -->
    <circle cx="0" cy="0" r="35" fill="${BRAND_BLUE}" opacity="0.08"/>
    <circle cx="0" cy="0" r="25" fill="${BRAND_BLUE}" opacity="0.05"/>
    
    <!-- Letter I -->
    <rect x="-12" y="-30" width="24" height="60" rx="4" fill="url(#accent)"/>
    <rect x="-18" y="-30" width="36" height="8" rx="4" fill="url(#accent)"/>
    <rect x="-18" y="22" width="36" height="8" rx="4" fill="url(#accent)"/>
  </g>
  
  <!-- Brand name -->
  <text x="82" y="170" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="700" fill="white" text-anchor="middle" letter-spacing="4">IDEXAL</text>
  
  <!-- Accent line -->
  <rect x="52" y="182" width="60" height="1.5" rx="0.75" fill="url(#accent)" opacity="0.6"/>
  
  <!-- Subtitle -->
  <text x="82" y="200" font-family="system-ui, -apple-system, sans-serif" font-size="10" fill="white" text-anchor="middle" opacity="0.5" letter-spacing="2">AI-POWERED IDE</text>
  
  <!-- Version text -->
  <text x="82" y="290" font-family="monospace" font-size="8" fill="${BRAND_BLUE}" text-anchor="middle" opacity="0.4">v1.0.0</text>
  
  <!-- Bottom accent line -->
  <rect x="0" y="310" width="164" height="4" fill="url(#accent)" opacity="0.4"/>
</svg>`;
}

function createHeaderSVG() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="493" height="58" viewBox="0 0 493 58">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:${BRAND_DARK};stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0f1729;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:${BRAND_BLUE};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${BRAND_PURPLE};stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="493" height="58" fill="url(#bg)"/>
  
  <!-- Bottom accent line -->
  <rect x="0" y="56" width="493" height="2" fill="url(#accent)" opacity="0.6"/>
  
  <!-- Subtle grid -->
  <g opacity="0.03" stroke="${BRAND_BLUE}" stroke-width="0.5" fill="none">
    <line x1="0" y1="20" x2="493" y2="20"/>
    <line x1="0" y1="40" x2="493" y2="40"/>
  </g>
  
  <!-- Mini logo -->
  <g transform="translate(30, 29)">
    <rect x="-6" y="-14" width="12" height="28" rx="2" fill="url(#accent)"/>
    <rect x="-9" y="-14" width="18" height="4" rx="2" fill="url(#accent)"/>
    <rect x="-9" y="10" width="18" height="4" rx="2" fill="url(#accent)"/>
  </g>
  
  <!-- Title -->
  <text x="56" y="24" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="600" fill="white" letter-spacing="1">IDEXAL IDE</text>
  <text x="56" y="42" font-family="system-ui, -apple-system, sans-serif" font-size="9" fill="white" opacity="0.4" letter-spacing="0.5">Professional AI-Powered Development Environment</text>
</svg>`;
}

async function generateBitmaps() {
  console.log('🎨 Generating installer bitmaps...\n');
  
  const sidebarSVG = createWizardSidebarSVG();
  const headerSVG = createHeaderSVG();
  
  // Save SVGs
  fs.writeFileSync(path.join(BUILD_DIR, 'wizard.svg'), sidebarSVG);
  fs.writeFileSync(path.join(BUILD_DIR, 'header.svg'), headerSVG);
  console.log('  ✅ Created wizard.svg');
  console.log('  ✅ Created header.svg');
  
  // Try to convert to BMP using sharp
  try {
    const sharp = require('sharp');
    
    // Wizard sidebar (164x314)
    await sharp(Buffer.from(sidebarSVG))
      .resize(164, 314)
      .png()
      .toFile(path.join(BUILD_DIR, 'wizard.png'));
    console.log('  ✅ Created wizard.png (164x314)');
    
    // Header (493x58)
    await sharp(Buffer.from(headerSVG))
      .resize(493, 58)
      .png()
      .toFile(path.join(BUILD_DIR, 'header.png'));
    console.log('  ✅ Created header.png (493x58)');
    
    // Also create BMP if supported
    try {
      await sharp(Buffer.from(sidebarSVG))
        .resize(164, 314)
        .bmp()
        .toFile(path.join(BUILD_DIR, 'wizard.bmp'));
      console.log('  ✅ Created wizard.bmp');
    } catch {
      console.log('  ⚠️  BMP format not supported, using PNG');
    }
    
  } catch (err) {
    console.log('  ⚠️  sharp not available, saving SVG files only');
    console.log('     Install sharp: npm install sharp --save-dev');
  }
  
  console.log('\n✅ Done! Installer bitmaps generated.\n');
  console.log('For NSIS:');
  console.log('  - wizard.bmp / wizard.png → Sidebar image (164x314)');
  console.log('  - header.bmp / header.png → Header image (493x58)');
  console.log('  - icon.ico → Application icon (from build/icon.ico)\n');
}

generateBitmaps().catch(console.error);