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
    <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 mb-6">
      <h3 className="text-white font-semibold mb-4 font-['Space_Grotesk']">
        Schedule Interview
      </h3>
      <form onSubmit={handleSubmit} className="flex items-end gap-4 flex-wrap">
        <div className="flex-1 min-w-48">
          <label className="block text-sm text-[#8b949e] mb-1.5">
            Date &amp; Time
          </label>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#238636] transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm text-[#8b949e] mb-1.5">
            Panel Size
          </label>
          <select
            value={maxInterviewers}
            onChange={(e) => setMaxInterviewers(Number(e.target.value))}
            className="bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#238636] transition-colors"
          >
            <option value={1}>1 Interviewer</option>
            <option value={2}>2 Interviewers</option>
            <option value={3}>3 Interviewers</option>
            <option value={4}>4 Interviewers</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 text-sm text-[#8b949e] border border-[#30363d] rounded-lg hover:border-[#484f58] transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isCreating}
            className="px-4 py-2.5 text-sm bg-[#238636] hover:bg-[#2ea043] disabled:opacity-50 text-white rounded-lg transition-colors"
          >
            {isCreating ? "Creating..." : "Create Interview"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateInterviewForm;