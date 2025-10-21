import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');

  if (!query || query.length < 1) {
    return NextResponse.json([]);
  }

  try {
    // Use Yahoo Finance search API
    const response = await fetch(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to search');
    }

    const data = await response.json();
    
    // Extract and format results
    const results = data.quotes
      .filter((quote: any) => quote.quoteType === 'EQUITY' || quote.quoteType === 'ETF')
      .map((quote: any) => ({
        ticker: quote.symbol,
        name: quote.longname || quote.shortname || quote.symbol,
        exchange: quote.exchange,
        type: quote.quoteType,
      }))
      .slice(0, 10);

    return NextResponse.json(results);
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json([]);
  }
}
