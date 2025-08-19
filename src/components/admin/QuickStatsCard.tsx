import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface QuickStatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  iconBgColor: string;
  iconColor: string;
  href?: string;
  loading?: boolean;
  className?: string;
}

const QuickStatsCard: React.FC<QuickStatsCardProps> = ({
  title,
  value,
  icon,
  iconBgColor,
  iconColor,
  href,
  loading = false,
  className
}) => {
  const CardContent = (
    <Card className={cn(
      "bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border-0",
      href ? "cursor-pointer" : "",
      className
    )}>
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-1">
              {title}
            </p>
            <p className="text-3xl font-bold text-gray-900">
              {loading ? '...' : value}
            </p>
          </div>
          <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center", iconBgColor)}>
            <div className={iconColor}>
              {icon}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );

  if (href) {
    return <Link to={href}>{CardContent}</Link>;
  }

  return CardContent;
};

export default QuickStatsCard;


