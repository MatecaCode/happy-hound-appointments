
import React from 'react';
import Layout from '@/components/Layout';
import ServiceCard from '@/components/ServiceCard';
import { Scissors, ShowerHead, Dog, Sparkles, Smile, Syringe, Heart, Calendar, Pills } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Separator } from "@/components/ui/separator";

const Services = () => {
  const groomingServices = [
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

  const vetServices = [
    {
      title: "Consulta Veterinária",
      description: "Avaliação completa da saúde do seu pet com médico veterinário especializado.",
      price: "R$120",
      icon: <Syringe className="h-6 w-6" />,
      details: [
        "Exame físico completo",
        "Avaliação de saúde geral",
        "Orientações nutricionais",
        "Recomendações de prevenção de doenças",
        "Até 30 minutos de consulta"
      ]
    },
    {
      title: "Vacinação",
      description: "Imunização do seu pet com as principais vacinas necessárias para sua proteção.",
      price: "A partir de R$80",
      icon: <Syringe className="h-6 w-6" />,
      popular: true,
      details: [
        "Avaliação pré-vacinação",
        "Vacinas importadas",
        "Orientação sobre possíveis reações",
        "Carteira de vacinação digital",
        "Lembretes para próximas doses"
      ]
    },
    {
      title: "Check-up Completo",
      description: "Avaliação completa com exames laboratoriais para garantir a saúde do seu pet.",
      price: "R$350",
      icon: <Heart className="h-6 w-6" />,
      details: [
        "Consulta veterinária",
        "Hemograma completo",
        "Perfil bioquímico",
        "Exame de urina",
        "Avaliação cardiológica básica",
        "Recomendações personalizadas"
      ]
    },
    {
      title: "Castração",
      description: "Procedimento cirúrgico para esterilização do seu pet com toda segurança.",
      price: "A partir de R$300",
      icon: <Syringe className="h-6 w-6" />,
      details: [
        "Avaliação pré-cirúrgica",
        "Procedimento com anestesia geral",
        "Monitoramento constante de sinais vitais",
        "Medicação pós-operatória",
        "Retorno para retirada de pontos"
      ]
    },
    {
      title: "Tratamento Odontológico",
      description: "Cuidados dentários completos para prevenir problemas de saúde bucal.",
      price: "A partir de R$200",
      icon: <Smile className="h-6 w-6" />,
      details: [
        "Avaliação da saúde bucal",
        "Limpeza com ultrassom",
        "Remoção de tártaro",
        "Polimento dentário",
        "Orientações para cuidados em casa"
      ]
    },
    {
      title: "Acupuntura Veterinária",
      description: "Tratamento complementar para dor, problemas articulares e outras condições.",
      price: "R$150 por sessão",
      icon: <Pills className="h-6 w-6" />,
      details: [
        "Avaliação da condição do pet",
        "Sessão de 30-45 minutos",
        "Técnica indolor",
        "Plano de tratamento personalizado",
        "Integração com medicina convencional"
      ]
    }
  ];

  return (
    <Layout>
      <section className="bg-secondary/50 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h1 className="mb-4">Nossos <span className="text-primary">Serviços</span></h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Oferecemos serviços completos de saúde e bem-estar para seu pet, desde consultas veterinárias 
              até serviços de banho e tosa.
            </p>
          </div>
        </div>
      </section>
      
      {/* Serviços Veterinários */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-center mb-12">
            <div className="w-16 h-0.5 bg-primary mr-4"></div>
            <h2 className="text-3xl font-bold">Serviços Veterinários</h2>
            <div className="w-16 h-0.5 bg-primary ml-4"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {vetServices.map((service, index) => (
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
        </div>
      </section>
      
      <div className="max-w-7xl mx-auto px-6">
        <Separator className="my-8" />
      </div>
      
      {/* Banho & Tosa */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-center mb-12">
            <div className="w-16 h-0.5 bg-primary mr-4"></div>
            <h2 className="text-3xl font-bold">Banho & Tosa</h2>
            <div className="w-16 h-0.5 bg-primary ml-4"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {groomingServices.map((service, index) => (
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
              Tem uma necessidade específica que não está listada aqui? Oferecemos serviços personalizados adaptados às necessidades específicas do seu pet.
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
