'use client';

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';

interface TokenSaving {
  week_start: string;
  estimated_turns_saved: number;
  estimated_cost_saved_usd: number;
}

interface Props {
  data: TokenSaving[];
}

export default function WeeklyTrendChart({ data }: Props) {
  // Recharts expects data in chronological order
  const chartData = [...data].reverse().map((row) => ({
    week: new Date(row.week_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    turnsSaved: row.estimated_turns_saved,
    costSaved: parseFloat(row.estimated_cost_saved_usd.toFixed(2)),
  }));

  return (
    <div className="glass-card border-[var(--glass-border)] p-6 md:p-8 rounded-2xl relative overflow-hidden group">
      {/* Subtle top edge highlight */}
      <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/30 to-transparent"></div>

      <ResponsiveContainer width="100%" height={360}>
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorTurns" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#818cf8" stopOpacity={0.4}/>
              <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#34d399" stopOpacity={0.4}/>
              <stop offset="95%" stopColor="#34d399" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-gray-800" vertical={false} />
          <XAxis 
             dataKey="week" 
             stroke="currentColor"
             className="text-gray-400 dark:text-gray-500"
             tick={{ fill: 'currentColor', fontSize: 12 }} 
             tickLine={false} 
             axisLine={false} 
             dy={10} 
          />
          <YAxis 
             yAxisId="left" 
             stroke="currentColor"
             className="text-gray-400 dark:text-gray-500"
             tick={{ fill: 'currentColor', fontSize: 12 }} 
             tickLine={false} 
             axisLine={false} 
             tickFormatter={(val) => `${val} T`}
          />
          <YAxis 
             yAxisId="right" 
             orientation="right" 
             stroke="currentColor"
             className="text-gray-400 dark:text-gray-500"
             tick={{ fill: 'currentColor', fontSize: 12 }} 
             tickLine={false} 
             axisLine={false}
             tickFormatter={(val) => `$${val}`}
          />
          <Tooltip
            contentStyle={{ 
              backgroundColor: 'var(--glass-card-bg)', 
              backdropFilter: 'blur(16px)',
              border: '1px solid var(--glass-card-border)', 
              borderRadius: '16px',
              color: 'var(--text-primary)',
              boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.3)'
            }}
            itemStyle={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '13px' }}
            cursor={{ stroke: 'rgba(129, 140, 248, 0.2)', strokeWidth: 2, strokeDasharray: '4 4' }}
          />
          <Area 
            yAxisId="left"
            type="monotone" 
            dataKey="turnsSaved" 
            name="Turns Saved" 
            stroke="#818cf8" 
            strokeWidth={4}
            fillOpacity={1} 
            fill="url(#colorTurns)"
            activeDot={{ r: 6, fill: '#fff', stroke: '#818cf8', strokeWidth: 3 }}
          />
          <Area 
            yAxisId="right"
            type="monotone" 
            dataKey="costSaved" 
            name="Cost Saved ($)" 
            stroke="#10b981" 
            strokeWidth={4}
            fillOpacity={1} 
            fill="url(#colorCost)"
            activeDot={{ r: 6, fill: '#fff', stroke: '#10b981', strokeWidth: 3 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
