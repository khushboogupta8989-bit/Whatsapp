import React, { useState } from 'react';
import api from '../api';
import { Megaphone } from 'lucide-react';

const Login = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const endpoint = isRegistering ? '/auth/register' : '/auth/login';
            const res = await api.post(endpoint, { username, password });
            
            if (isRegistering) {
                // If registered successfully, switch to login
                setIsRegistering(false);
                setError('Registration successful. Please login.');
            } else {
                localStorage.setItem('waplus_token', res.data.token);
                onLogin();
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-dark-card rounded-2xl shadow-2xl p-8 border border-dark-border">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-4">
                        <Megaphone className="w-8 h-8 text-primary" />
                    </div>
                    <h2 className="text-3xl font-bold text-dark-text">WAPlus</h2>
                    <p className="text-dark-muted mt-2 text-center">
                        {isRegistering ? 'Create a new account to get started.' : 'Sign in to your automation dashboard.'}
                    </p>
                </div>

                {error && (
                    <div className={`p-4 rounded-lg mb-6 text-sm ${error.includes('successful') ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}`}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-dark-muted mb-1">Username</label>
                        <input
                            type="text"
                            required
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-3 text-dark-text focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                            placeholder="Enter your username"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-dark-muted mb-1">Password</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-3 text-dark-text focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                            placeholder="Enter your password"
                        />
                    </div>
                    
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary hover:bg-primary-hover text-white font-medium py-3 rounded-lg transition-colors flex justify-center items-center"
                    >
                        {loading ? 'Processing...' : (isRegistering ? 'Register' : 'Sign In')}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button 
                        onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
                        className="text-primary hover:underline text-sm"
                    >
                        {isRegistering ? 'Already have an account? Sign in' : 'Need an account? Register'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Login;
