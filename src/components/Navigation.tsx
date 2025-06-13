
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, ChevronDown, Settings, Shield } from 'lucide-react';

const Navigation = () => {
  const location = useLocation();
  const { user, signOut, isAdmin, isClient, isGroomer, isVet, userRole } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  const renderNavLinks = () => {
    // Show admin-specific navigation
    if (isAdmin) {
      return (
        <>
          <Link 
            to="/admin" 
            className={`text-sm font-medium transition-colors hover:text-primary ${
              isActive('/admin') ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            Painel Admin
          </Link>
          <Link 
            to="/status-center" 
            className={`text-sm font-medium transition-colors hover:text-primary ${
              isActive('/status-center') ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            Centro de Status
          </Link>
        </>
      );
    }

    // Show groomer-specific navigation
    if (isGroomer) {
      return (
        <>
          <Link 
            to="/groomer-dashboard" 
            className={`text-sm font-medium transition-colors hover:text-primary ${
              isActive('/groomer-dashboard') || isActive('/groomer-calendar') || isActive('/groomer-schedule') ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            Meu Painel
          </Link>
          <Link 
            to="/status-center" 
            className={`text-sm font-medium transition-colors hover:text-primary ${
              isActive('/status-center') ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            Status dos Serviços
          </Link>
        </>
      );
    }

    // Show vet-specific navigation
    if (isVet) {
      return (
        <>
          <Link 
            to="/vet-calendar" 
            className={`text-sm font-medium transition-colors hover:text-primary ${
              isActive('/vet-calendar') ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            Consultas
          </Link>
          <Link 
            to="/status-center" 
            className={`text-sm font-medium transition-colors hover:text-primary ${
              isActive('/status-center') ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            Status dos Serviços
          </Link>
        </>
      );
    }

    // Default client navigation
    return (
      <>
        <Link 
          to="/" 
          className={`text-sm font-medium transition-colors hover:text-primary ${
            isActive('/') ? 'text-primary' : 'text-muted-foreground'
          }`}
        >
          Início
        </Link>
        <Link 
          to="/services" 
          className={`text-sm font-medium transition-colors hover:text-primary ${
            isActive('/services') ? 'text-primary' : 'text-muted-foreground'
          }`}
        >
          Serviços
        </Link>
        <Link 
          to="/about" 
          className={`text-sm font-medium transition-colors hover:text-primary ${
            isActive('/about') ? 'text-primary' : 'text-muted-foreground'
          }`}
        >
          Sobre
        </Link>
        <Link 
          to="/book" 
          className={`text-sm font-medium transition-colors hover:text-primary ${
            isActive('/book') ? 'text-primary' : 'text-muted-foreground'
          }`}
        >
          Agendar
        </Link>
        <Link 
          to="/shop" 
          className={`text-sm font-medium transition-colors hover:text-primary ${
            isActive('/shop') ? 'text-primary' : 'text-muted-foreground'
          }`}
        >
          Loja
        </Link>
      </>
    );
  };

  const renderDropdownItems = () => {
    // Admin dropdown options
    if (isAdmin) {
      return (
        <>
          <DropdownMenuItem asChild>
            <Link to="/profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Perfil
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/admin" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Painel Admin
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/status-center" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Centro de Status
            </Link>
          </DropdownMenuItem>
        </>
      );
    }

    // Provider (groomer/vet) dropdown options
    if (isGroomer || isVet) {
      return (
        <>
          <DropdownMenuItem asChild>
            <Link to="/profile">Perfil</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/status-center">Status dos Serviços</Link>
          </DropdownMenuItem>
        </>
      );
    }

    // Default client dropdown
    return (
      <>
        <DropdownMenuItem asChild>
          <Link to="/profile">Perfil</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/pets">Meus Pets</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/appointments">Agendamentos</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/cart">Carrinho</Link>
        </DropdownMenuItem>
      </>
    );
  };

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-2">
            <img src="/logo-vettale.png" alt="Vettale" className="h-8 w-8" />
            <span className="text-xl font-bold text-primary">Vettale</span>
          </Link>
          
          <div className="hidden md:flex items-center space-x-8">
            {renderNavLinks()}
          </div>
          
          <div className="flex items-center space-x-4">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2">
                    <User className="h-4 w-4" />
                    <span className="hidden md:inline">
                      {isAdmin ? 'Admin' : 'Minha Conta'}
                    </span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {renderDropdownItems()}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut}>
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center space-x-2">
                <Button variant="ghost" asChild>
                  <Link to="/login">Entrar</Link>
                </Button>
                <Button asChild>
                  <Link to="/register">Cadastrar</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
