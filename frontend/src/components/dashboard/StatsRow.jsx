const StatCard = ({ label, value, suffix, color, glow, icon, bar }) => (
  <div
    className="group bg-[#161b22] border border-[#30363d] rounded-xl p-4 flex items-center gap-3.5 transition-all hover:-translate-y-0.5 hover:border-[#484f58]"
    style={{ "--glow": glow }}
  >
    <div
      className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border transition-shadow group-hover:shadow-[0_0_16px_var(--glow)]"
      style={{ backgroundColor: glow, borderColor: glow.replace("0.14", "0.35") }}
    >
      {icon}
    </div>
    <div className="min-w-0 flex-1">
      <p className={`text-2xl font-bold font-['Space_Grotesk'] leading-none ${color}`}>
        {value}
        {suffix && <span className="text-sm font-medium text-[#484f58]">{suffix}</span>}
      </p>
      <p className="text-[11px] text-[#8b949e] mt-1 font-['JetBrains_Mono'] uppercase tracking-wide truncate">
        {label}
      </p>
      {bar != null && (
        <div className="h-1 w-full bg-[#0d1117] rounded-full mt-2 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${bar}%`, backgroundColor: glow.replace("0.14", "1") }}
          />
        </div>
      )}
    </div>
  </div>
);

const StatsRow = ({ total, active, completed, successRate }) => (
  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
    <StatCard
      label="Total Interviews"
      value={total}
      color="text-white"
      glow="rgba(88,166,255,0.14)"
      icon={
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#58a6ff" strokeWidth="1.8">
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path strokeLinecap="round" d="M3 9h18M8 3v3M16 3v3" />
        </svg>
      }
    />
    <StatCard
      label="Active"
      value={active}
      color="text-[#3fb950]"
      glow="rgba(63,185,80,0.14)"
      icon={
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3fb950" strokeWidth="1.8">
          <circle cx="12" cy="12" r="9" />
          <path strokeLinecap="round" d="M12 7v5l3 3" />
        </svg>
      }
    />
    <StatCard
      label="Reviewed"
      value={completed}
      color="text-[#bc8cff]"
      glow="rgba(188,140,255,0.14)"
      icon={
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#bc8cff" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      }
    />
    <StatCard
      label="Completion Rate"
      value={successRate}
      suffix="%"
      color="text-[#d29922]"
      glow="rgba(210,153,34,0.14)"
      bar={successRate}
      icon={
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d29922" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l6-6 4 4 8-8" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 7h6v6" />
        </svg>
      }
    />
  </div>
);

export default StatsRow;
