import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore.js';
import { questionAPI } from '../../services/api.js';
import { QuestionCardSkeletonList } from '../../components/shared/Skeleton.jsx';
import EmptyState from '../../components/shared/EmptyState.jsx';

const DIFFICULTIES = ['ALL', 'EASY', 'MEDIUM', 'HARD'];

const QB_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

  .cr-qb-root{
    --cr-bg:#0a0e14; --cr-bg2:#0d1117; --cr-panel:#161b22; --cr-panel2:#1c232d;
    --cr-border:#2a323d; --cr-border2:#3a444f; --cr-text:#e6edf3; --cr-dim:#8b949e;
    --cr-dimmer:#5c6773; --cr-green:#3fb950; --cr-green2:#238636; --cr-blue:#58a6ff;
    --cr-yellow:#d29922; --cr-red:#f85149; --cr-danger2:#da3633;
    --cr-mono:'JetBrains Mono',ui-monospace,monospace;
    --cr-display:'Space Grotesk','Segoe UI',sans-serif; --cr-body:'Inter',system-ui,sans-serif;
    min-height:100vh; background:var(--cr-bg); color:var(--cr-text);
    font-family:var(--cr-body); line-height:1.6; -webkit-font-smoothing:antialiased;
  }
  .cr-qb-root *{margin:0;padding:0;box-sizing:border-box;}
  .cr-qb-root ::selection{background:rgba(63,185,80,0.3);}

  /* Nav */
  .cr-qb-nav{position:sticky;top:0;z-index:10;background:rgba(10,14,20,0.85);backdrop-filter:blur(12px);border-bottom:1px solid var(--cr-border);}
  .cr-qb-nav-inner{max-width:1120px;margin:0 auto;padding:14px 24px;display:flex;align-items:center;justify-content:space-between;gap:16px;}
  .cr-qb-nav-left{display:flex;align-items:center;gap:28px;}
  .cr-qb-logo{display:flex;align-items:center;gap:8px;font-family:var(--cr-display);font-weight:700;font-size:18px;letter-spacing:-0.02em;}
  .cr-qb-logo b{color:var(--cr-green);}
  .cr-qb-logo-dot{width:8px;height:8px;border-radius:50%;background:var(--cr-green);box-shadow:0 0 10px var(--cr-green);}
  .cr-qb-links{display:flex;align-items:center;gap:20px;}
  .cr-qb-navlink{font-family:var(--cr-body);font-size:14px;color:var(--cr-dim);background:none;border:none;cursor:pointer;transition:color .2s;}
  .cr-qb-navlink:hover{color:var(--cr-text);}
  .cr-qb-navlink.active{color:var(--cr-text);font-weight:500;padding-bottom:2px;border-bottom:2px solid var(--cr-green);}
  .cr-qb-nav-right{display:flex;align-items:center;gap:14px;}
  .cr-qb-user{text-align:right;}
  .cr-qb-user-name{font-size:14px;font-weight:500;line-height:1.25;}
  .cr-qb-user-role{font-family:var(--cr-mono);font-size:10px;color:var(--cr-dim);text-transform:uppercase;letter-spacing:.04em;}
  .cr-qb-signout{font-family:var(--cr-body);font-size:14px;color:var(--cr-dim);background:none;border:1px solid var(--cr-border);padding:7px 12px;border-radius:9px;cursor:pointer;transition:all .2s;}
  .cr-qb-signout:hover{color:var(--cr-text);border-color:var(--cr-border2);}
  @media(max-width:640px){.cr-qb-user{display:none;}}

  .cr-qb-main{max-width:1120px;margin:0 auto;padding:32px 24px;}

  /* Header */
  .cr-qb-head{display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:16px;margin-bottom:24px;}
  .cr-qb-title{font-family:var(--cr-display);font-weight:700;font-size:26px;letter-spacing:-0.02em;}
  .cr-qb-sub{font-size:14px;color:var(--cr-dim);margin-top:4px;}
  .cr-qb-create{display:inline-flex;align-items:center;gap:8px;background:var(--cr-green2);color:#fff;font-family:var(--cr-body);font-weight:600;font-size:14px;padding:10px 18px;border:none;border-radius:10px;cursor:pointer;transition:all .2s;}
  .cr-qb-create:hover{background:var(--cr-green);box-shadow:0 0 24px rgba(63,185,80,0.35);}

  /* Filters */
  .cr-qb-filters{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:24px;}
  .cr-qb-search{flex:1;min-width:200px;position:relative;}
  .cr-qb-search .ico{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--cr-dimmer);display:flex;pointer-events:none;}
  .cr-qb-search input{width:100%;background:var(--cr-panel);border:1px solid var(--cr-border);border-radius:10px;padding:10px 14px 10px 36px;font-size:14px;color:var(--cr-text);font-family:var(--cr-body);transition:border-color .2s,box-shadow .2s;}
  .cr-qb-search input::placeholder{color:var(--cr-dimmer);}
  .cr-qb-search input:focus{outline:none;border-color:var(--cr-green);box-shadow:0 0 0 3px rgba(63,185,80,0.12);}
  .cr-qb-diffs{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
  .cr-qb-diff{display:inline-flex;align-items:center;gap:6px;font-family:var(--cr-body);font-size:12px;font-weight:500;padding:8px 12px;border-radius:9px;border:1px solid var(--cr-border);background:var(--cr-panel);color:var(--cr-dim);cursor:pointer;transition:all .2s;}
  .cr-qb-diff:hover{border-color:var(--cr-border2);color:var(--cr-text);}
  .cr-qb-diff-count{font-family:var(--cr-mono);opacity:.6;}
  .cr-qb-diff.active.all{background:var(--cr-panel2);color:var(--cr-text);border-color:var(--cr-border2);}
  .cr-qb-diff.active.easy{background:rgba(63,185,80,0.12);color:var(--cr-green);border-color:var(--cr-green2);}
  .cr-qb-diff.active.medium{background:rgba(210,153,34,0.12);color:var(--cr-yellow);border-color:var(--cr-yellow);}
  .cr-qb-diff.active.hard{background:rgba(248,81,73,0.12);color:var(--cr-red);border-color:var(--cr-danger2);}

  /* Question list */
  .cr-qb-list{display:flex;flex-direction:column;gap:12px;}
  .cr-qb-card{background:var(--cr-panel);border:1px solid var(--cr-border);border-radius:14px;padding:18px 20px;transition:all .2s;}
  .cr-qb-card:hover{border-color:var(--cr-border2);box-shadow:0 8px 28px -12px rgba(0,0,0,0.5);}
  .cr-qb-card-row{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;}
  .cr-qb-card-main{flex:1;min-width:0;}
  .cr-qb-card-titlerow{display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap;}
  .cr-qb-card-title{font-family:var(--cr-display);font-weight:600;font-size:14px;color:var(--cr-text);}
  .cr-qb-badge{font-family:var(--cr-mono);font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;padding:3px 8px;border-radius:100px;}
  .cr-qb-badge.easy{color:var(--cr-green);background:rgba(63,185,80,0.12);}
  .cr-qb-badge.medium{color:var(--cr-yellow);background:rgba(210,153,34,0.12);}
  .cr-qb-badge.hard{color:var(--cr-red);background:rgba(248,81,73,0.12);}
  .cr-qb-desc{font-size:12px;color:var(--cr-dim);line-height:1.6;margin-bottom:10px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
  .cr-qb-meta{display:flex;align-items:center;gap:12px;flex-wrap:wrap;}
  .cr-qb-tags{display:flex;align-items:center;gap:5px;flex-wrap:wrap;}
  .cr-qb-tag{font-family:var(--cr-mono);font-size:10px;color:var(--cr-blue);background:var(--cr-panel2);padding:2px 8px;border-radius:100px;}
  .cr-qb-tc{display:inline-flex;align-items:center;gap:5px;font-family:var(--cr-mono);font-size:11px;color:var(--cr-dimmer);}
  .cr-qb-delete{font-family:var(--cr-body);font-size:12px;color:var(--cr-dim);background:none;border:1px solid var(--cr-border);padding:7px 12px;border-radius:9px;cursor:pointer;transition:all .2s;flex-shrink:0;}
  .cr-qb-delete:hover{color:var(--cr-red);border-color:rgba(248,81,73,0.4);}
`;

const QuestionBank = () => {
    const navigate = useNavigate();
    const { isInterviewer, logout, user } = useAuthStore();

    const [questions, setQuestions] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [difficulty, setDifficulty] = useState('ALL');

    const fetchQuestions = async () => {
        try {
            setIsLoading(true);
            const response = await questionAPI.getAll();
            setQuestions(response.data);
            setFiltered(response.data);
        } catch (err) {
            toast.error('Failed to load questions');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchQuestions();
    }, []);

    useEffect(() => {
        let result = [...questions];

        if (difficulty !== 'ALL') {
            result = result.filter(q => q.difficulty === difficulty);
        }

        if (search.trim()) {
            const s = search.toLowerCase();
            result = result.filter(q =>
                q.title?.toLowerCase().includes(s) ||
                q.tags?.toLowerCase().includes(s)
            );
        }

        setFiltered(result);
    }, [search, difficulty, questions]);

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this question?')) return;
        try {
            await questionAPI.delete(id);
            toast.success('Question deleted');
            fetchQuestions();
        } catch (err) {
            toast.error('Failed to delete question');
        }
    };

    const DifficultyBadge = ({ difficulty }) => (
        <span className={`cr-qb-badge ${difficulty?.toLowerCase()}`}>
            {difficulty}
        </span>
    );

    const hasActiveFilters = search.trim() !== '' || difficulty !== 'ALL';

    const clearFilters = () => {
        setSearch('');
        setDifficulty('ALL');
    };

    // ─── Difficulty counts for filter pills ──────────────────────────────────
    const counts = {
        ALL: questions.length,
        EASY: questions.filter(q => q.difficulty === 'EASY').length,
        MEDIUM: questions.filter(q => q.difficulty === 'MEDIUM').length,
        HARD: questions.filter(q => q.difficulty === 'HARD').length,
    };

    return (
        <div className="cr-qb-root">
            <style>{QB_CSS}</style>

            {/* Navbar */}
            <nav className="cr-qb-nav">
                <div className="cr-qb-nav-inner">
                    <div className="cr-qb-nav-left">
                        <div className="cr-qb-logo">
                            <span className="cr-qb-logo-dot" />
                            Code<b>Room</b>
                        </div>
                        <div className="cr-qb-links">
                            <button onClick={() => navigate('/dashboard')} className="cr-qb-navlink">
                                Dashboard
                            </button>
                            <button className="cr-qb-navlink active">Question Bank</button>
                        </div>
                    </div>
                    <div className="cr-qb-nav-right">
                        <div className="cr-qb-user">
                            <p className="cr-qb-user-name">{user?.email}</p>
                            <p className="cr-qb-user-role">{user?.role}</p>
                        </div>
                        <button onClick={logout} className="cr-qb-signout">
                            Sign out
                        </button>
                    </div>
                </div>
            </nav>

            <div className="cr-qb-main">

                {/* Header */}
                <div className="cr-qb-head">
                    <div>
                        <h2 className="cr-qb-title">Question Bank</h2>
                        <p className="cr-qb-sub">
                            {isLoading
                                ? 'Loading questions...'
                                : `${filtered.length} question${filtered.length !== 1 ? 's' : ''} available`}
                        </p>
                    </div>
                    {isInterviewer() && (
                        <button onClick={() => navigate('/questions/create')} className="cr-qb-create">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" d="M12 5v14M5 12h14" />
                            </svg>
                            Create Question
                        </button>
                    )}
                </div>

                {/* Filters */}
                <div className="cr-qb-filters">
                    {/* Search */}
                    <div className="cr-qb-search">
                        <span className="ico">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="11" cy="11" r="7" />
                                <path strokeLinecap="round" d="m21 21-4.3-4.3" />
                            </svg>
                        </span>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by title or tag..."
                        />
                    </div>

                    {/* Difficulty filter with counts */}
                    <div className="cr-qb-diffs">
                        {DIFFICULTIES.map(d => (
                            <button
                                key={d}
                                onClick={() => setDifficulty(d)}
                                className={`cr-qb-diff ${d.toLowerCase()}${difficulty === d ? ' active' : ''}`}
                            >
                                {d}
                                <span className="cr-qb-diff-count">{counts[d]}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Question list */}
                {isLoading ? (
                    <QuestionCardSkeletonList count={5} />
                ) : filtered.length === 0 ? (
                    hasActiveFilters ? (
                        <EmptyState
                            icon={
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8b949e" strokeWidth="1.5">
                                    <circle cx="11" cy="11" r="7" />
                                    <path strokeLinecap="round" d="m21 21-4.3-4.3" />
                                </svg>
                            }
                            title="No matches found"
                            subtitle="Try adjusting your search or difficulty filter"
                            actionLabel="Clear filters"
                            onAction={clearFilters}
                        />
                    ) : (
                        <EmptyState
                            icon={
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8b949e" strokeWidth="1.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                            }
                            title="No questions yet"
                            subtitle={
                                isInterviewer()
                                    ? "Build your question bank with coding problems, complete with test cases and diagrams"
                                    : "Check back later for available questions"
                            }
                            actionLabel={isInterviewer() ? "+ Create Question" : undefined}
                            onAction={isInterviewer() ? () => navigate('/questions/create') : undefined}
                        />
                    )
                ) : (
                    <div className="cr-qb-list">
                        {filtered.map((q) => (
                            <div key={q.id} className="cr-qb-card">
                                <div className="cr-qb-card-row">
                                    <div className="cr-qb-card-main">
                                        <div className="cr-qb-card-titlerow">
                                            <h3 className="cr-qb-card-title">{q.title}</h3>
                                            <DifficultyBadge difficulty={q.difficulty} />
                                        </div>

                                        <p className="cr-qb-desc">{q.description}</p>

                                        <div className="cr-qb-meta">
                                            {q.tags && (
                                                <div className="cr-qb-tags">
                                                    {q.tags.split(',').map(tag => (
                                                        <span key={tag} className="cr-qb-tag">
                                                            {tag.trim()}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                            {q.testCases?.length > 0 && (
                                                <span className="cr-qb-tc">
                                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    {q.testCases.length} test case{q.testCases.length !== 1 ? 's' : ''}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {isInterviewer() && (
                                        <button onClick={() => handleDelete(q.id)} className="cr-qb-delete">
                                            Delete
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default QuestionBank;