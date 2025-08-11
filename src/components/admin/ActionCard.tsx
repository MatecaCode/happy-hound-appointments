import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface ActionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  iconBgColor: string;
  iconColor: string;
  href: string;
  className?: string;
}

const ActionCard: React.FC<ActionCardProps> = ({
  title,
  description,
  icon,
  iconBgColor,
  iconColor,
  href,
  className
}) => {
  return (
    <Link to={href}>
      <Card className={cn(
        "bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer border-0",
        className
      )}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-3 text-lg font-semibold text-gray-900">
            <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", iconBgColor)}>
              <div className={iconColor}>
                {icon}
              </div>
            </div>
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm font-medium text-gray-600">
            {description}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
};

export default ActionCard;
