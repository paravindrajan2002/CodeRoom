import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

// ─── Service detail data ──────────────────────────────────────────────────────
const NODES = {
  frontend: {
    color: "#58a6ff",
    title: "Frontend",
    role: "React · Vite · Tailwind · Zustand",
    does: [
      "Renders the interview room, editor, video panel, and dashboards",
      "Holds a persistent socket to the relay for real-time updates",
      "Calls the backend directly over REST for auth and data",
      "Runs the WebRTC peer connections in the browser",
    ],
    talks:
      "Opens a WebSocket to the Relay for live collaboration, and makes authenticated REST calls to the Backend for everything durable.",
    why: "A thin, stateless client. All truth lives server-side, so a refresh restores full session state from Redis and Postgres.",
  },
  relay: {
    color: "#3fb950",
    title: "Relay",
    role: "Node.js · Socket.io · ioredis",
    does: [
      "Broadcasts code changes and cursor moves to all participants",
      "Routes WebRTC offer / answer / ICE between specific peers",
      "Forwards run & submit requests to the backend, streams results back",
      "Persists live state to Redis and autosaves to the backend",
    ],
    talks:
      "Sits between Frontend and Backend. Nothing durable is stored here — it is a fast, ephemeral message router backed by Redis pub/sub.",
    why: "Node's event loop suits thousands of tiny frequent messages far better than a JVM thread-per-request model. Video signaling only — media stays peer-to-peer.",
  },
  backend: {
    color: "#d29922",
    title: "Backend",
    role: "Spring Boot · Spring Security · JPA",
    does: [
      "Owns auth: register, login, JWT access + refresh, roles",
      "Manages the interview lifecycle, scoring, and question bank",
      "Filters test cases (Run = visible, Submit = all) then calls the executor",
      "Streams recordings to Cloudflare R2 and proxies the AI copilot",
    ],
    talks:
      "The source of truth. Talks to Postgres for persistence, the Executor for code runs, and external services (R2, Gemini).",
    why: "Correctness, security, and relational data belong in a mature, structured framework. JPA + Postgres is the right tool for users, scores, and test cases.",
  },
  executor: {
    color: "#bc8cff",
    title: "Executor",
    role: "Node.js · Dockerode",
    does: [
      "Spins up one throwaway Docker container per test case",
      "Caps memory (128MB), CPU (0.5 core), and processes; no network",
      "Handles Python, JS, Java, Go, C++ with per-language strategies",
      "Runs all test cases in parallel, separates stdout from pass/fail",
    ],
    talks:
      "Receives code + test cases from the Backend, returns structured results. Talks to nothing else — fully walled off.",
    why: "Running arbitrary code is the riskiest part of the system. Isolating it means a runaway or malicious submission can only ever destroy its own container.",
  },
  redis: {
    color: "#f85149",
    title: "Redis",
    role: "Upstash · ephemeral cache + pub/sub",
    does: [
      "Holds hot live room state — current code, language, participants",
      "Backs Socket.io pub/sub so multiple relay instances stay in sync",
      "Everything carries a TTL — nothing here is permanent",
    ],
    talks: "Read and written only by the Relay.",
    why: "Live state changes on every keystroke. Writing that to Postgres would hammer it — Redis absorbs the churn while Postgres stays the durable record.",
  },
  postgres: {
    color: "#e6edf3",
    title: "Postgres",
    role: "Neon · durable source of truth",
    does: [
      "Stores users, interviews, scores, questions, and test cases",
      "Holds the recording URL once an interview is captured",
      "Receives the autosaved code snapshot from the relay",
    ],
    talks: "Accessed only by the Backend through JPA.",
    why: "Relational, transactional, permanent. The single place that survives restarts, refreshes, and Redis expiry.",
  },
};

const EDGE_MAP = {
  frontend: ["e-fe-relay", "e-fe-be"],
  relay: ["e-fe-relay", "e-relay-be", "e-relay-redis"],
  backend: ["e-fe-be", "e-relay-be", "e-be-exec", "e-be-pg"],
  executor: ["e-be-exec"],
  redis: ["e-relay-redis"],
  postgres: ["e-be-pg"],
};

