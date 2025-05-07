
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";

interface TestimonialProps {
  name: string;
  text: string;
  dogName: string;
}

const testimonials: TestimonialProps[] = [
  {
    name: "Mariana Silva",
    dogName: "Max",
    text: "A Patinha Feliz transformou meu cachorrinho bagunceiro em um verdadeiro cavalheiro. Os tosadores são muito pacientes com meu cão ansioso!"
  },
  {
    name: "Miguel Santos",
    dogName: "Bella",
    text: "A equipe aqui é incrível! Minha Bella fica animada toda vez que chegamos ao salão. A qualidade do serviço é consistentemente excelente."
  },
  {
    name: "Júlia Oliveira",
    dogName: "Cooper",
    text: "Cooper nunca esteve melhor! O processo de agendamento foi super simples, e eles realmente ouviram exatamente o que eu queria."
  },
];

const Testimonials: React.FC = () => {
  return (
    <section className="py-16 bg-secondary/50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="mb-4">O que Nossos <span className="text-primary">Clientes</span> Dizem</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Não acredite apenas em nossa palavra. Veja o que os donos de cães em nossa comunidade dizem sobre nossos serviços de tosa.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="bg-background">
              <CardContent className="pt-6 pb-4">
                <div className="space-y-4">
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  
                  <p className="text-foreground font-medium">"{testimonial.text}"</p>
                  
                  <div>
                    <p className="font-semibold">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">Dono(a) de {testimonial.dogName}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
