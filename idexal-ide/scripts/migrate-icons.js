#!/usr/bin/env node

/**
 * Automated Icon Migration Script
 * Migrates lucide-react imports to react-icons/fa (Font Awesome)
 *
 * Usage: node scripts/migrate-icons.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '..', 'src');
const DRY_RUN = process.argv.includes('--dry-run');

// Mapping of lucide-react icons to Font Awesome equivalents
const ICON_MAP = {
  // Common icons
  'Search': 'FaSearch',
  'Settings': 'FaCog',
  'Terminal': 'FaTerminal',
  'Code': 'FaCode',
  'FileText': 'FaFileAlt',
  'Folder': 'FaFolder',
  'FolderOpen': 'FaFolderOpen',
  'File': 'FaFile',
  'GitBranch': 'FaCodeBranch',
  'GitCommit': 'FaCodeBranch',
  'GitMerge': 'FaCodeBranch',
  'RefreshCw': 'FaSync',
  'Plus': 'FaPlus',
  'Minus': 'FaMinus',
  'Check': 'FaCheck',
  'X': 'FaTimes',
  'ChevronDown': 'FaChevronDown',
  'ChevronRight': 'FaChevronRight',
  'ChevronLeft': 'FaChevronLeft',
  'ChevronUp': 'FaChevronUp',
  'Upload': 'FaUpload',
  'Download': 'FaDownload',
  'Trash2': 'FaTrash',
  'Trash': 'FaTrash',
  'Copy': 'FaCopy',
  'Edit': 'FaEdit',
  'Save': 'FaSave',
  'Eye': 'FaEye',
  'EyeOff': 'FaEyeSlash',
  'Lock': 'FaLock',
  'Unlock': 'FaUnlock',
  'Key': 'FaKey',
  'User': 'FaUser',
  'Users': 'FaUsers',
  'Heart': 'FaHeart',
  'Star': 'FaStar',
  'Bell': 'FaBell',
  'Mail': 'FaEnvelope',
  'Globe': 'FaGlobe',
  'Link': 'FaLink',
  'ExternalLink': 'FaExternalLinkAlt',
  'Download': 'FaDownload',
  'Upload': 'FaUpload',
  'ArrowRight': 'FaArrowRight',
  'ArrowLeft': 'FaArrowLeft',
  'ArrowUp': 'FaArrowUp',
  'ArrowDown': 'FaArrowDown',
  'Maximize': 'FaExpand',
  'Minimize': 'FaCompress',
  'Maximize2': 'FaExpand',
  'Minimize2': 'FaCompress',
  'Expand': 'FaExpand',
  'Compress': 'FaCompress',
  'MoreHorizontal': 'FaEllipsisV',
  'MoreVertical': 'FaEllipsisV',
  'Filter': 'FaFilter',
  'Sort': 'FaSort',
  'Calendar': 'FaCalendar',
  'Clock': 'FaClock',
  'Database': 'FaDatabase',
  'Server': 'FaServer',
  'Cloud': 'FaCloud',
  'Shield': 'FaShieldAlt',
  'ShieldCheck': 'FaShieldAlt',
  'Zap': 'FaBolt',
  'Bolt': 'FaBolt',
  'Brain': 'FaBrain',
  'Bot': 'FaRobot',
  'Sparkles': 'FaStar',
  'Wand': 'FaMagic',
  'Lightbulb': 'FaLightbulb',
  'Rocket': 'FaRocket',
  'Target': 'FaBullseye',
  'Crosshair': 'FaCrosshairs',
  'Bug': 'FaBug',
  'Beaker': 'FaFlask',
  'Flask': 'FaFlask',
  'TestTube': 'FaFlask',
  'Activity': 'FaChartLine',
  'BarChart': 'FaChartBar',
  'PieChart': 'FaChartPie',
  'TrendingUp': 'FaChartLine',
  'TrendingDown': 'FaChartLine',
  'Hash': 'FaHashtag',
  'AtSign': 'FaAt',
  'Type': 'FaFont',
  'Image': 'FaImage',
  'Camera': 'FaCamera',
  'Video': 'FaVideo',
  'Music': 'FaMusic',
  'Mic': 'FaMicrophone',
  'Volume': 'FaVolumeUp',
  'Play': 'FaPlay',
  'Pause': 'FaPause',
  'Stop': 'FaStop',
  'SkipForward': 'FaForward',
  'SkipBack': 'FaBackward',
  'Rewind': 'FaBackward',
  'FastForward': 'FaForward',
  'RotateCw': 'FaRedo',
  'RotateCcw': 'FaUndo',
  'Redo': 'FaRedo',
  'Undo': 'FaUndo',
  'Scissors': 'FaCut',
  'Clipboard': 'FaClipboard',
  'ClipboardCheck': 'FaClipboardCheck',
  'FileCode': 'FaFileCode',
  'Package': 'FaBox',
  'Box': 'FaBox',
  'Layers': 'FaLayerGroup',
  'Grid': 'FaTh',
  'Layout': 'FaThLarge',
  'Sidebar': 'FaColumns',
  'PanelLeft': 'FaColumns',
  'PanelRight': 'FaColumns',
  'SplitSquareHorizontal': 'FaColumns',
  'SplitSquareVertical': 'FaColumns',
  'Columns': 'FaColumns',
  'Rows': 'FaColumns',
  'List': 'FaList',
  'ListOrdered': 'FaListOl',
  'AlignLeft': 'FaAlignLeft',
  'AlignCenter': 'FaAlignCenter',
  'AlignRight': 'FaAlignRight',
  'Bold': 'FaBold',
  'Italic': 'FaItalic',
  'Underline': 'FaUnderline',
  'Strikethrough': 'FaStrikethrough',
  'Quote': 'FaQuoteRight',
  'Code2': 'FaCode',
  'TerminalSquare': 'FaTerminal',
  'Command': 'FaTerminal',
  'Hash': 'FaHashtag',
  'Globe2': 'FaGlobe',
  'Map': 'FaMap',
  'Compass': 'FaCompass',
  'Navigation': 'FaCompass',
  'Flag': 'FaFlag',
  'Bookmark': 'FaBookmark',
  'Tag': 'FaTag',
  'Tags': 'FaTags',
  'Inbox': 'FaInbox',
  'Send': 'FaPaperPlane',
  'MessageSquare': 'FaComments',
  'MessageCircle': 'FaComment',
  'Phone': 'FaPhone',
  'Video': 'FaVideo',
  'Camera': 'FaCamera',
  'Image': 'FaImage',
  'Paperclip': 'FaPaperclip',
  'Smile': 'FaSmile',
  'Frown': 'FaFrown',
  'Meh': 'FaMeh',
  'ThumbsUp': 'FaThumbsUp',
  'ThumbsDown': 'FaThumbsDown',
  'AlertCircle': 'FaExclamationCircle',
  'AlertTriangle': 'FaExclamationTriangle',
  'Info': 'FaInfoCircle',
  'HelpCircle': 'FaQuestionCircle',
  'CheckCircle': 'FaCheckCircle',
  'XCircle': 'FaTimesCircle',
  'HelpCircle': 'FaQuestionCircle',
  'QuestionMark': 'FaQuestion',
  'Circle': 'FaCircle',
  'Square': 'FaSquare',
  'Triangle': 'FaExclamationTriangle',
  'Diamond': 'FaGem',
  'Hexagon': 'FaHexagon',
  'Octagon': 'FaStop',
  'Pentagon': 'FaPentagon',
  'Star': 'FaStar',
  'Sun': 'FaSun',
  'Moon': 'FaMoon',
  'Cloud': 'FaCloud',
  'CloudRain': 'FaCloudRain',
  'CloudSnow': 'FaCloudSnow',
  'CloudLightning': 'FaCloudLightning',
  'Wind': 'FaWind',
  'Droplet': 'FaTint',
  'Snowflake': 'FaSnowflake',
  'Thermometer': 'FaThermometerHalf',
  'Umbrella': 'FaUmbrella',
  'Sunny': 'FaSun',
  'Cloudy': 'FaCloud',
  'Rainy': 'FaCloudRain',
  'Snowy': 'FaSnowflake',
  'Stormy': 'FaCloudLightning',
  'Windy': 'FaWind',
  'Foggy': 'FaCloud',
  'PartlySunny': 'FaCloudSun',
  'NightClear': 'FaMoon',
  'NightCloudy': 'FaCloudMoon',
  'NightRain': 'FaCloudMoonRain',
  'NightSnow': 'FaCloudMoon',
  'NightStorm': 'FaCloudMoon',
  'NightFog': 'FaCloud',
  'DaySunny': 'FaSun',
  'DayCloudy': 'FaCloudSun',
  'DayRain': 'FaCloudSunRain',
  'DaySnow': 'FaCloudSun',
  'DayStorm': 'FaCloudSun',
  'DayFog': 'FaCloudSun',
  'DayHaze': 'FaCloudSun',
  'DayLightWind': 'FaWind',
  'DayLightning': 'FaCloudSun',
  'DayRainWind': 'FaCloudSunRain',
  'DaySnowWind': 'FaCloudSun',
  'DayStormWind': 'FaCloudSun',
  'NightAltCloudy': 'FaCloudMoon',
  'NightAltLightning': 'FaCloudMoon',
  'NightAltRain': 'FaCloudMoonRain',
  'NightAltSnow': 'FaCloudMoon',
  'NightAltStorm': 'FaCloudMoon',
  'NightAltFog': 'FaCloudMoon',
  'NightAltHaze': 'FaCloudMoon',
  'NightAltLightWind': 'FaWind',
  'NightAltRainWind': 'FaCloudMoonRain',
  'NightAltSnowWind': 'FaCloudMoon',
  'NightAltStormWind': 'FaCloudMoon',
  'Default': 'FaCode',
};

// Counter for stats
let filesProcessed = 0;
let filesModified = 0;
let importsReplaced = 0;

function processFile(filePath) {
  filesProcessed++;

  let content = fs.readFileSync(filePath, 'utf-8');

  // Check if file imports from lucide-react
  if (!content.includes("from 'lucide-react'")) {
    return;
  }

  // Extract all imported lucide icons
  const importMatch = content.match(/import\s*\{([^}]+)\}\s*from\s*'lucide-react'/);
  if (!importMatch) {
    return;
  }

  const imports = importMatch[1].split(',').map(i => i.trim()).filter(i => i);

  // Map each import to FA equivalent
  const faImports = [];
  const unmapped = [];

  for (const imp of imports) {
    if (ICON_MAP[imp]) {
      faImports.push(ICON_MAP[imp]);
    } else {
      unmapped.push(imp);
      // Use FaCode as fallback
      faImports.push('FaCode');
    }
  }

  // Remove duplicates
  const uniqueFAImports = [...new Set(faImports)];

  // Replace the lucide-react import with react-icons/fa import
  const newImport = `import {\n  ${uniqueFAImports.join(', ')}\n} from '../Icon'`;

  content = content.replace(
    /import\s*\{[^}]+\}\s*from\s*'lucide-react'/,
    newImport
  );

  // Replace icon usage in JSX
  for (const imp of imports) {
    const faName = ICON_MAP[imp] || 'FaCode';
    // Replace <IconName with <FaName
    const regex = new RegExp(`<${imp}\\b`, 'g');
    content = content.replace(regex, `<${faName}`);

    // Replace icon={IconName} with icon={FaName}
    const iconPropRegex = new RegExp(`icon\\s*=\\s*\\{\\s*${imp}\\s*\\}`, 'g');
    content = content.replace(iconPropRegex, `icon={${faName}}`);

    // Replace IconName.size with FaName.size (rare but possible)
    const dotRegex = new RegExp(`\\b${imp}\\.`, 'g');
    content = content.replace(dotRegex, `${faName}.`);
  }

  // Fix relative import path based on file location
  const fileDir = path.dirname(filePath);
  const srcDir = path.join(SRC_DIR, 'components');
  const relPath = path.relative(fileDir, srcDir);
  content = content.replace("from '../Icon'", `from '${relPath}/Icon'`);

  fs.writeFileSync(filePath, content);
  filesModified++;
  importsReplaced += imports.length;

  if (unmapped.length > 0) {
    console.log(`  ⚠️  ${path.relative(SRC_DIR, filePath)}: unmapped [${unmapped.join(', ')}]`);
  }

  if (DRY_RUN) {
    console.log(`  📝 Would modify: ${path.relative(SRC_DIR, filePath)}`);
  } else {
    console.log(`  ✅ Modified: ${path.relative(SRC_DIR, filePath)}`);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walkDir(fullPath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      processFile(fullPath);
    }
  }
}

console.log('🔄 Migrating lucide-react to react-icons/fa...\n');

if (DRY_RUN) {
  console.log('📝 DRY RUN - No files will be modified\n');
}

walkDir(SRC_DIR);

console.log('\n📊 Migration Summary:');
console.log(`  Files scanned: ${filesProcessed}`);
console.log(`  Files modified: ${filesModified}`);
console.log(`  Imports replaced: ${importsReplaced}`);

if (!DRY_RUN && filesModified > 0) {
  console.log('\n⚠️  Run these checks after migration:');
  console.log('  1. npx tsc --noEmit');
  console.log('  2. npx vite build');
  console.log('  3. npx vitest run');
}

console.log('\nDone! 🎉');