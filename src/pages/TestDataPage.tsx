
import React from 'react';
import Layout from '@/components/Layout';
import CreateTestData from '@/components/CreateTestData';
import SetupResourceTypes from '@/components/SetupResourceTypes';

const TestDataPage = () => {
  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold mb-8">Configuração do Sistema</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <SetupResourceTypes />
          <CreateTestData />
        </div>
        
        <div className="mt-8 p-6 bg-secondary/50 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Instruções de Configuração</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Primeiro clique em "Configurar Recursos" para definir os tipos de recursos</li>
            <li>Em seguida, use "Criar Dados de Teste" para adicionar tosadores e veterinários de exemplo</li>
            <li>Use "Criar Disponibilidade" para gerar horários disponíveis para tosadores registrados</li>
          </ol>
        </div>
      </div>
    </Layout>
  );
};

export default TestDataPage;
