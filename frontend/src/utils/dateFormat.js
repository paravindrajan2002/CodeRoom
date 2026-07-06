// ─── Duration between two ISO timestamps, in minutes ─────────────────────────
export const formatDuration = (startedAt, endedAt) => {
  if (!startedAt || !endedAt) return null;
  const minutes = Math.round(
    (new Date(endedAt) - new Date(startedAt)) / 60000
  );
  return `${minutes} min`;
};

// ─── Scheduled date/time, compact display format ──────────────────────────────
export const formatScheduled = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return (
    d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
    " · " +
    d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
  );
};