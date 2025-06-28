
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarCheck, Clock, Dog, User, Mail, Phone, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const BookingSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get booking data from navigation state
  const bookingData = location.state?.bookingData;
  
  // Redirect if no booking data
  if (!bookingData) {
    navigate('/book');
    return null;
  }
  
  return (
    <Layout>
      <div className="py-16 px-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center rounded-full bg-green-100 p-4 mb-4">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h1 className="mb-4">Agendamento <span className="text-primary">Enviado!</span></h1>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Seu agendamento foi enviado com sucesso e está aguardando aprovação. 
              Você receberá uma confirmação por email assim que for aprovado pela nossa equipe.
            </p>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarCheck className="h-5 w-5 text-primary" />
                Detalhes do Agendamento
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-amber-800">
                  <Clock className="h-5 w-5" />
                  <span className="font-medium">Status: Aguardando Aprovação</span>
                </div>
                <p className="text-sm text-amber-700 mt-2">
                  Nossa equipe irá analisar sua solicitação e entrar em contato em breve.
                </p>
              </div>
              
              <div className="space-y-4">
                <div className="font-medium text-lg">Serviço Solicitado</div>
                <div className="grid grid-cols-1 gap-4">
                  <div className="flex items-center">
                    <Dog className="h-5 w-5 mr-3 text-primary" />
                    <span>Serviço: {bookingData.serviceName}</span>
                  </div>
                  <div className="flex items-center">
                    <CalendarCheck className="h-5 w-5 mr-3 text-primary" />
                    <span>Data: {format(new Date(bookingData.date), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 mr-3 text-primary" />
                    <span>Horário: {bookingData.time}</span>
                  </div>
                </div>
              </div>
              
              {bookingData.providerName && (
                <div className="space-y-2">
                  <div className="font-medium text-lg">Profissional Selecionado</div>
                  <div className="flex items-center">
                    <User className="h-5 w-5 mr-3 text-primary" />
                    <span>{bookingData.providerName}</span>
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <div className="font-medium text-lg">Pet</div>
                <div className="flex items-center">
                  <Dog className="h-5 w-5 mr-3 text-primary" />
                  <span>{bookingData.petName}</span>
                </div>
              </div>
              
              {bookingData.notes && (
                <div className="space-y-2">
                  <div className="font-medium text-lg">Observações</div>
                  <p className="text-muted-foreground">
                    {bookingData.notes}
                  </p>
                </div>
              )}
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-800 mb-2">Próximos Passos:</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Você receberá um email de confirmação em breve</li>
                  <li>• Nossa equipe analisará sua solicitação</li>
                  <li>• Entraremos em contato para confirmar ou sugerir alterações</li>
                  <li>• Você pode acompanhar o status na área "Meus Agendamentos"</li>
                </ul>
              </div>
            </CardContent>
          </Card>
          
          <div className="flex flex-col sm:flex-row gap-4 mt-8">
            <Button 
              className="w-full sm:w-auto" 
              onClick={() => navigate('/appointments')}
            >
              Ver Meus Agendamentos
            </Button>
            <Button 
              variant="outline" 
              className="w-full sm:w-auto"
              onClick={() => navigate('/book')}
            >
              Fazer Novo Agendamento
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default BookingSuccess;
