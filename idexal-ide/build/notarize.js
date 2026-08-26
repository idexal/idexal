#!/usr/bin/env node
/**
 * Electron-builder afterSign hook for Apple notarization.
 *
 * This script runs after code signing and submits the app to Apple's
 * notary service for verification. Once notarized, the app passes
 * Gatekeeper on any Mac without warnings.
 *
 * Environment variables required:
 *   APPLE_ID           — Your Apple ID email
 *   APPLE_TEAM_ID      — Your 10-character Apple Developer Team ID
 *   APPLE_APP_PASSWORD — App-specific password (not your Apple ID password)
 *
 * To generate an app-specific password:
 *   1. Go to https://appleid.apple.com/account/manage
 *   2. Sign in with your Apple ID
 *   3. Under "App-Specific Passwords", click "Generate Password"
 *   4. Label it "electron-builder notarization"
 *   5. Copy the generated password
 *
 * Usage:
 *   # Local (with env vars set)
 *   APPLE_ID=you@example.com APPLE_TEAM_ID=ABC123DEF4 APPLE_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx npm run dist:mac
 *
 *   # CI (GitHub Actions)
 *   Set APPLE_ID, APPLE_TEAM_ID, and APPLE_APP_PASSWORD as repository secrets.
 */

const { notarize } = require('@electron/notarize');
const path = require('path');

exports.default = async function afterSign(context) {
  const { electronPlatformName, appOutDir } = context;

  // Only run on macOS
  if (electronPlatformName !== 'darwin') {
    console.log('Skipping notarization: not macOS');
    return;
  }

  // Check if notarization is disabled via env var
  if (process.env.SKIP_NOTARIZATION === 'true') {
    console.log('Skipping notarization: SKIP_NOTARIZATION=true');
    return;
  }

  // Check for required env vars
  const appleId = process.env.APPLE_ID;
  const teamId = process.env.APPLE_TEAM_ID;
  const appPassword = process.env.APPLE_APP_PASSWORD;

  if (!appleId || !teamId || !appPassword) {
    console.warn('⚠️  Skipping notarization: Missing environment variables');
    console.warn('   Required: APPLE_ID, APPLE_TEAM_ID, APPLE_APP_PASSWORD');
    console.warn('   Set these in your .env or CI secrets to enable notarization.');
    console.warn('   Without notarization, macOS users will see Gatekeeper warnings.');
    return;
  }

  // Find the .app bundle
  const appName = context.packager.appInfo.productFilename;
  const appPath = path.join(appOutDir, `${appName}.app`);

  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║        Apple Notarization (notarytool)          ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('');
  console.log(`  App: ${appPath}`);
  console.log(`  Apple ID: ${appleId}`);
  console.log(`  Team ID: ${teamId}`);
  console.log('');

  try {
    // Submit for notarization using notarytool (Xcode 13+)
    // This is the modern approach, replacing the legacy altool
    await notarize({
      appPath,
      appleId,
      appleIdPassword: appPassword,
      teamId,

      // Tool selection: 'notarytool' is recommended (faster, more reliable)
      tool: 'notarytool',

      // Timeout: 30 minutes (notarization can take a while)
      appBundleId: 'com.idexal.ide',

      // Verbose output for debugging
      verbose: process.env.DEBUG === 'true',

      // Log file for debugging (saved to project root)
      logFile: path.join(process.cwd(), 'notarization-log.txt'),
    });

    console.log('');
    console.log('✅ Notarization submitted successfully!');
    console.log('   Apple will verify the app and staple the ticket.');
    console.log('   This may take 5-15 minutes for first-time notarization.');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ Notarization failed!');
    console.error('');
    console.error('  Error:', error.message);
    console.error('');

    // Provide helpful troubleshooting info
    if (error.message.includes('Apple ID')) {
      console.error('  Troubleshooting:');
      console.error('  1. Check your Apple ID is correct');
      console.error('  2. Ensure 2FA is enabled on your Apple ID');
      console.error('  3. Generate a new app-specific password');
      console.error('');
    }

    if (error.message.includes('TEAM_ID') || error.message.includes('team')) {
      console.error('  Troubleshooting:');
      console.error('  1. Check your Team ID (10 characters)');
      console.error('  2. Find it at https://developer.apple.com/account');
      console.error('  3. Ensure you have a paid Apple Developer account');
      console.error('');
    }

    if (error.message.includes('password')) {
      console.error('  Troubleshooting:');
      console.error('  1. Generate a new app-specific password at https://appleid.apple.com');
      console.error('  2. The password format is: xxxx-xxxx-xxxx-xxxx');
      console.error('  3. Do NOT use your Apple ID password');
      console.error('');
    }

    // In CI, fail the build on notarization failure
    if (process.env.CI === 'true') {
      throw error;
    }

    // Locally, warn but don't fail
    console.warn('⚠️  Continuing build without notarization (local mode).');
    console.warn('   The DMG will work but users may see Gatekeeper warnings.');
    console.warn('   Set CI=true to fail the build on notarization failure.');
    console.warn('');
  }
};
