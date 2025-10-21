'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

type StockData = {
  ticker: string;
  currency: string;
  regularMarketPrice: number;
  chartPreviousClose: number;
  timestamps: number[];
  prices: number[];
};

const PERIODS = [
  { label: '1D', value: '1d' },
  { label: '5D', value: '5d' },
  { label: '1M', value: '1mo' },
  { label: '6M', value: '6mo' },
  { label: '1Y', value: '1y' },
  { label: '5Y', value: '5y' },
  { label: 'MAX', value: 'max' },
];

export default function Home() {
  const [ticker, setTicker] = useState('');
  const [period, setPeriod] = useState('1y');
  const [loading, setLoading] = useState(false);
  const [stockData, setStockData] = useState<StockData | null>(null);
  const [error, setError] = useState('');

  const fetchStockData = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/stock?ticker=${ticker.toUpperCase()}&period=${period}`);
      if (!response.ok) throw new Error('Failed to fetch');
      
      const data = await response.json();
      setStockData(data);
    } catch (err) {
      setError('Failed to fetch stock data. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const priceChange = stockData
    ? stockData.regularMarketPrice - stockData.chartPreviousClose
    : 0;
  const priceChangePercent = stockData
    ? ((priceChange / stockData.chartPreviousClose) * 100).toFixed(2)
    : '0.00';

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Search Bar */}
        <form onSubmit={fetchStockData} className="mb-8 flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            placeholder="Enter Ticker (e.g., AAPL, MSFT)"
            className="flex-1 bg-[#2d2e30] text-white placeholder-neutral-400 border border-neutral-600 rounded-lg p-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-3 rounded-lg transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Get Data
          </button>
        </form>

        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {stockData && (
          <div className="bg-[#1a1a1a] rounded-xl p-6 border border-neutral-800">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold mb-2">{stockData.ticker}</h1>
                <p className="text-sm text-neutral-400">Currency: {stockData.currency}</p>
              </div>
              <div className="text-right">
                <div className="flex items-baseline gap-2">
                  <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                  <span className="text-3xl sm:text-4xl font-bold">
                    {stockData.regularMarketPrice.toFixed(2)}
                  </span>
                  <span className="text-neutral-400 text-lg">{stockData.currency}</span>
                </div>
                <div className={`text-sm mt-1 ${priceChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)} ({priceChangePercent}%)
                </div>
              </div>
            </div>

            {/* Period Selector */}
            <div className="flex gap-2 mb-6 flex-wrap">
              {PERIODS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => {
                    setPeriod(p.value);
                    if (ticker) {
                      fetchStockData(new Event('submit') as any);
                    }
                  }}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    period === p.value
                      ? 'bg-emerald-600 text-white'
                      : 'bg-[#2d2e30] text-neutral-300 hover:bg-[#3d3e40]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Chart */}
            <div className="w-full h-[400px] sm:h-[500px]">
              <Plot
                data={[
                  {
                    x: stockData.timestamps.map((t) => new Date(t * 1000)),
                    y: stockData.prices,
                    type: 'scatter',
                    mode: 'lines',
                    fill: 'tozeroy',
                    fillcolor: 'rgba(16, 185, 129, 0.1)',
                    line: { color: '#10b981', width: 2 },
                    hovertemplate: '<b>%{y:.2f}</b><br>%{x}<extra></extra>',
                  },
                ]}
                layout={{
                  autosize: true,
                  paper_bgcolor: '#1a1a1a',
                  plot_bgcolor: '#1a1a1a',
                  font: { color: '#d4d4d4', family: 'Inter, sans-serif' },
                  xaxis: {
                    gridcolor: '#2d2e30',
                    showgrid: true,
                    zeroline: false,
                  },
                  yaxis: {
                    gridcolor: '#2d2e30',
                    showgrid: true,
                    zeroline: false,
                  },
                  margin: { l: 50, r: 20, t: 20, b: 40 },
                  hovermode: 'x unified',
                }}
                config={{
                  displayModeBar: false,
                  responsive: true,
                }}
                style={{ width: '100%', height: '100%' }}
              />
            </div>
          </div>
        )}

        {!stockData && !loading && (
          <div className="text-center text-neutral-500 mt-20">
            <p className="text-lg">Enter a stock ticker to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}
