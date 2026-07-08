import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import useAuthStore from "../../store/authStore.js";
import useRoomStore from "../../store/roomStore.js";
import { roomAPI, interviewAPI } from "../../services/api.js";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  initSocket,
  getSocket,
  joinRoom,
  leaveRoom,
  sendCodeChange,
  sendCursorMove,
  autoSave,
  loadQuestion,
  changeLanguage,
} from "../../services/socket.js";
import { SOCKET_EVENTS, LANGUAGES, API_URL } from "../../utils/constants.js";
import CodeEditor from "../../components/editor/CodeEditor.jsx";
import VideoPanel from "../../components/video/VideoPanel.jsx";
import RoomControls from "../../components/room/RoomControls.jsx";
import ScoreModal from "../../components/room/ScoreModal.jsx";
import AICopilotPanel from "../../components/room/AICopilotPanel.jsx";
import InterviewTimer from "../../components/room/InterviewTimer.jsx";
import OutputPanel from "../../components/room/OutputPanel.jsx";

/* ────────────────────────────────────────────────────────────────────────────
   Shared interview-room design system — same tokens/fonts/treatments as the
   Landing, auth, and dashboard screens (cr- system), scoped under .cr-room-root.
   InterviewRoom injects this once; the room's child components (CodeEditor,
   VideoPanel, RoomControls, AICopilotPanel, InterviewTimer, OutputPanel) all
   render inside .cr-room-root and just use the classes. ScoreModal is the one
   exception — it carries its own styles because it also renders from Dashboard.
   ──────────────────────────────────────────────────────────────────────────── */
