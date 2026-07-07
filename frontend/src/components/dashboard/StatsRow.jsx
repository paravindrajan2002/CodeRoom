const StatCard = ({ label, value, suffix, accent, neutral, bar, icon }) => (
  <div className="cr-stat-card" style={{ "--glow": accent + "55" }}>
    <div
      className="cr-stat-ico"
      style={{ backgroundColor: accent + "22", borderColor: accent + "55" }}
    >
      {icon}
    </div>
    <div className="cr-stat-body">
      <p className="cr-stat-value" style={{ color: neutral ? "var(--cr-text)" : accent }}>
        {value}
        {suffix && <span className="cr-stat-suffix">{suffix}</span>}
      </p>
      <p className="cr-stat-label">{label}</p>
      {bar != null && (
        <div className="cr-stat-bar">
          <div
            className="cr-stat-bar-fill"
            style={{ width: `${bar}%`, backgroundColor: accent }}
          />
        </div>
      )}
    </div>
  </div>
);

const StatsRow = ({ total, active, completed, successRate }) => (
  <div className="cr-stats">
    <StatCard
      label="Total Interviews"
      value={total}
      accent="#58a6ff"
      neutral
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
      accent="#3fb950"
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
      accent="#bc8cff"
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
      accent="#d29922"
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