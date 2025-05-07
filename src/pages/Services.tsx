import React from 'react';
import Layout from '@/components/Layout';
import ServiceCard from '@/components/ServiceCard';
import { Scissors, ShowerHead, Dog, Sparkles, Cut, Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const Services = () => {
  const services = [
    {
      title: "Basic Bath & Brush",
      description: "Bath, blow dry, brush out, ear cleaning, nail trim, and a spritz of cologne.",
      price: "$40",
      icon: <ShowerHead className="h-6 w-6" />,
      details: [
        "Warm water bath with gentle shampoo",
        "Complete brush out",
        "Blow dry",
        "Ear cleaning",
        "Nail trimming",
        "Scent spritz"
      ]
    },
    {
      title: "Full Grooming",
      description: "Everything in Basic plus haircut styled to your preference.",
      price: "$60",
      icon: <Scissors className="h-6 w-6" />,
      popular: true,
      details: [
        "All Basic Bath & Brush services",
        "Custom haircut",
        "Face trimming",
        "Paw pad trimming",
        "Sanitary trim"
      ]
    },
    {
      title: "Deluxe Spa Package",
      description: "Full grooming plus specialty shampoo, conditioner, teeth cleaning, and paw treatment.",
      price: "$80",
      icon: <Sparkles className="h-6 w-6" />,
      details: [
        "All Full Grooming services",
        "Premium shampoo and conditioner",
        "Teeth cleaning",
        "Paw moisturizing treatment",
        "De-shedding treatment",
        "Blueberry facial"
      ]
    },
    {
      title: "Nail Trimming",
      description: "Quick nail trimming service to keep your dog's paws healthy.",
      price: "$15",
      icon: <Scissors className="h-6 w-6" />,
      details: [
        "Nail trim",
        "Nail filing",
        "Paw pad check"
      ]
    },
    {
      title: "Teeth Cleaning",
      description: "Dental hygiene service to maintain your dog's oral health.",
      price: "$25",
      icon: <Smile className="h-6 w-6" />,
      details: [
        "Teeth brushing with dog-safe toothpaste",
        "Gum examination",
        "Breath freshening"
      ]
    },
    {
      title: "Puppy's First Groom",
      description: "Gentle introduction to grooming for puppies under 6 months.",
      price: "$45",
      icon: <Dog className="h-6 w-6" />,
      details: [
        "Gentle puppy shampoo",
        "Light trim to get puppy used to grooming",
        "Positive reinforcement training",
        "Nail trim and ear cleaning",
        "Handling exercises for future grooming"
      ]
    }
  ];

  return (
    <Layout>
      <section className="bg-secondary/50 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h1 className="mb-4">Our <span className="text-primary">Grooming</span> Services</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              We offer a comprehensive range of grooming services to keep your dog clean, healthy, and looking their best.
            </p>
          </div>
        </div>
      </section>
      
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-6">
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
          
          <div className="mt-16 text-center bg-secondary rounded-xl p-8">
            <h3 className="text-2xl font-bold mb-4">Need Something Special?</h3>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Have a specific grooming need not listed here? We offer custom grooming services tailored to your dog's specific requirements.
            </p>
            <Button asChild size="lg">
              <Link to="/book">Contact Us For Custom Services</Link>
            </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Services;
