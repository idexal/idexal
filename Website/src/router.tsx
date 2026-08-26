import { Suspense, lazy, useEffect } from 'react'
import { FaIcon } from '@/components/shared/FaIcon'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { i18n } from '@/lib/i18n'
import type { NavItem } from '@/components/dashboard/shared'
import { DashboardLayout } from '@/components/dashboard/shared'
import { MarketingHeader } from '@/components/marketing/Header'
import { MarketingFooter } from '@/components/marketing/Footer'
import { ToastHost } from '@/components/shared/ToastHost'
import { ScrollTopButton } from '@/components/shared/ScrollTopButton'


// Eager: homepage renders instantly.
import { HomePage } from '@/pages/marketing/HomePage'

const PricingPage = lazy(() => import('@/pages/marketing/PricingPage').then((m) => ({ default: m.PricingPage })))
const FeaturesPage = lazy(() => import('@/pages/marketing/FeaturesPage').then((m) => ({ default: m.FeaturesPage })))
const BlogPage = lazy(() => import('@/pages/marketing/BlogPage').then((m) => ({ default: m.BlogPage })))
const BlogPostPage = lazy(() => import('@/pages/marketing/BlogPage').then((m) => ({ default: m.BlogPostPage })))
const BlogCategoryPage = lazy(() => import('@/pages/marketing/BlogPage').then((m) => ({ default: m.BlogCategoryPage })))
const DocsPage = lazy(() => import('@/pages/marketing/DocsPage').then((m) => ({ default: m.DocsPage })))
const ContactPage = lazy(() => import('@/pages/marketing/ContactPage').then((m) => ({ default: m.ContactPage })))
const AboutPage = lazy(() => import('@/pages/marketing/AboutPage').then((m) => ({ default: m.AboutPage })))
const LegalPage = lazy(() => import('@/pages/marketing/StaticPages').then((m) => ({ default: m.LegalPage })))

const LoginPage = lazy(() => import('@/pages/auth/AuthPages').then((m) => ({ default: m.LoginPage })))
const RegisterPage = lazy(() => import('@/pages/auth/AuthPages').then((m) => ({ default: m.RegisterPage })))
const ForgotPasswordPage = lazy(() => import('@/pages/auth/AuthPages').then((m) => ({ default: m.ForgotPasswordPage })))
const VerifyEmailPage = lazy(() => import('@/pages/auth/AuthPages').then((m) => ({ default: m.VerifyEmailPage })))

const UserOverview = lazy(() => import('@/pages/dashboard/UserDashboard').then((m) => ({ default: m.UserOverview })))
const UserProfile = lazy(() => import('@/pages/dashboard/UserDashboard').then((m) => ({ default: m.UserProfile })))
const UserSubscription = lazy(() => import('@/pages/dashboard/UserDashboard').then((m) => ({ default: m.UserSubscription })))
const UserUsage = lazy(() => import('@/pages/dashboard/UserDashboard').then((m) => ({ default: m.UserUsage })))
const UserApiKeys = lazy(() => import('@/pages/dashboard/UserDashboard').then((m) => ({ default: m.UserApiKeys })))
const UserDownloads = lazy(() => import('@/pages/dashboard/UserDashboard').then((m) => ({ default: m.UserDownloads })))
const UserProjects = lazy(() => import('@/pages/dashboard/UserDashboard').then((m) => ({ default: m.UserProjects })))
const UserBilling = lazy(() => import('@/pages/dashboard/UserDashboard').then((m) => ({ default: m.UserBilling })))
const UserSupport = lazy(() => import('@/pages/dashboard/UserDashboard').then((m) => ({ default: m.UserSupport })))
const UserSettings = lazy(() => import('@/pages/dashboard/UserDashboard').then((m) => ({ default: m.UserSettings })))

const AdminUserDetail = lazy(() => import('@/pages/dashboard/AdminDashboard').then((m) => ({ default: m.AdminUserDetail })))

