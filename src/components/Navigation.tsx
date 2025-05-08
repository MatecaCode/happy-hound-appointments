
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { UserCircle, ShoppingCart } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface NavigationProps {
  className?: string;
}

const Navigation: React.FC<NavigationProps> = ({ className }) => {
  const { user, signOut } = useAuth();
  const userRole = user?.user_metadata?.role || 'client';
  
  return (
    <nav className={cn("w-full py-4 px-6", className)}>
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-primary">
          <img src="/logo-vettale.png" alt="Vettale Logo" className="h-10" />
          <span className="text-xl font-bold">Vettale</span>
        </Link>
        
        <div className="hidden md:flex items-center gap-8">
          <Link to="/" className="text-foreground hover:text-primary transition-colors">
            Início
          </Link>
          <Link to="/services" className="text-foreground hover:text-primary transition-colors">
            Serviços
          </Link>
          <Link to="/shop" className="text-foreground hover:text-primary transition-colors">
            Loja
          </Link>
          <Link to="/about" className="text-foreground hover:text-primary transition-colors">
            Sobre Nós
          </Link>
          {user && userRole === 'client' && (
            <Link to="/appointments" className="text-foreground hover:text-primary transition-colors">
              Meus Agendamentos
            </Link>
          )}
          {user && userRole === 'groomer' && (
            <Link to="/groomer-calendar" className="text-foreground hover:text-primary transition-colors">
              Calendário de Tosas
            </Link>
          )}
          {user && userRole === 'vet' && (
            <Link to="/vet-calendar" className="text-foreground hover:text-primary transition-colors">
              Calendário Veterinário
            </Link>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          {user && (
            <Link to="/cart" className="flex items-center">
              <Button variant="ghost" size="icon">
                <ShoppingCart className="h-5 w-5" />
              </Button>
            </Link>
          )}
          
          {user ? (
            <div className="flex items-center gap-4">
              <Link to="/profile" className="flex items-center gap-2">
                <UserCircle className="h-5 w-5" />
                <span className="hidden md:inline">
                  {user.user_metadata?.name || user.email?.split('@')[0] || 'Perfil'} 
                  {userRole !== 'client' && ` (${userRole === 'vet' ? 'Veterinário' : 'Tosador'})`}
                </span>
              </Link>
              <Button variant="outline" onClick={() => signOut()} size="sm">Sair</Button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Link to="/login">
                <Button variant="outline" size="sm">Entrar</Button>
              </Link>
              <Link to="/register">
                <Button size="sm">Registrar</Button>
              </Link>
            </div>
          )}
          <Link to="/book">
            <Button>Agendar</Button>
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
