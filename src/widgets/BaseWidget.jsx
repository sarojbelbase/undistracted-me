import React from 'react';

export const BaseWidget = ({ 
  children, 
  className = '', 
  onRemove = null,
  showRemove = false 
}) => {
  return (
    <div className={`bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl shadow-xl text-white relative flex flex-col overflow-hidden h-full ${className}`}>
      {showRemove && onRemove && (
        <button
          onClick={onRemove}
          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500/80 hover:bg-red-600 flex items-center justify-center text-white transition-colors z-10"
          title="Remove widget"
        >
          ×
        </button>
      )}
      {children}
    </div>
  );
};
