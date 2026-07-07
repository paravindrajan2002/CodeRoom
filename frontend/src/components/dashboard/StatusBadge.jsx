// Single source of truth for status colors — the badge, the card's left
// accent bar, and any future status-driven UI all read from this map.
// `accent` (unchanged key) drives every color; the old Tailwind class fields
// are gone because the dashboard now uses the scoped cr- system.
export const STATUS_STYLES = {
  SCHEDULED: { accent: "#58a6ff", label: "Scheduled" },
  IN_PROGRESS: { accent: "#3fb950", label: "In Progress", pulse: true },
  COMPLETED: { accent: "#8b949e", label: "Completed" },
  REVIEWED: { accent: "#bc8cff", label: "Reviewed" },
  CANCELLED: { accent: "#f85149", label: "Cancelled" },
};

const StatusBadge = ({ status }) => {
  const s = STATUS_STYLES[status] || STATUS_STYLES.SCHEDULED;
  return (
    <span
      className="cr-badge"
      style={{ color: s.accent, background: s.accent + "1f", borderColor: s.accent + "40" }}
    >
      <span
        className={`cr-badge-dot${s.pulse ? " pulse" : ""}`}
        style={{ background: s.accent }}
      />
      {s.label}
    </span>
  );
};

export default StatusBadge;