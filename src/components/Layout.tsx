
import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Navigation from './Navigation';
import Footer from './Footer';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [userRole, setUserRole] = React.useState<string | null>(null);

  // Fetch user role
  React.useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
          
        if (error) throw error;
        console.log('🔍 Layout Debug - User role:', data?.role);
        setUserRole(data?.role || 'client');
      } catch (error) {
        console.error('Error fetching user role:', error);
        setUserRole('client');
      }
    };
    
    fetchUserRole();
  }, [user]);

  // Redirect groomers and vets to their dashboards when accessing home page
  // BUT only redirect if they're on the exact home route, not booking routes
  useEffect(() => {
    if (user && userRole && location.pathname === '/') {
      // Only redirect professionals from the home page, allow them to use booking
      if (userRole === 'groomer') {
        navigate('/groomer-dashboard');
      } else if (userRole === 'vet') {
        navigate('/vet-calendar');
      }
    }
  }, [user, userRole, location.pathname, navigate]);

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
