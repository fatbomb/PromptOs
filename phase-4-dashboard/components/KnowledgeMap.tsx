'use client';

/**
 * KnowledgeMap Component — Phase 4, Task 4.3
 *
 * Renders a scatter/bubble chart of concept tags.
 * - Size     = encounter_count
 * - Color    = color_band (green / amber / red)
 * - Click    = opens QuizModal for that concept
 *
 * TODO: Replace ScatterChart with D3 force layout for organic bubble feel.
 */

import { useState } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import QuizModal from './QuizModal';

const BAND_COLORS = { green: '#22c55e', amber: '#f59e0b', red: '#ef4444' };

interface Concept {
  concept: string;
  encounter_count: number;
  avg_score: number;
  color_band: 'green' | 'amber' | 'red';
  quiz_score?: number;
}

interface Props {
  concepts: Concept[];
}

export default function KnowledgeMap({ concepts }: Props) {
  const [selected, setSelected] = useState<Concept | null>(null);

  const chartData = concepts.map((c, i) => ({
    x: (i % 6) * 120 + 60,            // simple grid layout — swap for D3 force
    y: Math.round(c.avg_score),
    z: c.encounter_count * 10,
    ...c,
  }));

  return (
    <>
      <ResponsiveContainer width="100%" height={400}>
        <ScatterChart>
          <XAxis dataKey="x" hide />
          <YAxis dataKey="y" hide />
          <Tooltip
            content={({ payload }) => {
              if (!payload?.length) return null;
              const d = payload[0].payload;
              return (
                <div className="bg-gray-800 border border-gray-700 rounded p-3 text-sm">
                  <p className="font-bold">{d.concept}</p>
                  <p className="text-gray-400">Seen {d.encounter_count}×</p>
                  <p className="text-gray-400">Avg score: {d.avg_score.toFixed(0)}</p>
                </div>
              );
            }}
          />
          <Scatter
            data={chartData}
            onClick={(data) => setSelected(data as unknown as Concept)}
            cursor="pointer"
          >
            {chartData.map((entry, i) => (
              <Cell key={i} fill={BAND_COLORS[entry.color_band] ?? '#6b7280'} fillOpacity={0.85} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>

      {selected && (
        <QuizModal concept={selected.concept} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
