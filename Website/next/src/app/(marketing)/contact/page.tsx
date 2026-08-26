import type { Metadata } from 'next'
import { Mail, MapPin, Github, ExternalLink } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Get in touch with the Idexal team. We would love to hear from you.',
}

export default function ContactPage() {
  return (
    <div className="py-20 lg:py-28">
      <div className="container-x">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
              Get in <span className="gradient-text">touch</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Have a question, suggestion, or want to partner? We would love to hear from you.
            </p>
          </div>

          <div className="grid lg:grid-cols-5 gap-12">
            {/* Contact Info */}
            <div className="lg:col-span-2 space-y-6">
              <div className="p-6 rounded-2xl border border-border bg-white dark:bg-surface-900">
                <Mail className="w-5 h-5 text-brand-500 mb-3" />
                <h3 className="font-semibold mb-1">Email</h3>
                <a href="mailto:ide@idexal.com" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  ide@idexal.com
                </a>
                <br />
                <a href="mailto:team@idexal.com" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  team@idexal.com
                </a>
              </div>
              <div className="p-6 rounded-2xl border border-border bg-white dark:bg-surface-900">
                <MapPin className="w-5 h-5 text-brand-500 mb-3" />
                <h3 className="font-semibold mb-1">Location</h3>
                <p className="text-sm text-muted-foreground">Remote-first · Worldwide</p>
              </div>
              <div className="p-6 rounded-2xl border border-border bg-white dark:bg-surface-900">
                <Github className="w-5 h-5 text-brand-500 mb-3" />
                <h3 className="font-semibold mb-1">Open Source</h3>
                <div className="space-y-1 mt-2">
                  <a href="https://github.com/idexal/idexal-ide" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <ExternalLink className="w-3 h-3" /> idexal/idexal-ide
                  </a>
                  <a href="https://github.com/idexal/idexa-cli" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <ExternalLink className="w-3 h-3" /> idexal/idexa-cli
                  </a>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="lg:col-span-3">
              <form className="p-8 rounded-2xl border border-border bg-white dark:bg-surface-900 space-y-5">
                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Name</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all"
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Email</label>
                    <input
                      type="email"
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Subject</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all"
                    placeholder="How can we help?"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Message</label>
                  <textarea
                    rows={5}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all resize-none"
                    placeholder="Tell us more..."
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white gradient-brand hover:opacity-90 transition-opacity shadow-lg shadow-brand-500/25"
                >
                  Send Message
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
