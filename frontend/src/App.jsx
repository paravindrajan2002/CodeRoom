import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Login from './pages/auth/Login.jsx';
import Register from './pages/auth/Register.jsx';
import Dashboard from './pages/dashboard/Dashboard.jsx';
import InterviewRoom from './pages/interview/InterviewRoom.jsx';
import QuestionBank from './pages/questions/QuestionBank.jsx';
import CreateQuestion from './pages/questions/CreateQuestion.jsx';
import ProtectedRoute from './components/shared/ProtectedRoute.jsx';
import ErrorBoundary from './components/shared/ErrorBoundary.jsx';
import useAuthStore from './store/authStore.js';
import Landing from './pages/Landing.jsx';
import MobileNotice from './MobileNotice.jsx';

function App() {
    const { isAuthenticated } = useAuthStore();

    return (
        <ErrorBoundary>
            <BrowserRouter>
                <Toaster
                    position="top-right"
                    toastOptions={{
                        duration: 3000,
                        style: {
                            background: '#1e1e1e',
                            color: '#fff',
                            border: '1px solid #333',
                        },
                    }}
                />
                <MobileNotice/>
                <Routes>
                    <Route
                        path="/"
                        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Landing />}
                    />
                    
                    <Route
                        path="/login"
                        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />}
                    />
                    <Route
                        path="/register"
                        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Register />}
                    />

                    <Route
                        path="/dashboard"
                        element={
                            <ProtectedRoute>
                                <ErrorBoundary>
                                    <Dashboard />
                                </ErrorBoundary>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/room/:roomId"
                        element={
                            <ProtectedRoute>
                                <ErrorBoundary>
                                    <InterviewRoom />
                                </ErrorBoundary>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/questions"
                        element={
                            <ProtectedRoute>
                                <ErrorBoundary>
                                    <QuestionBank />
                                </ErrorBoundary>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/questions/create"
                        element={
                            <ProtectedRoute>
                                <ErrorBoundary>
                                    <CreateQuestion />
                                </ErrorBoundary>
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/"
                        element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />}
                    />
                    <Route
                        path="*"
                        element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />}
                    />
                </Routes>
            </BrowserRouter>
        </ErrorBoundary>
    );
}

export default App;