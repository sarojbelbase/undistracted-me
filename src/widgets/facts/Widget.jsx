import { BaseWidget } from '../BaseWidget';
import { FACTS } from './facts';

const getDailyIndex = () => {
  const daysSinceEpoch = Math.floor(Date.now() / 86_400_000);
  return daysSinceEpoch % FACTS.length;
};

export const Widget = ({ onRemove }) => {
  const { text, category } = FACTS[getDailyIndex()];

  return (
    <BaseWidget className="p-5 flex flex-col justify-between" onRemove={onRemove}>
      <p
        className="leading-relaxed flex-1 flex items-center text-center"
        style={{ fontSize: '0.9375rem', color: 'var(--w-ink-2)', lineHeight: 1.65 }}
      >
        {text}
      </p>

      <div className="flex items-center mt-3 shrink-0">
        <span
          className="w-caption font-semibold px-2 py-0.5 rounded-full text-xs"
          style={{ backgroundColor: 'var(--w-accent)', color: 'var(--w-accent-fg)', opacity: 0.9 }}
        >
          {category}
        </span>
      </div>
    </BaseWidget>
  );
};
