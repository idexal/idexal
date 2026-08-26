#!/usr/bin/env node
/**
 * Generate Winget Manifest YAML files for Idexal IDE.
 *
 * Usage:
 *   node generate-winget-manifest.js <version> <installer-url> <sha256>
 *
 * Outputs:
 *   manifests/version.yaml
 *   manifests/installer.yaml
 *   manifests/locale.yaml
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ── Configuration ──────────────────────────────────────────
const PACKAGE_ID = 'Idexal.IdexalIDE';
const MANIFEST_VERSION = '1.6.0';

// ── Parse arguments ─────────────────────────────────────────
const [version, installerUrl, sha256Hash] = process.argv.slice(2);

if (!version || !installerUrl || !sha256Hash) {
  console.error('Usage: node generate-winget-manifest.js <version> <installer-url> <sha256>');
  console.error('Example: node generate-winget-manifest.js 1.0.0 https://github.com/idexal/idexal-ide/releases/download/v1.0.0/Idexal-IDE-1.0.0-Windows-x64.exe abc123...');
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'package.json'), 'utf-8'));

// ── Generate version manifest ──────────────────────────────
const versionManifest = `# yaml-language-server: $schema=https://aka.ms/winget-manifest.version.${MANIFEST_VERSION}.schema.json
PackageIdentifier: ${PACKAGE_ID}
PackageVersion: ${version}
DefaultLocale: en-US
ManifestType: version
ManifestVersion: ${MANIFEST_VERSION}
`;

// ── Generate installer manifest ────────────────────────────
const installerManifest = `# yaml-language-server: $schema=https://aka.ms/winget-manifest.installer.${MANIFEST_VERSION}.schema.json
PackageIdentifier: ${PACKAGE_ID}
PackageVersion: ${version}
Platform:
  - Windows.Desktop
MinimumOSVersion: 10.0.17763.0
InstallerType: nsis
Scope: machine
InstallModes:
  - interactive
  - silent
  - silentWithProgress
InstallerSwitches:
  Silent: /S
  SilentWithProgress: /S
  Custom: /NORESTART
UpgradeBehavior: install
ProductCode: '{2F64C305-63A4-4D5A-8E23-63C208D43B2B}_is1'
Installers:
  - Architecture: x64
    InstallerUrl: ${installerUrl}
    InstallerSha256: ${sha256Hash}
    InstallerLocale: en-US
    ProductCode: '{2F64C305-63A4-4D5A-8E23-63C208D43B2B}_is1'
ManifestType: installer
ManifestVersion: ${MANIFEST_VERSION}
`;

// ── Generate locale manifest ───────────────────────────────
const localeManifest = `# yaml-language-server: $schema=https://aka.ms/winget-manifest.defaultLocale.${MANIFEST_VERSION}.schema.json
PackageIdentifier: ${PACKAGE_ID}
PackageVersion: ${version}
PackageLocale: en-US
Publisher: Idexal
PublisherUrl: https://idexal.com
PublisherSupportUrl: https://github.com/idexal/idexal-ide/issues
PrivacyUrl: https://idexal.com/privacy
Author: Zakariae Lahbabi
PackageName: Idexal IDE
PackageUrl: https://idexal.com
License: MIT
LicenseUrl: https://github.com/idexal/idexal-ide/blob/main/LICENSE
ShortDescription: Professional Multi-Agent AI-Powered IDE with 86 panels, 48 slash commands, and 20 AI tools
Description: |
  Idexal IDE is a professional desktop IDE and AI coding assistant that competes with
  VS Code, Cursor, Claude Code, and Codex. Features include:

  - 86 IDE panels (editor, terminal, git, database, Docker, K8s, etc.)
  - 48 AI slash commands for coding, review, debugging, testing, and deployment
  - 20 AI-powered tools for reading, writing, editing, and searching files
  - Multi-model support (OpenAI, Anthropic, Ollama, custom providers)
  - Real-time CRDT collaboration
  - Plugin/extension system
  - Cross-platform (Windows, macOS, Linux)
  - Built-in security scanning and performance analysis
Moniker: idexal-ide
Tags:
  - ide
  - ai
  - coding
  - editor
  - development
  - multi-agent
  - claude
  - openai
  - copilot
  - vscode
ReleaseNotesUrl: ${installerUrl.split('/download/')[0]}
ManifestType: defaultLocale
ManifestVersion: ${MANIFEST_VERSION}
`;

// ── Write manifest files ───────────────────────────────────
const manifestDir = path.join(__dirname, '..', '..', 'manifests');
if (!fs.existsSync(manifestDir)) {
  fs.mkdirSync(manifestDir, { recursive: true });
}

fs.writeFileSync(path.join(manifestDir, 'version.yaml'), versionManifest);
fs.writeFileSync(path.join(manifestDir, 'installer.yaml'), installerManifest);
fs.writeFileSync(path.join(manifestDir, 'locale.yaml'), localeManifest);

console.log(`Generated winget manifests for v${version}:`);
console.log(`  ${path.join(manifestDir, 'version.yaml')}`);
console.log(`  ${path.join(manifestDir, 'installer.yaml')}`);
console.log(`  ${path.join(manifestDir, 'locale.yaml')}`);
console.log('');
console.log(`To submit: wingetcreate update --id ${PACKAGE_ID} --version ${version} --urls ${installerUrl} --submit`);
console.log(`To install: winget install ${PACKAGE_ID}`);
