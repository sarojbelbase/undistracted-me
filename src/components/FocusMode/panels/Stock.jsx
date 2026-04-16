import { FOCUS_THEME } from '../theme';
import { priceStats, fmtPrice } from '../../../widgets/stock/utils';

export const StockPanel = ({ stocks }) => {
  const t = FOCUS_THEME;
  return (
    <div style={{ ...t.card, padding: '13px 16px' }}>
      <div style={{ fontSize: 8, letterSpacing: '0.13em', textTransform: 'uppercase', color: t.label, fontWeight: 700, marginBottom: 9 }}>
        {stocks.length >= 2 ? 'Watchlist' : 'Stocks'}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {stocks.map(({ sym, data }) => {
          const stats = data ? priceStats(data) : null;
          const isUp = stats?.dir === 'up';
          const isDown = stats?.dir === 'down';
          const clr = !stats ? t.sub : isUp ? '#4ade80' : isDown ? '#f87171' : t.sub;
          return (
            <div key={sym} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--w-accent)', letterSpacing: '0.06em' }}>{sym}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: t.text, fontVariantNumeric: 'tabular-nums' }}>
                  {data ? fmtPrice(data.ltp) : '—'}
                </span>
                {stats && (
                  <span style={{
                    fontSize: 9, color: clr, fontWeight: 700,
                    background: isUp ? 'rgba(74,222,128,0.12)' : isDown ? 'rgba(248,113,113,0.12)' : 'transparent',
                    padding: '1px 5px', borderRadius: 4,
                  }}>
                    {isUp ? '↑' : isDown ? '↓' : ''} {Math.abs(stats.pct).toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
