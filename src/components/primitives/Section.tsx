import React from 'react';

interface SectionProps {
  className?: string;
  children: React.ReactNode;
  [key: string]: any;
}

export const Section = ({ 
  className = "", 
  children,
  ...props 
}: SectionProps) => {
  return (
    <section 
      className={`py-16 md:py-24 ${className}`} 
      {...props}
    >
      {children}
    </section>
  );
};