const AdminProviders = lazy(() => import('@/pages/dashboard/AdminDashboard2').then((m) => ({ default: m.AdminProviders })))
const AdminProviderDetail = lazy(() => import('@/pages/dashboard/AdminDashboard2').then((m) => ({ default: m.AdminProviderDetail })))
const AdminProviderConfigure = lazy(() => import('@/pages/dashboard/AdminDashboard2').then((m) => ({ default: m.AdminProviderConfigure })))

const ManagerOverview = lazy(() => import('@/pages/dashboard/ManagerTeamDashboards').then((m) => ({ default: m.ManagerOverview })))
const ManagerTickets = lazy(() => import('@/pages/dashboard/ManagerTeamDashboards').then((m) => ({ default: m.ManagerTickets })))
const ManagerReports = lazy(() => import('@/pages/dashboard/ManagerTeamDashboards').then((m) => ({ default: m.ManagerReports })))
const ManagerTeamPage = lazy(() => import('@/pages/dashboard/ManagerExtra').then((m) => ({ default: m.ManagerTeamPage })))
const ManagerReviewsPage = lazy(() => import('@/pages/dashboard/ManagerExtra').then((m) => ({ default: m.ManagerReviewsPage })))
const TeamHome = lazy(() => import('@/pages/dashboard/ManagerTeamDashboards').then((m) => ({ default: m.TeamDashboardHome })))
const TeamTimeClock = lazy(() => import('@/pages/dashboard/ManagerTeamDashboards').then((m) => ({ default: m.TeamTimeClock })))

const DeveloperPluginDetail = lazy(() => import('@/pages/dashboard/DeveloperDashboard').then((m) => ({ default: m.DeveloperPluginDetail })))
const DeveloperSubmitPlugin = lazy(() => import('@/pages/dashboard/DeveloperDashboard').then((m) => ({ default: m.DeveloperSubmitPlugin })))
const DeveloperPlayground = lazy(() => import('@/pages/dashboard/DeveloperDashboard').then((m) => ({ default: m.DeveloperPlayground })))
const DeveloperApiDocs = lazy(() => import('@/pages/dashboard/DeveloperDashboard').then((m) => ({ default: m.DeveloperApiDocs })))

const FeatureDetailPage = lazy(() => import('@/pages/marketing/FeatureDetailPage').then((m) => ({ default: m.FeatureDetailPage })))
const ModelsPage = lazy(() => import('@/pages/marketing/ModelsPage').then((m) => ({ default: m.ModelsPage })))
const PhilosophyPage = lazy(() => import('@/pages/marketing/PhilosophyPage').then((m) => ({ default: m.PhilosophyPage })))
const SecurityAuditPage = lazy(() => import('@/pages/marketing/SecurityAuditPage').then((m) => ({ default: m.SecurityAuditPage })))
const ApiReferencePage = lazy(() => import('@/pages/marketing/ApiReferencePage').then((m) => ({ default: m.ApiReferencePage })))
const DeveloperUsage = lazy(() => import('@/pages/dashboard/DeveloperUsage').then((m) => ({ default: m.DeveloperUsage })))
const AdminGateway = lazy(() => import('@/pages/dashboard/AdminGateway').then((m) => ({ default: m.AdminGateway })))
const AdminAuditLog = lazy(() => import('@/pages/dashboard/AdminAuditLog').then((m) => ({ default: m.AdminAuditLog })))
const DeveloperWebhooks = lazy(() => import('@/pages/dashboard/DeveloperWebhooks').then((m) => ({ default: m.DeveloperWebhooks })))
const DeveloperLogs = lazy(() => import('@/pages/dashboard/DeveloperLogs').then((m) => ({ default: m.DeveloperLogs })))
const DeveloperKeys = lazy(() => import('@/pages/dashboard/DeveloperKeys').then((m) => ({ default: m.DeveloperKeys })))
const AdminFinancePage = lazy(() => import('@/pages/dashboard/AdminFinancePage').then((m) => ({ default: m.AdminFinancePage })))
const AdminSubscriptionsPage = lazy(() => import('@/pages/dashboard/AdminSubscriptionsPage').then((m) => ({ default: m.AdminSubscriptionsPage })))
const DeveloperModels = lazy(() => import('@/pages/dashboard/DeveloperModels').then((m) => ({ default: m.DeveloperModels })))
const SdkPage = lazy(() => import('@/pages/marketing/SdkPage').then((m) => ({ default: m.SdkPage })))
const AdminProviderHub = lazy(() => import('@/pages/dashboard/AdminProviderHub').then((m) => ({ default: m.AdminProviderHub })))
const AdminModelRegistry = lazy(() => import('@/pages/dashboard/AdminModelRegistry').then((m) => ({ default: m.AdminModelRegistry })))
const AdminUsersPage = lazy(() => import('@/pages/dashboard/AdminUsersPage').then((m) => ({ default: m.AdminUsersPage })))
const AdminContentPage = lazy(() => import('@/pages/dashboard/AdminContentPage').then((m) => ({ default: m.AdminContentPage })))
const AdminPluginsPage = lazy(() => import('@/pages/dashboard/AdminPluginsPage').then((m) => ({ default: m.AdminPluginsPage })))
const DeveloperPluginsMarket = lazy(() => import('@/pages/dashboard/DeveloperPluginsMarket').then((m) => ({ default: m.DeveloperPluginsMarket })))
const DeveloperEarningsPage = lazy(() => import('@/pages/dashboard/DeveloperEarningsPage').then((m) => ({ default: m.DeveloperEarningsPage })))
const AdminSystemPage = lazy(() => import('@/pages/dashboard/AdminSystemPage').then((m) => ({ default: m.AdminSystemPage })))
const AdminAnalyticsPage = lazy(() => import('@/pages/dashboard/AdminAnalyticsPage').then((m) => ({ default: m.AdminAnalyticsPage })))
const AdminSettingsPage = lazy(() => import('@/pages/dashboard/AdminSettingsPage').then((m) => ({ default: m.AdminSettingsPage })))
const AdminOverviewPage = lazy(() => import('@/pages/dashboard/AdminOverviewPage').then((m) => ({ default: m.AdminOverviewPage })))
const AdminSecurityPage = lazy(() => import('@/pages/dashboard/AdminSecurityPage').then((m) => ({ default: m.AdminSecurityPage })))
const DeveloperOverviewPage = lazy(() => import('@/pages/dashboard/DeveloperOverviewPage').then((m) => ({ default: m.DeveloperOverviewPage })))

