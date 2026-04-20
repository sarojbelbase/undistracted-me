import { FOCUS_THEME, FM_STOCK_UP, FM_STOCK_DOWN, FM_STOCK_UP_BG, FM_STOCK_DOWN_BG } from '../theme';
import { priceStats, fmtPrice } from '../../../widgets/stock/utils';

const SHIMMER = {
  background: 'linear-gradient(90deg, rgba(255,255,255,0.06) 25%, rgba(255,255,255,0.14) 50%, rgba(255,255,255,0.06) 75%)',
  backgroundSize: '200% 100%',
  animation: 'fmShimmer 1.4s ease 3',
  borderRadius: 4,
};

export const StockPanel = ({ stocks }) => {
  const t = FOCUS_THEME;
  return (
    <div style={{ ...t.card, padding: '13px 16px' }}>
      <div style={{ fontSize: 8, letterSpacing: '0.13em', textTransform: 'uppercase', color: t.label, fontWeight: 700, marginBottom: 9 }}>
        {stocks.length >= 2 ? 'Watchlist' : 'Stocks'}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {stocks.map(({ sym, data }) => {
          const stats = data && data !== 'error' ? priceStats(data) : null;
          const isUp = stats?.dir === 'up';
          const isDown = stats?.dir === 'down';
          let clr = t.sub;
          if (isUp) clr = FM_STOCK_UP;
          else if (isDown) clr = FM_STOCK_DOWN;
          let changeBg = 'transparent';
          if (isUp) changeBg = FM_STOCK_UP_BG;
          else if (isDown) changeBg = FM_STOCK_DOWN_BG;
          const changeArrow = isUp ? '↑' : '';
          const changeArrowDown = !isUp && isDown ? '↓' : '';
          return (
            <div key={sym} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--w-accent)', letterSpacing: '0.06em' }}>{sym}</span>
              {data === null ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ ...SHIMMER, width: 44, height: 10 }} />
                  <div style={{ ...SHIMMER, width: 32, height: 10 }} />
                </div>
              ) : data === 'error' ? (
                <span style={{ fontSize: 10, color: t.label }}>—</span>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: t.text, fontVariantNumeric: 'tabular-nums' }}>
                    {fmtPrice(data.ltp)}
                  </span>
                  {stats && (
                    <span style={{
                      fontSize: 9, color: clr, fontWeight: 700,
                      background: changeBg,
                      padding: '1px 5px', borderRadius: 4,
                    }}>
                      {changeArrow}{changeArrowDown} {Math.abs(stats.pct).toFixed(1)}%
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
