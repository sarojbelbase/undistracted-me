// src/widgets/WidgetRegistry.ts

import { WidgetDefinition } from '../types/widgets';

/**
 * Widget Registry Class
 * 
 * Manages the registration and retrieval of widget definitions.
 * Provides a centralized system for adding new widgets to the application.
 */
class WidgetRegistry {
  private widgets: Map<string, WidgetDefinition> = new Map();

  /**
   * Register a new widget definition
   * @param widget The widget definition to register
   */
  register(widget: WidgetDefinition): void {
    if (this.widgets.has(widget.type)) {
      console.warn(`Widget type "${widget.type}" is already registered. Overwriting.`);
    }
    this.widgets.set(widget.type, widget);
  }

  /**
   * Get a widget definition by type
   * @param type The widget type to retrieve
   * @returns The widget definition or undefined if not found
   */
  getWidget(type: string): WidgetDefinition | undefined {
    return this.widgets.get(type);
  }

  /**
   * Get all registered widget definitions
   * @returns Array of all widget definitions
   */
  getAllWidgets(): WidgetDefinition[] {
    return Array.from(this.widgets.values());
  }

  /**
   * Get all registered widget definitions sorted by order
   * @returns Array of all widget definitions sorted by order
   */
  getSortedWidgets(): WidgetDefinition[] {
    return this.getAllWidgets().sort((a, b) => a.order - b.order);
  }
}

// Create a singleton instance
const widgetRegistry = new WidgetRegistry();

export default widgetRegistry;