
import React from 'react';
import Layout from '@/components/Layout';
import Hero from '@/components/Hero';
import ServiceCard from '@/components/ServiceCard';
import Testimonials from '@/components/Testimonials';
import { Scissors, ShowerHead, Dog, Sparkles } from 'lucide-react';

const Index = () => {
  const services = [
    {
      title: "Banho & Escovação Básica",
      description: "Banho, secagem, escovação, limpeza de ouvidos, corte de unhas e borrifada de colônia.",
      price: "R$40",
      icon: <ShowerHead className="h-6 w-6" />,
    },
    {
      title: "Tosa Completa",
      description: "Tudo do pacote básico mais corte de pelo estilizado conforme sua preferência.",
      price: "R$60",
      icon: <Scissors className="h-6 w-6" />,
      popular: true,
    },
    {
      title: "Pacote Spa Luxo",
      description: "Tosa completa com shampoo especial, condicionador, limpeza de dentes e tratamento de patas.",
      price: "R$80",
      icon: <Sparkles className="h-6 w-6" />,
    },
  ];

  return (
    <Layout>
      <Hero />
      
      {/* Services Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="mb-4">Nossos <span className="text-primary">Serviços</span> de Tosa</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Oferecemos uma variedade de serviços de tosa para manter seu cachorro bonito e se sentindo bem.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {services.map((service, index) => (
              <ServiceCard 
                key={index}
                title={service.title}
                description={service.description}
                price={service.price}
                icon={service.icon}
                popular={service.popular}
              />
            ))}
          </div>
          
          <div className="mt-12 text-center">
            <p className="text-muted-foreground mb-6">
              Precisa de algo que não está listado aqui? Entre em contato para opções personalizadas.
            </p>
          </div>
        </div>
      </section>
      
      <Testimonials />
      
      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="inline-flex items-center justify-center bg-primary-foreground/10 rounded-full p-2 mb-8">
            <Dog className="h-5 w-5" />
          </div>
          
          <h2 className="mb-6">Pronto para Agendar a Tosa do Seu Pet?</h2>
          
          <p className="text-primary-foreground/90 max-w-2xl mx-auto mb-8">
            Dê ao seu cachorro o carinho que ele merece. Nossos profissionais estão prontos para oferecer o melhor cuidado ao seu amigo peludo.
          </p>
          
          <a 
            href="/book"
            className="inline-flex items-center justify-center rounded-md bg-primary-foreground text-primary px-8 py-3 font-medium"
          >
            Agendar Consulta Agora
          </a>
        </div>
      </section>
    </Layout>
  );
};

export default Index;
