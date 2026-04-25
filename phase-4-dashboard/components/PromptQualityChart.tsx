'use client';

import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, ComposedChart
} from 'recharts';

interface DailyQuality {
  day: string;
  avg_raw_score: number;
  avg_assembled: number;
  avg_delta: number;
}

interface Props {
  data: DailyQuality[];
}

export default function PromptQualityChart({ data }: Props) {
  // Format date to show just the day/month
  const formattedData = [...data].reverse().map(item => ({
    ...item,
    formattedDay: new Date(item.day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }));

  return (
    <div className="glass-card rounded-2xl p-6 border border-[var(--glass-border)] h-[360px] flex flex-col hover:border-blue-500/30 transition-all duration-300">
      <div className="flex-1 min-h-0 relative">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={formattedData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis 
              dataKey="formattedDay" 
              tick={{ fill: '#6B7280', fontSize: 12 }} 
              axisLine={false} 
              tickLine={false} 
              dy={10}
            />
            <YAxis 
              tick={{ fill: '#6B7280', fontSize: 12 }} 
              axisLine={false} 
              tickLine={false} 
              domain={[0, 100]}
              dx={-10}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
                color: '#fff',
                padding: '12px'
              }}
              itemStyle={{ color: '#E2E8F0' }}
              labelStyle={{ color: '#94A3B8', marginBottom: '8px', fontWeight: 'bold' }}
              formatter={(value: number, name: string) => [
                <span key={name} className="font-semibold text-white">{value.toFixed(1)} / 100</span>, 
                name === 'avg_raw_score' ? 'Raw Prompt Quality' : 'Refined Quality'
              ]}
            />
            <defs>
              <linearGradient id="colorAssembled" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <Area 
              type="monotone" 
              dataKey="avg_assembled" 
              stroke="none" 
              fillOpacity={1} 
              fill="url(#colorAssembled)" 
            />
            <Line 
              type="monotone" 
              dataKey="avg_raw_score" 
              stroke="#ef4444" 
              strokeWidth={2} 
              dot={{ fill: '#ef4444', r: 3, strokeWidth: 0 }} 
              activeDot={{ r: 6, fill: '#ef4444' }} 
              strokeOpacity={0.6}
            />
            <Line 
              type="monotone" 
              dataKey="avg_assembled" 
              stroke="#0ea5e9" 
              strokeWidth={3} 
              dot={{ fill: '#0ea5e9', r: 4, strokeWidth: 0 }} 
              activeDot={{ r: 7, fill: '#0ea5e9' }} 
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
