import React, { useEffect, useState } from 'react';
import api from '../api';
import { Send, XCircle, Users, Activity } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const Dashboard = () => {
    const [stats, setStats] = useState({ totalSent: 0, totalFailed: 0, totalMessages: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await api.get('/campaigns/stats');
                setStats(res.data);
            } catch (error) {
                console.error("Error fetching stats:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) return <div className="text-dark-muted">Loading dashboard...</div>;

    const hasData = stats.totalMessages > 0;
    const pieData = hasData ? [
        { name: 'Success', value: stats.totalSent },
        { name: 'Failed', value: stats.totalFailed }
    ] : [{ name: 'No Data', value: 1 }];
    
    const COLORS = hasData ? ['#10B981', '#EF4444'] : ['#334155'];

    const completionRate = stats.totalMessages > 0 
        ? Math.round(((stats.totalSent + stats.totalFailed) / stats.totalMessages) * 100) 
        : 0;

    return (
        <div className="animate-in fade-in duration-500">
            <h1 className="text-3xl font-bold mb-8">Dashboard Overview</h1>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-dark-card p-6 rounded-2xl border border-dark-border flex items-center justify-between">
                    <div>
                        <p className="text-dark-muted text-sm font-medium mb-1">Total Processed</p>
                        <h3 className="text-3xl font-bold">{stats.totalSent + stats.totalFailed}</h3>
                    </div>
                    <div className="bg-primary/20 p-3 rounded-xl text-primary">
                        <Activity className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-dark-card p-6 rounded-2xl border border-dark-border flex items-center justify-between">
                    <div>
                        <p className="text-dark-muted text-sm font-medium mb-1">Success Count</p>
                        <h3 className="text-3xl font-bold text-success">{stats.totalSent}</h3>
                    </div>
                    <div className="bg-success/20 p-3 rounded-xl text-success">
                        <Send className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-dark-card p-6 rounded-2xl border border-dark-border flex items-center justify-between">
                    <div>
                        <p className="text-dark-muted text-sm font-medium mb-1">Failed Count</p>
                        <h3 className="text-3xl font-bold text-danger">{stats.totalFailed}</h3>
                    </div>
                    <div className="bg-danger/20 p-3 rounded-xl text-danger">
                        <XCircle className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-dark-card p-6 rounded-2xl border border-dark-border flex items-center justify-between">
                    <div>
                        <p className="text-dark-muted text-sm font-medium mb-1">Completion Rate</p>
                        <h3 className="text-3xl font-bold text-primary">{completionRate}%</h3>
                    </div>
                    <div className="bg-primary/20 p-3 rounded-xl text-primary">
                        <Users className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-dark-card p-6 rounded-2xl border border-dark-border">
                    <h2 className="text-xl font-bold mb-6">Success vs Failed</h2>
                    <div className="h-64">
                        {hasData ? (
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
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-dark-muted">
                                <Activity className="w-12 h-12 mb-2 opacity-20" />
                                <p>No campaign data yet</p>
                            </div>
                        )}
                    </div>
                    {hasData && (
                        <div className="flex justify-center gap-6 mt-4">
                            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-success"></div><span className="text-sm">Success</span></div>
                            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-danger"></div><span className="text-sm">Failed</span></div>
                        </div>
                    )}
                </div>

                <div className="bg-dark-card p-6 rounded-2xl border border-dark-border flex flex-col justify-center items-center text-center">
                    <Megaphone className="w-16 h-16 text-dark-border mb-4" />
                    <h2 className="text-xl font-bold mb-2">Ready to Automate?</h2>
                    <p className="text-dark-muted mb-6">Create a new campaign to start sending bulk messages automatically.</p>
                    <a href="/campaigns" className="bg-primary hover:bg-primary-hover px-6 py-2 rounded-lg font-medium transition-colors">
                        Create Campaign
                    </a>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
