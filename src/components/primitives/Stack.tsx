import React from 'react';

interface StackProps {
  as?: keyof JSX.IntrinsicElements;
  gap?: '2' | '3' | '4' | '5' | '6' | '8' | '10' | '12';
  className?: string;
  children: React.ReactNode;
  [key: string]: any;
}

export function Stack({ 
  as: Comp = "div", 
  gap = "6", 
  className = "", 
  children,
  ...props 
}: StackProps) {
  return (
    <Comp 
      className={`flex flex-col gap-${gap} ${className}`} 
      {...props}
    >
      {children}
    </Comp>
  );
}
