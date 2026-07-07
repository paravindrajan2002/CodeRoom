import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../../store/authStore.js";
import { INTERVIEW_STATUS } from "../../utils/constants.js";
import { useInterviews } from "../../hooks/useInterviews.js";
import { useClipboard } from "../../hooks/useClipboard.js";
import ScoreModal from "../../components/room/ScoreModal.jsx";
import { CardSkeletonList } from "../../components/shared/Skeleton.jsx";
import EmptyState from "../../components/shared/EmptyState.jsx";
import StatsRow from "../../components/dashboard/StatsRow.jsx";
import CreateInterviewForm from "../../components/dashboard/CreateInterviewForm.jsx";
import InterviewCard from "../../components/dashboard/InterviewCard.jsx";
import FilterBar from "../../components/dashboard/FilterBar.jsx";

/* ────────────────────────────────────────────────────────────────────────────
   Shared dashboard design system — same tokens, fonts, and treatments as the
   Landing page and the auth screens (cr- system), scoped under .cr-dash-root so
   nothing leaks into the rest of the app. Dashboard injects this once; StatsRow,
   CreateInterviewForm, FilterBar, InterviewCard, and StatusBadge just use the
   classes. If the display faces are already loaded globally, the @import below
   is a harmless no-op — remove it if you prefer.
   ──────────────────────────────────────────────────────────────────────────── */
