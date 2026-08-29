import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

// ─── Service detail data ──────────────────────────────────────────────────────
const NODES = {
  client: {
    color: "#58a6ff",
    title: "Browser / Client",
    role: "React · Vite · Tailwind · Zustand",
    does: [
      "Serves the interview room, editor, video panel, dashboards, and authentication UI",
      "Connects to the public HTTPS endpoint through Nginx",
      "Uses REST for durable API operations and Socket.IO for real-time collaboration",
      "Runs WebRTC peer connections directly in the browser",
    ],
    talks:
      "All browser traffic enters through Nginx over HTTPS. REST requests are routed to Spring Boot, while Socket.IO connections are routed to the Node Relay.",
    why: "The frontend is statically built and served directly from the VM, keeping the entire application under one stable public endpoint without requiring Vercel.",
  },

  nginx: {
    color: "#22c55e",
    title: "Nginx",
    role: "Reverse proxy · TLS · Static hosting",
    does: [
      "Terminates HTTPS using the Let's Encrypt certificate",
      "Serves the React/Vite production build from /var/www/coderoom",
      "Routes /api/* to Spring Boot on localhost:8080",
      "Routes /socket.io/* to the Node Relay on localhost:4000",
    ],
    talks:
      "Acts as the single public entry point. External traffic reaches Nginx on ports 80/443; application services remain bound to the VM.",
    why: "Nginx gives the application one stable HTTPS endpoint while keeping internal services off the public network. It also handles WebSocket upgrades and large API uploads.",
  },

  relay: {
    color: "#3fb950",
    title: "Relay",
    role: "Node.js · Socket.io · ioredis",
    does: [
      "Broadcasts code changes and cursor moves to participants",
      "Routes WebRTC offer / answer / ICE signaling between peers",
      "Forwards run and submit requests to Spring Boot",
      "Maintains live room state and autosaves through Redis/backend",
    ],
    talks:
      "Receives Socket.IO connections from Nginx and communicates with Spring Boot and Redis over the VM/private network.",
    why: "Node's event-driven model is well suited to frequent real-time messages such as keystrokes, cursor movements, presence, and WebRTC signaling.",
  },

  backend: {
    color: "#d29922",
    title: "Backend",
    role: "Spring Boot · Spring Security · JPA",
    does: [
      "Owns authentication, JWT access/refresh tokens, and roles",
      "Manages interviews, rooms, scoring, questions, and test cases",
      "Processes Run/Submit requests and communicates with the Executor",
      "Handles recordings, Cloudflare R2 integration, and the Gemini AI copilot",
    ],
    talks:
      "Receives REST traffic from Nginx and internal requests from the Relay. Persists durable data to Neon PostgreSQL and calls the Executor, R2, and Gemini.",
    why: "Spring Boot owns business correctness and security while JPA/PostgreSQL provide durable transactional storage.",
  },

  executor: {
    color: "#bc8cff",
    title: "Executor",
    role: "Node.js · Dockerode · Docker",
    does: [
      "Creates a throwaway Docker container for each test case",
      "Supports Python, JavaScript, Java, Go, and C++",
      "Limits memory, CPU, processes, and network access",
      "Runs test cases and returns structured stdout/pass-fail results",
    ],
    talks:
      "Receives code and test cases from Spring Boot and returns execution results. It does not communicate with the public internet or browser.",
    why: "Untrusted candidate code must be isolated from the application. Docker provides a disposable security boundary around each execution.",
  },

  redis: {
    color: "#f85149",
    title: "Redis",
    role: "Upstash · ephemeral state + pub/sub",
    does: [
      "Stores hot interview state such as code, language, and participants",
      "Reduces database writes caused by frequent editor changes",
      "Supports pub/sub for real-time relay communication",
      "Uses expiration/TTL for temporary state",
    ],
    talks:
      "Used primarily by the Relay for live room state and real-time coordination.",
    why: "Live collaborative state changes frequently. Redis absorbs that high-frequency workload while PostgreSQL remains the durable source of truth.",
  },

  postgres: {
    color: "#e6edf3",
    title: "PostgreSQL",
    role: "Neon · durable database",
    does: [
      "Stores users, interviews, rooms, scores, questions, and test cases",
      "Stores durable interview/session information",
      "Stores recording URLs and persisted code snapshots",
      "Provides transactional relational storage through JPA/Hibernate",
    ],
    talks:
      "Accessed by Spring Boot through JPA/Hibernate. The browser and Relay never access PostgreSQL directly.",
    why: "PostgreSQL is the permanent source of truth. External Neon hosting also keeps the database independent from the VM lifecycle.",
  },

  r2: {
    color: "#f97316",
    title: "Cloudflare R2",
    role: "Object storage · recordings",
    does: [
      "Stores interview recordings and large media objects",
      "Keeps binary files outside PostgreSQL",
      "Provides a public/shareable recording URL",
      "Works with the backend through the S3-compatible API",
    ],
    talks:
      "Spring Boot uploads recordings to R2 and persists the resulting recording URL in PostgreSQL.",
    why: "Large recordings should not live inside a relational database. Object storage is cheaper and better suited for large media files.",
  },

  gemini: {
    color: "#60a5fa",
    title: "Gemini API",
    role: "External AI service",
    does: [
      "Powers the interviewer AI copilot",
      "Provides interview assistance and evaluation capabilities",
      "Is accessed through the Spring Boot backend",
      "Keeps the provider API key away from the browser",
    ],
    talks:
      "The browser never calls Gemini directly. Spring Boot acts as the secure integration layer.",
    why: "Keeping the AI credential server-side prevents exposing the API key in the production frontend.",
  },

  vm: {
    color: "#a78bfa",
    title: "Oracle Cloud VM",
    role: "Production compute · Linux · systemd",
    does: [
      "Hosts Nginx, the React production build, Spring Boot, Relay, and Docker",
      "Runs Spring Boot and Relay as systemd services",
      "Provides the Docker runtime used by the Executor",
      "Acts as the single application compute layer",
    ],
    talks:
      "Nginx, Spring Boot, Relay, and Docker communicate locally inside the VM. Only Nginx is exposed publicly.",
    why: "For the current small-scale application, one inexpensive VM keeps infrastructure simple and free/low-cost while still providing HTTPS, process supervision, reverse proxying, and isolated execution.",
  },
};

