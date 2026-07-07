import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

/* ────────────────────────────────────────────────────────────────────────────
   Shared auth design system.
   Same tokens, fonts, and treatments as the Landing page (cr- system), scoped
   under .cr-auth-root so nothing leaks into the rest of the app. AuthLayout
   injects this once; Login, Register, and SocialAuthButtons just use the classes.
   If Space Grotesk / JetBrains Mono / Inter are already loaded globally (they are
   for Landing), the @import below is a harmless no-op — remove it if you prefer.
   ──────────────────────────────────────────────────────────────────────────── */
export const AUTH_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

  .cr-auth-root{
    --cr-bg:#0a0e14; --cr-bg2:#0d1117; --cr-panel:#161b22; --cr-panel2:#1c232d;
    --cr-border:#2a323d; --cr-border2:#3a444f; --cr-text:#e6edf3; --cr-dim:#8b949e;
    --cr-dimmer:#5c6773; --cr-green:#3fb950; --cr-green2:#238636; --cr-blue:#58a6ff;
    --cr-red:#f85149; --cr-yellow:#d29922;
    --cr-mono:'JetBrains Mono',ui-monospace,monospace;
    --cr-display:'Space Grotesk','Segoe UI',sans-serif;
    --cr-body:'Inter',system-ui,sans-serif;
    min-height:100vh; display:flex; position:relative;
    background:var(--cr-bg); color:var(--cr-text); font-family:var(--cr-body);
    line-height:1.6; -webkit-font-smoothing:antialiased; overflow-x:hidden;
  }
  .cr-auth-root *{margin:0;padding:0;box-sizing:border-box;}
  .cr-auth-root ::selection{background:rgba(63,185,80,0.3);}

  /* Ambient background — grid mask + soft glows, echoing the Landing hero */
  .cr-auth-bg{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden;}
  .cr-auth-grid{position:absolute;inset:0;opacity:.3;
    background-image:linear-gradient(#2a323d 1px,transparent 1px),linear-gradient(90deg,#2a323d 1px,transparent 1px);
    background-size:48px 48px;
    -webkit-mask-image:radial-gradient(ellipse 55% 55% at 22% 0%,#000 15%,transparent 70%);
    mask-image:radial-gradient(ellipse 55% 55% at 22% 0%,#000 15%,transparent 70%);}
  .cr-auth-glow-a,.cr-auth-glow-b{position:absolute;width:420px;height:420px;border-radius:50%;filter:blur(120px);}
  .cr-auth-glow-a{top:-150px;left:-150px;background:rgba(35,134,54,0.13);}
  .cr-auth-glow-b{bottom:-140px;right:-120px;background:rgba(88,166,255,0.06);}

  /* Split layout */
  .cr-auth-left{display:none;}
  .cr-auth-right{flex:1;display:flex;align-items:center;justify-content:center;padding:48px 18px;position:relative;z-index:1;}
  @media(min-width:1024px){
    .cr-auth-left{display:flex;flex-direction:column;justify-content:space-between;
      width:46%;position:relative;z-index:1;border-right:1px solid var(--cr-border);padding:44px 52px;}
  }

  /* Left panel — brand + signature terminal + tagline */
  .cr-auth-live{display:flex;align-items:center;gap:8px;}
  .cr-auth-live .dot{width:8px;height:8px;border-radius:50%;background:var(--cr-green);box-shadow:0 0 12px var(--cr-green);animation:cr-auth-pulse 2s infinite;}
  .cr-auth-live span{font-family:var(--cr-mono);font-size:11px;color:#7ee787;letter-spacing:.14em;}
  .cr-auth-brand{font-family:var(--cr-display);font-weight:700;font-size:22px;letter-spacing:-0.02em;margin-top:14px;}
  .cr-auth-brand b{color:var(--cr-green);font-weight:700;}

  .cr-auth-term{border:1px solid var(--cr-border);border-radius:14px;background:var(--cr-bg);overflow:hidden;
    box-shadow:0 20px 60px -22px rgba(0,0,0,0.7);margin:30px 0;}
  .cr-auth-term-bar{display:flex;align-items:center;gap:8px;padding:11px 15px;border-bottom:1px solid var(--cr-border);background:#10151c;}
  .cr-auth-term-bar i{width:10px;height:10px;border-radius:50%;background:#484f58;display:inline-block;}
  .cr-auth-term-bar .name{margin-left:8px;font-family:var(--cr-mono);font-size:11px;color:#6e7681;}
  .cr-auth-term-body{padding:16px;font-family:var(--cr-mono);font-size:13px;line-height:1.55;min-height:196px;}
  .cr-auth-code-line{white-space:pre;color:#c9d1d9;}
  .cr-auth-kw{color:#7ee787;}
  .cr-auth-punc{color:#6e7681;}
  .cr-auth-cursor{display:inline-block;width:7px;height:14px;background:#7ee787;margin-left:2px;vertical-align:middle;animation:cr-auth-pulse 1s infinite;}
  .cr-auth-run{margin-top:8px;color:var(--cr-dim);}
  .cr-auth-pass{margin-top:8px;color:var(--cr-green);display:flex;align-items:center;gap:6px;}

  .cr-auth-tag-label{font-size:13px;color:var(--cr-dim);margin-bottom:6px;}
  .cr-auth-tag-h{font-family:var(--cr-display);font-weight:700;font-size:26px;line-height:1.2;letter-spacing:-0.02em;}
  .cr-auth-tag-p{font-size:13px;color:var(--cr-dim);margin-top:12px;max-width:360px;line-height:1.65;}
  .cr-auth-tag-link{display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:var(--cr-green);text-decoration:none;margin-top:16px;transition:color .2s;}
  .cr-auth-tag-link:hover{color:#56d364;}

  /* Form column */
  .cr-auth-form-wrap{width:100%;max-width:432px;animation:cr-auth-fade .5s ease;}
  .cr-auth-mobrand{display:none;}
  @media(max-width:1023px){.cr-auth-mobrand{display:block;text-align:center;margin-bottom:26px;}}
  .cr-auth-mobrand .badge{display:inline-flex;align-items:center;justify-content:center;width:46px;height:46px;border-radius:13px;
    background:linear-gradient(135deg,var(--cr-green2),var(--cr-green));margin-bottom:12px;}
  .cr-auth-mobrand h1{font-family:var(--cr-display);font-weight:700;font-size:26px;}
  .cr-auth-mobrand h1 b{color:var(--cr-green);}
  .cr-auth-mobrand p{font-family:var(--cr-mono);font-size:12px;color:var(--cr-dimmer);margin-top:4px;}

  .cr-auth-eyebrow{display:inline-flex;align-items:center;gap:8px;font-family:var(--cr-mono);font-size:11px;color:var(--cr-green);
    background:rgba(63,185,80,0.08);border:1px solid rgba(63,185,80,0.25);padding:5px 12px;border-radius:100px;margin-bottom:16px;letter-spacing:.02em;}

  .cr-auth-card{background:var(--cr-panel);border:1px solid var(--cr-border);border-radius:18px;padding:30px;
    box-shadow:0 24px 64px -30px rgba(0,0,0,0.8);}
  .cr-auth-head{margin-bottom:22px;}
  .cr-auth-h2{font-family:var(--cr-display);font-weight:700;font-size:26px;letter-spacing:-0.02em;line-height:1.15;}
  .cr-auth-accent{background:linear-gradient(120deg,#3fb950 0%,#58a6ff 100%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;}
  .cr-auth-sub{font-size:14px;color:var(--cr-dim);margin-top:6px;}

  .cr-auth-divider{display:flex;align-items:center;gap:12px;margin:20px 0;}
  .cr-auth-divider .line{flex:1;height:1px;background:var(--cr-border);}
  .cr-auth-divider span{font-family:var(--cr-mono);font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--cr-dimmer);white-space:nowrap;}

  /* Fields */
  .cr-auth-field{margin-bottom:16px;}
  .cr-auth-label{display:block;font-family:var(--cr-mono);font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--cr-dim);margin-bottom:8px;}
  .cr-auth-label-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;}
  .cr-auth-label-row .cr-auth-label{margin-bottom:0;}
  .cr-auth-forgot{font-size:12px;color:var(--cr-green);text-decoration:none;transition:color .2s;}
  .cr-auth-forgot:hover{color:#56d364;}
  .cr-auth-input-wrap{position:relative;}
  .cr-auth-ico{position:absolute;left:13px;top:50%;transform:translateY(-50%);color:var(--cr-dimmer);pointer-events:none;display:flex;}
  .cr-auth-input{width:100%;background:var(--cr-bg2);border:1px solid var(--cr-border);border-radius:10px;
    padding:11px 12px 11px 40px;color:var(--cr-text);font-size:14px;font-family:var(--cr-body);transition:border-color .2s,box-shadow .2s;}
  .cr-auth-input::placeholder{color:var(--cr-dimmer);}
  .cr-auth-input:hover{border-color:var(--cr-border2);}
  .cr-auth-input:focus{outline:none;border-color:var(--cr-green);box-shadow:0 0 0 3px rgba(63,185,80,0.12);}
  .cr-auth-input.pw{padding-right:42px;}
  .cr-auth-input:-webkit-autofill,.cr-auth-input:-webkit-autofill:hover,.cr-auth-input:-webkit-autofill:focus{
    -webkit-text-fill-color:var(--cr-text);-webkit-box-shadow:0 0 0 40px var(--cr-bg2) inset;caret-color:var(--cr-text);}
  .cr-auth-eye{position:absolute;right:6px;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--cr-dimmer);cursor:pointer;padding:7px;display:flex;transition:color .2s;}
  .cr-auth-eye:hover{color:var(--cr-dim);}

  /* Role selector — reads like the Landing node boxes */
  .cr-auth-roles{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
  .cr-auth-role{display:flex;align-items:center;justify-content:center;gap:8px;padding:12px;border-radius:10px;
    border:1px solid var(--cr-border);background:var(--cr-bg2);color:var(--cr-dim);font-size:14px;font-weight:600;
    font-family:var(--cr-body);cursor:pointer;transition:all .2s;}
  .cr-auth-role:hover{border-color:var(--cr-border2);color:var(--cr-text);}
  .cr-auth-role.active{border-color:var(--cr-green);background:rgba(63,185,80,0.1);color:var(--cr-text);box-shadow:0 0 0 3px rgba(63,185,80,0.12);}

  /* Password strength */
  .cr-auth-strength{margin-top:10px;}
  .cr-auth-strength-bars{display:flex;gap:5px;margin-bottom:6px;}
  .cr-auth-strength-bar{height:4px;flex:1;border-radius:100px;background:var(--cr-border);transition:background .3s;}
  .cr-auth-strength-txt{font-size:11px;font-family:var(--cr-mono);color:var(--cr-dim);}
  .cr-auth-strength-txt.hint{color:var(--cr-dimmer);}

  /* Terms */
  .cr-auth-terms{display:flex;align-items:flex-start;gap:10px;cursor:pointer;user-select:none;}
  .cr-auth-terms input{margin-top:2px;width:16px;height:16px;accent-color:var(--cr-green);cursor:pointer;flex-shrink:0;}
  .cr-auth-terms span{font-size:13px;color:var(--cr-dim);line-height:1.5;transition:color .2s;}
  .cr-auth-terms:hover span{color:var(--cr-text);}
  .cr-auth-terms a{color:var(--cr-green);text-decoration:none;}
  .cr-auth-terms a:hover{text-decoration:underline;}

  /* Error + inline messages */
  .cr-auth-error{display:flex;align-items:flex-start;gap:8px;background:rgba(248,81,73,0.08);border:1px solid rgba(248,81,73,0.3);
    border-radius:10px;padding:10px 12px;animation:cr-auth-shake .4s;}
  .cr-auth-error svg{flex-shrink:0;margin-top:1px;color:var(--cr-red);}
  .cr-auth-error p{font-size:13px;color:var(--cr-red);}
  .cr-auth-mismatch{font-size:12px;color:var(--cr-red);margin-top:6px;}

  /* Buttons */
  .cr-auth-btn{position:relative;width:100%;display:flex;align-items:center;justify-content:center;gap:8px;
    background:var(--cr-green2);color:#fff;font-family:var(--cr-body);font-weight:600;font-size:14px;
    padding:12px;border:none;border-radius:10px;cursor:pointer;transition:all .2s;overflow:hidden;margin-top:4px;}
  .cr-auth-btn:hover:not(:disabled){background:var(--cr-green);box-shadow:0 0 24px rgba(63,185,80,0.35);}
  .cr-auth-btn:active:not(:disabled){transform:scale(.98);}
  .cr-auth-btn:disabled{background:var(--cr-panel2);color:var(--cr-dimmer);cursor:not-allowed;}
  .cr-auth-btn .arrow{transition:transform .2s;}
  .cr-auth-btn:hover:not(:disabled) .arrow{transform:translateX(2px);}
  .cr-auth-btn-load{display:flex;align-items:center;gap:8px;}

  /* Social */
  .cr-auth-social-group{display:flex;flex-direction:column;gap:10px;}
  .cr-auth-social{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;background:var(--cr-bg2);
    border:1px solid var(--cr-border);color:var(--cr-text);font-family:var(--cr-body);font-weight:500;font-size:14px;
    padding:11px;border-radius:10px;cursor:pointer;transition:all .2s;}
  .cr-auth-social:hover{border-color:var(--cr-border2);background:var(--cr-panel2);}

  /* Footer link */
  .cr-auth-foot{text-align:center;font-size:14px;color:var(--cr-dim);margin-top:22px;}
  .cr-auth-foot a{color:var(--cr-green);font-weight:600;text-decoration:none;transition:color .2s;}
  .cr-auth-foot a:hover{color:#56d364;text-decoration:underline;}

  .cr-auth-spin{animation:cr-auth-spin 1s linear infinite;}

  @keyframes cr-auth-spin{to{transform:rotate(360deg);}}
  @keyframes cr-auth-pulse{0%,100%{opacity:1;}50%{opacity:.4;}}
  @keyframes cr-auth-fade{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:none;}}
  @keyframes cr-auth-shake{0%,100%{transform:translateX(0);}25%{transform:translateX(-4px);}75%{transform:translateX(4px);}}
  @media(prefers-reduced-motion:reduce){.cr-auth-root *{animation:none!important;transition:none!important;}}
`;

// ─── Signature terminal content ────────────────────────────────────────────────
const CODE_LINES = [
    'function twoSum(nums, target) {',
    '  const seen = new Map();',
    '  for (let i = 0; i < nums.length; i++) {',
    '    const need = target - nums[i];',
    '    if (seen.has(need)) return [seen.get(need), i];',
    '    seen.set(nums[i], i);',
    '  }',
    '}',
];
const KEYWORDS = ['function', 'const', 'let', 'if', 'for', 'return'];
const PUNCTUATION = ['(', ')', '{', '}', '[', ']', ',', ';'];

const highlightLine = (line) => {
    const tokens = line.split(/(\s+|[(){}[\],;])/).filter((t) => t !== '');
    return tokens.map((token, i) => {
        if (KEYWORDS.includes(token)) return <span key={i} className="cr-auth-kw">{token}</span>;
        if (PUNCTUATION.includes(token)) return <span key={i} className="cr-auth-punc">{token}</span>;
        return <span key={i}>{token}</span>;
    });
};

const CheckIcon = () => (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
        <path fillRule="evenodd" clipRule="evenodd" d="M13.78 4.22a.75.75 0 010 1.06l-6.5 6.5a.75.75 0 01-1.06 0l-3-3a.75.75 0 111.06-1.06l2.47 2.47 5.97-5.97a.75.75 0 011.06 0z" />
    </svg>
);
const ArrowIcon = () => (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
        <path fillRule="evenodd" clipRule="evenodd" d="M8.22 2.97a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06l2.97-2.97H2.75a.75.75 0 010-1.5h8.44L8.22 4.03a.75.75 0 010-1.06z" />
    </svg>
);

const AuthLayout = ({ children }) => {
    const [visibleLines, setVisibleLines] = useState([]);
    const [charCount, setCharCount] = useState(0);
    const [phase, setPhase] = useState('typing'); // 'typing' | 'running' | 'done'
    const timeoutRef = useRef(null);

    useEffect(() => {
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReducedMotion) {
            setVisibleLines(CODE_LINES);
            setPhase('done');
            return;
        }

        let lineIndex = 0;
        let charIndex = 0;

        const tick = () => {
            if (lineIndex >= CODE_LINES.length) {
                setPhase('running');
                timeoutRef.current = setTimeout(() => setPhase('done'), 900);
                return;
            }
            const currentLine = CODE_LINES[lineIndex];
            if (charIndex <= currentLine.length) {
                setCharCount(charIndex);
                charIndex += 1;
                timeoutRef.current = setTimeout(tick, 18 + Math.random() * 22);
            } else {
                setVisibleLines((prev) => [...prev, currentLine]);
                lineIndex += 1;
                charIndex = 0;
                setCharCount(0);
                timeoutRef.current = setTimeout(tick, 120);
            }
        };
        timeoutRef.current = setTimeout(tick, 400);
        return () => clearTimeout(timeoutRef.current);
    }, []);

    const currentLineIndex = visibleLines.length;
    const currentLineText =
        currentLineIndex < CODE_LINES.length
            ? CODE_LINES[currentLineIndex].slice(0, charCount)
            : '';

    return (
        <div className="cr-auth-root">
            <style>{AUTH_CSS}</style>

            {/* Ambient background */}
            <div className="cr-auth-bg">
                <div className="cr-auth-grid" />
                <div className="cr-auth-glow-a" />
                <div className="cr-auth-glow-b" />
            </div>

            {/* Left panel — desktop only */}
            <div className="cr-auth-left">
                <div>
                    <div className="cr-auth-live">
                        <span className="dot" />
                        <span>LIVE SESSION</span>
                    </div>
                    <div className="cr-auth-brand">Code<b>Room</b></div>
                </div>

                {/* Signature: the interview terminal that types + runs itself */}
                <div className="cr-auth-term">
                    <div className="cr-auth-term-bar">
                        <i /><i /><i />
                        <span className="name">solution.js</span>
                    </div>
                    <div className="cr-auth-term-body">
                        {visibleLines.map((line, i) => (
                            <div key={i} className="cr-auth-code-line">{highlightLine(line)}</div>
                        ))}
                        {phase === 'typing' && (
                            <div className="cr-auth-code-line">
                                {highlightLine(currentLineText)}
                                <span className="cr-auth-cursor" />
                            </div>
                        )}
                        {phase === 'running' && <div className="cr-auth-run">Running test cases…</div>}
                        {phase === 'done' && (
                            <div className="cr-auth-pass"><CheckIcon /> 4 / 4 test cases passed</div>
                        )}
                    </div>
                </div>

                <div>
                    <p className="cr-auth-tag-label">Welcome to</p>
                    <h2 className="cr-auth-tag-h">The room where<br />you actually code.</h2>
                    <p className="cr-auth-tag-p">
                        Live video, synced editing, and real sandboxed execution — every
                        session runs exactly like the job would.
                    </p>
                    <Link to="/" className="cr-auth-tag-link">
                        See how it works <ArrowIcon />
                    </Link>
                </div>
            </div>

            {/* Right panel — the form */}
            <div className="cr-auth-right">{children}</div>
        </div>
    );
};

export default AuthLayout;