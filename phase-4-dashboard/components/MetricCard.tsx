interface Props {
  label: string;
  value: string | number;
  unit?: string;
  variant?: 'blue' | 'indigo' | 'purple' | 'emerald';
  icon?: string;
}

export default function MetricCard({ label, value, unit, variant = 'blue', icon }: Props) {
  
  const gradients = {
    blue: 'from-blue-500/20 to-blue-600/5 border-blue-500/30 text-blue-400 focus-ring-blue-500',
    indigo: 'from-indigo-500/20 to-indigo-600/5 border-indigo-500/30 text-indigo-400',
    purple: 'from-purple-500/20 to-purple-600/5 border-purple-500/30 text-purple-400',
    emerald: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/30 text-emerald-400',
  };

  const selectedGradient = gradients[variant];

  return (
    <div className={`relative overflow-hidden glass-card rounded-2xl p-6 group hover:-translate-y-1 hover:shadow-md dark:hover:shadow-none border ${selectedGradient}`}>
      {/* Accent Top Border */}
      <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${selectedGradient.split(' ')[0]} ${selectedGradient.split(' ')[1]} opacity-50`}></div>
      
      <div className="flex justify-between items-start mb-4">
        <p className="text-xs font-bold text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors uppercase tracking-widest">{label}</p>
        
        {icon && (
          <div className={`p-2 rounded-xl bg-[var(--glass-card-bg)] border border-[var(--glass-border)] backdrop-blur-md text-${variant}-500 dark:text-${variant}-400 group-hover:scale-110 transition-transform`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
            </svg>
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-1 mt-2">
        <p className="text-4xl font-extrabold text-[var(--text-primary)] tracking-tight drop-shadow-sm">
          {value}
        </p>
        {unit && <span className="text-sm font-bold text-[var(--text-secondary)]">{unit}</span>}
      </div>
    </div>
  );
}