const EDGE_MAP = {
  client: ["e-nginx-client"],

  nginx: [
    "e-domain-nginx",
    "e-nginx-client",
    "e-nginx-backend",
    "e-nginx-relay",
  ],

  relay: ["e-nginx-relay", "e-relay-redis", "e-relay-executor"],

  backend: ["e-nginx-backend", "e-backend-executor"],

  executor: [
    "e-backend-executor",
    "e-relay-executor",
    "e-executor-postgres",
    "e-executor-r2",
    "e-executor-gemini",
  ],

  redis: ["e-relay-redis"],

  postgres: ["e-executor-postgres"],

  r2: ["e-executor-r2"],

  gemini: ["e-executor-gemini"],

  vm: [
    "e-nginx-client",
    "e-nginx-backend",
    "e-nginx-relay",
    "e-relay-redis",
    "e-backend-executor",
    "e-relay-executor",
  ],
};

const FEATURES = [
  {
    icon: "🎥",
    title: "N-way mesh video",
    body: "Peer-to-peer WebRTC mesh. Up to four interviewers plus a candidate, with the candidate's feed always emphasized. Video never touches the server.",
  },
  {
    icon: "⚡",
    title: "Sandboxed execution",
    body: "Python, JavaScript, Java, Go, and C++ run in isolated Docker containers — capped memory, no network, auto-destroyed. Test cases run in parallel.",
  },
  {
    icon: "🧩",
    title: "Run vs Submit",
    body: "LeetCode-style split: Run checks visible cases fast; Submit runs the full hidden suite. Separate stdout terminal and per-case pass/fail views.",
  },
  {
    icon: "📝",
    title: "Live collaborative editor",
    body: "Real-time code sync across all participants, per-language starter templates, and markdown questions with images for tree and graph problems.",
  },
  {
    icon: "⏺",
    title: "Session recording",
    body: "Screen and webcam composited on a canvas, mixed audio, uploaded to Cloudflare R2. Shareable playback link saved to the interview.",
  },
  {
    icon: "🤖",
    title: "AI copilot",
    body: "A private Gemini-powered assistant for interviewers — suggests follow-ups and evaluates approaches, never visible to the candidate.",
  },
];

