import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, ArrowLeft } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import AdminLayout from '@/components/AdminLayout';

const AdminComingSoon = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto mb-4 h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
                <Clock className="h-8 w-8 text-blue-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                Em Breve
              </CardTitle>
              <CardDescription className="text-lg text-gray-600">
                Esta funcionalidade está em desenvolvimento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-500">
                A página <code className="bg-gray-100 px-2 py-1 rounded text-sm">{currentPath}</code> 
                ainda não foi implementada.
              </p>
              <p className="text-gray-500">
                Nossa equipe está trabalhando para disponibilizar esta funcionalidade em breve.
              </p>
              
              <div className="flex justify-center gap-4 pt-4">
                <Link to="/admin">
                  <Button variant="outline" className="flex items-center gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Voltar ao Dashboard
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminComingSoon;
