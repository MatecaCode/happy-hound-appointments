
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, ChevronDown } from 'lucide-react';

const Navigation = () => {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [userRole, setUserRole] = React.useState<string | null>(null);
  const [isAdmin, setIsAdmin] = React.useState(false);

  // Fetch user role from the appropriate table
  React.useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) return;
      
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        
        // Check for admin role first
        const { data: adminData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .single();
          
        if (adminData) {
          setUserRole('admin');
          setIsAdmin(true);
          return;
        }
        
        // Check clients table
        const { data: clientData } = await supabase
          .from('clients')
          .select('id')
          .eq('user_id', user.id)
          .single();
          
        if (clientData) {
          setUserRole('client');
          return;
        }
        
        // Check groomers table
        const { data: groomerData } = await supabase
          .from('groomers')
          .select('id')
          .eq('user_id', user.id)
          .single();
          
        if (groomerData) {
          setUserRole('groomer');
          return;
        }
        
        // Check veterinarians table
        const { data: vetData } = await supabase
          .from('veterinarians')
          .select('id')
          .eq('user_id', user.id)
          .single();
          
        if (vetData) {
          setUserRole('vet');
          return;
        }
        
        // Default to client if no role found
        setUserRole('client');
      } catch (error) {
        console.error('Error fetching user role:', error);
        setUserRole('client');
      }
    };
    
    fetchUserRole();
  }, [user]);

  const isActive = (path: string) => location.pathname === path;

  const renderNavLinks = () => {
    if (userRole === 'admin') {
      return (
        <>
          <Link 
            to="/admin" 
            className={`text-sm font-medium transition-colors hover:text-primary ${
              isActive('/admin') ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            Admin
          </Link>
        </>
      );
    }

    if (userRole === 'groomer') {
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
        </>
      );
    }

    if (userRole === 'vet') {
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
                    <span className="hidden md:inline">Minha Conta</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link to="/profile">Perfil</Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin">Painel Admin</Link>
                    </DropdownMenuItem>
                  )}
                  {userRole === 'client' && (
                    <>
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
                  )}
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
