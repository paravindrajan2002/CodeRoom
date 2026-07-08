/* Self-contained (own tokens) — renders inside Dashboard and QuestionBank. */
const EMPTY_CSS = `
  .cr-empty-root{
    --cr-panel:#161b22; --cr-border:#2a323d; --cr-border2:#3a444f;
    --cr-text:#e6edf3; --cr-dim:#8b949e; --cr-green:#3fb950; --cr-green2:#238636;
    --cr-display:'Space Grotesk','Segoe UI',sans-serif; --cr-body:'Inter',system-ui,sans-serif;
  }
  .cr-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px 24px;font-family:var(--cr-body);}
  .cr-empty-ico{width:64px;height:64px;background:var(--cr-panel);border:1px solid var(--cr-border);border-radius:16px;display:flex;align-items:center;justify-content:center;margin-bottom:20px;}
  .cr-empty-title{font-family:var(--cr-display);font-weight:600;font-size:16px;color:var(--cr-text);margin-bottom:6px;}
  .cr-empty-sub{font-size:14px;color:var(--cr-dim);text-align:center;max-width:320px;line-height:1.6;margin-bottom:20px;}
  .cr-empty-btn{background:var(--cr-green2);color:#fff;font-family:var(--cr-body);font-weight:600;font-size:14px;padding:10px 18px;border:none;border-radius:10px;cursor:pointer;transition:all .2s;}
  .cr-empty-btn:hover{background:var(--cr-green);box-shadow:0 0 24px rgba(63,185,80,0.35);}
`;

const EmptyState = ({ icon, title, subtitle, actionLabel, onAction }) => (
  <div className="cr-empty-root">
    <style>{EMPTY_CSS}</style>
    <div className="cr-empty">
      <div className="cr-empty-ico">{icon}</div>
      <h3 className="cr-empty-title">{title}</h3>
      <p className="cr-empty-sub">{subtitle}</p>
      {actionLabel && onAction && (
        <button onClick={onAction} className="cr-empty-btn">
          {actionLabel}
        </button>
      )}
    </div>
  </div>
);

export default EmptyState;