export const DASH_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

  .cr-dash-root{
    --cr-bg:#0a0e14; --cr-bg2:#0d1117; --cr-panel:#161b22; --cr-panel2:#1c232d;
    --cr-border:#2a323d; --cr-border2:#3a444f; --cr-text:#e6edf3; --cr-dim:#8b949e;
    --cr-dimmer:#5c6773; --cr-green:#3fb950; --cr-green2:#238636; --cr-blue:#58a6ff;
    --cr-purple:#bc8cff; --cr-yellow:#d29922; --cr-red:#f85149;
    --cr-mono:'JetBrains Mono',ui-monospace,monospace;
    --cr-display:'Space Grotesk','Segoe UI',sans-serif;
    --cr-body:'Inter',system-ui,sans-serif;
    min-height:100vh; background:var(--cr-bg); color:var(--cr-text);
    font-family:var(--cr-body); line-height:1.6; -webkit-font-smoothing:antialiased;
  }
  .cr-dash-root *{margin:0;padding:0;box-sizing:border-box;}
  .cr-dash-root ::selection{background:rgba(63,185,80,0.3);}

  /* Nav */
  .cr-dash-nav{position:sticky;top:0;z-index:20;background:rgba(10,14,20,0.85);backdrop-filter:blur(12px);border-bottom:1px solid var(--cr-border);}
  .cr-dash-nav-inner{max-width:1120px;margin:0 auto;padding:12px 24px;display:flex;align-items:center;justify-content:space-between;gap:16px;}
  .cr-dash-nav-left{display:flex;align-items:center;gap:24px;}
  .cr-dash-logo{display:flex;align-items:center;gap:8px;font-family:var(--cr-display);font-weight:700;font-size:18px;letter-spacing:-0.02em;}
  .cr-dash-logo b{color:var(--cr-green);font-weight:700;}
  .cr-dash-logo-dot{width:8px;height:8px;border-radius:50%;background:var(--cr-green);box-shadow:0 0 10px var(--cr-green);animation:cr-dash-pulse 2s infinite;}
  .cr-dash-navlink{display:inline-flex;align-items:center;gap:6px;font-family:var(--cr-body);font-size:14px;color:var(--cr-dim);background:none;border:none;cursor:pointer;transition:color .2s;}
  .cr-dash-navlink:hover{color:var(--cr-text);}
  .cr-dash-nav-right{display:flex;align-items:center;gap:12px;}
  .cr-dash-user{display:flex;align-items:center;gap:10px;padding-right:12px;border-right:1px solid var(--cr-border);}
  .cr-dash-avatar{width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,var(--cr-green2),var(--cr-green));display:flex;align-items:center;justify-content:center;font-family:var(--cr-display);font-weight:700;font-size:12px;color:#fff;flex-shrink:0;}
  .cr-dash-user-name{font-size:14px;font-weight:500;line-height:1.25;}
  .cr-dash-user-role{font-family:var(--cr-mono);font-size:10px;color:var(--cr-dim);text-transform:uppercase;letter-spacing:.04em;line-height:1.3;}
  .cr-dash-signout{display:inline-flex;align-items:center;gap:6px;font-family:var(--cr-body);font-size:14px;color:var(--cr-dim);background:none;border:1px solid var(--cr-border);padding:7px 12px;border-radius:9px;cursor:pointer;transition:all .2s;}
  .cr-dash-signout:hover{color:var(--cr-red);border-color:rgba(248,81,73,0.4);}
  @media(max-width:640px){.cr-dash-user{display:none;}}

  /* Layout */
  .cr-dash-main{max-width:1120px;margin:0 auto;padding:32px 24px;}

  /* Hero */
  .cr-dash-hero{position:relative;overflow:hidden;border:1px solid var(--cr-border);border-radius:18px;background:linear-gradient(135deg,var(--cr-panel),var(--cr-bg2));padding:28px;margin-bottom:24px;}
  .cr-dash-hero-grid{position:absolute;inset:0;z-index:0;opacity:.22;background-image:linear-gradient(#2a323d 1px,transparent 1px),linear-gradient(90deg,#2a323d 1px,transparent 1px);background-size:44px 44px;-webkit-mask-image:radial-gradient(ellipse 60% 90% at 92% 0%,#000 8%,transparent 68%);mask-image:radial-gradient(ellipse 60% 90% at 92% 0%,#000 8%,transparent 68%);}
  .cr-dash-hero-glow{position:absolute;top:-90px;right:-50px;width:280px;height:280px;border-radius:50%;background:rgba(35,134,54,0.13);filter:blur(80px);pointer-events:none;}
  .cr-dash-hero-inner{position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:24px;}
  .cr-dash-eyebrow{font-family:var(--cr-mono);font-size:11px;color:var(--cr-green);text-transform:uppercase;letter-spacing:.14em;margin-bottom:10px;}
  .cr-dash-greeting{font-family:var(--cr-display);font-weight:700;font-size:clamp(24px,4vw,32px);letter-spacing:-0.02em;line-height:1.1;margin-bottom:8px;}
  .cr-dash-greeting b{background:linear-gradient(120deg,#3fb950,#58a6ff);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;font-weight:700;}
  .cr-dash-hero-sub{font-size:14px;color:var(--cr-dim);max-width:440px;}
  @media(min-width:640px){.cr-dash-hero{padding:32px;}}

  /* Buttons */
  .cr-dash-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;font-family:var(--cr-body);font-weight:600;font-size:14px;border-radius:10px;cursor:pointer;border:1px solid transparent;transition:all .2s;white-space:nowrap;}
  .cr-dash-btn-primary{background:var(--cr-green2);color:#fff;padding:12px 20px;}
  .cr-dash-btn-primary:hover:not(:disabled){background:var(--cr-green);box-shadow:0 0 24px rgba(63,185,80,0.35);}
  .cr-dash-btn-primary:disabled{opacity:.5;cursor:not-allowed;}
  .cr-dash-btn-ghost{background:transparent;border-color:var(--cr-border);color:var(--cr-dim);padding:11px 16px;}
  .cr-dash-btn-ghost:hover{color:var(--cr-text);border-color:var(--cr-border2);}
  .cr-dash-btn-sm{padding:7px 12px;font-size:12px;font-weight:500;border-radius:9px;}
  .cr-dash-btn-blue{background:transparent;border-color:rgba(88,166,255,0.28);color:var(--cr-blue);}
  .cr-dash-btn-blue:hover{color:#fff;border-color:var(--cr-blue);}
  .cr-dash-btn-purple{background:transparent;border-color:rgba(188,140,255,0.28);color:var(--cr-purple);}
  .cr-dash-btn-purple:hover{color:#fff;border-color:var(--cr-purple);}
  .cr-dash-pill{display:inline-flex;align-items:center;gap:5px;font-size:12px;color:var(--cr-dim);border:1px solid var(--cr-border);padding:7px 12px;border-radius:9px;}

  /* Stats */
  .cr-stats{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:24px;}
  .cr-stat-card{display:flex;align-items:center;gap:14px;background:var(--cr-panel);border:1px solid var(--cr-border);border-radius:14px;padding:16px;transition:all .2s;}
  .cr-stat-card:hover{border-color:var(--cr-border2);transform:translateY(-2px);}
  .cr-stat-ico{width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;border:1px solid;transition:box-shadow .2s;}
  .cr-stat-card:hover .cr-stat-ico{box-shadow:0 0 16px var(--glow);}
  .cr-stat-body{min-width:0;flex:1;}
  .cr-stat-value{font-family:var(--cr-display);font-weight:700;font-size:26px;line-height:1;}
  .cr-stat-suffix{font-size:14px;font-weight:500;color:var(--cr-dimmer);}
  .cr-stat-label{font-family:var(--cr-mono);font-size:10px;color:var(--cr-dim);text-transform:uppercase;letter-spacing:.05em;margin-top:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .cr-stat-bar{height:4px;width:100%;background:var(--cr-bg2);border-radius:100px;margin-top:8px;overflow:hidden;}
  .cr-stat-bar-fill{height:100%;border-radius:100px;transition:width .5s;}
  @media(min-width:640px){.cr-stats{grid-template-columns:repeat(4,1fr);}}

  /* Create form */
  .cr-dash-form{background:var(--cr-panel);border:1px solid var(--cr-border);border-radius:14px;padding:24px;margin-bottom:24px;animation:cr-dash-fade .3s ease;}
  .cr-dash-form-title{font-family:var(--cr-display);font-weight:600;font-size:16px;margin-bottom:16px;}
  .cr-dash-form-row{display:flex;align-items:flex-end;gap:16px;flex-wrap:wrap;}
  .cr-dash-form-field{flex:1;min-width:200px;}
  .cr-dash-form-field.narrow{flex:0 0 auto;min-width:0;}
  .cr-dash-form-actions{display:flex;gap:10px;}
  .cr-dash-label{display:block;font-family:var(--cr-mono);font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--cr-dim);margin-bottom:8px;}
  .cr-dash-input,.cr-dash-select{width:100%;background:var(--cr-bg2);border:1px solid var(--cr-border);border-radius:10px;padding:10px 12px;color:var(--cr-text);font-size:14px;font-family:var(--cr-body);transition:border-color .2s,box-shadow .2s;}
  .cr-dash-input:focus,.cr-dash-select:focus{outline:none;border-color:var(--cr-green);box-shadow:0 0 0 3px rgba(63,185,80,0.12);}
  .cr-dash-input::-webkit-calendar-picker-indicator{filter:invert(.7);cursor:pointer;}
  .cr-dash-select{cursor:pointer;}
  .cr-dash-select option{background:var(--cr-panel);color:var(--cr-text);}

  /* Section header */
  .cr-dash-section-head{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:16px;}
  .cr-dash-section-title{font-family:var(--cr-display);font-weight:600;font-size:16px;}
  .cr-dash-section-count{font-family:var(--cr-mono);font-size:14px;font-weight:400;color:var(--cr-dimmer);margin-left:8px;}

  /* Filter bar */
  .cr-filter{display:flex;align-items:center;gap:12px;flex-wrap:wrap;}
  .cr-filter-tabs{display:flex;align-items:center;gap:4px;background:var(--cr-panel);border:1px solid var(--cr-border);border-radius:10px;padding:4px;}
  .cr-filter-tab{font-family:var(--cr-body);font-size:12px;font-weight:500;color:var(--cr-dim);background:none;border:none;padding:6px 12px;border-radius:7px;cursor:pointer;white-space:nowrap;transition:all .2s;}
  .cr-filter-tab:hover{color:var(--cr-text);background:var(--cr-panel2);}
  .cr-filter-tab.active{background:var(--cr-green2);color:#fff;}
  .cr-filter-search{position:relative;}
  .cr-filter-search .ico{position:absolute;left:10px;top:50%;transform:translateY(-50%);pointer-events:none;color:var(--cr-dim);display:flex;}
  .cr-filter-search input{width:180px;background:var(--cr-panel);border:1px solid var(--cr-border);border-radius:10px;padding:8px 12px 8px 32px;color:var(--cr-text);font-size:12px;font-family:var(--cr-body);transition:border-color .2s,box-shadow .2s;}
  .cr-filter-search input::placeholder{color:var(--cr-dimmer);}
  .cr-filter-search input:focus{outline:none;border-color:var(--cr-green);box-shadow:0 0 0 3px rgba(63,185,80,0.12);}

  /* Interview list + card */
  .cr-dash-list{display:flex;flex-direction:column;gap:12px;}
  .cr-card{display:flex;align-items:center;justify-content:space-between;gap:16px;background:var(--cr-panel);border:1px solid var(--cr-border);border-left:4px solid var(--accent);border-radius:14px;padding:18px 20px;transition:all .2s;}
  .cr-card:hover{border-color:var(--cr-border2);border-left-color:var(--accent);box-shadow:0 8px 28px -8px var(--glow);}
  .cr-card-left{min-width:0;flex:1;display:flex;align-items:flex-start;gap:14px;}
  .cr-card-avatar{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:var(--cr-display);font-weight:700;font-size:11px;flex-shrink:0;border:1px solid;}
  .cr-card-info{min-width:0;flex:1;}
  .cr-card-meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px;}
  .cr-card-with{font-size:12px;color:var(--cr-dim);}
  .cr-card-with b{color:var(--cr-text);font-weight:500;}
  .cr-card-time{font-family:var(--cr-mono);font-size:12px;color:var(--cr-dimmer);}
  .cr-card-sub{display:flex;align-items:center;gap:12px;flex-wrap:wrap;}
  .cr-card-duration{display:inline-flex;align-items:center;gap:4px;font-family:var(--cr-mono);font-size:12px;color:var(--cr-dimmer);}
  .cr-card-score{display:inline-flex;align-items:center;gap:6px;font-family:var(--cr-display);font-weight:700;font-size:14px;}
  .cr-card-score-tag{font-family:var(--cr-body);font-weight:400;font-size:12px;color:var(--cr-dim);}
  .cr-card-notes{font-size:12px;color:var(--cr-dimmer);font-style:italic;margin-top:6px;max-width:440px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .cr-card-rec{display:inline-flex;align-items:center;gap:5px;font-size:12px;color:var(--cr-purple);margin-top:6px;}
  .cr-card-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end;flex-shrink:0;}

  /* Status badge */
  .cr-badge{display:inline-flex;align-items:center;gap:6px;font-family:var(--cr-mono);font-size:10px;font-weight:500;text-transform:uppercase;letter-spacing:.05em;padding:4px 10px;border-radius:100px;border:1px solid;}
  .cr-badge-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0;}
  .cr-badge-dot.pulse{animation:cr-dash-pulse 1.6s infinite;}

  @keyframes cr-dash-pulse{0%,100%{opacity:1;}50%{opacity:.4;}}
  @keyframes cr-dash-fade{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:none;}}
  @media(prefers-reduced-motion:reduce){.cr-dash-root *{animation:none!important;transition:none!important;}}
`;

const isActive = (status) =>
  status !== INTERVIEW_STATUS.COMPLETED &&
  status !== INTERVIEW_STATUS.REVIEWED &&
  status !== INTERVIEW_STATUS.CANCELLED;

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

const getDisplayName = (email) => {
  if (!email) return "there";
  const local = email.split("@")[0];
  return local.charAt(0).toUpperCase() + local.slice(1);
};

const getInitial = (email) => (email ? email[0].toUpperCase() : "?");

const TODAY = new Date().toLocaleDateString(undefined, {
  weekday: "long",
  month: "long",
  day: "numeric",
});

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout, isInterviewer } = useAuthStore();
  const { interviews, isLoading, fetchInterviews, createInterview } =
    useInterviews(isInterviewer);
  const { copy } = useClipboard();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const stats = useMemo(() => {
    const total = interviews.length;
    const active = interviews.filter((i) => isActive(i.status)).length;
    const completed = interviews.filter(
      (i) => i.status === INTERVIEW_STATUS.REVIEWED
    ).length;
    return {
      total,
      active,
      completed,
      successRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }, [interviews]);

  const filteredInterviews = useMemo(() => {
    const term = search.trim().toLowerCase();
    return interviews.filter((i) => {
      const matchesStatus = statusFilter === "ALL" || i.status === statusFilter;
      const matchesSearch =
        !term || (i.candidateName || "").toLowerCase().includes(term);
      return matchesStatus && matchesSearch;
    });
  }, [interviews, statusFilter, search]);

  // ─── Handlers ────────────────────────────────────────────────────────────
  const handleCreate = async (payload) => {
    const interview = await createInterview(payload);
    copy(
      `${window.location.origin}/room/${interview.roomId}`,
      "Interview created! Candidate link copied!"
    );
    setShowCreateForm(false);
  };

  const handleCopyCandidateLink = (roomId) =>
    copy(
      `${window.location.origin}/room/${roomId}?role=candidate`,
      "Candidate link copied!"
    );

  const handleCopyInterviewerLink = (roomId) =>
    copy(
      `${window.location.origin}/room/${roomId}?role=interviewer`,
      "Panelist link copied!"
    );

  const handleCopyRecordingLink = (recordingUrl) =>
    copy(recordingUrl, "Recording link copied!");

  const handleJoinRoom = (roomId) => navigate(`/room/${roomId}`);

  const handleOpenScoreModal = (interview) => {
    setSelectedInterview(interview);
    setShowScoreModal(true);
  };

  const closeScoreModal = () => {
    setShowScoreModal(false);
    setSelectedInterview(null);
  };

  return (
    <div className="cr-dash-root">
      <style>{DASH_CSS}</style>

      {/* Navbar */}
      <nav className="cr-dash-nav">
        <div className="cr-dash-nav-inner">
          <div className="cr-dash-nav-left">
            <div className="cr-dash-logo">
              <span className="cr-dash-logo-dot" />
              Code<b>Room</b>
            </div>
            {isInterviewer() && (
              <button className="cr-dash-navlink" onClick={() => navigate("/questions")}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 016.5 22H20V4a2 2 0 00-2-2H6.5A2.5 2.5 0 004 4.5v15z" />
                </svg>
                Question Bank
              </button>
            )}
          </div>

          <div className="cr-dash-nav-right">
            <div className="cr-dash-user">
              <div className="cr-dash-avatar">{getInitial(user?.email)}</div>
              <div>
                <p className="cr-dash-user-name">{getDisplayName(user?.email)}</p>
                <p className="cr-dash-user-role">{user?.role}</p>
              </div>
            </div>
            <button className="cr-dash-signout" onClick={logout}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
              Sign out
            </button>
          </div>
        </div>
      </nav>

      <div className="cr-dash-main">
        {/* Hero / greeting */}
        <div className="cr-dash-hero">
          <div className="cr-dash-hero-grid" />
          <div className="cr-dash-hero-glow" />
          <div className="cr-dash-hero-inner">
            <div>
              <p className="cr-dash-eyebrow">{TODAY}</p>
              <h2 className="cr-dash-greeting">
                {getGreeting()}, <b>{getDisplayName(user?.email)}</b>
              </h2>
              <p className="cr-dash-hero-sub">
                {isInterviewer()
                  ? "Manage your technical interview pipeline and review candidates."
                  : "Track your upcoming and past interview sessions."}
              </p>
            </div>
            {isInterviewer() && (
              <button
                className="cr-dash-btn cr-dash-btn-primary"
                onClick={() => setShowCreateForm((v) => !v)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" d="M12 5v14M5 12h14" />
                </svg>
                New Interview
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        {isInterviewer() && !isLoading && interviews.length > 0 && (
          <StatsRow
            total={stats.total}
            active={stats.active}
            completed={stats.completed}
            successRate={stats.successRate}
          />
        )}

        {/* Create form */}
        {showCreateForm && (
          <CreateInterviewForm
            onCancel={() => setShowCreateForm(false)}
            onSubmit={handleCreate}
          />
        )}

        {/* Section header + filters */}
        {!isLoading && interviews.length > 0 && (
          <div className="cr-dash-section-head">
            <h3 className="cr-dash-section-title">
              {isInterviewer() ? "All Interviews" : "My Sessions"}
              <span className="cr-dash-section-count">{filteredInterviews.length}</span>
            </h3>
            {isInterviewer() && (
              <FilterBar
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                search={search}
                onSearchChange={setSearch}
              />
            )}
          </div>
        )}

        {/* Interview list */}
        {isLoading ? (
          <CardSkeletonList count={4} />
        ) : interviews.length === 0 ? (
          <EmptyState
            icon={
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#8b949e" strokeWidth="1.5">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                />
              </svg>
            }
            title="No interviews yet"
            subtitle={
              isInterviewer()
                ? "Schedule your first technical interview to get started"
                : "Ask your interviewer to share the room link with you"
            }
            actionLabel={isInterviewer() ? "+ New Interview" : undefined}
            onAction={isInterviewer() ? () => setShowCreateForm(true) : undefined}
          />
        ) : filteredInterviews.length === 0 ? (
          <EmptyState
            icon={
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#8b949e" strokeWidth="1.5">
                <circle cx="11" cy="11" r="7" strokeLinecap="round" />
                <path strokeLinecap="round" d="M21 21l-4.3-4.3" />
              </svg>
            }
            title="No matching interviews"
            subtitle="Try a different filter or search term"
          />
        ) : (
          <div className="cr-dash-list">
            {filteredInterviews.map((interview) => (
              <InterviewCard
                key={interview.id}
                interview={interview}
                isActive={isActive}
                onCopyCandidateLink={handleCopyCandidateLink}
                onCopyInterviewerLink={handleCopyInterviewerLink}
                onCopyRecordingLink={handleCopyRecordingLink}
                onJoinRoom={handleJoinRoom}
                onSubmitScore={handleOpenScoreModal}
              />
            ))}
          </div>
        )}
      </div>

      {/* Score modal */}
      {showScoreModal && selectedInterview && (
        <ScoreModal
          roomId={selectedInterview.roomId}
          candidateName={selectedInterview.candidateName || "Candidate"}
          onClose={closeScoreModal}
          onSubmitted={() => {
            closeScoreModal();
            fetchInterviews();
          }}
        />
      )}
    </div>
  );
};

export default Dashboard;