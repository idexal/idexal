/**
 * Font Awesome — the official icon system for the Idexal platform.
 *
 * Usage:
 *   <FaIcon icon="fa-robot" />                          → solid (default)
 *   <FaIcon icon="fa-github" brand />                   → brands
 *   <FaIcon icon="fa-arrow-left" className="text-xl" /> → custom classes
 *
 * All icons come from @fortawesome/fontawesome-free, imported once in
 * index.css. No per-icon JS components — just <i> elements.
 */
import type { CSSProperties } from 'react'

export function FaIcon({
  icon,
  brand = false,
  regular = false,
  className = '',
  style,
  size,
}: {
  icon: string // e.g. 'fa-robot' (fa- prefix required)
  brand?: boolean
  regular?: boolean
  className?: string
  style?: CSSProperties
  size?: 'xs' | 'sm' | 'lg' | 'xl' | '2xl' | '3xl'
}) {
  const family = brand ? 'fa-brands' : regular ? 'fa-regular' : 'fa-solid'
  const sizeCls = size ? `fa-${size}` : ''
  return <i className={`${family} ${icon} ${sizeCls} ${className}`} style={style} aria-hidden="true" />
}

/**
 * Lucide → Font Awesome mapping. Used by the migration so every legacy
 * <IconName /> renders the equivalent FA glyph with the same props.
 */
export const FA_MAP: Record<string, { icon: string; brand?: boolean; regular?: boolean }> = {
  ArrowLeft: { icon: 'fa-arrow-left' },
  ArrowRight: { icon: 'fa-arrow-right' },
  BadgeCheck: { icon: 'fa-badge-check' },
  BarChart3: { icon: 'fa-chart-column' },
  BookOpen: { icon: 'fa-book-open' },
  Brain: { icon: 'fa-brain' },
  Calculator: { icon: 'fa-calculator' },
  CalendarDays: { icon: 'fa-calendar-days' },
  Check: { icon: 'fa-check' },
  CheckCircle2: { icon: 'fa-circle-check' },
  ChevronDown: { icon: 'fa-chevron-down' },
  ClipboardList: { icon: 'fa-clipboard-list' },
  Code2: { icon: 'fa-code' },
  Coins: { icon: 'fa-coins' },
  Copy: { icon: 'fa-copy', regular: true },
  Cpu: { icon: 'fa-microchip' },
  Download: { icon: 'fa-download' },
  FileText: { icon: 'fa-file-lines' },
  Gauge: { icon: 'fa-gauge-high' },
  GitBranch: { icon: 'fa-code-branch' },
  Github: { icon: 'fa-github', brand: true },
  Globe: { icon: 'fa-globe' },
  Globe2: { icon: 'fa-earth-americas' },
  Info: { icon: 'fa-circle-info' },
  KeyRound: { icon: 'fa-key' },
  Layers: { icon: 'fa-layer-group' },
  Linkedin: { icon: 'fa-linkedin', brand: true },
  LogOut: { icon: 'fa-right-from-bracket' },
  Mail: { icon: 'fa-envelope' },
  MapPin: { icon: 'fa-location-dot' },
  Menu: { icon: 'fa-bars' },
  MessageSquare: { icon: 'fa-message' },
  Minus: { icon: 'fa-minus' },
  Moon: { icon: 'fa-moon', regular: true },
  Phone: { icon: 'fa-phone' },
  Play: { icon: 'fa-play' },
  PlayCircle: { icon: 'fa-circle-play' },
  Puzzle: { icon: 'fa-puzzle-piece' },
  Rocket: { icon: 'fa-rocket' },
  Search: { icon: 'fa-magnifying-glass' },
  Send: { icon: 'fa-paper-plane' },
  ShieldCheck: { icon: 'fa-shield-halved' },
  Sparkles: { icon: 'fa-wand-magic-sparkles' },
  Star: { icon: 'fa-star' },
  Sun: { icon: 'fa-sun', regular: true },
  TerminalSquare: { icon: 'fa-square-terminal' },
  Timer: { icon: 'fa-stopwatch' },
  Twitter: { icon: 'fa-x-twitter', brand: true },
  Wallet: { icon: 'fa-wallet' },
  X: { icon: 'fa-xmark' },
  XCircle: { icon: 'fa-circle-xmark' },
  Youtube: { icon: 'fa-youtube', brand: true },
  Zap: { icon: 'fa-bolt' },
  // Dashboard-only icons
  Activity: { icon: 'fa-wave-square' },
  Ban: { icon: 'fa-ban' },
  BellRing: { icon: 'fa-bell' },
  Boxes: { icon: 'fa-boxes-stacked' },
  Chart_: { icon: 'fa-chart-line' },
  CreditCard: { icon: 'fa-credit-card', regular: true },
  DollarSign: { icon: 'fa-dollar-sign' },
  FlaskConical: { icon: 'fa-flask' },
  FolderKanban: { icon: 'fa-folder-tree' },
  Home: { icon: 'fa-house' },
  LayoutDashboard: { icon: 'fa-table-columns' },
  LifeBuoy: { icon: 'fa-life-ring' },
  LineChart: { icon: 'fa-chart-line' },
  Lock: { icon: 'fa-lock' },
  Package: { icon: 'fa-box-open' },
  PlugZap: { icon: 'fa-plug-circle-bolt' },
  Plus: { icon: 'fa-plus' },
  RefreshCcwDot: { icon: 'fa-arrows-rotate' },
  RefreshCw: { icon: 'fa-arrows-rotate' },
  Save: { icon: 'fa-floppy-disk', regular: true },
  Server: { icon: 'fa-server' },
  Settings: { icon: 'fa-gear' },
  Settings2: { icon: 'fa-sliders' },
  Trash2: { icon: 'fa-trash-can' },
  TrendingUp: { icon: 'fa-arrow-trend-up' },
  Upload: { icon: 'fa-upload' },
  User: { icon: 'fa-user', regular: true },
  UserPlus: { icon: 'fa-user-plus' },
  Users: { icon: 'fa-users' },
}
