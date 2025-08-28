import React from 'react';
import Layout from '@/components/Layout';
import ServiceCard from '@/components/ServiceCard';
import { Scissors, ShowerHead, Dog, Sparkles, Smile, Syringe, Heart, Calendar, Pill } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Separator } from "@/components/ui/separator";
import { useScrollAnimation, animationClasses } from '@/hooks/useScrollAnimation';

const Services = () => {
  const headerAnimation = useScrollAnimation<HTMLDivElement>({ delay: 100 });
  const vetHeaderAnimation = useScrollAnimation<HTMLDivElement>({ delay: 100 });
  const groomingHeaderAnimation = useScrollAnimation<HTMLDivElement>({ delay: 100 });
  const ctaAnimation = useScrollAnimation<HTMLDivElement>({ delay: 200 });

  const groomingServices = [
    {
      title: "Banho & Escovação Básica",
      description: "Banho com carinho, escovação cuidadosa e colônia leve para deixar seu pet renovado e feliz.",
      icon: <ShowerHead className="h-6 w-6" />,
      backgroundColor: "#FDECE4", // Soft blush/peach
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
      icon: <Scissors className="h-6 w-6" />,
      popular: true,
      badge: "Mais Popular",
      backgroundColor: "#F5EEE5",
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
      icon: <Sparkles className="h-6 w-6" />,
      backgroundColor: "#EAF4FB", // Light blue
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
      icon: <Scissors className="h-6 w-6" />,
      backgroundColor: "#FDECE4",
      details: [
        "Corte de unhas",
        "Lixamento de unhas",
        "Verificação das almofadinhas"
      ]
    },
    {
      title: "Limpeza de Dentes",
      description: "Serviço de higiene dental para manter a saúde bucal do seu cachorro.",
      icon: <Smile className="h-6 w-6" />,
      backgroundColor: "#F5EEE5",
      details: [
        "Escovação com pasta de dente própria para cães",
        "Exame de gengivas",
        "Refrescante bucal"
      ]
    },
    {
      title: "Primeira Tosa do Filhote",
      description: "Introdução suave à tosa para filhotes com menos de 6 meses.",
      icon: <Dog className="h-6 w-6" />,
      backgroundColor: "#EAF4FB",
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
      icon: <Syringe className="h-6 w-6" />,
      backgroundColor: "#E9F3E1", // Soft green
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
      icon: <Syringe className="h-6 w-6" />,
      popular: true,
      badge: "Mais Agendado",
      backgroundColor: "#EAF4FB", // Light blue
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
      icon: <Pill className="h-6 w-6" />,
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
      <section className="bg-secondary/50 py-6 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div 
            ref={headerAnimation.ref}
            className={`text-center mb-6 sm:mb-12 ${animationClasses.fadeIn} ${
              headerAnimation.isVisible ? animationClasses.fadeInActive : animationClasses.fadeInInactive
            }`}
          >
            <h1 className="mb-4">Nossos <span className="text-primary">Serviços</span></h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Oferecemos serviços completos de saúde e bem-estar para seu pet, desde consultas veterinárias 
              até serviços de banho e tosa.
            </p>
          </div>
        </div>
      </section>
      
      {/* Serviços Veterinários */}
      <section className="py-8 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div 
            ref={vetHeaderAnimation.ref}
            className={`flex items-center justify-center mb-6 sm:mb-12 ${animationClasses.fadeIn} ${
              vetHeaderAnimation.isVisible ? animationClasses.fadeInActive : animationClasses.fadeInInactive
            }`}
          >
            <div className="w-8 sm:w-16 h-0.5 bg-primary mr-2 sm:mr-4"></div>
            <h2 className="text-2xl sm:text-3xl font-bold text-center px-2">Serviços Veterinários</h2>
            <div className="w-8 sm:w-16 h-0.5 bg-primary ml-2 sm:ml-4"></div>
          </div>
          
          <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
            {vetServices.map((service, index) => (
              <div key={index} className="min-w-0">
                <ServiceCard 
                  title={service.title}
                  description={service.description}
                  icon={service.icon}
                  popular={service.popular}
                  badge={service.badge}
                  backgroundColor={service.backgroundColor}
                />
              </div>
            ))}
          </div>
        </div>
      </section>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <Separator className="my-8" />
      </div>
      
      {/* Banho & Tosa */}
      <section className="py-8 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div 
            ref={groomingHeaderAnimation.ref}
            className={`flex items-center justify-center mb-6 sm:mb-12 ${animationClasses.fadeIn} ${
              groomingHeaderAnimation.isVisible ? animationClasses.fadeInActive : animationClasses.fadeInInactive
            }`}
          >
            <div className="w-8 sm:w-16 h-0.5 bg-primary mr-2 sm:mr-4"></div>
            <h2 className="text-2xl sm:text-3xl font-bold text-center px-2">Banho & Tosa</h2>
            <div className="w-8 sm:w-16 h-0.5 bg-primary ml-2 sm:ml-4"></div>
          </div>
          
          <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
            {groomingServices.map((service, index) => (
              <div key={index} className="min-w-0">
                <ServiceCard 
                  title={service.title}
                  description={service.description}
                  icon={service.icon}
                  popular={service.popular}
                  badge={service.badge}
                  backgroundColor={service.backgroundColor}
                />
              </div>
            ))}
          </div>
          
          <div 
            ref={ctaAnimation.ref}
            className={`mt-16 text-center bg-secondary rounded-xl p-6 sm:p-8 ${animationClasses.scaleIn} ${
              ctaAnimation.isVisible ? animationClasses.scaleInActive : animationClasses.scaleInInactive
            }`}
          >
            <h3 className="text-2xl font-bold mb-4">Precisa de Algo Especial?</h3>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Tem uma necessidade específica que não está listada aqui? Oferecemos serviços personalizados adaptados às necessidades específicas do seu pet.
            </p>
            <Button asChild size="lg" className="w-full sm:w-auto break-words text-sm sm:text-base px-4 sm:px-6 transition-all duration-300 hover:shadow-lg hover:scale-105">
              <Link to="/book">Contate-nos Para Serviços Personalizados</Link>
            </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Services;
