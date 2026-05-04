import React, { useEffect, useState } from 'react';
import api from '../api';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import WhatsAppStatus from '../components/WhatsAppStatus';

const Dashboard = () => {
    const [stats, setStats] = useState({ totalSent: 0, totalFailed: 0, totalMessages: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await api.get('/campaigns/stats');
                setStats(res.data || { totalSent: 0, totalFailed: 0, totalMessages: 0 });
            } catch (err) {
                console.error("Error fetching stats:", err);
                setError("Could not load stats. Please refresh.");
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    try {
        if (loading) return <div className="p-8 text-dark-muted">Loading dashboard data...</div>;
        if (error) return <div className="p-8 text-danger">{error}</div>;

        const hasData = stats && stats.totalMessages > 0;
        const pieData = hasData ? [
            { name: 'Success', value: stats.totalSent || 0 },
            { name: 'Failed', value: stats.totalFailed || 0 }
        ] : [{ name: 'Empty', value: 1 }];
        
        const COLORS = hasData ? ['#10B981', '#EF4444'] : ['#334155'];
        const completionRate = stats.totalMessages > 0 
            ? Math.round(((stats.totalSent + stats.totalFailed) / stats.totalMessages) * 100) 
            : 0;

        return (
            <div className="p-4 md:p-0">
                <WhatsAppStatus />
                <h1 className="text-3xl font-bold mb-8">WAPlus Dashboard</h1>

                {/* Stat Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-dark-card p-6 rounded-2xl border border-dark-border">
                        <p className="text-dark-muted text-sm mb-1">Total Processed</p>
                        <h3 className="text-3xl font-bold">{stats.totalSent + stats.totalFailed}</h3>
                    </div>

                    <div className="bg-dark-card p-6 rounded-2xl border border-dark-border">
                        <p className="text-dark-muted text-sm mb-1">Success Count</p>
                        <h3 className="text-3xl font-bold text-success">{stats.totalSent}</h3>
                    </div>

                    <div className="bg-dark-card p-6 rounded-2xl border border-dark-border">
                        <p className="text-dark-muted text-sm mb-1">Failed Count</p>
                        <h3 className="text-3xl font-bold text-danger">{stats.totalFailed}</h3>
                    </div>

                    <div className="bg-dark-card p-6 rounded-2xl border border-dark-border">
                        <p className="text-dark-muted text-sm mb-1">Completion Rate</p>
                        <h3 className="text-3xl font-bold text-primary">{completionRate}%</h3>
                    </div>
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-dark-card p-6 rounded-2xl border border-dark-border">
                        <h2 className="text-xl font-bold mb-6">Messaging Distribution</h2>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                        isAnimationActive={false}
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip 
                                        contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: '8px' }}
                                        itemStyle={{ color: '#F8FAFC' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-dark-card p-8 rounded-2xl border border-dark-border flex flex-col justify-center items-center text-center">
                        <h2 className="text-2xl font-bold mb-2">Create New Campaign</h2>
                        <p className="text-dark-muted mb-6">Ready to start sending? Upload your excel and launch a campaign.</p>
                        <a href="/campaigns" className="bg-primary hover:bg-primary-hover px-8 py-3 rounded-xl font-bold transition-all">
                            Get Started
                        </a>
                    </div>
                </div>
            </div>
        );
    } catch (e) {
        return <div className="p-8 text-danger">An unexpected error occurred.</div>;
    }
};

export default Dashboard;
