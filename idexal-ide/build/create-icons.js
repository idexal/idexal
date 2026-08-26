/**
 * Generate application icons from SVG
 * Creates .ico (Windows), .icns (macOS), and PNG icons for all platforms
 * 
 * Usage: node build/create-icons.js
 * 
 * Requires: sharp (npm install sharp --save-dev)
 */

const fs = require('fs');
const path = require('path');

const SVG_TEMPLATE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#6366f1;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#06b6d4;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#22d3ee;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="96" fill="url(#bg)"/>
  <text x="256" y="200" font-family="Arial, sans-serif" font-size="120" font-weight="bold" fill="white" text-anchor="middle">I</text>
  <text x="256" y="320" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="url(#accent)" text-anchor="middle">IDEXAL</text>
  <rect x="128" y="360" width="256" height="4" rx="2" fill="url(#accent)" opacity="0.6"/>
  <text x="256" y="400" font-family="Arial, sans-serif" font-size="24" fill="white" text-anchor="middle" opacity="0.8">IDE</text>
</svg>`;

const ICON_SIZES = [16, 32, 48, 64, 128, 256, 512];

async function createIcons() {
  const buildDir = path.join(__dirname);
  const iconsDir = path.join(buildDir, 'icons');
  
  // Create icons directory
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  // Write SVG source
  fs.writeFileSync(path.join(buildDir, 'icon.svg'), SVG_TEMPLATE);
  console.log('✅ Created icon.svg');

  try {
    // Try to use sharp for icon generation
    const sharp = require('sharp');
    
    // Generate PNG icons
    for (const size of ICON_SIZES) {
      const pngPath = path.join(iconsDir, `icon_${size}x${size}.png`);
      await sharp(Buffer.from(SVG_TEMPLATE))
        .resize(size, size)
        .png()
        .toFile(pngPath);
      console.log(`✅ Created icon_${size}x${size}.png`);
    }

    // Generate .ico for Windows (multi-size)
    const icoSizes = [16, 32, 48, 64, 128, 256];
    const icoBuffers = [];
    for (const size of icoSizes) {
      const buffer = await sharp(Buffer.from(SVG_TEMPLATE))
        .resize(size, size)
        .png()
        .toBuffer();
      icoBuffers.push({ size, buffer });
    }
    
    // Simple ICO format
    const icoHeader = Buffer.alloc(6);
    icoHeader.writeUInt16LE(0, 0); // Reserved
    icoHeader.writeUInt16LE(1, 2); // Type: ICO
    icoHeader.writeUInt16LE(icoBuffers.length, 4); // Number of images
    
    let offset = 6 + (icoBuffers.length * 16);
    const icoDir = [];
    
    for (const { size, buffer } of icoBuffers) {
      const entry = Buffer.alloc(16);
      entry.writeUInt8(size === 256 ? 0 : size, 0); // Width
      entry.writeUInt8(size === 256 ? 0 : size, 1); // Height
      entry.writeUInt8(0, 2); // Color palette
      entry.writeUInt8(0, 3); // Reserved
      entry.writeUInt16LE(1, 4); // Color planes
      entry.writeUInt16LE(32, 6); // Bits per pixel
      entry.writeUInt32LE(buffer.length, 8); // Image size
      entry.writeUInt32LE(offset, 12); // Image offset
      icoDir.push(entry);
      offset += buffer.length;
    }
    
    const icoFile = Buffer.concat([icoHeader, ...icoDir, ...icoBuffers.map(b => b.buffer)]);
    fs.writeFileSync(path.join(buildDir, 'icon.ico'), icoFile);
    console.log('✅ Created icon.ico');

    // Generate .icns for macOS (simplified - uses PNG)
    const icnsSizes = [16, 32, 64, 128, 256, 512, 1024];
    const icnsBuffers = [];
    for (const size of icnsSizes) {
      const buffer = await sharp(Buffer.from(SVG_TEMPLATE))
        .resize(size, size)
        .png()
        .toBuffer();
      const type = size <= 32 ? 'icp4' : size <= 64 ? 'icp5' : size <= 128 ? 'icp6' : 
                   size <= 256 ? 'ic07' : size <= 512 ? 'ic08' : 'ic09';
      const typeBuffer = Buffer.alloc(4);
      typeBuffer.write(type, 'ascii');
      const sizeBuffer = Buffer.alloc(4);
      sizeBuffer.writeUInt32BE(8 + buffer.length, 0);
      icnsBuffers.push(Buffer.concat([typeBuffer, sizeBuffer, buffer]));
    }
    
    const icnsHeader = Buffer.alloc(4);
    icnsHeader.write('icns', 'ascii');
    const icnsSize = 8 + icnsBuffers.reduce((sum, b) => sum + b.length, 0);
    const icnsSizeBuffer = Buffer.alloc(4);
    icnsSizeBuffer.writeUInt32BE(icnsSize, 0);
    const icnsFile = Buffer.concat([icnsHeader, icnsSizeBuffer, ...icnsBuffers]);
    fs.writeFileSync(path.join(buildDir, 'icon.icns'), icnsFile);
    console.log('✅ Created icon.icns');

  } catch (err) {
    console.log('⚠️  sharp not installed, creating placeholder icons');
    console.log('   Install sharp for full icon generation: npm install sharp --save-dev');
    
    // Create placeholder files
    fs.writeFileSync(path.join(buildDir, 'icon.ico'), SVG_TEMPLATE);
    fs.writeFileSync(path.join(buildDir, 'icon.icns'), SVG_TEMPLATE);
    console.log('✅ Created placeholder icon files');
  }

  console.log('\n🎉 Icon generation complete!');
  console.log('   Windows: build/icon.ico');
  console.log('   macOS:   build/icon.icns');
  console.log('   Linux:   build/icons/');
}

createIcons().catch(console.error);
