
import React from 'react';
import Layout from '@/components/Layout';
import CreateTestData from '@/components/CreateTestData';

import CreateTestServices from '@/components/CreateTestServices';
import CreateAvailabilitySlots from '@/components/CreateAvailabilitySlots';

const TestDataPage = () => {
  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold mb-8">Configuração do Sistema</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <CreateTestServices />
          <CreateTestData />
          <CreateAvailabilitySlots />
        </div>
        
        <div className="mt-8 p-6 bg-secondary/50 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Instruções de Configuração</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Primeiro clique em "Configurar Recursos" para definir os tipos de recursos</li>
            <li>Em seguida, use "Criar Serviços de Teste" para adicionar serviços de exemplo</li>
            <li>Use "Criar Dados de Teste" para adicionar tosadores e veterinários de exemplo</li>
            <li>Por último, use "Criar Disponibilidade" para gerar horários disponíveis para todos os profissionais</li>
          </ol>
          
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-2">🎯 Fluxo de Agendamento</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-blue-700">
              <li><strong>Pet + Serviço:</strong> Cliente seleciona pet e serviço</li>
              <li><strong>Data:</strong> Sistema mostra apenas datas com todos os recursos disponíveis</li>
              <li><strong>Profissional:</strong> Se necessário, cliente escolhe tosador/veterinário disponível</li>
              <li><strong>Horário:</strong> Cliente seleciona horário onde todos os recursos estão livres</li>
              <li><strong>Confirmação:</strong> Sistema bloqueia os horários para todos os recursos envolvidos</li>
            </ol>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default TestDataPage;
