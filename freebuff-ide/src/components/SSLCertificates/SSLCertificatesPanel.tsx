import React, { useState, useMemo } from 'react'
import {
  Shield, CheckCircle, AlertTriangle, Clock, RefreshCw, Download,
  ChevronDown, ChevronRight, ExternalLink, Copy, Check, Lock, Globe,
  AlertCircle, Calendar, Eye, Trash2
} from 'lucide-react'

interface Certificate {
  id: string
  domain: string
  issuer: string
  type: 'letsencrypt' | 'digicert' | 'custom' | 'self-signed'
  status: 'valid' | 'expiring' | 'expired' | 'revoked'
  validFrom: Date
  validUntil: Date
  autoRenew: boolean
  serialNumber: string
  fingerprint: string
  keySize: number
  algorithm: string
  sans: string[]
}

const MOCK_CERTS: Certificate[] = [
  { id: 'c1', domain: '*.idexal.dev', issuer: "Let's Encrypt", type: 'letsencrypt', status: 'valid', validFrom: new Date(Date.now() - 2592000000), validUntil: new Date(Date.now() + 5184000000), autoRenew: true, serialNumber: '04:a1:b2:c3:d4:e5', fingerprint: 'SHA256:a1b2c3d4e5f6...', keySize: 2048, algorithm: 'RSA', sans: ['*.idexal.dev', 'idexal.dev', 'api.idexal.dev'] },
  { id: 'c2', domain: 'app.idexal.dev', issuer: "Let's Encrypt", type: 'letsencrypt', status: 'valid', validFrom: new Date(Date.now() - 1296000000), validUntil: new Date(Date.now() + 17280000000), autoRenew: true, serialNumber: '05:e6:f7:g8:h9:i0', fingerprint: 'SHA256:e5f6g7h8i9j0...', keySize: 2048, algorithm: 'RSA', sans: ['app.idexal.dev'] },
  { id: 'c3', domain: 'admin.idexal.dev', issuer: 'DigiCert', type: 'digicert', status: 'expiring', validFrom: new Date(Date.now() - 25920000000), validUntil: new Date(Date.now() + 604800000), autoRenew: false, serialNumber: '06:j1:k2:l3:m4:n5', fingerprint: 'SHA256:j1k2l3m4n5o6...', keySize: 4096, algorithm: 'ECDSA', sans: ['admin.idexal.dev', 'staging.idexal.dev'] },
  { id: 'c4', domain: 'legacy.idexal.dev', issuer: 'Custom CA', type: 'custom', status: 'expired', validFrom: new Date(Date.now() - 51840000000), validUntil: new Date(Date.now() - 864000000), autoRenew: false, serialNumber: '07:p6:q7:r8:s9:t0', fingerprint: 'SHA256:p6q7r8s9t0u1...', keySize: 2048, algorithm: 'RSA', sans: ['legacy.idexal.dev'] },
]

const STATUS_CONFIG = {
  valid: { color: 'text-green-400', bg: 'bg-green-400/10', icon: CheckCircle, label: 'Valid' },
  expiring: { color: 'text-yellow-400', bg: 'bg-yellow-400/10', icon: AlertTriangle, label: 'Expiring Soon' },
  expired: { color: 'text-red-400', bg: 'bg-red-400/10', icon: AlertCircle, label: 'Expired' },
  revoked: { color: 'text-red-400', bg: 'bg-red-400/10', icon: AlertCircle, label: 'Revoked' },
}

function timeUntil(date: Date): string {
  const seconds = Math.floor((date.getTime() - Date.now()) / 1000)
  if (seconds <= 0) return 'Expired'
  const days = Math.floor(seconds / 86400)
  if (days > 30) return `${Math.floor(days / 30)} months`
  if (days > 0) return `${days} days`
  const hours = Math.floor(seconds / 3600)
  return `${hours} hours`
}

