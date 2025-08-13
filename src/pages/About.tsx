import React from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Heart, Calendar, Dog, Syringe, Cat } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useScrollAnimation, animationClasses } from '@/hooks/useScrollAnimation';
import { Container, Stack } from '@/components/primitives';

const About = () => {
  // Animation hooks
  const heroAnimation = useScrollAnimation<HTMLDivElement>({ delay: 100 });
  const historyAnimation = useScrollAnimation<HTMLDivElement>({ delay: 200 });
  const historyImageAnimation = useScrollAnimation<HTMLDivElement>({ delay: 300 });
  const valuesAnimation = useScrollAnimation<HTMLDivElement>({ delay: 200 });
  const teamAnimation = useScrollAnimation<HTMLDivElement>({ delay: 200 });
  const teamImageAnimation = useScrollAnimation<HTMLDivElement>({ delay: 300 });
  const todayAnimation = useScrollAnimation<HTMLDivElement>({ delay: 200 });
  const todayImagesAnimation = useScrollAnimation<HTMLDivElement>({ delay: 300 });
  const metricsAnimation = useScrollAnimation<HTMLDivElement>({ delay: 400 });
  const ctaAnimation = useScrollAnimation<HTMLDivElement>({ delay: 200 });

  return (
    <Layout>
      {/* Hero Section */}
      <section className="bg-secondary/50 py-16 md:py-24">
        <Container>
          <div 
            ref={heroAnimation.ref}
            className={`text-center mb-12 ${animationClasses.fadeIn} ${
              heroAnimation.isVisible ? animationClasses.fadeInActive : animationClasses.fadeInInactive
            }`}
          >
            <h1 className="mb-4">Sobre <span className="text-brand-primary">Nós</span></h1>
            <p className="text-muted-foreground max-w-3xl mx-auto">
              Uma Jornada de Amor e Inovação pelos Pets
            </p>
          </div>
        </Container>
      </section>
      
      {/* Nossa História */}
      <section className="py-16 md:py-24">
        <Container>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div 
              ref={historyAnimation.ref}
              className={`${animationClasses.fadeIn} ${
                historyAnimation.isVisible ? animationClasses.fadeInActive : animationClasses.fadeInInactive
              }`}
            >
              <h2 className="mb-6">Nossa <span className="text-brand-primary">História</span></h2>
              <p className="text-muted-foreground mb-6">
                Há mais de 40 anos, trocamos a agitação da capital paulista pela tranquilidade de Atibaia para realizar um sonho: 
                construir nossa primeira sede própria totalmente dedicada ao bem‑estar dos animais. Em 1988 compramos 
                o terreno da Rua Lucas, onde inauguramos nossa sede em 1990.
              </p>
              <p className="text-muted-foreground">
                A paixão cresceu, a família também, e em dezembro de 2011 mudamos para nosso endereço atual — a terceira clínica 
                veterinária de Atibaia, projetada do zero para oferecer um centro completo de saúde, estética e comportamento pet.
              </p>
            </div>
            <div 
              ref={historyImageAnimation.ref}
              className={`${animationClasses.slideUp} ${
                historyImageAnimation.isVisible ? animationClasses.slideUpActive : animationClasses.slideUpInactive
              }`}
            >
              <div className="aspect-[4/3] md:aspect-[3/2] sm:aspect-square rounded-lg shadow-lg overflow-hidden">
                <img 
                  src="https://ieotixprkfglummoobkb.supabase.co/storage/v1/object/public/websitecontent//Inauguration%20Clinic.jpg"
                  alt="Nossa primeira clínica em 1990 - Inauguração da sede própria da Vettale" 
                  loading="lazy" 
                  decoding="async" 
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                />
              </div>
              <p className="text-sm text-center mt-2 text-muted-foreground">Nossa primeira sede própria inaugurada em 1990</p>
            </div>
          </div>
        </Container>
      </section>
      
      {/* Pioneiros que Fazem História */}
      <section className="bg-secondary/30 py-16 md:py-24">
        <Container>
          <div 
            ref={valuesAnimation.ref}
            className={`text-center mb-12 ${animationClasses.fadeIn} ${
              valuesAnimation.isVisible ? animationClasses.fadeInActive : animationClasses.fadeInInactive
            }`}
          >
            <h2>Pioneiros que <span className="text-brand-primary">Fazem História</span></h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div 
              className={`flex gap-6 ${animationClasses.slideUp} ${
                valuesAnimation.isVisible ? animationClasses.slideUpActive : animationClasses.slideUpInactive
              }`}
            >
              <div className="flex-shrink-0 mt-1">
                <Dog className="h-8 w-8 text-brand-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2 text-center">Primeiro TaxiDog da cidade</h3>
                <p className="text-muted-foreground">
                  Quando ninguém falava em transporte pet, já levávamos cães e gatos com segurança — de Fusca, 
                  depois de Fiorino.
                </p>
              </div>
            </div>
            
            <div 
              className={`flex gap-6 ${animationClasses.slideInRight} ${
                valuesAnimation.isVisible ? animationClasses.slideInRightActive : animationClasses.slideInRightInactive
              }`}
            >
              <div className="flex-shrink-0 mt-1">
                <Heart className="h-8 w-8 text-brand-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2 text-center">Cãominhada e eventos caninos</h3>
                <p className="text-muted-foreground">
                  Trouxemos grandes patrocinadores, parceria com Purina Agility e transformamos finais de semana 
                  em programas para toda a família.
                </p>
              </div>
            </div>
            
            <div 
              className={`flex gap-6 ${animationClasses.slideUp} ${
                valuesAnimation.isVisible ? animationClasses.slideUpActive : animationClasses.slideUpInactive
              }`}
            >
              <div className="flex-shrink-0 mt-1">
                <Cat className="h-8 w-8 text-brand-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2 text-center">Educação e comunidade</h3>
                <p className="text-muted-foreground">
                  Feiras de adoção, ações em escolas e eventos temáticos aproximaram milhares de crianças do 
                  universo pet.
                </p>
              </div>
            </div>
            
            <div 
              className={`flex gap-6 ${animationClasses.slideInRight} ${
                valuesAnimation.isVisible ? animationClasses.slideInRightActive : animationClasses.slideInRightInactive
              }`}
            >
              <div className="flex-shrink-0 mt-1">
                <Syringe className="h-8 w-8 text-brand-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2 text-center">Serviços premium e medicina integrativa</h3>
                <p className="text-muted-foreground">
                  De check‑ups preventivos a acupuntura, oferecemos especialidades cuidadosamente selecionadas.
                </p>
              </div>
            </div>
          </div>
          
          <div className="mt-12">
            <div className="aspect-[4/3] md:aspect-[3/2] sm:aspect-square rounded-lg shadow-lg overflow-hidden">
              <img 
                src="https://ieotixprkfglummoobkb.supabase.co/storage/v1/object/public/websitecontent//Dog%20Minhada%20com%20pessoas.jpg"
                alt="Eventos da Cãominhada - Comunidade unida em prol dos pets" 
                loading="lazy" 
                decoding="async" 
                className="w-full h-full object-cover"
              />
            </div>
            <p className="text-sm text-center mt-2 text-muted-foreground">Nossa 2ª Cãominhada (1995): um encontro inesquecível que uniu famílias, espalhou sorrisos e arrecadou fundos para cães em situação de risco 🐶</p>
          </div>
        </Container>
      </section>
      
      {/* O Que Nos Move */}
      <section className="py-16 md:py-24">
        <Container>
          <div 
            ref={teamAnimation.ref}
            className={`text-center mb-12 ${animationClasses.fadeIn} ${
              teamAnimation.isVisible ? animationClasses.fadeInActive : animationClasses.fadeInInactive
            }`}
          >
            <h2>O Que Nos <span className="text-brand-primary">Move</span></h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div 
              className={`bg-white p-8 rounded-lg shadow ${animationClasses.slideUp} ${
                teamAnimation.isVisible ? animationClasses.slideUpActive : animationClasses.slideUpInactive
              }`}
            >
              <h3 className="text-xl font-bold mb-4 text-center">Cuidado nos detalhes</h3>
              <p className="text-muted-foreground">
                Do primeiro atendimento ao banho & tosa com penteados elaborados, sua tranquilidade é a nossa prioridade.
              </p>
            </div>
            
            <div 
              className={`bg-white p-8 rounded-lg shadow ${animationClasses.slideInRight} ${
                teamAnimation.isVisible ? animationClasses.slideInRightActive : animationClasses.slideInRightInactive
              }`}
            >
              <h3 className="text-xl font-bold mb-4 text-center">Customer Success animal</h3>
              <p className="text-muted-foreground">
                Acompanhamos cada etapa da jornada de saúde do pet para garantir resultados duradouros.
              </p>
            </div>
            
            <div 
              className={`bg-white p-8 rounded-lg shadow ${animationClasses.slideUp} ${
                teamAnimation.isVisible ? animationClasses.slideUpActive : animationClasses.slideUpInactive
              }`}
            >
              <h3 className="text-xl font-bold mb-4 text-center">Segurança em primeiro lugar</h3>
              <p className="text-muted-foreground">
                Infraestrutura, protocolos rigorosos e profissionais experientes asseguram tratamentos de ponta com total confiança.
              </p>
            </div>
            
            <div 
              className={`bg-white p-8 rounded-lg shadow ${animationClasses.slideInRight} ${
                teamAnimation.isVisible ? animationClasses.slideInRightActive : animationClasses.slideInRightInactive
              }`}
            >
              <h3 className="text-xl font-bold mb-4 text-center">Formamos profissionais</h3>
              <p className="text-muted-foreground">
                Muitos talentos que começaram conosco abriram seus próprios negócios, impulsionando o mercado pet local.
              </p>
            </div>
          </div>
          
          <div 
            ref={teamImageAnimation.ref}
            className={`mt-12 ${animationClasses.slideUp} ${
              teamImageAnimation.isVisible ? animationClasses.slideUpActive : animationClasses.slideUpInactive
            }`}
          >
            <div className="aspect-[4/3] md:aspect-[3/2] sm:aspect-square rounded-lg shadow-lg overflow-hidden">
              <img 
                src="https://ieotixprkfglummoobkb.supabase.co/storage/v1/object/public/websitecontent//Team.png" 
                alt="Nossa equipe atual - Profissionais dedicados da Vettale" 
                loading="lazy" 
                decoding="async" 
                className="w-full h-full object-cover object-top transition-transform duration-500 hover:scale-105"
              />
            </div>
            <p className="text-sm text-center mt-2 text-muted-foreground">Nossa equipe de profissionais dedicados</p>
          </div>
        </Container>
      </section>
      
      {/* Onde Estamos Hoje */}
      <section className="py-16 md:py-24" style={{ backgroundColor: '#FFFCF8' }}>
        <Container>
          <div 
            ref={todayAnimation.ref}
            className={`text-center mb-12 ${animationClasses.fadeIn} ${
              todayAnimation.isVisible ? animationClasses.fadeInActive : animationClasses.fadeInInactive
            }`}
          >
            <h2 className="mb-4">Onde Estamos <span className="text-brand-primary">Hoje</span></h2>
            <p className="text-muted-foreground max-w-3xl mx-auto">
              De 1981 até o momento, 44 anos de dedicação em Atibaia nos transformaram de uma pequena clínica para um centro veterinário completo. 
              Hoje, com tecnologia de ponta e o mesmo carinho de sempre, continuamos a missão dos fundadores.
            </p>
          </div>
          
          <div 
            ref={todayImagesAnimation.ref}
            className={`grid grid-cols-1 md:grid-cols-3 gap-8 mb-12 ${animationClasses.slideUp} ${
              todayImagesAnimation.isVisible ? animationClasses.slideUpActive : animationClasses.slideUpInactive
            }`}
          >
            {/* Image Slot 1 - Pioneiros */}
            <div className="space-y-4">
              <div className="aspect-[4/3] md:aspect-[3/2] sm:aspect-square rounded-lg shadow-lg overflow-hidden">
                <img 
                  src="https://ieotixprkfglummoobkb.supabase.co/storage/v1/object/public/websitecontent//Classic.jpg"
                  alt="Pioneiros em Atibaia-SP - Primeiros anos da clínica"
                  loading="lazy" 
                  decoding="async" 
                  className="h-full w-full object-cover object-top transition-transform duration-500 hover:scale-105"
                />
              </div>
              <div className="text-center">
                <h3 className="font-semibold text-lg mb-2">Pioneiros em Atibaia-SP</h3>
                <p className="text-sm text-muted-foreground">
                  Os primeiros passos na cidade, estabelecendo as bases do que se tornaria a primeira clínica veterinária completa de Atibaia.
                </p>
              </div>
            </div>
            
            {/* Image Slot 2 - Transition Period */}
            <div className="space-y-4">
              <div className="aspect-[4/3] md:aspect-[3/2] sm:aspect-square rounded-lg shadow-lg overflow-hidden">
                <img 
                  src="https://ieotixprkfglummoobkb.supabase.co/storage/v1/object/public/websitecontent//MundiauMed.png"
                  alt="Era MundiauPet - Três décadas de tradição veterinária"
                  loading="lazy" 
                  decoding="async" 
                  className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                />
              </div>
              <div className="text-center">
                <h3 className="font-semibold text-lg mb-2">Era MundiauPet</h3>
                <p className="text-sm text-muted-foreground">
                  Três décadas de dedicação, estabelecendo a confiança da comunidade e construindo nossa reputação de excelência em Atibaia.
                </p>
              </div>
            </div>
            
                         {/* Image Slot 3 - Vettale Era */}
             <div className="space-y-4 blur-sm">
               <div className="aspect-[4/3] md:aspect-[3/2] sm:aspect-square rounded-lg shadow-lg overflow-hidden">
                 <img 
                   src="https://ieotixprkfglummoobkb.supabase.co/storage/v1/object/public/websitecontent//NewClinic.png"
                   alt="Nova Era Vettale - Tecnologia de ponta e tradição"
                   loading="lazy" 
                   decoding="async" 
                   className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                 />
               </div>
               <div className="text-center">
                 <h3 className="font-semibold text-lg mb-2">Era Vettale</h3>
                 <p className="text-sm text-muted-foreground">
                   Nova identidade, tecnologia avançada e compromisso renovado com a excelência em cuidados veterinários.
                 </p>
               </div>
             </div>
          </div>
          
          {/* Métricas de Impacto */}
          <div 
            ref={metricsAnimation.ref}
            className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 ${animationClasses.slideUp} ${
              metricsAnimation.isVisible ? animationClasses.slideUpActive : animationClasses.slideUpInactive
            }`}
          >
                         <div className="bg-white p-6 rounded-lg shadow text-center group hover:shadow-xl hover:-translate-y-2 transition-all duration-500 cursor-pointer relative overflow-hidden">
               <div className="text-3xl font-bold text-primary mb-2 group-hover:scale-110 transition-transform duration-300">
                 +250.000
               </div>
               <h3 className="font-semibold text-lg mb-2">Banhos</h3>
               <p className="text-sm text-muted-foreground">
                 Pets felizes e cheirosos que passaram por nossas mãos
               </p>
             </div>
            
                         <div className="bg-white p-6 rounded-lg shadow text-center group hover:shadow-xl hover:-translate-y-2 transition-all duration-500 cursor-pointer relative overflow-hidden">
               <div className="text-3xl font-bold text-primary mb-2 group-hover:scale-110 transition-transform duration-300">
                 +16.000
               </div>
               <h3 className="font-semibold text-lg mb-2">Consultas</h3>
               <p className="text-sm text-muted-foreground">
                 Consultas e cuidados especializados para cada pet
               </p>
             </div>
            
                         <div className="bg-white p-6 rounded-lg shadow text-center group hover:shadow-xl hover:-translate-y-2 transition-all duration-500 cursor-pointer relative overflow-hidden">
               <div className="text-3xl font-bold text-primary mb-2 group-hover:scale-110 transition-transform duration-300">
                 +600
               </div>
               <h3 className="font-semibold text-lg mb-2">Cirurgias</h3>
               <p className="text-sm text-muted-foreground">
                 Procedimentos cirúrgicos realizados com excelência
               </p>
             </div>
            
                         <div className="bg-white p-6 rounded-lg shadow text-center group hover:shadow-xl hover:-translate-y-2 transition-all duration-500 cursor-pointer relative overflow-hidden">
               <div className="text-3xl font-bold text-primary mb-2 group-hover:scale-110 transition-transform duration-300">
                 ∞
               </div>
               <h3 className="font-semibold text-lg mb-2">Sorrisos Incontáveis</h3>
               <p className="text-sm text-muted-foreground">
                 Momentos de alegria e gratidão que não podem ser medidos
               </p>
             </div>
          </div>
          
          {/* Additional Info Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-lg shadow">
              <h3 className="text-xl font-bold mb-4 text-center">Legado Preservado</h3>
              <p className="text-muted-foreground">
                Apesar do crescimento, mantemos viva a essência dos fundadores: cuidado personalizado, atenção aos detalhes e amor pelos animais.
              </p>
            </div>
            
            <div className="bg-white p-8 rounded-lg shadow">
              <h3 className="text-xl font-bold mb-4 text-center">Tecnologia e Carinho</h3>
              <p className="text-muted-foreground">
                Combinamos equipamentos de última geração com o mesmo carinho e atenção que sempre nos caracterizou.
              </p>
            </div>
          </div>
        </Container>
      </section>
      
      {/* CTA Section */}
      <section className="bg-brand-primary text-brand-primaryFg py-16 md:py-24">
        <Container>
          <div 
            ref={ctaAnimation.ref}
            className={`text-center ${animationClasses.fadeIn} ${
              ctaAnimation.isVisible ? animationClasses.fadeInActive : animationClasses.fadeInInactive
            }`}
          >
            <h2 className="mb-6">Agende a sua visita</h2>
            <p className="text-brand-primaryFg/90 max-w-2xl mx-auto mb-8">
              Venha conhecer o Centro Veterinário Completo mais tradicional de Atibaia. Estamos prontos para cuidar do seu pet — 
              com a experiência de quem entende e o carinho de quem ama.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/book">
                <Button size="lg" variant="secondary">Agendar Consulta</Button>
              </Link>
              <Link to="/services">
                <Button size="lg" variant="outline" className="bg-transparent border-white text-white hover:bg-white/20">
                  Conhecer Serviços
                </Button>
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </Layout>
  );
};

export default About;
