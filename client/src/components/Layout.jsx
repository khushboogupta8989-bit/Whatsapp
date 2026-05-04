import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, Megaphone, History, LogOut, Search } from 'lucide-react';

const Sidebar = ({ onLogout }) => {
    const navItems = [
        { path: '/dashboard', name: 'Dashboard', icon: LayoutDashboard },
        { path: '/campaigns', name: 'Campaigns', icon: Megaphone },
        { path: '/validator', name: 'Number Filter', icon: Search },
        { path: '/history', name: 'History', icon: History },
    ];

    return (
        <div className="w-64 bg-dark-card border-r border-dark-border h-full flex flex-col shadow-lg">
            <div className="p-6">
                <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
                    <Megaphone className="w-8 h-8 text-primary" />
                    WAPlus<span className="text-sm font-normal text-dark-muted align-top">+</span>
                </h1>
            </div>
            
            <nav className="flex-1 px-4 space-y-2 mt-4">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                                isActive 
                                    ? 'bg-primary/10 text-primary font-medium' 
                                    : 'text-dark-muted hover:bg-dark-border hover:text-dark-text'
                            }`
                        }
                    >
                        <item.icon className="w-5 h-5" />
                        {item.name}
                    </NavLink>
                ))}
            </nav>

            <div className="p-4 border-t border-dark-border">
                <button
                    onClick={onLogout}
                    className="flex items-center gap-3 px-4 py-3 w-full text-left text-dark-muted hover:bg-dark-border hover:text-danger rounded-lg transition-colors"
                >
                    <LogOut className="w-5 h-5" />
                    Logout
                </button>
            </div>
        </div>
    );
};

const Layout = ({ onLogout }) => {
    return (
        <div className="flex h-screen bg-dark-bg text-dark-text overflow-hidden">
            <Sidebar onLogout={onLogout} />
            <main className="flex-1 overflow-y-auto p-8">
                <div className="max-w-6xl mx-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default Layout;
