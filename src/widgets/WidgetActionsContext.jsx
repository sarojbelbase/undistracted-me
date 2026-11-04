import { createContext } from "react";

/**
 * Per-widget-instance actions for BaseWidget's "⋯" menu.
 *
 * Widget components render `<BaseWidget ... onRemove={onRemove}>` but do not
 * pass their own `id` down to BaseWidget. Rather than threading `id` through
 * all 17 widget components, WidgetGrid wraps each rendered widget in this
 * context so BaseWidget can offer "Duplicate" and "Pin to top" without any
 * widget component changing.
 *
 * Shape: { id, duplicate, pin } — all null by default so BaseWidget is inert
 * (and safe) anywhere a provider is absent.
 */
export const WidgetActionsContext = createContext({
  id: null,
  duplicate: null,
  pin: null,
});

WidgetActionsContext.displayName = "WidgetActionsContext";
