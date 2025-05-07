
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarCheck, Clock, Dog, Scissors, User, Mail, Phone } from 'lucide-react';
import { format } from 'date-fns';

const Confirmation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Verifica se temos dados de agendamento
  const appointment = location.state?.appointment;
  
  // Se não houver dados de agendamento, redireciona para a página de agendamento
  if (!appointment) {
    navigate('/book');
    return null;
  }
  
  const { ownerName, email, phone, petName, breed, service, date, time, specialRequests } = appointment;
  
  return (
    <Layout>
      <div className="py-16 px-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center rounded-full bg-primary/10 p-4 mb-4">
              <CalendarCheck className="h-10 w-10 text-primary" />
            </div>
            <h1 className="mb-4">Agendamento <span className="text-primary">Confirmado!</span></h1>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Seu agendamento de tosa foi agendado com sucesso. Estamos ansiosos para ver {petName} em breve!
            </p>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Detalhes do Agendamento</CardTitle>
              <CardDescription>
                Aqui está um resumo das informações do seu agendamento.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="font-medium text-lg">Data e Hora</div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center">
                    <CalendarCheck className="h-5 w-5 mr-3 text-primary" />
                    <span>{format(new Date(date), 'EEEE, d \'de\' MMMM \'de\' yyyy')}</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 mr-3 text-primary" />
                    <span>{time}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="font-medium text-lg">Informações do Pet</div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center">
                    <Dog className="h-5 w-5 mr-3 text-primary" />
                    <span>Nome: {petName}</span>
                  </div>
                  <div className="flex items-center">
                    <Scissors className="h-5 w-5 mr-3 text-primary" />
                    <span>Serviço: {service}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="font-medium text-lg">Informações do Dono</div>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <User className="h-5 w-5 mr-3 text-primary" />
                    <span>Nome: {ownerName}</span>
                  </div>
                  <div className="flex items-center">
                    <Mail className="h-5 w-5 mr-3 text-primary" />
                    <span>Email: {email}</span>
                  </div>
                  <div className="flex items-center">
                    <Phone className="h-5 w-5 mr-3 text-primary" />
                    <span>Telefone: {phone}</span>
                  </div>
                </div>
              </div>
              
              {specialRequests && (
                <div className="space-y-2">
                  <div className="font-medium text-lg">Solicitações Especiais</div>
                  <p className="text-muted-foreground">
                    {specialRequests}
                  </p>
                </div>
              )}
              
              <div className="bg-secondary/50 p-4 rounded-lg text-sm">
                <p className="font-medium mb-2">Instruções para o Agendamento:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Por favor chegue 15 minutos antes do seu agendamento</li>
                  <li>Certifique-se de que seu cachorro fez um passeio antes do agendamento</li>
                  <li>Traga a carteira de vacinação se for a sua primeira visita</li>
                  <li>Para cancelamentos ou reagendamentos, por favor ligue com pelo menos 24 horas de antecedência</li>
                </ul>
              </div>
            </CardContent>
            
            <CardFooter className="flex flex-col sm:flex-row gap-4">
              <Button 
                className="w-full sm:w-auto" 
                onClick={() => navigate('/appointments')}
              >
                Ver Todos os Agendamentos
              </Button>
              <Button 
                variant="outline" 
                className="w-full sm:w-auto"
                onClick={() => window.print()}
              >
                Imprimir Confirmação
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Confirmation;
