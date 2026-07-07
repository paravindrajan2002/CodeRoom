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

  const scoreColor =
    interview.score >= 7 ? "#3fb950" : interview.score >= 5 ? "#d29922" : "#f85149";
  const scoreVerdict =
    interview.score >= 7 ? "· Proceed" : interview.score >= 5 ? "· Consider" : "· Reject";

  return (
    <div className="cr-card" style={{ "--accent": accent, "--glow": accent + "40" }}>
      {/* Left — info */}
      <div className="cr-card-left">
        {interview.candidateName && (
          <div
            className="cr-card-avatar"
            style={{ backgroundColor: accent + "1f", borderColor: accent + "40", color: accent }}
          >
            {getInitials(interview.candidateName)}
          </div>
        )}
        <div className="cr-card-info">
          <div className="cr-card-meta">
            <StatusBadge status={interview.status} />
            {interview.candidateName && (
              <span className="cr-card-with">
                with <b>{interview.candidateName}</b>
              </span>
            )}
            {interview.scheduledAt && (
              <span className="cr-card-time">{formatScheduled(interview.scheduledAt)}</span>
            )}
          </div>

          <div className="cr-card-sub">
            {interview.startedAt && interview.endedAt && (
              <span className="cr-card-duration">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="9" />
                  <path strokeLinecap="round" d="M12 7v5l3 3" />
                </svg>
                {formatDuration(interview.startedAt, interview.endedAt)}
              </span>
            )}

            {interview.score != null && (
              <span className="cr-card-score" style={{ color: scoreColor }}>
                {interview.score}/10
                <span className="cr-card-score-tag">{scoreVerdict}</span>
              </span>
            )}
          </div>

          {interview.notes && (
            <p className="cr-card-notes">"{interview.notes}"</p>
          )}

          {interview.recordingUrl && (
            <span className="cr-card-rec">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4z" />
              </svg>
              Recording available
            </span>
          )}
        </div>
      </div>

      {/* Right — actions */}
      <div className="cr-card-actions">
        {isActive(interview.status) && (
          <>
            <button
              onClick={() => onCopyCandidateLink(interview.roomId)}
              className="cr-dash-btn cr-dash-btn-sm cr-dash-btn-ghost"
            >
              Copy Candidate Link
            </button>

            {interview.maxInterviewers > 1 && (
              <button
                onClick={() => onCopyInterviewerLink(interview.roomId)}
                className="cr-dash-btn cr-dash-btn-sm cr-dash-btn-blue"
              >
                Copy Panelist Link
              </button>
            )}

            <button
              onClick={() => onJoinRoom(interview.roomId)}
              className="cr-dash-btn cr-dash-btn-sm cr-dash-btn-primary"
            >
              Join Room
            </button>
          </>
        )}

        {interview.status === INTERVIEW_STATUS.COMPLETED && (
          <button
            onClick={() => onSubmitScore(interview)}
            className="cr-dash-btn cr-dash-btn-sm cr-dash-btn-primary"
          >
            Submit Score
          </button>
        )}

        {interview.status === INTERVIEW_STATUS.REVIEWED && (
          <span className="cr-dash-pill">Reviewed ✓</span>
        )}

        {interview.recordingUrl && (
          <>
            <button
              onClick={() => onCopyRecordingLink(interview.recordingUrl)}
              className="cr-dash-btn cr-dash-btn-sm cr-dash-btn-purple"
              title="Copy recording link to share with team"
            >
              Copy Recording Link
            </button>
            <a
              href={interview.recordingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="cr-dash-btn cr-dash-btn-sm cr-dash-btn-ghost"
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