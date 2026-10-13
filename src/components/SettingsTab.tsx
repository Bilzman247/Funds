import React, { useState } from 'react';
import { AccountType, BotConfig, StrategyType, MarketSymbol, DerivAccount } from '../types';
import { Sliders, RotateCcw, LogIn, LogOut, CheckCircle2, ExternalLink, ShieldCheck, User } from 'lucide-react';
import { DERIV_CONFIG } from '../core/config/urls.ts';
import { getSignUpUrl } from '../core/auth/oauth.ts';

interface SettingsTabProps {
  accountType: AccountType;
  onToggleAccount: (type: AccountType) => void;
  balance: number;
  onResetBalance: (newBalance: number) => void;
  botConfig: BotConfig;
  onChangeConfig: (config: BotConfig) => void;
  symbols: MarketSymbol[];
  isLoggedIn?: boolean;
  activeAccount?: DerivAccount | null;
  accounts?: DerivAccount[];
  onLogin?: () => void;
  onLogout?: () => void;
  onSelectAccount?: (accountId: string) => void;
  isConnecting?: boolean;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  accountType,
  onToggleAccount,
  balance,
  onResetBalance,
  botConfig,
  onChangeConfig,
  symbols,
  isLoggedIn = false,
  activeAccount,
  accounts = [],
  onLogin,
  onLogout,
  onSelectAccount,
  isConnecting = false,
}) => {
  const [showConfigDetails, setShowConfigDetails] = useState(false);

  const strategies: { id: StrategyType; name: string; desc: string }[] = [
    { id: 'martingale', name: 'Martingale Bot', desc: 'Doubles stake after each loss to recover on next win.' },
    { id: 'dalembert', name: 'D’Alembert Bot', desc: 'Increases stake by 1 unit after loss and decreases after win.' },
    { id: 'rsi', name: 'Smart RSI Trend Bot', desc: 'Triggers trades automatically based on RSI conditions.' },
    { id: 'accumulator', name: 'Growth Accumulator', desc: 'Compounds profits progressively with strict risk limits.' },
  ];

  return (
    <div className="w-full px-2 sm:px-4 space-y-4 pb-12 select-none font-sans">
      
      {/* 1. Real Deriv OAuth Connection Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Deriv Account Connection</h3>
              <p className="text-[11px] text-slate-500">Official OAuth 2.0 & WebSocket API</p>
            </div>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            isLoggedIn ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
          }`}>
            {isLoggedIn ? 'Connected' : 'Guest Mode'}
          </span>
        </div>

        {isLoggedIn ? (
          <div className="space-y-3 pt-1">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                    <span>{activeAccount?.account_id || 'Deriv Account'}</span>
                    <span className="text-[10px] bg-emerald-200 text-emerald-900 px-1.5 py-0.2 rounded uppercase">
                      {activeAccount?.is_virtual ? 'Demo' : 'Real'}
                    </span>
                  </div>
                  <div className="text-[11px] text-emerald-800">
                    Currency: <span className="font-semibold">{activeAccount?.currency || 'USD'}</span> • Live Synchronized
                  </div>
                </div>
              </div>
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>

            {/* Account Selector if multiple accounts exist */}
            {accounts.length > 1 && onSelectAccount && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Switch Deriv Account</label>
                <select
                  value={activeAccount?.account_id || ''}
                  onChange={(e) => onSelectAccount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500"
                >
                  {accounts.map((acc) => (
                    <option key={acc.account_id} value={acc.account_id}>
                      {acc.account_id} ({acc.is_virtual ? 'Demo' : 'Real'}) - {acc.currency}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={onLogout}
              className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Disconnect Deriv Account</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3 pt-1">
            <p className="text-xs text-slate-600 leading-relaxed">
              Log in with your official Deriv account via OAuth 2.0 PKCE to trade with your real or demo balance directly.
            </p>

            <button
              onClick={onLogin}
              disabled={isConnecting}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm shadow-blue-500/20 active:scale-95"
            >
              <LogIn className="w-4 h-4" />
              <span>{isConnecting ? 'Connecting to Deriv...' : 'Log in with Deriv'}</span>
            </button>

            <div className="flex items-center justify-between pt-1">
              <a
                href={getSignUpUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
              >
                <span>Don't have an account? Sign up</span>
                <ExternalLink className="w-3 h-3" />
              </a>

              <button
                type="button"
                onClick={() => setShowConfigDetails(!showConfigDetails)}
                className="text-[11px] text-slate-400 hover:text-slate-600 underline"
              >
                {showConfigDetails ? 'Hide App Config' : 'View App Config'}
              </button>
            </div>

            {showConfigDetails && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-[10px] font-mono text-slate-600 space-y-1">
                <div>App ID: <span className="font-bold text-slate-900">{DERIV_CONFIG.appId}</span></div>
                <div>Redirect URI: <span className="font-bold text-slate-900">{DERIV_CONFIG.redirectUri}</span></div>
                <div>Scopes: <span className="font-bold text-slate-900">{DERIV_CONFIG.oauthScopes}</span></div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Risk Management & Strategy Parameters Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-blue-600" />
          <span>Risk Management & Parameters</span>
        </h3>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Trading Strategy</label>
          <select
            value={botConfig.strategy}
            onChange={(e) => onChangeConfig({ ...botConfig, strategy: e.target.value as StrategyType })}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500"
          >
            {strategies.map((s) => (
              <option key={s.id} value={s.id}>{s.name} - {s.desc}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Synthetic Market</label>
          <select
            value={botConfig.symbol}
            onChange={(e) => onChangeConfig({ ...botConfig, symbol: e.target.value })}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500"
          >
            {symbols.map((sym) => (
              <option key={sym.id} value={sym.id}>{sym.name}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Stake ($)</label>
            <input
              type="number"
              min="0.35"
              step="0.5"
              value={botConfig.stake}
              onChange={(e) => onChangeConfig({ ...botConfig, stake: parseFloat(e.target.value) || 1 })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Target Runs</label>
            <input
              type="number"
              min="1"
              value={botConfig.targetRuns}
              onChange={(e) => onChangeConfig({ ...botConfig, targetRuns: parseInt(e.target.value) || 50 })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Take Profit ($)</label>
            <input
              type="number"
              min="1"
              value={botConfig.takeProfit}
              onChange={(e) => onChangeConfig({ ...botConfig, takeProfit: parseFloat(e.target.value) || 20 })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Stop Loss ($)</label>
            <input
              type="number"
              min="1"
              value={botConfig.stopLoss}
              onChange={(e) => onChangeConfig({ ...botConfig, stopLoss: parseFloat(e.target.value) || 50 })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* 3. Account Preferences */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-4">
        <h3 className="font-bold text-sm text-slate-900">App Preferences</h3>

        <div className="flex items-center justify-between py-2 border-b border-slate-100">
          <div>
            <div className="font-bold text-xs text-slate-900">Account Mode</div>
            <div className="text-[11px] text-slate-500">Switch between Demo and Real modes</div>
          </div>
          <button
            onClick={() => onToggleAccount(accountType === 'demo' ? 'real' : 'demo')}
            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-xl text-xs font-bold transition"
          >
            Switch to {accountType === 'demo' ? 'Real' : 'Demo'}
          </button>
        </div>

        <div className="flex items-center justify-between py-2">
          <div>
            <div className="font-bold text-xs text-slate-900">Reset Demo Balance</div>
            <div className="text-[11px] text-slate-500">Reset demo funds back to $10,000.00</div>
          </div>
          <button
            onClick={() => onResetBalance(10000)}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset ($10k)</span>
          </button>
        </div>
      </div>

    </div>
  );
};
