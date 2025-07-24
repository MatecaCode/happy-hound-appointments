
import React, { useState } from 'react';
import Layout from '@/components/Layout';
import AppointmentForm from '@/components/AppointmentForm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Book = () => {
  const [appointmentType, setAppointmentType] = useState<'grooming' | 'veterinary'>('grooming');
  
  return (
    <Layout>
      <section className="bg-secondary/50 py-16">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h1 className="mb-4">Agende um <span className="text-primary">Serviço</span></h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {appointmentType === 'grooming' 
              ? 'Marque um serviço de banho e tosa para seu amigo peludo usando nosso sistema de agendamento online.' 
              : 'Marque uma consulta veterinária para seu animal de estimação usando nosso sistema de agendamento online.'}
          </p>
        </div>
      </section>
      
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-6">
          <Tabs 
            defaultValue="grooming" 
            value={appointmentType}
            onValueChange={(value) => setAppointmentType(value as 'grooming' | 'veterinary')}
            className="mb-8"
          >
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
              <TabsTrigger value="grooming">Banho e Tosa</TabsTrigger>
              <TabsTrigger value="veterinary">Consulta Veterinária</TabsTrigger>
            </TabsList>
          </Tabs>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2">
              <AppointmentForm serviceType={appointmentType} />
            </div>
            
            <div className="space-y-6">
              <div className="bg-secondary/50 p-6 rounded-lg space-y-6">
                <h3 className="text-xl font-bold">Informações de Agendamento</h3>
                
                <div>
                  <h4 className="font-semibold">Horário de Funcionamento</h4>
                  <ul className="mt-2 space-y-1">
                    <li className="flex justify-between">
                      <span>Segunda - Sexta</span>
                      <span>9:00 - 17:00</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Sábado</span>
                      <span>9:00 - 15:00</span>
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
                    Tem dúvidas sobre nossos serviços?<br />
                    Ligue para (11) 1234-5678
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold">Observações para Agendamento</h4>
                  <ul className="mt-2 space-y-2 text-sm">
                    <li>• Por favor chegue 15 minutos antes do horário marcado</li>
                    {appointmentType === 'grooming' ? (
                      <>
                        <li>• Certifique-se de que seu cachorro fez suas necessidades antes da consulta</li>
                        <li>• Traga a carteira de vacinação na primeira visita</li>
                      </>
                    ) : (
                      <>
                        <li>• Traga a carteira de vacinação e histórico médico, se disponível</li>
                        <li>• Se for a primeira consulta, deixe seu pet em jejum de 4h</li>
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
