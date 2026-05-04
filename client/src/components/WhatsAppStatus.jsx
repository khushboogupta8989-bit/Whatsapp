import React, { useState, useEffect } from 'react';
import api from '../api';
import { Smartphone, CheckCircle, RefreshCcw, LogOut } from 'lucide-react';

const WhatsAppStatus = () => {
    const [status, setStatus] = useState('disconnected');
    const [qrCode, setQrCode] = useState(null);
    const [loading, setLoading] = useState(false);

    const fetchStatus = async () => {
        try {
            const res = await api.get('/whatsapp/status');
            setStatus(res.data.status);
            setQrCode(res.data.qrCode);
        } catch (error) {
            console.error("Error fetching WhatsApp status:", error);
        }
    };

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleInit = async () => {
        setLoading(true);
        try {
            await api.post('/whatsapp/init');
            fetchStatus();
        } catch (error) {
            alert('Failed to initialize session');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        if (!window.confirm('Are you sure you want to disconnect WhatsApp?')) return;
        setLoading(true);
        try {
            await api.post('/whatsapp/logout');
            setQrCode(null);
            fetchStatus();
        } catch (error) {
            alert('Failed to logout');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-dark-card p-6 rounded-2xl border border-dark-border mb-8">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl ${status === 'connected' ? 'bg-success/20 text-success' : 'bg-primary/20 text-primary'}`}>
                        <Smartphone className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold">WhatsApp Connection</h2>
                        <p className="text-dark-muted text-sm">
                            {status === 'connected' ? 'Connected and ready to send' : 'Link your device to start automation'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full animate-pulse ${status === 'connected' ? 'bg-success' : 'bg-primary'}`}></span>
                    <span className="text-sm font-medium capitalize">{status}</span>
                </div>
            </div>

            {status === 'disconnected' && (
                <button
                    onClick={handleInit}
                    disabled={loading}
                    className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-3 rounded-xl transition-all"
                >
                    {loading ? 'Initializing...' : 'Link New Device'}
                </button>
            )}

            {status === 'connecting' && qrCode && (
                <div className="flex flex-col items-center p-6 bg-white rounded-xl">
                    <img src={qrCode} alt="WhatsApp QR Code" className="w-64 h-64" />
                    <p className="text-black text-sm mt-4 text-center font-medium">
                        Open WhatsApp on your phone → Menu or Settings → Linked Devices → Link a Device
                    </p>
                </div>
            )}

            {status === 'connecting' && !qrCode && (
                <div className="flex flex-col items-center p-8">
                    <RefreshCcw className="w-12 h-12 text-primary animate-spin mb-4" />
                    <p className="text-dark-muted">Generating QR Code...</p>
                </div>
            )}

            {status === 'connected' && (
                <div className="flex flex-col items-center p-8 bg-success/5 rounded-xl border border-success/20">
                    <CheckCircle className="w-16 h-16 text-success mb-4" />
                    <h3 className="text-xl font-bold text-success mb-2">Device Linked Successfully</h3>
                    <p className="text-dark-muted text-center mb-6">Your WhatsApp account is active and connected to the automation engine.</p>
                    <button
                        onClick={handleLogout}
                        disabled={loading}
                        className="flex items-center gap-2 text-danger hover:bg-danger/10 px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                    >
                        <LogOut className="w-4 h-4" /> Disconnect Device
                    </button>
                </div>
            )}
        </div>
    );
};

export default WhatsAppStatus;
