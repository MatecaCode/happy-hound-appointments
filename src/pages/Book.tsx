import React from 'react';
import Layout from '@/components/Layout';
import { Clock, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const Book = () => {
  return (
    <Layout>
      {/* Hero */}
      <section className="bg-secondary/50 py-16">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h1 className="mb-4">
            Agende um <span className="text-primary">Serviço</span>
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Marque um serviço de banho e tosa para seu amigo peludo usando nosso sistema de agendamento online.
          </p>
        </div>
      </section>

      {/* Coming Soon Overlay */}
      <section className="py-16 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="relative">
            {/* Blurred Background Content */}
            <div className="filter blur-sm opacity-30 pointer-events-none">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Panel - Basic Information */}
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">
                    1. Informações Básicas
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Selecione seu pet e o serviço desejado
                  </p>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Selecione seu Pet
                      </label>
                      <div className="relative">
                        <select className="w-full p-3 border border-gray-300 rounded-md bg-white">
                          <option>Escolha um pet</option>
                        </select>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Selecione o Serviço
                      </label>
                      <div className="relative">
                        <select className="w-full p-3 border border-gray-300 rounded-md bg-white">
                          <option>Escolha um serviço</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  
                  <button className="w-full mt-6 bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition-colors">
                    Continuar
                  </button>
                </div>

                {/* Right Panel - Appointment Information */}
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">
                    Informações de Agendamento
                  </h3>
                  
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-medium text-gray-800 mb-3">Horário de Funcionamento</h4>
                      <div className="space-y-2 text-sm text-gray-600">
                        <div>Segunda - Sexta: 9:00 - 17:00</div>
                        <div>Sábado: 9:00 - 15:00</div>
                        <div>Domingo: Fechado</div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-800 mb-3">Contato</h4>
                      <p className="text-sm text-gray-600 mb-2">
                        Tem dúvidas sobre nossos serviços?
                      </p>
                      <p className="text-sm text-gray-600">
                        Ligue para (11) 1234-5678
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-800 mb-3">Observações para Agendamento</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Por favor chegue 15 minutos antes do horário marcado</li>
                        <li>• Certifique-se de que seu cachorro fez suas necessidades antes da consulta</li>
                        <li>• Traga a carteira de vacinação atualizada</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Coming Soon Overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-lg">
              <div className="text-center p-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-6">
                  <Clock className="h-8 w-8 text-blue-600" />
                </div>
                
                <h2 className="text-3xl font-bold text-gray-800 mb-4">
                  Agendamentos Online em Breve
                </h2>
                
                <p className="text-lg text-gray-600 mb-6 max-w-md">
                  Estamos trabalhando para trazer o sistema de agendamento online para você. 
                  Em breve você poderá agendar seus serviços de forma rápida e prática.
                </p>
                
                <Alert className="max-w-md mx-auto border-blue-200 bg-blue-50">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    <p className="font-medium mb-2">Para agendamentos urgentes:</p>
                    <div className="space-y-1 text-sm">
                      <p>Telefone: (11) 1234-5678</p>
                      <p>WhatsApp: (11) 99637-8518</p>
                    </div>
                  </AlertDescription>
                </Alert>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Book;
