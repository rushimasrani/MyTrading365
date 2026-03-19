import React from 'react';
import { LayoutDashboard, ShoppingCart, Briefcase, ListOrdered, Menu } from 'lucide-react';

export type MobileTab = 'watchlist' | 'orders' | 'positions' | 'trades' | 'menu';

interface MobileTabBarProps {
    activeTab: MobileTab;
    onTabChange: (tab: MobileTab) => void;
}

const MobileTabBar: React.FC<MobileTabBarProps> = ({ activeTab, onTabChange }) => {
    const tabs = [
        { id: 'watchlist', label: 'Watchlist', icon: <LayoutDashboard size={20} /> },
        { id: 'orders', label: 'Orders', icon: <ShoppingCart size={20} /> },
        { id: 'positions', label: 'Positions', icon: <Briefcase size={20} /> },
        { id: 'trades', label: 'Trades', icon: <ListOrdered size={20} /> },
        { id: 'menu', label: 'Menu', icon: <Menu size={20} /> },
    ] as const;

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#1c2630] border-t border-gray-600 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.3)] z-50 flex justify-around items-center h-[60px] safe-area-bottom">
            {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                    <button
                        key={tab.id}
                        onClick={() => onTabChange(tab.id as MobileTab)}
                        className={`flex flex-col items-center justify-center w-full h-full transition-colors ${isActive ? 'text-blue-400' : 'text-gray-400'
                            }`}
                    >
                        <div className={`mb-1 transition-transform ${isActive ? 'scale-110' : ''}`}>
                            {tab.icon}
                        </div>
                        <span className="text-[10px] font-medium leading-none">{tab.label}</span>
                    </button>
                );
            })}
        </div>
    );
};

export default MobileTabBar;
