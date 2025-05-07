
import React from 'react';
import Layout from '@/components/Layout';
import Hero from '@/components/Hero';
import ServiceCard from '@/components/ServiceCard';
import Testimonials from '@/components/Testimonials';
import { Scissors, Shower, Dog, Sparkles } from 'lucide-react';

const Index = () => {
  const services = [
    {
      title: "Basic Bath & Brush",
      description: "Bath, blow dry, brush out, ear cleaning, nail trim, and a spritz of cologne.",
      price: "$40",
      icon: <Shower className="h-6 w-6" />,
    },
    {
      title: "Full Grooming",
      description: "Everything in Basic plus haircut styled to your preference.",
      price: "$60",
      icon: <Scissors className="h-6 w-6" />,
      popular: true,
    },
    {
      title: "Deluxe Spa Package",
      description: "Full grooming plus specialty shampoo, conditioner, teeth cleaning, and paw treatment.",
      price: "$80",
      icon: <Sparkles className="h-6 w-6" />,
    },
  ];

  return (
    <Layout>
      <Hero />
      
      {/* Services Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="mb-4">Our <span className="text-primary">Grooming</span> Services</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              We offer a range of grooming services to keep your dog looking and feeling their best.
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
              />
            ))}
          </div>
          
          <div className="mt-12 text-center">
            <p className="text-muted-foreground mb-6">
              Need something not listed here? Contact us for custom grooming options.
            </p>
          </div>
        </div>
      </section>
      
      <Testimonials />
      
      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="inline-flex items-center justify-center bg-primary-foreground/10 rounded-full p-2 mb-8">
            <Dog className="h-5 w-5" />
          </div>
          
          <h2 className="mb-6">Ready to Book Your Pup's Grooming Session?</h2>
          
          <p className="text-primary-foreground/90 max-w-2xl mx-auto mb-8">
            Give your dog the pampering they deserve. Our professional groomers are standing by to give your furry friend the best care.
          </p>
          
          <a 
            href="/book"
            className="inline-flex items-center justify-center rounded-md bg-primary-foreground text-primary px-8 py-3 font-medium"
          >
            Book Appointment Now
          </a>
        </div>
      </section>
    </Layout>
  );
};

export default Index;
