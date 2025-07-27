
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useScrollAnimation, animationClasses } from '@/hooks/useScrollAnimation';

interface Review {
  author: string;
  text: string;
}

const reviews: Review[] = [
  {
    author: "Mariana, dona do Thor",
    text: "A equipe foi super atenciosa desde o primeiro contato. Meu cachorro saiu feliz e cheiroso! Obrigado pelo carinho."
  },
  {
    author: "Rafael, dono da Lili",
    text: "Fiquei impressionado com o cuidado no atendimento. Explicaram tudo com calma e mostraram real preocupação com meu gato."
  },
  {
    author: "Beatriz, dona do Scooby",
    text: "Ambiente limpo, equipe gentil e serviço impecável. Já virou a clínica de confiança da nossa família."
  },
  {
    author: "Lucas, dono da Bela",
    text: "Levei minha cadela para tosa e o resultado ficou lindo. Deram atenção até aos detalhes que pedi. Super indico."
  },
  {
    author: "Fernanda, dona do Nino",
    text: "Foram incríveis no atendimento de emergência. Deram suporte e tranquilidade o tempo todo."
  },
  {
    author: "Caio, dono da Mel",
    text: "Serviço profissional e ao mesmo tempo acolhedor. A Vettale realmente cuida da história de cada pet."
  },
  {
    author: "Juliana, dona do Max",
    text: "Pontuais, organizados e com muito carinho pelos animais. O tipo de cuidado que a gente procura faz tempo."
  }
];

