import React, { useState } from 'react';
import api from '../api';
import { Search, CheckCircle2, XCircle, Loader2, ClipboardList } from 'lucide-react';

const NumberValidator = () => {
    const [numbers, setNumbers] = useState('');
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleValidate = async () => {
        if (!numbers.trim()) return;
        
        // Split by newline, comma, or space and filter out empty strings
        const numberList = numbers.split(/[\n, ]+/)
            .map(n => n.trim())
            .filter(n => n.length >= 10);

        if (numberList.length === 0) {
            alert('Please enter at least one valid phone number (min 10 digits).');
            return;
        }

        setLoading(true);
        try {
            const res = await api.post('/whatsapp/validate', { numbers: numberList });
            setResults(res.data.results);
        } catch (error) {
            alert(error.response?.data?.error || 'Validation failed. Ensure WhatsApp is connected.');
        } finally {
            setLoading(false);
        }
    };

    const handleClear = () => {
        setNumbers('');
        setResults(null);
    };

    const stats = results ? {
        total: Object.keys(results).length,
        onWA: Object.values(results).filter(v => v).length,
        offWA: Object.values(results).filter(v => !v).length
    } : null;

    return (
        <div className="bg-dark-card p-6 rounded-2xl border border-dark-border mb-8">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-primary/20 rounded-xl text-primary">
                        <Search className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold">Number Validator (Filter)</h2>
                        <p className="text-dark-muted text-sm">Check if phone numbers exist on WhatsApp</p>
                    </div>
                </div>
                {results && (
                    <button 
                        onClick={handleClear}
                        className="text-xs text-dark-muted hover:text-white transition-colors flex items-center gap-1"
                    >
                        <XCircle className="w-3 h-3" /> Clear Results
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-dark-muted mb-2">Enter Numbers (Line, comma, or space separated)</label>
                    <textarea
                        rows="6"
                        value={numbers}
                        onChange={(e) => setNumbers(e.target.value)}
                        className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary resize-none"
                        placeholder="919876543210, 918888877777&#10;910000000000"
                    />
                    <div className="flex gap-2 mt-4">
                        <button
                            onClick={handleValidate}
                            disabled={loading}
                            className="flex-1 bg-primary hover:bg-primary-hover text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                            {loading ? 'Validating...' : 'Filter Numbers'}
                        </button>
                        <button
                            onClick={handleClear}
                            className="bg-dark-bg border border-dark-border hover:bg-dark-card text-white font-bold px-4 rounded-xl transition-all"
                            title="Clear All"
                        >
                            <XCircle className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="bg-dark-bg rounded-xl p-4 border border-dark-border max-h-[300px] overflow-y-auto">
                    {!results && !loading && (
                        <div className="h-full flex flex-col items-center justify-center text-dark-muted opacity-50">
                            <ClipboardList className="w-12 h-12 mb-2" />
                            <p>Results will appear here</p>
                        </div>
                    )}

                    {loading && (
                        <div className="h-full flex flex-col items-center justify-center text-primary">
                            <Loader2 className="w-12 h-12 animate-spin mb-2" />
                            <p>Checking WhatsApp Database...</p>
                        </div>
                    )}

                            {results && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between sticky top-0 bg-dark-bg py-2 border-b border-dark-border z-10">
                                        <div className="flex gap-2">
                                            <div className="text-center p-2 px-3 rounded-lg bg-dark-card border border-dark-border">
                                                <p className="text-[10px] text-dark-muted uppercase font-bold">Total</p>
                                                <p className="font-bold">{stats.total}</p>
                                            </div>
                                            <div className="text-center p-2 px-3 rounded-lg bg-success/10 border border-success/20">
                                                <p className="text-[10px] text-success uppercase font-bold">On WA</p>
                                                <p className="font-bold text-success">{stats.onWA}</p>
                                            </div>
                                        </div>
                                        {stats.onWA > 0 && (
                                            <button 
                                                onClick={() => {
                                                    const onWA = Object.entries(results)
                                                        .filter(([_, exists]) => exists)
                                                        .map(([num]) => num)
                                                        .join('\n');
                                                    navigator.clipboard.writeText(onWA);
                                                    alert('Copied all WhatsApp numbers to clipboard!');
                                                }}
                                                className="bg-success/20 hover:bg-success/30 text-success text-[10px] font-bold px-3 py-2 rounded-lg transition-all flex items-center gap-1 border border-success/30"
                                            >
                                                <ClipboardList className="w-3 h-3" /> COPY ALL ON WA
                                            </button>
                                        )}
                                    </div>
                                    
                                    <div className="mt-4 space-y-2">
                                        {Object.entries(results).map(([num, exists]) => (
                                            <div key={num} className="flex items-center justify-between p-3 bg-dark-card/50 hover:bg-dark-card rounded-lg border border-dark-border transition-colors group">
                                                <span className="font-medium group-hover:text-primary transition-colors">{num}</span>
                                                {exists ? (
                                                    <div className="flex items-center gap-1 text-success text-xs font-bold">
                                                        <CheckCircle2 className="w-4 h-4" /> ON WHATSAPP
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1 text-danger text-xs font-bold">
                                                        <XCircle className="w-4 h-4" /> NOT FOUND
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                </div>
            </div>
        </div>
    );
};

export default NumberValidator;