function NotFound() {
  return (
    <div className="grid-bg flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-7xl font-extrabold gradient-text">404</h1>
      <p className="mt-3 text-lg font-semibold">Page not found</p>
      <p className="mt-1 max-w-md text-sm text-muted">The page you're looking for doesn't exist or has been moved.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <a href="/" className="btn btn-primary px-6 py-2.5">← Back to home</a>
        <a href="/models" className="btn btn-secondary px-6 py-2.5">Explore models</a>
        <a href="/docs" className="btn btn-secondary px-6 py-2.5">Read the docs</a>
      </div>
    </div>
  )
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

function Loading() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4">
      <img src="/icon.png" alt="Idexal" className="h-16 w-16 animate-pulse rounded-2xl" />
      <div className="h-1 w-32 overflow-hidden rounded-full bg-[var(--surface-2)]">
        <div className="h-full w-1/2 animate-loading-bar rounded-full" style={{ background: 'linear-gradient(90deg,#3b82f6,#22d3ee)' }} />
      </div>
    </div>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:start-2 focus:top-2 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <MarketingHeader />
      <main id="main-content" className="flex-1">
        <Suspense fallback={<Loading />}>{children}</Suspense>
      </main>
      <MarketingFooter />
      <ToastHost />
      <ScrollTopButton />
    </div>
  )
}

/* ---------------- Sidebar definitions ---------------- */