const DECISIONS = [
  {
    pick: "Three services",
    over: "one monolith",
    body: "Running untrusted candidate code is dangerous, and real-time signaling is latency-sensitive. Keeping them in one process means a runaway container could stall video, or a crash could take down auth. <strong>Splitting by responsibility</strong> — truth, real-time, isolation — lets each scale, fail, and restart independently.",
  },
  {
    pick: "Node + Socket.io relay",
    over: "Spring WebSocket",
    body: "The relay handles thousands of tiny, frequent messages — keystrokes, cursor moves, ICE candidates. Node's event loop and Socket.io's mature ecosystem fit this far better than a JVM thread-per-request model. It also proves a <strong>polyglot integration</strong> between a non-JVM real-time layer and a Spring backend.",
  },
  {
    pick: "Docker-per-testcase",
    over: "shared runtime",
    body: "Each test case runs in its own throwaway container with capped CPU and memory, no network, and a process limit that stops fork bombs. Parallelized so compiled languages stay fast. <strong>Isolation over speed</strong> — a malicious submission can only ever hurt itself.",
  },
  {
    pick: "WebRTC mesh",
    over: "SFU / server relay",
    body: "For interview-sized rooms (2–5 people) a full mesh keeps video <strong>peer-to-peer</strong> — the server only relays signaling, never media. Lower cost, lower latency, and no video ever passes through infrastructure. An SFU would only pay off at larger scale.",
  },
  {
    pick: "Redis as ephemeral cache",
    over: "DB for live state",
    body: "Live room state — current code, language, participants — changes constantly. Writing every keystroke to Postgres would hammer it. Redis holds hot state with a TTL for fast reads and cross-instance pub/sub, while <strong>Postgres stays the durable source of truth</strong> via periodic autosave.",
  },
  {
    pick: "Unsigned client uploads",
    over: "proxy through backend",
    body: "Question images upload straight from the browser to Cloudinary with an unsigned preset scoped to one folder. The API secret never leaves the vault, and the backend never buffers large files. <strong>The right amount of security</strong> for non-sensitive assets.",
  },

  {
    pick: "Nginx as the public gateway",
    over: "exposing each service directly",
    body: "The application exposes a single stable HTTPS endpoint through Nginx. <strong>Only Nginx is public</strong>; Spring Boot and the Relay stay on localhost. Nginx terminates TLS, serves the React build, routes REST requests, and upgrades Socket.IO connections to WebSockets.",
  },

  {
    pick: "One VM deployment",
    over: "multiple cloud services",
    body: "For the current interview-sized workload, running the frontend, backend, relay, and Docker executor on one VM keeps the architecture inexpensive and operationally simple. <strong>systemd provides process supervision</strong>, while Docker isolates untrusted code. The design can later split services onto separate machines when scale requires it.",
  },

  {
    pick: "DuckDNS + Let's Encrypt",
    over: "paid custom domain",
    body: "The production deployment uses a free DuckDNS hostname with a Let's Encrypt certificate. <strong>This provides a stable HTTPS URL</strong> without purchasing a domain, while still supporting secure browser APIs, WebSockets, and WebRTC signaling.",
  },
];

