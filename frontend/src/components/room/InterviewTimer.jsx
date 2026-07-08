import { useState, useEffect } from "react";

// ─── Interview Timer ──────────────────────────────────────────────────────────
// Extracted from InterviewRoom for modularity. Uses the cr- room tokens, so it
// must render inside a .cr-room-root (it lives in the room top bar).
const InterviewTimer = ({ startedAt }) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = startedAt ? new Date(startedAt).getTime() : Date.now();

    const tick = () => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  const hrs = Math.floor(elapsed / 3600);
  const mins = Math.floor((elapsed % 3600) / 60);
  const secs = elapsed % 60;

  const format = (n) => String(n).padStart(2, "0");

  const color =
    elapsed > 3600
      ? "var(--cr-red)" // > 1 hour → red
      : elapsed > 2700
        ? "var(--cr-yellow)" // > 45 min → yellow
        : "var(--cr-green)"; // normal → green

  return (
    <div className="cr-timer" style={{ color }}>
      <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      {hrs > 0 && `${format(hrs)}:`}
      {format(mins)}:{format(secs)}
    </div>
  );
};

export default InterviewTimer;