const userNav: NavItem[] = [
  { to: '/dashboard', key: 'dash.overview', icon: <FaIcon icon="fa-house" className="h-5 w-5" />, end: true },
  { to: '/dashboard/projects', key: 'dash.projects', icon: <FaIcon icon="fa-folder-tree" className="h-5 w-5" /> },
  { to: '/dashboard/downloads', key: 'dash.downloads', icon: <FaIcon icon="fa-download" className="h-5 w-5" /> },
  { to: '/dashboard/usage', key: 'dash.usage', icon: <FaIcon icon="fa-chart-line" className="h-5 w-5" /> },
  { to: '/dashboard/api-keys', key: 'dash.apiKeys', icon: <FaIcon icon="fa-key" className="h-5 w-5" /> },
  { to: '/dashboard/subscription', key: 'dash.subscription', icon: <FaIcon icon="fa-credit-card" regular className="h-5 w-5" /> },
  { to: '/dashboard/billing', key: 'dash.billing', icon: <FaIcon icon="fa-dollar-sign" className="h-5 w-5" /> },
  { to: '/dashboard/profile', key: 'dash.profile', icon: <FaIcon icon="fa-user" regular className="h-5 w-5" /> },
  { to: '/dashboard/support', key: 'dash.support', icon: <FaIcon icon="fa-life-ring" className="h-5 w-5" /> },
  { to: '/dashboard/settings', key: 'dash.settings', icon: <FaIcon icon="fa-gear" className="h-5 w-5" /> },
]

const adminNav: NavItem[] = [
  { to: '/admin', key: 'dash.overview', icon: <FaIcon icon="fa-table-columns" className="h-5 w-5" />, end: true },
  { to: '/admin/users', key: 'dash.users', icon: <FaIcon icon="fa-user" regular className="h-5 w-5" /> },
  { to: '/admin/subscriptions', key: 'dash.subscriptions', icon: <FaIcon icon="fa-arrows-rotate" className="h-5 w-5" /> },
  { to: '/admin/finance', key: 'dash.finance', icon: <FaIcon icon="fa-dollar-sign" className="h-5 w-5" /> },
  { to: '/admin/providers', key: 'dash.providers', icon: <FaIcon icon="fa-plug-circle-bolt" className="h-5 w-5" /> },
  { to: '/admin/content', key: 'dash.content', icon: <FaIcon icon="fa-file-lines" className="h-5 w-5" /> },
  { to: '/admin/plugins', key: 'dash.plugins', icon: <FaIcon icon="fa-plug" className="h-5 w-5" /> },
  { to: '/admin/analytics', key: 'dash.analytics', icon: <FaIcon icon="fa-chart-column" className="h-5 w-5" /> },
  { to: '/admin/security', key: 'dash.security', icon: <FaIcon icon="fa-shield-halved" className="h-5 w-5" /> },
  { to: '/admin/gateway', key: 'dash.providers', icon: <FaIcon icon="fa-plug-circle-bolt" className="h-5 w-5" /> },
  { to: '/admin/audit', key: 'dash.security', icon: <FaIcon icon="fa-clipboard-list" className="h-5 w-5" /> },
  { to: '/admin/system', key: 'dash.system', icon: <FaIcon icon="fa-server" className="h-5 w-5" /> },
  { to: '/admin/settings', key: 'dash.settings', icon: <FaIcon icon="fa-gear" className="h-5 w-5" /> },
]

const managerNav: NavItem[] = [
  { to: '/manager', key: 'dash.overview', icon: <FaIcon icon="fa-table-columns" className="h-5 w-5" />, end: true },
  { to: '/manager/team', key: 'dash.team', icon: <FaIcon icon="fa-user" regular className="h-5 w-5" /> },
  { to: '/manager/tickets', key: 'dash.tickets', icon: <FaIcon icon="fa-clipboard-list" className="h-5 w-5" /> },
  { to: '/manager/reviews', key: 'dash.reviews', icon: <FaIcon icon="fa-file-lines" className="h-5 w-5" /> },
  { to: '/manager/reports', key: 'dash.reports', icon: <FaIcon icon="fa-chart-column" className="h-5 w-5" /> },
]

const teamNav: NavItem[] = [
  { to: '/team', key: 'dash.myTasks', icon: <FaIcon icon="fa-calendar-days" className="h-5 w-5" />, end: true },
  { to: '/team/time', key: 'dash.reports', icon: <FaIcon icon="fa-wave-square" className="h-5 w-5" /> },
  { to: '/team/chat', key: 'dash.chat', icon: <FaIcon icon="fa-square-terminal" className="h-5 w-5" /> },
]