const Testimonials: React.FC = () => {
  const [currentGroup, setCurrentGroup] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');
  const [nextGroup, setNextGroup] = useState<number | null>(null);
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
      // Reset to first group when changing screen size
      setCurrentGroup(0);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculate total groups safely
  const totalGroups = Math.max(1, Math.ceil(reviews.length / reviewsPerView));

  // Auto-scroll functionality
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isTransitioning) {
        const next = (currentGroup + 1) % totalGroups;
        setNextGroup(next);
        setIsTransitioning(true);
        setSlideDirection('right');
        setTimeout(() => {
          setCurrentGroup(next);
          setNextGroup(null);
          setIsTransitioning(false);
        }, 600);
      }
    }, 4500); // 4.5 seconds

    return () => clearInterval(interval);
  }, [isTransitioning, currentGroup, totalGroups]);

  const goToNext = useCallback(() => {
    if (!isTransitioning) {
      const next = (currentGroup + 1) % totalGroups;
      setNextGroup(next);
      setIsTransitioning(true);
      setSlideDirection('right');
      setTimeout(() => {
        setCurrentGroup(next);
        setNextGroup(null);
        setIsTransitioning(false);
      }, 600);
    }
  }, [isTransitioning, currentGroup, totalGroups]);

  const goToPrev = useCallback(() => {
    if (!isTransitioning) {
      const next = (currentGroup - 1 + totalGroups) % totalGroups;
      setNextGroup(next);
      setIsTransitioning(true);
      setSlideDirection('left');
      setTimeout(() => {
        setCurrentGroup(next);
        setNextGroup(null);
        setIsTransitioning(false);
      }, 600);
    }
  }, [isTransitioning, currentGroup, totalGroups]);

  // Get current reviews to display with proper cycling
  const getCurrentReviews = () => {
    const startIndex = currentGroup * reviewsPerView;
    const reviewsToShow = [];
    
    for (let i = 0; i < reviewsPerView; i++) {
      const index = (startIndex + i) % reviews.length;
      reviewsToShow.push(reviews[index]);
    }
    
    return reviewsToShow;
  };

  // Get next reviews for smooth transition
  const getNextReviews = () => {
    if (nextGroup === null) return [];
    
    const startIndex = nextGroup * reviewsPerView;
    const reviewsToShow = [];
    
    for (let i = 0; i < reviewsPerView; i++) {
      const index = (startIndex + i) % reviews.length;
      reviewsToShow.push(reviews[index]);
    }
    
    return reviewsToShow;
  };

  const currentReviews = getCurrentReviews();
  const nextReviews = getNextReviews();

  return (
    <>
      <style>{`
        @keyframes slideToCenter {
          to {
            transform: translateX(0);
          }
        }
      `}</style>
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
          {/* Navigation Arrows */}
          <Button
            variant="outline"
            size="icon"
            onClick={goToPrev}
            disabled={isTransitioning}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-16 z-20 bg-primary text-white border-0 hover:bg-primary/90 transition-all duration-300 hover:scale-110 shadow-lg w-12 h-12"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            onClick={goToNext}
            disabled={isTransitioning}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-16 z-20 bg-primary text-white border-0 hover:bg-primary/90 transition-all duration-300 hover:scale-110 shadow-lg w-12 h-12"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>

          {/* Reviews Grid with Slide Animation */}
          <div className="relative overflow-hidden min-h-[400px]">
            {/* Current Reviews */}
            <div 
              className={`absolute top-0 left-0 right-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 transition-all duration-[600ms] ease-in-out ${
                isTransitioning 
                  ? slideDirection === 'right' 
                    ? 'transform -translate-x-full' 
                    : 'transform translate-x-full'
                  : 'transform translate-x-0'
              }`}
            >
              {currentReviews.map((review, index) => {
                const cardAnimation = useScrollAnimation<HTMLDivElement>({ delay: index * 200 + 200 });
                
                return (
                  <Card 
                    key={`current-${currentGroup}-${index}-${review.author}`}
                    ref={cardAnimation.ref}
                    className={`border-0 shadow-sm hover:shadow-xl transition-all duration-500 group cursor-pointer hover:scale-105 ${animationClasses.slideUp} ${
                      cardAnimation.isVisible ? animationClasses.slideUpActive : animationClasses.slideUpInactive
                    }`}
                    style={{ 
                      backgroundColor: index % 2 === 0 ? '#F5EEE5' : '#E9F3E1'
                    }}
                  >
                    <CardContent className="pt-6 pb-4">
                      <div className="space-y-4">
                        <div className="flex gap-1">
                          {[...Array(5)].map((_, i) => (
                            <svg key={i} className="w-5 h-5 text-yellow-400 transition-transform duration-300 group-hover:scale-110" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                        
                        <p className="text-foreground font-medium leading-relaxed">"{review.text}"</p>
                        
                        <div>
                          <p className="font-semibold text-foreground">{review.author}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Next Reviews (shown during transition) */}
            {isTransitioning && nextReviews.length > 0 && (
              <div 
                className={`absolute top-0 left-0 right-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 transition-all duration-[600ms] ease-in-out transform translate-x-0`}
                style={{
                  transform: slideDirection === 'right' 
                    ? 'translateX(100%)' 
                    : 'translateX(-100%)',
                  animation: `slideToCenter 600ms ease-in-out forwards`
                }}
              >
                {nextReviews.map((review, index) => (
                  <Card 
                    key={`next-${nextGroup}-${index}-${review.author}`}
                    className="border-0 shadow-sm hover:shadow-xl transition-all duration-500 group cursor-pointer hover:scale-105"
                    style={{ 
                      backgroundColor: index % 2 === 0 ? '#F5EEE5' : '#E9F3E1'
                    }}
                  >
                    <CardContent className="pt-6 pb-4">
                      <div className="space-y-4">
                        <div className="flex gap-1">
                          {[...Array(5)].map((_, i) => (
                            <svg key={i} className="w-5 h-5 text-yellow-400 transition-transform duration-300 group-hover:scale-110" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                        
                        <p className="text-foreground font-medium leading-relaxed">"{review.text}"</p>
                        
                        <div>
                          <p className="font-semibold text-foreground">{review.author}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Pagination Dots */}
          <div className="flex justify-center mt-12 mb-4 gap-2">
            {Array.from({ length: totalGroups }, (_, index) => (
              <button
                key={index}
                onClick={() => {
                  if (!isTransitioning) {
                    setIsTransitioning(true);
                    setSlideDirection(index > currentGroup ? 'right' : 'left');
                    setCurrentGroup(index);
                    setTimeout(() => setIsTransitioning(false), 500);
                  }
                }}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  currentGroup === index 
                    ? 'bg-primary scale-125' 
                    : 'bg-muted hover:bg-primary/50'
                }`}
                disabled={isTransitioning}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
    </>
  );
};

export default Testimonials;
