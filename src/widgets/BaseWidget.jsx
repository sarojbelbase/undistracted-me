export const BaseWidget = ({
  children,
  className = '',
  onRemove = null,
  showRemove = false
}) => {
  return (
    <div className={`bg-white rounded-2xl shadow-md text-gray-900 relative flex flex-col overflow-hidden h-full ${className}`}>
      {showRemove && onRemove && (
        <button
          onClick={onRemove}
          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white transition-colors z-10 text-sm leading-none"
          title="Remove widget"
        >
          ×
        </button>
      )}
      {children}
    </div>
  );
};
