#!/usr/bin/env node

/**
 * Idexal IDE Professional Release Builder
 * Builds the application for Windows, macOS, and Linux
 *
 * Usage:
 *   node build/build-release.js [platform]
 *
 * Platforms:
 *   win       - Windows (NSIS installer + portable)
 *   mac       - macOS (DMG + ZIP, x64 + arm64)
 *   linux     - Linux (AppImage, DEB, RPM, tar.gz)
 *   all       - All platforms
 *   portable  - Windows portable only (fastest)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const RELEASE_DIR = path.join(ROOT_DIR, 'release');
const BUILD_DIR = __dirname;

// Read version from package.json to avoid hardcoding
const PKG_VERSION = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8')).version;

// Colors for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function header(msg) {
  console.log('');
  log('═'.repeat(70), 'cyan');
  log(`  ${msg}`, 'bright');
  log('═'.repeat(70), 'cyan');
  console.log('');
}

function step(msg) {
  log(`  ▸ ${msg}`, 'cyan');
}

function success(msg) {
  log(`  ✓ ${msg}`, 'green');
}

function warn(msg) {
  log(`  ⚠ ${msg}`, 'yellow');
}

function error(msg) {
  log(`  ✗ ${msg}`, 'red');
}

function run(cmd, options = {}) {
  log(`  > ${cmd}`, 'dim');
  try {
    execSync(cmd, {
      cwd: ROOT_DIR,
      stdio: 'inherit',
      timeout: options.timeout || 600000, // 10 minutes default
      ...options,
    });
    return true;
  } catch (err) {
    error(`Command failed: ${cmd}`);
    return false;
  }
}

function fileExists(filePath) {
  return fs.existsSync(filePath);
}

function renameFile(from, to) {
  if (fileExists(from)) {
    fs.renameSync(from, to);
    success(`Renamed ${path.basename(from)} → ${path.basename(to)}`);
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getReleaseFiles(platform) {
  if (!fs.existsSync(RELEASE_DIR)) return [];

  const files = fs.readdirSync(RELEASE_DIR);
  const platformFiles = files.filter(f => {
    if (platform === 'win') return f.endsWith('.exe') || f.endsWith('.msi');
    if (platform === 'mac') return f.endsWith('.dmg') || f.endsWith('.zip');
    if (platform === 'linux') return f.endsWith('.AppImage') || f.endsWith('.deb') || f.endsWith('.rpm') || f.endsWith('.tar.gz');
    return true;
  });

  return platformFiles.map(f => {
    const filePath = path.join(RELEASE_DIR, f);
    const stats = fs.statSync(filePath);
    return { name: f, size: stats.size, formatted: formatBytes(stats.size) };
  });
}

function printReleaseSummary(platform) {
  header('Release Summary');

  const files = getReleaseFiles(platform);
  if (files.length === 0) {
    warn('No release files found');
    return;
  }

  log('  Release artifacts:', 'bright');
  console.log('');

  files.forEach((file, i) => {
    const icon = file.name.endsWith('.exe') ? '🪟' :
                 file.name.endsWith('.dmg') ? '🍎' :
                 file.name.endsWith('.AppImage') ? '🐧' :
                 file.name.endsWith('.deb') ? '📦' :
                 file.name.endsWith('.rpm') ? '📦' : '📄';

    log(`  ${icon} ${file.name}`, 'white');
    log(`     ${file.formatted}`, 'dim');
  });

  console.log('');
  log(`  Total files: ${files.length}`, 'bright');
  log(`  Output directory: ${RELEASE_DIR}`, 'dim');
  console.log('');
}

// ============================================
// BUILD FUNCTIONS
// ============================================

function buildVite() {
  step('Building Vite frontend...');
  return run('npx vite build');
}

function buildElectron() {
  step('Building Electron main process...');
  return run('npx tsc -p electron/tsconfig.json');
}

function buildRustEngine() {
  step('Building Rust engine...');
  if (fileExists(path.join(ROOT_DIR, 'rust-engine', 'Cargo.toml'))) {
    return run('cd rust-engine && cargo build --release');
  }
  warn('Rust engine not found, skipping...');
  return true;
}

function generateWizardBitmaps() {
  step('Generating wizard bitmaps...');
  run('node build/create-wizard-bitmap.js');
  return true;
}

function buildWindows() {
  header('Building Windows Release');

  step('Building Vite frontend...');
  if (!buildVite()) return false;

  step('Building Electron main process...');
  if (!buildElectron()) return false;

  // Generate wizard bitmaps
  generateWizardBitmaps();

  // Build NSIS installer first
  step('Building Windows NSIS installer...');
  if (!run('npx electron-builder --win nsis --publish never')) return false;

  // Rename NSIS installer so the portable build doesn't overwrite it
  renameFile(
    path.join(RELEASE_DIR, `Idexal-IDE-${PKG_VERSION}-Windows-x64.exe`),
    path.join(RELEASE_DIR, `Idexal-IDE-${PKG_VERSION}-Windows-Setup-x64.exe`)
  );
  renameFile(
    path.join(RELEASE_DIR, `Idexal-IDE-${PKG_VERSION}-Windows-x64.exe.blockmap`),
    path.join(RELEASE_DIR, `Idexal-IDE-${PKG_VERSION}-Windows-Setup-x64.exe.blockmap`)
  );

  // Build portable
  step('Building Windows portable...');
  if (!run('npx electron-builder --win portable --publish never')) return false;

  // Rename portable
  renameFile(
    path.join(RELEASE_DIR, `Idexal-IDE-${PKG_VERSION}-Windows-x64.exe`),
    path.join(RELEASE_DIR, `Idexal-IDE-${PKG_VERSION}-Windows-Portable-x64.exe`)
  );

  printReleaseSummary('win');
  return true;
}

function buildMacOS() {
  header('Building macOS Release');

  step('Building Vite frontend...');
  if (!buildVite()) return false;

  step('Building Electron main process...');
  if (!buildElectron()) return false;

  step('Building macOS DMG + ZIP (x64 + arm64)...');
  if (!run('npx electron-builder --mac --publish never')) return false;

  printReleaseSummary('mac');
  return true;
}

function buildLinux() {
  header('Building Linux Release');

  step('Building Vite frontend...');
  if (!buildVite()) return false;

  step('Building Electron main process...');
  if (!buildElectron()) return false;

  step('Building Linux AppImage + DEB + RPM...');
  if (!run('npx electron-builder --linux --publish never')) return false;

  printReleaseSummary('linux');
  return true;
}

function buildPortable() {
  header('Building Windows Portable');

  step('Building Vite frontend...');
  if (!buildVite()) return false;

  step('Building Electron main process...');
  if (!buildElectron()) return false;

  step('Building portable executable...');
  if (!run('npx electron-builder --win portable --publish never')) return false;

  // Rename to distinguish from NSIS
  renameFile(
    path.join(RELEASE_DIR, `Idexal-IDE-${PKG_VERSION}-Windows-x64.exe`),
    path.join(RELEASE_DIR, `Idexal-IDE-${PKG_VERSION}-Windows-Portable-x64.exe`)
  );

  printReleaseSummary('win');
  return true;
}

function buildAll() {
  header('Building All Platforms');

  const startTime = Date.now();

  step('Building Vite frontend...');
  if (!buildVite()) return false;

  step('Building Electron main process...');
  if (!buildElectron()) return false;

  // Generate wizard bitmaps
  generateWizardBitmaps();

  // Build each platform
  const platforms = [
    { name: 'Windows', cmd: 'npx electron-builder --win --publish never' },
    { name: 'macOS', cmd: 'npx electron-builder --mac --publish never' },
    { name: 'Linux', cmd: 'npx electron-builder --linux --publish never' },
  ];

  for (const platform of platforms) {
    step(`Building ${platform.name}...`);
    if (!run(platform.cmd)) {
      error(`Failed to build ${platform.name}`);
      continue;
    }
    success(`${platform.name} build complete`);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  log(`\n  Total build time: ${elapsed}s`, 'bright');

  printReleaseSummary('all');
  return true;
}

// ============================================
// MAIN
// ============================================

function main() {
  const platform = process.argv[2] || 'win';

  header(`Idexal IDE Release Builder - ${platform.toUpperCase()}`);

  // Ensure release directory exists
  if (!fs.existsSync(RELEASE_DIR)) {
    fs.mkdirSync(RELEASE_DIR, { recursive: true });
  }

  let success = false;

  switch (platform) {
    case 'win':
    case 'windows':
      success = buildWindows();
      break;
    case 'mac':
    case 'macos':
    case 'darwin':
      success = buildMacOS();
      break;
    case 'linux':
    case 'linux':
      success = buildLinux();
      break;
    case 'portable':
      success = buildPortable();
      break;
    case 'all':
      success = buildAll();
      break;
    default:
      error(`Unknown platform: ${platform}`);
      console.log('\nUsage: node build/build-release.js [win|mac|linux|all|portable]\n');
      process.exit(1);
  }

  if (success) {
    console.log('');
    log('═'.repeat(70), 'green');
    log('  Build completed successfully! 🎉', 'green');
    log('═'.repeat(70), 'green');
    console.log('');
  } else {
    console.log('');
    log('═'.repeat(70), 'red');
    log('  Build failed. Check errors above.', 'red');
    log('═'.repeat(70), 'red');
    console.log('');
    process.exit(1);
  }
}

main();
