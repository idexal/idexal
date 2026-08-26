# Apple Notarization Guide

This guide explains how to set up Apple notarization for Idexal IDE so macOS DMGs pass Gatekeeper without warnings.

## Why Notarize?

Starting with macOS 10.15 Catalina, Apple requires all apps distributed outside the App Store to be notarized. Without notarization:

- Users see "Apple cannot check it for malicious software" warning
- Users must right-click → Open to bypass Gatekeeper
- Some enterprise environments block non-notarized apps entirely

With notarization:
- ✅ App opens without any warnings
- ✅ Passes Gatekeeper check
- ✅ Shows as "verified" in System Preferences
- ✅ Works in all enterprise environments

## Prerequisites

1. **Apple Developer Account** ($99/year)
   - https://developer.apple.com/programs/enroll/

2. **Code Signing Certificate**
   - Create a "Developer ID Application" certificate in Xcode or Apple Developer portal
   - Export as `.p12` file with a password

3. **App-Specific Password**
   - Go to https://appleid.apple.com/account/manage
   - Sign in with your Apple ID
   - Under "App-Specific Passwords", click "Generate Password"
   - Label it "electron-builder notarization"
   - Copy the generated password (format: `xxxx-xxxx-xxxx-xxxx`)

## Setup

### 1. GitHub Actions Secrets

Add these secrets to your GitHub repository (Settings → Secrets → Actions):

| Secret | Description | Example |
|--------|-------------|---------|
| `APPLE_ID` | Your Apple ID email | `you@example.com` |
| `APPLE_TEAM_ID` | 10-character Team ID | `ABC123DEF4` |
| `APPLE_APP_PASSWORD` | App-specific password | `xxxx-xxxx-xxxx-xxxx` |
| `CSC_LINK` | Base64-encoded .p12 certificate | `MIII...` (use `base64 -i cert.p12`) |
| `CSC_KEY_PASSWORD` | Certificate password | `your-password` |

#### Generating CSC_LINK

```bash
# Convert .p12 to base64
base64 -i certificate.p12 | pbcopy
# Paste as CSC_LINK secret
```

### 2. Local Development

Create a `.env` file in the project root (never commit this):

```bash
# Apple notarization
APPLE_ID=you@example.com
APPLE_TEAM_ID=ABC123DEF4
APPLE_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx

# Code signing (optional for local builds)
# CSC_LINK=path/to/certificate.p12
# CSC_KEY_PASSWORD=your-password
```

### 3. Build with Notarization

```bash
# macOS build (with notarization)
APPLE_ID=you@example.com \
APPLE_TEAM_ID=ABC123DEF4 \
APPLE_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx \
npm run dist:mac

# Skip notarization (local development)
SKIP_NOTARIZATION=true npm run dist:mac
```

## How It Works

```
npm run dist:mac
    ↓
1. electron-builder builds the .app bundle
    ↓
2. Code signing (CSC_LINK + CSC_KEY_PASSWORD)
    ↓
3. afterSign hook (build/notarize.js)
    ↓
4. Submit to Apple notary service
    ↓
5. Apple scans for malicious code (5-15 min)
    ↓
6. If passed → ticket is stapled to .app
    ↓
7. .app is packaged into .dmg
    ↓
8. DMG passes Gatekeeper ✅
```

## Troubleshooting

### "No identity found for signing"

```bash
# Ensure CSC_LINK is set correctly
echo $CSC_LINK | base64 -d > /tmp/test.p12
security import /tmp/test.p12 -k ~/Library/Keychains/login.keychain
```

### "Could not start notarytool"

```bash
# Ensure Xcode command line tools are installed
xcode-select --install

# Verify notarytool is available
xcrun notarytool --help
```

### "The Apple ID hasn't been used with App Store Connect"

1. Go to https://appstoreconnect.apple.com
2. Sign in with your Apple ID
3. Accept the terms and conditions
4. Try again

### "Password authentication is needed"

1. Generate a new app-specific password at https://appleid.apple.com
2. Ensure 2FA is enabled on your Apple ID
3. Use the new password (format: `xxxx-xxxx-xxxx-xxxx`)

### "Notarization failed: The signature is invalid"

```bash
# Check the signature
codesign --verify --deep --strict "Idexal IDE.app"

# Check entitlements
codesign -d --entitlements - "Idexal IDE.app"
```

### Manual Notarization

If the automated process fails, you can notarize manually:

```bash
# 1. Create a ZIP for submission
ditto -c -k --keepParent "Idexal IDE.app" "Idexal-IDE.zip"

# 2. Submit for notarization
xcrun notarytool submit "Idexal-IDE.zip" \
  --apple-id "you@example.com" \
  --team-id "ABC123DEF4" \
  --password "xxxx-xxxx-xxxx-xxxx" \
  --wait

# 3. Staple the ticket
xcrun stapler staple "Idexal IDE.app"

# 4. Create the DMG
hdiutil create -volname "Idexal IDE" \
  -srcfolder "Idexal IDE.app" \
  -ov -format UDZO \
  "Idexal-IDE-1.0.0-macOS-universal.dmg"
```

## Verification

After notarization, verify the app:

```bash
# Check notarization ticket
spctl --assess --type execute "Idexal IDE.app"
# Should output: source=Notarized Developer ID

# Check DMG
spctl --assess --type open --context context:primary-signature "Idexal-IDE-1.0.0-macOS-universal.dmg"
# Should output: source=Notarized Developer ID

# Verify code signature
codesign --verify --deep --strict "Idexal IDE.app"
# Should output: valid
```

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `APPLE_ID` | Yes | Apple ID email address |
| `APPLE_TEAM_ID` | Yes | 10-character Apple Developer Team ID |
| `APPLE_APP_PASSWORD` | Yes | App-specific password (not Apple ID password) |
| `CSC_LINK` | For signing | Path to .p12 certificate or base64-encoded content |
| `CSC_KEY_PASSWORD` | For signing | Password for the .p12 certificate |
| `SKIP_NOTARIZATION` | No | Set to `true` to skip notarization |
| `CI` | No | Set to `true` to fail build on notarization error |
| `DEBUG` | No | Set to `true` for verbose notarization output |

## Resources

- [Apple Notarization Documentation](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)
- [Electron Code Signing](https://www.electronjs.org/docs/latest/tutorial/code-signing)
- [electron-builder Notarization](https://www.electron.build/notarize-apple)
- [Apple Developer Portal](https://developer.apple.com/account)
- [App Store Connect](https://appstoreconnect.apple.com)
