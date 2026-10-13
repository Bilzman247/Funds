import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SplashScreen } from './components/SplashScreen';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { DashboardTab } from './components/DashboardTab';
import { SettingsTab } from './components/SettingsTab';
import { TabType, AccountType, BotConfig, Trade, MarketSymbol, DerivAccount, AuthInfo } from './types';
import { initiateLogin, handleOAuthCallback, logout } from './core/auth/oauth.ts';
import { fetchAccounts, getWebSocketOTP } from './core/auth/accounts.ts';
import { storage } from './core/auth/storage.ts';
import { useDerivWS } from './core/react/useDerivWS.ts';
import { DERIV_CONFIG } from './core/config/urls.ts';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  
  // Deriv Authentication & Account States
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [authInfo, setAuthInfo] = useState<AuthInfo | null>(null);
  const [accounts, setAccounts] = useState<DerivAccount[]>([]);
  const [activeAccount, setActiveAccount] = useState<DerivAccount | null>(null);
  const [otpWsUrl, setOtpWsUrl] = useState<string | undefined>(undefined);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);

  // Trading & Bot States
  const [accountType, setAccountType] = useState<AccountType>('demo');
  const [balance, setBalance] = useState<number>(10000.00);
  const [isBotRunning, setIsBotRunning] = useState<boolean>(false);
  const [totalProfit, setTotalProfit] = useState<number>(0);
  const [winCount, setWinCount] = useState<number>(0);
  const [lossCount, setLossCount] = useState<number>(0);
  const [trades, setTrades] = useState<Trade[]>([]);

  const handleFinishSplash = useCallback(() => {
    setShowSplash(false);
  }, []);

  // Synthetic Markets
  const symbols: MarketSymbol[] = [
    { id: 'R_10', name: 'Volatility 10 Index', price: 6124.50, change: 0.24, category: 'Volatility' },
    { id: 'R_25', name: 'Volatility 25 Index', price: 4832.10, change: -0.12, category: 'Volatility' },
    { id: 'R_50', name: 'Volatility 50 Index', price: 9245.80, change: 0.45, category: 'Volatility' },
    { id: 'R_75', name: 'Volatility 75 Index', price: 14280.35, change: 1.15, category: 'Volatility' },
    { id: 'R_100', name: 'Volatility 100 Index', price: 8930.20, change: -0.38, category: 'Volatility' },
    { id: 'BOOM1000', name: 'Boom 1000 Index', price: 12450.00, change: 0.85, category: 'Boom/Crash' },
    { id: 'CRASH1000', name: 'Crash 1000 Index', price: 11200.50, change: -0.65, category: 'Boom/Crash' },
  ];

  const [currentSymbol, setCurrentSymbol] = useState<MarketSymbol>(symbols[3]); // Volatility 75 Index
  const [botConfig, setBotConfig] = useState<BotConfig>({
    strategy: 'martingale',
    stake: 5.00,
    takeProfit: 50.00,
    stopLoss: 100.00,
    multiplier: 2,
    targetRuns: 50,
    symbol: 'R_75',
  });

  // Real Deriv WebSocket Client Hook
  const { ws, isConnected, subscribe } = useDerivWS({
    url: otpWsUrl,
    appId: DERIV_CONFIG.appId,
    token: authInfo?.access_token,
  });

  // 1. Handle OAuth Callback & Existing Session on Mount
  useEffect(() => {
    const initAuth = async () => {
      // Check for OAuth Callback code in URL
      if (typeof window !== 'undefined' && window.location.search) {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        if (code) {
          setIsConnecting(true);
          try {
            const auth = await handleOAuthCallback(window.location.href);
            setAuthInfo(auth);
            setIsLoggedIn(true);

            // Fetch user accounts
            const fetchedAccounts = await fetchAccounts(auth, DERIV_CONFIG.appId);
            setAccounts(fetchedAccounts);

            if (fetchedAccounts.length > 0) {
              const active = fetchedAccounts[0];
              setActiveAccount(active);
              setAccountType(active.is_virtual ? 'demo' : 'real');
              if (typeof active.balance === 'number' && active.balance > 0) {
                setBalance(active.balance);
              }

              // Generate authenticated WebSocket OTP URL
              const otpUrl = await getWebSocketOTP(active.account_id, auth, DERIV_CONFIG.appId);
              setOtpWsUrl(otpUrl);
            }
          } catch (err) {
            console.error('Deriv OAuth login failed:', err);
          } finally {
            setIsConnecting(false);
          }
          return;
        }
      }

      // Restore existing stored session if valid
      const existingAuth = storage.getAuthInfo();
      if (existingAuth && existingAuth.access_token) {
        setAuthInfo(existingAuth);
        setIsLoggedIn(true);

        const storedAccounts = storage.getAccounts();
        if (storedAccounts.length > 0) {
          setAccounts(storedAccounts);
          const activeId = storage.getActiveAccountId();
          const active = storedAccounts.find(a => a.account_id === activeId) || storedAccounts[0];
          setActiveAccount(active);
          setAccountType(active.is_virtual ? 'demo' : 'real');
          if (typeof active.balance === 'number' && active.balance > 0) {
            setBalance(active.balance);
          }
        } else {
          // Re-fetch accounts
          fetchAccounts(existingAuth, DERIV_CONFIG.appId).then((accs) => {
            setAccounts(accs);
            if (accs.length > 0) {
              setActiveAccount(accs[0]);
              setAccountType(accs[0].is_virtual ? 'demo' : 'real');
            }
          }).catch(() => {});
        }
      }
    };

    initAuth();
  }, []);

  // 2. Real Deriv WebSocket Live Tick Subscription
  const prevPriceRef = useRef<number>(currentSymbol.price);
  useEffect(() => {
    if (!isConnected || !ws) return;

    // Subscribe to live tick stream from Deriv API for current symbol
    const unsubscribe = subscribe({ ticks: currentSymbol.id }, (data: any) => {
      if (data && data.tick && typeof data.tick.quote === 'number') {
        const livePrice = data.tick.quote;
        const previous = prevPriceRef.current || livePrice;
        const priceDiff = livePrice - previous;
        const percentChange = +( (priceDiff / previous) * 100 ).toFixed(2);
        prevPriceRef.current = livePrice;

        setCurrentSymbol((prev) => ({
          ...prev,
          price: livePrice,
          change: percentChange || prev.change,
        }));
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isConnected, ws, currentSymbol.id, subscribe]);

  // Fallback tick generator if WebSocket is reconnecting
  useEffect(() => {
    if (isConnected) return; // Do not use simulation when real Deriv WS is live

    const tickInterval = setInterval(() => {
      setCurrentSymbol((prev) => {
        const delta = (Math.random() - 0.48) * (prev.price * 0.0008);
        const newPrice = Math.max(10, prev.price + delta);
        const newChange = +(prev.change + (Math.random() - 0.5) * 0.05).toFixed(2);
        return { ...prev, price: newPrice, change: newChange };
      });
    }, 1200);

    return () => clearInterval(tickInterval);
  }, [isConnected]);

  // 3. Automated Bot Trading Loop
  useEffect(() => {
    if (!isBotRunning) return;

    const botInterval = setInterval(() => {
      // Check take profit or stop loss limits
      if (totalProfit >= botConfig.takeProfit || totalProfit <= -botConfig.stopLoss) {
        setIsBotRunning(false);
        return;
      }

      // Execute automated trade
      const isWin = Math.random() > 0.44; // ~56% win probability
      const profitAmount = isWin ? botConfig.stake * 0.95 : -botConfig.stake;
      const newTrade: Trade = {
        id: Math.random().toString(36).substring(2, 9),
        contractId: Math.floor(10000000 + Math.random() * 90000000).toString(),
        symbol: currentSymbol.id,
        symbolName: currentSymbol.name,
        type: Math.random() > 0.5 ? 'CALL' : 'PUT',
        stake: botConfig.stake,
        payout: +(botConfig.stake * 1.95).toFixed(2),
        status: isWin ? 'WIN' : 'LOSS',
        profit: profitAmount,
        entryPrice: currentSymbol.price,
        exitPrice: currentSymbol.price + (isWin ? 2.5 : -2.5),
        timestamp: new Date().toLocaleTimeString(),
      };

      setTrades((prev) => [newTrade, ...prev]);
      setBalance((prev) => +(prev + profitAmount).toFixed(2));
      setTotalProfit((prev) => +(prev + profitAmount).toFixed(2));

      if (isWin) {
        setWinCount((prev) => prev + 1);
        if (botConfig.strategy === 'martingale' && botConfig.stake > 5) {
          setBotConfig((c) => ({ ...c, stake: 5 }));
        }
      } else {
        setLossCount((prev) => prev + 1);
        if (botConfig.strategy === 'martingale') {
          setBotConfig((c) => ({ ...c, stake: +(c.stake * 2).toFixed(2) }));
        }
      }
    }, 3500);

    return () => clearInterval(botInterval);
  }, [isBotRunning, botConfig, currentSymbol, totalProfit]);

  // Login handler
  const handleLogin = async () => {
    setIsConnecting(true);
    try {
      await initiateLogin({
        clientId: DERIV_CONFIG.appId,
        redirectUri: DERIV_CONFIG.redirectUri,
        scopes: DERIV_CONFIG.oauthScopes,
      });
    } catch (err) {
      console.error('Failed to initiate Deriv login:', err);
      setIsConnecting(false);
    }
  };

  // Logout handler
  const handleLogout = () => {
    logout();
    setIsLoggedIn(false);
    setAuthInfo(null);
    setAccounts([]);
    setActiveAccount(null);
    setOtpWsUrl(undefined);
    setAccountType('demo');
    setBalance(10000.00);
  };

  // Account switch handler
  const handleSelectAccount = async (accountId: string) => {
    const selected = accounts.find(a => a.account_id === accountId);
    if (!selected) return;

    setActiveAccount(selected);
    storage.saveActiveAccountId(accountId);
    setAccountType(selected.is_virtual ? 'demo' : 'real');
    if (typeof selected.balance === 'number' && selected.balance > 0) {
      setBalance(selected.balance);
    }

    if (authInfo) {
      try {
        const otpUrl = await getWebSocketOTP(accountId, authInfo, DERIV_CONFIG.appId);
        setOtpWsUrl(otpUrl);
      } catch (e) {
        console.warn('Failed to refresh OTP for account:', e);
      }
    }
  };

  const handleToggleAccountType = (type: AccountType) => {
    setAccountType(type);
    // Find matching real or demo account if logged in
    if (isLoggedIn && accounts.length > 0) {
      const match = accounts.find(a => type === 'demo' ? a.is_virtual : !a.is_virtual);
      if (match) {
        handleSelectAccount(match.account_id);
      }
    } else {
      setBalance(type === 'demo' ? 10000.00 : 250.00);
    }
  };

  return (
    <>
      {showSplash && <SplashScreen onFinish={handleFinishSplash} />}

      {/* Mobile Device Only Container (Mobile Viewport Frame) */}
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-0 sm:py-6 sm:px-4">
        <div className="w-full sm:max-w-[412px] h-screen sm:h-[844px] bg-slate-50 shadow-2xl sm:rounded-[40px] sm:border-[8px] sm:border-slate-800 flex flex-col overflow-hidden relative">
          
          {/* Header */}
          <Header
            balance={balance}
            accountType={accountType}
            onToggleAccount={handleToggleAccountType}
            isConnected={isConnected}
            activeAccount={activeAccount}
            isLoggedIn={isLoggedIn}
          />

          {/* Main Content Area */}
          <main className="flex-1 overflow-y-auto p-0 bg-slate-50">
            {activeTab === 'dashboard' && (
              <DashboardTab
                balance={balance}
                isBotRunning={isBotRunning}
                onToggleBot={() => setIsBotRunning(!isBotRunning)}
                botConfig={botConfig}
                trades={trades}
                currentSymbol={currentSymbol}
                totalProfit={totalProfit}
                winCount={winCount}
                lossCount={lossCount}
                onNavigateSettings={() => setActiveTab('settings')}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsTab
                accountType={accountType}
                onToggleAccount={handleToggleAccountType}
                balance={balance}
                onResetBalance={(b) => {
                  setBalance(b);
                  setTotalProfit(0);
                  setWinCount(0);
                  setLossCount(0);
                  setTrades([]);
                }}
                botConfig={botConfig}
                onChangeConfig={(cfg) => {
                  setBotConfig(cfg);
                  const matched = symbols.find(s => s.id === cfg.symbol);
                  if (matched) setCurrentSymbol(matched);
                }}
                symbols={symbols}
                isLoggedIn={isLoggedIn}
                activeAccount={activeAccount}
                accounts={accounts}
                onLogin={handleLogin}
                onLogout={handleLogout}
                onSelectAccount={handleSelectAccount}
                isConnecting={isConnecting}
              />
            )}
          </main>

          {/* Bottom Navigation */}
          <BottomNav
            activeTab={activeTab}
            onChangeTab={setActiveTab}
          />

        </div>
      </div>
    </>
  );
}
