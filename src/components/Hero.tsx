
import React from 'react';
import { Button } from "@/components/ui/button";
import { Link } from 'react-router-dom';
import { Dog } from 'lucide-react';

const Hero: React.FC = () => {
  return (
    <div className="relative bg-gradient-to-br from-background to-secondary">
      <div className="max-w-7xl mx-auto px-6 py-20 md:py-32">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-block bg-primary/10 px-4 py-2 rounded-full">
              <div className="flex items-center gap-2 text-primary">
                <Dog className="h-5 w-5" />
                <span className="font-medium">Tosa Profissional para Cães</span>
              </div>
            </div>
            
            <h1>Cuide do Seu <span className="text-primary">Pet</span> Com Nossa Tosa Premium</h1>
            
            <p className="text-lg text-muted-foreground">
              Seu amigo peludo merece o melhor cuidado. Nossos profissionais especializados
              oferecem serviços de alta qualidade para manter seu cachorro bonito e se sentindo bem.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/book">
                <Button size="lg" className="px-8">Agendar Tosa</Button>
              </Link>
              <Link to="/services">
                <Button size="lg" variant="outline" className="px-8">Ver Serviços</Button>
              </Link>
            </div>
            
            <div className="flex items-center gap-4 mt-8">
              <div className="flex -space-x-2">
                <div className="w-8 h-8 rounded-full bg-secondary border-2 border-background flex items-center justify-center text-xs">
                  🐕
                </div>
                <div className="w-8 h-8 rounded-full bg-secondary border-2 border-background flex items-center justify-center text-xs">
                  🐩
                </div>
                <div className="w-8 h-8 rounded-full bg-secondary border-2 border-background flex items-center justify-center text-xs">
                  🦮
                </div>
              </div>
              <span className="text-sm text-muted-foreground">
                <span className="font-semibold">500+</span> cachorros felizes no último mês
              </span>
            </div>
          </div>
          
          <div className="relative">
            <div className="absolute -top-12 -right-12 w-64 h-64 bg-primary/20 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-brand-light-purple/30 rounded-full blur-3xl"></div>
            
            <div className="relative bg-white p-4 rounded-2xl shadow-lg animate-bounce-slow">
              <img 
                src="https://images.unsplash.com/photo-1625794084867-8ddd239946b1?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80" 
                alt="Cachorro sendo tosado" 
                className="rounded-xl w-full h-auto object-cover aspect-square"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
