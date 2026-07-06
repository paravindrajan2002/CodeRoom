import { Component } from 'react';

class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        console.error('ErrorBoundary caught:', error, info);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
        window.location.href = '/dashboard';
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-[#0d1117] flex items-center justify-center px-6">
                    <div className="text-center max-w-md">
                        <div className="w-16 h-16 bg-[#2d1318] rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f85149" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                            </svg>
                        </div>
                        <h1 className="text-white font-bold text-xl mb-2">Something went wrong</h1>
                        <p className="text-[#8b949e] text-sm mb-6">
                            An unexpected error occurred. Your work has been auto-saved where possible.
                        </p>
                        <button
                            onClick={this.handleReset}
                            className="bg-[#238636] hover:bg-[#2ea043] text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
                        >
                            Back to Dashboard
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

export default ErrorBoundary;