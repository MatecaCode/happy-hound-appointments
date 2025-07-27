
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { useScrollAnimation, animationClasses } from '@/hooks/useScrollAnimation';

interface Review {
  author: string;
  text: string;
}

const reviews: Review[] = [
  {
    author: "Mariana, dona do Thor",
    text: "A equipe foi super atenciosa desde o primeiro contato. Meu cachorro saiu feliz e cheiroso!"
  },
  {
    author: "Rafael, dono da Lili",
    text: "Impressionado com o cuidado no atendimento. Explicaram tudo com calma e real preocupação."
  },
  {
    author: "Beatriz, dona do Scooby",
    text: "Ambiente limpo, equipe gentil e serviço impecável. Nossa clínica de confiança."
  },
  {
    author: "Lucas, dono da Bela",
    text: "Levei minha cadela para tosa e o resultado ficou lindo. Atenção aos detalhes que pedi."
  },
  {
    author: "Fernanda, dona do Nino",
    text: "Incríveis no atendimento de emergência. Suporte e tranquilidade o tempo todo."
  },
  {
    author: "Caio, dono da Mel",
    text: "Serviço profissional e acolhedor. A Vettale cuida da história de cada pet."
  },
  {
    author: "Juliana, dona do Max",
    text: "Pontuais, organizados e com carinho pelos animais. O cuidado que procuramos."
  }
];

const Testimonials: React.FC = () => {
  const [isPaused, setIsPaused] = useState(false);
  const headerAnimation = useScrollAnimation<HTMLDivElement>({ delay: 100 });

  // Calculate how many reviews per view based on screen size
  const getReviewsPerView = () => {
    if (typeof window !== 'undefined') {
      if (window.innerWidth < 768) return 1; // mobile
      if (window.innerWidth < 1024) return 2; // tablet
      return 3; // desktop
    }
    return 3; // default
  };

  const [reviewsPerView, setReviewsPerView] = useState(getReviewsPerView());

  // Update reviews per view on window resize
  useEffect(() => {
    const handleResize = () => {
      const newReviewsPerView = getReviewsPerView();
      setReviewsPerView(newReviewsPerView);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Create tripled reviews for seamless looping (no gaps)
  const duplicatedReviews = [...reviews, ...reviews, ...reviews];

  return (
    <section className="py-16" style={{ backgroundColor: '#FFFCF8' }}>
      <div className="max-w-7xl mx-auto px-6">
        <div 
          ref={headerAnimation.ref}
          className={`text-center mb-12 ${animationClasses.fadeIn} ${
            headerAnimation.isVisible ? animationClasses.fadeInActive : animationClasses.fadeInInactive
          }`}
        >
          <h2 className="mb-4">O que Nossos <span className="text-primary">Clientes</span> Dizem</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Não acredite apenas em nossa palavra. Veja o que os tutores em nossa comunidade dizem sobre o cuidado que oferecemos.
          </p>
        </div>
        
        {/* Carousel Container */}
        <div className="relative overflow-hidden">

          {/* Continuous Scroll Container */}
          <div className="relative overflow-hidden" style={{ minHeight: '240px' }}>
            <style>{`
              @keyframes continuousScroll {
                0% { transform: translateX(0px); }
                100% { transform: translateX(-${reviews.length * (320 + 32)}px); }
              }
            `}</style>
            
            <div 
              className={`flex gap-8 transition-transform duration-1000 ease-in-out`}
              style={{
                animation: !isPaused ? 'continuousScroll 50s linear infinite' : 'none'
              }}
            >
              {duplicatedReviews.map((review, index) => {
                return (
                  <div 
                    key={`scroll-${index}-${review.author}`}
                    className="flex-shrink-0"
                    style={{ 
                      width: reviewsPerView === 1 ? '300px' : reviewsPerView === 2 ? '280px' : '320px'
                    }}
                  >
                    <Card 
                      className="border-0 shadow-sm hover:shadow-xl transition-all duration-500 group cursor-pointer hover:scale-105"
                      style={{ 
                        backgroundColor: index % 2 === 0 ? '#F5EEE5' : '#E9F3E1',
                        height: '200px'
                      }}
                    >
                      <CardContent className="pt-6 pb-4 h-full flex flex-col">
                        <div className="flex gap-1 mb-3">
                          {[...Array(5)].map((_, i) => (
                            <svg key={i} className="w-5 h-5 text-yellow-400 transition-transform duration-300 group-hover:scale-110" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                        
                        <p className="text-foreground text-sm font-medium leading-relaxed flex-grow">"{review.text}"</p>
                        
                        <div className="mt-4 mb-2">
                          <p className="font-semibold text-foreground text-sm">{review.author}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>
          </div>


        </div>
      </div>
    </section>
  );
};

export default Testimonials;
