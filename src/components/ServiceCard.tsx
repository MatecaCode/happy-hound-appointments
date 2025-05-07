
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface ServiceCardProps {
  title: string;
  description: string;
  price: string;
  icon: React.ReactNode;
  popular?: boolean;
  className?: string;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ 
  title, 
  description, 
  price, 
  icon, 
  popular = false,
  className
}) => {
  return (
    <Card className={cn(
      "relative overflow-hidden transition-all duration-300 hover:shadow-lg",
      popular && "border-primary shadow-md",
      className
    )}>
      {popular && (
        <div className="absolute top-0 right-0">
          <div className="bg-primary text-primary-foreground px-4 py-1 text-xs font-medium transform rotate-45 translate-x-6 translate-y-2">
            Popular
          </div>
        </div>
      )}
      
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div className="text-primary mb-2">{icon}</div>
        </div>
        <CardTitle className="text-xl">{title}</CardTitle>
        <div className="text-2xl font-bold text-primary">{price}</div>
      </CardHeader>
      
      <CardContent>
        <CardDescription className="min-h-[80px]">{description}</CardDescription>
        <Link to="/book" state={{ service: title }}>
          <Button className="w-full mt-4">Agendar Agora</Button>
        </Link>
      </CardContent>
    </Card>
  );
};

export default ServiceCard;
