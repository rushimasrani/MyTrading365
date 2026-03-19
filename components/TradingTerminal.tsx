import React, { useState, useEffect } from 'react';
import Header from './Header';
import MarketTable from './MarketTable';
import MarketWatchSearch from './MarketWatchSearch';
import Footer from './Footer';
import OrderEntryDialog from './OrderEntryDialog';
import TradeBookDialog from './TradeBookDialog';
import OrderBookDialog from './OrderBookDialog';
import NetPositionDialog from './NetPositionDialog';
import RMSLimitDialog from './RMSLimitDialog';
import AddScripDialog from './AddScripDialog';
import ChangePasswordDialog from './ChangePasswordDialog';
import MobileTabBar, { MobileTab } from './MobileTabBar';
import { StockData, User } from '../types';
import { MOCK_RMS_RECORDS } from '../mockData';
import { useMarketData } from '../hooks/useMarketData';
import { useOrderManager } from '../hooks/useOrderManager';
import { useIndexData } from '../hooks/useIndexData';

const getInitialWatchlist = (): StockData[] => {
    const saved = localStorage.getItem('saved_watchlist');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed;
            }
        } catch (e) { }
    }
    return [];
};

interface TradingTerminalProps {
    user: User;
    token: string;
    onLogout: () => void;
}

