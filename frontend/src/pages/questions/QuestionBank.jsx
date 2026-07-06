import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore.js';
import { questionAPI } from '../../services/api.js';
import { QuestionCardSkeletonList } from '../../components/shared/Skeleton.jsx';
import EmptyState from '../../components/shared/EmptyState.jsx';

const DIFFICULTIES = ['ALL', 'EASY', 'MEDIUM', 'HARD'];

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

    const DifficultyBadge = ({ difficulty }) => {
        const styles = {
            EASY:   'text-[#3fb950] bg-[#1a2f1a]',
            MEDIUM: 'text-[#d29922] bg-[#2d1f00]',
            HARD:   'text-[#f85149] bg-[#2d1318]',
        };
        return (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[difficulty]}`}>
                {difficulty}
            </span>
        );
    };

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
        <div className="min-h-screen bg-[#0d1117] text-white">

            {/* Navbar */}
            <nav className="bg-[#161b22] border-b border-[#30363d] px-6 py-4 sticky top-0 z-10 backdrop-blur-sm bg-opacity-95">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <h1 className="text-xl font-bold">
                            Code<span className="text-[#238636]">Room</span>
                        </h1>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="text-sm text-[#8b949e] hover:text-white transition-colors"
                            >
                                Dashboard
                            </button>
                            <button className="text-sm text-white font-medium border-b border-[#238636]">
                                Question Bank
                            </button>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                            <p className="text-sm text-white font-medium">{user?.email}</p>
                            <p className="text-xs text-[#8b949e]">{user?.role}</p>
                        </div>
                        <button
                            onClick={logout}
                            className="text-sm text-[#8b949e] hover:text-white border border-[#30363d] hover:border-[#484f58] px-3 py-1.5 rounded-lg transition-colors"
                        >
                            Sign out
                        </button>
                    </div>
                </div>
            </nav>

            <div className="max-w-6xl mx-auto px-6 py-8">

                {/* Header */}
                <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                    <div>
                        <h2 className="text-2xl font-bold">Question Bank</h2>
                        <p className="text-[#8b949e] text-sm mt-1">
                            {isLoading
                                ? 'Loading questions...'
                                : `${filtered.length} question${filtered.length !== 1 ? 's' : ''} available`}
                        </p>
                    </div>
                    {isInterviewer() && (
                        <button
                            onClick={() => navigate('/questions/create')}
                            className="bg-[#238636] hover:bg-[#2ea043] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5"
                        >
                            <span className="text-base leading-none">+</span> Create Question
                        </button>
                    )}
                </div>

                {/* Filters */}
                <div className="flex items-center gap-3 mb-6 flex-wrap">
                    {/* Search */}
                    <div className="flex-1 min-w-48 relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#484f58]">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="11" cy="11" r="7" />
                                <path strokeLinecap="round" d="m21 21-4.3-4.3" />
                            </svg>
                        </span>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by title or tag..."
                            className="w-full bg-[#161b22] border border-[#30363d] rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder-[#484f58] focus:outline-none focus:border-[#238636] transition-colors"
                        />
                    </div>

                    {/* Difficulty filter with counts */}
                    <div className="flex items-center gap-2">
                        {DIFFICULTIES.map(d => (
                            <button
                                key={d}
                                onClick={() => setDifficulty(d)}
                                className={`text-xs px-3 py-2 rounded-lg transition-colors font-medium flex items-center gap-1.5 ${
                                    difficulty === d
                                        ? d === 'EASY'   ? 'bg-[#1a2f1a] text-[#3fb950] border border-[#238636]'
                                        : d === 'MEDIUM' ? 'bg-[#2d1f00] text-[#d29922] border border-[#d29922]'
                                        : d === 'HARD'   ? 'bg-[#2d1318] text-[#f85149] border border-[#da3633]'
                                        : 'bg-[#21262d] text-white border border-[#484f58]'
                                        : 'bg-[#161b22] text-[#8b949e] border border-[#30363d] hover:border-[#484f58]'
                                }`}
                            >
                                {d}
                                <span className="opacity-60">{counts[d]}</span>
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
                    <div className="space-y-3">
                        {filtered.map((q) => (
                            <div
                                key={q.id}
                                className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 hover:border-[#484f58] hover:shadow-lg hover:shadow-black/20 transition-all"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2">
                                            <h3 className="text-white font-semibold text-sm">
                                                {q.title}
                                            </h3>
                                            <DifficultyBadge difficulty={q.difficulty} />
                                        </div>

                                        <p className="text-[#8b949e] text-xs leading-relaxed line-clamp-2 mb-2">
                                            {q.description}
                                        </p>

                                        <div className="flex items-center gap-3 flex-wrap">
                                            {q.tags && (
                                                <div className="flex items-center gap-1 flex-wrap">
                                                    {q.tags.split(',').map(tag => (
                                                        <span
                                                            key={tag}
                                                            className="text-xs bg-[#21262d] text-[#58a6ff] px-2 py-0.5 rounded-full"
                                                        >
                                                            {tag.trim()}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                            {q.testCases?.length > 0 && (
                                                <span className="text-xs text-[#484f58] flex items-center gap-1">
                                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    {q.testCases.length} test case{q.testCases.length !== 1 ? 's' : ''}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {isInterviewer() && (
                                        <div className="flex items-center gap-2 shrink-0">
                                            <button
                                                onClick={() => handleDelete(q.id)}
                                                className="text-xs text-[#8b949e] hover:text-[#f85149] border border-[#30363d] hover:border-[#da3633] px-3 py-1.5 rounded-lg transition-colors"
                                            >
                                                Delete
                                            </button>
                                        </div>
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