'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, TrendingUp, Sparkles, Plus } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import useEmblaCarousel from 'embla-carousel-react';
import AutoScroll from 'embla-carousel-auto-scroll';
import toast, { Toaster } from 'react-hot-toast';
import { cn, POPULAR_STOCKS, SEARCHABLE_STOCKS } from '@/lib/utils';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

type StockData = {
  id: string;
  ticker: string;
  name: string;
  currency: string;
  regularMarketPrice: number;
  chartPreviousClose: number;
  timestamps: number[];
  prices: number[];
};

// Ticker Carousel Component
function TickerCarousel() {
  const [emblaRef] = useEmblaCarousel(
    { loop: true, dragFree: true },
    [AutoScroll({ playOnInit: true, speed: 1 })]
  );
  const [tickerData, setTickerData] = useState<Record<string, number>>({});

  useEffect(() => {
    // Fetch prices for popular stocks
    const fetchPrices = async () => {
      const prices: Record<string, number> = {};
      for (const stock of POPULAR_STOCKS) {
        try {
          const res = await fetch(`/api/stock?ticker=${stock.ticker}&period=1d`);
          if (res.ok) {
            const data = await res.json();
            prices[stock.ticker] = data.regularMarketPrice;
          }
        } catch (e) {
          console.error(`Failed to fetch ${stock.ticker}`);
        }
      }
      setTickerData(prices);
    };
    fetchPrices();
  }, []);

  return (
    <div className="overflow-hidden py-4 border-b border-white/5 bg-gradient-to-r from-emerald-500/5 via-transparent to-emerald-500/5">
      <div className="embla" ref={emblaRef}>
        <div className="embla__container flex gap-8">
          {POPULAR_STOCKS.map((stock) => {
            const price = tickerData[stock.ticker];
            return (
              <motion.div
                key={stock.ticker}
                className="embla__slide flex-[0_0_auto] flex items-center gap-3 px-4"
                whileHover={{ scale: 1.05 }}
              >
                <span className="text-emerald-400 font-bold text-sm">{stock.ticker}</span>
                {price && (
                  <span className="text-white font-semibold">${price.toFixed(2)}</span>
                )}
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Search Component with Autocomplete
function SearchBar({ onAddStock }: { onAddStock: (ticker: string) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<typeof SEARCHABLE_STOCKS>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (query.length > 0) {
      const filtered = SEARCHABLE_STOCKS.filter(
        (stock) =>
          stock.ticker.toLowerCase().includes(query.toLowerCase()) ||
          stock.name.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8);
      setResults(filtered);
      setIsOpen(true);
    } else {
      setResults([]);
      setIsOpen(false);
    }
  }, [query]);

  const handleSelect = (ticker: string) => {
    onAddStock(ticker);
    setQuery('');
    setIsOpen(false);
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative"
      >
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search stocks... (e.g., AAPL, Tesla)"
          className="w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </motion.div>

      <AnimatePresence>
        {isOpen && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full mt-2 w-full bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl shadow-emerald-500/10 z-50"
          >
            {results.map((stock, index) => (
              <motion.button
                key={stock.ticker}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleSelect(stock.ticker)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                    <span className="text-emerald-400 font-bold text-sm">{stock.ticker.slice(0, 2)}</span>
                  </div>
                  <div className="text-left">
                    <div className="text-white font-semibold">{stock.ticker}</div>
                    <div className="text-neutral-400 text-sm">{stock.name}</div>
                  </div>
                </div>
                <Plus className="w-5 h-5 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Sortable Stock Card
function StockCard({ stock, onRemove, onExpand }: { stock: StockData; onRemove: () => void; onExpand: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: stock.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priceChange = stock.regularMarketPrice - stock.chartPreviousClose;
  const priceChangePercent = ((priceChange / stock.chartPreviousClose) * 100).toFixed(2);
  const isPositive = priceChange >= 0;

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      whileHover={{ scale: 1.02, y: -4 }}
      className={cn(
        'relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 cursor-pointer group',
        isDragging && 'opacity-50 scale-105 rotate-3'
      )}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 right-2 p-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
      >
        <div className="w-6 h-1 bg-white/20 rounded-full mb-1" />
        <div className="w-6 h-1 bg-white/20 rounded-full" />
      </div>

      {/* Remove Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="absolute top-2 left-2 p-2 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20 rounded-lg"
      >
        <X className="w-4 h-4 text-red-400" />
      </button>

      <div onClick={onExpand} className="space-y-4">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-2xl font-bold text-white">{stock.ticker}</h3>
            <Sparkles className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-sm text-neutral-400 truncate">{stock.name}</p>
        </div>

        {/* Price */}
        <div>
          <div className="text-3xl font-bold text-white mb-1">
            ${stock.regularMarketPrice.toFixed(2)}
          </div>
          <div className={cn('text-sm font-semibold', isPositive ? 'text-emerald-500' : 'text-red-500')}>
            {isPositive ? '+' : ''}{priceChange.toFixed(2)} ({priceChangePercent}%)
          </div>
        </div>

        {/* Mini Chart */}
        <div className="h-24 -mx-2">
          <Plot
            data={[
              {
                x: stock.timestamps.map((t) => new Date(t * 1000)),
                y: stock.prices,
                type: 'scatter',
                mode: 'lines',
                fill: 'tozeroy',
                fillcolor: isPositive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                line: { color: isPositive ? '#10b981' : '#ef4444', width: 2 },
              },
            ]}
            layout={{
              autosize: true,
              paper_bgcolor: 'transparent',
              plot_bgcolor: 'transparent',
              margin: { l: 0, r: 0, t: 0, b: 0 },
              xaxis: { visible: false },
              yaxis: { visible: false },
              showlegend: false,
            }}
            config={{ displayModeBar: false, responsive: true }}
            style={{ width: '100%', height: '100%' }}
          />
        </div>
      </div>
    </motion.div>
  );
}

// Main Page Component
export default function Home() {
  const [stocks, setStocks] = useState<StockData[]>([]);
  const [expandedStock, setExpandedStock] = useState<StockData | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const addStock = useCallback(async (ticker: string) => {
    // Check if already added
    if (stocks.some((s) => s.ticker === ticker)) {
      toast.error(`${ticker} is already in your watchlist`);
      return;
    }

    setLoading(ticker);
    try {
      const res = await fetch(`/api/stock?ticker=${ticker}&period=1y`);
      if (!res.ok) throw new Error('Failed to fetch');

      const data = await res.json();
      const newStock: StockData = {
        id: `${ticker}-${Date.now()}`,
        ticker: data.ticker,
        name: SEARCHABLE_STOCKS.find((s) => s.ticker === ticker)?.name || ticker,
        currency: data.currency,
        regularMarketPrice: data.regularMarketPrice,
        chartPreviousClose: data.chartPreviousClose,
        timestamps: data.timestamps,
        prices: data.prices,
      };

      setStocks((prev) => [...prev, newStock]);
      toast.success(`Added ${ticker} to watchlist`);
    } catch (error) {
      toast.error(`Failed to add ${ticker}`);
    } finally {
      setLoading(null);
    }
  }, [stocks]);

  const removeStock = useCallback((id: string) => {
    setStocks((prev) => prev.filter((s) => s.id !== id));
    toast.success('Removed from watchlist');
  }, []);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setStocks((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <Toaster position="top-center" />

      {/* Ticker Carousel */}
      <TickerCarousel />

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl md:text-7xl font-bold mb-4 bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600 bg-clip-text text-transparent">
            Stock Explorer
          </h1>
          <p className="text-neutral-400 text-lg mb-8">
            Track, compare, and explore stocks with a beautiful interface
          </p>
          <SearchBar onAddStock={addStock} />
        </motion.div>

        {/* Stock Grid */}
        {stocks.length > 0 ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={stocks.map((s) => s.id)} strategy={rectSortingStrategy}>
              <motion.div
                layout
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                <AnimatePresence>
                  {stocks.map((stock) => (
                    <StockCard
                      key={stock.id}
                      stock={stock}
                      onRemove={() => removeStock(stock.id)}
                      onExpand={() => setExpandedStock(stock)}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            </SortableContext>
          </DndContext>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <Search className="w-10 h-10 text-emerald-500" />
            </div>
            <p className="text-neutral-400 text-lg">
              Search for a stock to get started
            </p>
          </motion.div>
        )}
      </div>

      {/* Expanded Stock Modal */}
      <AnimatePresence>
        {expandedStock && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setExpandedStock(null)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#1a1a1a] border border-white/10 rounded-3xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-4xl font-bold mb-2">{expandedStock.ticker}</h2>
                  <p className="text-neutral-400">{expandedStock.name}</p>
                </div>
                <button
                  onClick={() => setExpandedStock(null)}
                  className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="mb-6">
                <div className="text-5xl font-bold mb-2">
                  ${expandedStock.regularMarketPrice.toFixed(2)}
                </div>
                <div className={cn(
                  'text-xl font-semibold',
                  expandedStock.regularMarketPrice >= expandedStock.chartPreviousClose
                    ? 'text-emerald-500'
                    : 'text-red-500'
                )}>
                  {expandedStock.regularMarketPrice >= expandedStock.chartPreviousClose ? '+' : ''}
                  {(expandedStock.regularMarketPrice - expandedStock.chartPreviousClose).toFixed(2)} (
                  {(((expandedStock.regularMarketPrice - expandedStock.chartPreviousClose) / expandedStock.chartPreviousClose) * 100).toFixed(2)}%)
                </div>
              </div>

              <div className="h-96">
                <Plot
                  data={[
                    {
                      x: expandedStock.timestamps.map((t) => new Date(t * 1000)),
                      y: expandedStock.prices,
                      type: 'scatter',
                      mode: 'lines',
                      fill: 'tozeroy',
                      fillcolor: 'rgba(16, 185, 129, 0.1)',
                      line: { color: '#10b981', width: 3 },
                    },
                  ]}
                  layout={{
                    autosize: true,
                    paper_bgcolor: 'transparent',
                    plot_bgcolor: 'transparent',
                    font: { color: '#d4d4d4' },
                    xaxis: { gridcolor: '#2d2e30', showgrid: true },
                    yaxis: { gridcolor: '#2d2e30', showgrid: true },
                    margin: { l: 50, r: 20, t: 20, b: 40 },
                  }}
                  config={{ displayModeBar: false, responsive: true }}
                  style={{ width: '100%', height: '100%' }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
