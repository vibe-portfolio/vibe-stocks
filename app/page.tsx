'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, TrendingUp, TrendingDown, Sparkles, Plus, GripVertical, Maximize2 } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import useEmblaCarousel from 'embla-carousel-react';
import AutoScroll from 'embla-carousel-auto-scroll';
import toast, { Toaster } from 'react-hot-toast';
import { cn, POPULAR_STOCKS, SEARCHABLE_STOCKS } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';

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
    [AutoScroll({ playOnInit: true, speed: 0.8 })]
  );
  const [tickerData, setTickerData] = useState<Record<string, { price: number; change: number; changePercent: number }>>({});

  useEffect(() => {
    const fetchPrices = async () => {
      const prices: Record<string, { price: number; change: number; changePercent: number }> = {};
      for (const stock of POPULAR_STOCKS) {
        try {
          const res = await fetch(`/api/stock?ticker=${stock.ticker}&period=1d`);
          if (res.ok) {
            const data = await res.json();
            const change = data.regularMarketPrice - data.chartPreviousClose;
            const changePercent = (change / data.chartPreviousClose) * 100;
            prices[stock.ticker] = {
              price: data.regularMarketPrice,
              change: change,
              changePercent: changePercent,
            };
          }
        } catch (e) {
          console.error(`Failed to fetch ${stock.ticker}`);
        }
      }
      setTickerData(prices);
    };
    fetchPrices();
    const interval = setInterval(fetchPrices, 60000); // Refresh every 60s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="border-b overflow-hidden bg-muted/30">
      <div className="embla py-3" ref={emblaRef}>
        <div className="embla__container flex gap-3">
          {POPULAR_STOCKS.map((stock) => {
            const data = tickerData[stock.ticker];
            const isPositive = data ? data.change >= 0 : true;
            
            // Get logo URL - use a more reliable service
            const getLogoUrl = (ticker: string) => {
              const logoMap: Record<string, string> = {
                'AAPL': 'https://logo.clearbit.com/apple.com',
                'MSFT': 'https://logo.clearbit.com/microsoft.com',
                'GOOGL': 'https://logo.clearbit.com/google.com',
                'AMZN': 'https://logo.clearbit.com/amazon.com',
                'TSLA': 'https://logo.clearbit.com/tesla.com',
                'NVDA': 'https://logo.clearbit.com/nvidia.com',
                'META': 'https://logo.clearbit.com/meta.com',
                'NFLX': 'https://logo.clearbit.com/netflix.com',
                'AMD': 'https://logo.clearbit.com/amd.com',
                'COIN': 'https://logo.clearbit.com/coinbase.com',
                'PLTR': 'https://logo.clearbit.com/palantir.com',
                'SPY': 'https://logo.clearbit.com/spglobal.com',
              };
              return logoMap[ticker] || `https://logo.clearbit.com/${ticker.toLowerCase()}.com`;
            };

            return (
              <motion.div
                key={stock.ticker}
                className="embla__slide flex-[0_0_auto]"
                whileHover={{ scale: 1.02 }}
              >
                <div className="flex items-center gap-2 px-3 py-2 bg-background rounded-full border shadow-sm">
                  <img
                    src={getLogoUrl(stock.ticker)}
                    alt={stock.ticker}
                    className="w-5 h-5 rounded-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20'><rect width='20' height='20' fill='%23666'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='white' font-size='10' font-weight='bold'>${stock.ticker[0]}</text></svg>`;
                    }}
                  />
                  <span className="font-mono font-bold text-sm">{stock.ticker}</span>
                  {data && (
                    <>
                      <span className="font-semibold text-sm">${data.price.toFixed(2)}</span>
                      <span className={cn(
                        "text-xs font-semibold flex items-center gap-0.5",
                        isPositive ? "text-emerald-500" : "text-red-500"
                      )}>
                        {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {isPositive ? '+' : ''}{data.changePercent.toFixed(2)}%
                      </span>
                    </>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Enhanced Search with Command Palette
function StockSearch({ onAddStock }: { onAddStock: (ticker: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  
  const placeholders = ['AAPL', 'TSLA', 'NVDA', 'GOOGL', 'MSFT', 'META', 'AMZN', 'COIN', 'PLTR', 'AMD'];

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const searchStocks = async () => {
      if (!query || query.length < 1) {
        setSearchResults([]);
        return;
      }

      setSearching(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (response.ok) {
          const results = await response.json();
          setSearchResults(results);
        }
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setSearching(false);
      }
    };

    const debounce = setTimeout(searchStocks, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  const filteredStocks = query ? searchResults : POPULAR_STOCKS.slice(0, 8).map(s => ({ ticker: s.ticker, name: s.name }));

  const handleSelect = (ticker: string) => {
    onAddStock(ticker);
    setOpen(false);
    setQuery('');
  };

  return (
    <div className="w-full max-w-3xl mx-auto relative">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
        <Input
          placeholder={placeholders[placeholderIndex]}
          className="pl-12 h-14 text-lg rounded-2xl shadow-lg border-2 focus-visible:shadow-xl transition-shadow"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
        />
        {query && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 p-0 z-10"
            onClick={() => {
              setQuery('');
              setOpen(false);
            }}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      <AnimatePresence>
        {open && filteredStocks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className="absolute top-full mt-2 w-full z-50"
          >
            <Card className="shadow-2xl border-2">
              <CardContent className="p-2 max-h-[400px] overflow-y-auto">
                <Command>
                  <CommandList>
                    <CommandEmpty>No stocks found.</CommandEmpty>
                    <CommandGroup heading={query ? 'Search Results' : 'Popular Stocks'}>
                      {filteredStocks.map((stock) => {
                        const logoMap: Record<string, string> = {
                          'AAPL': 'https://logo.clearbit.com/apple.com',
                          'MSFT': 'https://logo.clearbit.com/microsoft.com',
                          'GOOGL': 'https://logo.clearbit.com/google.com',
                          'AMZN': 'https://logo.clearbit.com/amazon.com',
                          'TSLA': 'https://logo.clearbit.com/tesla.com',
                          'NVDA': 'https://logo.clearbit.com/nvidia.com',
                          'META': 'https://logo.clearbit.com/meta.com',
                          'NFLX': 'https://logo.clearbit.com/netflix.com',
                          'AMD': 'https://logo.clearbit.com/amd.com',
                          'COIN': 'https://logo.clearbit.com/coinbase.com',
                          'PLTR': 'https://logo.clearbit.com/palantir.com',
                          'SPY': 'https://logo.clearbit.com/spglobal.com',
                        };
                        
                        return (
                          <CommandItem
                            key={stock.ticker}
                            onSelect={() => handleSelect(stock.ticker)}
                            className="flex items-center justify-between cursor-pointer py-3"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                                <img
                                  src={logoMap[stock.ticker] || `https://logo.clearbit.com/${stock.ticker.toLowerCase()}.com`}
                                  alt={stock.ticker}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.src = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'><rect width='40' height='40' fill='%23666'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='white' font-size='16' font-weight='bold'>${stock.ticker.slice(0, 2)}</text></svg>`;
                                  }}
                                />
                              </div>
                              <div>
                                <div className="font-semibold">{stock.ticker}</div>
                                <div className="text-sm text-muted-foreground truncate max-w-xs">{stock.name}</div>
                              </div>
                            </div>
                            <Plus className="w-4 h-4 text-muted-foreground" />
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Sortable Stock Card with shadcn components
function StockCard({ stock, onRemove, onExpand }: { stock: StockData; onRemove: () => void; onExpand: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: stock.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priceChange = stock.regularMarketPrice - stock.chartPreviousClose;
  const priceChangePercent = ((priceChange / stock.chartPreviousClose) * 100).toFixed(2);
  const isPositive = priceChange >= 0;

  const getLogoUrl = (ticker: string) => {
    const logoMap: Record<string, string> = {
      'AAPL': 'https://logo.clearbit.com/apple.com',
      'MSFT': 'https://logo.clearbit.com/microsoft.com',
      'GOOGL': 'https://logo.clearbit.com/google.com',
      'AMZN': 'https://logo.clearbit.com/amazon.com',
      'TSLA': 'https://logo.clearbit.com/tesla.com',
      'NVDA': 'https://logo.clearbit.com/nvidia.com',
      'META': 'https://logo.clearbit.com/meta.com',
      'NFLX': 'https://logo.clearbit.com/netflix.com',
      'AMD': 'https://logo.clearbit.com/amd.com',
      'COIN': 'https://logo.clearbit.com/coinbase.com',
      'PLTR': 'https://logo.clearbit.com/palantir.com',
      'SPY': 'https://logo.clearbit.com/spglobal.com',
    };
    return logoMap[ticker] || `https://logo.clearbit.com/${ticker.toLowerCase()}.com`;
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      whileHover={{ scale: 1.03, y: -6 }}
      className={cn(isDragging && 'opacity-50')}
    >
      <Card className="group cursor-pointer overflow-hidden border-2 hover:border-primary hover:shadow-2xl hover:shadow-primary/20 transition-all relative">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <img
                  src={getLogoUrl(stock.ticker)}
                  alt={stock.ticker}
                  className="w-10 h-10 rounded-lg object-cover"
                  onError={(e) => {
                    e.currentTarget.src = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'><rect width='40' height='40' fill='%23666'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='white' font-size='16' font-weight='bold'>${stock.ticker[0]}</text></svg>`;
                  }}
                />
                <div>
                  <CardTitle className="text-2xl">{stock.ticker}</CardTitle>
                  <CardDescription className="text-xs">{stock.name}</CardDescription>
                </div>
              </div>
            </div>
            <div className="flex gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      {...attributes}
                      {...listeners}
                    >
                      <GripVertical className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Drag to reorder</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4" onClick={onExpand}>
          <div>
            <div className="text-3xl font-bold mb-1">
              ${stock.regularMarketPrice.toFixed(2)}
            </div>
            <Badge variant={isPositive ? 'default' : 'destructive'} className="gap-1">
              {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {isPositive ? '+' : ''}{priceChange.toFixed(2)} ({priceChangePercent}%)
            </Badge>
          </div>

          <Separator />

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

          <Button variant="outline" size="sm" className="w-full gap-2">
            <Maximize2 className="w-4 h-4" />
            Expand
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Loading Skeleton
function StockCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-8 w-24 mb-2" />
        <Skeleton className="h-4 w-full" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-6 w-24" />
        <Separator />
        <Skeleton className="h-24 w-full" />
      </CardContent>
    </Card>
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
    if (stocks.some((s) => s.ticker === ticker)) {
      toast.error(`${ticker} is already in your watchlist`);
      return;
    }

    setLoading(ticker);
    try {
      const res = await fetch(`/api/stock?ticker=${ticker}&period=1y`);
      if (!res.ok) throw new Error('Failed to fetch');

      const data = await res.json();
      // Try to get company name from search results or use ticker
      let companyName = ticker;
      try {
        const searchRes = await fetch(`/api/search?q=${ticker}`);
        if (searchRes.ok) {
          const searchData = await searchRes.json();
          if (searchData.length > 0) {
            companyName = searchData[0].name;
          }
        }
      } catch (e) {
        // Use ticker as fallback
      }

      const newStock: StockData = {
        id: `${ticker}-${Date.now()}`,
        ticker: data.ticker,
        name: companyName,
        currency: data.currency,
        regularMarketPrice: data.regularMarketPrice,
        chartPreviousClose: data.chartPreviousClose,
        timestamps: data.timestamps,
        prices: data.prices,
      };

      setStocks((prev) => [...prev, newStock]);
    } catch (error) {
      toast.error(`Failed to add ${ticker}`);
    } finally {
      setLoading(null);
    }
  }, [stocks]);

  const removeStock = useCallback((id: string) => {
    setStocks((prev) => prev.filter((s) => s.id !== id));
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
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Toaster position="top-center" />

      {/* Ticker Carousel */}
      <TickerCarousel />

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Search Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <StockSearch onAddStock={addStock} />
        </motion.div>

        {/* Stock Grid */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            <StockCardSkeleton />
          </div>
        )}

        {stocks.length > 0 ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={stocks.map((s) => s.id)} strategy={rectSortingStrategy}>
              <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
        ) : null}
      </div>

      {/* Expanded Stock Dialog */}
      <Dialog open={!!expandedStock} onOpenChange={() => setExpandedStock(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {expandedStock && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <DialogTitle className="text-4xl mb-2">{expandedStock.ticker}</DialogTitle>
                    <DialogDescription className="text-base">{expandedStock.name}</DialogDescription>
                  </div>
                  <Badge variant="outline" className="text-sm">
                    {expandedStock.currency}
                  </Badge>
                </div>
              </DialogHeader>

              <div className="space-y-6">
                <div>
                  <div className="text-5xl font-bold mb-2">
                    ${expandedStock.regularMarketPrice.toFixed(2)}
                  </div>
                  <Badge
                    variant={expandedStock.regularMarketPrice >= expandedStock.chartPreviousClose ? 'default' : 'destructive'}
                    className="gap-2 text-base px-3 py-1"
                  >
                    {expandedStock.regularMarketPrice >= expandedStock.chartPreviousClose ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                    {expandedStock.regularMarketPrice >= expandedStock.chartPreviousClose ? '+' : ''}
                    {(expandedStock.regularMarketPrice - expandedStock.chartPreviousClose).toFixed(2)} (
                    {(((expandedStock.regularMarketPrice - expandedStock.chartPreviousClose) / expandedStock.chartPreviousClose) * 100).toFixed(2)}%)
                  </Badge>
                </div>

                <Separator />

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
                      font: { color: 'hsl(var(--foreground))' },
                      xaxis: { gridcolor: 'hsl(var(--border))', showgrid: true },
                      yaxis: { gridcolor: 'hsl(var(--border))', showgrid: true },
                      margin: { l: 50, r: 20, t: 20, b: 40 },
                    }}
                    config={{ displayModeBar: false, responsive: true }}
                    style={{ width: '100%', height: '100%' }}
                  />
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
