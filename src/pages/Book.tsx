import React, { useState } from 'react';
import Layout from '@/components/Layout';
import AppointmentForm from '@/components/AppointmentForm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Link } from 'react-router-dom';
import { LogIn, AlertCircle } from 'lucide-react';

const Book = () => {
  const [appointmentType, setAppointmentType] = useState<'grooming' | 'veterinary'>('grooming');
  const { user, loading } = useAuth();

  // Show loading state
  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
        </div>
      </Layout>
    );
  }

  // Show login prompt if user is not authenticated
  if (!user) {
    return (
      <Layout>
        {/* Hero */}
        <section className="bg-secondary/50 py-16">
          <div className="max-w-7xl mx-auto px-6 text-center">
            <h1 className="mb-4">
              Agende um <span className="text-primary">Serviço</span>
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Faça login para agendar serviços para seu pet
            </p>
          </div>
        </section>

        {/* Login Required */}
        <section className="py-16">
          <div className="max-w-2xl mx-auto px-6">
            <Alert className="border-blue-200 bg-blue-50">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <div className="space-y-4">
                  <div>
                    <p className="font-medium mb-2">
                      Login necessário para agendar serviços
                    </p>
                    <p className="text-sm">
                      Para agendar um serviço, você precisa estar logado na sua conta.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white">
                      <Link to="/login" className="flex items-center gap-2">
                        <LogIn className="h-4 w-4" />
                        Fazer Login
                      </Link>
                    </Button>
                    <Button variant="outline" asChild>
                      <Link to="/register">
                        Criar Conta
                      </Link>
                    </Button>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Hero */}
      <section className="bg-secondary/50 py-16">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h1 className="mb-4">
            Agende um <span className="text-primary">Serviço</span>
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {appointmentType === 'grooming'
              ? 'Marque um serviço de banho e tosa para seu amigo peludo usando nosso sistema de agendamento online.'
              : 'Marque uma consulta veterinária para seu animal de estimação usando nosso sistema de agendamento online.'}
          </p>
        </div>
      </section>

      {/* Booking */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-6">
          <Tabs
            defaultValue="grooming"
            value={appointmentType}
            onValueChange={(value) => setAppointmentType(value as 'grooming' | 'veterinary')}
            className="mb-8"
          >
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 bg-background p-1 rounded-lg border">
              <TabsTrigger
                value="grooming"
                className="relative data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 ease-in-out transform data-[state=active]:scale-105"
              >
                Banho e Tosa
              </TabsTrigger>
              <TabsTrigger
                value="veterinary"
                className="relative data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 ease-in-out transform data-[state=active]:scale-105"
              >
                Consulta Veterinária
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Booking section content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2">
              <AppointmentForm key={appointmentType} serviceType={appointmentType} />
            </div>

            <div className="space-y-6">
              <div className="bg-secondary/50 p-6 rounded-lg space-y-6">
                <h3 className="text-xl font-bold">Informações de Agendamento</h3>

                <div>
                  <h4 className="font-semibold">Horário de Funcionamento</h4>
                  <ul className="mt-2 space-y-1">
                    <li className="flex justify-between">
                      <span>Segunda - Sexta</span>
                      <span>9:00 - 16:00</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Sábado</span>
                      <span>9:00 - 12:00</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Domingo</span>
                      <span>Fechado</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold">Contato</h4>
                  <p className="mt-2">
                    Tem dúvidas sobre nossos serviços?
                    <br />
                    Ligue para (11) 2427-2827
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold">Observações para Agendamento</h4>
                  <ul className="mt-2 space-y-2 text-sm">
                    <li>• Por favor chegue 5 minutos antes do horário marcado</li>
                    {appointmentType === 'grooming' ? (
                      <>
                        <li>• Traga a carteira de vacinação na primeira visita</li>
                      </>
                    ) : (
                      <>
                        <li>• Traga a carteira de vacinação e histórico médico, se disponível</li>
                      </>
                    )}
                    <li>• Cancelamentos requerem aviso com 24 horas de antecedência</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Book;
