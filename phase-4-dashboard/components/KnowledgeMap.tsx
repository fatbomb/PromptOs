'use client';

import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ZAxis } from 'recharts';

interface ConceptData {
  concept: string;
  encounter_count: number;
  avg_score: number;
  color_band: string;
}

interface Props {
  data: ConceptData[];
  onConceptClick: (concept: string) => void;
}

export default function KnowledgeMap({ data, onConceptClick }: Props) {
  // We'll map data to a scattered grid roughly by index or encounter_count to create a nice distribution
  const chartData = data.map((d, i) => ({
    ...d,
    x: (i % 5) * 20 + Math.random() * 10, // Spread loosely across X
    y: d.avg_score, // Y axis is the actual score
    z: d.encounter_count * 100, // Z axis is bubble size (encounter count)
  }));

  const getColor = (band: string) => {
    switch (band) {
      case 'green': return 'rgba(52, 211, 153, 0.8)';
      case 'amber': return 'rgba(251, 191, 36, 0.8)';
      case 'red': return 'rgba(248, 113, 113, 0.8)';
      default: return 'rgba(156, 163, 175, 0.8)';
    }
  };

  const getStroke = (band: string) => {
    switch (band) {
      case 'green': return '#059669';
      case 'amber': return '#d97706';
      case 'red': return '#dc2626';
      default: return '#4b5563';
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const p = payload[0].payload;
      return (
        <div className="bg-gray-900/90 backdrop-blur-md border border-white/10 p-4 rounded-xl shadow-sm dark:shadow-none">
          <p className="text-lg font-bold text-white mb-1">{p.concept}</p>
          <p className="text-sm text-gray-400">Score: <span className="text-white font-semibold">{p.avg_score.toFixed(1)}</span></p>
          <p className="text-sm text-gray-400">Encounters: <span className="text-white font-semibold">{p.encounter_count}</span></p>
          {(p.color_band === 'amber' || p.color_band === 'red') && (
            <p className="text-xs text-blue-400 mt-2 font-semibold">Click to start remediation quiz →</p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="glass-card border-gray-800 p-6 rounded-2xl relative overflow-hidden group">
      <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-purple-500/30 to-transparent"></div>
      
      <ResponsiveContainer width="100%" height={500}>
        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-gray-800" vertical={false} />
          {/* Hide X axis visually but use it for scattering */}
          <XAxis type="number" dataKey="x" hide domain={[0, 100]} />
          <YAxis 
            type="number" 
            dataKey="y" 
            name="Score" 
            domain={[0, 100]} 
            stroke="currentColor" 
            className="text-gray-400 dark:text-gray-500"
            tick={{ fill: 'currentColor', fontSize: 13 }}
            tickLine={false} 
            axisLine={false}
          />
          <ZAxis type="number" dataKey="z" range={[100, 2000]} name="Encounters" />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
          <Scatter 
            name="Concepts" 
            data={chartData} 
            onClick={(data) => {
              if (data?.color_band === 'amber' || data?.color_band === 'red') {
                onConceptClick(data.concept);
              }
            }}
            className="cursor-pointer"
          >
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={getColor(entry.color_band)} 
                stroke={getStroke(entry.color_band)}
                strokeWidth={2}
                className="transition-all hover:opacity-100 opacity-80"
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