const devNav: NavItem[] = [
  { to: '/developer', key: 'dash.overview', icon: <FaIcon icon="fa-table-columns" className="h-5 w-5" />, end: true },
  { to: '/developer/api', key: 'dash.api', icon: <FaIcon icon="fa-code" className="h-5 w-5" /> },
  { to: '/developer/models', key: 'models.nav', icon: <FaIcon icon="fa-microchip" className="h-5 w-5" /> },
  { to: '/developer/usage', key: 'dash.usage', icon: <FaIcon icon="fa-chart-line" className="h-5 w-5" /> },
  { to: '/developer/logs', key: 'dash.reports', icon: <FaIcon icon="fa-clipboard-list" className="h-5 w-5" /> },
  { to: '/developer/api-keys', key: 'dash.apiKeys', icon: <FaIcon icon="fa-key" className="h-5 w-5" /> },
  { to: '/developer/webhooks', key: 'dash.notifications', icon: <FaIcon icon="fa-bell" className="h-5 w-5" /> },
  { to: '/developer/playground', key: 'dash.playground', icon: <FaIcon icon="fa-flask" className="h-5 w-5" /> },
  { to: '/developer/plugins', key: 'dash.plugins', icon: <FaIcon icon="fa-box-open" className="h-5 w-5" /> },
  { to: '/developer/sdk', key: 'dash.sdk', icon: <FaIcon icon="fa-boxes-stacked" className="h-5 w-5" /> },
  { to: '/developer/docs', key: 'nav.docs', icon: <FaIcon icon="fa-book-open" className="h-5 w-5" /> },
  { to: '/developer/earnings', key: 'dash.earnings', icon: <FaIcon icon="fa-star" className="h-5 w-5" /> },
]

/* ---------------- App ---------------- */

