import React from 'react';

interface WidgetProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Widget Component
 * 
 * Base container for all widgets with consistent styling.
 * Implements the squircle shape with proper shadow and padding.
 */
const Widget: React.FC<WidgetProps> = ({ children, className = '' }) => {
  return (
    <div
      className={`
        bg-white dark:bg-gray-800 
        rounded-3xl shadow-sm 
        p-6 h-full w-full 
        overflow-hidden
        border border-gray-100 dark:border-gray-700
        transition-colors duration-200
        ${className}
      `}
      style={{
        // Squircle shape using border-radius
        borderRadius: '2rem',
      }}
    >
      {children}
    </div>
  );
};

export default Widget;