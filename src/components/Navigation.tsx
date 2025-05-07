
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Dog } from 'lucide-react';

interface NavigationProps {
  className?: string;
}

const Navigation: React.FC<NavigationProps> = ({ className }) => {
  return (
    <nav className={cn("w-full py-4 px-6", className)}>
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-primary">
          <Dog className="h-8 w-8" />
          <span className="text-xl font-bold">Vettale</span>
        </Link>
        
        <div className="hidden md:flex items-center gap-8">
          <Link to="/" className="text-foreground hover:text-primary transition-colors">
            Início
          </Link>
          <Link to="/services" className="text-foreground hover:text-primary transition-colors">
            Serviços
          </Link>
          <Link to="/appointments" className="text-foreground hover:text-primary transition-colors">
            Meus Agendamentos
          </Link>
        </div>
        
        <div className="flex items-center gap-4">
          <Link to="/book">
            <Button>Agendar Tosa</Button>
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
