import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore.js';
import { ROLES } from '../../utils/constants.js';
import AuthLayout from './AuthLayout.jsx';
import SocialAuthButtons from './SocialAuthButtons.jsx';

const toastStyle = (accent) => ({
    background: '#161b22',
    color: '#e6edf3',
    border: `1px solid ${accent}`,
});

// index 0 = none, 1 = weak … 4 = strong
const STRENGTH = [
    { color: 'var(--cr-border)', text: '' },
    { color: '#f85149', text: 'Weak' },
    { color: '#d29922', text: 'Fair' },
    { color: '#3fb950', text: 'Good' },
    { color: '#238636', text: 'Strong' },
];

const UserIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
    </svg>
);
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
const InterviewerIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
);
const CandidateIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="8.5" cy="7" r="4" />
        <polyline points="17 11 19 13 23 9" />
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

const Register = () => {
    const navigate = useNavigate();
    const { register, isLoading, error, clearError } = useAuthStore();

    const [form, setForm] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: ROLES.INTERVIEWER,
    });
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState(0);

    const calculatePasswordStrength = (password) => {
        let strength = 0;
        if (password.length >= 8) strength++;
        if (password.match(/[A-Z]/)) strength++;
        if (password.match(/[0-9]/)) strength++;
        if (password.match(/[^A-Za-z0-9]/)) strength++;
        setPasswordStrength(strength);
    };

    const handleChange = (e) => {
        clearError();
        const newForm = { ...form, [e.target.name]: e.target.value };
        setForm(newForm);
        if (e.target.name === 'password') calculatePasswordStrength(e.target.value);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (form.password !== form.confirmPassword) {
            toast.error('Passwords do not match', { style: toastStyle('#f85149') });
            return;
        }
        if (form.password.length < 6) {
            toast.error('Password must be at least 6 characters', { style: toastStyle('#f85149') });
            return;
        }
        if (!agreedToTerms) {
            toast.error('Please agree to the Terms of Service and Privacy Policy', { style: toastStyle('#f85149') });
            return;
        }

        const result = await register(form.name, form.email, form.password, form.role);
        if (result.success) {
            toast.success('Account created successfully!', { icon: '🎉', style: toastStyle('#238636') });
            navigate('/dashboard');
        } else {
            toast.error(result.error, { style: toastStyle('#f85149') });
        }
    };

    const strengthMeta = STRENGTH[passwordStrength];

    return (
        <AuthLayout>
            <div className="cr-auth-form-wrap">
                {/* Brand — mobile only */}
                <div className="cr-auth-mobrand">
                    <span className="badge"><CodeMark /></span>
                    <h1>Code<b>Room</b></h1>
                    <p>Technical interview platform</p>
                </div>

                <div className="cr-auth-eyebrow">◆ Create your account</div>

                <div className="cr-auth-card">
                    <div className="cr-auth-head">
                        <h2 className="cr-auth-h2">
                            Start interviewing on <span className="cr-auth-accent">CodeRoom</span>
                        </h2>
                        <p className="cr-auth-sub">Set up your account in under a minute.</p>
                    </div>

                    <SocialAuthButtons />

                    <div className="cr-auth-divider">
                        <span className="line" />
                        <span>or register with email</span>
                        <span className="line" />
                    </div>

                    <form onSubmit={handleSubmit}>
                        {/* Name */}
                        <div className="cr-auth-field">
                            <label className="cr-auth-label">Full name</label>
                            <div className="cr-auth-input-wrap">
                                <span className="cr-auth-ico"><UserIcon /></span>
                                <input
                                    className="cr-auth-input"
                                    type="text"
                                    name="name"
                                    value={form.name}
                                    onChange={handleChange}
                                    required
                                    autoComplete="name"
                                    placeholder="Anubhav Kumar"
                                />
                            </div>
                        </div>

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

                        {/* Role */}
                        <div className="cr-auth-field">
                            <label className="cr-auth-label">I want to join as</label>
                            <div className="cr-auth-roles">
                                <button
                                    type="button"
                                    className={`cr-auth-role${form.role === ROLES.INTERVIEWER ? ' active' : ''}`}
                                    onClick={() => setForm({ ...form, role: ROLES.INTERVIEWER })}
                                >
                                    <InterviewerIcon /> Interviewer
                                </button>
                                <button
                                    type="button"
                                    className={`cr-auth-role${form.role === ROLES.CANDIDATE ? ' active' : ''}`}
                                    onClick={() => setForm({ ...form, role: ROLES.CANDIDATE })}
                                >
                                    <CandidateIcon /> Candidate
                                </button>
                            </div>
                        </div>

                        {/* Password */}
                        <div className="cr-auth-field">
                            <label className="cr-auth-label">Password</label>
                            <div className="cr-auth-input-wrap">
                                <span className="cr-auth-ico"><LockIcon /></span>
                                <input
                                    className="cr-auth-input pw"
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    value={form.password}
                                    onChange={handleChange}
                                    required
                                    autoComplete="new-password"
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
                            {form.password && (
                                <div className="cr-auth-strength">
                                    <div className="cr-auth-strength-bars">
                                        {[1, 2, 3, 4].map((level) => (
                                            <span
                                                key={level}
                                                className="cr-auth-strength-bar"
                                                style={{ background: level <= passwordStrength ? strengthMeta.color : undefined }}
                                            />
                                        ))}
                                    </div>
                                    <p className={`cr-auth-strength-txt${passwordStrength === 0 ? ' hint' : ''}`}>
                                        {strengthMeta.text || 'Use 8+ characters with a mix of letters, numbers & symbols'}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Confirm password */}
                        <div className="cr-auth-field">
                            <label className="cr-auth-label">Confirm password</label>
                            <div className="cr-auth-input-wrap">
                                <span className="cr-auth-ico"><LockIcon /></span>
                                <input
                                    className="cr-auth-input pw"
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    name="confirmPassword"
                                    value={form.confirmPassword}
                                    onChange={handleChange}
                                    required
                                    autoComplete="new-password"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    className="cr-auth-eye"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                                </button>
                            </div>
                            {form.confirmPassword && form.password !== form.confirmPassword && (
                                <p className="cr-auth-mismatch">Passwords do not match</p>
                            )}
                        </div>

                        {/* Terms */}
                        <div className="cr-auth-field">
                            <label className="cr-auth-terms">
                                <input
                                    type="checkbox"
                                    checked={agreedToTerms}
                                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                                />
                                <span>
                                    I agree to CodeRoom's{' '}
                                    <Link to="/terms">Terms of Service</Link> and{' '}
                                    <Link to="/privacy">Privacy Policy</Link>.
                                </span>
                            </label>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="cr-auth-field cr-auth-error">
                                <AlertIcon />
                                <p>{error}</p>
                            </div>
                        )}

                        {/* Submit */}
                        <button type="submit" className="cr-auth-btn" disabled={isLoading || !agreedToTerms}>
                            {isLoading ? (
                                <span className="cr-auth-btn-load"><Spinner /> Creating account…</span>
                            ) : (
                                <>Create account <ArrowIcon /></>
                            )}
                        </button>
                    </form>
                </div>

                <p className="cr-auth-foot">
                    Already have an account? <Link to="/login">Sign in</Link>
                </p>
            </div>
        </AuthLayout>
    );
};

export default Register;