export function AppRouter() {
  useEffect(() => {
    // English dictionary is fetched like every other locale; the i18n
    // module falls back to it once loaded.
    void i18n.load('en').then(() => i18n.load(i18n.lang))
  }, [])

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <ScrollToTop />
      <Routes>
        {/* ---------- Marketing ---------- */}
        <Route path="/" element={<Shell><HomePage /></Shell>} />
        <Route path="/features" element={<Shell><FeaturesPage /></Shell>} />
        <Route path="/features/:slug" element={<Shell><FeatureDetailPage /></Shell>} />
        <Route path="/models" element={<Shell><ModelsPage /></Shell>} />
        <Route path="/philosophy" element={<Shell><PhilosophyPage /></Shell>} />
        <Route path="/security" element={<Shell><SecurityAuditPage /></Shell>} />
        <Route path="/pricing" element={<Shell><PricingPage /></Shell>} />
        <Route path="/blog" element={<Shell><BlogPage /></Shell>} />
        <Route path="/blog/category/:category" element={<Shell><BlogCategoryPage /></Shell>} />
        <Route path="/blog/:slug" element={<Shell><BlogPostPage /></Shell>} />
        <Route path="/docs/*" element={<Shell><DocsPage /></Shell>} />
        <Route path="/developers" element={<Shell><ApiReferencePage /></Shell>} />
        <Route path="/contact" element={<Shell><ContactPage /></Shell>} />
        <Route path="/about" element={<Shell><AboutPage /></Shell>} />
        <Route path="/terms" element={<Shell><LegalPage kind="terms" /></Shell>} />
        <Route path="/privacy" element={<Shell><LegalPage kind="privacy" /></Shell>} />
        <Route path="/cookies" element={<Shell><LegalPage kind="cookies" /></Shell>} />
        <Route path="/careers" element={<Shell><LegalPage kind="careers" /></Shell>} />
        <Route path="/partners" element={<Shell><LegalPage kind="partners" /></Shell>} />
        <Route path="/changelog" element={<Shell><LegalPage kind="changelog" /></Shell>} />
        <Route path="/status" element={<Shell><LegalPage kind="status" /></Shell>} />

        {/* ---------- Auth ---------- */}
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/register" element={<RegisterPage />} />
        <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/auth/verify-email" element={<VerifyEmailPage />} />

        {/* ---------- User dashboard ---------- */}
        <Route element={<DashboardLayout items={userNav} brandLabel="User" />}>
          <Route path="/dashboard" element={<UserOverview />} />
          <Route path="/dashboard/projects" element={<UserProjects />} />
          <Route path="/dashboard/downloads" element={<UserDownloads />} />
          <Route path="/dashboard/usage" element={<UserUsage />} />
          <Route path="/dashboard/api-keys" element={<UserApiKeys />} />
          <Route path="/dashboard/subscription" element={<UserSubscription />} />
          <Route path="/dashboard/billing" element={<UserBilling />} />
          <Route path="/dashboard/profile" element={<UserProfile />} />
          <Route path="/dashboard/support" element={<UserSupport />} />
          <Route path="/dashboard/settings" element={<UserSettings />} />
        </Route>

        {/* ---------- Admin ---------- */}
        <Route element={<DashboardLayout items={adminNav} brandLabel="Admin" accent="#22d3ee" />}>
          <Route path="/admin" element={<AdminOverviewPage />} />
          <Route path="/admin/users" element={<AdminUsersPage />} />
          <Route path="/admin/users/:id" element={<AdminUserDetail />} />
          <Route path="/admin/subscriptions" element={<AdminSubscriptionsPage />} />
          <Route path="/admin/finance" element={<AdminFinancePage />} />
          <Route path="/admin/providers" element={<AdminProviders />} />
          <Route path="/admin/providers/configure" element={<AdminProviderConfigure />} />
          <Route path="/admin/providers/:id" element={<AdminProviderDetail />} />
          <Route path="/admin/content" element={<AdminContentPage />} />
          <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
          <Route path="/admin/security" element={<AdminSecurityPage />} />
          <Route path="/admin/gateway" element={<AdminGateway />} />
          <Route path="/admin/audit" element={<AdminAuditLog />} />
          <Route path="/admin/plugins" element={<AdminPluginsPage />} />
          <Route path="/admin/provider-hub" element={<AdminProviderHub />} />
          <Route path="/admin/model-registry" element={<AdminModelRegistry />} />
          <Route path="/admin/system" element={<AdminSystemPage />} />
          <Route path="/admin/settings" element={<AdminSettingsPage />} />
        </Route>

        {/* ---------- Manager ---------- */}
        <Route element={<DashboardLayout items={managerNav} brandLabel="Manager" accent="#10b981" />}>
          <Route path="/manager" element={<ManagerOverview />} />
          <Route path="/manager/team" element={<ManagerTeamPage />} />
          <Route path="/manager/tickets" element={<ManagerTickets />} />
          <Route path="/manager/reviews" element={<ManagerReviewsPage />} />
          <Route path="/manager/reports" element={<ManagerReports />} />
        </Route>

        {/* ---------- Team ---------- */}
        <Route element={<DashboardLayout items={teamNav} brandLabel="Team" accent="#f59e0b" />}>
          <Route path="/team" element={<TeamHome />} />
          <Route path="/team/time" element={<TeamTimeClock />} />
          <Route path="/team/chat" element={<TeamHome />} />
        </Route>

        {/* ---------- Developer ---------- */}
        <Route element={<DashboardLayout items={devNav} brandLabel="Dev" accent="#3b82f6" />}>
          <Route path="/developer" element={<DeveloperOverviewPage />} />
          <Route path="/developer/api" element={<DeveloperApiDocs />} />
          <Route path="/developer/usage" element={<DeveloperUsage />} />
          <Route path="/developer/models" element={<DeveloperModels />} />
          <Route path="/developer/webhooks" element={<DeveloperWebhooks />} />
          <Route path="/developer/logs" element={<DeveloperLogs />} />
          <Route path="/developer/api-keys" element={<DeveloperKeys />} />
          <Route path="/developer/playground" element={<DeveloperPlayground />} />
          <Route path="/developer/plugins" element={<DeveloperPluginsMarket />} />
          <Route path="/developer/plugins/submit" element={<DeveloperSubmitPlugin />} />
          <Route path="/developer/plugins/:id" element={<DeveloperPluginDetail />} />
          <Route path="/developer/sdk" element={<SdkPage />} />
          <Route path="/developer/docs" element={<DeveloperApiDocs />} />
          <Route path="/developer/earnings" element={<DeveloperEarningsPage />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}
