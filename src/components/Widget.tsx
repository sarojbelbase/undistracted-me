import React from 'react';

const Widget: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="bg-white rounded-3xl shadow-sm p-6 h-full w-full overflow-hidden">
      {children}
    </div>
  );
};

export default Widget;