const TradingTerminal: React.FC<TradingTerminalProps> = ({ user, token, onLogout }) => {
    const handleRiskAlert = (msg: any) => {
        if (msg.accountId !== user.id) return;
        alert(`RISK ALERT: ${msg.message}`);
        generateLog("RISK ENGINE", msg.message);
        if (msg.alertType === 'SQUARE_OFF') {
            // Forcing page reload on account disable/square-off ensures fresh positions are fetched
            setTimeout(() => window.location.reload(), 2000);
        }
    };

    const orderUpdateRef = React.useRef<(() => void) | null>(null);

    const { stocks, setStocks, subscribe } = useMarketData(getInitialWatchlist(), handleRiskAlert, () => {
        if (orderUpdateRef.current) orderUpdateRef.current();
    });
    const { indices } = useIndexData();
    const { trades, positions, orders, placeOrder, cancelOrder, modifyOrder, liveCapital, handleOrderUpdate } = useOrderManager(user.id);

    // Set the ref after useOrderManager is available
    orderUpdateRef.current = handleOrderUpdate;

    const [selectedIndex, setSelectedIndex] = useState<number>(-1);
    const [orderEntryAction, setOrderEntryAction] = useState<'BUY' | 'SELL'>('BUY');
    const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
    const [isOrderBookOpen, setIsOrderBookOpen] = useState(false);
    const [isTradeBookOpen, setIsTradeBookOpen] = useState(false);
    const [isNetPositionOpen, setIsNetPositionOpen] = useState(false);
    const [isRMSLimitOpen, setIsRMSLimitOpen] = useState(false);
    const [isAddScripDialogOpen, setIsAddScripDialogOpen] = useState(false);
    const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

    const [activeMobileTab, setActiveMobileTab] = useState<MobileTab>('watchlist');

    const handleMobileTabChange = (tab: MobileTab) => {
        setActiveMobileTab(tab);
        if (tab === 'watchlist') {
            setIsOrderBookOpen(false);
            setIsTradeBookOpen(false);
            setIsNetPositionOpen(false);
        } else if (tab === 'orders') {
            setIsOrderBookOpen(true);
            setIsTradeBookOpen(false);
            setIsNetPositionOpen(false);
        } else if (tab === 'positions') {
            setIsOrderBookOpen(false);
            setIsTradeBookOpen(false);
            setIsNetPositionOpen(true);
        } else if (tab === 'trades') {
            setIsOrderBookOpen(false);
            setIsTradeBookOpen(true);
            setIsNetPositionOpen(false);
        } else if (tab === 'menu') {
            setIsOrderBookOpen(false);
            setIsTradeBookOpen(false);
            setIsNetPositionOpen(false);
            setIsRMSLimitOpen(true);
        }
    };

    // Fetch Default Watchlist if nothing is saved
    useEffect(() => {
        if (stocks.length === 0 && !localStorage.getItem('saved_watchlist')) {
            const fetchDefaults = async () => {
                try {
                    const res = await fetch('/api/instruments/default-watchlist');
                    if (res.ok) {
                        const data = await res.json();
                        setStocks(data);
                        subscribe(data.map((d: any) => d.id));
                    }
                } catch (e) {
                    console.error('Failed to fetch default watchlist:', e);
                }
            };
            fetchDefaults();
        }
    }, []);

    // Ensure we are subscribed to all open positions even if they aren't directly visible in the Market Watch
    useEffect(() => {
        const missingTokens = positions
            .filter(p => p.nQty !== 0 && !stocks.find(s => s.id === p.token))
            .map(p => p.token);

        if (missingTokens.length > 0) {
            // Add skeleton objects to stocks array so they stream properly
            const missingStocks: StockData[] = missingTokens.map(token => {
                const pos = positions.find(p => p.token === token)!;
                return {
                    id: token,
                    symbol: pos.scrip,
                    exchange: pos.exch,
                    dispName: pos.scrip,
                    ltp: 0, change: 0, bQty: 0, bid: 0, ask: 0, aQty: 0,
                    open: 0, high: 0, low: 0, pClose: 0, volume: 0
                };
            });
            setStocks(prev => [...prev, ...missingStocks]);
            subscribe(missingTokens);
        }
    }, [positions, stocks, setStocks, subscribe]);

    const handleSaveMarketWatch = () => {
        localStorage.setItem('saved_watchlist', JSON.stringify(stocks));
        generateLog("SYSTEM", "Watchlist Saved Successfully");
    };

    // State for Footer Log
    const [lastLog, setLastLog] = useState<string | null>(null);

    const generateLog = (scrip: string, details: string) => {
        const date = new Date();
        const h = date.getHours().toString().padStart(2, '0');
        const m = date.getMinutes().toString().padStart(2, '0');
        const s = date.getSeconds().toString().padStart(2, '0');
        const ms = date.getMilliseconds().toString().padStart(3, '0');
        const timestamp = `${h}:${m}:${s} ${ms}`;

        // Format: Current TimeStamp, username, Instrument_name, message
        setLastLog(`${timestamp}, ${user.username}, ${scrip}, ${details}`);
    };

    const handleAddScrip = (scrip: any) => {
        if (stocks.some(s => s.symbol === scrip.tradingsymbol && s.exchange === scrip.exchange)) {
            generateLog(scrip.name, "Already in watchlist");
            return;
        }

        const newStock: StockData = {
            id: scrip.token,
            symbol: scrip.tradingsymbol,
            exchange: scrip.exchange,
            dispName: scrip.dispName,
            ltp: 0,
            change: 0,
            bQty: 0, bid: 0, ask: 0, aQty: 0,
            open: 0, high: 0, low: 0, pClose: 0, volume: 0,
        };

        setStocks(prev => [...prev, newStock]);
        subscribe([newStock.id]);
        generateLog(scrip.name, "Watchlist added");
    };

    const handleOrder = async (type: 'BUY' | 'SELL', qty: number, price: number, orderType: 'MARKET' | 'LIMIT') => {
        if (selectedIndex === -1) return;
        const stock = stocks[selectedIndex];
        const result = await placeOrder(stock, type, qty, price, orderType);
        if (result) {
            if (result.orderStatus === 'EXECUTED' && result.tPrice !== undefined) {
                generateLog(stock.dispName, `${qty}, ${Number(result.tPrice).toFixed(2)} ${orderType} Executed`);
            } else if (result.orderStatus === 'PENDING') {
                generateLog(stock.dispName, `${qty} @ ${price.toFixed(2)} LIMIT Pending | Margin Blocked: ₹${(price * qty).toFixed(2)}`);
            } else if (result.orderStatus === 'REJECTED') {
                generateLog(stock.dispName, `REJECTED: ${result.error || 'Insufficient funds'}`);
            }
        }
    };

    const handleRelogin = () => {
        onLogout();
        window.location.reload();
    };

    // Handle keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isOrderDialogOpen) {
                if (e.key === 'Escape') setIsOrderDialogOpen(false);
                return;
            }
            if (isOrderBookOpen) {
                if (e.key === 'Escape') setIsOrderBookOpen(false);
                return;
            }
            if (isTradeBookOpen) {
                if (e.key === 'Escape') setIsTradeBookOpen(false);
                return;
            }
            if (isNetPositionOpen) {
                if (e.key === 'Escape') setIsNetPositionOpen(false);
                return;
            }
            if (isRMSLimitOpen) {
                if (e.key === 'Escape') setIsRMSLimitOpen(false);
                return;
            }
            if (isAddScripDialogOpen) {
                if (e.key === 'Escape') setIsAddScripDialogOpen(false);
                return;
            }

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => {
                    if (prev < stocks.length - 1) return prev + 1;
                    if (prev === -1 && stocks.length > 0) return 0;
                    return prev;
                });
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => {
                    if (prev > 0) return prev - 1;
                    return 0;
                });
            } else if (e.key === 'F1' || e.key === '+' || e.key === 'NumpadAdd') {
                e.preventDefault();
                if (selectedIndex !== -1) {
                    setOrderEntryAction('BUY');
                    setIsOrderDialogOpen(true);
                }
            } else if (e.key === 'F2' || e.key === '-' || e.key === 'NumpadSubtract') {
                e.preventDefault();
                if (selectedIndex !== -1) {
                    setOrderEntryAction('SELL');
                    setIsOrderDialogOpen(true);
                }
            } else if (e.key === 'Delete') {
                e.preventDefault();
                if (selectedIndex !== -1 && stocks[selectedIndex]) {
                    const stockToRemove = stocks[selectedIndex];
                    generateLog(stockToRemove.dispName, "Watchlist removed");
                    setStocks(prev => prev.filter((_, idx) => idx !== selectedIndex));
                    setSelectedIndex(prev => {
                        if (prev > 0 && prev >= stocks.length - 1) return prev - 1;
                        if (stocks.length <= 1) return -1;
                        return prev;
                    });
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [stocks.length, selectedIndex, isOrderDialogOpen, isOrderBookOpen, isTradeBookOpen, isNetPositionOpen, isRMSLimitOpen, isAddScripDialogOpen]);

    const handleHeaderOrderAction = (action: 'BUY' | 'SELL') => {
        if (selectedIndex === -1 || !stocks[selectedIndex]) {
            alert('Please select a script first from the Market Watch.');
            return;
        }
        setOrderEntryAction(action);
        setIsOrderDialogOpen(true);
    };

    // Calculate Live Equity metrics based on Professional terminal definitions
    let positionMargin = 0;
    let runningM2M = 0;

    positions.forEach(p => {
        const stock = stocks.find(s => s.id === p.token);
        const ltp = stock ? stock.ltp : 0;

        const buyVal = p.bQty * p.bAvg;
        const sellVal = p.sQty * p.sAvg;
        runningM2M += (sellVal - buyVal) + (p.nQty * ltp);

        if (p.nQty !== 0) {
            positionMargin += (p.nAvg * Math.abs(p.nQty));
        }
    });

    // Blocked margin from pending limit orders
    const blockedMargin = orders
        .filter(o => o.status === 'PENDING')
        .reduce((sum, o) => sum + o.blockedMargin, 0);

    // Used Capital = Position margin + Blocked margin from pending orders
    const usedCapital = positionMargin + blockedMargin;
    const totalCap = liveCapital ?? user.totalCapital ?? 0;
    const availableCapital = totalCap - usedCapital;

    return (
        <div className="flex flex-col h-screen w-full bg-black select-none text-white font-sans relative">
            <div className="relative md:absolute md:top-1 md:right-2 z-40 flex flex-col md:flex-row items-center w-full md:w-auto bg-[#0a0a0a] md:bg-transparent px-1 py-1 md:p-0 border-b border-gray-700 md:border-none">
                <div className="grid grid-cols-2 md:flex gap-1 md:gap-3 text-[11px] font-semibold tracking-wide w-full md:w-auto">
                    <div className="bg-[#1c2630] px-2 md:px-3 py-1 rounded border border-gray-600 shadow-sm flex items-center justify-between md:justify-start">
                        <span className="text-gray-300 mr-1 md:mr-2">Capital:</span>
                        <span className="text-blue-400">₹{(liveCapital ?? user.totalCapital)?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="bg-[#1c2630] px-2 md:px-3 py-1 rounded border border-gray-600 shadow-sm flex items-center justify-between md:justify-start">
                        <span className="text-gray-300 mr-1 md:mr-2">Margin:</span>
                        <span className="text-yellow-400">₹{usedCapital.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        {blockedMargin > 0 && (
                            <span className="hidden md:inline text-orange-400 ml-1 text-[10px]">(₹{blockedMargin.toLocaleString('en-IN', { minimumFractionDigits: 0 })})</span>
                        )}
                    </div>
                    <div className="bg-[#1c2630] px-2 md:px-3 py-1 rounded border border-gray-600 shadow-sm flex items-center justify-between md:justify-start">
                        <span className="text-gray-300 mr-1 md:mr-2">Avail:</span>
                        <span className={availableCapital >= 0 ? 'text-green-400' : 'text-red-400'}>₹{availableCapital.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="bg-[#1c2630] px-2 md:px-3 py-1 rounded border border-gray-600 shadow-sm flex items-center justify-between md:justify-start">
                        <span className="text-gray-300 mr-1 md:mr-2">M2M:</span>
                        <span className={runningM2M > 0 ? 'text-green-500' : runningM2M < 0 ? 'text-red-500' : 'text-gray-400'}>
                            {runningM2M > 0 ? '+' : ''}₹{runningM2M.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                    </div>
                </div>
                <button onClick={onLogout} className="hidden md:block text-[11px] font-bold bg-red-600/80 hover:bg-red-600 text-white px-3 py-1 rounded ml-3 border border-red-800 shadow-inner">LOGOUT</button>
            </div>

            <Header
                indices={indices}
                onOpenOrderBook={() => setIsOrderBookOpen(true)}
                onOpenTradeBook={() => setIsTradeBookOpen(true)}
                onOpenNetPosition={() => setIsNetPositionOpen(true)}
                onOpenRMSLimit={() => setIsRMSLimitOpen(true)}
                onOpenAddScrip={() => setIsAddScripDialogOpen(true)}
                onSaveMarketWatch={handleSaveMarketWatch}
                onBuyOrder={() => handleHeaderOrderAction('BUY')}
                onSellOrder={() => handleHeaderOrderAction('SELL')}
                onChangePassword={() => setIsChangePasswordOpen(true)}
                onLogout={onLogout}
                onRelogin={handleRelogin}
            />
            <div className="flex-1 overflow-hidden relative flex flex-col pb-[60px] md:pb-0 pt-[36px] md:pt-0">
                <MarketWatchSearch onAdd={handleAddScrip} />
                <MarketTable
                    data={stocks}
                    selectedIndex={selectedIndex}
                    onSelectRow={setSelectedIndex}
                    onDoubleClickRow={(index) => {
                        setSelectedIndex(index);
                        setOrderEntryAction('BUY'); // Defaults to BUY on double click
                        setIsOrderDialogOpen(true);
                    }}
                    onOrderAction={(index, action) => {
                        setSelectedIndex(index);
                        setOrderEntryAction(action);
                        setIsOrderDialogOpen(true);
                    }}
                />
            </div>

            <Footer lastLog={lastLog} />

            <MobileTabBar activeTab={activeMobileTab} onTabChange={handleMobileTabChange} />

            {isOrderDialogOpen && selectedIndex !== -1 && (
                <OrderEntryDialog
                    stock={stocks[selectedIndex]}
                    accountName={user.username}
                    defaultAction={orderEntryAction}
                    onExecute={handleOrder}
                    onClose={() => setIsOrderDialogOpen(false)}
                />
            )}

            {isOrderBookOpen && (
                <OrderBookDialog
                    orders={orders}
                    onClose={() => {
                        setIsOrderBookOpen(false);
                        setActiveMobileTab('watchlist');
                    }}
                    onCancelOrder={async (id) => {
                        await cancelOrder(id);
                        generateLog('ORDER', 'Order Cancelled');
                    }}
                    onModifyOrder={async (id, price, quantity) => {
                        await modifyOrder(id, price, quantity);
                        generateLog('ORDER', `Order Modified: Price=${price}, Qty=${quantity}`);
                    }}
                />
            )}

            {isTradeBookOpen && (
                <TradeBookDialog
                    trades={trades}
                    onClose={() => {
                        setIsTradeBookOpen(false);
                        setActiveMobileTab('watchlist');
                    }}
                />
            )}

            {isNetPositionOpen && (
                <NetPositionDialog
                    positions={positions}
                    stocks={stocks}
                    onClose={() => {
                        setIsNetPositionOpen(false);
                        setActiveMobileTab('watchlist');
                    }}
                />
            )}

            {isRMSLimitOpen && (
                <RMSLimitDialog
                    userId={user.id}
                    onClose={() => {
                        setIsRMSLimitOpen(false);
                        setActiveMobileTab('watchlist');
                    }}
                    availableCapital={availableCapital}
                    usedCapital={usedCapital}
                    blockedMargin={blockedMargin}
                    allocM2M={user.allocatedM2m || 0}
                    runningM2M={runningM2M}
                />
            )}

            {isAddScripDialogOpen && (
                <AddScripDialog
                    onClose={() => setIsAddScripDialogOpen(false)}
                    onAdd={handleAddScrip}
                />
            )}

            {isChangePasswordOpen && (
                <ChangePasswordDialog
                    userId={user.id}
                    onClose={() => setIsChangePasswordOpen(false)}
                />
            )}
        </div>
    );
};

export default TradingTerminal;
