
import React from 'react';
import Layout from '@/components/Layout';
import CreateTestData from '@/components/CreateTestData';

const TestDataPage = () => {
  return (
    <Layout>
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-4">Página de Teste</h1>
            <p className="text-muted-foreground">
              Criar dados de teste para o sistema de agendamento
            </p>
          </div>
          
          <div className="flex justify-center">
            <CreateTestData />
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default TestDataPage;
