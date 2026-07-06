// Single source of truth for status colors — the badge, the card's left
// accent bar, and any future status-driven UI all read from this map.
export const STATUS_STYLES = {
  SCHEDULED: {
    bg: "bg-[#1f3244]",
    text: "text-[#58a6ff]",
    border: "border-[#1f3244]",
    dot: "bg-[#58a6ff]",
    accent: "#58a6ff",
  },
  IN_PROGRESS: {
    bg: "bg-[#1a2f1a]",
    text: "text-[#3fb950]",
    border: "border-[#238636]",
    dot: "bg-[#3fb950] animate-pulse",
    accent: "#3fb950",
  },
  COMPLETED: {
    bg: "bg-[#1f1f2e]",
    text: "text-[#8b949e]",
    border: "border-[#30363d]",
    dot: "bg-[#8b949e]",
    accent: "#8b949e",
  },
  REVIEWED: {
    bg: "bg-[#2d1f47]",
    text: "text-[#bc8cff]",
    border: "border-[#8957e5]",
    dot: "bg-[#bc8cff]",
    accent: "#bc8cff",
  },
  CANCELLED: {
    bg: "bg-[#2d1318]",
    text: "text-[#f85149]",
    border: "border-[#da3633]",
    dot: "bg-[#f85149]",
    accent: "#f85149",
  },
};

const StatusBadge = ({ status }) => {
  const s = STATUS_STYLES[status] || STATUS_STYLES.SCHEDULED;
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border font-medium font-['JetBrains_Mono'] tracking-wide ${s.bg} ${s.text} ${s.border}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {status.replace("_", " ")}
    </span>
  );
};

export default StatusBadge;