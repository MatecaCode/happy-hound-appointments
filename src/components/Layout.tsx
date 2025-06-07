
import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Navigation from './Navigation';
import Footer from './Footer';
import { useAuth } from '@/hooks/useAuth';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Re-enable role-based redirects
  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) return;
      
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
          
        if (error) throw error;
        
        const userRole = data?.role;
        console.log('🔍 Layout Debug - User role:', userRole, 'Current path:', location.pathname);
        
        // Redirect professionals to their dashboards if they're on the main page
        if (location.pathname === '/') {
          if (userRole === 'groomer') {
            navigate('/groomer-dashboard');
          } else if (userRole === 'vet') {
            navigate('/vet-calendar');
          }
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
      }
    };
    
    fetchUserRole();
  }, [user, location.pathname, navigate]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default Layout;
