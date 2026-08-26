# Idexal IDE — Homebrew Cask Distribution

## Installation

### From the Tap (Recommended)

```bash
# Add the tap
brew tap idexal/idexal https://github.com/idexal/homebrew-idexal.git

# Install Idexal IDE
brew install --cask idexal-ide
```

### From a Specific Version

```bash
brew install --cask idexal-ide@1.0.0
```

### Update

```bash
brew upgrade --cask idexal-ide
```

### Uninstall

```bash
brew uninstall --cask idexal-ide

# Remove all data (including settings)
brew uninstall --cask --zap idexal-ide
```

## Requirements

- macOS 11.0 (Big Sur) or later
- Apple Silicon (M1/M2/M3) or Intel Mac

## Auto-Update Process

When a new release is tagged (`v1.0.0`, `v1.1.0`, etc.), GitHub Actions automatically:

1. Downloads the macOS DMG from the release
2. Calculates the SHA256 checksum
3. Updates the cask formula in the tap repository
4. Creates a PR for review

### Manual Update

If you need to update the cask manually:

```bash
# Calculate SHA256 of the DMG
shasum -a 256 Idexal-IDE-1.0.0-macOS-universal.dmg

# Update the version and SHA256 in the cask formula
# Then push to the tap repository
```

## Cask Formula Structure

```
homebrew-idexal/
├── Casks/
│   └── idexal-ide.rb    # The cask formula
└── README.md
```

## Cask Formula Details

The cask formula includes:

- **Version tracking** — automatically detects new releases
- **SHA256 verification** — ensures download integrity
- **Architecture support** — works on both Apple Silicon and Intel
- **Zap support** — removes all data on uninstall
- **Livecheck** — Homebrew can check for updates

## Troubleshooting

### "Cask is corrupted"

```bash
brew reinstall --cask idexal-ide
```

### "Already installed"

```bash
brew upgrade --cask idexal-ide
```

### "No cask found"

```bash
brew tap idexal/idexal https://github.com/idexal/homebrew-idexal.git
brew install --cask idexal-ide
```

### Manual Installation (without Homebrew)

1. Download the DMG from [GitHub Releases](https://github.com/idexal/idexal-ide/releases)
2. Open the DMG
3. Drag `Idexal IDE.app` to `/Applications`
4. Eject the DMG

## Signing & Notarization

For production releases, the DMG should be:

1. **Code signed** with an Apple Developer ID certificate
2. **Notarized** by Apple's notary service
3. **Stapled** with the notarization ticket

```bash
# Sign
codesign --sign "Developer ID Application: Idexal (TEAM_ID)" --force --deep "Idexal IDE.app"

# Notarize
xcrun notarytool submit "Idexal-IDE-1.0.0-macOS-universal.dmg" --apple-id "apple@example.com" --team-id "TEAM_ID" --wait

# Staple
xcrun stapler staple "Idexal-IDE-1.0.0-macOS-universal.dmg"
```

## Related Workflows

| Workflow | Purpose |
|---|---|
| `release.yml` | Builds all platforms and creates GitHub Release |
| `homebrew-cask.yml` | Updates Homebrew cask when release is published |
| `winget-publish.yml` | Updates winget manifest when release is published |

## Links

- [Idexal IDE Homepage](https://idexal.com)
- [GitHub Repository](https://github.com/idexal/idexal-ide)
- [Homebrew Tap](https://github.com/idexal/homebrew-idexal)
- [GitHub Releases](https://github.com/idexal/idexal-ide/releases)
