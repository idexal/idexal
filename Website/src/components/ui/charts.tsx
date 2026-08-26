import { useId } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

export const PALETTE = ['#3b82f6', '#22d3ee', '#10b981', '#f59e0b', '#ef4444', '#a855f7']

const axisProps = {
  stroke: 'var(--muted)',
  fontSize: 11,
  tickLine: false,
} as const

function tooltipStyle() {
  return {
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    color: 'var(--text)',
    fontSize: 12,
  }
}

export function AreaChartX({ data, dataKey = 'value', height = 260 }: { data: unknown[]; dataKey?: string; height?: number }) {
  const id = useId()
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data as object[]} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
        <defs>
          <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="day" {...axisProps} tick={{ fill: 'var(--muted)', fontSize: 11 }} />
        <YAxis {...axisProps} tick={{ fill: 'var(--muted)', fontSize: 11 }} width={54} />
        <Tooltip contentStyle={tooltipStyle()} />
        <Area type="monotone" dataKey={dataKey} stroke="#3b82f6" strokeWidth={2.2} fill={`url(#grad-${id})`} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function LineChartX({ data, lines, height = 260 }: { data: unknown[]; lines: { key: string; color?: string }[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data as object[]} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="day" {...axisProps} tick={{ fill: 'var(--muted)', fontSize: 11 }} />
        <YAxis {...axisProps} tick={{ fill: 'var(--muted)', fontSize: 11 }} width={54} />
        <Tooltip contentStyle={tooltipStyle()} />
        {lines.length > 1 && <Legend />}
        {lines.map((l) => (
          <Line
            key={l.key}
            type="monotone"
            dataKey={l.key}
            stroke={l.color ?? '#22d3ee'}
            strokeWidth={2.2}
            dot={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}

export function BarChartX({
  data,
  dataKey = 'value',
  layout = 'horizontal' as 'horizontal' | 'vertical',
  colors = PALETTE,
  height = 260,
}: {
  data: Array<Record<string, unknown>>
  dataKey?: string
  layout?: 'horizontal' | 'vertical'
  colors?: string[]
  height?: number
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout={layout} margin={{ top: 8, right: 8, left: layout === 'vertical' ? 30 : -14, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={layout === 'vertical'} horizontal={layout === 'horizontal'} />
        {layout === 'vertical' ? (
          <>
            <XAxis type="number" {...axisProps} tick={{ fill: 'var(--muted)', fontSize: 11 }} />
            <YAxis type="category" dataKey="name" {...axisProps} tick={{ fill: 'var(--text)', fontSize: 12 }} width={110} />
          </>
        ) : (
          <>
            <XAxis dataKey="name" {...axisProps} tick={{ fill: 'var(--muted)', fontSize: 11 }} />
            <YAxis {...axisProps} tick={{ fill: 'var(--muted)', fontSize: 11 }} width={54} />
          </>
        )}
        <Tooltip contentStyle={tooltipStyle()} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
        <Bar dataKey={dataKey} radius={6}>
          {(data as Array<Record<string, unknown>>).map((_, i) => (
            <Cell key={i} fill={colors[i % colors.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export function DonutChartX({ data, height = 240 }: { data: { name: string; value: number }[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="82%" paddingAngle={3} strokeWidth={0}>
          {data.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle()} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: 'var(--muted)' }} />
      </PieChart>
    </ResponsiveContainer>
  )
}
