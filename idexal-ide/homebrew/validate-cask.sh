#!/bin/bash
# Validate Homebrew cask formula for Idexal IDE
# Usage: bash validate-cask.sh [version] [sha256]

set -e

VERSION="${1:-1.0.0}"
SHA256="${2:-$(shasum -a 256 ../release/Idexal-IDE-*-macOS-universal.dmg 2>/dev/null | awk '{print $1}')}"
CASK_FILE="idexal-ide.rb"

echo "========================================="
echo "  Homebrew Cask Validation"
echo "========================================="
echo "Version: $VERSION"
echo "SHA256:  ${SHA256:-NOT PROVIDED}"
echo ""

# Create temp directory
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Copy cask file
cp "$CASK_FILE" "$TEMP_DIR/"

# Replace version
sed -i '' "s/version \".*\"/version \"$VERSION\"/" "$TEMP_DIR/idexal-ide.rb" 2>/dev/null || \
sed -i "s/version \".*\"/version \"$VERSION\"/" "$TEMP_DIR/idexal-ide.rb"

# Replace SHA256
if [ -n "$SHA256" ]; then
  sed -i '' "s/sha256 \".*\"/sha256 \"$SHA256\"/" "$TEMP_DIR/idexal-ide.rb" 2>/dev/null || \
  sed -i "s/sha256 \".*\"/sha256 \"$SHA256\"/" "$TEMP_DIR/idexal-ide.rb"
fi

echo "Generated cask:"
echo "-----------------------------------------"
cat "$TEMP_DIR/idexal-ide.rb"
echo "-----------------------------------------"
echo ""

# Validate URL format
URL=$(grep -o 'url "https://github.com/idexal/idexal-ide/releases/download/[^"]*"' "$TEMP_DIR/idexal-ide.rb" | head -1)
if [ -n "$URL" ]; then
  echo "✅ URL format valid"
  echo "   $URL"
else
  echo "❌ URL format invalid"
fi

# Validate sha256 format
if grep -q 'sha256 "[a-f0-9]\{64\}"' "$TEMP_DIR/idexal-ide.rb"; then
  echo "✅ SHA256 format valid"
else
  echo "⚠️  SHA256 placeholder (replace with actual hash)"
fi

# Validate depends_on
if grep -q 'depends_on macos:' "$TEMP_DIR/idexal-ide.rb"; then
  echo "✅ macOS version requirement set"
else
  echo "⚠️  No macOS version requirement"
fi

# Validate zap
if grep -q 'zap trash:' "$TEMP_DIR/idexal-ide.rb"; then
  echo "✅ Zap (cleanup) configured"
else
  echo "⚠️  No zap configuration"
fi

# Validate livecheck
if grep -q 'livecheck do' "$TEMP_DIR/idexal-ide.rb"; then
  echo "✅ Livecheck configured"
else
  echo "⚠️  No livecheck configured"
fi

# Validate app
if grep -q 'app "Idexal IDE.app"' "$TEMP_DIR/idexal-ide.rb"; then
  echo "✅ App bundle configured"
else
  echo "❌ No app bundle configured"
fi

echo ""
echo "========================================="
echo "  Validation Complete"
echo "========================================="
echo ""
echo "To install locally:"
echo "  brew install --cask $TEMP_DIR/idexal-ide.rb"
echo ""
echo "To audit:"
echo "  brew audit --cask $TEMP_DIR/idexal-ide.rb --strict"
