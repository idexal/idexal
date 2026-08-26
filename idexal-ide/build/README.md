# Idexal IDE — Cross-Platform Build System

This directory contains all build configuration for producing professional installers for Windows, macOS, and Linux.

## Quick Start

```bash
# Build for current platform
npm run release:win      # Windows (NSIS + Portable)
npm run release:mac      # macOS (DMG + ZIP)
npm run release:linux    # Linux (AppImage, DEB, RPM, tar.gz)
npm run release:all      # All platforms

# Or use the build script directly
node build/build-release.js win
node build/build-release.js mac
node build/build-release.js linux
node build/build-release.js all

# Build icons from SVG
npm run icons
```

## Build Artifacts

### Windows
| Artifact | Size | Description |
|----------|------|-------------|
| `Idexal-IDE-*-Windows-Setup-x64.exe` | ~94 MB | NSIS installer with wizard, upgrade detection, Start Menu + Desktop shortcuts |
| `Idexal-IDE-*-Windows-Portable-x64.exe` | ~80 MB | Standalone portable exe — no install required |

### macOS
| Artifact | Size | Description |
|----------|------|-------------|
| `Idexal-IDE-*-macOS-x64.dmg` | ~100 MB | DMG with drag-to-Applications installer |
| `Idexal-IDE-*-macOS-arm64.dmg` | ~95 MB | DMG for Apple Silicon (M1/M2/M3/M4) |
| `Idexal-IDE-*-macOS-x64.zip` | ~85 MB | ZIP archive for manual install |
| `Idexal-IDE-*-macOS-arm64.zip` | ~80 MB | ZIP archive for Apple Silicon |

### Linux
| Artifact | Size | Description |
|----------|------|-------------|
| `Idexal-IDE-*-Linux-x64.AppImage` | ~95 MB | Universal Linux binary — chmod +x and run |
| `Idexal-IDE-*-Linux-x64.deb` | ~85 MB | Debian/Ubuntu package |
| `Idexal-IDE-*-Linux-x64.rpm` | ~85 MB | Fedora/RHEL/CentOS package |
| `Idexal-IDE-*-Linux-x64.tar.gz` | ~80 MB | Tarball for manual install |

## NSIS Installer Features (Windows)

The Windows installer (`installer.nsh`) includes:
- **Upgrade detection** — detects previous installation and offers upgrade
- **Running app handling** — detects if Idexal IDE is running and offers to close it
- **Install directory choice** — user can select custom install location
- **Desktop + Start Menu shortcuts** — created automatically
- **License agreement** — MIT license displayed during install
- **Cleanup on uninstall** — removes cache, logs, and temp files

## macOS Features

- **Hardened runtime** — required for notarization
- **Dark mode support** — native dark mode integration
- **Code signing entitlements** — JIT, network, file access permissions
- **Universal binary** — supports both Intel and Apple Silicon

## CI/CD Pipeline

### GitHub Actions Workflows

**`.github/workflows/ci.yml`** — Runs on every push/PR:
1. Lint & TypeScript check
2. Unit tests with coverage
3. Rust engine build + clippy + tests
4. Vite frontend build
5. Desktop builds (matrix: Windows, macOS, Linux)
6. E2E tests with Playwright

**`.github/workflows/release.yml`** — Triggered by version tags (`v*`):
1. Builds all platform artifacts
2. Creates GitHub Release with all installers
3. Generates SHA256 checksums
4. Auto-generates release notes

### Creating a Release

```bash
# Tag and push
git tag v1.0.0
git push origin v1.0.0

# The release workflow will automatically:
# 1. Build all platform installers
# 2. Create a GitHub Release
# 3. Upload all artifacts with checksums
```

## Package Manager Distribution

### Windows (winget)
```bash
# Install
winget install Idexal.IdexalIDE

# Manifest files: build/winget/
```

### Windows (Scoop)
```bash
# Install
scoop bucket add idexal https://github.com/idexal/scoop-bucket
scoop install idexal-ide

# Manifest: build/scoop/idexal-ide.json
```

### Linux (APT/DEB)
```bash
# Install from .deb
sudo dpkg -i Idexal-IDE-*.deb
sudo apt-get install -f  # resolve dependencies

# Or add repo (when available)
echo "deb https://repo.idexal.com stable main" | sudo tee /etc/apt/sources.list.d/idexal.list
sudo apt update && sudo apt install idexal-ide
```

### Linux (RPM)
```bash
sudo rpm -i Idexal-IDE-*.rpm
```

### macOS (Homebrew)
```bash
brew tap idexal/ide https://github.com/idexal/homebrew-ide
brew install --cask idexal-ide
```

## Icon Generation

```bash
# Generate all icons from SVG (requires sharp)
npm install sharp --save-dev
npm run icons
```

Produces:
- `build/icon.ico` — Windows (multi-size: 16–256px)
- `build/icon.icns` — macOS (multi-size: 16–1024px)
- `build/icons/icon_*.png` — Linux (16–512px)

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CSC_LINK` | Code signing certificate path | (none) |
| `CSC_KEY_PASSWORD` | Certificate password | (none) |
| `GH_TOKEN` | GitHub token for publishing | (none) |
| `APPLE_ID` | Apple ID for notarization | (none) |
| `APPLE_APP_SPECIFIC_PASSWORD` | App-specific password for notarization | (none) |

## File Structure

```
build/
├── build-release.js          # Main release builder (Node.js)
├── cross-platform-build.sh   # Cross-platform build script (Bash)
├── create-icons.js           # Icon generation from SVG
├── create-wizard-bitmap.js   # NSIS wizard bitmap generation
├── installer.nsh             # NSIS custom installer macros
├── entitlements.mac.plist    # macOS code signing entitlements
├── mac-dmg.js                # macOS DMG builder
├── icon.ico                  # Windows icon
├── wizard.svg                # NSIS wizard sidebar SVG
├── header.svg                # NSIS wizard header SVG
├── icons/                    # PNG icons for Linux
│   ├── icon_16x16.png
│   ├── icon_32x32.png
│   ├── icon_48x48.png
│   ├── icon_64x64.png
│   ├── icon_128x128.png
│   ├── icon_256x256.png
│   └── icon_512x512.png
├── winget/                   # Windows Package Manager manifests
│   ├── Idexal.IdexalIDE.yaml
│   ├── Idexal.IdexalIDE.installer.yaml
│   └── Idexal.IdexalIDE.locale.en-US.yaml
├── scoop/                    # Scoop package manager manifest
│   └── idexal-ide.json
└── README.md                 # This file
```

## Troubleshooting

### "electron-builder not found"
```bash
npm ci
```

### NSIS installer fails
Ensure `build/icon.ico` exists:
```bash
npm run icons
```

### macOS: "No identity found"
Set up code signing:
```bash
export CSC_LINK=/path/to/certificate.p12
export CSC_KEY_PASSWORD=your-password
```

### Linux: AppImage won't run
```bash
chmod +x Idexal-IDE-*.AppImage
./Idexal-IDE-*.AppImage
```
