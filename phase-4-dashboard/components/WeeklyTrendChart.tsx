'use client';

/**
 * WeeklyTrendChart Component — Phase 4, Task 4.2
 *
 * Renders a week-over-week trend chart for token savings.
 * Displays:
 *   - Turns Saved
 *   - Cost Saved ($)
 */

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
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
  // Recharts expects data in chronological order, so reverse the descending array
  const chartData = [...data].reverse().map((row) => ({
    week: new Date(row.week_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    turnsSaved: row.estimated_turns_saved,
    costSaved: parseFloat(row.estimated_cost_saved_usd.toFixed(2)),
  }));

  return (
    <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl">
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={chartData} margin={{ top: 8, right: 24, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="week" stroke="#9ca3af" tick={{ fontSize: 12 }} />
          <YAxis yAxisId="left" stroke="#9ca3af" tick={{ fontSize: 12 }} />
          <YAxis yAxisId="right" orientation="right" stroke="#9ca3af" tick={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
            labelStyle={{ color: '#e5e7eb' }}
          />
          <Legend />
          <Line 
            yAxisId="left"
            type="monotone" 
            dataKey="turnsSaved" 
            name="Turns Saved" 
            stroke="#3b82f6" 
            strokeWidth={2} 
            dot={{ r: 4 }} 
          />
          <Line 
            yAxisId="right"
            type="monotone" 
            dataKey="costSaved" 
            name="Cost Saved ($)" 
            stroke="#22c55e" 
            strokeWidth={2} 
            dot={{ r: 4 }} 
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
