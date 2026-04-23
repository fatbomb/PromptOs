/**
 * MetricCard Component — Phase 4, Task 4.2
 *
 * Displays a single summary metric (sessions, turns saved, time, cost).
 */

interface Props {
  label: string;
  value: string | number;
  unit?: string;
}

export default function MetricCard({ label, value, unit }: Props) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
      <p className="text-sm text-gray-400 mb-1">{label}</p>
      <p className="text-3xl font-bold text-white">
        {value}
        {unit && <span className="text-lg text-gray-400 ml-1">{unit}</span>}
      </p>
    </div>
  );
}
