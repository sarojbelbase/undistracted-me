import { useState, useRef, useCallback } from 'react';
import { WalletFill, XLg, CashStack } from 'react-bootstrap-icons';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Popup } from '../../components/ui/Popup';
import { DEFAULT_CATEGORIES } from './useExpenses';

export function AddExpenseModal({ currencySymbol, onClose, onAdd, editing }) {
  const isEditing = Boolean(editing);
  const [amount, setAmount] = useState(editing ? String(editing.amount) : '');
  const [cat, setCat] = useState(editing?.category ?? 'food');
  const [note, setNote] = useState(editing?.note ?? '');
  const [hoveredCat, setHoveredCat] = useState(null);
  const [hoverAnchor, setHoverAnchor] = useState(null);
  const inputRef = useRef(null);

  const canAdd = amount && Number.parseFloat(amount) > 0;

  const handleAdd = () => {
    const val = Number.parseFloat(amount);
    if (!val || val <= 0) return;
    const trimmedNote = note.trim();
    onAdd({
      amount: val,
      category: cat,
      note: trimmedNote, // empty string signals "no note"; addExpense/updateExpense omit it
      ...(isEditing ? { id: editing.id } : {}),
    });
    onClose();
  };

  const handleCatEnter = useCallback((c, el) => {
    setHoveredCat(c);
    setHoverAnchor(el.getBoundingClientRect());
  }, []);

  const handleCatLeave = useCallback(() => {
    setHoveredCat(null);
    setHoverAnchor(null);
  }, []);

  return (
    <Modal onClose={onClose} style={{ width: 380 }} ariaLabel={isEditing ? 'Edit Expense' : 'Add Expense'}>
      {/* Header */}
      <div className="exp-add-modal__header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="exp-add-modal__header-icon">
            <CashStack size={14} />
          </div>
          <div>
            <div className="w-heading" style={{ fontSize: '15px' }}>{isEditing ? 'Edit Expense' : 'Add Expense'}</div>
            <div className="w-caption" style={{ marginTop: 1 }}>{isEditing ? 'Update this expense' : 'Log a new expense'}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="w-7 h-7 flex items-center justify-center rounded-lg shrink-0 transition-colors btn-close cursor-pointer focus:outline-none"
          style={{ color: 'var(--w-ink-3)' }}
        >
          <XLg size={11} />
        </button>
      </div>

      <div className="exp-add-modal__divider" />

      {/* Body */}
      <div className="exp-add-modal__body">
        {/* Amount */}
        <Input pill
          ref={inputRef}
          type="number"
          min="0"
          step="0.01"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && canAdd) handleAdd(); }}
          prefix={currencySymbol}
          gap={6}
          wrapperStyle={{ height: 48 }}
          style={{ fontSize: '18px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
        />

        {/* Category */}
        <div>
          <div className="exp-add-modal__cat-label">
            <WalletFill size={10} />
            <span className="w-label">Category</span>
          </div>
          <div className="exp-cat-grid">
            {DEFAULT_CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCat(c.id)}
                onMouseEnter={(e) => handleCatEnter(c, e.currentTarget)}
                onMouseLeave={handleCatLeave}
                className={`exp-cat-grid__item${cat === c.id ? ' exp-cat-grid__item--active' : ''}`}
              >
                <div className="exp-cat-grid__icon">
                  <c.Icon size={12} />
                </div>
                <span className="exp-cat-grid__label">{c.label}</span>
              </button>
            ))}
          </div>

          {/* Category tooltip */}
          <Popup anchor={hoverAnchor}>
            <span style={{ fontSize: '0.6875rem', fontWeight: 500, color: 'var(--w-ink-2)', whiteSpace: 'nowrap' }}>
              {hoveredCat?.description}
            </span>
          </Popup>
        </div>

        {/* Note */}
        <Input pill
          type="text"
          placeholder="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && canAdd) handleAdd(); }}
          wrapperStyle={{ height: 40 }}
        />
      </div>

      {/* Footer */}
      <div className="exp-add-modal__divider" />
      <div className="exp-add-modal__footer">
        <button type="button" onClick={onClose} className="exp-add-modal__cancel-btn">
          Cancel
        </button>
        <button
          type="button"
          onClick={handleAdd}
          disabled={!canAdd}
          className="exp-add-modal__add-btn"
        >
          {isEditing ? 'Save Changes' : 'Add Expense'}
        </button>
      </div>
    </Modal>
  );
}