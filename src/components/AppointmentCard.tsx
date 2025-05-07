
import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarCheck, Clock, Dog, Scissors } from "lucide-react";
import { format } from 'date-fns';
import { toast } from 'sonner';

export interface Appointment {
  id: string;
  petName: string;
  service: string;
  date: Date;
  time: string;
  status: 'upcoming' | 'completed' | 'cancelled';
}

interface AppointmentCardProps {
  appointment: Appointment;
  onCancel?: (id: string) => void;
}

const AppointmentCard: React.FC<AppointmentCardProps> = ({ 
  appointment,
  onCancel 
}) => {
  const { id, petName, service, date, time, status } = appointment;
  
  const handleCancel = () => {
    if (onCancel) {
      onCancel(id);
    } else {
      toast.success(`Appointment for ${petName} has been cancelled.`);
    }
  };
  
  const getStatusColor = () => {
    switch (status) {
      case 'upcoming': return 'bg-blue-100 text-blue-700';
      case 'completed': return 'bg-green-100 text-green-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };
  
  return (
    <Card className={status === 'cancelled' ? 'opacity-70' : ''}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle>{petName}'s Appointment</CardTitle>
          <div className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor()}`}>
            {status}
          </div>
        </div>
        <CardDescription>
          {service}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pb-4">
        <div className="space-y-3">
          <div className="flex items-center text-sm">
            <CalendarCheck className="mr-2 h-4 w-4 text-primary" />
            <span>{format(date, 'EEEE, MMMM d, yyyy')}</span>
          </div>
          
          <div className="flex items-center text-sm">
            <Clock className="mr-2 h-4 w-4 text-primary" />
            <span>{time}</span>
          </div>
          
          <div className="flex items-center text-sm">
            <Dog className="mr-2 h-4 w-4 text-primary" />
            <span>Pet: {petName}</span>
          </div>
          
          <div className="flex items-center text-sm">
            <Scissors className="mr-2 h-4 w-4 text-primary" />
            <span>Service: {service}</span>
          </div>
        </div>
      </CardContent>
      
      {status === 'upcoming' && (
        <CardFooter className="pt-0">
          <Button variant="outline" onClick={handleCancel} className="w-full">
            Cancel Appointment
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default AppointmentCard;
