#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Idexal IDE — Cross-Platform Build Script
# Build all release packages from a single command.
# Run on the target OS: Windows (Git Bash), Linux, or macOS.
# ═══════════════════════════════════════════════════════════════

set -e

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   🔨 Idexal IDE Release Builder          ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# Step 1: Build frontend
echo "━━━ Step 1/3: Building Vite frontend ━━━"
npx vite build
echo "✓ Frontend built"
echo ""

# Step 2: Build Electron TypeScript
echo "━━━ Step 2/3: Building Electron TypeScript ━━━"
npx tsc -p electron/tsconfig.json
echo "✓ Electron built"
echo ""

# Step 3: Build platform packages
echo "━━━ Step 3/3: Building platform packages ━━━"
echo ""

OS="$(uname -s)"
case "$OS" in
  MINGW*|MSYS*|CYGWIN*)
    echo "🖥  Detected: Windows"
    echo ""
    echo "  Building NSIS installer..."
    npx electron-builder --win nsis --x64 --publish never
    # Rename NSIS before portable overwrites it
    mv -f release/Idexal-IDE-*-Windows-x64.exe release/Idexal-IDE-*-Windows-Setup-x64.exe 2>/dev/null || true
    mv -f release/Idexal-IDE-*-Windows-x64.exe.blockmap release/Idexal-IDE-*-Windows-Setup-x64.exe.blockmap 2>/dev/null || true
    echo ""
    echo "  Building portable EXE..."
    npx electron-builder --win portable --x64 --publish never
    # Rename portable to distinguish
    mv -f release/Idexal-IDE-*-Windows-x64.exe release/Idexal-IDE-*-Windows-Portable-x64.exe 2>/dev/null || true
    echo ""
    echo "✅ Windows builds complete!"
    echo ""
    echo "  📦 Artifacts:"
    ls -lh release/*.exe 2>/dev/null || echo "  (check release/ folder)"
    ;;

  Linux*)
    echo "🐧 Detected: Linux"
    echo ""
    echo "  Building AppImage..."
    npx electron-builder --linux AppImage --x64 --publish never
    echo ""
    echo "  Building DEB..."
    npx electron-builder --linux deb --x64 --publish never
    echo ""
    echo "  Building RPM..."
    npx electron-builder --linux rpm --x64 --publish never
    echo ""
    echo "  Building tar.gz..."
    npx electron-builder --linux tar.gz --x64 --publish never
    echo ""
    echo "✅ Linux builds complete!"
    echo ""
    echo "  📦 Artifacts:"
    ls -lh release/*.AppImage release/*.deb release/*.rpm release/*.tar.gz 2>/dev/null || echo "  (check release/ folder)"
    ;;

  Darwin*)
    echo "🍎 Detected: macOS"
    echo ""
    echo "  Building DMG (x64)..."
    npx electron-builder --mac dmg --x64 --publish never
    echo ""
    echo "  Building DMG (arm64)..."
    npx electron-builder --mac dmg --arm64 --publish never
    echo ""
    echo "  Building ZIP..."
    npx electron-builder --mac zip --x64 --publish never
    echo ""
    echo "✅ macOS builds complete!"
    echo ""
    echo "  📦 Artifacts:"
    ls -lh release/*.dmg release/*.zip 2>/dev/null || echo "  (check release/ folder)"
    ;;

  *)
    echo "❓ Unknown OS: $OS"
    echo "   Supported: Windows, Linux, macOS"
    exit 1
    ;;
esac

echo ""
echo "═══════════════════════════════════════════"
echo "🎉 Build complete! All artifacts in release/"
echo "═══════════════════════════════════════════"
