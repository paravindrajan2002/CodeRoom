import StatusBadge, { STATUS_STYLES } from "./StatusBadge.jsx";
import { formatDuration, formatScheduled } from "../../utils/dateFormat.js";
import { INTERVIEW_STATUS } from "../../utils/constants.js";

const getInitials = (name) =>
  name
    ? name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((p) => p[0].toUpperCase())
        .join("")
    : "?";

const InterviewCard = ({
  interview,
  isActive,
  onCopyCandidateLink,
  onCopyInterviewerLink,
  onCopyRecordingLink,
  onJoinRoom,
  onSubmitScore,
}) => {
  const accent =
    (STATUS_STYLES[interview.status] || STATUS_STYLES.SCHEDULED).accent;

  return (
    <div
      className="bg-[#161b22] border border-[#30363d] border-l-4 rounded-xl p-5 flex items-center justify-between hover:border-[#484f58] hover:shadow-[0_8px_28px_-8px_var(--glow)] transition-all"
      style={{ borderLeftColor: accent, "--glow": accent + "40" }}
    >
      {/* Left — info */}
      <div className="min-w-0 flex-1 flex items-start gap-3.5">
        {interview.candidateName && (
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold font-['Space_Grotesk'] shrink-0 border"
            style={{ backgroundColor: accent + "1f", borderColor: accent + "40", color: accent }}
          >
            {getInitials(interview.candidateName)}
          </div>
        )}
        <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <StatusBadge status={interview.status} />
          {interview.candidateName && (
            <span className="text-xs text-[#8b949e]">
              with{" "}
              <span className="text-[#c9d1d9]">{interview.candidateName}</span>
            </span>
          )}
          {interview.scheduledAt && (
            <span className="text-xs text-[#484f58] font-['JetBrains_Mono']">
              {formatScheduled(interview.scheduledAt)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {interview.startedAt && interview.endedAt && (
            <span className="text-xs text-[#484f58] flex items-center gap-1 font-['JetBrains_Mono']">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="9" />
                <path strokeLinecap="round" d="M12 7v5l3 3" />
              </svg>
              {formatDuration(interview.startedAt, interview.endedAt)}
            </span>
          )}

          {interview.score != null && (
            <span
              className={`text-sm font-bold flex items-center gap-1 font-['Space_Grotesk'] ${
                interview.score >= 7
                  ? "text-[#3fb950]"
                  : interview.score >= 5
                  ? "text-[#d29922]"
                  : "text-[#f85149]"
              }`}
            >
              {interview.score}/10
              <span className="text-xs font-normal text-[#8b949e] font-['Inter']">
                {interview.score >= 7
                  ? "· Proceed"
                  : interview.score >= 5
                  ? "· Consider"
                  : "· Reject"}
              </span>
            </span>
          )}
        </div>

        {interview.notes && (
          <p className="text-xs text-[#484f58] mt-1.5 max-w-md truncate italic">
            "{interview.notes}"
          </p>
        )}

        {interview.recordingUrl && (
          <span className="inline-flex items-center gap-1 text-xs text-[#bc8cff] mt-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4z" />
            </svg>
            Recording available
          </span>
        )}
        </div>
      </div>

      {/* Right — actions */}
      <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
        {isActive(interview.status) && (
          <>
            <button
              onClick={() => onCopyCandidateLink(interview.roomId)}
              className="text-xs text-[#8b949e] hover:text-white border border-[#30363d] hover:border-[#484f58] px-3 py-1.5 rounded-lg transition-colors"
            >
              Copy Candidate Link
            </button>

            {interview.maxInterviewers > 1 && (
              <button
                onClick={() => onCopyInterviewerLink(interview.roomId)}
                className="text-xs text-[#58a6ff] hover:text-white border border-[#1f3244] hover:border-[#58a6ff] px-3 py-1.5 rounded-lg transition-colors"
              >
                Copy Panelist Link
              </button>
            )}

            <button
              onClick={() => onJoinRoom(interview.roomId)}
              className="text-xs bg-[#238636] hover:bg-[#2ea043] text-white px-3 py-1.5 rounded-lg transition-colors font-medium"
            >
              Join Room
            </button>
          </>
        )}

        {interview.status === INTERVIEW_STATUS.COMPLETED && (
          <button
            onClick={() => onSubmitScore(interview)}
            className="text-xs bg-[#238636] hover:bg-[#2ea043] text-white px-3 py-1.5 rounded-lg transition-colors font-medium"
          >
            Submit Score
          </button>
        )}

        {interview.status === INTERVIEW_STATUS.REVIEWED && (
          <span className="text-xs text-[#8b949e] border border-[#30363d] px-3 py-1.5 rounded-lg">
            Reviewed ✓
          </span>
        )}

        {interview.recordingUrl && (
          <>
            <button
              onClick={() => onCopyRecordingLink(interview.recordingUrl)}
              className="text-xs text-[#bc8cff] hover:text-white border border-[#2d1f47] hover:border-[#bc8cff] px-3 py-1.5 rounded-lg transition-colors"
              title="Copy recording link to share with team"
            >
              Copy Recording Link
            </button>
            <a
              href={interview.recordingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#8b949e] hover:text-white border border-[#30363d] hover:border-[#484f58] px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1"
              title="Watch recording"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
              Watch
            </a>
          </>
        )}
      </div>
    </div>
  );
};

export default InterviewCard;