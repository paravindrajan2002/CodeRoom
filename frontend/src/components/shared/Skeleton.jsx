/* ────────────────────────────────────────────────────────────────────────────
   Skeleton loaders — self-contained (own tokens + shimmer keyframe) since they
   render inside multiple pages (Dashboard, QuestionBank). The list wrappers
   inject the style once; the block/card pieces just use the classes.
   ──────────────────────────────────────────────────────────────────────────── */
const SK_CSS = `
  .cr-sk-root{
    --cr-bg2:#0d1117; --cr-panel:#161b22; --cr-panel2:#1c232d;
    --cr-border:#2a323d; --cr-border2:#3a444f;
    display:flex; flex-direction:column; gap:12px;
  }
  .cr-sk-root *{box-sizing:border-box;}
  .cr-sk-block{position:relative;overflow:hidden;border-radius:8px;background:var(--cr-panel2);}
  .cr-sk-block::after{content:"";position:absolute;inset:0;transform:translateX(-100%);
    background:linear-gradient(90deg,transparent,rgba(58,68,79,0.55),transparent);
    animation:cr-sk-shimmer 1.5s infinite;}
  @keyframes cr-sk-shimmer{100%{transform:translateX(100%);}}
  @media(prefers-reduced-motion:reduce){.cr-sk-block::after{animation:none;}}

  .cr-sk-card{display:flex;align-items:center;justify-content:space-between;gap:16px;
    background:var(--cr-panel);border:1px solid var(--cr-border);border-left:4px solid var(--cr-border2);
    border-radius:14px;padding:18px 20px;}
  .cr-sk-card-main{flex:1;display:flex;flex-direction:column;gap:10px;min-width:0;}
  .cr-sk-row{display:flex;align-items:center;gap:8px;}
  .cr-sk-actions{display:flex;gap:8px;flex-shrink:0;}

  .cr-sk-qcard{background:var(--cr-panel);border:1px solid var(--cr-border);border-radius:14px;padding:18px 20px;}
  .cr-sk-qrow{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;}
  .cr-sk-qmain{flex:1;display:flex;flex-direction:column;gap:10px;min-width:0;}
`;

// Base shimmer block — sizing comes from inline style (or an extra className)
export const SkeletonBlock = ({ className = "", style }) => (
  <div className={`cr-sk-block ${className}`} style={style} />
);

// Interview card skeleton — mirrors InterviewCard's layout
export const CardSkeleton = () => (
  <div className="cr-sk-card">
    <div className="cr-sk-card-main">
      <div className="cr-sk-row">
        <SkeletonBlock style={{ height: 20, width: 88, borderRadius: 100 }} />
        <SkeletonBlock style={{ height: 16, width: 96 }} />
      </div>
      <SkeletonBlock style={{ height: 12, width: 256 }} />
      <SkeletonBlock style={{ height: 12, width: 160 }} />
    </div>
    <div className="cr-sk-actions">
      <SkeletonBlock style={{ height: 32, width: 112, borderRadius: 9 }} />
      <SkeletonBlock style={{ height: 32, width: 96, borderRadius: 9 }} />
    </div>
  </div>
);

export const CardSkeletonList = ({ count = 4 }) => (
  <div className="cr-sk-root">
    <style>{SK_CSS}</style>
    {Array.from({ length: count }).map((_, i) => (
      <CardSkeleton key={i} />
    ))}
  </div>
);

// Question bank card skeleton — slightly different shape
export const QuestionCardSkeleton = () => (
  <div className="cr-sk-qcard">
    <div className="cr-sk-qrow">
      <div className="cr-sk-qmain">
        <div className="cr-sk-row">
          <SkeletonBlock style={{ height: 16, width: 160 }} />
          <SkeletonBlock style={{ height: 20, width: 64, borderRadius: 100 }} />
        </div>
        <SkeletonBlock style={{ height: 12, width: "100%", maxWidth: 420 }} />
        <div className="cr-sk-row">
          <SkeletonBlock style={{ height: 20, width: 64, borderRadius: 100 }} />
          <SkeletonBlock style={{ height: 20, width: 80, borderRadius: 100 }} />
        </div>
      </div>
      <SkeletonBlock style={{ height: 32, width: 64, borderRadius: 9 }} />
    </div>
  </div>
);

export const QuestionCardSkeletonList = ({ count = 5 }) => (
  <div className="cr-sk-root">
    <style>{SK_CSS}</style>
    {Array.from({ length: count }).map((_, i) => (
      <QuestionCardSkeleton key={i} />
    ))}
  </div>
);