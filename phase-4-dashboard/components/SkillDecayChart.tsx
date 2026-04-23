'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface SkillDecayData {
  week_start: string;
  avg_dependency_score: number;
  avg_thinking_depth: number;
}

interface Props {
  data: SkillDecayData[];
}

export default function SkillDecayChart({ data }: Props) {
  const chartData = [...data].reverse().map(row => ({
    week: new Date(row.week_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    dependency: row.avg_dependency_score,
    depth: row.avg_thinking_depth,
  }));

  return (
    <div className="glass-card border-gray-800 p-6 md:p-8 rounded-2xl relative overflow-hidden group">
      <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-amber-500/30 to-transparent"></div>

      <ResponsiveContainer width="100%" height={360}>
        <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-gray-800" vertical={false} />
          <XAxis 
             dataKey="week" 
             stroke="currentColor" 
             className="text-gray-400 dark:text-gray-500"
             tick={{ fill: 'currentColor', fontSize: 13 }} 
             tickLine={false} 
             axisLine={false} 
             dy={10} 
          />
          <YAxis 
             stroke="currentColor" 
             className="text-gray-400 dark:text-gray-500"
             tick={{ fill: 'currentColor', fontSize: 13 }} 
             tickLine={false} 
             axisLine={false} 
             domain={[0, 100]}
          />
          <Tooltip
            contentStyle={{ 
              backgroundColor: 'var(--glass-card-bg)', 
              backdropFilter: 'blur(12px)',
              border: '1px solid var(--glass-card-border)', 
              borderRadius: '12px',
              color: 'var(--text-primary)',
            }}
            itemStyle={{ color: 'var(--text-primary)', fontWeight: 500 }}
          />
          <Line 
            type="monotone" 
            dataKey="dependency" 
            name="Dependency Score (Lower is better)" 
            stroke="#fbbf24" 
            strokeWidth={4}
            dot={{ r: 4, fill: '#fbbf24', strokeWidth: 0 }}
            activeDot={{ r: 6, fill: '#fff', stroke: '#fbbf24', strokeWidth: 2 }}
          />
          <Line 
            type="monotone" 
            dataKey="depth" 
            name="Thinking Depth (Higher is better)" 
            stroke="#3b82f6" 
            strokeWidth={4}
            dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }}
            activeDot={{ r: 6, fill: '#fff', stroke: '#3b82f6', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
