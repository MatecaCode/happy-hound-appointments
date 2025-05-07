
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarCheck, Clock, Dog, Scissors, User, Mail, Phone } from 'lucide-react';
import { format } from 'date-fns';

const Confirmation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Check if we have appointment data
  const appointment = location.state?.appointment;
  
  // If no appointment data, redirect to booking page
  if (!appointment) {
    navigate('/book');
    return null;
  }
  
  const { ownerName, email, phone, petName, breed, service, date, time, specialRequests } = appointment;
  
  return (
    <Layout>
      <div className="py-16 px-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center rounded-full bg-primary/10 p-4 mb-4">
              <CalendarCheck className="h-10 w-10 text-primary" />
            </div>
            <h1 className="mb-4">Appointment <span className="text-primary">Confirmed!</span></h1>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Your grooming appointment has been successfully scheduled. We're excited to see {petName} soon!
            </p>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Appointment Details</CardTitle>
              <CardDescription>
                Here's a summary of your booking information.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="font-medium text-lg">Date & Time</div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center">
                    <CalendarCheck className="h-5 w-5 mr-3 text-primary" />
                    <span>{format(new Date(date), 'EEEE, MMMM d, yyyy')}</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 mr-3 text-primary" />
                    <span>{time}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="font-medium text-lg">Pet Information</div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center">
                    <Dog className="h-5 w-5 mr-3 text-primary" />
                    <span>Name: {petName}</span>
                  </div>
                  <div className="flex items-center">
                    <Scissors className="h-5 w-5 mr-3 text-primary" />
                    <span>Service: {service}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="font-medium text-lg">Owner Information</div>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <User className="h-5 w-5 mr-3 text-primary" />
                    <span>Name: {ownerName}</span>
                  </div>
                  <div className="flex items-center">
                    <Mail className="h-5 w-5 mr-3 text-primary" />
                    <span>Email: {email}</span>
                  </div>
                  <div className="flex items-center">
                    <Phone className="h-5 w-5 mr-3 text-primary" />
                    <span>Phone: {phone}</span>
                  </div>
                </div>
              </div>
              
              {specialRequests && (
                <div className="space-y-2">
                  <div className="font-medium text-lg">Special Requests</div>
                  <p className="text-muted-foreground">
                    {specialRequests}
                  </p>
                </div>
              )}
              
              <div className="bg-secondary/50 p-4 rounded-lg text-sm">
                <p className="font-medium mb-2">Appointment Instructions:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Please arrive 15 minutes before your appointment</li>
                  <li>Ensure your dog has had a walk before the appointment</li>
                  <li>Bring vaccination records if this is your first visit</li>
                  <li>For cancellations or rescheduling, please call at least 24 hours in advance</li>
                </ul>
              </div>
            </CardContent>
            
            <CardFooter className="flex flex-col sm:flex-row gap-4">
              <Button 
                className="w-full sm:w-auto" 
                onClick={() => navigate('/appointments')}
              >
                View All Appointments
              </Button>
              <Button 
                variant="outline" 
                className="w-full sm:w-auto"
                onClick={() => window.print()}
              >
                Print Confirmation
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Confirmation;
