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
  const [tickerData, setTickerData] = useState<Record<string, { price: number; change: number }>>({});

  useEffect(() => {
    const fetchPrices = async () => {
      const prices: Record<string, { price: number; change: number }> = {};
      for (const stock of POPULAR_STOCKS) {
        try {
          const res = await fetch(`/api/stock?ticker=${stock.ticker}&period=1d`);
          if (res.ok) {
            const data = await res.json();
            const change = data.regularMarketPrice - data.chartPreviousClose;
            prices[stock.ticker] = {
              price: data.regularMarketPrice,
              change: change,
            };
          }
        } catch (e) {
          console.error(`Failed to fetch ${stock.ticker}`);
        }
      }
      setTickerData(prices);
    };
    fetchPrices();
    const interval = setInterval(fetchPrices, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="border-b bg-gradient-to-r from-emerald-500/5 via-transparent to-emerald-500/5">
      <div className="embla py-3" ref={emblaRef}>
        <div className="embla__container flex gap-6">
          {POPULAR_STOCKS.map((stock) => {
            const data = tickerData[stock.ticker];
            const isPositive = data ? data.change >= 0 : true;
            return (
              <motion.div
                key={stock.ticker}
                className="embla__slide flex-[0_0_auto] flex items-center gap-2 px-3"
                whileHover={{ scale: 1.05 }}
              >
                <Badge variant="outline" className="font-mono font-bold">
                  {stock.ticker}
                </Badge>
                {data && (
                  <>
                    <span className="font-semibold">${data.price.toFixed(2)}</span>
                    <Badge variant={isPositive ? 'default' : 'destructive'} className="gap-1">
                      {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {isPositive ? '+' : ''}{data.change.toFixed(2)}
                    </Badge>
                  </>
                )}
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

  const filteredStocks = query
    ? SEARCHABLE_STOCKS.filter(
        (stock) =>
          stock.ticker.toLowerCase().includes(query.toLowerCase()) ||
          stock.name.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 10)
    : POPULAR_STOCKS.slice(0, 6);

  const handleSelect = (ticker: string) => {
    onAddStock(ticker);
    setOpen(false);
    setQuery('');
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search stocks... (e.g., AAPL, Tesla)"
          className="pl-10 h-12 text-base"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
        {query && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
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
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full mt-2 w-full max-w-2xl z-50"
          >
            <Card>
              <CardContent className="p-2">
                <Command>
                  <CommandList>
                    <CommandEmpty>No stocks found.</CommandEmpty>
                    <CommandGroup heading={query ? 'Search Results' : 'Popular Stocks'}>
                      {filteredStocks.map((stock) => (
                        <CommandItem
                          key={stock.ticker}
                          onSelect={() => handleSelect(stock.ticker)}
                          className="flex items-center justify-between cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <span className="font-bold text-sm text-primary">{stock.ticker.slice(0, 2)}</span>
                            </div>
                            <div>
                              <div className="font-semibold">{stock.ticker}</div>
                              <div className="text-sm text-muted-foreground">{stock.name}</div>
                            </div>
                          </div>
                          <Plus className="w-4 h-4 text-muted-foreground" />
                        </CommandItem>
                      ))}
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

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      whileHover={{ scale: 1.02, y: -4 }}
      className={cn(isDragging && 'opacity-50 scale-105 rotate-2')}
    >
      <Card className="group cursor-pointer overflow-hidden border-2 hover:border-primary/50 transition-all">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <CardTitle className="text-2xl">{stock.ticker}</CardTitle>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Sparkles className="w-4 h-4 text-primary" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Live data</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <CardDescription className="text-xs truncate">{stock.name}</CardDescription>
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
      toast.success(`Added ${ticker} to watchlist`, {
        icon: '📈',
        style: {
          borderRadius: '10px',
          background: '#333',
          color: '#fff',
        },
      });
    } catch (error) {
      toast.error(`Failed to add ${ticker}`);
    } finally {
      setLoading(null);
    }
  }, [stocks]);

  const removeStock = useCallback((id: string) => {
    setStocks((prev) => prev.filter((s) => s.id !== id));
    toast.success('Removed from watchlist', {
      icon: '🗑️',
      style: {
        borderRadius: '10px',
        background: '#333',
        color: '#fff',
      },
    });
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
      <div className="container mx-auto px-4 py-12">
        {/* Search Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
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
