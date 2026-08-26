const { createDMG } = require('electron-installer-dmg');
const path = require('path');
const fs = require('fs');

const config = {
  appPath: path.join(__dirname, '..', 'release', 'mac-arm64', 'Idexal IDE.app'),
  name: 'Idexal IDE',
  out: path.join(__dirname, '..', 'release'),
  icon: path.join(__dirname, '..', 'build', 'icon.icns'),
  background: path.join(__dirname, '..', 'build', 'dmg-background.png'),
  format: 'ULFO',
  overwrite: true,
  debug: false,
  properties: {
    'code-sign': false,
    'prepare': async (volumePath) => {
      console.log('Preparing DMG contents...');
      
      const applicationsFolder = '/Applications';
      const linkPath = path.join(volumePath, 'Applications');
      
      if (!fs.existsSync(linkPath)) {
        fs.symlinkSync(applicationsFolder, linkPath);
      }
    }
  }
};

async function buildDMG() {
  console.log('Building macOS DMG installer...\n');
  
  try {
    if (!fs.existsSync(config.appPath)) {
      console.log('App not found. Building for macOS first...');
      const { execSync } = require('child_process');
      execSync('npx electron-builder --mac', { 
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
      });
    }
    
    console.log('Creating DMG...');
    await createDMG(config);
    
    console.log('\n✓ DMG installer created successfully!');
    console.log(`Output: ${path.join(config.out, 'Idexal-IDE-mac.dmg')}`);
  } catch (error) {
    console.error('Failed to create DMG:', error);
    process.exit(1);
  }
}

buildDMG();
