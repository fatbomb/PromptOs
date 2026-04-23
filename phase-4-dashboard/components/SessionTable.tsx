/**
 * SessionTable Component — Phase 4, Task 4.2
 *
 * Renders the session history table showing before/after token counts and scores.
 */

interface Session {
  id: string;
  created_at: string;
  raw_prompt: string;
  raw_token_count: number;
  assembled_token_count: number;
  token_efficiency_score: number;
  thinking_depth_score: number;
  dependency_score: number;
  source: string;
  was_refused: boolean;
}

interface Props {
  sessions: Session[];
}

const sourceLabel: Record<string, string> = {
  cli: '⌨ CLI',
  vscode: '🖥 VS Code',
  browser_extension: '🌐 Browser',
};

export default function SessionTable({ sessions }: Props) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800 text-gray-400 text-left">
            <th className="px-4 py-3 font-medium">Prompt</th>
            <th className="px-4 py-3 font-medium">Source</th>
            <th className="px-4 py-3 font-medium">Tokens (raw→asm)</th>
            <th className="px-4 py-3 font-medium">Depth</th>
            <th className="px-4 py-3 font-medium">Dep.</th>
            <th className="px-4 py-3 font-medium">Date</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((s) => (
            <tr key={s.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
              <td className="px-4 py-3 max-w-xs truncate text-white">
                {s.was_refused && <span className="mr-1 text-amber-400">🚫</span>}
                {s.raw_prompt}
              </td>
              <td className="px-4 py-3 text-gray-400">{sourceLabel[s.source] ?? s.source}</td>
              <td className="px-4 py-3 text-gray-300">
                {s.raw_token_count} → {s.assembled_token_count}
              </td>
              <td className="px-4 py-3">
                <span className={s.thinking_depth_score >= 70 ? 'text-green-400' : s.thinking_depth_score >= 40 ? 'text-amber-400' : 'text-red-400'}>
                  {s.thinking_depth_score}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className={s.dependency_score <= 40 ? 'text-green-400' : s.dependency_score <= 70 ? 'text-amber-400' : 'text-red-400'}>
                  {s.dependency_score}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                {new Date(s.created_at).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