const FEATURES = [
  { icon: "🎥", title: "N-way mesh video", body: "Peer-to-peer WebRTC mesh. Up to four interviewers plus a candidate, with the candidate's feed always emphasized. Video never touches the server." },
  { icon: "⚡", title: "Sandboxed execution", body: "Python, JavaScript, Java, Go, and C++ run in isolated Docker containers — capped memory, no network, auto-destroyed. Test cases run in parallel." },
  { icon: "🧩", title: "Run vs Submit", body: "LeetCode-style split: Run checks visible cases fast; Submit runs the full hidden suite. Separate stdout terminal and per-case pass/fail views." },
  { icon: "📝", title: "Live collaborative editor", body: "Real-time code sync across all participants, per-language starter templates, and markdown questions with images for tree and graph problems." },
  { icon: "⏺", title: "Session recording", body: "Screen and webcam composited on a canvas, mixed audio, uploaded to Cloudflare R2. Shareable playback link saved to the interview." },
  { icon: "🤖", title: "AI copilot", body: "A private Gemini-powered assistant for interviewers — suggests follow-ups and evaluates approaches, never visible to the candidate." },
];

const DECISIONS = [
  { pick: "Three services", over: "one monolith", body: "Running untrusted candidate code is dangerous, and real-time signaling is latency-sensitive. Keeping them in one process means a runaway container could stall video, or a crash could take down auth. <strong>Splitting by responsibility</strong> — truth, real-time, isolation — lets each scale, fail, and restart independently." },
  { pick: "Node + Socket.io relay", over: "Spring WebSocket", body: "The relay handles thousands of tiny, frequent messages — keystrokes, cursor moves, ICE candidates. Node's event loop and Socket.io's mature ecosystem fit this far better than a JVM thread-per-request model. It also proves a <strong>polyglot integration</strong> between a non-JVM real-time layer and a Spring backend." },
  { pick: "Docker-per-testcase", over: "shared runtime", body: "Each test case runs in its own throwaway container with capped CPU and memory, no network, and a process limit that stops fork bombs. Parallelized so compiled languages stay fast. <strong>Isolation over speed</strong> — a malicious submission can only ever hurt itself." },
  { pick: "WebRTC mesh", over: "SFU / server relay", body: "For interview-sized rooms (2–5 people) a full mesh keeps video <strong>peer-to-peer</strong> — the server only relays signaling, never media. Lower cost, lower latency, and no video ever passes through infrastructure. An SFU would only pay off at larger scale." },
  { pick: "Redis as ephemeral cache", over: "DB for live state", body: "Live room state — current code, language, participants — changes constantly. Writing every keystroke to Postgres would hammer it. Redis holds hot state with a TTL for fast reads and cross-instance pub/sub, while <strong>Postgres stays the durable source of truth</strong> via periodic autosave." },
  { pick: "Unsigned client uploads", over: "proxy through backend", body: "Question images upload straight from the browser to Cloudinary with an unsigned preset scoped to one folder. The API secret never leaves the vault, and the backend never buffers large files. <strong>The right amount of security</strong> for non-sensitive assets." },
];

const STACK = [
  { h: "Frontend", items: ["React 19", "Vite", "Tailwind CSS", "Zustand", "CodeMirror 6", "Socket.io client"] },
  { h: "Backend", items: ["Spring Boot 4", "Spring Security", "JPA / Hibernate", "JWT auth", "AWS S3 SDK", "Gemini API"] },
  { h: "Real-time & Exec", items: ["Node.js", "Socket.io", "Dockerode", "WebRTC", "ioredis", "Express"] },
  { h: "Infrastructure", items: ["Neon Postgres", "Upstash Redis", "Cloudflare R2", "Cloudinary", "Oracle Cloud ARM", "Vercel"] },
];

// ⇩⇩⇩ EDIT THIS to your actual repo URL ⇩⇩⇩
const GITHUB_URL = "https://github.com/mightyanubhav/CodeRoom";

