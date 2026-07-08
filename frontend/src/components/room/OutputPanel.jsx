import { useState, useEffect } from "react";

// ─── Test case results — LeetCode style ──────────────────────────────────────
const TestCaseResults = ({ results }) => {
  const [activeTab, setActiveTab] = useState(0);
  const active = results[activeTab];

  return (
    <div className="cr-tc">
      {/* Test case tabs */}
      <div className="cr-tc-tabs">
        {results.map((r, i) => (
          <button
            key={i}
            onClick={() => setActiveTab(i)}
            className={`cr-tc-tab${activeTab === i ? " active" : ""}`}
          >
            <span
              className="cr-tc-dot"
              style={{ color: r.passed ? "var(--cr-green)" : "var(--cr-red)" }}
            >
              ●
            </span>
            Case {i + 1}
          </button>
        ))}
      </div>

      {/* Active test case detail */}
      {active && (
        <div className="cr-tc-detail">
          {/* Input */}
          {active.input && active.input !== "hidden" && (
            <div className="cr-tc-block">
              <p className="cr-tc-label">Input</p>
              <pre className="cr-tc-pre">{active.input}</pre>
            </div>
          )}

          {/* Expected output */}
          {active.expectedOutput && active.expectedOutput !== "hidden" && (
            <div className="cr-tc-block">
              <p className="cr-tc-label">Expected Output</p>
              <pre className="cr-tc-pre expected">{active.expectedOutput}</pre>
            </div>
          )}

          {/* Actual output */}
          <div className="cr-tc-block">
            <p className="cr-tc-label">Your Output</p>
            <pre className={`cr-tc-pre ${active.passed ? "ok" : "bad"}`}>
              {active.actualOutput === "hidden"
                ? active.passed
                  ? "Correct ✓"
                  : "Wrong answer"
                : active.actualOutput || "(empty)"}
            </pre>
          </div>

          {/* Hidden badge */}
          {active.input === "hidden" && (
            <p className="cr-tc-hidden">
              🔒 Hidden test case — input/output not shown
            </p>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Output panel — Terminal + Test Cases tabs ────────────────────────────────
const OutputPanel = ({ executionResult, isExecuting }) => {
  const [activeTab, setActiveTab] = useState("testcases");

  const hasTestCases = executionResult?.results?.length > 0;
  const hasOutput = executionResult?.stdout || executionResult?.stderr;

  // Auto switch to terminal when there's an error
  useEffect(() => {
    if (executionResult?.stderr && !executionResult?.passed) {
      setActiveTab("terminal");
    }
  }, [executionResult]);

  return (
    <div className="cr-out">
      {/* Tab bar + status */}
      <div className="cr-out-bar">
        {/* Tabs */}
        <div className="cr-out-tabs">
          <button
            onClick={() => setActiveTab("testcases")}
            className={`cr-out-tab${activeTab === "testcases" ? " active" : ""}`}
          >
            Test Cases
            {hasTestCases && (
              <span className={`cr-out-badge ${executionResult.passed ? "ok" : "bad"}`}>
                {executionResult.results.filter((r) => r.passed).length}/
                {executionResult.results.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("terminal")}
            className={`cr-out-tab${activeTab === "terminal" ? " active" : ""}`}
          >
            Terminal
            {executionResult?.stderr && <span className="cr-out-tab-dot" />}
          </button>
        </div>

        {/* Status badge */}
        {executionResult && (
          <div className="cr-out-status">
            {/* Run vs Submit badge */}
            {executionResult.isSubmission ? (
              <span className="cr-out-subbadge">Submission</span>
            ) : (
              <span className="cr-out-runbadge">Run</span>
            )}
            <span
              className="cr-out-verdict"
              style={{
                color: executionResult.timedOut
                  ? "var(--cr-yellow)"
                  : executionResult.passed
                    ? "var(--cr-green)"
                    : "var(--cr-red)",
              }}
            >
              {executionResult.timedOut
                ? "⏱ TLE"
                : executionResult.passed
                  ? "✅ Accepted"
                  : "❌ Wrong Answer"}
            </span>
            {executionResult.executionTimeMs && (
              <span className="cr-out-time">{executionResult.executionTimeMs}ms</span>
            )}
          </div>
        )}
      </div>

      {/* Tab content */}
      <div className="cr-out-body">
        {/* Executing spinner */}
        {isExecuting ? (
          <div className="cr-out-loading">
            <svg className="cr-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle className="op25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="op75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <span>Running code...</span>
          </div>
        ) : activeTab === "testcases" ? (
          /* ── Test Cases tab ── */
          hasTestCases ? (
            <TestCaseResults results={executionResult.results} />
          ) : (
            <div className="cr-out-empty">
              <p>
                {executionResult
                  ? "No test cases for this run"
                  : "Run your code to see results"}
              </p>
            </div>
          )
        ) : (
          /* ── Terminal tab ── */
          <div className="cr-term">
            {/* Terminal header */}
            <div className="cr-term-head">
              <div className="cr-term-dots">
                <span style={{ background: "var(--cr-red)" }} />
                <span style={{ background: "var(--cr-yellow)" }} />
                <span style={{ background: "var(--cr-green)" }} />
              </div>
              <span className="cr-term-label">stdout / stderr</span>
            </div>

            {/* Output */}
            {!executionResult?.stdout && !executionResult?.stderr ? (
              <p className="cr-term-empty">~ no output</p>
            ) : (
              <>
                {/* Summary line */}
                {executionResult?.summary && (
                  <div className="cr-term-summary">{executionResult.summary}</div>
                )}

                {/* Actual program stdout — System.out.println etc */}
                {executionResult?.stdout && (
                  <pre className="cr-term-out">{executionResult.stdout}</pre>
                )}
                {executionResult?.stderr && (
                  <>
                    {executionResult?.stdout && <div className="cr-term-divider" />}
                    <pre className="cr-term-err">{executionResult.stderr}</pre>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default OutputPanel;