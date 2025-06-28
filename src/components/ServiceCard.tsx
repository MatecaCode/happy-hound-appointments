
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface ServiceCardProps {
  title: string;
  description: string;
  price: string;
  icon: React.ReactNode;
  popular?: boolean;
  badge?: string;
  backgroundColor?: string;
  className?: string;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ 
  title, 
  description, 
  price, 
  icon, 
  popular = false,
  badge,
  backgroundColor,
  className
}) => {
  return (
    <Card 
      className={cn(
        "relative overflow-hidden transition-all duration-300 hover:shadow-lg border-0",
        popular && "ring-2 ring-primary/20 shadow-md",
        className
      )}
      style={{ backgroundColor: backgroundColor || '#FFFFFF' }}
    >
      {(popular || badge) && (
        <div className="absolute top-4 right-4">
          <Badge 
            variant="default" 
            className="bg-primary/10 text-primary border-primary/20 shadow-sm"
          >
            {badge || 'Popular'}
          </Badge>
        </div>
      )}
      
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="text-primary mb-2 p-2 rounded-lg" style={{ backgroundColor: 'rgba(33, 102, 172, 0.1)' }}>
            {icon}
          </div>
        </div>
        <CardTitle className="text-xl text-foreground">{title}</CardTitle>
        <div className="text-2xl font-bold text-primary">{price}</div>
      </CardHeader>
      
      <CardContent>
        <CardDescription className="min-h-[80px] text-muted-foreground leading-relaxed">
          {description}
        </CardDescription>
        <Link to="/book" state={{ service: title }}>
          <Button className="w-full mt-4 bg-primary hover:bg-primary/90 text-white">
            Agendar Agora
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
};

export default ServiceCard;
