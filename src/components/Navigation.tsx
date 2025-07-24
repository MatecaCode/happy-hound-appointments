
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu } from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

const Navigation = () => {
  const { user, signOut, userRole, hasRole } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const handleSmoothScroll = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Different navigation items for staff vs regular users
  const getNavItems = () => {
    // Staff members (groomers, vets, etc.) get simplified navigation
    if (hasRole('groomer') || hasRole('vet')) {
      return [
        { name: 'Dashboard', href: hasRole('groomer') ? '/groomer-dashboard' : '/vet-calendar' },
        { name: 'Serviços', href: '/services' },
      ];
    }
    
    // Default navigation for clients and others
    return [
      { name: 'Início', href: '/' },
      { name: 'Serviços', href: '/services' },
      { name: 'Banho & Tosa', href: '/', scrollTo: 'banho-e-tosa' },
      { name: 'Sobre', href: '/about' },
    ];
  };

  const navItems = getNavItems();

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <img src="/lovable-uploads/6e31bc13-c687-4ceb-87a4-29955094f30f.png" alt="Vettale" className="h-8 w-8" />
              <span className="text-xl font-bold text-primary">Vettale</span>
            </Link>
          </div>

          {/* Desktop Navigation - Centered */}
          <div className="hidden md:flex items-center justify-center flex-1">
            <div className="flex items-center space-x-8">
              {navItems.map((item) => (
                item.scrollTo ? (
                  <button
                    key={item.name}
                    onClick={() => {
                      if (window.location.pathname !== '/') {
                        navigate('/');
                        setTimeout(() => handleSmoothScroll(item.scrollTo!), 100);
                      } else {
                        handleSmoothScroll(item.scrollTo!);
                      }
                    }}
                    className="text-gray-700 hover:text-primary hover:font-medium px-3 py-2 text-sm font-medium transition-all duration-300 relative group"
                  >
                    {item.name}
                    <span className="absolute bottom-0 left-1/2 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full group-hover:left-0"></span>
                  </button>
                ) : (
                  <Link
                    key={item.name}
                    to={item.href}
                    className="text-gray-700 hover:text-primary hover:font-medium px-3 py-2 text-sm font-medium transition-all duration-300 relative group"
                  >
                    {item.name}
                    <span className="absolute bottom-0 left-1/2 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full group-hover:left-0"></span>
                  </Link>
                )
              ))}
            </div>
          </div>

          {/* Right side - User menu or login/register */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <>
                {/* Role-based navigation using hasRole */}
                {hasRole('admin') && (
                  <Link
                    to="/admin"
                    className="text-gray-700 hover:text-primary px-3 py-2 text-sm font-medium transition-colors"
                  >
                    Admin
                  </Link>
                )}
                
                {hasRole('vet') && (
                  <Link
                    to="/vet-calendar"
                    className="text-gray-700 hover:text-primary px-3 py-2 text-sm font-medium transition-colors"
                  >
                    Calendário
                  </Link>
                )}
                
                {(hasRole('admin') || hasRole('groomer') || hasRole('vet')) && (
                  <Link
                    to="/status-center"
                    className="text-gray-700 hover:text-primary px-3 py-2 text-sm font-medium transition-colors"
                  >
                    Status
                  </Link>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {user.email?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {user.user_metadata?.name || 'Usuário'}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {user.email}
                        </p>
                        {userRole && (
                          <p className="text-xs leading-none text-muted-foreground capitalize">
                            {userRole === 'admin' ? 'Administrador' : 
                             userRole === 'groomer' ? 'Tosador' :
                             userRole === 'vet' ? 'Veterinário' : 'Cliente'}
                          </p>
                        )}
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/profile">Perfil</Link>
                    </DropdownMenuItem>
                    {/* Staff members get dashboard link and can have pets/appointments */}
                    {(hasRole('groomer') || hasRole('vet')) && (
                      <>
                        <DropdownMenuItem asChild>
                          <Link to={hasRole('groomer') ? '/groomer-dashboard' : '/vet-calendar'}>Dashboard</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/pets">Meus Pets</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/appointments">Agendamentos</Link>
                        </DropdownMenuItem>
                        {hasRole('groomer') && (
                          <DropdownMenuItem asChild>
                            <Link to="/groomer-availability">Disponibilidade</Link>
                          </DropdownMenuItem>
                        )}
                      </>
                    )}
                    {/* Regular clients get pets and appointments */}
                    {!hasRole('groomer') && !hasRole('vet') && !hasRole('admin') && (
                      <>
                        <DropdownMenuItem asChild>
                          <Link to="/pets">Meus Pets</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/appointments">Agendamentos</Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      Sair
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  to="/login"
                  className="text-gray-700 hover:text-primary px-3 py-2 text-sm font-medium transition-colors"
                >
                  Entrar
                </Link>
                <Link
                  to="/register"
                  className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-all duration-300 hover:shadow-md"
                >
                  Cadastrar
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(!isOpen)}
            >
              <Menu className="h-6 w-6" />
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t border-gray-200">
              {navItems.map((item) => (
                item.scrollTo ? (
                  <button
                    key={item.name}
                    onClick={() => {
                      if (window.location.pathname !== '/') {
                        navigate('/');
                        setTimeout(() => handleSmoothScroll(item.scrollTo!), 100);
                      } else {
                        handleSmoothScroll(item.scrollTo!);
                      }
                      setIsOpen(false);
                    }}
                    className="text-gray-700 hover:text-primary block w-full text-left px-3 py-2 text-base font-medium transition-colors"
                  >
                    {item.name}
                  </button>
                ) : (
                  <Link
                    key={item.name}
                    to={item.href}
                    className="text-gray-700 hover:text-primary block px-3 py-2 text-base font-medium transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    {item.name}
                  </Link>
                )
              ))}
              
              {user ? (
                <>
                  {/* Role-based mobile navigation */}
                  {hasRole('admin') && (
                    <Link
                      to="/admin"
                      className="text-gray-700 hover:text-primary block px-3 py-2 text-base font-medium transition-colors"
                      onClick={() => setIsOpen(false)}
                    >
                      Admin
                    </Link>
                  )}
                  
                  {hasRole('vet') && (
                    <Link
                      to="/vet-calendar"
                      className="text-gray-700 hover:text-primary block px-3 py-2 text-base font-medium transition-colors"
                      onClick={() => setIsOpen(false)}
                    >
                      Calendário
                    </Link>
                  )}
                  
                  {(hasRole('admin') || hasRole('groomer') || hasRole('vet')) && (
                    <Link
                      to="/status-center"
                      className="text-gray-700 hover:text-primary block px-3 py-2 text-base font-medium transition-colors"
                      onClick={() => setIsOpen(false)}
                    >
                      Status
                    </Link>
                  )}
                  
                  <Link
                    to="/profile"
                    className="text-gray-700 hover:text-primary block px-3 py-2 text-base font-medium transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    Perfil
                  </Link>
                  
                  {/* Staff members get dashboard link and can have pets/appointments */}
                  {(hasRole('groomer') || hasRole('vet')) && (
                    <>
                      <Link
                        to={hasRole('groomer') ? '/groomer-dashboard' : '/vet-calendar'}
                        className="text-gray-700 hover:text-primary block px-3 py-2 text-base font-medium transition-colors"
                        onClick={() => setIsOpen(false)}
                      >
                        Dashboard
                      </Link>
                      <Link
                        to="/pets"
                        className="text-gray-700 hover:text-primary block px-3 py-2 text-base font-medium transition-colors"
                        onClick={() => setIsOpen(false)}
                      >
                        Meus Pets
                      </Link>
                      <Link
                        to="/appointments"
                        className="text-gray-700 hover:text-primary block px-3 py-2 text-base font-medium transition-colors"
                        onClick={() => setIsOpen(false)}
                      >
                        Agendamentos
                      </Link>
                      {hasRole('groomer') && (
                        <Link
                          to="/groomer-availability"
                          className="text-gray-700 hover:text-primary block px-3 py-2 text-base font-medium transition-colors"
                          onClick={() => setIsOpen(false)}
                        >
                          Disponibilidade
                        </Link>
                      )}
                    </>
                  )}
                  
                  {/* Regular clients get pets and appointments */}
                  {!hasRole('groomer') && !hasRole('vet') && !hasRole('admin') && (
                    <>
                      <Link
                        to="/pets"
                        className="text-gray-700 hover:text-primary block px-3 py-2 text-base font-medium transition-colors"
                        onClick={() => setIsOpen(false)}
                      >
                        Meus Pets
                      </Link>
                      <Link
                        to="/appointments"
                        className="text-gray-700 hover:text-primary block px-3 py-2 text-base font-medium transition-colors"
                        onClick={() => setIsOpen(false)}
                      >
                        Agendamentos
                      </Link>
                    </>
                  )}
                  
                  <button
                    onClick={handleLogout}
                    className="text-gray-700 hover:text-primary block w-full text-left px-3 py-2 text-base font-medium transition-colors"
                  >
                    Sair
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="text-gray-700 hover:text-primary block px-3 py-2 text-base font-medium transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    Entrar
                  </Link>
                  <Link
                    to="/register"
                    className="block w-full text-left bg-primary text-white px-3 py-2 rounded-lg hover:bg-primary/90 transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    Cadastrar
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
