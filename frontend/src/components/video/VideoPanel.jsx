import { useEffect, useRef, useState, useCallback } from "react";
import useAuthStore from "../../store/authStore.js";
import { SOCKET_EVENTS } from "../../utils/constants.js";
import { getSocket } from "../../services/socket.js";
import { recordingAPI } from "../../services/api.js";
import toast from "react-hot-toast";

// ─── Avatar helpers ────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  "#1f6feb","#238636","#da3633","#d29922",
  "#8957e5","#0d419d","#2ea043","#bf4b8a",
];
const getAvatarColor = (str = "") => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};
const getInitials = (label = "") => {
  const clean = label.replace(/[🎯👑⚡]/g, "").trim();
  const parts = clean.split(/[\s@._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  if (parts[0]?.length >= 2) return parts[0].slice(0, 2).toUpperCase();
  return "??";
};
const AvatarFallback = ({ label }) => (
  <div className="cr-vid-avatar-wrap">
    <div className="cr-vid-avatar" style={{ backgroundColor: getAvatarColor(label) }}>
      {getInitials(label)}
    </div>
    <span className="cr-vid-avatar-sub">Camera off</span>
  </div>
);

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

const VideoPanel = ({
  roomId,
  participants = [],
  isLeadInterviewer = false,
  interviewId = null,
}) => {
  const { user } = useAuthStore();

  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnectionsRef = useRef({});
  const pendingCandidatesRef = useRef({}); // { userId: RTCIceCandidateInit[] }
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const screenStreamRef = useRef(null);
  const isCallActiveRef = useRef(false);
  const userRef = useRef(user);
  const roomIdRef = useRef(roomId);
  const remoteVideoElemsRef = useRef({}); // { userId: HTMLVideoElement }

  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [remoteVideos, setRemoteVideos] = useState({});
  const [connectedCount, setConnectedCount] = useState(0);
  const [remoteCameraOff, setRemoteCameraOff] = useState({}); // { userId: boolean }

  useEffect(() => {
    userRef.current = user;
  }, [user]);
  useEffect(() => {
    roomIdRef.current = roomId;
  }, [roomId]);

  // ─── Auto start call ──────────────────────────────────────────────────────
  useEffect(() => {
    const startWhenReady = () => {
      const socket = getSocket();
      if (!socket) {
        setTimeout(startWhenReady, 100);
        return;
      }

      socket.once(SOCKET_EVENTS.ROOM_STATE, async () => {
        try {
          await getUserMedia();
          isCallActiveRef.current = true;
          socket.emit("webrtc:start_call", { roomId });
        } catch (err) {
          console.error("Auto start call error:", err.message);
        }
      });

      if (socket.connected && !isCallActiveRef.current) {
        setTimeout(async () => {
          if (!isCallActiveRef.current) {
            try {
              await getUserMedia();
              isCallActiveRef.current = true;
              socket.emit("webrtc:start_call", { roomId });
            } catch (err) {
              console.error("Auto start call error:", err.message);
            }
          }
        }, 500);
      }
    };
    startWhenReady();
  }, [roomId]);

  // ─── Get user media ───────────────────────────────────────────────────────
  const getUserMedia = async () => {
    if (localStreamRef.current) return localStreamRef.current;
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 1280, height: 720 },
      audio: true,
    });
    localStreamRef.current = stream;
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    return stream;
  };

  // ─── Remove peer ──────────────────────────────────────────────────────────
  const removePeer = useCallback((userId) => {
    if (peerConnectionsRef.current[userId]) {
      peerConnectionsRef.current[userId].close();
      delete peerConnectionsRef.current[userId];
    }
    delete remoteVideoElemsRef.current[userId];
    delete pendingCandidatesRef.current[userId];
    setRemoteVideos((prev) => {
      const next = { ...prev };
      delete next[userId];
      setConnectedCount(Object.keys(next).length);
      return next;
    });
    setRemoteCameraOff((prev) => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });
  }, []);

  // ─── Create peer connection ───────────────────────────────────────────────
  const createPeerConnection = useCallback(
    (targetUserId) => {
      if (peerConnectionsRef.current[targetUserId]) {
        peerConnectionsRef.current[targetUserId].close();
      }
      const pc = new RTCPeerConnection(ICE_SERVERS);

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          getSocket()?.emit("webrtc:ice_candidate", {
            roomId: roomIdRef.current,
            candidate: event.candidate,
            targetUserId,
          });
        }
      };

      pc.ontrack = (event) => {
        const stream = event.streams[0];
        // Create hidden video element for canvas drawing
        const videoElem = document.createElement("video");
        videoElem.srcObject = stream;
        videoElem.autoplay = true;
        videoElem.playsInline = true;
        videoElem.muted = true;
        remoteVideoElemsRef.current[targetUserId] = videoElem;

        // Detect camera on/off for the avatar fallback
        if (event.track.kind === "video") {
          event.track.onmute = () =>
            setRemoteCameraOff((prev) => ({ ...prev, [targetUserId]: true }));
          event.track.onunmute = () =>
            setRemoteCameraOff((prev) => ({ ...prev, [targetUserId]: false }));
        }

        setRemoteVideos((prev) => {
          const next = { ...prev, [targetUserId]: stream };
          setConnectedCount(Object.keys(next).length);
          return next;
        });
      };

      pc.onconnectionstatechange = () => {
        // "disconnected" is transient — the ICE agent may recover automatically.
        // Only tear down on "failed", which is permanent and unrecoverable.
        if (pc.connectionState === "failed") {
          removePeer(targetUserId);
        }
      };

      peerConnectionsRef.current[targetUserId] = pc;
      return pc;
    },
    [removePeer],
  );

  // ─── Send offer ───────────────────────────────────────────────────────────
  const sendOfferTo = useCallback(
    async (targetUserId) => {
      try {
        const existing = peerConnectionsRef.current[targetUserId];
        // Skip only if a healthy connection already exists.
        // "connected" or actively negotiating ("have-local-offer") = don't duplicate.
        // Missing, closed, failed, or stuck-new = safe to (re)try.
        if (
          existing &&
          (existing.connectionState === "connected" ||
            existing.signalingState === "have-local-offer")
        ) {
          return;
        }
        const stream = await getUserMedia();
        const pc = createPeerConnection(targetUserId);
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        getSocket()?.emit("webrtc:offer", {
          roomId: roomIdRef.current,
          offer,
          fromUserId: userRef.current?.id,
          targetUserId,
        });
      } catch (err) {
        console.error("Send offer error:", err.message);
      }
    },
    [createPeerConnection],
  );

  // ─── Handle incoming offer ────────────────────────────────────────────────
  const handleIncomingOffer = useCallback(
    async (offer, fromUserId) => {
      try {
        const stream = await getUserMedia();

        // Glare resolution: both peers may have called sendOfferTo() simultaneously
        // (e.g. two interviewers joining within the same 500ms window).  Both end up
        // with a PC in "have-local-offer" for the other.  Without tie-breaking,
        // createPeerConnection() closes the offerer PC; the answer arrives later but
        // finds a "stable" PC → answer silently dropped → ICE never completes.
        //
        // Fix: deterministic tie-break on userId string.
        //   smaller-id peer = "impolite" → keeps its own offer, ignores the incoming one
        //   larger-id peer  = "polite"   → drops its own offer, accepts the incoming one
        //
        // Both sides compute the same winner independently, so exactly one offer
        // survives and proceeds to a proper answer exchange.
        const existingPc = peerConnectionsRef.current[fromUserId];
        if (existingPc?.signalingState === "have-local-offer") {
          const myId = String(userRef.current?.id ?? "");
          const theirId = String(fromUserId ?? "");
          if (myId < theirId) {
            // We are impolite — our offer wins.  Ignore theirs; wait for our answer.
            return;
          }
          // We are polite — their offer wins.
          // Fall through: createPeerConnection() will close our pending-offer PC.
        }

        const pc = createPeerConnection(fromUserId);
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));
        await pc.setRemoteDescription(new RTCSessionDescription(offer));

        // Flush ICE candidates that arrived before remote description was ready
        const queued = pendingCandidatesRef.current[fromUserId] || [];
        delete pendingCandidatesRef.current[fromUserId];
        for (const c of queued) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(c));
          } catch (e) {
            console.warn("Queued ICE flush error:", e.message);
          }
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        getSocket()?.emit("webrtc:answer", {
          roomId: roomIdRef.current,
          answer,
          targetUserId: fromUserId,
        });
        isCallActiveRef.current = true;
      } catch (err) {
        console.error("Handle offer error:", err.message);
      }
    },
    [createPeerConnection],
  );

  // ─── Socket listeners ─────────────────────────────────────────────────────
  useEffect(() => {
    const setup = () => {
      const socket = getSocket();
      if (!socket) {
        setTimeout(setup, 100);
        return;
      }

      socket.off("webrtc:offer");
      socket.off("webrtc:answer");
      socket.off("webrtc:ice_candidate");
      socket.off("webrtc:call_end");
      socket.off("webrtc:peer_in_room");
      socket.off("webrtc:user_joined_call");
      socket.off(SOCKET_EVENTS.ROOM_USER_LEFT);

      socket.on("webrtc:peer_in_room", async ({ userId }) => {
        if (userId !== userRef.current?.id) await sendOfferTo(userId);
      });

      socket.on("webrtc:user_joined_call", ({ userId }) => {
        console.log("👤 User joined call:", userId);
        if (userId !== userRef.current?.id) {
          // Existing participant proactively connects to the newcomer too —
          // don't rely solely on the newcomer's outgoing offers. This closes
          // the gap where two interviewers joined before the candidate and
          // one of them never independently re-confirms the candidate's link.
          sendOfferTo(userId);
        }
      });

      socket.on("webrtc:offer", async ({ offer, fromUserId }) => {
        if (fromUserId === userRef.current?.id) return;
        await handleIncomingOffer(offer, fromUserId);
      });

      socket.on("webrtc:answer", async ({ answer, fromUserId }) => {
        const pc = peerConnectionsRef.current[fromUserId];
        if (pc?.signalingState === "have-local-offer") {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
          // Flush ICE candidates buffered before answer arrived
          const queued = pendingCandidatesRef.current[fromUserId] || [];
          delete pendingCandidatesRef.current[fromUserId];
          for (const c of queued) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(c));
            } catch (e) {
              console.warn("Queued ICE flush error:", e.message);
            }
          }
        }
      });

      socket.on("webrtc:ice_candidate", async ({ candidate, fromUserId }) => {
        if (!candidate) return;
        const pc = peerConnectionsRef.current[fromUserId];
        // Buffer candidate if peer connection doesn't exist yet or remote
        // description hasn't been set — ICE candidates can arrive during the
        // async gap in handleIncomingOffer before setRemoteDescription runs.
        if (!pc || !pc.remoteDescription) {
          if (!pendingCandidatesRef.current[fromUserId]) {
            pendingCandidatesRef.current[fromUserId] = [];
          }
          pendingCandidatesRef.current[fromUserId].push(candidate);
          return;
        }
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.warn("ICE error:", err.message);
        }
      });

      socket.on("webrtc:call_end", ({ fromUserId }) => removePeer(fromUserId));
      socket.on(SOCKET_EVENTS.ROOM_USER_LEFT, ({ userId }) =>
        removePeer(userId),
      );
    };

    setup();
    return () => {
      const socket = getSocket();
      if (socket) {
        socket.off("webrtc:offer");
        socket.off("webrtc:answer");
        socket.off("webrtc:ice_candidate");
        socket.off("webrtc:call_end");
        socket.off("webrtc:peer_in_room");
        socket.off("webrtc:user_joined_call");
        socket.off(SOCKET_EVENTS.ROOM_USER_LEFT);
      }
    };
  }, [roomId, sendOfferTo, handleIncomingOffer, removePeer]);

  // ─── Toggle mute / camera ─────────────────────────────────────────────────
  const handleToggleMute = () => {
    localStreamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setIsMuted((p) => !p);
  };

  const handleToggleCamera = () => {
    localStreamRef.current?.getVideoTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setIsCameraOff((p) => !p);
  };

  // ─── Start recording ──────────────────────────────────────────────────────
  // Records screen as the main frame. Camera feeds are drawn as PiP tiles in
  // the bottom-right corner — browsers black out <video> elements in tab
  // capture, so we pull frames from the video elements onto a canvas ourselves.
  const handleStartRecording = async () => {
    try {
      const localStream = await getUserMedia();

      // Screen capture — required
      let screenStream;
      try {
        screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { width: 1920, height: 1080, frameRate: 30 },
          audio: false,
        });
        screenStreamRef.current = screenStream;
      } catch {
        toast.error("Screen share is required to start recording");
        return;
      }

      // Hidden video element to read screen frames
      const screenVideoElem = document.createElement("video");
      screenVideoElem.srcObject = screenStream;
      screenVideoElem.autoplay = true;
      screenVideoElem.playsInline = true;
      screenVideoElem.muted = true;
      await new Promise((res) => { screenVideoElem.onloadedmetadata = res; });
      await screenVideoElem.play();

      // Canvas = full 1080p — screen fills it, cameras are PiP in the corner
      const canvas = document.createElement("canvas");
      canvas.width = 1920;
      canvas.height = 1080;
      canvasRef.current = canvas;
      const ctx = canvas.getContext("2d");

      const PIP_W = 240;
      const PIP_H = 135;
      const PIP_PAD = 12;

      const draw = () => {
        // Full screen content as the base
        if (screenVideoElem.readyState >= 2) {
          ctx.drawImage(screenVideoElem, 0, 0, canvas.width, canvas.height);
        } else {
          ctx.fillStyle = "#0d1117";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // Camera PiP tiles stacked in the bottom-right corner
        const remoteElems = Object.values(remoteVideoElemsRef.current);
        const allCams = [...remoteElems, localVideoRef.current].filter(Boolean);
        allCams.forEach((vid, i) => {
          if (vid?.readyState >= 2) {
            const x = canvas.width - PIP_W - PIP_PAD;
            const y = canvas.height - (PIP_H + PIP_PAD) * (allCams.length - i);
            ctx.fillStyle = "#0d1117";
            ctx.fillRect(x - 2, y - 2, PIP_W + 4, PIP_H + 4);
            ctx.drawImage(vid, x, y, PIP_W, PIP_H);
          }
        });

        animFrameRef.current = requestAnimationFrame(draw);
      };
      draw();

      // Mix all audio: local mic + all remote participant streams
      const audioCtx = new AudioContext();
      const mixDest = audioCtx.createMediaStreamDestination();
      if (localStream.getAudioTracks().length > 0) {
        audioCtx.createMediaStreamSource(localStream).connect(mixDest);
      }
      Object.values(remoteVideos).forEach((remoteStream) => {
        if (remoteStream.getAudioTracks().length > 0) {
          audioCtx.createMediaStreamSource(remoteStream).connect(mixDest);
        }
      });

      const canvasStream = canvas.captureStream(30);
      mixDest.stream.getAudioTracks().forEach((t) => canvasStream.addTrack(t));

      recordedChunksRef.current = [];
      const recorder = new MediaRecorder(canvasStream, {
        mimeType: "video/webm;codecs=vp9,opus",
      });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        cancelAnimationFrame(animFrameRef.current);
        screenStreamRef.current?.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
        audioCtx.close();
        await uploadRecording();
      };

      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      toast("Recording started (screen + cameras)", { icon: "⏺" });
    } catch (err) {
      console.error("Start recording error:", err.message);
      toast.error("Failed to start recording");
    }
  };

  // ─── Stop recording ───────────────────────────────────────────────────────
  const handleStopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    toast("Processing recording...", { icon: "⏳" });
  };

  // ─── Upload to R2 via Spring Boot ─────────────────────────────────────────
  const uploadRecording = async () => {
    if (recordedChunksRef.current.length === 0) return;

    setIsUploading(true);
    toast("Uploading recording to cloud...", { icon: "☁️" });

    try {
      const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
      const formData = new FormData();
      formData.append("file", blob, `recording-${Date.now()}.webm`);

      const id = interviewId;
      if (!id) {
        // No interviewId — download locally as fallback
        downloadLocally(blob);
        return;
      }

      const response = await recordingAPI.upload(id, formData);
      toast.success("Recording uploaded! Link saved to interview.");
      console.log("✅ Recording URL:", response.data.url);
    } catch (err) {
      console.error("Upload error:", err.message);
      toast.error("Upload failed — downloading locally");
      // Fallback — download locally
      const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
      downloadLocally(blob);
    } finally {
      setIsUploading(false);
      recordedChunksRef.current = [];
    }
  };

  const downloadLocally = (blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `coderoom-${roomId}-${Date.now()}.webm`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Cleanup ──────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      Object.values(peerConnectionsRef.current).forEach((pc) => pc.close());
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const remoteVideoEntries = Object.entries(remoteVideos);
  // total = all remotes + local; drives grid column count
  const totalVideos = remoteVideoEntries.length + 1;
  const gridCols = totalVideos >= 3 ? "cols2" : "cols1";

  return (
    <div className="cr-vid">
      {/* Header */}
      <div className="cr-vid-head">
        <div className="cr-vid-live">
          <div className="cr-vid-live-dot" />
          <span className="cr-vid-count">
            Live · {connectedCount + 1} participant
            {connectedCount + 1 !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="cr-vid-ctrls">
          <button
            onClick={handleToggleMute}
            title={isMuted ? "Unmute" : "Mute"}
            className={`cr-vid-ctrl${isMuted ? " danger" : ""}`}
          >
            {isMuted ? "🔇" : "🎤"}
          </button>
          <button
            onClick={handleToggleCamera}
            title={isCameraOff ? "Turn camera on" : "Turn camera off"}
            className={`cr-vid-ctrl${isCameraOff ? " danger" : ""}`}
          >
            {isCameraOff ? "📵" : "📷"}
          </button>
        </div>
      </div>

      {/* Videos — unified equal-size grid, auto-adjusts columns as people join */}
      <div className="cr-vid-body">
        {remoteVideoEntries.length === 0 && (
          <div className="cr-vid-waiting">
            <div className="cr-vid-waiting-ico">
              <span>👤</span>
            </div>
            <p>Waiting for others...</p>
          </div>
        )}

        <div className={`cr-vid-grid ${gridCols}`}>
          {/* Remote participants */}
          {remoteVideoEntries.map(([userId, stream]) => {
            const p = participants.find((p) => p.userId === userId);
            const label =
              p?.role === "CANDIDATE"
                ? "🎯 Candidate"
                : p?.email?.split("@")[0] || "Interviewer";
            const camOff = remoteCameraOff[userId];
            return (
              <div key={userId} className="cr-vid-tile">
                <RemoteVideoFill stream={stream} />
                {camOff && <AvatarFallback label={label} />}
                <span className="cr-vid-label">{label}</span>
              </div>
            );
          })}

          {/* Local video — same tile size as remotes */}
          {(() => {
            const localLabel = `You${isLeadInterviewer ? " 👑" : ""}`;
            return (
              <div className="cr-vid-tile">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="cr-vid-video"
                />
                {isCameraOff && <AvatarFallback label={localLabel} />}
                <span className="cr-vid-label">{localLabel}</span>
                {isMuted && <span className="cr-vid-mute">🔇</span>}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Recording — any interviewer */}
      {user?.role === "INTERVIEWER" && (
        <div className="cr-vid-rec">
          {isUploading ? (
            <div className="cr-vid-rec-uploading">
              <svg className="cr-spin" width="12" height="12" viewBox="0 0 24 24" fill="none">
                <circle className="op25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="op75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Uploading to cloud...
            </div>
          ) : isRecording ? (
            <>
              <div className="cr-vid-rec-active">
                <span className="cr-vid-rec-dot" />
                Recording in progress...
              </div>
              <button onClick={handleStopRecording} className="cr-vid-rec-btn stop">
                ⏹ Stop &amp; Save
              </button>
            </>
          ) : (
            <button onClick={handleStartRecording} className="cr-vid-rec-btn start">
              ⏺ Record Session
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// Fills whatever grid cell it's placed in — no wrapper div, no fixed aspect ratio.
const RemoteVideoFill = ({ stream }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return <video ref={videoRef} autoPlay playsInline className="cr-vid-video" />;
};

export default VideoPanel;