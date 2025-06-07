
import React from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, Heart, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

const Hero = () => {
  return (
    <section className="relative bg-gradient-to-br from-primary/5 to-secondary/10 py-20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl md:text-6xl font-bold leading-tight">
                Cuidado Completo para seu <span className="text-primary">Pet</span>
              </h1>
              <p className="text-xl text-muted-foreground">
                Serviços veterinários e de estética com qualidade profissional. 
                Agende online e garante o melhor cuidado para seu amigo de quatro patas.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" asChild>
                <Link to="/book">Agendar Consulta</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/services">Nossos Serviços</Link>
              </Button>
            </div>
            
            <div className="flex items-center gap-8 pt-8">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <span className="text-sm">Agendamento Online</span>
              </div>
              <div className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-primary" />
                <span className="text-sm">Cuidado Personalizado</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <span className="text-sm">Segurança Total</span>
              </div>
            </div>
          </div>
          
          <div className="relative">
            <img 
              src="https://images.unsplash.com/photo-1582562124811-c09040d0a901?w=500&h=500&fit=crop&crop=faces" 
              alt="Veterinário cuidando de um cachorro" 
              className="rounded-lg shadow-2xl w-full h-[500px] object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-lg"></div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