const Landing = () => {
  const [activeNode, setActiveNode] = useState(null);
  const svgRef = useRef(null);
  const reduceMotion = useRef(false);

  // ─── Flow-dot animation along the main data paths ──────────────────────────
  useEffect(() => {
    reduceMotion.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduceMotion.current || !svgRef.current) return;

    const svg = svgRef.current;
    const paths = [
      { dot: "dot1", path: "e-fe-relay", delay: 0 },
      { dot: "dot2", path: "e-relay-be", delay: 500 },
      { dot: "dot3", path: "e-be-exec", delay: 1000 },
    ];
    let raf;
    const starts = {};

    const loop = (ts) => {
      paths.forEach((p) => {
        const dot = svg.querySelector(`#${p.dot}`);
        const path = svg.querySelector(`#${p.path}`);
        if (!dot || !path) return;
        if (starts[p.dot] == null) starts[p.dot] = ts;
        const dur = 1600;
        const elapsed = ts - starts[p.dot] - p.delay;
        if (elapsed < 0) return;
        const len = path.getTotalLength();
        const t = (elapsed % dur) / dur;
        const pt = path.getPointAtLength(t * len);
        dot.setAttribute("cx", pt.x);
        dot.setAttribute("cy", pt.y);
        dot.style.opacity = t < 0.1 || t > 0.9 ? "0" : "0.9";
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // ─── Scroll reveal ──────────────────────────────────────────────────────────
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("in");
        });
      },
      { threshold: 0.12 }
    );
    document.querySelectorAll(".cr-reveal").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const detail = activeNode ? NODES[activeNode] : null;

  const nodeClass = (key) =>
    "cr-node-box" + (activeNode === key ? " active" : "");

  const edgeOpacity = (id) => {
    if (!activeNode) return undefined;
    return (EDGE_MAP[activeNode] || []).includes(id) ? 1 : 0.15;
  };

  return (
    <div className="cr-root">
      <style>{CSS}</style>

      {/* NAV */}
      <nav className="cr-nav">
        <div className="cr-nav-inner">
          <div className="cr-logo">
            <span className="cr-dot" />
            Code<span>Room</span>
          </div>
          <div className="cr-nav-links">
            <a className="cr-navlink" href="#architecture">Architecture</a>
            <a className="cr-navlink" href="#features">Features</a>
            <a className="cr-navlink" href="#decisions">Decisions</a>
            <a className="cr-navlink" href="#stack">Stack</a>
            <Link className="cr-btn cr-btn-ghost" to="/login">Sign in</Link>
            <Link className="cr-btn cr-btn-primary" to="/register">Get started</Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <header className="cr-hero">
        <div className="cr-hero-grid" />
        <div className="cr-hero-inner">
          <div className="cr-eyebrow">◆ Real-time collaborative interviewing</div>
          <h1 className="cr-h1">
            Run technical interviews<br />like{" "}
            <span className="cr-accent">production systems</span>
          </h1>
          <p className="cr-hero-sub">
            A collaborative coding platform with live video, multi-language
            execution in isolated sandboxes, and session recording — built as
            three specialized services that each do one job well.
          </p>
          <div className="cr-hero-cta">
            <Link className="cr-btn cr-btn-primary cr-btn-lg" to="/register">
              Start interviewing free
            </Link>
            <a className="cr-btn cr-btn-ghost cr-btn-lg" href="#architecture">
              Explore the architecture →
            </a>
          </div>
          <div className="cr-hero-stats">
            <div className="cr-stat"><div className="n">3</div><div className="l">specialized services</div></div>
            <div className="cr-stat"><div className="n">5</div><div className="l">languages sandboxed</div></div>
            <div className="cr-stat"><div className="n">N-way</div><div className="l">WebRTC mesh video</div></div>
            <div className="cr-stat"><div className="n">&lt;5%</div><div className="l">exec overhead vs bare metal</div></div>
          </div>
        </div>
      </header>

      {/* ARCHITECTURE */}
      <section className="cr-arch cr-section-pad" id="architecture">
        <div className="cr-wrap">
          <div className="cr-section-head cr-reveal">
            <div className="cr-section-label">System design</div>
            <h2 className="cr-section-title">One diagram, three responsibilities</h2>
            <p className="cr-section-desc">
              CodeRoom is deliberately split into three services. Click any node
              to see what it owns, how it communicates, and the reasoning behind
              isolating it. The animated paths show live data flow.
            </p>
          </div>

          <div className="cr-arch-layout">
            {/* DIAGRAM */}
            <div className="cr-diagram-shell cr-reveal">
              <div className="cr-diagram-hint">
                <span className="cr-blink" />
                Interactive — click any service to inspect it
              </div>
              <svg ref={svgRef} className="cr-diagram" viewBox="0 0 640 470" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <marker id="cr-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                    <path d="M0,0 L6,3 L0,6 Z" fill="#5c6773" />
                  </marker>
                </defs>

                {/* EDGES */}
                <g>
                  <path className="cr-edge" id="e-fe-relay" style={{ opacity: edgeOpacity("e-fe-relay") }} d="M 150 90 L 150 175" markerEnd="url(#cr-arrow)" />
                  <text className="cr-edge-label" x="158" y="140">ws / socket.io</text>

                  <path className="cr-edge" id="e-fe-be" style={{ opacity: edgeOpacity("e-fe-be") }} d="M 210 70 Q 470 70 490 175" markerEnd="url(#cr-arrow)" />
                  <text className="cr-edge-label" x="330" y="55">REST / JWT</text>

                  <path className="cr-edge" id="e-relay-be" style={{ opacity: edgeOpacity("e-relay-be") }} d="M 230 210 L 410 210" markerEnd="url(#cr-arrow)" />
                  <text className="cr-edge-label" x="285" y="200">exec + autosave</text>

                  <path className="cr-edge" id="e-relay-redis" style={{ opacity: edgeOpacity("e-relay-redis") }} d="M 150 250 L 150 330" markerEnd="url(#cr-arrow)" />
                  <text className="cr-edge-label" x="158" y="295">pub/sub + state</text>

                  <path className="cr-edge" id="e-be-exec" style={{ opacity: edgeOpacity("e-be-exec") }} d="M 490 250 L 490 330" markerEnd="url(#cr-arrow)" />
                  <text className="cr-edge-label" x="498" y="295">run code</text>

                  <path className="cr-edge" id="e-be-pg" style={{ opacity: edgeOpacity("e-be-pg") }} d="M 560 210 L 610 210" markerEnd="url(#cr-arrow)" />

                  <circle className="cr-flow-dot" r="3.5" id="dot1" />
                  <circle className="cr-flow-dot" r="3.5" id="dot2" />
                  <circle className="cr-flow-dot" r="3.5" id="dot3" />
                </g>

                {/* NODES */}
                <g className={nodeClass("frontend")} onClick={() => setActiveNode("frontend")}>
                  <rect className="cr-node-rect" x="60" y="20" width="180" height="50" rx="10" style={{ stroke: activeNode === "frontend" ? NODES.frontend.color : undefined }} />
                  <text className="cr-node-title" x="76" y="42">Frontend</text>
                  <text className="cr-node-sub" x="76" y="58" fill="#58a6ff">React · Vite · Tailwind</text>
                </g>

                <g className={nodeClass("relay")} onClick={() => setActiveNode("relay")}>
                  <rect className="cr-node-rect" x="60" y="178" width="170" height="66" rx="10" style={{ stroke: activeNode === "relay" ? NODES.relay.color : undefined }} />
                  <text className="cr-node-title" x="76" y="203">Relay</text>
                  <text className="cr-node-sub" x="76" y="219" fill="#3fb950">Node.js · Socket.io</text>
                  <text className="cr-node-tech" x="76" y="233">real-time · webrtc signaling</text>
                </g>

                <g className={nodeClass("backend")} onClick={() => setActiveNode("backend")}>
                  <rect className="cr-node-rect" x="410" y="178" width="150" height="66" rx="10" style={{ stroke: activeNode === "backend" ? NODES.backend.color : undefined }} />
                  <text className="cr-node-title" x="426" y="203">Backend</text>
                  <text className="cr-node-sub" x="426" y="219" fill="#d29922">Spring Boot · JPA</text>
                  <text className="cr-node-tech" x="426" y="233">source of truth</text>
                </g>

                <g className={nodeClass("redis")} onClick={() => setActiveNode("redis")}>
                  <rect className="cr-node-rect" x="70" y="333" width="160" height="54" rx="10" style={{ stroke: activeNode === "redis" ? NODES.redis.color : undefined }} />
                  <text className="cr-node-title" x="86" y="356">Redis</text>
                  <text className="cr-node-sub" x="86" y="372" fill="#f85149">Upstash · ephemeral</text>
                </g>

                <g className={nodeClass("executor")} onClick={() => setActiveNode("executor")}>
                  <rect className="cr-node-rect" x="410" y="333" width="160" height="54" rx="10" style={{ stroke: activeNode === "executor" ? NODES.executor.color : undefined }} />
                  <text className="cr-node-title" x="426" y="356">Executor</text>
                  <text className="cr-node-sub" x="426" y="372" fill="#bc8cff">Node · Docker sandbox</text>
                </g>

                <g className={nodeClass("postgres")} onClick={() => setActiveNode("postgres")}>
                  <rect className="cr-node-rect" x="595" y="185" width="30" height="50" rx="6" style={{ stroke: activeNode === "postgres" ? NODES.postgres.color : undefined }} />
                  <text className="cr-node-tech" x="610" y="213" textAnchor="middle" transform="rotate(90 610 210)" style={{ fontSize: "9px", fill: "#e6edf3" }}>Postgres</text>
                </g>
              </svg>
            </div>

            {/* DETAIL PANEL */}
            <div className="cr-detail cr-reveal">
              {!detail ? (
                <div className="cr-detail-empty">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#5c6773" strokeWidth="1.5">
                    <path d="M15 15l6 6m-11-4a7 7 0 110-14 7 7 0 010 14z" strokeLinecap="round" />
                  </svg>
                  <p>Click a service in the diagram<br />to inspect its role and rationale.</p>
                </div>
              ) : (
                <div>
                  <div className="cr-detail-tag" style={{ color: detail.color, background: detail.color + "1a", border: `1px solid ${detail.color}44` }}>
                    {detail.role}
                  </div>
                  <h3 className="cr-detail-h3">{detail.title}</h3>
                  <div className="cr-detail-section">
                    <h4>What it does</h4>
                    <ul>{detail.does.map((d, i) => <li key={i}>{d}</li>)}</ul>
                  </div>
                  <div className="cr-detail-section">
                    <h4>How it communicates</h4>
                    <p>{detail.talks}</p>
                  </div>
                  <div className="cr-detail-section cr-detail-why">
                    <h4>Why this way</h4>
                    <p>{detail.why}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="cr-section-pad" id="features">
        <div className="cr-wrap">
          <div className="cr-section-head cr-reveal">
            <div className="cr-section-label">Capabilities</div>
            <h2 className="cr-section-title">Everything an interview actually needs</h2>
          </div>
          <div className="cr-feat-grid">
            {FEATURES.map((f, i) => (
              <div className="cr-feat cr-reveal" key={i}>
                <div className="cr-feat-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DECISIONS */}
      <section className="cr-decisions cr-section-pad" id="decisions">
        <div className="cr-wrap">
          <div className="cr-section-head cr-reveal">
            <div className="cr-section-label">Engineering decisions</div>
            <h2 className="cr-section-title">Why it's built this way</h2>
            <p className="cr-section-desc">
              Every architectural choice was a tradeoff. Here's the reasoning an
              interviewer would want to hear.
            </p>
          </div>
          <div className="cr-reveal">
            {DECISIONS.map((d, i) => (
              <div className="cr-decision-row" key={i}>
                <div className="cr-decision-choice">
                  <div className="vs">Chose</div>
                  <div className="pick">{d.pick}</div>
                  <div className="over">{d.over}</div>
                </div>
                <div className="cr-decision-body">
                  <p dangerouslySetInnerHTML={{ __html: d.body }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STACK */}
      <section className="cr-section-pad" id="stack">
        <div className="cr-wrap">
          <div className="cr-section-head cr-reveal">
            <div className="cr-section-label">Technology</div>
            <h2 className="cr-section-title">The full stack</h2>
          </div>
          <div className="cr-stack-grid cr-reveal">
            {STACK.map((col, i) => (
              <div className="cr-stack-col" key={i}>
                <h4>{col.h}</h4>
                <ul>{col.items.map((it, j) => <li key={j}>{it}</li>)}</ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="cr-cta-final">
        <div className="cr-wrap">
          <h2>See it running</h2>
          <p>
            Create an account and run a full interview loop — question, live
            code, sandboxed execution, and recording — in a few minutes.
          </p>
          <div className="cr-hero-cta" style={{ justifyContent: "center" }}>
            <Link className="cr-btn cr-btn-primary cr-btn-lg" to="/register">
              Create free account
            </Link>
            <a className="cr-btn cr-btn-ghost cr-btn-lg" href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
              View source on GitHub →
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="cr-footer">
        <div className="cr-wrap cr-footer-inner">
          <p>CodeRoom — built by Anubhav</p>
          <div className="cr-footer-links">
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">GitHub</a>
            <Link to="/login">Sign in</Link>
            <Link to="/register">Get started</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

// ─── Scoped CSS (all selectors prefixed cr- to avoid clashing with the app) ────
const CSS = `
  .cr-root {
    --cr-bg:#0a0e14; --cr-bg2:#0d1117; --cr-panel:#161b22; --cr-panel2:#1c232d;
    --cr-border:#2a323d; --cr-border2:#3a444f; --cr-text:#e6edf3; --cr-dim:#8b949e;
    --cr-dimmer:#5c6773; --cr-green:#3fb950; --cr-green2:#238636; --cr-blue:#58a6ff;
    --cr-mono:'JetBrains Mono',ui-monospace,monospace;
    --cr-display:'Space Grotesk','Segoe UI',sans-serif;
    --cr-body:'Inter',system-ui,sans-serif;
    background:var(--cr-bg); color:var(--cr-text); font-family:var(--cr-body);
    line-height:1.6; -webkit-font-smoothing:antialiased; overflow-x:hidden;
    min-height:100vh;
  }
  .cr-root *{margin:0;padding:0;box-sizing:border-box;}
  .cr-root ::selection{background:rgba(63,185,80,0.3);}
  .cr-wrap{max-width:1160px;margin:0 auto;padding:0 24px;}

  .cr-nav{position:fixed;top:0;left:0;right:0;z-index:100;background:rgba(10,14,20,0.8);backdrop-filter:blur(12px);border-bottom:1px solid var(--cr-border);}
  .cr-nav-inner{max-width:1160px;margin:0 auto;padding:14px 24px;display:flex;align-items:center;justify-content:space-between;}
  .cr-logo{font-family:var(--cr-display);font-weight:700;font-size:19px;letter-spacing:-0.02em;display:flex;align-items:center;gap:8px;}
  .cr-logo span{color:var(--cr-green);}
  .cr-dot{width:9px;height:9px;border-radius:50%;background:var(--cr-green);box-shadow:0 0 12px var(--cr-green);animation:cr-pulse 2s infinite;}
  .cr-nav-links{display:flex;align-items:center;gap:28px;}
  .cr-navlink{font-size:14px;color:var(--cr-dim);transition:color .2s;text-decoration:none;}
  .cr-navlink:hover{color:var(--cr-text);}
  .cr-btn{font-family:var(--cr-body);font-size:14px;font-weight:600;padding:8px 16px;border-radius:8px;cursor:pointer;border:1px solid transparent;transition:all .2s;display:inline-block;text-decoration:none;}
  .cr-btn-ghost{color:var(--cr-dim);border-color:var(--cr-border);background:transparent;}
  .cr-btn-ghost:hover{color:var(--cr-text);border-color:var(--cr-border2);}
  .cr-btn-primary{background:var(--cr-green2);color:#fff;}
  .cr-btn-primary:hover{background:var(--cr-green);box-shadow:0 0 24px rgba(63,185,80,0.35);}
  @keyframes cr-pulse{0%,100%{opacity:1;}50%{opacity:.4;}}

  .cr-hero{padding:160px 0 90px;position:relative;}
  .cr-hero-grid{position:absolute;inset:0;z-index:0;opacity:.35;background-image:linear-gradient(#2a323d 1px,transparent 1px),linear-gradient(90deg,#2a323d 1px,transparent 1px);background-size:48px 48px;-webkit-mask-image:radial-gradient(ellipse 70% 60% at 50% 0%,#000 30%,transparent 75%);mask-image:radial-gradient(ellipse 70% 60% at 50% 0%,#000 30%,transparent 75%);}
  .cr-hero-inner{position:relative;z-index:1;text-align:center;max-width:820px;margin:0 auto;}
  .cr-eyebrow{display:inline-flex;align-items:center;gap:8px;font-family:var(--cr-mono);font-size:12px;color:var(--cr-green);background:rgba(63,185,80,0.08);border:1px solid rgba(63,185,80,0.25);padding:6px 14px;border-radius:100px;margin-bottom:28px;letter-spacing:.02em;}
  .cr-h1{font-family:var(--cr-display);font-weight:700;font-size:clamp(38px,6vw,66px);line-height:1.03;letter-spacing:-0.03em;margin-bottom:22px;}
  .cr-accent{background:linear-gradient(120deg,#3fb950 0%,#58a6ff 100%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;}
  .cr-hero-sub{font-size:clamp(16px,2vw,19px);color:var(--cr-dim);max-width:620px;margin:0 auto 38px;}
  .cr-hero-cta{display:flex;gap:14px;justify-content:center;flex-wrap:wrap;}
  .cr-btn-lg{padding:13px 26px;font-size:15px;border-radius:10px;}
  .cr-hero-stats{display:flex;justify-content:center;gap:48px;margin-top:64px;flex-wrap:wrap;}
  .cr-stat{text-align:center;}
  .cr-stat .n{font-family:var(--cr-display);font-weight:700;font-size:30px;color:var(--cr-text);}
  .cr-stat .l{font-family:var(--cr-mono);font-size:12px;color:var(--cr-dimmer);margin-top:2px;}

  .cr-section-pad{padding:90px 0;position:relative;}
  .cr-section-head{max-width:640px;margin-bottom:48px;}
  .cr-section-label{font-family:var(--cr-mono);font-size:12px;color:var(--cr-green);letter-spacing:.08em;text-transform:uppercase;margin-bottom:12px;}
  .cr-section-title{font-family:var(--cr-display);font-weight:700;font-size:clamp(28px,4vw,40px);letter-spacing:-0.02em;line-height:1.1;margin-bottom:14px;}
  .cr-section-desc{color:var(--cr-dim);font-size:16px;}

  .cr-arch{background:var(--cr-bg2);border-top:1px solid var(--cr-border);border-bottom:1px solid var(--cr-border);}
  .cr-arch-layout{display:grid;grid-template-columns:1fr 380px;gap:32px;align-items:start;}
  .cr-diagram-shell{background:var(--cr-panel);border:1px solid var(--cr-border);border-radius:16px;padding:20px;}
  .cr-diagram-hint{font-family:var(--cr-mono);font-size:11px;color:var(--cr-dimmer);margin-bottom:10px;display:flex;align-items:center;gap:6px;}
  .cr-blink{width:6px;height:6px;border-radius:50%;background:#d29922;animation:cr-pulse 1.4s infinite;}
  .cr-diagram{width:100%;height:auto;display:block;}
  .cr-node-box{cursor:pointer;}
  .cr-node-rect{fill:var(--cr-panel2);stroke:var(--cr-border2);stroke-width:1.5;transition:all .2s;}
  .cr-node-box:hover .cr-node-rect{stroke-width:2;filter:brightness(1.2);}
  .cr-node-box.active .cr-node-rect{stroke-width:2.5;}
  .cr-node-title{font-family:var(--cr-display);font-weight:600;font-size:13px;fill:var(--cr-text);pointer-events:none;}
  .cr-node-sub{font-family:var(--cr-mono);font-size:9.5px;pointer-events:none;}
  .cr-node-tech{font-family:var(--cr-mono);font-size:8.5px;fill:var(--cr-dimmer);pointer-events:none;}
  .cr-edge{stroke:var(--cr-border2);stroke-width:1.5;fill:none;opacity:.5;transition:opacity .2s;}
  .cr-edge-label{font-family:var(--cr-mono);font-size:8px;fill:var(--cr-dimmer);pointer-events:none;}
  .cr-flow-dot{fill:var(--cr-green);opacity:0;}

  .cr-detail{background:var(--cr-panel);border:1px solid var(--cr-border);border-radius:16px;padding:24px;position:sticky;top:88px;min-height:420px;}
  .cr-detail-tag{font-family:var(--cr-mono);font-size:11px;padding:4px 10px;border-radius:6px;display:inline-block;margin-bottom:14px;}
  .cr-detail-h3{font-family:var(--cr-display);font-weight:700;font-size:22px;margin-bottom:16px;letter-spacing:-0.01em;}
  .cr-detail-section{margin-bottom:18px;}
  .cr-detail-section h4{font-family:var(--cr-mono);font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--cr-dimmer);margin-bottom:8px;}
  .cr-detail-section p{font-size:14px;color:var(--cr-dim);}
  .cr-detail-section ul{list-style:none;}
  .cr-detail-section li{font-size:13.5px;color:var(--cr-dim);padding-left:18px;position:relative;margin-bottom:6px;}
  .cr-detail-section li::before{content:"▸";position:absolute;left:0;color:var(--cr-green);}
  .cr-detail-why{background:rgba(63,185,80,0.06);border:1px solid rgba(63,185,80,0.2);border-radius:10px;padding:14px;}
  .cr-detail-why h4{color:var(--cr-green);}
  .cr-detail-why p{color:var(--cr-text);font-size:13.5px;}
  .cr-detail-empty{color:var(--cr-dimmer);font-size:14px;text-align:center;padding-top:80px;}
  .cr-detail-empty svg{opacity:.3;margin-bottom:14px;}

  .cr-feat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;}
  .cr-feat{background:var(--cr-panel);border:1px solid var(--cr-border);border-radius:14px;padding:24px;transition:all .2s;}
  .cr-feat:hover{border-color:var(--cr-border2);transform:translateY(-3px);}
  .cr-feat-icon{width:40px;height:40px;border-radius:10px;margin-bottom:16px;display:flex;align-items:center;justify-content:center;background:var(--cr-panel2);border:1px solid var(--cr-border);font-size:18px;}
  .cr-feat h3{font-family:var(--cr-display);font-weight:600;font-size:16px;margin-bottom:8px;}
  .cr-feat p{font-size:13.5px;color:var(--cr-dim);}

  .cr-decisions{background:var(--cr-bg2);border-top:1px solid var(--cr-border);border-bottom:1px solid var(--cr-border);}
  .cr-decision-row{display:grid;grid-template-columns:200px 1fr;gap:24px;padding:26px 0;border-bottom:1px solid var(--cr-border);}
  .cr-decision-row:last-child{border-bottom:none;}
  .cr-decision-choice .vs{font-family:var(--cr-mono);font-size:12px;color:var(--cr-dimmer);margin-bottom:6px;}
  .cr-decision-choice .pick{font-family:var(--cr-display);font-weight:600;font-size:17px;color:var(--cr-green);}
  .cr-decision-choice .over{font-family:var(--cr-mono);font-size:12px;color:var(--cr-dimmer);margin-top:2px;text-decoration:line-through;}
  .cr-decision-body p{font-size:14.5px;color:var(--cr-dim);}
  .cr-decision-body strong{color:var(--cr-text);font-weight:600;}

  .cr-stack-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;}
  .cr-stack-col h4{font-family:var(--cr-mono);font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--cr-green);margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid var(--cr-border);}
  .cr-stack-col ul{list-style:none;}
  .cr-stack-col li{font-size:13.5px;color:var(--cr-dim);padding:5px 0;font-family:var(--cr-mono);}

  .cr-cta-final{text-align:center;padding:100px 0;}
  .cr-cta-final h2{font-family:var(--cr-display);font-weight:700;font-size:clamp(30px,5vw,48px);letter-spacing:-0.02em;margin-bottom:18px;}
  .cr-cta-final p{color:var(--cr-dim);font-size:17px;margin-bottom:34px;max-width:520px;margin-left:auto;margin-right:auto;}

  .cr-footer{border-top:1px solid var(--cr-border);padding:40px 0;}
  .cr-footer-inner{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px;}
  .cr-footer-inner p{font-size:13px;color:var(--cr-dimmer);font-family:var(--cr-mono);}
  .cr-footer-links{display:flex;gap:20px;}
  .cr-footer-links a{font-size:13px;color:var(--cr-dim);transition:color .2s;text-decoration:none;}
  .cr-footer-links a:hover{color:var(--cr-text);}

  .cr-reveal{opacity:0;transform:translateY(20px);transition:opacity .6s,transform .6s;}
  .cr-reveal.in{opacity:1;transform:none;}

  @media (max-width:900px){
    .cr-arch-layout{grid-template-columns:1fr;}
    .cr-detail{position:static;min-height:auto;}
    .cr-feat-grid{grid-template-columns:1fr;}
    .cr-stack-grid{grid-template-columns:repeat(2,1fr);}
    .cr-decision-row{grid-template-columns:1fr;gap:10px;}
    .cr-nav-links .cr-navlink{display:none;}
  }
  @media (prefers-reduced-motion:reduce){
    .cr-root *{animation:none!important;transition:none!important;}
    .cr-reveal{opacity:1;transform:none;}
  }
`;

export default Landing;