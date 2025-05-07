
import React from 'react';
import { Link } from 'react-router-dom';
import { Dog } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-secondary py-12 text-secondary-foreground">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Dog className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">Happy Hound</span>
            </div>
            <p className="text-sm">
              Premium dog grooming services to keep your furry friend looking their best.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold text-lg mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="hover:text-primary transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/services" className="hover:text-primary transition-colors">
                  Services
                </Link>
              </li>
              <li>
                <Link to="/appointments" className="hover:text-primary transition-colors">
                  My Appointments
                </Link>
              </li>
              <li>
                <Link to="/book" className="hover:text-primary transition-colors">
                  Book Appointment
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold text-lg mb-4">Contact Us</h4>
            <address className="not-italic">
              <p>123 Grooming Lane</p>
              <p>Pet City, PC 12345</p>
              <p className="mt-2">Email: info@happyhound.com</p>
              <p>Phone: (555) 123-4567</p>
            </address>
          </div>
        </div>
        
        <div className="border-t border-muted mt-10 pt-6 text-sm text-center">
          <p>&copy; {new Date().getFullYear()} Happy Hound. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
