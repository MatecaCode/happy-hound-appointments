import React from 'react';
import Layout from '@/components/Layout';
import ServiceCard from '@/components/ServiceCard';
import { Scissors, ShowerHead, Dog, Sparkles, Smile, Syringe, Heart, Calendar, Pill, Package } from 'lucide-react';
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
      title: "Banho Simples",
      description: "Banho completo com escovação para renovar o visual.",
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
      title: "Banho Ionizado",
      description: "Banho com ozônio para higiene profunda e cuidado da pele, conforme indicação.",
      icon: <Sparkles className="h-6 w-6" />,
      backgroundColor: "#EAF4FB", // Light blue
      details: [
        "Banho com ozônio medicinal",
        "Higiene profunda da pele",
        "Cuidado especializado",
        "Indicação veterinária",
        "Benefícios terapêuticos"
      ]
    },
    {
      title: "Tosa Completa",
      description: "Corte completo com finalização caprichada e estilo conforme sua preferência.",
      icon: <Scissors className="h-6 w-6" />,
      popular: true,
      badge: "Mais Popular",
      backgroundColor: "#F5EEE5", // Light beige
      details: [
        "Todos os serviços do Banho Simples",
        "Corte personalizado",
        "Tosa da face",
        "Tosa das almofadinhas das patas",
        "Tosa higiênica"
      ]
    },
    {
      title: "Tosa na Tesoura",
      description: "Acabamento artesanal feito à tesoura para um visual mais preciso e delicado.",
      icon: <Scissors className="h-6 w-6" />,
      backgroundColor: "#E9F3E1", // Soft green
      details: [
        "Trabalho artesanal",
        "Precisão na tesoura",
        "Acabamento delicado",
        "Visual personalizado",
        "Técnica especializada"
      ]
    },
    {
      title: "Tosa Higiênica",
      description: "Aparos em áreas íntimas e sensíveis para facilitar a higiene diária.",
      icon: <Scissors className="h-6 w-6" />,
      backgroundColor: "#FDECE4", // Soft blush/peach
      details: [
        "Aparos higiênicos",
        "Áreas íntimas",
        "Facilita limpeza",
        "Conforto diário",
        "Higiene otimizada"
      ]
    },
    {
      title: "Corte de Unhas",
      description: "Corte seguro para manter as patinhas saudáveis.",
      icon: <Scissors className="h-6 w-6" />,
      backgroundColor: "#EAF4FB", // Light blue
      details: [
        "Corte de unhas",
        "Lixamento de unhas",
        "Verificação das almofadinhas"
      ]
    },
    {
      title: "Limpeza de Dentes",
      description: "Higiene bucal para proteger a saúde do seu cão.",
      icon: <Smile className="h-6 w-6" />,
      backgroundColor: "#F5EEE5", // Light beige
      details: [
        "Escovação com pasta de dente própria para cães",
        "Exame de gengivas",
        "Refrescante bucal"
      ]
    },
    {
      title: "Primeira Tosa do Filhote",
      description: "Experiência leve para o primeiro contato com a tosa para filhotes com até 6 meses.",
      icon: <Dog className="h-6 w-6" />,
      backgroundColor: "#E9F3E1", // Soft green
      details: [
        "Shampoo suave para filhotes",
        "Tosa leve para acostumar o filhote",
        "Treinamento com reforço positivo",
        "Corte de unhas e limpeza de ouvidos",
        "Exercícios de manipulação para futuras tosas"
      ]
    }
  ];

  const packages = [
    {
      title: "Essencial",
      description: "Pacote de banhos por 3 meses para manter higiene e conforto do seu pet.",
      icon: <Package className="h-6 w-6" />,
      backgroundColor: "#FDECE4", // Soft blush/peach
    },
    {
      title: "Spa Luxo",
      description: "Banho + tosa por 3 meses para um visual sempre em dia.",
      icon: <Package className="h-6 w-6" />,
      backgroundColor: "#F5EEE5", // Light beige
    },
    {
      title: "Spa Premium",
      description: "Banho + tosa com hidratação por 3 meses para brilho e maciez.",
      icon: <Package className="h-6 w-6" />,
      popular: true,
      badge: "Mais Popular",
      backgroundColor: "#EAF4FB", // Light blue
    },
    {
      title: "Master Ozônio",
      description: "Banho ionizado + tosa com hidratação ou clareamento por 3 meses para um cuidado premium.",
      icon: <Package className="h-6 w-6" />,
      backgroundColor: "#E9F3E1", // Soft green
    }
  ];

  const vetServices = [
    {
      title: "Consulta Veterinária",
      description: "Avaliação clínica completa.",
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
      description: "Esquema vacinal atualizado para proteção contínua.",
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
      description: "Consulta com exames laboratoriais principais para um diagnóstico preciso.",
      icon: <Heart className="h-6 w-6" />,
      backgroundColor: "#FDECE4", // Soft blush/peach
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
      title: "Exames Laboratoriais",
      description: "Coleta e análise em laboratório para monitorar a saúde do seu pet.",
      icon: <Syringe className="h-6 w-6" />,
      backgroundColor: "#F5EEE5", // Light beige
      details: [
        "Hemograma completo",
        "Perfil bioquímico",
        "Exame de urina",
        "Exames específicos conforme necessidade",
        "Resultados em até 24h"
      ]
    },
    {
      title: "Cirurgias",
      description: "Procedimentos seguros, como castração, com indicação após avaliação veterinária.",
      icon: <Syringe className="h-6 w-6" />,
      backgroundColor: "#EAF4FB", // Light blue
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
      description: "Cuidados dentários completos para saúde bucal.",
      icon: <Smile className="h-6 w-6" />,
      backgroundColor: "#E9F3E1", // Soft green
      details: [
        "Avaliação da saúde bucal",
        "Limpeza com ultrassom",
        "Remoção de tártaro",
        "Polimento dentário",
        "Orientações para cuidados em casa"
      ]
    },
    {
      title: "Raio-X Digital",
      description: "Imagem rápida para avaliação de ossos e articulações.",
      icon: <Heart className="h-6 w-6" />,
      backgroundColor: "#FDECE4", // Soft blush/peach
      details: [
        "Exame radiográfico digital",
        "Avaliação de ossos e articulações",
        "Diagnóstico de fraturas",
        "Avaliação de desenvolvimento",
        "Resultado imediato"
      ]
    },
    {
      title: "Ultrassonografia",
      description: "Exame de ultrassom para avaliação de órgãos internos.",
      icon: <Heart className="h-6 w-6" />,
      backgroundColor: "#F5EEE5", // Light beige
      details: [
        "Avaliação de órgãos internos",
        "Diagnóstico de gestação",
        "Avaliação cardíaca",
        "Detecção de massas",
        "Exame não invasivo"
      ]
    },
    {
      title: "Oftalmologia Veterinária",
      description: "Diagnóstico e cuidado para a saúde dos olhos.",
      icon: <Heart className="h-6 w-6" />,
      backgroundColor: "#EAF4FB", // Light blue
      details: [
        "Exame oftalmológico completo",
        "Diagnóstico de problemas oculares",
        "Tratamento de doenças dos olhos",
        "Cirurgias oftalmológicas",
        "Acompanhamento especializado"
      ]
    },
    {
      title: "Acupuntura Veterinária",
      description: "Terapia complementar para dor e bem-estar.",
      icon: <Pill className="h-6 w-6" />,
      backgroundColor: "#E9F3E1", // Soft green
      details: [
        "Avaliação da condição do pet",
        "Sessão de 30-45 minutos",
        "Técnica indolor",
        "Plano de tratamento personalizado",
        "Integração com medicina convencional"
      ]
    },
    {
      title: "Ozonioterapia",
      description: "Aplicação de ozônio como terapia auxiliar, conforme indicação.",
      icon: <Pill className="h-6 w-6" />,
      backgroundColor: "#FDECE4", // Soft blush/peach
      details: [
        "Aplicação de ozônio medicinal",
        "Terapia auxiliar para diversas condições",
        "Tratamento complementar",
        "Indicação veterinária específica",
        "Sessões programadas"
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
        </div>
      </section>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <Separator className="my-8" />
      </div>
      
      {/* Pacotes */}
      <section className="py-8 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-center mb-6 sm:mb-12">
            <div className="w-8 sm:w-16 h-0.5 bg-primary mr-2 sm:mr-4"></div>
            <h2 className="text-2xl sm:text-3xl font-bold text-center px-2">Pacotes</h2>
            <div className="w-8 sm:w-16 h-0.5 bg-primary ml-2 sm:ml-4"></div>
          </div>
          
                     <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
             {packages.map((pkg, index) => (
               <div key={index} className="min-w-0 h-full">
                 <ServiceCard 
                   title={pkg.title}
                   description={pkg.description}
                   icon={pkg.icon}
                   popular={pkg.popular}
                   badge={pkg.badge}
                   backgroundColor={pkg.backgroundColor}
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
