
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
  
  // Re-enable role-based redirects using the new table structure
  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) return;
      
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        
        // Check clients table first
        const { data: clientData } = await supabase
          .from('clients')
          .select('id')
          .eq('user_id', user.id)
          .single();
          
        if (clientData) {
          console.log('🔍 Layout Debug - User role: client, Current path:', location.pathname);
          return; // Client stays on current page
        }
        
        // Check groomers table
        const { data: groomerData } = await supabase
          .from('groomers')
          .select('id')
          .eq('user_id', user.id)
          .single();
          
        if (groomerData) {
          console.log('🔍 Layout Debug - User role: groomer, Current path:', location.pathname);
          if (location.pathname === '/') {
            navigate('/groomer-dashboard');
          }
          return;
        }
        
        // Check veterinarians table
        const { data: vetData } = await supabase
          .from('veterinarians')
          .select('id')
          .eq('user_id', user.id)
          .single();
          
        if (vetData) {
          console.log('🔍 Layout Debug - User role: vet, Current path:', location.pathname);
          if (location.pathname === '/') {
            navigate('/vet-calendar');
          }
          return;
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
