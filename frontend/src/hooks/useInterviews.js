import { useState, useCallback, useEffect } from "react";
import toast from "react-hot-toast";
import { interviewAPI, roomAPI } from "../services/api.js";

/**
 * Owns the interview list — fetching, loading state, and creation.
 * Keeps Dashboard.jsx free of data-fetching concerns.
 */
export const useInterviews = (isInterviewer) => {
  const [interviews, setInterviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchInterviews = useCallback(async () => {
    try {
      setIsLoading(true);
      if (isInterviewer()) {
        const response = await interviewAPI.getMyInterviews();
        setInterviews(response.data);
      }
    } catch (err) {
      toast.error("Failed to load interviews");
    } finally {
      setIsLoading(false);
    }
  }, [isInterviewer]);

  useEffect(() => {
    fetchInterviews();
  }, [fetchInterviews]);

  // Creates the interview + its room, links them, and prepends to the list.
  // Throws on failure so the caller can decide how to surface the error.
  const createInterview = async ({ scheduledAt, maxInterviewers }) => {
    const interviewRes = await interviewAPI.create({
      scheduledAt,
      maxInterviewers,
    });
    const interview = interviewRes.data;

    const roomRes = await roomAPI.create(interview.id);
    const room = roomRes.data;

    await interviewAPI.updateRoomId(interview.id, room.id);

    const completeInterview = { ...interview, roomId: room.id };
    setInterviews((prev) => [completeInterview, ...prev]);
    return completeInterview;
  };

  return { interviews, isLoading, fetchInterviews, createInterview };
};