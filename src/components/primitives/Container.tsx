import React from 'react';

interface ContainerProps {
  className?: string;
  children: React.ReactNode;
  [key: string]: any;
}

export const Container = ({ 
  className = "", 
  children,
  ...props 
}: ContainerProps) => {
  return (
    <div 
      className={`mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 ${className}`} 
      {...props}
    >
      {children}
    </div>
  );
};
