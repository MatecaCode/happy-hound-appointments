
import React from 'react';
import { cn } from '@/lib/utils';

interface BrandedLoadingProps {
  className?: string;
  message?: string;
}

export const BrandedLoading: React.FC<BrandedLoadingProps> = ({ 
  className,
  message = "Processando seu agendamento..."
}) => {
  return (
    <div className={cn("flex flex-col items-center justify-center space-y-6", className)}>
      {/* Animated Vettale Dog Face */}
      <div className="relative">
        {/* Main circle background */}
        <div className="w-24 h-24 bg-primary/10 rounded-full animate-pulse"></div>
        
        {/* Rotating border */}
        <div className="absolute inset-0 w-24 h-24 border-4 border-primary/20 rounded-full animate-spin border-t-primary"></div>
        
        {/* Dog face in center */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 bg-primary/90 rounded-full flex items-center justify-center animate-bounce">
            {/* Dog ears */}
            <div className="absolute -top-2 -left-1 w-3 h-4 bg-primary rounded-full transform -rotate-45"></div>
            <div className="absolute -top-2 -right-1 w-3 h-4 bg-primary rounded-full transform rotate-45"></div>
            
            {/* Dog face */}
            <div className="text-white text-2xl">🐕</div>
          </div>
        </div>
        
        {/* Floating paw prints */}
        <div className="absolute -top-8 -left-8 text-primary/60 animate-pulse">🐾</div>
        <div className="absolute -bottom-6 -right-6 text-primary/60 animate-pulse delay-300">🐾</div>
        <div className="absolute -top-4 -right-8 text-primary/60 animate-pulse delay-700">🐾</div>
      </div>

      {/* Loading message */}
      <div className="text-center space-y-2">
        <h3 className="text-xl font-semibold text-primary animate-fade-in">
          {message}
        </h3>
        <p className="text-muted-foreground animate-fade-in delay-300">
          Aguarde enquanto confirmamos sua solicitação
        </p>
        
        {/* Animated dots */}
        <div className="flex justify-center space-x-1 mt-4">
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce delay-100"></div>
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce delay-200"></div>
        </div>
      </div>
    </div>
  );
};
