import toast from "react-hot-toast";

/**
 * Copies text and shows a success toast. Used for the various
 * "copy link" actions scattered across the dashboard (candidate link,
 * panelist link, recording link).
 */
export const useClipboard = () => {
  const copy = (text, successMessage = "Copied to clipboard!") => {
    navigator.clipboard.writeText(text);
    toast.success(successMessage);
  };

  return { copy };
};