/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║              IDEXA CLI PLUGIN COMMAND v1.0                      ║
 * ║    Search, install, manage, and configure plugins              ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import { Command } from 'commander'
import chalk from 'chalk'
import { PluginManager } from '../plugins/manager'
import { PluginRegistry } from '../plugins/registry'
import { PluginCategory } from '../plugins/sdk'

export class PluginCommand {
  static register(program: Command, manager: PluginManager, registry: PluginRegistry): void {
    const cmd = program
      .command('plugins')
      .alias('plugin')
      .description('Search, install, and manage CLI plugins')
      .option('--json', 'Output as JSON')

    // ── idexa plugins search ────────────────────────────────
    cmd
      .command('search')
      .description('Search for plugins in the registry')
      .argument('[query]', 'Search query')
      .option('-c, --category <category>', 'Filter by category')
      .option('-s, --sort <sort>', 'Sort by: downloads, rating, updated, name', 'downloads')
      .option('-p, --page <page>', 'Page number', '1')
      .action(async (query: string, opts: any) => {
        const category = opts.category as PluginCategory | undefined
        const result = await registry.search(query, {
          category,
          sortBy: opts.sort as any,
          page: parseInt(opts.page),
        })

        if (opts.json || program.opts().json) {
          console.log(JSON.stringify(result, null, 2))
          return
        }

        console.log('')
        console.log(chalk.bold(`  🔍 Search results for "${query || 'all'}"`))
        console.log(chalk.dim(`  ${result.total} plugins found (page ${result.page})`))
        console.log('')

        if (result.plugins.length === 0) {
          console.log(chalk.dim('  No plugins found. Try a different search term.'))
          return
        }

        for (const plugin of result.plugins) {
          const installed = manager.isInstalled(plugin.name)
          const status = installed ? chalk.green(' ✅ installed') : ''

          console.log(`  ${plugin.icon || '📦'} ${chalk.bold(plugin.name)}${chalk.dim(` v${plugin.version}`)}${status}`)
          console.log(`    ${chalk.dim(plugin.description)}`)
          console.log(`    ⬇️  ${chalk.cyan(plugin.downloads.toLocaleString())} downloads  ⭐ ${chalk.yellow(plugin.rating.toString())}  📂 ${chalk.dim(plugin.categories.join(', '))}`)
          console.log('')
        }

        console.log(chalk.dim(`  Install with: ${chalk.white('idexa plugins install <name>')}`))
        console.log('')
      })

    // ── idexa plugins list ──────────────────────────────────
    cmd
      .command('list')
      .alias('ls')
      .description('List installed plugins')
      .option('-a, --all', 'Show all including disabled')
      .action(async (opts: any) => {
        const installed = manager.getInstalled()

        if (program.opts().json || opts.json) {
          console.log(JSON.stringify(installed, null, 2))
          return
        }

        console.log('')
        console.log(chalk.bold('  📦 Installed Plugins'))
        console.log('')

        if (installed.length === 0) {
          console.log(chalk.dim('  No plugins installed. Browse with:'))
          console.log(chalk.dim(`  ${chalk.white('idexa plugins search')}`))
          console.log('')
          return
        }

        for (const plugin of installed) {
          const status = plugin.enabled
            ? chalk.green('● enabled')
            : chalk.yellow('○ disabled')
          const error = plugin.error ? chalk.red(` ❌ ${plugin.error}`) : ''

          console.log(`  ${status} ${chalk.bold(plugin.name)}${chalk.dim(` v${plugin.version}`)}${error}`)
        }

        console.log('')
        console.log(chalk.dim(`  ${installed.filter(p => p.enabled).length} enabled, ${installed.filter(p => !p.enabled).length} disabled`))
        console.log('')
      })

    // ── idexa plugins install ───────────────────────────────
    cmd
      .command('install')
      .alias('add')
      .description('Install a plugin from the registry')
      .argument('<name>', 'Plugin name to install')
      .action(async (name: string) => {
        console.log('')
        console.log(chalk.bold(`  🔍 Looking up ${chalk.cyan(name)}...`))

        const plugin = await registry.getPlugin(name)
        if (!plugin) {
          console.log(chalk.red(`  ❌ Plugin "${name}" not found in registry`))
          console.log(chalk.dim(`  Search for available plugins: ${chalk.white('idexa plugins search')}`))
          return
        }

        console.log(chalk.dim(`  Found: ${plugin.description}`))
        console.log(chalk.bold('  ⬇️  Downloading...'))

        try {
          const tempDir = await registry.download(plugin)
          await manager.install(
            {
              name: plugin.name,
              version: plugin.version,
              description: plugin.description,
              author: plugin.author,
              license: plugin.license,
              homepage: plugin.homepage,
              categories: plugin.categories,
              keywords: plugin.keywords,
              icon: plugin.icon,
              main: 'index.js',
            },
            tempDir
          )

          console.log('')
          console.log(chalk.green(`  ✅ ${plugin.name} v${plugin.version} installed successfully!`))
          console.log(chalk.dim(`  Plugin directory: ~/.idexa/plugins/${plugin.name}/`))
          console.log('')
        } catch (err) {
          console.log(chalk.red(`  ❌ Failed to install: ${(err as Error).message}`))
        }
      })

    // ── idexa plugins uninstall ─────────────────────────────
    cmd
      .command('uninstall')
      .alias('remove')
      .description('Uninstall a plugin')
      .argument('<name>', 'Plugin name to uninstall')
      .action(async (name: string) => {
        if (!manager.isInstalled(name)) {
          console.log(chalk.red(`  ❌ Plugin "${name}" is not installed`))
          return
        }

        console.log('')
        await manager.uninstall(name)
        console.log(chalk.green(`  ✅ ${name} uninstalled`))
        console.log('')
      })

    // ── idexa plugins enable ────────────────────────────────
    cmd
      .command('enable')
      .description('Enable a plugin')
      .argument('<name>', 'Plugin name to enable')
      .action(async (name: string) => {
        if (!manager.isInstalled(name)) {
          console.log(chalk.red(`  ❌ Plugin "${name}" is not installed`))
          return
        }

        await manager.enable(name)
        console.log(chalk.green(`  ✅ ${name} enabled`))
      })

    // ── idexa plugins disable ───────────────────────────────
    cmd
      .command('disable')
      .description('Disable a plugin')
      .argument('<name>', 'Plugin name to disable')
      .action(async (name: string) => {
        if (!manager.isInstalled(name)) {
          console.log(chalk.red(`  ❌ Plugin "${name}" is not installed`))
          return
        }

        await manager.disable(name)
        console.log(chalk.yellow(`  ⏸️  ${name} disabled`))
      })

    // ── idexa plugins info ──────────────────────────────────
    cmd
      .command('info')
      .description('Show detailed info about a plugin')
      .argument('<name>', 'Plugin name')
      .action(async (name: string) => {
        const plugin = await registry.getPlugin(name)
        const installed = manager.getInstance(name)
        const isInstalled = manager.isInstalled(name)

        if (program.opts().json) {
          console.log(JSON.stringify({ registry: plugin, installed: isInstalled, runtime: installed?.definition?.manifest }, null, 2))
          return
        }

        console.log('')
        if (plugin) {
          console.log(`  ${plugin.icon || '📦'} ${chalk.bold(plugin.name)}${chalk.dim(` v${plugin.version}`)}`)
          console.log('')
          console.log(`  ${chalk.dim('Description:')}  ${plugin.description}`)
          console.log(`  ${chalk.dim('Author:')}       ${plugin.author}`)
          console.log(`  ${chalk.dim('License:')}      ${plugin.license || 'MIT'}`)
          console.log(`  ${chalk.dim('Downloads:')}    ${plugin.downloads.toLocaleString()}`)
          console.log(`  ${chalk.dim('Rating:')}       ⭐ ${plugin.rating}/5`)
          console.log(`  ${chalk.dim('Categories:')}   ${plugin.categories.join(', ')}`)
          console.log(`  ${chalk.dim('Keywords:')}     ${plugin.keywords.join(', ')}`)
          console.log(`  ${chalk.dim('Updated:')}      ${new Date(plugin.updatedAt).toLocaleDateString()}`)
          if (plugin.homepage) console.log(`  ${chalk.dim('Homepage:')}     ${plugin.homepage}`)
          console.log('')
          console.log(`  ${chalk.dim('Status:')}       ${isInstalled ? chalk.green('Installed') : chalk.dim('Not installed')}`)
          if (isInstalled) {
            const inst = manager.getInstance(name)
            console.log(`  ${chalk.dim('Enabled:')}      ${inst?.enabled ? chalk.green('Yes') : chalk.yellow('No')}`)
            console.log(`  ${chalk.dim('Loaded:')}       ${inst?.loaded ? chalk.green('Yes') : chalk.yellow('No')}`)
          }
        } else {
          console.log(chalk.red(`  ❌ Plugin "${name}" not found in registry`))
        }
        console.log('')
      })

    // ── idexa plugins categories ────────────────────────────
    cmd
      .command('categories')
      .description('List available plugin categories')
      .action(async () => {
        const categories = registry.getCategories()

        if (program.opts().json) {
          console.log(JSON.stringify(categories, null, 2))
          return
        }

        console.log('')
        console.log(chalk.bold('  📂 Plugin Categories'))
        console.log('')

        const catIcons: Record<string, string> = {
          ai: '🤖', linting: '🔍', formatting: '🎨', testing: '🧪',
          deployment: '🚀', database: '🗄️', security: '🛡️', performance: '📈',
          productivity: '⚡', git: '🌿', docker: '🐳', monitoring: '📊',
          documentation: '📚', utilities: '🔧',
        }

        for (const cat of categories) {
          console.log(`  ${catIcons[cat.name] || '📦'} ${chalk.bold(cat.name.padEnd(16))} ${chalk.dim(`${cat.count} plugins`)}  ${chalk.dim(`idexa plugins search -c ${cat.name}`)}`)
        }
        console.log('')
      })

    // ── idexa plugins update ────────────────────────────────
    cmd
      .command('update')
      .description('Update all installed plugins to latest versions')
      .action(async () => {
        const installed = manager.getInstalled()
        console.log('')
        console.log(chalk.bold(`  🔄 Checking ${installed.length} installed plugins for updates...`))
        console.log('')

        if (installed.length === 0) {
          console.log(chalk.dim('  No plugins installed.'))
          return
        }

        let updated = 0
        for (const plugin of installed) {
          const latest = await registry.getPlugin(plugin.name)
          if (latest && latest.version !== plugin.version) {
            console.log(`  📦 ${chalk.bold(plugin.name)}: ${chalk.dim(plugin.version)} → ${chalk.green(latest.version)}`)
            updated++
          } else {
            console.log(`  ✅ ${chalk.bold(plugin.name)}: ${chalk.dim('up to date')}`)
          }
        }

        console.log('')
        if (updated > 0) {
          console.log(chalk.green(`  ${updated} plugin(s) can be updated.`))
          console.log(chalk.dim(`  Update with: ${chalk.white('idexa plugins install <name>')}`))
        } else {
          console.log(chalk.green('  All plugins are up to date!'))
        }
        console.log('')
      })

    // ── idexa plugins (default — list) ──────────────────────
    cmd.action(async () => {
      const installed = manager.getInstalled()

      console.log('')
      console.log(chalk.bold('  📦 Plugin System'))
      console.log('')

      if (installed.length === 0) {
        console.log(chalk.dim('  No plugins installed yet.'))
        console.log('')
        console.log(chalk.dim('  Browse plugins:'))
        console.log(chalk.dim(`    ${chalk.white('idexa plugins search')}              Search the registry`))
        console.log(chalk.dim(`    ${chalk.white('idexa plugins search -c ai')}        Filter by category`))
        console.log(chalk.dim(`    ${chalk.white('idexa plugins install <name>')}       Install a plugin`))
        console.log('')
        return
      }

      console.log(`  ${chalk.dim('Installed:')} ${chalk.bold(String(installed.length))}  ${chalk.dim('|')}  ${chalk.dim('Enabled:')} ${chalk.bold(String(installed.filter(p => p.enabled).length))}`)
      console.log('')

      for (const plugin of installed) {
        const status = plugin.enabled
          ? chalk.green('●')
          : chalk.yellow('○')
        const error = plugin.error ? chalk.red(' ❌') : ''
        console.log(`  ${status} ${chalk.bold(plugin.name)}${chalk.dim(` v${plugin.version}`)}${error}`)
      }

      console.log('')
      console.log(chalk.dim('  Commands:'))
      console.log(chalk.dim(`    ${chalk.white('idexa plugins search')}        Search registry`))
      console.log(chalk.dim(`    ${chalk.white('idexa plugins install <name>')} Install plugin`))
      console.log(chalk.dim(`    ${chalk.white('idexa plugins remove <name>')}  Uninstall plugin`))
      console.log(chalk.dim(`    ${chalk.white('idexa plugins enable <name>')}   Enable plugin`))
      console.log(chalk.dim(`    ${chalk.white('idexa plugins disable <name>')}  Disable plugin`))
      console.log(chalk.dim(`    ${chalk.white('idexa plugins info <name>')}     Plugin details`))
      console.log(chalk.dim(`    ${chalk.white('idexa plugins categories')}       List categories`))
      console.log(chalk.dim(`    ${chalk.white('idexa plugins update')}           Check for updates`))
      console.log('')
    })
  }
}
