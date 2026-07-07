import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore.js';
import AuthLayout from './AuthLayout.jsx';
import SocialAuthButtons from './SocialAuthButtons.jsx';

const toastStyle = (accent) => ({
    background: '#161b22',
    color: '#e6edf3',
    border: `1px solid ${accent}`,
});

const MailIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
    </svg>
);
const LockIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
);
const EyeIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
    </svg>
);
const EyeOffIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
        <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
);
const ArrowIcon = () => (
    <svg className="arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
);
const AlertIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
    </svg>
);
const Spinner = () => (
    <svg className="cr-auth-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25" />
        <path fill="currentColor" d="M4 12a8 8 0 018-8v8z" opacity="0.75" />
    </svg>
);
const CodeMark = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
    </svg>
);

const Login = () => {
    const navigate = useNavigate();
    const { login, isLoading, error, clearError } = useAuthStore();

    const [form, setForm] = useState({ email: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);

    const handleChange = (e) => {
        clearError();
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const result = await login(form.email, form.password);
        if (result.success) {
            toast.success('Welcome back!', { icon: '👋', style: toastStyle('#238636') });
            navigate('/dashboard');
        } else {
            toast.error(result.error, { style: toastStyle('#f85149') });
        }
    };

    return (
        <AuthLayout>
            <div className="cr-auth-form-wrap">
                {/* Brand — mobile only (left panel is hidden below lg) */}
                <div className="cr-auth-mobrand">
                    <span className="badge"><CodeMark /></span>
                    <h1>Code<b>Room</b></h1>
                    <p>Technical interview platform</p>
                </div>

                <div className="cr-auth-eyebrow">◆ Welcome back</div>

                <div className="cr-auth-card">
                    <div className="cr-auth-head">
                        <h2 className="cr-auth-h2">
                            Sign in to <span className="cr-auth-accent">CodeRoom</span>
                        </h2>
                        <p className="cr-auth-sub">Pick up right where you left off.</p>
                    </div>

                    <SocialAuthButtons />

                    <div className="cr-auth-divider">
                        <span className="line" />
                        <span>or continue with email</span>
                        <span className="line" />
                    </div>

                    <form onSubmit={handleSubmit}>
                        {/* Email */}
                        <div className="cr-auth-field">
                            <label className="cr-auth-label">Email address</label>
                            <div className="cr-auth-input-wrap">
                                <span className="cr-auth-ico"><MailIcon /></span>
                                <input
                                    className="cr-auth-input"
                                    type="email"
                                    name="email"
                                    value={form.email}
                                    onChange={handleChange}
                                    required
                                    autoComplete="email"
                                    placeholder="you@example.com"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="cr-auth-field">
                            <div className="cr-auth-label-row">
                                <label className="cr-auth-label">Password</label>
                                <Link to="/forgot-password" className="cr-auth-forgot">
                                    Forgot password?
                                </Link>
                            </div>
                            <div className="cr-auth-input-wrap">
                                <span className="cr-auth-ico"><LockIcon /></span>
                                <input
                                    className="cr-auth-input pw"
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    value={form.password}
                                    onChange={handleChange}
                                    required
                                    autoComplete="current-password"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    className="cr-auth-eye"
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                                </button>
                            </div>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="cr-auth-field cr-auth-error">
                                <AlertIcon />
                                <p>{error}</p>
                            </div>
                        )}

                        {/* Submit */}
                        <button type="submit" className="cr-auth-btn" disabled={isLoading}>
                            {isLoading ? (
                                <span className="cr-auth-btn-load"><Spinner /> Signing in…</span>
                            ) : (
                                <>Sign in <ArrowIcon /></>
                            )}
                        </button>
                    </form>
                </div>

                <p className="cr-auth-foot">
                    New to CodeRoom? <Link to="/register">Create an account</Link>
                </p>
            </div>
        </AuthLayout>
    );
};

export default Login;