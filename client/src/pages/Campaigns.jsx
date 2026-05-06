import React, { useState, useEffect } from 'react';
import api from '../api';
import { Play, Pause, Square, UploadCloud, RefreshCw } from 'lucide-react';

const Campaigns = () => {
    const [campaigns, setCampaigns] = useState([]);
    const [file, setFile] = useState(null);
    const [manualNumbers, setManualNumbers] = useState('');
    const [name, setName] = useState('');
    const [message, setMessage] = useState('Hi {{name}}, this is a message.');
    const [delayMin, setDelayMin] = useState(5);
    const [delayMax, setDelayMax] = useState(15);
    const [simulationMode, setSimulationMode] = useState(false);
    const [creating, setCreating] = useState(false);
    const [inputType, setInputType] = useState('file'); // 'file' or 'manual'

    const fetchCampaigns = async () => {
        try {
            const res = await api.get('/campaigns');
            // Show only running or paused on this screen
            const active = res.data.campaigns.filter(c => c.status === 'running' || c.status === 'paused');
            setCampaigns(active);
        } catch (error) {
            console.error("Error fetching campaigns:", error);
        }
    };

    useEffect(() => {
        fetchCampaigns();
        const interval = setInterval(fetchCampaigns, 3000);
        return () => clearInterval(interval);
    }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        setCreating(true);

        const formData = new FormData();
        formData.append('name', name);
        formData.append('message', message);
        formData.append('delayMin', delayMin);
        formData.append('delayMax', delayMax);
        formData.append('simulationMode', simulationMode);
        
        if (inputType === 'file') {
            if (file) {
                formData.append('file', file);
            } else {
                alert('Please upload an Excel file.');
                setCreating(false);
                return;
            }
        } else {
            if (manualNumbers.trim()) {
                formData.append('manualNumbers', manualNumbers);
            } else {
                alert('Please enter at least one phone number.');
                setCreating(false);
                return;
            }
        }

        try {
            await api.post('/campaign/start', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setName('');
            setFile(null);
            setManualNumbers('');
            fetchCampaigns();
        } catch (error) {
            alert(error.response?.data?.error || 'Error creating campaign');
        } finally {
            setCreating(false);
        }
    };

    const handleAction = async (id, action) => {
        try {
            await api.post(`/campaign/${id}/${action}`);
            fetchCampaigns();
        } catch (error) {
            console.error("Action error:", error);
        }
    };

    return (
        <div>
            <h1 className="text-3xl font-bold mb-8">Campaign Manager</h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Create Campaign Form */}
                <div className="bg-dark-card p-6 rounded-2xl border border-dark-border">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <UploadCloud className="text-primary" /> Create New Campaign
                    </h2>
                    
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-dark-muted mb-1">Campaign Name</label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-3 focus:outline-none focus:border-primary"
                                placeholder="e.g. Summer Promo"
                            />
                        </div>

                        <div className="flex bg-dark-bg p-1 rounded-xl border border-dark-border mb-4">
                            <button
                                type="button"
                                onClick={() => setInputType('file')}
                                className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all ${inputType === 'file' ? 'bg-primary text-white shadow-lg' : 'text-dark-muted hover:text-dark-text'}`}
                            >
                                Excel Upload
                            </button>
                            <button
                                type="button"
                                onClick={() => setInputType('manual')}
                                className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all ${inputType === 'manual' ? 'bg-primary text-white shadow-lg' : 'text-dark-muted hover:text-dark-text'}`}
                            >
                                Manual Entry
                            </button>
                        </div>

                        {inputType === 'file' ? (
                            <div>
                                <label className="block text-sm font-medium text-dark-muted mb-1">Upload Contacts (.xlsx)</label>
                                <input
                                    type="file"
                                    accept=".xlsx"
                                    onChange={(e) => setFile(e.target[0] || e.target.files[0])}
                                    className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-2 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/20 file:text-primary hover:file:bg-primary/30 transition-all"
                                />
                                <p className="text-[10px] text-dark-muted mt-2 uppercase font-bold tracking-wider">Required columns: "Name", "Phone"</p>
                            </div>
                        ) : (
                            <div>
                                <label className="block text-sm font-medium text-dark-muted mb-1">Enter Numbers (One per line or comma separated)</label>
                                <textarea
                                    rows="4"
                                    value={manualNumbers}
                                    onChange={(e) => setManualNumbers(e.target.value)}
                                    className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-3 focus:outline-none focus:border-primary resize-none"
                                    placeholder="918956716785&#10;919876543210"
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-dark-muted mb-1">Message Template</label>
                            <textarea
                                required
                                rows="3"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-3 focus:outline-none focus:border-primary"
                                placeholder="Hi {{name}}, ..."
                            />
                        </div>

                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-dark-muted mb-1">Min Delay (s)</label>
                                <input
                                    type="number"
                                    value={delayMin}
                                    onChange={(e) => setDelayMin(e.target.value)}
                                    className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-2 focus:outline-none focus:border-primary"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-dark-muted mb-1">Max Delay (s)</label>
                                <input
                                    type="number"
                                    value={delayMax}
                                    onChange={(e) => setDelayMax(e.target.value)}
                                    className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-2 focus:outline-none focus:border-primary"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-4 bg-dark-bg rounded-lg border border-dark-border mt-4">
                            <input
                                type="checkbox"
                                id="simulation"
                                checked={simulationMode}
                                onChange={(e) => setSimulationMode(e.target.checked)}
                                className="w-5 h-5 accent-primary"
                            />
                            <label htmlFor="simulation" className="text-sm font-medium flex flex-col">
                                Simulation Mode (Fast, No real messages sent)
                                <span className="text-xs text-dark-muted font-normal">Use this for demos or testing templates</span>
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={creating}
                            className="w-full bg-primary hover:bg-primary-hover text-white font-medium py-3 rounded-lg transition-colors mt-6"
                        >
                            {creating ? 'Starting...' : 'Start Campaign'}
                        </button>
                    </form>
                </div>

                {/* Active Campaigns */}
                <div>
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <RefreshCw className="text-primary" /> Active Campaigns
                    </h2>
                    
                    {campaigns.length === 0 ? (
                        <div className="bg-dark-card p-8 rounded-2xl border border-dark-border text-center">
                            <p className="text-dark-muted">No active campaigns running.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {campaigns.map(camp => {
                                const total = camp.contacts ? camp.contacts.length : 0;
                                const processed = camp.sent + camp.failed;
                                const progress = total > 0 ? Math.round((processed / total) * 100) : 0;

                                return (
                                    <div key={camp.id} className="bg-dark-card p-5 rounded-2xl border border-dark-border">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="font-bold text-lg">{camp.name}</h3>
                                                <span className={`text-xs px-2 py-1 rounded-full ${camp.simulationMode ? 'bg-primary/20 text-primary' : 'bg-success/20 text-success'}`}>
                                                    {camp.simulationMode ? 'Simulation' : 'Real Mode'}
                                                </span>
                                            </div>
                                            <div className="flex gap-2">
                                                {camp.status === 'running' ? (
                                                    <button onClick={() => handleAction(camp.id, 'pause')} className="p-2 bg-dark-bg rounded-lg hover:text-primary transition-colors" title="Pause">
                                                        <Pause className="w-4 h-4" />
                                                    </button>
                                                ) : (
                                                    <button onClick={() => handleAction(camp.id, 'resume')} className="p-2 bg-dark-bg rounded-lg hover:text-success transition-colors" title="Resume">
                                                        <Play className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button onClick={() => handleAction(camp.id, 'stop')} className="p-2 bg-dark-bg rounded-lg hover:text-danger transition-colors" title="Stop">
                                                    <Square className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="mb-2 flex justify-between text-sm">
                                            <span className="text-dark-muted">Progress ({progress}%)</span>
                                            <span>{processed} / {total}</span>
                                        </div>
                                        
                                        <div className="w-full bg-dark-bg rounded-full h-2.5 mb-4">
                                            <div className="bg-primary h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                                        </div>

                                        <div className="flex gap-4 text-sm">
                                            <div className="flex flex-col">
                                                <span className="text-dark-muted text-xs">Sent</span>
                                                <span className="font-medium text-success">{camp.sent}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-dark-muted text-xs">Failed</span>
                                                <span className="font-medium text-danger">{camp.failed}</span>
                                            </div>
                                            <div className="flex flex-col ml-auto text-right">
                                                <span className="text-dark-muted text-xs">Status</span>
                                                <span className="font-medium capitalize text-primary">{camp.status}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Campaigns;
