'use client';

/**
 * SkillDecayChart Component — Phase 4, Task 4.4
 *
 * 3-line Recharts LineChart:
 *   - Dependency Score   (orange — going down = good)
 *   - Thinking Depth     (blue   — going up = good)
 *   - Self-Solve Rate %  (green  — going up = good)
 *
 * X axis = week_start labels
 */

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

interface WeekRow {
  week_start: string;
  avg_dependency_score: number;
  avg_thinking_depth: number;
  self_solve_rate: number;
}

interface Props {
  data: WeekRow[];
}

export default function SkillDecayChart({ data }: Props) {
  const chartData = data.map((row) => ({
    week: new Date(row.week_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    dependency: Math.round(row.avg_dependency_score),
    thinking:   Math.round(row.avg_thinking_depth),
    selfSolve:  Math.round(row.self_solve_rate * 100),
  }));

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={chartData} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="week" stroke="#9ca3af" tick={{ fontSize: 12 }} />
        <YAxis stroke="#9ca3af" tick={{ fontSize: 12 }} domain={[0, 100]} />
        <Tooltip
          contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
          labelStyle={{ color: '#e5e7eb' }}
        />
        <Legend />
        <Line type="monotone" dataKey="dependency" name="Dependency ↓" stroke="#f97316" strokeWidth={2} dot={{ r: 4 }} />
        <Line type="monotone" dataKey="thinking"   name="Thinking ↑"   stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
        <Line type="monotone" dataKey="selfSolve"  name="Self-Solve % ↑" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
