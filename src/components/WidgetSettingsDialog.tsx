import React from 'react';
import { X } from 'lucide-react';

/**
 * WidgetSettingsDialog Props Interface
 */
export interface WidgetSettingsDialogProps {
  /** Title for the settings dialog */
  title: string;
  /** Whether the dialog is currently open */
  isOpen: boolean;
  /** Callback when the dialog is closed */
  onClose: () => void;
  /** Dialog content */
  children: React.ReactNode;
  /** Optional footer content (e.g., save/cancel buttons) */
  footer?: React.ReactNode;
}

/**
 * WidgetSettingsDialog Component
 * 
 * A reusable dialog component for widget settings.
 * Provides a consistent UI for configuring widget settings across the application.
 */
const WidgetSettingsDialog: React.FC<WidgetSettingsDialogProps> = ({
  title,
  isOpen,
  onClose,
  children,
  footer,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md max-h-[90vh] overflow-hidden">
        {/* Dialog Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dialog Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-8rem)]">
          {children}
        </div>

        {/* Dialog Footer */}
        {footer && (
          <div className="p-4 border-t flex justify-end space-x-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default WidgetSettingsDialog;