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
    <div className="min-h-screen bg-[#0d1117] text-white">
      {/* Navbar */}
      <nav className="bg-[#161b22]/95 border-b border-[#30363d] px-6 py-3.5 sticky top-0 z-20 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#3fb950] shadow-[0_0_10px_#3fb950]" />
              <h1 className="text-lg font-bold font-['Space_Grotesk'] tracking-tight">
                Code<span className="text-[#3fb950]">Room</span>
              </h1>
            </div>
            {isInterviewer() && (
              <button
                onClick={() => navigate("/questions")}
                className="flex items-center gap-1.5 text-sm text-[#8b949e] hover:text-white transition-colors"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 016.5 22H20V4a2 2 0 00-2-2H6.5A2.5 2.5 0 004 4.5v15z" />
                </svg>
                Question Bank
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2.5 pr-3 border-r border-[#30363d]">
              <div className="w-8 h-8 rounded-full bg-linear-to-br from-[#238636] to-[#2ea043] flex items-center justify-center text-xs font-bold text-white font-['Space_Grotesk'] shrink-0">
                {getInitial(user?.email)}
              </div>
              <div className="leading-tight">
                <p className="text-sm text-white font-medium leading-tight">
                  {getDisplayName(user?.email)}
                </p>
                <p className="text-[10px] text-[#8b949e] font-['JetBrains_Mono'] uppercase tracking-wide leading-tight">
                  {user?.role}
                </p>
              </div>
            </div>
            <button
              onClick={logout}
              className="text-sm text-[#8b949e] hover:text-[#f85149] border border-[#30363d] hover:border-[#f85149]/40 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
              Sign out
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Hero / greeting */}
        <div className="dashboard-hero relative rounded-2xl border border-[#30363d] bg-linear-to-br from-[#161b22] to-[#0d1117] p-6 sm:p-8 mb-6 overflow-hidden">
          <div className="absolute -top-24 -right-16 w-72 h-72 bg-[#238636]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex items-center justify-between flex-wrap gap-6">
            <div>
              <p className="text-xs text-[#3fb950] font-['JetBrains_Mono'] uppercase tracking-widest mb-2">
                {TODAY}
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold font-['Space_Grotesk'] tracking-tight mb-2">
                {getGreeting()}, <span className="text-[#3fb950]">{getDisplayName(user?.email)}</span>
              </h2>
              <p className="text-[#8b949e] text-sm max-w-md">
                {isInterviewer()
                  ? "Manage your technical interview pipeline and review candidates."
                  : "Track your upcoming and past interview sessions."}
              </p>
            </div>
            {isInterviewer() && (
              <button
                onClick={() => setShowCreateForm((v) => !v)}
                className="bg-[#238636] hover:bg-[#2ea043] text-white text-sm font-semibold px-5 py-3 rounded-xl transition-all hover:shadow-[0_0_24px_rgba(63,185,80,0.35)] flex items-center gap-2 shrink-0"
              >
                <span className="text-lg leading-none">+</span> New Interview
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
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h3 className="text-base font-semibold font-['Space_Grotesk'] text-white">
              {isInterviewer() ? "All Interviews" : "My Sessions"}
              <span className="text-[#484f58] font-normal ml-2 text-sm">
                {filteredInterviews.length}
              </span>
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
          <div className="space-y-3">
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