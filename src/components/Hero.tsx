
import React from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, Heart, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useScrollAnimation, animationClasses } from '@/hooks/useScrollAnimation';

const Hero = () => {
  const titleAnimation = useScrollAnimation<HTMLHeadingElement>({ delay: 100 });
  const subtitleAnimation = useScrollAnimation<HTMLParagraphElement>({ delay: 300 });
  const buttonAnimation = useScrollAnimation<HTMLDivElement>({ delay: 500 });
  const featuresAnimation = useScrollAnimation<HTMLDivElement>({ delay: 700 });
  const imageAnimation = useScrollAnimation<HTMLDivElement>({ delay: 200 });

  return (
    <section className="relative bg-gradient-to-br from-brand-primary/5 to-brand-secondary/10 py-20" style={{ backgroundColor: '#FFFCF8' }}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 
                ref={titleAnimation.ref}
                className={`text-4xl md:text-6xl font-bold leading-tight ${animationClasses.fadeIn} ${
                  titleAnimation.isVisible ? animationClasses.fadeInActive : animationClasses.fadeInInactive
                }`}
              >
                Cuidado Completo para seu <span className="text-brand-primary">Pet</span>
              </h1>
              <p 
                ref={subtitleAnimation.ref}
                className={`text-xl text-muted-foreground ${animationClasses.slideUp} ${
                  subtitleAnimation.isVisible ? animationClasses.slideUpActive : animationClasses.slideUpInactive
                }`}
              >
                Cuidamos com carinho da saúde, beleza e bem-estar do seu pet — em cada fase da vida.
              </p>
            </div>
            
            <div 
              ref={buttonAnimation.ref}
              className={`flex flex-col sm:flex-row gap-4 ${animationClasses.scaleIn} ${
                buttonAnimation.isVisible ? animationClasses.scaleInActive : animationClasses.scaleInInactive
              }`}
            >
              <Button size="lg" asChild className="bg-primary text-white hover:bg-primary/90 transition-all duration-300 hover:shadow-lg hover:scale-105">
                <Link to="/book">Agendar Consulta</Link>
              </Button>
            </div>
            
            <div 
              ref={featuresAnimation.ref}
              className={`flex items-center gap-8 pt-8 ${animationClasses.slideUp} ${
                featuresAnimation.isVisible ? animationClasses.slideUpActive : animationClasses.slideUpInactive
              }`}
            >
              <div className="flex items-center gap-2 group">
                <Calendar className="h-5 w-5 text-brand-primary transition-transform duration-300 group-hover:scale-110" />
                <span className="text-sm">Agendamento Online</span>
              </div>
              <div className="flex items-center gap-2 group">
                <Heart className="h-5 w-5 text-brand-primary transition-transform duration-300 group-hover:scale-110" />
                <span className="text-sm">Cuidado Personalizado</span>
              </div>
              <div className="flex items-center gap-2 group">
                <Shield className="h-5 w-5 text-brand-primary transition-transform duration-300 group-hover:scale-110" />
                <span className="text-sm">Segurança Total</span>
              </div>
            </div>
          </div>
          
          <div 
            ref={imageAnimation.ref}
            className={`relative ${animationClasses.slideInRight} ${
              imageAnimation.isVisible ? animationClasses.slideInRightActive : animationClasses.slideInRightInactive
            }`}
          >
            <img 
              src="/lovable-uploads/58d1d3ba-3aac-4831-819e-db278e404d9d.png" 
              alt="Cachorro corgi feliz com patinhas levantadas em ambiente acolhedor" 
              className="rounded-lg shadow-2xl w-full h-[500px] object-cover transition-transform duration-500 hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-lg"></div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
