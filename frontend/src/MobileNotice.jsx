import { useEffect, useState } from "react";

// Shows a dismissible banner when the app is opened on a small/touch screen,
// pointing the user to desktop for the best experience.
// Dismissal is remembered (per browser) via localStorage so it doesn't
// nag on every visit, just the first time each device sees it.

const STORAGE_KEY = "cr-mobile-notice-dismissed";

function isMobileViewport() {
  if (typeof window === "undefined") return false;
  const narrow = window.matchMedia("(max-width: 768px)").matches;
  const touchUA = /Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(
    navigator.userAgent,
  );
  return narrow || touchUA;
}

const MobileNotice = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const alreadyDismissed = localStorage.getItem(STORAGE_KEY) === "1";
    if (isMobileViewport() && !alreadyDismissed) {
      setVisible(true);
    }

    // Re-check on resize/orientation change in case the window is
    // resized down (e.g. dev tools, split screen) after mount.
    const onResize = () => {
      if (isMobileViewport() && localStorage.getItem(STORAGE_KEY) !== "1") {
        setVisible(true);
      }
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="mn-root">
      <style>{CSS}</style>
      <div className="mn-banner">
        <span className="mn-icon" aria-hidden="true">
          🖥️
        </span>
        <p className="mn-text">
          You're on a mobile device. <strong>CodeRoom</strong> is built for
          live coding interviews and works best on a laptop or desktop
          screen.
        </p>
        <button
          className="mn-close"
          onClick={dismiss}
          aria-label="Dismiss notice"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

const CSS = `
  .mn-root {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 1000;
    display: flex;
    justify-content: center;
    padding: 10px 12px;
    pointer-events: none;
  }
  .mn-banner {
    pointer-events: auto;
    display: flex;
    align-items: center;
    gap: 10px;
    max-width: 480px;
    width: 100%;
    background: #161b22;
    border: 1px solid #2a323d;
    border-left: 3px solid #3fb950;
    border-radius: 10px;
    padding: 10px 12px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.4);
    animation: mn-slide-down .35s ease;
  }
  .mn-icon { font-size: 16px; flex-shrink: 0; }
  .mn-text {
    margin: 0;
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 12.5px;
    line-height: 1.45;
    color: #c9d1d9;
    flex: 1;
  }
  .mn-text strong { color: #e6edf3; }
  .mn-close {
    background: transparent;
    border: none;
    color: #8b949e;
    font-size: 13px;
    cursor: pointer;
    padding: 4px 6px;
    flex-shrink: 0;
    border-radius: 6px;
    transition: color .2s, background .2s;
  }
  .mn-close:hover { color: #e6edf3; background: #2a323d; }
  @keyframes mn-slide-down {
    from { opacity: 0; transform: translateY(-12px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

export default MobileNotice;