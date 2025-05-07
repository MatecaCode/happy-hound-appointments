
import React from 'react';
import Layout from '@/components/Layout';
import ServiceCard from '@/components/ServiceCard';
import { Scissors, ShowerHead, Dog, Sparkles, Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const Services = () => {
  const services = [
    {
      title: "Banho & Escovação Básica",
      description: "Banho, secagem, escovação, limpeza de ouvidos, corte de unhas e borrifada de colônia.",
      price: "R$40",
      icon: <ShowerHead className="h-6 w-6" />,
      details: [
        "Banho com água morna e shampoo suave",
        "Escovação completa",
        "Secagem",
        "Limpeza de ouvidos",
        "Corte de unhas",
        "Borrifada de perfume"
      ]
    },
    {
      title: "Tosa Completa",
      description: "Tudo do pacote básico mais corte de pelo estilizado conforme sua preferência.",
      price: "R$60",
      icon: <Scissors className="h-6 w-6" />,
      popular: true,
      details: [
        "Todos os serviços do Banho & Escovação Básica",
        "Corte personalizado",
        "Tosa da face",
        "Tosa das almofadinhas das patas",
        "Tosa higiênica"
      ]
    },
    {
      title: "Pacote Spa Luxo",
      description: "Tosa completa com shampoo especial, condicionador, limpeza de dentes e tratamento de patas.",
      price: "R$80",
      icon: <Sparkles className="h-6 w-6" />,
      details: [
        "Todos os serviços da Tosa Completa",
        "Shampoo e condicionador premium",
        "Limpeza de dentes",
        "Tratamento hidratante para patas",
        "Tratamento anti-queda",
        "Máscara facial de mirtilo"
      ]
    },
    {
      title: "Corte de Unhas",
      description: "Serviço rápido de corte de unhas para manter as patas do seu cachorro saudáveis.",
      price: "R$15",
      icon: <Scissors className="h-6 w-6" />,
      details: [
        "Corte de unhas",
        "Lixamento de unhas",
        "Verificação das almofadinhas"
      ]
    },
    {
      title: "Limpeza de Dentes",
      description: "Serviço de higiene dental para manter a saúde bucal do seu cachorro.",
      price: "R$25",
      icon: <Smile className="h-6 w-6" />,
      details: [
        "Escovação com pasta de dente própria para cães",
        "Exame de gengivas",
        "Refrescante bucal"
      ]
    },
    {
      title: "Primeira Tosa do Filhote",
      description: "Introdução suave à tosa para filhotes com menos de 6 meses.",
      price: "R$45",
      icon: <Dog className="h-6 w-6" />,
      details: [
        "Shampoo suave para filhotes",
        "Tosa leve para acostumar o filhote",
        "Treinamento com reforço positivo",
        "Corte de unhas e limpeza de ouvidos",
        "Exercícios de manipulação para futuras tosas"
      ]
    }
  ];

  return (
    <Layout>
      <section className="bg-secondary/50 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h1 className="mb-4">Nossos <span className="text-primary">Serviços</span> de Tosa</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Oferecemos uma gama completa de serviços de tosa para manter seu cachorro limpo, saudável e bonito.
            </p>
          </div>
        </div>
      </section>
      
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-6">
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
          
          <div className="mt-16 text-center bg-secondary rounded-xl p-8">
            <h3 className="text-2xl font-bold mb-4">Precisa de Algo Especial?</h3>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Tem uma necessidade específica de tosa que não está listada aqui? Oferecemos serviços de tosa personalizados adaptados às necessidades específicas do seu cachorro.
            </p>
            <Button asChild size="lg">
              <Link to="/book">Contate-nos Para Serviços Personalizados</Link>
            </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Services;
