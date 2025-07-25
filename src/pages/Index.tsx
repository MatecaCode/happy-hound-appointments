import React, { useEffect } from 'react';
import Layout from '@/components/Layout';
import Hero from '@/components/Hero';
import ServiceCard from '@/components/ServiceCard';
import Testimonials from '@/components/Testimonials';
import { Scissors, ShowerHead, Dog, Sparkles, Syringe, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { useScrollAnimation, animationClasses } from '@/hooks/useScrollAnimation';
import { useAuth } from '@/hooks/useAuth';

const Index = () => {
  const navigate = useNavigate();
  const { user, isStaff, loading } = useAuth();
  
  const institutionalAnimation = useScrollAnimation<HTMLDivElement>({ delay: 200 });
  const servicesHeaderAnimation = useScrollAnimation<HTMLDivElement>({ delay: 100 });
  const banhoTosaHeaderAnimation = useScrollAnimation<HTMLDivElement>({ delay: 100 });
  const ctaAnimation = useScrollAnimation<HTMLDivElement>({ delay: 200 });

  // Redirect staff members to their dashboard
  useEffect(() => {
    if (!loading && user && isStaff) {
      console.log('🏥 Staff member detected, redirecting to dashboard...');
      navigate('/staff-dashboard', { replace: true });
    }
  }, [user, isStaff, loading, navigate]);

  const services = [
    {
      title: "Banho & Escovação Básica",
      description: "Banho com carinho, escovação cuidadosa e colônia leve para deixar seu pet renovado e feliz.",
      price: "R$40",
      icon: <ShowerHead className="h-6 w-6" />,
      backgroundColor: "#FDECE4", // Soft blush/peach
    },
    {
      title: "Consulta Veterinária",
      description: "Avaliação completa da saúde do seu pet com médico veterinário especializado.",
      price: "R$120",
      icon: <Syringe className="h-6 w-6" />,
      popular: true,
      badge: "Mais Agendado",
      backgroundColor: "#E9F3E1", // Soft green
    },
    {
      title: "Vacinação",
      description: "Imunização do seu pet com as principais vacinas necessárias para sua proteção.",
      price: "A partir de R$80",
      icon: <Heart className="h-6 w-6" />,
      backgroundColor: "#EAF4FB", // Light blue
    },
  ];

  const banhoTosaServices = [
    {
      title: "Tosa Completa",
      description: "Tudo do pacote básico mais corte de pelo estilizado conforme sua preferência.",
      price: "R$60",
      icon: <Scissors className="h-6 w-6" />,
      popular: true,
      badge: "Mais Popular",
      backgroundColor: "#F5EEE5",
    },
    {
      title: "Pacote Spa Luxo",
      description: "Tosa completa com shampoo especial, condicionador, limpeza de dentes e tratamento de patas.",
      price: "R$80",
      icon: <Sparkles className="h-6 w-6" />,
      backgroundColor: "#FDECE4",
    },
    {
      title: "Primeira Tosa do Filhote",
      description: "Introdução suave à tosa para filhotes com menos de 6 meses.",
      price: "R$45",
      icon: <Dog className="h-6 w-6" />,
      backgroundColor: "#EAF4FB",
    }
  ];

  return (
    <Layout>
      <div style={{ backgroundColor: '#FAF9F7', minHeight: '100vh' }}>
        <Hero />
        
        {/* História Breve */}
        <section className="py-20" style={{ backgroundColor: '#F5EEE5' }}>
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div 
                ref={institutionalAnimation.ref}
                className={`${animationClasses.fadeIn} ${
                  institutionalAnimation.isVisible ? animationClasses.fadeInActive : animationClasses.fadeInInactive
                }`}
              >
                <h2 className="mb-4">Tradição e <span className="text-primary">Inovação</span> desde 1990</h2>
                <p className="text-muted-foreground mb-6">
                  Há mais de 40 anos cuidando de cada história. E sempre com carinho, excelência e dedicação.
                </p>
                
                <Link to="/about">
                  <Button variant="outline" className="border-primary text-primary hover:bg-primary/5 transition-all duration-300 hover:shadow-md">
                    Conheça Nossa História
                  </Button>
                </Link>
              </div>
              <div 
                className={`${animationClasses.slideInRight} ${
                  institutionalAnimation.isVisible ? animationClasses.slideInRightActive : animationClasses.slideInRightInactive
                }`}
              >
                <img 
                  src="https://ieotixprkfglummoobkb.supabase.co/storage/v1/object/public/websitecontent//Cao%20Minhada%20foto.jpg" 
                  alt="Clínica Vettale - fachada moderna da clínica veterinária" 
                  className="rounded-lg shadow-lg h-80 w-full object-cover transition-transform duration-500 hover:scale-105"
                />
              </div>
            </div>
          </div>
        </section>
        
        {/* Services Section */}
        <section className="py-20" style={{ backgroundColor: '#FFFCF8' }}>
          <div className="max-w-7xl mx-auto px-6">
            <div 
              ref={servicesHeaderAnimation.ref}
              className={`text-center mb-12 ${animationClasses.fadeIn} ${
                servicesHeaderAnimation.isVisible ? animationClasses.fadeInActive : animationClasses.fadeInInactive
              }`}
            >
              <h2 className="mb-4">Nossos <span className="text-primary">Serviços</span> Principais</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Oferecemos uma variedade de serviços veterinários e de estética para manter seu pet saudável e bonito.
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
                  badge={service.badge}
                  backgroundColor={service.backgroundColor}
                  className="hover:scale-105 transition-transform duration-300"
                />
              ))}
            </div>
            
            <div className="mt-12 text-center">
              <Link to="/services">
                <Button variant="outline" className="border-primary text-primary hover:bg-primary/5 transition-all duration-300 hover:shadow-md">
                  Ver Todos os Serviços
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Banho & Tosa Section */}
        <section id="banho-e-tosa" className="py-20" style={{ backgroundColor: '#F5EEE5' }}>
          <div className="max-w-7xl mx-auto px-6">
            <div 
              ref={banhoTosaHeaderAnimation.ref}
              className={`text-center mb-12 ${animationClasses.fadeIn} ${
                banhoTosaHeaderAnimation.isVisible ? animationClasses.fadeInActive : animationClasses.fadeInInactive
              }`}
            >
              <h2 className="mb-4">Banho & <span className="text-primary">Tosa</span> Especializada</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Cuidamos da beleza e higiene do seu pet com carinho, produtos de qualidade e técnicas profissionais.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {banhoTosaServices.map((service, index) => (
                <ServiceCard 
                  key={index}
                  title={service.title}
                  description={service.description}
                  price={service.price}
                  icon={service.icon}
                  popular={service.popular}
                  badge={service.badge}
                  backgroundColor={service.backgroundColor}
                  className="hover:scale-105 transition-transform duration-300"
                />
              ))}
            </div>
          </div>
        </section>
        
        <Testimonials />
        
        {/* CTA Section */}
        <section className="py-20 bg-primary text-primary-foreground">
          <div className="max-w-7xl mx-auto px-6 text-center">
            <div 
              ref={ctaAnimation.ref}
              className={`${animationClasses.scaleIn} ${
                ctaAnimation.isVisible ? animationClasses.scaleInActive : animationClasses.scaleInInactive
              }`}
            >
              <div className="inline-flex items-center justify-center rounded-full p-2 mb-8" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}>
                <Dog className="h-5 w-5" />
              </div>
              
              <h2 className="mb-6">Pronto para Cuidar da Saúde do Seu Pet?</h2>
              
              <p className="text-primary-foreground/90 max-w-2xl mx-auto mb-8">
                Porque cada pet tem uma história. E a gente cuida de todas elas com amor e excelência.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="bg-white text-primary hover:bg-white/90 transition-all duration-300 hover:shadow-lg hover:scale-105" asChild>
                  <Link to="/book">Agendar Consulta</Link>
                </Button>
                <Button size="lg" variant="outline" className="bg-transparent border-white text-white hover:bg-white/10 transition-all duration-300 hover:shadow-lg" asChild>
                  <Link to="/services">Conhecer Serviços</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default Index;
