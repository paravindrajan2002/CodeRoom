import { useState } from "react";
import toast from "react-hot-toast";
import useAuthStore from "../../store/authStore.js";
import useRoomStore from "../../store/roomStore.js";
import { questionAPI } from "../../services/api.js";
import { runCode, loadQuestion, submitCode } from "../../services/socket.js";

const RoomControls = ({ roomId, code, language, question }) => {
  const { isInterviewer } = useAuthStore();
  const { isExecuting, isSubmitting, isSaved } = useRoomStore();

  const [showQuestionPicker, setShowQuestionPicker] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  // ─── Run code — visible test cases only ──────────────────────────────────
  const handleRunCode = () => {
    if (!code.trim()) {
      toast.error("Nothing to run");
      return;
    }
    if (!question?.questionId) {
      toast.error("Load a question first");
      return;
    }
    runCode(roomId, code, language, question.questionId);
    toast("Running visible test cases...", { icon: "⚡" });
  };

  // ─── Submit — all test cases including hidden ─────────────────────────────
  const handleSubmit = () => {
    if (!code.trim()) {
      toast.error("Nothing to submit");
      return;
    }
    if (!question?.questionId) {
      toast.error("Load a question first");
      return;
    }
    const { setSubmitting } = useRoomStore.getState();
    setSubmitting(true);
    submitCode(roomId, code, language, question.questionId);
    toast("Submitting — running all test cases...", { icon: "📤" });
  };

  // ─── Load question picker ─────────────────────────────────────────────────
  const handleOpenQuestionPicker = async () => {
    setShowQuestionPicker(true);
    if (questions.length > 0) return;
    try {
      setLoadingQuestions(true);
      const response = await questionAPI.getAll();
      setQuestions(response.data);
    } catch (err) {
      toast.error("Failed to load questions");
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleSelectQuestion = (questionId) => {
    const { language } = useRoomStore.getState();
    loadQuestion(roomId, questionId, language);
    setShowQuestionPicker(false);
    toast.success("Loading question...");
  };

  // Reset submitting state when result comes back
  // (handled in InterviewRoom via socket event)

  return (
    <>
      {/* Question picker modal */}
      {showQuestionPicker && (
        <div className="cr-rc-modal-overlay">
          <div className="cr-rc-modal">
            <div className="cr-rc-modal-head">
              <h3>Select Question</h3>
              <button
                onClick={() => setShowQuestionPicker(false)}
                className="cr-rc-modal-close"
              >
                ✕
              </button>
            </div>
            <div className="cr-rc-modal-body">
              {loadingQuestions ? (
                <div className="cr-rc-modal-loading">
                  <svg className="cr-spin" width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <circle className="op25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="op75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                </div>
              ) : (
                <div className="cr-rc-qlist">
                  {questions.map((q) => (
                    <button
                      key={q.id}
                      onClick={() => handleSelectQuestion(q.id)}
                      className="cr-rc-qitem"
                    >
                      <div className="cr-rc-qitem-row">
                        <span className="cr-rc-qitem-title">{q.title}</span>
                        <span
                          className={`cr-room-qdiff ${
                            q.difficulty === "EASY"
                              ? "easy"
                              : q.difficulty === "MEDIUM"
                                ? "medium"
                                : "hard"
                          }`}
                        >
                          {q.difficulty}
                        </span>
                      </div>
                      {q.tags && <p className="cr-rc-qtags">{q.tags}</p>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bottom controls bar */}
      <div className="cr-rc-bar">
        <div>
          <span className="cr-rc-save">
            {isSaved ? "✓ Saved" : "Auto-saves every 10s"}
          </span>
        </div>

        <div className="cr-rc-actions">
          {/* Load question — interviewer only */}
          {isInterviewer() && (
            <button
              onClick={handleOpenQuestionPicker}
              className="cr-room-btn cr-room-btn-ghost"
            >
              Load Question
            </button>
          )}

          {/* Run — visible test cases only */}
          <button
            onClick={handleRunCode}
            disabled={isExecuting || isSubmitting}
            className="cr-room-btn cr-room-btn-ghost"
          >
            {isExecuting && !isSubmitting ? (
              <>
                <svg className="cr-spin" width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <circle className="op25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="op75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Running...
              </>
            ) : (
              <>▶ Run</>
            )}
          </button>

          {/* Submit — all test cases */}
          <button
            onClick={handleSubmit}
            disabled={isExecuting || isSubmitting}
            className="cr-room-btn cr-room-btn-primary"
          >
            {isSubmitting ? (
              <>
                <svg className="cr-spin" width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <circle className="op25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="op75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Submitting...
              </>
            ) : (
              <>📤 Submit</>
            )}
          </button>
        </div>
      </div>
    </>
  );
};

export default RoomControls;