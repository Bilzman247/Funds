import React, { useEffect, useRef } from 'react';
import { BotConfig, Trade, MarketSymbol } from '../types';
import { Activity, Bot, Play, Square, TrendingUp, TrendingDown, Terminal } from 'lucide-react';
import { Logo } from './Logo';

interface DashboardTabProps {
  balance: number;
  isBotRunning: boolean;
  onToggleBot: () => void;
  botConfig: BotConfig;
  trades: Trade[];
  currentSymbol: MarketSymbol;
  totalProfit: number;
  winCount: number;
  lossCount: number;
  onNavigateSettings: () => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  balance,
  isBotRunning,
  onToggleBot,
  botConfig,
  trades,
  currentSymbol,
  totalProfit,
  winCount,
  lossCount,
  onNavigateSettings,
}) => {
  const totalTrades = winCount + lossCount;
  const winRate = totalTrades > 0 ? Math.round((winCount / totalTrades) * 100) : 0;
  const consoleEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [trades, isBotRunning]);

  return (
    <div className="w-full space-y-3 p-3 pb-0 select-none font-sans">
      
      {/* 1. Market Ticker Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Logo size={32} />
          <div>
            <div className="text-[10px] text-slate-500 font-medium">Synthetic Index</div>
            <div className="font-bold text-xs text-slate-900">{currentSymbol.name}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-black text-slate-900 font-mono">${currentSymbol.price.toFixed(2)}</div>
          <div className={`text-[10px] font-bold flex items-center justify-end gap-0.5 ${currentSymbol.change >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {currentSymbol.change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            <span>{currentSymbol.change >= 0 ? '+' : ''}{currentSymbol.change}%</span>
          </div>
        </div>
      </div>

      {/* 2. Reduced Height Session Performance Card */}
      <div className="bg-blue-600 text-white rounded-2xl p-3 shadow-md space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-blue-100 font-medium">Session Performance</span>
          <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-bold">{botConfig.strategy}</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-blue-700/60 p-2 rounded-xl border border-blue-400/20">
            <div className="text-[10px] text-blue-200">Total Net P/L</div>
            <div className={`text-base font-black font-mono ${totalProfit >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
              {totalProfit >= 0 ? '+' : ''}${totalProfit.toFixed(2)}
            </div>
          </div>
          <div className="bg-blue-700/60 p-2 rounded-xl border border-blue-400/20">
            <div className="text-[10px] text-blue-200">Win Rate</div>
            <div className="text-base font-black font-mono text-white">
              {winRate}%
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1.5 text-center pt-1 border-t border-blue-500/40 text-[11px]">
          <div>
            <span className="text-blue-200 text-[10px]">Wins: </span>
            <span className="font-bold text-emerald-300">{winCount}</span>
          </div>
          <div>
            <span className="text-blue-200 text-[10px]">Losses: </span>
            <span className="font-bold text-rose-300">{lossCount}</span>
          </div>
          <div>
            <span className="text-blue-200 text-[10px]">Run: </span>
            <span className="font-bold text-white">{totalTrades}/{botConfig.targetRuns}</span>
          </div>
        </div>
      </div>

      {/* 3. Trading Button below Session Performance Card (Bot icon on left, named Start Bot / Stop Bot) */}
      <div>
        <button
          onClick={onToggleBot}
          className={`w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition active:scale-95 ${
            isBotRunning
              ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          <Bot className="w-4 h-4 shrink-0" />
          <span>{isBotRunning ? 'Stop Bot' : 'Start Bot'}</span>
        </button>
      </div>

      {/* 4. Redesigned New Console Log Card (App background color, full width, flat/non-floating, zero gap with bottom nav) */}
      <div className="w-full bg-slate-50 border-t border-slate-200 p-3 space-y-2 mb-0 pb-0">
        <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
          <div className="flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-blue-600" />
            <span className="font-bold text-[11px] uppercase tracking-wider text-slate-700">Console Log</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">{isBotRunning ? 'Live' : 'Idle'}</span>
        </div>

        <div className="h-32 overflow-y-auto space-y-1 font-mono text-[11px] pr-1 scrollbar-thin text-slate-700">
          <div>[{new Date().toLocaleTimeString()}] Bot initialized on {currentSymbol.name}.</div>
          {isBotRunning && (
            <div className="text-blue-600">[{new Date().toLocaleTimeString()}] Executing {botConfig.strategy} strategy...</div>
          )}
          {trades.length === 0 ? (
            <div className="text-slate-400 italic">No logs recorded yet.</div>
          ) : (
            trades.map((t) => (
              <div key={t.id} className={`${t.status === 'WIN' ? 'text-emerald-600 font-semibold' : 'text-rose-600 font-semibold'}`}>
                [{t.timestamp}] {t.symbolName} {t.type} (${t.stake}) → {t.status} ({t.profit >= 0 ? '+' : ''}${t.profit.toFixed(2)})
              </div>
            ))
          )}
          <div ref={consoleEndRef} />
        </div>
      </div>

    </div>
  );
};
