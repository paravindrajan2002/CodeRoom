import { useState } from 'react';
import toast from 'react-hot-toast';
import { interviewAPI } from '../../services/api.js';

/* ────────────────────────────────────────────────────────────────────────────
   ScoreModal is rendered from BOTH the Dashboard (.cr-dash-root) and the
   InterviewRoom (.cr-room-root), so it can't rely on a parent for tokens.
   It carries its own scoped style block + tokens under .cr-sm-root and is fully
   self-contained. Same cr- design language as the rest of the app.
   ──────────────────────────────────────────────────────────────────────────── */
const SCORE_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

  .cr-sm-root{
    --cr-bg:#0a0e14; --cr-bg2:#0d1117; --cr-panel:#161b22; --cr-panel2:#1c232d;
    --cr-border:#2a323d; --cr-border2:#3a444f; --cr-text:#e6edf3; --cr-dim:#8b949e;
    --cr-dimmer:#5c6773; --cr-green:#3fb950; --cr-green2:#238636; --cr-blue:#58a6ff;
    --cr-purple:#bc8cff; --cr-yellow:#d29922; --cr-red:#f85149; --cr-danger2:#da3633;
    --cr-mono:'JetBrains Mono',ui-monospace,monospace;
    --cr-display:'Space Grotesk','Segoe UI',sans-serif;
    --cr-body:'Inter',system-ui,sans-serif;
    position:fixed;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;
    padding:16px;background:rgba(0,0,0,0.7);backdrop-filter:blur(2px);
    font-family:var(--cr-body);color:var(--cr-text);-webkit-font-smoothing:antialiased;
  }
  .cr-sm-root *{margin:0;padding:0;box-sizing:border-box;}
  .cr-sm-card{background:var(--cr-panel);border:1px solid var(--cr-border);border-radius:16px;width:100%;max-width:448px;overflow:hidden;animation:cr-sm-in .2s ease;}
  @keyframes cr-sm-in{from{opacity:0;transform:translateY(10px) scale(.98);}to{opacity:1;transform:none;}}

  .cr-sm-head{padding:24px;border-bottom:1px solid var(--cr-border);}
  .cr-sm-title{font-family:var(--cr-display);font-weight:600;font-size:18px;}
  .cr-sm-sub{font-size:14px;color:var(--cr-dim);margin-top:4px;}
  .cr-sm-sub b{color:var(--cr-text);font-weight:500;}

  .cr-sm-body{padding:24px;display:flex;flex-direction:column;gap:24px;}

  .cr-sm-score-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;}
  .cr-sm-label{font-family:var(--cr-mono);font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--cr-dim);}
  .cr-sm-score-val{display:flex;align-items:baseline;gap:4px;}
  .cr-sm-score-num{font-family:var(--cr-display);font-weight:700;font-size:30px;line-height:1;}
  .cr-sm-score-max{font-family:var(--cr-mono);font-size:14px;color:var(--cr-dim);}

  .cr-sm-slider{width:100%;height:8px;border-radius:100px;background:var(--cr-border);appearance:none;-webkit-appearance:none;cursor:pointer;outline:none;accent-color:var(--cr-green2);}
  .cr-sm-slider::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;background:var(--cr-green);border:2px solid var(--cr-bg);box-shadow:0 0 10px rgba(63,185,80,0.5);cursor:pointer;}
  .cr-sm-slider::-moz-range-thumb{width:18px;height:18px;border-radius:50%;background:var(--cr-green);border:2px solid var(--cr-bg);cursor:pointer;}
  .cr-sm-ticks{display:flex;justify-content:space-between;margin-top:4px;}
  .cr-sm-ticks span{font-family:var(--cr-mono);font-size:11px;color:var(--cr-dimmer);}
  .cr-sm-label-text{text-align:center;font-size:14px;font-weight:500;margin-top:8px;}

  .cr-sm-grid{display:grid;grid-template-columns:repeat(10,1fr);gap:4px;}
  .cr-sm-cell{height:32px;border-radius:6px;font-family:var(--cr-mono);font-size:12px;font-weight:700;border:none;cursor:pointer;transition:all .15s;color:var(--cr-dimmer);background:var(--cr-panel2);}
  .cr-sm-cell.filled{background:rgba(35,134,54,0.3);color:var(--cr-green);}
  .cr-sm-cell.active{background:var(--cr-green2);color:#fff;transform:scale(1.1);}

  .cr-sm-rec-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
  .cr-sm-rec{padding:12px;border-radius:10px;font-size:14px;font-weight:500;border:1px solid var(--cr-border);background:var(--cr-bg2);color:var(--cr-dim);cursor:pointer;transition:all .2s;}
  .cr-sm-rec.proceed-on{background:rgba(63,185,80,0.12);border-color:var(--cr-green2);color:var(--cr-green);}
  .cr-sm-rec.reject-on{background:rgba(248,81,73,0.12);border-color:var(--cr-danger2);color:var(--cr-red);}

  .cr-sm-textarea{width:100%;background:var(--cr-bg2);border:1px solid var(--cr-border);border-radius:10px;padding:10px 12px;color:var(--cr-text);font-size:14px;font-family:var(--cr-body);resize:none;transition:border-color .2s,box-shadow .2s;}
  .cr-sm-textarea::placeholder{color:var(--cr-dimmer);}
  .cr-sm-textarea:focus{outline:none;border-color:var(--cr-green);box-shadow:0 0 0 3px rgba(63,185,80,0.12);}

  .cr-sm-foot{padding:24px;border-top:1px solid var(--cr-border);display:flex;align-items:center;gap:12px;}
  .cr-sm-btn{flex:1;padding:10px;border-radius:10px;font-size:14px;font-weight:600;font-family:var(--cr-body);cursor:pointer;transition:all .2s;}
  .cr-sm-btn-ghost{background:transparent;border:1px solid var(--cr-border);color:var(--cr-dim);}
  .cr-sm-btn-ghost:hover{border-color:var(--cr-border2);color:var(--cr-text);}
  .cr-sm-btn-primary{background:var(--cr-green2);border:1px solid var(--cr-green2);color:#fff;}
  .cr-sm-btn-primary:hover:not(:disabled){background:var(--cr-green);box-shadow:0 0 20px rgba(63,185,80,0.35);}
  .cr-sm-btn-primary:disabled{opacity:.5;cursor:not-allowed;}

  /* score-driven accent colors (mirrors getScoreColor thresholds) */
  .cr-sm-c-red{color:var(--cr-red);}
  .cr-sm-c-yellow{color:var(--cr-yellow);}
  .cr-sm-c-blue{color:var(--cr-blue);}
  .cr-sm-c-green{color:var(--cr-green);}
`;

const ScoreModal = ({ roomId, candidateName, onClose, onSubmitted }) => {
    const [score, setScore] = useState(7);
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!score) {
            toast.error('Please select a score');
            return;
        }

        try {
            setIsSubmitting(true);
            await interviewAPI.score(roomId, { score, notes });
            toast.success('Scorecard submitted!');
            onSubmitted();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to submit score');
        } finally {
            setIsSubmitting(false);
        }
    };

    const scoreLabels = {
        1: 'Very Poor',
        2: 'Poor',
        3: 'Below Average',
        4: 'Average',
        5: 'Slightly Above Average',
        6: 'Good',
        7: 'Very Good',
        8: 'Excellent',
        9: 'Outstanding',
        10: 'Exceptional'
    };

    const getScoreColor = (s) => {
        if (s <= 3) return 'cr-sm-c-red';
        if (s <= 5) return 'cr-sm-c-yellow';
        if (s <= 7) return 'cr-sm-c-blue';
        return 'cr-sm-c-green';
    };

    return (
        <div className="cr-sm-root">
            <style>{SCORE_CSS}</style>
            <div className="cr-sm-card">

                {/* Header */}
                <div className="cr-sm-head">
                    <h2 className="cr-sm-title">Submit Scorecard</h2>
                    {candidateName && (
                        <p className="cr-sm-sub">
                            Candidate: <b>{candidateName}</b>
                        </p>
                    )}
                </div>

                <div className="cr-sm-body">

                    {/* Score slider */}
                    <div>
                        <div className="cr-sm-score-row">
                            <label className="cr-sm-label">Overall Score</label>
                            <div className="cr-sm-score-val">
                                <span className={`cr-sm-score-num ${getScoreColor(score)}`}>
                                    {score}
                                </span>
                                <span className="cr-sm-score-max">/10</span>
                            </div>
                        </div>

                        <input
                            type="range"
                            min="1"
                            max="10"
                            value={score}
                            onChange={(e) => setScore(Number(e.target.value))}
                            className="cr-sm-slider"
                        />

                        <div className="cr-sm-ticks">
                            <span>1</span>
                            <span>10</span>
                        </div>

                        <p className={`cr-sm-label-text ${getScoreColor(score)}`}>
                            {scoreLabels[score]}
                        </p>
                    </div>

                    {/* Score breakdown visual */}
                    <div className="cr-sm-grid">
                        {[1,2,3,4,5,6,7,8,9,10].map((s) => (
                            <button
                                key={s}
                                onClick={() => setScore(s)}
                                className={`cr-sm-cell ${
                                    s === score ? 'active' : s < score ? 'filled' : ''
                                }`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>

                    {/* Hire recommendation */}
                    <div>
                        <label className="cr-sm-label" style={{ display: 'block', marginBottom: '12px' }}>
                            Recommendation
                        </label>
                        <div className="cr-sm-rec-grid">
                            <button
                                onClick={() => setScore(Math.max(score, 7))}
                                className={`cr-sm-rec ${score >= 7 ? 'proceed-on' : ''}`}
                            >
                                ✅ Proceed
                            </button>
                            <button
                                onClick={() => setScore(Math.min(score, 5))}
                                className={`cr-sm-rec ${score <= 5 ? 'reject-on' : ''}`}
                            >
                                ❌ Reject
                            </button>
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="cr-sm-label" style={{ display: 'block', marginBottom: '8px' }}>
                            Notes
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Strong problem solver, good communication, missed edge cases..."
                            rows={4}
                            className="cr-sm-textarea"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="cr-sm-foot">
                    <button onClick={onClose} className="cr-sm-btn cr-sm-btn-ghost">
                        Skip for now
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="cr-sm-btn cr-sm-btn-primary"
                    >
                        {isSubmitting ? 'Submitting...' : 'Submit Scorecard'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ScoreModal;