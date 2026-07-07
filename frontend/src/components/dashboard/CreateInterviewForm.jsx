import { useState } from "react";
import toast from "react-hot-toast";

/**
 * Pure form component — owns its own field state and validation.
 * Calls onSubmit({ scheduledAt, maxInterviewers }) and awaits it;
 * resets its fields only after the parent confirms success.
 */
const CreateInterviewForm = ({ onCancel, onSubmit }) => {
  const [scheduledAt, setScheduledAt] = useState("");
  const [maxInterviewers, setMaxInterviewers] = useState(1);
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!scheduledAt) {
      toast.error("Please select a date and time");
      return;
    }

    try {
      setIsCreating(true);
      await onSubmit({ scheduledAt, maxInterviewers });
      setScheduledAt("");
      setMaxInterviewers(1);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="cr-dash-form">
      <h3 className="cr-dash-form-title">Schedule Interview</h3>
      <form onSubmit={handleSubmit} className="cr-dash-form-row">
        <div className="cr-dash-form-field">
          <label className="cr-dash-label">Date &amp; Time</label>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="cr-dash-input"
          />
        </div>
        <div className="cr-dash-form-field narrow">
          <label className="cr-dash-label">Panel Size</label>
          <select
            value={maxInterviewers}
            onChange={(e) => setMaxInterviewers(Number(e.target.value))}
            className="cr-dash-select"
          >
            <option value={1}>1 Interviewer</option>
            <option value={2}>2 Interviewers</option>
            <option value={3}>3 Interviewers</option>
            <option value={4}>4 Interviewers</option>
          </select>
        </div>
        <div className="cr-dash-form-actions">
          <button
            type="button"
            onClick={onCancel}
            className="cr-dash-btn cr-dash-btn-ghost"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isCreating}
            className="cr-dash-btn cr-dash-btn-primary"
          >
            {isCreating ? "Creating…" : "Create Interview"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateInterviewForm;