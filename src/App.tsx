
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Services from "./pages/Services";
import Book from "./pages/Book";
import Appointments from "./pages/Appointments";
import Confirmation from "./pages/Confirmation";
import BookingSuccess from '@/components/BookingSuccess';
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import Pets from "./pages/Pets";
import GroomerDashboard from "./pages/GroomerDashboard";
import GroomerCalendar from "./pages/GroomerCalendar";
import GroomerSchedule from "./pages/GroomerSchedule";
import VetCalendar from "./pages/VetCalendar";
import Shop from "./pages/Shop";
import Cart from "./pages/Cart";
import About from "./pages/About";
import AuthCallback from "./pages/AuthCallback";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AdminDashboard from "./pages/AdminDashboard";
import StatusCenter from "./pages/StatusCenter";
import AdminAvailabilityManager from "./pages/AdminAvailabilityManager";
import AdminBookingPage from "./pages/AdminBookingPage";
import { AuthProvider } from "./hooks/useAuth";
import TestDataPage from "./pages/TestDataPage";
import GroomerAvailability from './pages/GroomerAvailability';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/about" element={<About />} />
              <Route path="/services" element={<Services />} />
              <Route path="/book" element={<Book />} />
              <Route path="/booking-success" element={<BookingSuccess />} />
              <Route path="/appointments" element={<Appointments />} />
              <Route path="/pets" element={<Pets />} />
              <Route path="/shop" element={<Shop />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/confirmation" element={<Confirmation />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/groomer-dashboard" element={<GroomerDashboard />} />
              <Route path="/groomer-calendar" element={<GroomerCalendar />} />
              <Route path="/groomer-schedule" element={<GroomerSchedule />} />
              <Route path="/groomer-availability" element={<GroomerAvailability />} />
              <Route path="/vet-calendar" element={<VetCalendar />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/booking" element={<AdminBookingPage />} />
              <Route path="/admin/availability" element={<AdminAvailabilityManager />} />
              <Route path="/status" element={<StatusCenter />} />
              <Route path="/test-data" element={<TestDataPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