export const ROOM_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

  .cr-room-root{
    --cr-bg:#0a0e14; --cr-bg2:#0d1117; --cr-panel:#161b22; --cr-panel2:#1c232d;
    --cr-border:#2a323d; --cr-border2:#3a444f; --cr-text:#e6edf3; --cr-dim:#8b949e;
    --cr-dimmer:#5c6773; --cr-green:#3fb950; --cr-green2:#238636; --cr-blue:#58a6ff;
    --cr-purple:#bc8cff; --cr-yellow:#d29922; --cr-red:#f85149; --cr-danger2:#da3633;
    --cr-mono:'JetBrains Mono',ui-monospace,monospace;
    --cr-display:'Space Grotesk','Segoe UI',sans-serif;
    --cr-body:'Inter',system-ui,sans-serif;
    height:100vh; display:flex; flex-direction:column; overflow:hidden;
    background:var(--cr-bg); color:var(--cr-text); font-family:var(--cr-body);
    -webkit-font-smoothing:antialiased;
  }
  .cr-room-root *{margin:0;padding:0;box-sizing:border-box;}
  .cr-room-root ::selection{background:rgba(63,185,80,0.3);}
  .cr-spin{animation:cr-room-spin 1s linear infinite;}
  .op25{opacity:.25;} .op75{opacity:.75;}
  @keyframes cr-room-spin{to{transform:rotate(360deg);}}
  @keyframes cr-room-pulse{0%,100%{opacity:1;}50%{opacity:.4;}}

  /* Shared buttons */
  .cr-room-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;font-family:var(--cr-body);font-weight:500;font-size:12px;border-radius:9px;cursor:pointer;border:1px solid transparent;transition:all .2s;white-space:nowrap;}
  .cr-room-btn:disabled{opacity:.5;cursor:not-allowed;}
  .cr-room-btn-ghost{background:var(--cr-panel2);border-color:var(--cr-border);color:var(--cr-dim);padding:6px 12px;}
  .cr-room-btn-ghost:hover:not(:disabled){color:var(--cr-text);border-color:var(--cr-border2);}
  .cr-room-btn-primary{background:var(--cr-green2);color:#fff;padding:6px 14px;font-weight:600;}
  .cr-room-btn-primary:hover:not(:disabled){background:var(--cr-green);box-shadow:0 0 20px rgba(63,185,80,0.35);}
  .cr-room-btn-danger{background:var(--cr-danger2);color:#fff;padding:6px 14px;font-weight:600;}
  .cr-room-btn-danger:hover:not(:disabled){background:var(--cr-red);}

  /* Top bar */
  .cr-room-topbar{display:flex;align-items:center;justify-content:space-between;gap:12px;background:var(--cr-panel);border-bottom:1px solid var(--cr-border);padding:8px 16px;flex-shrink:0;}
  .cr-room-topbar-left{display:flex;align-items:center;gap:12px;flex-wrap:wrap;}
  .cr-room-topbar-right{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
  .cr-room-logo{font-family:var(--cr-display);font-weight:700;font-size:14px;letter-spacing:-0.01em;}
  .cr-room-logo b{color:var(--cr-green);font-weight:700;}
  .cr-room-sep{color:var(--cr-border2);}
  .cr-room-live{display:flex;align-items:center;gap:6px;}
  .cr-room-live-dot{width:8px;height:8px;border-radius:50%;background:var(--cr-green);animation:cr-room-pulse 1.6s infinite;}
  .cr-room-live span{font-size:12px;color:var(--cr-dim);}
  .cr-room-chips{display:flex;align-items:center;gap:4px;flex-wrap:wrap;}
  .cr-room-chip{font-family:var(--cr-mono);font-size:11px;color:var(--cr-dim);background:var(--cr-panel2);border:1px solid var(--cr-border);padding:2px 8px;border-radius:100px;}
  .cr-room-timer-wrap{display:flex;align-items:center;background:var(--cr-panel2);border:1px solid var(--cr-border);padding:4px 8px;border-radius:8px;}
  .cr-timer{display:flex;align-items:center;gap:4px;font-family:var(--cr-mono);font-size:12px;}
  .cr-room-select{background:var(--cr-panel2);border:1px solid var(--cr-border);color:var(--cr-text);font-family:var(--cr-body);font-size:12px;padding:6px 10px;border-radius:9px;cursor:pointer;transition:border-color .2s;}
  .cr-room-select:focus{outline:none;border-color:var(--cr-green);}
  .cr-room-select option{background:var(--cr-panel);color:var(--cr-text);}

  /* Loading */
  .cr-room-loading{min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--cr-bg);}
  .cr-room-loading .box{text-align:center;}
  .cr-room-loading .cr-spin{color:var(--cr-green);margin:0 auto 16px;}
  .cr-room-loading p{color:var(--cr-dim);font-size:14px;}

  /* Main layout */
  .cr-room-main{display:flex;flex:1;overflow:hidden;}

  /* Question panel */
  .cr-room-qpanel{width:320px;background:var(--cr-panel);border-right:1px solid var(--cr-border);display:flex;flex-direction:column;overflow:hidden;flex-shrink:0;}
  .cr-room-qhead{padding:16px;border-bottom:1px solid var(--cr-border);flex-shrink:0;}
  .cr-room-qhead-row{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;}
  .cr-room-qtitle{font-family:var(--cr-display);font-weight:600;font-size:14px;line-height:1.3;}
  .cr-room-qdiff{font-family:var(--cr-mono);font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;padding:3px 8px;border-radius:100px;flex-shrink:0;}
  .cr-room-qdiff.easy{color:var(--cr-green);background:rgba(63,185,80,0.12);}
  .cr-room-qdiff.medium{color:var(--cr-yellow);background:rgba(210,153,34,0.12);}
  .cr-room-qdiff.hard{color:var(--cr-red);background:rgba(248,81,73,0.12);}
  .cr-room-qtags{display:flex;flex-wrap:wrap;gap:4px;margin-top:8px;}
  .cr-room-qtag{font-family:var(--cr-mono);font-size:10px;color:var(--cr-blue);background:var(--cr-panel2);padding:2px 7px;border-radius:6px;}
  .cr-room-qbody{flex:1;overflow-y:auto;padding:16px;}

  /* Markdown (question description) */
  .cr-room-md{font-size:13px;color:var(--cr-dim);line-height:1.65;}
  .cr-room-md p{margin-bottom:12px;}
  .cr-room-md strong{color:var(--cr-text);font-weight:600;}
  .cr-room-md em{font-style:italic;}
  .cr-room-md ul,.cr-room-md ol{margin:0 0 12px;padding-left:20px;}
  .cr-room-md li{margin-bottom:4px;}
  .cr-room-md h1{color:var(--cr-text);font-family:var(--cr-display);font-weight:700;font-size:15px;margin-bottom:8px;}
  .cr-room-md h2{color:var(--cr-text);font-family:var(--cr-display);font-weight:600;font-size:14px;margin-bottom:8px;}
  .cr-room-md h3{color:var(--cr-dim);font-weight:600;font-size:13px;margin-bottom:4px;}
  .cr-room-md blockquote{border-left:2px solid var(--cr-green);padding-left:12px;margin:12px 0;font-style:italic;}
  .cr-room-md hr{border:none;border-top:1px solid var(--cr-border);margin:16px 0;}
  .cr-room-md a{color:var(--cr-blue);text-decoration:none;}
  .cr-room-md a:hover{text-decoration:underline;}
  .cr-room-md img{border-radius:10px;max-width:100%;margin:12px 0;border:1px solid var(--cr-border);}
  .cr-room-md table{width:100%;font-size:11px;border-collapse:collapse;margin:12px 0;}
  .cr-room-md th{border:1px solid var(--cr-border);background:var(--cr-panel2);color:var(--cr-text);padding:6px 12px;text-align:left;}
  .cr-room-md td{border:1px solid var(--cr-border);padding:6px 12px;}
  .cr-md-code-inline{background:var(--cr-panel2);color:var(--cr-blue);padding:2px 6px;border-radius:5px;font-size:11px;font-family:var(--cr-mono);}
  .cr-md-code-block{background:var(--cr-bg2);border:1px solid var(--cr-border);border-radius:10px;padding:12px;margin:12px 0;overflow-x:auto;}
  .cr-md-code-block code{font-size:11px;font-family:var(--cr-mono);color:var(--cr-text);}

  /* Editor column */
  .cr-room-editor-col{flex:1;display:flex;flex-direction:column;overflow:hidden;}

  /* Editor chrome */
  .cr-room-editor{flex:1;overflow:hidden;display:flex;flex-direction:column;background:var(--cr-bg2);}
  .cr-room-editor-bar{background:var(--cr-panel);border-bottom:1px solid var(--cr-border);padding:6px 16px;display:flex;align-items:center;gap:12px;flex-shrink:0;}
  .cr-room-editor-tab{display:flex;align-items:center;gap:8px;background:var(--cr-bg2);padding:5px 12px;border-radius:8px 8px 0 0;border-top:2px solid var(--cr-green2);}
  .cr-room-editor-tab-dot{width:8px;height:8px;border-radius:50%;background:var(--cr-green2);}
  .cr-room-editor-tab span{font-family:var(--cr-mono);font-size:12px;color:var(--cr-text);}
  .cr-room-editor-body{flex:1;overflow:hidden;}

  /* Output panel */
  .cr-out{background:var(--cr-panel);border-top:1px solid var(--cr-border);flex-shrink:0;display:flex;flex-direction:column;height:220px;}
  .cr-out-bar{display:flex;align-items:center;justify-content:space-between;padding:0 12px;border-bottom:1px solid var(--cr-border);flex-shrink:0;}
  .cr-out-tabs{display:flex;align-items:center;}
  .cr-out-tab{display:flex;align-items:center;font-family:var(--cr-body);font-size:12px;font-weight:500;color:var(--cr-dim);background:none;border:none;border-bottom:2px solid transparent;padding:8px 12px;cursor:pointer;transition:color .2s;}
  .cr-out-tab:hover{color:var(--cr-text);}
  .cr-out-tab.active{color:var(--cr-text);border-bottom-color:var(--cr-green2);}
  .cr-out-badge{margin-left:6px;font-family:var(--cr-mono);font-size:11px;padding:1px 7px;border-radius:100px;}
  .cr-out-badge.ok{background:rgba(63,185,80,0.14);color:var(--cr-green);}
  .cr-out-badge.bad{background:rgba(248,81,73,0.14);color:var(--cr-red);}
  .cr-out-tab-dot{margin-left:6px;width:6px;height:6px;background:var(--cr-red);border-radius:50%;display:inline-block;}
  .cr-out-status{display:flex;align-items:center;gap:8px;}
  .cr-out-runbadge{font-family:var(--cr-mono);font-size:11px;background:var(--cr-panel2);color:var(--cr-dim);padding:1px 8px;border-radius:100px;border:1px solid var(--cr-border);}
  .cr-out-subbadge{font-family:var(--cr-mono);font-size:11px;background:rgba(88,166,255,0.12);color:var(--cr-blue);padding:1px 8px;border-radius:100px;border:1px solid rgba(88,166,255,0.4);}
  .cr-out-verdict{font-size:12px;font-weight:600;}
  .cr-out-time{font-family:var(--cr-mono);font-size:11px;color:var(--cr-dimmer);}
  .cr-out-body{flex:1;overflow:hidden;}
  .cr-out-loading{height:100%;display:flex;align-items:center;justify-content:center;gap:8px;color:var(--cr-dim);font-size:12px;}
  .cr-out-loading .cr-spin{color:var(--cr-green2);}
  .cr-out-empty{height:100%;display:flex;align-items:center;justify-content:center;}
  .cr-out-empty p{font-size:12px;color:var(--cr-dimmer);}

  /* Terminal */
  .cr-term{height:100%;overflow-y:auto;background:var(--cr-bg2);padding:12px;font-family:var(--cr-mono);}
  .cr-term-head{display:flex;align-items:center;gap:8px;margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid var(--cr-border);}
  .cr-term-dots{display:flex;gap:5px;}
  .cr-term-dots span{width:10px;height:10px;border-radius:50%;}
  .cr-term-label{font-size:11px;color:var(--cr-dimmer);}
  .cr-term-empty{font-size:12px;color:var(--cr-dimmer);}
  .cr-term-summary{font-size:11px;color:var(--cr-dim);margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid var(--cr-border);}
  .cr-term-out{font-size:11px;color:var(--cr-text);white-space:pre-wrap;line-height:1.6;}
  .cr-term-err{font-size:11px;color:var(--cr-red);white-space:pre-wrap;line-height:1.6;}
  .cr-term-divider{border-top:1px solid var(--cr-border);margin:8px 0;}

  /* Test cases */
  .cr-tc{display:flex;flex-direction:column;max-height:180px;}
  .cr-tc-tabs{display:flex;align-items:center;gap:4px;padding:8px 12px 0;overflow-x:auto;flex-shrink:0;}
  .cr-tc-tab{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:500;color:var(--cr-dim);background:none;border:1px solid transparent;border-bottom:none;padding:6px 12px;border-radius:8px 8px 0 0;cursor:pointer;flex-shrink:0;transition:color .2s;}
  .cr-tc-tab:hover{color:var(--cr-text);}
  .cr-tc-tab.active{background:var(--cr-bg2);color:var(--cr-text);border-color:var(--cr-border);}
  .cr-tc-dot{font-size:10px;}
  .cr-tc-detail{flex:1;overflow-y:auto;background:var(--cr-bg2);padding:12px;display:flex;flex-direction:column;gap:12px;}
  .cr-tc-label{font-size:11px;color:var(--cr-dimmer);margin-bottom:4px;}
  .cr-tc-pre{font-size:11px;font-family:var(--cr-mono);color:var(--cr-text);background:var(--cr-panel);border-radius:8px;padding:8px 12px;white-space:pre-wrap;}
  .cr-tc-pre.expected{color:var(--cr-green);}
  .cr-tc-pre.ok{color:var(--cr-green);}
  .cr-tc-pre.bad{color:var(--cr-red);}
  .cr-tc-hidden{font-size:11px;color:var(--cr-dimmer);}

  /* Right column (video + copilot) */
  .cr-room-rightcol{width:320px;background:var(--cr-panel);border-left:1px solid var(--cr-border);flex-shrink:0;display:flex;flex-direction:column;overflow:hidden;}
  .cr-room-video-slot{flex-shrink:0;}
  .cr-room-video-slot.lead{height:384px;}
  .cr-room-video-slot.full{flex:1;}
  .cr-room-ai-slot{flex:1;overflow:hidden;display:flex;flex-direction:column;}

  /* Video panel */
  .cr-vid{height:100%;display:flex;flex-direction:column;background:var(--cr-panel);}
  .cr-vid-head{display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-bottom:1px solid var(--cr-border);}
  .cr-vid-live{display:flex;align-items:center;gap:6px;}
  .cr-vid-live-dot{width:6px;height:6px;border-radius:50%;background:var(--cr-green);animation:cr-room-pulse 1.6s infinite;}
  .cr-vid-count{font-size:12px;color:var(--cr-dim);font-weight:500;}
  .cr-vid-ctrls{display:flex;align-items:center;gap:4px;}
  .cr-vid-ctrl{padding:6px;border-radius:8px;font-size:12px;background:var(--cr-panel2);border:1px solid var(--cr-border);color:var(--cr-dim);cursor:pointer;transition:all .2s;line-height:1;}
  .cr-vid-ctrl:hover{color:var(--cr-text);}
  .cr-vid-ctrl.danger{background:var(--cr-danger2);border-color:var(--cr-danger2);color:#fff;}
  .cr-vid-body{flex:1;padding:8px;overflow-y:auto;}
  .cr-vid-waiting{display:flex;align-items:center;justify-content:center;background:var(--cr-bg2);border-radius:10px;padding:12px;margin-bottom:6px;text-align:center;}
  .cr-vid-waiting-ico{width:32px;height:32px;background:var(--cr-panel2);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 6px;font-size:16px;}
  .cr-vid-waiting p{font-size:12px;color:var(--cr-dimmer);}
  .cr-vid-grid{display:grid;gap:6px;}
  .cr-vid-grid.cols1{grid-template-columns:1fr;}
  .cr-vid-grid.cols2{grid-template-columns:1fr 1fr;}
  .cr-vid-tile{position:relative;aspect-ratio:16/9;border-radius:10px;overflow:hidden;background:var(--cr-bg2);}
  .cr-vid-video{width:100%;height:100%;object-fit:cover;}
  .cr-vid-label{position:absolute;bottom:4px;left:8px;font-size:11px;color:#fff;background:rgba(0,0,0,0.6);padding:2px 6px;border-radius:5px;max-width:90%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
  .cr-vid-mute{position:absolute;bottom:4px;right:8px;font-size:11px;background:var(--cr-danger2);padding:2px 6px;border-radius:5px;}
  .cr-vid-avatar-wrap{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:var(--cr-bg2);}
  .cr-vid-avatar{width:48px;height:48px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px;font-weight:700;font-family:var(--cr-display);margin-bottom:4px;user-select:none;}
  .cr-vid-avatar-sub{font-size:11px;color:var(--cr-dimmer);}
  .cr-vid-rec{padding:8px;border-top:1px solid var(--cr-border);display:flex;flex-direction:column;gap:6px;}
  .cr-vid-rec-uploading{display:flex;align-items:center;justify-content:center;gap:8px;font-size:12px;color:var(--cr-dim);padding:6px 0;}
  .cr-vid-rec-active{display:flex;align-items:center;justify-content:center;gap:8px;font-size:12px;color:var(--cr-red);padding:2px 0;}
  .cr-vid-rec-dot{width:8px;height:8px;border-radius:50%;background:var(--cr-red);animation:cr-room-pulse 1.6s infinite;}
  .cr-vid-rec-btn{width:100%;font-size:12px;padding:8px;border-radius:9px;font-weight:600;font-family:var(--cr-body);cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;transition:all .2s;}
  .cr-vid-rec-btn.start{background:var(--cr-panel2);border:1px solid var(--cr-border);color:var(--cr-dim);}
  .cr-vid-rec-btn.start:hover{color:var(--cr-text);border-color:var(--cr-border2);}
  .cr-vid-rec-btn.stop{background:var(--cr-danger2);border:1px solid var(--cr-danger2);color:#fff;}
  .cr-vid-rec-btn.stop:hover{background:var(--cr-red);}

  /* Room controls (bottom bar + question picker) */
  .cr-rc-bar{display:flex;align-items:center;justify-content:space-between;background:var(--cr-panel);border-top:1px solid var(--cr-border);padding:8px 16px;flex-shrink:0;}
  .cr-rc-save{font-family:var(--cr-mono);font-size:11px;color:var(--cr-dimmer);}
  .cr-rc-actions{display:flex;align-items:center;gap:8px;}
  .cr-rc-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:50;padding:16px;}
  .cr-rc-modal{background:var(--cr-panel);border:1px solid var(--cr-border);border-radius:16px;width:100%;max-width:512px;}
  .cr-rc-modal-head{display:flex;align-items:center;justify-content:space-between;padding:16px;border-bottom:1px solid var(--cr-border);}
  .cr-rc-modal-head h3{font-family:var(--cr-display);font-weight:600;font-size:15px;}
  .cr-rc-modal-close{background:none;border:none;color:var(--cr-dim);cursor:pointer;font-size:14px;transition:color .2s;}
  .cr-rc-modal-close:hover{color:var(--cr-text);}
  .cr-rc-modal-body{padding:16px;max-height:384px;overflow-y:auto;}
  .cr-rc-modal-loading{display:flex;justify-content:center;padding:32px 0;}
  .cr-rc-modal-loading .cr-spin{color:var(--cr-green2);}
  .cr-rc-qlist{display:flex;flex-direction:column;gap:8px;}
  .cr-rc-qitem{width:100%;text-align:left;background:var(--cr-bg2);border:1px solid var(--cr-border);border-radius:10px;padding:12px;cursor:pointer;transition:all .2s;}
  .cr-rc-qitem:hover{background:var(--cr-panel2);border-color:var(--cr-border2);}
  .cr-rc-qitem-row{display:flex;align-items:center;justify-content:space-between;gap:8px;}
  .cr-rc-qitem-title{color:var(--cr-text);font-size:14px;font-weight:500;}
  .cr-rc-qtags{font-family:var(--cr-mono);font-size:11px;color:var(--cr-dimmer);margin-top:4px;}

  /* AI Copilot */
  .cr-ai{display:flex;flex-direction:column;height:100%;background:var(--cr-panel);}
  .cr-ai-head{display:flex;align-items:center;gap:8px;padding:8px 12px;border-bottom:1px solid var(--cr-border);flex-shrink:0;}
  .cr-ai-head-title{font-size:12px;font-weight:500;color:var(--cr-dim);}
  .cr-ai-badge{margin-left:auto;font-family:var(--cr-mono);font-size:11px;color:var(--cr-green);background:rgba(63,185,80,0.12);padding:2px 8px;border-radius:100px;}
  .cr-ai-actions{padding:8px;border-bottom:1px solid var(--cr-border);flex-shrink:0;display:flex;flex-wrap:wrap;gap:5px;}
  .cr-ai-action{font-size:11px;background:var(--cr-panel2);border:1px solid var(--cr-border);color:var(--cr-dim);padding:4px 9px;border-radius:8px;cursor:pointer;transition:all .2s;}
  .cr-ai-action:hover:not(:disabled){color:var(--cr-text);border-color:var(--cr-border2);}
  .cr-ai-action:disabled{opacity:.5;cursor:not-allowed;}
  .cr-ai-msgs{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:12px;min-height:0;}
  .cr-ai-row{display:flex;}
  .cr-ai-row.user{justify-content:flex-end;}
  .cr-ai-row.assistant{justify-content:flex-start;}
  .cr-ai-msg{max-width:90%;border-radius:12px;padding:8px 12px;font-size:12px;line-height:1.6;}
  .cr-ai-msg.user{background:var(--cr-green2);color:#fff;}
  .cr-ai-msg.assistant{background:var(--cr-panel2);color:var(--cr-text);}
  .cr-ai-typing{background:var(--cr-panel2);border-radius:12px;padding:10px 12px;display:inline-flex;gap:5px;}
  .cr-ai-typing span{width:6px;height:6px;border-radius:50%;background:var(--cr-dim);animation:cr-ai-bounce 1.2s infinite;}
  .cr-ai-input-wrap{padding:8px;border-top:1px solid var(--cr-border);flex-shrink:0;}
  .cr-ai-input-row{display:flex;gap:8px;}
  .cr-ai-textarea{flex:1;background:var(--cr-bg2);border:1px solid var(--cr-border);border-radius:10px;padding:8px 12px;font-size:12px;color:var(--cr-text);font-family:var(--cr-body);resize:none;transition:border-color .2s;}
  .cr-ai-textarea::placeholder{color:var(--cr-dimmer);}
  .cr-ai-textarea:focus{outline:none;border-color:var(--cr-green);}
  .cr-ai-textarea:disabled{opacity:.5;}
  .cr-ai-send{background:var(--cr-green2);color:#fff;border:none;padding:0 14px;border-radius:10px;font-size:12px;font-weight:600;font-family:var(--cr-body);cursor:pointer;flex-shrink:0;transition:all .2s;}
  .cr-ai-send:hover:not(:disabled){background:var(--cr-green);}
  .cr-ai-send:disabled{opacity:.5;cursor:not-allowed;}
  .cr-ai-hint{font-size:11px;color:var(--cr-dimmer);margin-top:6px;}
  .cr-ai-md{display:flex;flex-direction:column;gap:4px;}
  .cr-ai-md strong{color:#fff;font-weight:600;}
  .cr-ai-md code{background:var(--cr-bg2);padding:1px 5px;border-radius:4px;color:var(--cr-blue);font-family:var(--cr-mono);}
  .cr-ai-md-h{font-weight:700;color:#fff;}
  @keyframes cr-ai-bounce{0%,60%,100%{transform:translateY(0);}30%{transform:translateY(-4px);}}
`;

// ─── Handle language change ───────────────────────────────────────────────
const STARTER_TEMPLATES = {
  PYTHON: `import sys\n\ndef solution(data):\n    # Write your solution here\n    pass\n\ndata = sys.stdin.read().strip()\nprint(solution(data))\n`,

  JAVASCRIPT: `const readline = require('readline');\nconst rl = readline.createInterface({ input: process.stdin });\nlet lines = [];\nrl.on('line', line => lines.push(line));\nrl.on('close', () => {\n    // lines[0], lines[1], ... contain your input\n    // Write your solution here\n    console.log(lines[0]);\n});\n`,

  JAVA: `import java.util.Scanner;\n\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        String input = sc.nextLine();\n        \n        // Write your solution here\n        System.out.println(input);\n    }\n}\n`,

  GO: `package main\n\nimport (\n    "bufio"\n    "fmt"\n    "os"\n)\n\nfunc main() {\n    reader := bufio.NewReader(os.Stdin)\n    input, _ := reader.ReadString('\\\\n')\n    \n    // Write your solution here\n    fmt.Println(input)\n}\n`,

  CPP: `#include <iostream>\n#include <string>\nusing namespace std;\n\nint main() {\n    string input;\n    getline(cin, input);\n    \n    // Write your solution here\n    cout << input << endl;\n    return 0;\n}\n`,
};

const InterviewRoom = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlRole = searchParams.get("role");
  const { user, accessToken, isInterviewer } = useAuthStore();
  const {
    currentCode,
    language,
    question,
    executionResult,
    isExecuting,
    isSubmitting,
    setRoomState,
    setCode,
    setLanguage,
    setQuestion,
    setExecuting,
    setExecutionResult,
    setSubmissionResult,
    addParticipant,
    removeParticipant,
    resetRoom,
  } = useRoomStore();

  const [isConnected, setIsConnected] = useState(false);
  const [isRemoteChange, setIsRemoteChange] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [showQuestion, setShowQuestion] = useState(true);
  const [showVideo, setShowVideo] = useState(true);
  const starterCodeMapRef = useRef(null); // per-language starter codes from the loaded question
  const codesPerLanguageRef = useRef({}); // per-language code retention across language switches
  const autoSaveRef = useRef(null);
  const codeRef = useRef(currentCode);
  const languageRef = useRef(language);
  const debounceRef = useRef(null);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [interviewRoomId, setInterviewRoomId] = useState(null);
  const [interviewId, setInterviewId] = useState(null);
  const [isLeadInterviewer, setIsLeadInterviewer] = useState(false);
  const showScoreModalRef = useRef(false);

  const [interviewStartedAt, setInterviewStartedAt] = useState(null);

  const socketRef = useRef(null);

  // Keep refs in sync so the auto-save interval always reads the current values
  // (the interval closure captures stale values if we use the state variables directly)
  useEffect(() => {
    codeRef.current = currentCode;
  }, [currentCode]);
  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  // Reliably determine lead-interviewer status once the room is connected.
  // This runs independently of the ROOM_STATE socket handler so a transient
  // network error in that handler can't silently leave isLeadInterviewer=false.
  useEffect(() => {
    if (!isConnected || !user || user.role !== "INTERVIEWER") return;

    const fetchLeadStatus = async () => {
      try {
        const res = await interviewAPI.getByRoomEntityId(roomId);
        const interview = res.data;
        if (!interviewId) setInterviewId(interview.id);
        const isLead = interview.createdById === user.id;
        setIsLeadInterviewer(isLead);
        console.log(
          `👑 isLeadInterviewer: ${isLead} (createdById=${interview.createdById}, userId=${user.id})`,
        );
      } catch (err) {
        console.error("fetchLeadStatus failed:", err.message);
      }
    };

    fetchLeadStatus();
  }, [isConnected, roomId]);

  // ─── Initialize socket + join room ────────────────────────────────────────
  useEffect(() => {
    if (!accessToken) return;

    let cancelled = false;

    const setup = async () => {
      // Validate/refresh token by making an API call first
      // If expired, interceptor refreshes and updateToken fires
      // which changes accessToken in store → useEffect re-runs with new token
      try {
        await roomAPI.getById(roomId);
      } catch (err) {
        if (err.response?.status === 401) return; // interceptor handles refresh
      }

      if (cancelled) return;

      const socket = initSocket(accessToken);
      socketRef.current = socket;

      // Remove ALL existing listeners first
      socket.off(SOCKET_EVENTS.ROOM_STATE);
      socket.off(SOCKET_EVENTS.ROOM_USER_JOINED);
      socket.off(SOCKET_EVENTS.ROOM_USER_LEFT);
      socket.off(SOCKET_EVENTS.ROOM_CLOSED);
      socket.off(SOCKET_EVENTS.ROOM_ERROR);
      socket.off(SOCKET_EVENTS.EDITOR_CODE_CHANGED);
      socket.off(SOCKET_EVENTS.ROOM_LANGUAGE_CHANGED);
      socket.off(SOCKET_EVENTS.EDITOR_QUESTION_LOADED);
      socket.off(SOCKET_EVENTS.EDITOR_EXECUTION_STARTED);
      socket.off(SOCKET_EVENTS.EDITOR_EXECUTION_RESULT);
      socket.off(SOCKET_EVENTS.EDITOR_SUBMISSION_RESULT);
      socket.off(SOCKET_EVENTS.EDITOR_SAVED);
      socket.off(SOCKET_EVENTS.AUTH_TOKEN_EXPIRED);

      // ── Room events ───────────────────────────────────────────────────────
      socket.on(SOCKET_EVENTS.ROOM_STATE, async (state) => {
        setRoomState(state);
        setIsConnected(true);
        toast.success("Connected to room");

        if (state.startedAt) setInterviewStartedAt(state.startedAt);
        else setInterviewStartedAt(new Date().toISOString());

        // Seed per-language code map with the persisted code so that after a
        // refresh the user can switch away and back without losing their work.
        if (state.language && state.currentCode) {
          codesPerLanguageRef.current[state.language] = state.currentCode;
        }

        // Restore question after page refresh — relay persists full question in Redis
        if (state.question) {
          setQuestion(state.question);
          starterCodeMapRef.current = state.question.starterCodeMap || null;
        }

        const { user } = useAuthStore.getState();

        if (user?.role === "CANDIDATE") {
          try {
            const interviewRes = await interviewAPI.getByRoomEntityId(roomId);
            const interview = interviewRes.data;
            if (interview.status === "SCHEDULED") {
              await interviewAPI.join(interview.roomId);
            }
          } catch (err) {
            console.log("Join interview error:", err.message);
          }
        } else if (user?.role === "INTERVIEWER") {
          try {
            const interviewRes = await interviewAPI.getByRoomEntityId(roomId);
            const interview = interviewRes.data;
            setInterviewId(interview.id);

            // Check if current user is lead interviewer (created the interview)
            const isLead = interview.createdById === user?.id;
            setIsLeadInterviewer(isLead);
            console.log(`👤 Lead interviewer: ${isLead}`);

            if (urlRole === "interviewer") {
              await interviewAPI.joinAsPanelist(interview.id);
              console.log("✅ Joined as panelist");
            }
          } catch (err) {
            console.log("Interviewer join:", err.message);
          }
        }
      });

      socket.on(SOCKET_EVENTS.ROOM_USER_JOINED, (data) => {
        addParticipant(data.userId, data);
        setParticipants((prev) => {
          if (prev.find((p) => p.userId === data.userId)) return prev;
          return [...prev, data];
        });
        if (!data.isExisting) toast.success(`${data.email} joined`);
      });

      socket.on(SOCKET_EVENTS.ROOM_USER_LEFT, (data) => {
        removeParticipant(data.userId);
        setParticipants((prev) => prev.filter((p) => p.userId !== data.userId));
        toast(`${data.email} left`, { icon: "👋" });
      });

      socket.on(SOCKET_EVENTS.ROOM_CLOSED, () => {
        if (showScoreModalRef.current) return;
        toast.error("Interview ended");
        navigate("/dashboard");
      });

      socket.on(SOCKET_EVENTS.ROOM_ERROR, (data) => {
        toast.error(data.message);
        if (data.message === "This interview has ended") {
          setTimeout(() => navigate("/dashboard"), 2000);
        }
      });

      // ── Editor events ─────────────────────────────────────────────────────
      socket.on(SOCKET_EVENTS.EDITOR_CODE_CHANGED, (data) => {
        if (data.userId !== user?.id) {
          setIsRemoteChange(true);
          setCode(data.code);
          setTimeout(() => setIsRemoteChange(false), 100);
        }
      });

      socket.on(SOCKET_EVENTS.ROOM_LANGUAGE_CHANGED, (data) => {
        setLanguage(data.language);
        if (data.code !== undefined) {
          setIsRemoteChange(true);
          setCode(data.code);
          setTimeout(() => setIsRemoteChange(false), 100);
        }
      });

      socket.on(SOCKET_EVENTS.EDITOR_QUESTION_LOADED, (data) => {
        // Guard against duplicate firings from the Pub/Sub relay
        // (each participant adds a subscriber, so N participants → N+1 emits)
        const existing = useRoomStore.getState().question;
        const isNewQuestion =
          !existing || existing.questionId !== data.questionId;

        setQuestion(data);
        starterCodeMapRef.current = data.starterCodeMap || null;

        if (isNewQuestion) {
          codesPerLanguageRef.current = {};
          setIsRemoteChange(true);
          setCode(data.starterCode || "");
          setTimeout(() => setIsRemoteChange(false), 100);
          toast.success(`Question loaded: ${data.questionTitle}`);
        }
      });

      socket.on(SOCKET_EVENTS.EDITOR_EXECUTION_STARTED, () => {
        setExecuting(true);
      });

      socket.on(SOCKET_EVENTS.EDITOR_EXECUTION_RESULT, (data) => {
        setExecutionResult(data);
      });

      socket.on(SOCKET_EVENTS.EDITOR_SUBMISSION_RESULT, (data) => {
        setSubmissionResult({ ...data, isSubmission: true });
      });
      socket.on(SOCKET_EVENTS.EDITOR_SAVED, () => {
        console.log("✅ Auto saved");
      });

      // JWT expired mid-session — refresh silently, socket reconnects automatically
      socket.on(SOCKET_EVENTS.AUTH_TOKEN_EXPIRED, async () => {
        const refreshToken = localStorage.getItem("refreshToken");
        if (!refreshToken) {
          navigate("/login");
          return;
        }
        try {
          // Use raw axios (not api instance) to avoid interceptor re-triggering
          const res = await axios.post(
            `${API_URL}/api/auth/refresh`,
            {},
            { headers: { "Refresh-Token": refreshToken } },
          );
          useAuthStore.getState().updateToken(res.data.accessToken);
          toast("Session refreshed — run your code again", { icon: "🔄" });
        } catch {
          toast.error("Session expired — please log in again");
          navigate("/login");
        }
      });

      // ── Join room ─────────────────────────────────────────────────────────
      const doJoin = () => {
        joinRoom(roomId);
        console.log("🚀 Joining room:", roomId);
      };

      if (socket.connected) {
        doJoin();
      } else {
        socket.once("connect", doJoin);
      }

      // ── Auto save every 10 seconds ────────────────────────────────────────
      autoSaveRef.current = setInterval(() => {
        autoSave(roomId, codeRef.current, languageRef.current);
      }, 10000);
    };

    setup();

    return () => {
      cancelled = true;
      clearInterval(autoSaveRef.current);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      resetRoom();
      const s = socketRef.current;
      if (s) {
        s.off(SOCKET_EVENTS.ROOM_STATE);
        s.off(SOCKET_EVENTS.ROOM_USER_JOINED);
        s.off(SOCKET_EVENTS.ROOM_USER_LEFT);
        s.off(SOCKET_EVENTS.ROOM_CLOSED);
        s.off(SOCKET_EVENTS.ROOM_ERROR);
        s.off(SOCKET_EVENTS.EDITOR_CODE_CHANGED);
        s.off(SOCKET_EVENTS.ROOM_LANGUAGE_CHANGED);
        s.off(SOCKET_EVENTS.EDITOR_QUESTION_LOADED);
        s.off(SOCKET_EVENTS.EDITOR_EXECUTION_STARTED);
        s.off(SOCKET_EVENTS.EDITOR_EXECUTION_RESULT);
        s.off(SOCKET_EVENTS.EDITOR_SUBMISSION_RESULT);
        s.off(SOCKET_EVENTS.EDITOR_SAVED);
        s.off(SOCKET_EVENTS.AUTH_TOKEN_EXPIRED);
      }
    };
  }, [roomId, accessToken]);
  // ─── Handle code change ───────────────────────────────────────────────────

  const handleCodeChange = useCallback(
    (newCode) => {
      setCode(newCode);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        sendCodeChange(roomId, newCode, null);
      }, 300);
    },
    [roomId],
  );
  const handleLanguageChange = (newLanguage) => {
    const previousLanguage = language;

    // Always save the current code under the previous language so switching
    // back restores exactly what the user had written.
    codesPerLanguageRef.current[previousLanguage] = currentCode;

    setLanguage(newLanguage);

    // Restore previously written code for the target language if available,
    // otherwise fall back to the question starter or generic template.
    const savedCode = codesPerLanguageRef.current[newLanguage];
    const newCode =
      savedCode !== undefined
        ? savedCode
        : (starterCodeMapRef.current?.[newLanguage] ||
           STARTER_TEMPLATES[newLanguage] ||
           "");

    // Send language + code in a single relay event to update Redis atomically
    // (avoids a race where a concurrent editor:code_change read overwrites the
    // new language back to the old value before it is saved).
    changeLanguage(roomId, newLanguage, newCode);

    setIsRemoteChange(true);
    setCode(newCode);
    setTimeout(() => setIsRemoteChange(false), 100);
  };

  const handleEndInterview = async () => {
    try {
      const response = await interviewAPI.end(roomId);
      setInterviewRoomId(response.data.roomId);

      const socket = getSocket();
      socket?.emit(SOCKET_EVENTS.ROOM_CLOSE, { roomId });

      // Set both state and ref
      setShowScoreModal(true);
      showScoreModalRef.current = true;
      toast.success("Interview ended");
    } catch (err) {
      console.log(err);
      toast.error("Failed to end interview");
    }
  };
  const handleLeaveRoom = () => {
    const socket = getSocket();
    socket?.emit(SOCKET_EVENTS.ROOM_LEAVE, { roomId });
    navigate("/dashboard");
  };

  // ─── Loading state ────────────────────────────────────────────────────────
  if (!isConnected) {
    return (
      <div className="cr-room-root">
        <style>{ROOM_CSS}</style>
        <div className="cr-room-loading">
          <div className="box">
            <svg className="cr-spin" width="40" height="40" viewBox="0 0 24 24" fill="none">
              <circle className="op25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="op75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <p>Connecting to room...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cr-room-root">
      <style>{ROOM_CSS}</style>

      {/* Top bar */}
      <div className="cr-room-topbar">
        <div className="cr-room-topbar-left">
          <h1 className="cr-room-logo">Code<b>Room</b></h1>
          <span className="cr-room-sep">|</span>
          <div className="cr-room-live">
            <div className="cr-room-live-dot" />
            <span>Live</span>
          </div>
          {/* Participants */}
          <div className="cr-room-chips">
            {participants.map((p) => (
              <span key={p.userId} className="cr-room-chip">
                {p.email?.split("@")[0]}
              </span>
            ))}
          </div>

          {/* Timer */}
          {interviewStartedAt && (
            <div className="cr-room-timer-wrap">
              <InterviewTimer startedAt={interviewStartedAt} />
            </div>
          )}
        </div>

        <div className="cr-room-topbar-right">
          {/* Language selector */}
          <select
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="cr-room-select"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>

          {/* Toggle question panel */}
          <button
            onClick={() => setShowQuestion(!showQuestion)}
            className="cr-room-btn cr-room-btn-ghost"
          >
            {showQuestion ? "Hide" : "Show"} Question
          </button>

          {/* Toggle video */}
          <button
            onClick={() => setShowVideo(!showVideo)}
            className="cr-room-btn cr-room-btn-ghost"
          >
            {showVideo ? "Hide" : "Show"} Video
          </button>

          {/* End interview — interviewer only */}
          {isInterviewer() && (
            <button onClick={handleEndInterview} className="cr-room-btn cr-room-btn-danger">
              End Interview
            </button>
          )}
          {!isInterviewer() && (
            <button onClick={handleLeaveRoom} className="cr-room-btn cr-room-btn-danger">
              Leave Room
            </button>
          )}
        </div>
      </div>

      {/* Main layout */}
      <div className="cr-room-main">
        {/* Question panel */}
        {showQuestion && question && (
          <div className="cr-room-qpanel">
            {/* Header */}
            <div className="cr-room-qhead">
              <div className="cr-room-qhead-row">
                <h3 className="cr-room-qtitle">{question.questionTitle}</h3>
                <span
                  className={`cr-room-qdiff ${
                    question.difficulty === "EASY"
                      ? "easy"
                      : question.difficulty === "MEDIUM"
                        ? "medium"
                        : "hard"
                  }`}
                >
                  {question.difficulty}
                </span>
              </div>
              {question.tags && (
                <div className="cr-room-qtags">
                  {question.tags.split(",").map((tag) => (
                    <span key={tag} className="cr-room-qtag">
                      {tag.trim()}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Description — markdown rendered */}
            <div className="cr-room-qbody">
              <div className="cr-room-md">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code: ({ inline, children }) =>
                      inline ? (
                        <code className="cr-md-code-inline">{children}</code>
                      ) : (
                        <pre className="cr-md-code-block">
                          <code>{children}</code>
                        </pre>
                      ),
                    a: ({ href, children }) => (
                      <a href={href} target="_blank" rel="noreferrer">
                        {children}
                      </a>
                    ),
                    img: ({ src, alt }) => <img src={src} alt={alt} />,
                  }}
                >
                  {question.description}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        )}

        {/* Editor */}
        <div className="cr-room-editor-col">
          <CodeEditor
            code={currentCode}
            language={language}
            onChange={handleCodeChange}
            roomId={roomId}
            isRemoteChange={isRemoteChange}
          />

          {/* ── Output panel — Terminal + Test Cases ─────────────────────────── */}
          {(executionResult || isExecuting) && (
            <OutputPanel
              executionResult={executionResult}
              isExecuting={isExecuting}
            />
          )}
        </div>

        {/* Right panel — Video + AI Copilot */}
        <div className="cr-room-rightcol">
          {/* Video panel */}
          {showVideo && (
            <div className={`cr-room-video-slot ${isInterviewer() ? "lead" : "full"}`}>
              <VideoPanel
                roomId={roomId}
                participants={participants}
                isLeadInterviewer={isLeadInterviewer}
                interviewId={interviewId}
              />
            </div>
          )}

          {/* AI Copilot — interviewer only */}
          {isInterviewer() && (
            <div className="cr-room-ai-slot">
              <AICopilotPanel />
            </div>
          )}
        </div>
      </div>

      {/* Room controls — bottom bar */}
      <RoomControls
        roomId={roomId}
        code={currentCode}
        language={language}
        question={question}
      />

      {/* Score modal */}
      {showScoreModal && (
        <ScoreModal
          roomId={interviewRoomId || roomId}
          candidateName={
            participants.find((p) => p.role === "CANDIDATE")?.email ||
            "Candidate"
          }
          onClose={() => {
            setShowScoreModal(false);
            showScoreModalRef.current = false;
            navigate("/dashboard");
          }}
          onSubmitted={() => {
            setShowScoreModal(false);
            showScoreModalRef.current = false;
            navigate("/dashboard");
          }}
        />
      )}
    </div>
  );
};

export default InterviewRoom;