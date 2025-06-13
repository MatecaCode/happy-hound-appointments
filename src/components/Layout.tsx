
import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Navigation from './Navigation';
import Footer from './Footer';
import { useAuth } from '@/hooks/useAuth';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Role-based redirects using the centralized userRole from user_roles table
  useEffect(() => {
    // Don't redirect while auth is loading
    if (loading || !user || !userRole) return;
    
    console.log('🔍 Layout Debug - User role:', userRole, 'Current path:', location.pathname);
    
    // Redirect groomers to their dashboard if they're on the home page
    if (userRole === 'groomer' && location.pathname === '/') {
      navigate('/groomer-dashboard');
      return;
    }
    
    // Redirect vets to their calendar if they're on the home page
    if (userRole === 'vet' && location.pathname === '/') {
      navigate('/vet-calendar');
      return;
    }
    
    // Clients and admins stay on whatever page they're on
  }, [user, userRole, location.pathname, navigate, loading]);

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
