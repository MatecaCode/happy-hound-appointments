# VetTale - Pet Services Booking System

A comprehensive React/TypeScript application for managing pet grooming and veterinary services bookings.

## Features

### Admin Features
- **Dashboard**: Overview of system statistics and KPIs
- **Calendar View**: Visual agenda showing today's appointments across all staff
- **Manual Booking**: Create appointments manually with admin override capabilities
- **Client Management**: View and manage client information
- **Pet Management**: Track and manage pet profiles
- **Settings**: Configure staff, services, prices, and operating hours
- **Action Logs**: Track administrative actions and changes

### Staff Features
- **Staff Dashboard**: Personalized view of daily appointments and statistics
- **Availability Management**: Set and manage personal availability
- **Calendar View**: Visual representation of scheduled appointments
- **Profile Management**: Update personal information and preferences

### Client Features
- **Service Booking**: Easy appointment scheduling with real-time availability
- **Pet Management**: Register and manage multiple pets
- **Appointment History**: View past and upcoming appointments
- **Profile Management**: Update personal information

## New Feature: Admin Calendar View

### Overview
The Admin Calendar View provides a comprehensive visual agenda showing all services scheduled for today across all staff members.

### Access
- Navigate to the Admin Dashboard
- Click on the "Serviços Hoje" card to access the calendar view
- Direct URL: `/admin/agenda-hoje`

### Features
- **Time Grid**: Shows appointments from 08:00 to 18:00 in 30-minute intervals
- **Staff Columns**: Each staff member with appointments today gets their own column
- **Appointment Cards**: Color-coded cards showing:
  - Pet name with service icon
  - Service name
  - Client name
  - Time duration
- **Real-time Updates**: Refresh button to get latest appointment data
- **Responsive Design**: Works on desktop and mobile devices

### Visual Elements
- **Service Icons**: Different icons for bath, grooming, veterinary services
- **Color Coding**: 
  - Blue for bath services
  - Purple for grooming services  
  - Red for veterinary services
  - Gray for other services
- **Staff Badges**: Shows staff type (Veterinário, Groomer, Banhista)

### Data Source
The calendar pulls data from the following database tables:
- `appointments` - Main appointment data
- `appointment_staff` - Links appointments to staff
- `staff_profiles` - Staff information and capabilities
- `services` - Service details
- `pets` - Pet information
- `clients` - Client information

## Technology Stack

- **Frontend**: React 18 + TypeScript
- **UI Components**: shadcn/ui + Tailwind CSS
- **Backend**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Routing**: React Router DOM
- **State Management**: React Hooks
- **Notifications**: Sonner

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables (see `.env.example`)
4. Start development server: `npm run dev`

## Database Schema

The application uses a comprehensive database schema with the following key tables:
- `appointments` - Core booking data
- `staff_profiles` - Staff information and capabilities
- `clients` - Client information
- `pets` - Pet profiles
- `services` - Available services and pricing
- `appointment_staff` - Many-to-many relationship between appointments and staff

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

This project is licensed under the MIT License.