const STACK = [
  {
    h: "Frontend",
    items: [
      "React 19",
      "Vite",
      "Tailwind CSS",
      "Zustand",
      "CodeMirror 6",
      "Socket.io client",
    ],
  },

  {
    h: "Backend",
    items: [
      "Spring Boot 4",
      "Spring Security",
      "JPA / Hibernate",
      "JWT auth",
      "REST API",
      "Gemini API",
    ],
  },

  {
    h: "Real-time & Exec",
    items: ["Node.js", "Socket.io", "Dockerode", "Docker", "WebRTC", "ioredis"],
  },

  {
    h: "Production",
    items: [
      "Oracle Cloud VM",
      "Nginx",
      "systemd",
      "DuckDNS",
      "Let's Encrypt",
      "HTTPS",
    ],
  },

  {
    h: "Data & Storage",
    items: [
      "Neon PostgreSQL",
      "Upstash Redis",
      "Cloudflare R2",
      "S3-compatible API",
    ],
  },
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
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduceMotion.current || !svgRef.current) return;

    const svg = svgRef.current;
    const paths = [
      { dot: "dot1", path: "e-nginx-backend", delay: 0 },
      { dot: "dot2", path: "e-backend-executor", delay: 500 },
      { dot: "dot3", path: "e-relay-executor", delay: 1000 },
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
      { threshold: 0.12 },
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
            <a className="cr-navlink" href="#architecture">
              Architecture
            </a>
            <a className="cr-navlink" href="#features">
              Features
            </a>
            <a className="cr-navlink" href="#decisions">
              Decisions
            </a>
            <a className="cr-navlink" href="#stack">
              Stack
            </a>
            <Link className="cr-btn cr-btn-ghost" to="/login">
              Sign in
            </Link>
            <Link className="cr-btn cr-btn-primary" to="/register">
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <header className="cr-hero">
        <div className="cr-hero-grid" />
        <div className="cr-hero-inner">
          <div className="cr-eyebrow">
            ◆ Real-time collaborative interviewing
          </div>
          <h1 className="cr-h1">
            Run technical interviews
            <br />
            like <span className="cr-accent">production systems</span>
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
            <div className="cr-stat">
              <div className="n">1</div>
              <div className="l">production VM</div>
            </div>

            <div className="cr-stat">
              <div className="n">3</div>
              <div className="l">application services</div>
            </div>

            <div className="cr-stat">
              <div className="n">HTTPS</div>
              <div className="l">Let's Encrypt + Nginx</div>
            </div>

            <div className="cr-stat">
              <div className="n">5</div>
              <div className="l">sandboxed languages</div>
            </div>
          </div>
        </div>
      </header>

      {/* ARCHITECTURE */}
      <section className="cr-arch cr-section-pad" id="architecture">
        <div className="cr-wrap">
          <div className="cr-section-head cr-reveal">
            <div className="cr-section-label">System design</div>
            <h2 className="cr-section-title">
              One diagram, the whole production system
            </h2>
            <p className="cr-section-desc">
              CodeRoom separates real-time collaboration, business logic, and
              untrusted code execution while Nginx provides a single HTTPS entry
              point. Click any node to inspect what it owns, how it
              communicates, and why it exists.
            </p>
          </div>

          <div className="cr-arch-layout">
            {/* DIAGRAM */}
            <div className="cr-diagram-shell cr-reveal">
              <div className="cr-diagram-hint">
                <span className="cr-blink" />
                Interactive — click any service to inspect it
              </div>
              <svg
                ref={svgRef}
                className="cr-diagram"
                viewBox="0 0 640 590"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <marker
                    id="cr-arrow"
                    markerWidth="8"
                    markerHeight="8"
                    refX="6"
                    refY="3"
                    orient="auto"
                  >
                    <path d="M0,0 L6,3 L0,6 Z" fill="#5c6773" />
                  </marker>
                </defs>

                {/* EDGES */}
                <g>
                  {/* internet → domain → nginx */}
                  <path
                    className="cr-edge"
                    id="e-internet-domain"
                    d="M 320 26 L 320 46"
                    markerEnd="url(#cr-arrow)"
                  />
                  <path
                    className="cr-edge"
                    id="e-domain-nginx"
                    style={{ opacity: edgeOpacity("e-domain-nginx") }}
                    d="M 320 74 L 320 96"
                    markerEnd="url(#cr-arrow)"
                  />
                  <text className="cr-edge-label" x="332" y="88">
                    HTTPS :443
                  </text>

                  {/* nginx → client / backend / relay */}
                  <path
                    className="cr-edge"
                    id="e-nginx-client"
                    style={{ opacity: edgeOpacity("e-nginx-client") }}
                    d="M 280 146 L 120 186"
                    markerEnd="url(#cr-arrow)"
                  />
                  <path
                    className="cr-edge"
                    id="e-nginx-backend"
                    style={{ opacity: edgeOpacity("e-nginx-backend") }}
                    d="M 320 146 L 320 186"
                    markerEnd="url(#cr-arrow)"
                  />
                  <path
                    className="cr-edge"
                    id="e-nginx-relay"
                    style={{ opacity: edgeOpacity("e-nginx-relay") }}
                    d="M 360 146 L 520 186"
                    markerEnd="url(#cr-arrow)"
                  />

                  {/* relay → redis */}
                  <path
                    className="cr-edge"
                    id="e-relay-redis"
                    style={{ opacity: edgeOpacity("e-relay-redis") }}
                    d="M 520 246 L 520 276"
                    markerEnd="url(#cr-arrow)"
                  />
                  <text className="cr-edge-label" x="528" y="264">
                    pub/sub
                  </text>

                  {/* backend → executor */}
                  <path
                    className="cr-edge"
                    id="e-backend-executor"
                    style={{ opacity: edgeOpacity("e-backend-executor") }}
                    d="M 320 246 L 320 390"
                    markerEnd="url(#cr-arrow)"
                  />
                  <text className="cr-edge-label" x="328" y="320">
                    run code
                  </text>

                  {/* relay → executor (elbow, enters from the right) */}
                  <path
                    className="cr-edge"
                    id="e-relay-executor"
                    style={{ opacity: edgeOpacity("e-relay-executor") }}
                    d="M 520 246 L 520 420 L 400 420"
                    markerEnd="url(#cr-arrow)"
                  />

                  {/* executor → postgres / r2 / gemini */}
                  <path
                    className="cr-edge"
                    id="e-executor-postgres"
                    style={{ opacity: edgeOpacity("e-executor-postgres") }}
                    d="M 280 450 L 120 506"
                    markerEnd="url(#cr-arrow)"
                  />
                  <path
                    className="cr-edge"
                    id="e-executor-r2"
                    style={{ opacity: edgeOpacity("e-executor-r2") }}
                    d="M 320 450 L 320 506"
                    markerEnd="url(#cr-arrow)"
                  />
                  <path
                    className="cr-edge"
                    id="e-executor-gemini"
                    style={{ opacity: edgeOpacity("e-executor-gemini") }}
                    d="M 360 450 L 520 506"
                    markerEnd="url(#cr-arrow)"
                  />

                  <circle className="cr-flow-dot" r="3.5" id="dot1" />
                  <circle className="cr-flow-dot" r="3.5" id="dot2" />
                  <circle className="cr-flow-dot" r="3.5" id="dot3" />
                </g>

                {/* INTERNET + DOMAIN (non-interactive) */}
                <text
                  className="cr-node-title"
                  x="320"
                  y="18"
                  textAnchor="middle"
                  style={{ fill: "#5c6773", letterSpacing: "0.08em" }}
                >
                  INTERNET
                </text>
                <text
                  className="cr-node-sub"
                  x="320"
                  y="62"
                  textAnchor="middle"
                  fill="#8b949e"
                >
                  coderoom-1.duckdns.org
                </text>

                {/* NGINX */}
                <g
                  className={nodeClass("nginx")}
                  onClick={() => setActiveNode("nginx")}
                >
                  <rect
                    className="cr-node-rect"
                    x="240"
                    y="96"
                    width="160"
                    height="50"
                    rx="10"
                    style={{
                      stroke:
                        activeNode === "nginx" ? NODES.nginx.color : undefined,
                    }}
                  />
                  <text
                    className="cr-node-title"
                    x="320"
                    y="118"
                    textAnchor="middle"
                  >
                    NGINX
                  </text>
                  <text
                    className="cr-node-sub"
                    x="320"
                    y="134"
                    textAnchor="middle"
                    fill="#22c55e"
                  >
                    TLS + Reverse Proxy
                  </text>
                </g>

                {/* CLIENT / FRONTEND */}
                <g
                  className={nodeClass("client")}
                  onClick={() => setActiveNode("client")}
                >
                  <rect
                    className="cr-node-rect"
                    x="40"
                    y="186"
                    width="160"
                    height="60"
                    rx="10"
                    style={{
                      stroke:
                        activeNode === "client" ? NODES.client.color : undefined,
                    }}
                  />
                  <text className="cr-node-title" x="56" y="210">
                    React / Vite
                  </text>
                  <text className="cr-node-sub" x="56" y="226" fill="#58a6ff">
                    Frontend
                  </text>
                  <text className="cr-node-tech" x="56" y="240">
                    /var/www/coderoom
                  </text>
                </g>

                {/* BACKEND */}
                <g
                  className={nodeClass("backend")}
                  onClick={() => setActiveNode("backend")}
                >
                  <rect
                    className="cr-node-rect"
                    x="240"
                    y="186"
                    width="160"
                    height="60"
                    rx="10"
                    style={{
                      stroke:
                        activeNode === "backend"
                          ? NODES.backend.color
                          : undefined,
                    }}
                  />
                  <text className="cr-node-title" x="256" y="210">
                    Spring Boot
                  </text>
                  <text className="cr-node-sub" x="256" y="226" fill="#d29922">
                    Backend :8080
                  </text>
                  <text className="cr-node-tech" x="256" y="240">
                    source of truth
                  </text>
                </g>

                {/* RELAY */}
                <g
                  className={nodeClass("relay")}
                  onClick={() => setActiveNode("relay")}
                >
                  <rect
                    className="cr-node-rect"
                    x="440"
                    y="186"
                    width="160"
                    height="60"
                    rx="10"
                    style={{
                      stroke:
                        activeNode === "relay" ? NODES.relay.color : undefined,
                    }}
                  />
                  <text className="cr-node-title" x="456" y="210">
                    Node Relay
                  </text>
                  <text className="cr-node-sub" x="456" y="226" fill="#3fb950">
                    Socket.io :4000
                  </text>
                  <text className="cr-node-tech" x="456" y="240">
                    webrtc signaling
                  </text>
                </g>

                {/* REDIS */}
                <g
                  className={nodeClass("redis")}
                  onClick={() => setActiveNode("redis")}
                >
                  <rect
                    className="cr-node-rect"
                    x="440"
                    y="276"
                    width="160"
                    height="54"
                    rx="10"
                    style={{
                      stroke:
                        activeNode === "redis" ? NODES.redis.color : undefined,
                    }}
                  />
                  <text className="cr-node-title" x="456" y="299">
                    Redis
                  </text>
                  <text className="cr-node-sub" x="456" y="315" fill="#f85149">
                    Upstash · ephemeral
                  </text>
                </g>

                {/* EXECUTOR */}
                <g
                  className={nodeClass("executor")}
                  onClick={() => setActiveNode("executor")}
                >
                  <rect
                    className="cr-node-rect"
                    x="240"
                    y="390"
                    width="160"
                    height="60"
                    rx="10"
                    style={{
                      stroke:
                        activeNode === "executor"
                          ? NODES.executor.color
                          : undefined,
                    }}
                  />
                  <text className="cr-node-title" x="256" y="414">
                    Executor
                  </text>
                  <text className="cr-node-sub" x="256" y="430" fill="#bc8cff">
                    Docker sandbox
                  </text>
                  <text className="cr-node-tech" x="256" y="444">
                    isolated execution
                  </text>
                </g>

                {/* POSTGRES */}
                <g
                  className={nodeClass("postgres")}
                  onClick={() => setActiveNode("postgres")}
                >
                  <rect
                    className="cr-node-rect"
                    x="40"
                    y="506"
                    width="160"
                    height="54"
                    rx="10"
                    style={{
                      stroke:
                        activeNode === "postgres"
                          ? NODES.postgres.color
                          : undefined,
                    }}
                  />
                  <text className="cr-node-title" x="56" y="529">
                    Neon Postgres
                  </text>
                  <text className="cr-node-sub" x="56" y="545" fill="#e6edf3">
                    durable storage
                  </text>
                </g>

                {/* R2 */}
                <g
                  className={nodeClass("r2")}
                  onClick={() => setActiveNode("r2")}
                >
                  <rect
                    className="cr-node-rect"
                    x="240"
                    y="506"
                    width="160"
                    height="54"
                    rx="10"
                    style={{
                      stroke: activeNode === "r2" ? NODES.r2.color : undefined,
                    }}
                  />
                  <text className="cr-node-title" x="256" y="529">
                    Cloudflare R2
                  </text>
                  <text className="cr-node-sub" x="256" y="545" fill="#f97316">
                    recordings
                  </text>
                </g>

                {/* GEMINI */}
                <g
                  className={nodeClass("gemini")}
                  onClick={() => setActiveNode("gemini")}
                >
                  <rect
                    className="cr-node-rect"
                    x="440"
                    y="506"
                    width="160"
                    height="54"
                    rx="10"
                    style={{
                      stroke:
                        activeNode === "gemini"
                          ? NODES.gemini.color
                          : undefined,
                    }}
                  />
                  <text className="cr-node-title" x="456" y="529">
                    Gemini
                  </text>
                  <text className="cr-node-sub" x="456" y="545" fill="#60a5fa">
                    AI copilot
                  </text>
                </g>
              </svg>
            </div>

            {/* DETAIL PANEL */}
            <div className="cr-detail cr-reveal">
              {!detail ? (
                <div className="cr-detail-empty">
                  <svg
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#5c6773"
                    strokeWidth="1.5"
                  >
                    <path
                      d="M15 15l6 6m-11-4a7 7 0 110-14 7 7 0 010 14z"
                      strokeLinecap="round"
                    />
                  </svg>
                  <p>
                    Click a service in the diagram
                    <br />
                    to inspect its role and rationale.
                  </p>
                </div>
              ) : (
                <div>
                  <div
                    className="cr-detail-tag"
                    style={{
                      color: detail.color,
                      background: detail.color + "1a",
                      border: `1px solid ${detail.color}44`,
                    }}
                  >
                    {detail.role}
                  </div>
                  <h3 className="cr-detail-h3">{detail.title}</h3>
                  <div className="cr-detail-section">
                    <h4>What it does</h4>
                    <ul>
                      {detail.does.map((d, i) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
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
            <h2 className="cr-section-title">
              Everything an interview actually needs
            </h2>
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
                <ul>
                  {col.items.map((it, j) => (
                    <li key={j}>{it}</li>
                  ))}
                </ul>
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
            <a
              className="cr-btn cr-btn-ghost cr-btn-lg"
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
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
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
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