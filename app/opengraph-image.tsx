import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Stocky - Interactive Stock Explorer';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
            marginBottom: '40px',
          }}
        >
          <div
            style={{
              width: '120px',
              height: '120px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              borderRadius: '30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '80px',
              color: 'white',
              fontWeight: 'bold',
            }}
          >
            $
          </div>
          <div
            style={{
              fontSize: '96px',
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
              backgroundClip: 'text',
              color: 'transparent',
              display: 'flex',
            }}
          >
            Stocky
          </div>
        </div>
        <div
          style={{
            fontSize: '36px',
            color: '#9ca3af',
            textAlign: 'center',
            maxWidth: '800px',
          }}
        >
          Track, compare, and explore stocks with a beautiful, interactive interface
        </div>
        <div
          style={{
            display: 'flex',
            gap: '16px',
            marginTop: '60px',
          }}
        >
          {['AAPL', 'TSLA', 'NVDA', 'GOOGL'].map((ticker) => (
            <div
              key={ticker}
              style={{
                padding: '12px 24px',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '2px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '999px',
                color: '#10b981',
                fontSize: '24px',
                fontWeight: 'bold',
                display: 'flex',
              }}
            >
              {ticker}
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
