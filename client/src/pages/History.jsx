import React, { useState, useEffect } from 'react';
import api from '../api';
import { Download, FileText, Calendar } from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const History = () => {
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await api.get('/campaigns');
                setCampaigns(res.data.campaigns);
            } catch (error) {
                console.error("Error fetching history:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, []);

    const exportPDF = (camp) => {
        const doc = new jsPDF();
        
        // Header
        doc.setFontSize(22);
        doc.setTextColor(59, 130, 246); // Primary blue
        doc.text("WAPlus Campaign Report", 14, 22);
        
        doc.setFontSize(12);
        doc.setTextColor(100, 100, 100);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);

        // Campaign Details
        doc.setFontSize(16);
        doc.setTextColor(40, 40, 40);
        doc.text("Campaign Summary", 14, 45);

        const total = camp.contacts ? camp.contacts.length : 0;
        
        doc.autoTable({
            startY: 50,
            theme: 'grid',
            headStyles: { fillColor: [59, 130, 246] },
            head: [['Metric', 'Value']],
            body: [
                ['Campaign Name', camp.name],
                ['Date', new Date(camp.createdAt).toLocaleString()],
                ['Status', camp.status.toUpperCase()],
                ['Mode', camp.simulationMode ? 'Simulation' : 'Real WhatsApp API'],
                ['Total Contacts', total],
                ['Successfully Sent', camp.sent],
                ['Failed Messages', camp.failed]
            ],
        });

        // Errors (if any)
        if (camp.errors && camp.errors.length > 0) {
            doc.text("Failed Deliveries", 14, doc.lastAutoTable.finalY + 15);
            const errorBody = camp.errors.map(err => [err.name || 'Unknown', err.number, err.error]);
            
            doc.autoTable({
                startY: doc.lastAutoTable.finalY + 20,
                theme: 'striped',
                headStyles: { fillColor: [239, 68, 68] }, // Danger red
                head: [['Name', 'Phone Number', 'Error Reason']],
                body: errorBody,
            });
        }

        // Save
        doc.save(`${camp.name.replace(/\s+/g, '_')}_Report.pdf`);
    };

    if (loading) return <div className="text-dark-muted">Loading history...</div>;

    return (
        <div>
            <h1 className="text-3xl font-bold mb-8">Campaign History</h1>

            <div className="bg-dark-card rounded-2xl border border-dark-border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-dark-bg border-b border-dark-border">
                                <th className="p-4 font-medium text-dark-muted">Campaign Name</th>
                                <th className="p-4 font-medium text-dark-muted">Date</th>
                                <th className="p-4 font-medium text-dark-muted">Status</th>
                                <th className="p-4 font-medium text-dark-muted text-center">Total</th>
                                <th className="p-4 font-medium text-dark-muted text-center">Sent</th>
                                <th className="p-4 font-medium text-dark-muted text-center">Failed</th>
                                <th className="p-4 font-medium text-dark-muted text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {campaigns.map((camp) => (
                                <tr key={camp.id} className="border-b border-dark-border hover:bg-dark-bg/50 transition-colors">
                                    <td className="p-4">
                                        <div className="font-medium flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-primary" />
                                            {camp.name}
                                        </div>
                                        {camp.simulationMode && (
                                            <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full mt-1 inline-block">Simulated</span>
                                        )}
                                    </td>
                                    <td className="p-4 text-sm text-dark-muted flex items-center gap-2">
                                        <Calendar className="w-4 h-4" />
                                        {new Date(camp.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="p-4">
                                        <span className={`text-xs px-2 py-1 rounded-full capitalize ${
                                            camp.status === 'completed' ? 'bg-success/20 text-success' :
                                            camp.status === 'stopped' ? 'bg-danger/20 text-danger' :
                                            'bg-primary/20 text-primary'
                                        }`}>
                                            {camp.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-center font-medium">{camp.contacts ? camp.contacts.length : 0}</td>
                                    <td className="p-4 text-center text-success font-medium">{camp.sent}</td>
                                    <td className="p-4 text-center text-danger font-medium">{camp.failed}</td>
                                    <td className="p-4 text-right">
                                        <button 
                                            onClick={() => exportPDF(camp)}
                                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-dark-bg border border-dark-border hover:bg-dark-border hover:text-primary rounded-lg transition-colors text-sm"
                                        >
                                            <Download className="w-4 h-4" /> Export Report
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {campaigns.length === 0 && (
                                <tr>
                                    <td colSpan="7" className="p-8 text-center text-dark-muted">
                                        No campaigns found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default History;
