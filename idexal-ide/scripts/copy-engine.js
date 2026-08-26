#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════════
// copy-engine.js
//
// Copies the compiled Rust N-API .node file from rust-engine/target/release/
// to electron/native/ for development use.
//
// Run after: cargo build --release
// ══════════════════════════════════════════════════════════════════════

const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const SOURCE = path.join(ROOT, 'rust-engine', 'target', 'release')
const DEST = path.join(ROOT, 'electron', 'native')

// Platform-specific naming
function getNodeFileName() {
  const platform = process.platform
  const arch = process.arch
  const ext = platform === 'win32' ? '.dll' : platform === 'darwin' ? '.dylib' : '.so'
  return `idexal_engine.${platform}-${arch}${ext}`
}

// Also look for the napi-generated .node file
function findNodeFile() {
  const candidates = [
    getNodeFileName(),
    'idexal_engine.node',
  ]

  // Search in release dir
  for (const name of candidates) {
    const fullPath = path.join(SOURCE, name)
    if (fs.existsSync(fullPath)) {
      return fullPath
    }
  }

  // Also check deps dir (cargo sometimes puts it there)
  const depsDir = path.join(SOURCE, 'deps')
  if (fs.existsSync(depsDir)) {
    for (const name of candidates) {
      const fullPath = path.join(depsDir, name)
      if (fs.existsSync(fullPath)) {
        return fullPath
      }
    }
  }

  return null
}

function main() {
  // Ensure destination exists
  if (!fs.existsSync(DEST)) {
    fs.mkdirSync(DEST, { recursive: true })
  }

  const sourceFile = findNodeFile()
  if (!sourceFile) {
    console.warn('[copy-engine] No compiled engine found in rust-engine/target/release/')
    console.warn('[copy-engine] Run `cargo build --release` first')
    process.exit(0) // Don't fail the build — mock engine will be used
  }

  const destName = path.basename(sourceFile)
  const destFile = path.join(DEST, destName)

  fs.copyFileSync(sourceFile, destFile)
  console.log(`[copy-engine] Copied ${destName} -> electron/native/`)

  // Also create a platform-agnostic symlink or copy for the common name
  const symlinkName = `idexal_engine.node`
  const symlinkPath = path.join(DEST, symlinkName)
  if (!fs.existsSync(symlinkPath)) {
    try {
      fs.copyFileSync(destFile, symlinkPath)
      console.log(`[copy-engine] Created ${symlinkName}`)
    } catch {
      // Ignore — not critical
    }
  }
}

main()
