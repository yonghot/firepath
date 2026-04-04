import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

const FIRE_COLORS: Record<string, string> = {
  lean: '#10B981',
  regular: '#2563EB',
  fat: '#7C3AED',
  coast: '#F59E0B',
  barista: '#EC4899',
};

const FIRE_LABELS: Record<string, string> = {
  lean: 'Lean',
  regular: 'Regular',
  fat: 'Fat',
  coast: 'Coast',
  barista: 'Barista',
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const types = ['lean', 'regular', 'fat', 'coast', 'barista'];
  const values = types.map((t) => ({
    type: t,
    age: searchParams.get(t) || '—',
    color: FIRE_COLORS[t],
    label: FIRE_LABELS[t],
  }));

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          background: '#065F53',
          color: 'white',
          padding: '60px',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' }}>
          <span style={{ fontSize: '40px' }}>🔥</span>
          <span style={{ fontSize: '36px', fontWeight: 'bold' }}>FIREPath</span>
        </div>

        <div style={{ fontSize: '24px', opacity: 0.8, marginBottom: '40px' }}>
          My FIRE Timeline
        </div>

        <div style={{ display: 'flex', gap: '20px', flex: 1 }}>
          {values.map((v) => (
            <div
              key={v.type}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                flex: 1,
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '16px',
                padding: '20px',
                borderTop: `4px solid ${v.color}`,
              }}
            >
              <span style={{ fontSize: '16px', opacity: 0.7, marginBottom: '8px' }}>
                {v.label} FIRE
              </span>
              <span style={{ fontSize: '48px', fontWeight: 'bold' }}>
                {v.age}
              </span>
              <span style={{ fontSize: '14px', opacity: 0.5 }}>years old</span>
            </div>
          ))}
        </div>

        <div style={{ fontSize: '14px', opacity: 0.5, marginTop: '24px', textAlign: 'center' }}>
          firepath.app — All FIRE types in one beautiful calculator
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
