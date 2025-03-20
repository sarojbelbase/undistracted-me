import React, { useState } from 'react';
import { Settings, X } from 'lucide-react';
import Widget from './Widget';

/**
 * BaseWidget Props Interface
 * Defines the standard properties that all widgets should receive
 */
export interface BaseWidgetProps {
  /** Unique identifier for the widget */
  id: string;
  /** Title to display in the widget header */
  title: string;
  /** Optional subtitle or description */
  subtitle?: string;
  /** Widget content */
  children: React.ReactNode;
  /** Whether the widget can be configured */
  hasSettings?: boolean;
  /** Callback when settings button is clicked */
  onSettingsClick?: () => void;
  /** Whether the widget can be toggled on/off */
  toggleable?: boolean;
  /** Whether the widget is currently enabled */
  enabled?: boolean;
  /** Callback when toggle state changes */
  onToggleChange?: (enabled: boolean) => void;
  /** Optional custom header content */
  headerContent?: React.ReactNode;
  /** Optional custom footer content */
  footerContent?: React.ReactNode;
  /** Optional additional CSS classes for the widget */
  className?: string;
}

/**
 * BaseWidget Component
 * 
 * A standardized widget component that provides consistent styling and behavior
 * for all widgets in the application. It includes:
 * - A title section with optional toggle functionality
 * - A settings button that can trigger a settings dialog
 * - A flexible content area for widget-specific content
 * - Consistent styling across all widgets
 * 
 * All widget components should extend or use this component to ensure UI consistency.
 */
const BaseWidget: React.FC<BaseWidgetProps> = ({
  id,
  title,
  subtitle,
  children,
  hasSettings = true,
  onSettingsClick,
  toggleable = false,
  enabled = true,
  onToggleChange,
  headerContent,
  footerContent,
  className = '',
}) => {
  const [isEnabled, setIsEnabled] = useState(enabled);

  const handleToggle = () => {
    const newState = !isEnabled;
    setIsEnabled(newState);
    if (onToggleChange) {
      onToggleChange(newState);
    }
  };

  return (
    <Widget>
      <div className={`flex flex-col h-full ${className} ${!isEnabled ? 'opacity-50' : ''}`}>
        {/* Widget Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
            {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
          </div>

          {headerContent}

          <div className="flex items-center space-x-2">
            {toggleable && (
              <button
                onClick={handleToggle}
                className={`w-10 h-5 rounded-full p-1 transition-colors duration-200 ease-in-out ${isEnabled ? 'bg-accent-4' : 'bg-gray-300'
                  }`}
              >
                <div
                  className={`w-3 h-3 rounded-full bg-white transform transition-transform duration-200 ease-in-out ${isEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                />
              </button>
            )}

            {hasSettings && (
              <button
                onClick={onSettingsClick}
                className="p-1 rounded-full hover:bg-gray-100 transition-colors duration-200"
                aria-label="Widget settings"
              >
                <Settings className="w-4 h-4 text-gray-500" />
              </button>
            )}
          </div>
        </div>

        {/* Widget Content */}
        <div className="flex-1 overflow-auto">
          {isEnabled ? children : (
            <div className="h-full flex items-center justify-center">
              <p className="text-gray-400">Widget disabled</p>
            </div>
          )}
        </div>

        {/* Widget Footer (if provided) */}
        {footerContent && (
          <div className="mt-4 pt-3 border-t border-gray-100">
            {footerContent}
          </div>
        )}
      </div>
    </Widget>
  );
};

export default BaseWidget;