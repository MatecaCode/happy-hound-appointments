import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, ArrowLeft } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import AdminLayout from '@/components/AdminLayout';

const AdminStaffAvailability = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        <Card className="text-center">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-gray-900">Página migrada</CardTitle>
            <CardDescription className="text-gray-600">
              Esta área foi consolidada em <Link to="/admin/availability" className="underline">/admin/availability</Link>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/admin/availability">
              <Button>Ir para Availability Manager</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminStaffAvailability; 