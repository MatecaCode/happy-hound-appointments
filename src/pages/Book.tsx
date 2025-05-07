
import React from 'react';
import Layout from '@/components/Layout';
import AppointmentForm from '@/components/AppointmentForm';

const Book = () => {
  return (
    <Layout>
      <section className="bg-secondary/50 py-16">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h1 className="mb-4">Book a <span className="text-primary">Grooming</span> Appointment</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Schedule a grooming session for your furry friend using our easy online booking system.
          </p>
        </div>
      </section>
      
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2">
              <AppointmentForm />
            </div>
            
            <div>
              <div className="bg-secondary/50 p-6 rounded-lg space-y-6 sticky top-6">
                <h3 className="text-xl font-bold">Booking Information</h3>
                
                <div>
                  <h4 className="font-semibold">Business Hours</h4>
                  <ul className="mt-2 space-y-1">
                    <li className="flex justify-between">
                      <span>Monday - Friday</span>
                      <span>9:00 AM - 5:00 PM</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Saturday</span>
                      <span>9:00 AM - 3:00 PM</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Sunday</span>
                      <span>Closed</span>
                    </li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-semibold">Contact</h4>
                  <p className="mt-2">
                    Have questions about our services?<br />
                    Call us at (555) 123-4567
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold">Appointment Notes</h4>
                  <ul className="mt-2 space-y-2 text-sm">
                    <li>• Please arrive 15 minutes before your appointment time</li>
                    <li>• Ensure your dog has relieved themselves before the appointment</li>
                    <li>• Bring vaccination records for your first visit</li>
                    <li>• Cancellations require 24-hour notice</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Book;
