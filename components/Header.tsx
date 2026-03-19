import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { MarketIndex } from '../types';

interface HeaderProps {
  indices: MarketIndex[];
  onOpenOrderBook: () => void;
  onOpenTradeBook: () => void;
  onOpenNetPosition: () => void;
  onOpenRMSLimit: () => void;
  onOpenAddScrip: () => void;
  onSaveMarketWatch: () => void;
  onBuyOrder?: () => void;
  onSellOrder?: () => void;
  onChangePassword?: () => void;
  onLogout?: () => void;
  onRelogin?: () => void;
}

const Header: React.FC<HeaderProps> = ({
  indices,
  onOpenOrderBook,
  onOpenTradeBook,
  onOpenNetPosition,
  onOpenRMSLimit,
  onOpenAddScrip,
  onSaveMarketWatch,
  onBuyOrder,
  onSellOrder,
  onChangePassword,
  onLogout,
  onRelogin
}) => {
  // Track which menu is currently active: 'marketWatch', 'order', etc.
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const marketWatchRef = useRef<HTMLDivElement>(null);
  const orderRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      // Close Market Watch if clicked outside
      if (
        activeMenu === 'marketWatch' &&
        marketWatchRef.current &&
        !marketWatchRef.current.contains(target)
      ) {
        setActiveMenu(null);
      }
      // Close Order if clicked outside
      if (
        activeMenu === 'order' &&
        orderRef.current &&
        !orderRef.current.contains(target)
      ) {
        setActiveMenu(null);
      }
      // Close Options if clicked outside
      if (
        activeMenu === 'options' &&
        optionsRef.current &&
        !optionsRef.current.contains(target)
      ) {
        setActiveMenu(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [activeMenu]);

  const toggleMenu = (menuName: string) => {
    if (activeMenu === menuName) {
      setActiveMenu(null);
    } else {
      setActiveMenu(menuName);
    }
  };

  return (
    <div className="flex flex-col w-full relative z-50">
      {/* Top Menu Bar with Gradient */}
      <div className="flex justify-between items-center px-2 py-1 bg-gradient-to-b from-[#37475a] to-[#1c2630] text-white border-b border-gray-600 shadow-md h-9 select-none">
        <div className="hidden md:flex space-x-4 text-sm font-bold tracking-wide items-center h-full">

          {/* Market Watch Menu Trigger */}
          <div className="relative h-full flex items-center" ref={marketWatchRef}>
            <div
              className={`cursor-pointer px-1 hover:text-blue-300 ${activeMenu === 'marketWatch' ? 'text-blue-200' : ''}`}
              onClick={() => toggleMenu('marketWatch')}
            >
              Market Watch
            </div>

            {/* Market Watch Dropdown */}
            {activeMenu === 'marketWatch' && (
              <div className="absolute top-full left-0 mt-[2px] w-48 bg-white border border-gray-500 shadow-xl text-black text-[13px] font-normal flex flex-col py-1 z-50">
                <div className="cursor-pointer px-3 py-[2px] hover:bg-[#002060] hover:text-white whitespace-nowrap">
                  New Market Watch
                </div>
                <div className="cursor-pointer px-3 py-[2px] hover:bg-[#002060] hover:text-white whitespace-nowrap">
                  Delete Market Watch
                </div>
                <div className="cursor-pointer px-3 py-[2px] hover:bg-[#002060] hover:text-white whitespace-nowrap">
                  Mark as Default Watch
                </div>
                <div
                  className="cursor-pointer px-3 py-[2px] hover:bg-[#002060] hover:text-white whitespace-nowrap"
                  onClick={() => {
                    onSaveMarketWatch();
                    setActiveMenu(null);
                  }}
                >
                  Save Market Watch
                </div>

                <div className="h-[1px] bg-gray-300 my-1 mx-1"></div>

                <div
                  className="cursor-pointer px-3 py-[2px] hover:bg-[#002060] hover:text-white whitespace-nowrap"
                  onClick={() => {
                    onOpenAddScrip();
                    setActiveMenu(null);
                  }}
                >
                  Add Scrip
                </div>
                <div className="cursor-pointer px-3 py-[2px] hover:bg-[#002060] hover:text-white whitespace-nowrap">
                  Add Empty Row
                </div>
                <div className="cursor-pointer px-3 py-[2px] hover:bg-[#002060] hover:text-white whitespace-nowrap">
                  Delete Scrip
                </div>

                <div className="h-[1px] bg-gray-300 my-1 mx-1"></div>

                <div className="cursor-pointer px-3 py-[2px] hover:bg-[#002060] hover:text-white whitespace-nowrap">
                  Scrip Information
                </div>
                <div className="cursor-pointer px-3 py-[2px] hover:bg-[#002060] hover:text-white whitespace-nowrap">
                  Settings
                </div>
              </div>
            )}
          </div>

          {/* Order Menu Trigger */}
          <div className="relative h-full flex items-center" ref={orderRef}>
            <div
              className={`cursor-pointer px-1 hover:text-blue-300 ${activeMenu === 'order' ? 'text-blue-200' : ''}`}
              onClick={() => toggleMenu('order')}
            >
              Order
            </div>

            {/* Order Dropdown */}
            {activeMenu === 'order' && (
              <div className="absolute top-full left-0 mt-[2px] w-48 bg-white border border-gray-500 shadow-xl text-black text-[13px] font-normal flex flex-col py-1 z-50">
                <div
                  className="cursor-pointer px-3 py-[2px] hover:bg-[#002060] hover:text-white whitespace-nowrap"
                  onClick={() => {
                    onBuyOrder?.();
                    setActiveMenu(null);
                  }}
                >
                  Buy
                </div>
                <div
                  className="cursor-pointer px-3 py-[2px] hover:bg-[#002060] hover:text-white whitespace-nowrap"
                  onClick={() => {
                    onSellOrder?.();
                    setActiveMenu(null);
                  }}
                >
                  Sell
                </div>

                <div className="h-[1px] bg-gray-300 my-1 mx-1"></div>

                <div
                  className="cursor-pointer px-3 py-[2px] hover:bg-[#002060] hover:text-white whitespace-nowrap"
                  onClick={() => {
                    onOpenOrderBook();
                    setActiveMenu(null);
                  }}
                >
                  Order Book
                </div>
                <div
                  className="cursor-pointer px-3 py-[2px] hover:bg-[#002060] hover:text-white whitespace-nowrap"
                  onClick={() => {
                    onOpenTradeBook();
                    setActiveMenu(null);
                  }}
                >
                  Trade Book
                </div>
                <div
                  className="cursor-pointer px-3 py-[2px] hover:bg-[#002060] hover:text-white whitespace-nowrap"
                  onClick={() => {
                    onOpenNetPosition();
                    setActiveMenu(null);
                  }}
                >
                  Net Position
                </div>

                <div className="h-[1px] bg-gray-300 my-1 mx-1"></div>

                <div className="cursor-pointer px-3 py-[2px] hover:bg-[#002060] hover:text-white whitespace-nowrap">
                  Historical Trades
                </div>

                <div className="h-[1px] bg-gray-300 my-1 mx-1"></div>

                <div
                  className="cursor-pointer px-3 py-[2px] hover:bg-[#002060] hover:text-white whitespace-nowrap"
                  onClick={() => {
                    onOpenRMSLimit();
                    setActiveMenu(null);
                  }}
                >
                  RMS Limit
                </div>
              </div>
            )}
          </div>

          {/* Options Menu Trigger */}
          <div className="relative h-full flex items-center" ref={optionsRef}>
            <div
              className={`cursor-pointer px-1 hover:text-blue-300 ${activeMenu === 'options' ? 'text-blue-200' : ''}`}
              onClick={() => toggleMenu('options')}
            >
              Options
            </div>

            {/* Options Dropdown */}
            {activeMenu === 'options' && (
              <div className="absolute top-full left-0 mt-[2px] w-40 bg-white border border-gray-500 shadow-xl text-black text-[13px] font-normal flex flex-col py-1 z-50">
                <div
                  className="cursor-pointer px-3 py-[2px] hover:bg-[#002060] hover:text-white whitespace-nowrap"
                  onClick={() => { onChangePassword?.(); setActiveMenu(null); }}
                >
                  Change Password
                </div>
                <div
                  className="cursor-pointer px-3 py-[2px] hover:bg-[#002060] hover:text-white whitespace-nowrap"
                  onClick={() => { setActiveMenu(null); }}
                >
                  TV
                </div>
                <div
                  className="cursor-pointer px-3 py-[2px] hover:bg-[#002060] hover:text-white whitespace-nowrap"
                  onClick={() => { onRelogin?.(); setActiveMenu(null); }}
                >
                  Relogin
                </div>
                <div
                  className="cursor-pointer px-3 py-[2px] hover:bg-[#002060] hover:text-white whitespace-nowrap"
                  onClick={() => { onLogout?.(); setActiveMenu(null); }}
                >
                  Logout
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Indices Display */}
        <div className="flex space-x-6 text-sm font-bold tracking-tight">
          {indices.map((idx) => {
            const formattedChange = idx.change >= 0 ? `+${idx.change.toFixed(2)}` : idx.change.toFixed(2);
            const changeColor = idx.change >= 0 ? "text-green-400" : "text-red-400";
            const valueColor = idx.value > 0 ? "text-white" : "text-gray-400";

            return (
              <div key={idx.name} className="flex space-x-1 items-center">
                <span className="text-gray-100">{idx.name}</span>
                <span className={valueColor}>{idx.value.toFixed(2)}</span>
                <span className={changeColor}>
                  ({formattedChange})
                </span>
              </div>
            );
          })}
        </div>

        {/* Market Watch Dropdown (Right Side) */}
        <div className="flex items-center space-x-1 cursor-pointer hover:bg-white/10 px-2 rounded">
          <span className="text-sm font-bold">MARKET WATCH 1</span>
          <ChevronDown size={14} />
        </div>
      </div>
    </div>
  );
};

export default Header;