export default function SSLCertificatesPanel({ onClose }: { onClose: () => void }) {
  const [certs] = useState(MOCK_CERTS)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const stats = useMemo(() => ({
    total: certs.length,
    valid: certs.filter(c => c.status === 'valid').length,
    expiring: certs.filter(c => c.status === 'expiring').length,
    expired: certs.filter(c => c.status === 'expired').length,
  }), [certs])

  const copyText = (text: string, id: string) => {
    navigator.clipboard?.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div className="flex flex-col h-full bg-ide-bg">
      <div className="flex items-center justify-between px-3 py-2 border-b border-ide-border">
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-green-400" />
          <span className="text-sm font-semibold">SSL Certificates</span>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary"><RefreshCw size={14} /></button>
          <button onClick={onClose} className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary">×</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-px bg-ide-border">
        {[
          { label: 'Total', value: stats.total, color: 'text-ide-text' },
          { label: 'Valid', value: stats.valid, color: 'text-green-400' },
          { label: 'Expiring', value: stats.expiring, color: 'text-yellow-400' },
          { label: 'Expired', value: stats.expired, color: 'text-red-400' },
        ].map(s => (
          <div key={s.label} className="bg-ide-bg px-2 py-1.5 text-center">
            <div className={`text-sm font-bold ${s.color}`}>{s.value}</div>
            <div className="text-[10px] text-ide-text-secondary">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {certs.map(cert => {
          const config = STATUS_CONFIG[cert.status]
          const Icon = config.icon
          return (
            <div key={cert.id}>
              <div onClick={() => setExpandedId(expandedId === cert.id ? null : cert.id)} className={`px-3 py-2 border-b border-ide-border/30 hover:bg-ide-bg-secondary/20 cursor-pointer ${config.bg}`}>
                <div className="flex items-center gap-2 mb-1">
                  {expandedId === cert.id ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  <Icon size={12} className={config.color} />
                  <Globe size={12} className="text-ide-text-secondary" />
                  <span className="text-xs font-semibold flex-1 font-mono">{cert.domain}</span>
                  <span className={`text-[10px] ${config.color}`}>{config.label}</span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-ide-text-secondary ml-5">
                  <span>{cert.issuer}</span>
                  <span>Expires {timeUntil(cert.validUntil)}</span>
                  {cert.autoRenew && <span className="text-green-400 flex items-center gap-0.5"><RefreshCw size={8} /> Auto-renew</span>}
                </div>
              </div>
              {expandedId === cert.id && (
                <div className="px-6 pb-3 space-y-2 bg-ide-bg-secondary/10">
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div><span className="text-ide-text-secondary">Type:</span> {cert.type}</div>
                    <div><span className="text-ide-text-secondary">Algorithm:</span> {cert.algorithm} {cert.keySize}</div>
                    <div><span className="text-ide-text-secondary">Valid From:</span> {cert.validFrom.toLocaleDateString()}</div>
                    <div><span className="text-ide-text-secondary">Valid Until:</span> {cert.validUntil.toLocaleDateString()}</div>
                    <div className="col-span-2"><span className="text-ide-text-secondary">Serial:</span> <span className="font-mono">{cert.serialNumber}</span></div>
                    <div className="col-span-2">
                      <span className="text-ide-text-secondary">Fingerprint: </span>
                      <span className="font-mono text-[9px]">{cert.fingerprint}</span>
                      <button onClick={e => { e.stopPropagation(); copyText(cert.fingerprint, cert.id) }} className="ml-1">
                        {copied === cert.id ? <Check size={8} className="text-green-400 inline" /> : <Copy size={8} className="inline" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-ide-text-secondary">SANs:</span>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {cert.sans.map(s => <span key={s} className="px-1.5 py-0.5 bg-ide-bg-secondary rounded text-[10px] font-mono text-green-400">{s}</span>)}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {cert.status === 'expiring' && <button className="px-2 py-0.5 bg-yellow-600/20 text-yellow-400 rounded text-[10px] flex items-center gap-0.5"><RefreshCw size={8} /> Renew Now</button>}
                    <button className="px-2 py-0.5 bg-ide-bg-secondary rounded text-[10px] text-ide-text-secondary flex items-center gap-0.5"><Download size={8} /> Download</button>
                    <button className="px-2 py-0.5 bg-ide-bg-secondary rounded text-[10px] text-ide-text-secondary flex items-center gap-0.5"><Eye size={8} /> Details</button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
