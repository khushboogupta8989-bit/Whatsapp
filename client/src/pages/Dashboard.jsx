import React, { useEffect, useState } from 'react';
import api from '../api';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import WhatsAppStatus from '../components/WhatsAppStatus';
import NumberValidator from '../components/NumberValidator';

const Dashboard = () => {
    const [stats, setStats] = useState({ totalSent: 0, totalFailed: 0, totalMessages: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await api.get('/campaigns/stats');
                setStats(res.data || { totalSent: 0, totalFailed: 0, totalMessages: 0 });
            } catch (err) {
                console.error("Error fetching stats:", err);
                setStats({ totalSent: 0, totalFailed: 0, totalMessages: 0 });
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) return <div className="p-8 text-dark-muted">Loading platform data...</div>;

    const hasData = stats && stats.totalMessages > 0;
    const pieData = hasData ? [
        { name: 'Success', value: stats.totalSent || 0 },
        { name: 'Failed', value: stats.totalFailed || 0 }
    ] : [{ name: 'System', value: 1 }];
    
    const COLORS = hasData ? ['#10B981', '#EF4444'] : ['#334155'];
    const completionRate = stats.totalMessages > 0 
        ? Math.round(((stats.totalSent + stats.totalFailed) / stats.totalMessages) * 100) 
        : 0;

    return (
        <div className="space-y-8 pb-10">
            <div className="max-w-4xl">
                <WhatsAppStatus />
            </div>

            <div className="bg-dark-card p-6 rounded-2xl border border-dark-border">
                <h2 className="text-2xl font-bold mb-6">Live Automation Analytics</h2>
                
                {/* Stat Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-dark-bg p-5 rounded-xl border border-dark-border">
                        <p className="text-dark-muted text-xs uppercase font-bold mb-1 text-[10px]">Processed</p>
                        <h3 className="text-2xl font-bold">{stats.totalSent + stats.totalFailed}</h3>
                    </div>
                    <div className="bg-dark-bg p-5 rounded-xl border border-dark-border">
                        <p className="text-success text-xs uppercase font-bold mb-1 text-[10px]">Success</p>
                        <h3 className="text-2xl font-bold text-success">{stats.totalSent}</h3>
                    </div>
                    <div className="bg-dark-bg p-5 rounded-xl border border-dark-border">
                        <p className="text-danger text-xs uppercase font-bold mb-1 text-[10px]">Failed</p>
                        <h3 className="text-2xl font-bold text-danger">{stats.totalFailed}</h3>
                    </div>
                    <div className="bg-dark-bg p-5 rounded-xl border border-dark-border">
                        <p className="text-primary text-xs uppercase font-bold mb-1 text-[10px]">Efficiency</p>
                        <h3 className="text-2xl font-bold text-primary">{completionRate}%</h3>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1 h-64 bg-dark-bg rounded-xl border border-dark-border p-4">
                        <h4 className="text-sm font-bold text-dark-muted mb-4 text-center">Delivery Success Ratio</h4>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={70}
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
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="lg:col-span-2 bg-primary/5 rounded-xl border border-primary/10 p-8 flex flex-col justify-center text-center items-center">
                        <h3 className="text-2xl font-bold mb-3 text-primary">Start Bulk Campaign</h3>
                        <p className="text-dark-muted max-w-md mx-auto mb-6">
                            Upload your contacts and reach thousands of users instantly with our high-speed automation engine.
                        </p>
                        <a href="/campaigns" className="bg-primary hover:bg-primary-hover text-white px-10 py-4 rounded-xl font-bold text-lg transition-all shadow-lg shadow-primary/20">
                            Launch Now
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
