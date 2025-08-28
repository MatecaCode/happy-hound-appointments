
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect, lazy, Suspense } from "react";
import Index from "./pages/Index";
import Services from "./pages/Services";
import Book from "./pages/Book";
import Appointments from "./pages/Appointments";
import Confirmation from "./pages/Confirmation";
import BookingSuccess from '@/components/BookingSuccess';
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Register from "./pages/Register";
import StaffProfile from "./pages/StaffProfile";
import Shop from "./pages/Shop";
import Cart from "./pages/Cart";
import About from "./pages/About";
import AuthCallback from "./pages/AuthCallback";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import GroomerDashboard from "./pages/GroomerDashboard";
import GroomerCalendar from "./pages/GroomerCalendar";
import GroomerSchedule from "./pages/GroomerSchedule";
import VetCalendar from "./pages/VetCalendar";
import StaffDashboard from "./pages/StaffDashboard";
import StaffAvailability from "./pages/StaffAvailability";
import StaffCalendar from "./pages/StaffCalendar";
import AdminActionCenter from "./pages/AdminActionCenter";
import AdminSettings from "./pages/AdminSettings";
import AdminLogs from "./pages/AdminLogs";
import AdminManualBooking from "./pages/AdminManualBooking";
import AdminAppointments from "./pages/AdminAppointments";
import StatusCenter from "./pages/StatusCenter";
import AdminAvailabilityManager from "./pages/AdminAvailabilityManager";
import AdminBookingPage from "./pages/AdminBookingPage";
import AdminDebugAvailability from "./pages/AdminDebugAvailability";
import AdminEditBooking from "./pages/AdminEditBooking";
import AdminClients from "./pages/AdminClients";
import AdminPets from "./pages/AdminPets";
import AdminBookingSuccess from "./pages/AdminBookingSuccess";
import AdminAgendaHoje from "./pages/AdminAgendaHoje";
import AdminStaffAvailability from "./pages/AdminStaffAvailability";
import EditServicePricing from "./pages/EditServicePricing";
import { AuthProvider } from "./hooks/useAuth";
import TestDataPage from "./pages/TestDataPage";
import GroomerAvailability from './pages/GroomerAvailability';
import Claim from "./pages/Claim";

// Lazy load heavy components for better performance on low-spec PCs
const Profile = lazy(() => import("./pages/Profile"));
const Pets = lazy(() => import("./pages/Pets"));
const PetFormPage = lazy(() => import('./pages/PetFormPage'));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));

const queryClient = new QueryClient();

// Loading skeleton for lazy components
const LoadingSkeleton = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#E7F0FF] via-white to-[#F1F5F9]">
    <div className="text-center space-y-6">
      <div className="animate-spin rounded-full h-12 w-12 border-3 border-[#6BAEDB] border-t-[#2B70B2] mx-auto"></div>
      <p className="text-lg font-medium text-[#1A4670]">Carregando...</p>
    </div>
  </div>
);

// ScrollToTop component to handle scroll restoration
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Scroll to top when pathname changes
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <AuthProvider>
            <ScrollToTop />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/about" element={<About />} />
              <Route path="/services" element={<Services />} />
              <Route path="/book" element={<Book />} />
              <Route path="/booking-success" element={<BookingSuccess />} />
              <Route path="/appointments" element={<Appointments />} />
              <Route path="/pets" element={
                <Suspense fallback={<LoadingSkeleton />}>
                  <Pets />
                </Suspense>
              } />
              <Route path="/pets/new" element={
                <Suspense fallback={<LoadingSkeleton />}>
                  <PetFormPage />
                </Suspense>
              } />
              <Route path="/pets/edit/:petId" element={
                <Suspense fallback={<LoadingSkeleton />}>
                  <PetFormPage />
                </Suspense>
              } />
              <Route path="/shop" element={<Shop />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/profile" element={
                <Suspense fallback={<LoadingSkeleton />}>
                  <Profile />
                </Suspense>
              } />
              <Route path="/staff-profile" element={<StaffProfile />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/confirmation" element={<Confirmation />} />
              <Route path="/claim" element={<Claim />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/groomer-dashboard" element={<GroomerDashboard />} />
              <Route path="/groomer-calendar" element={<GroomerCalendar />} />
              <Route path="/groomer-schedule" element={<GroomerSchedule />} />
              <Route path="/groomer-availability" element={<GroomerAvailability />} />
              <Route path="/vet-calendar" element={<VetCalendar />} />
              <Route path="/staff-dashboard" element={<StaffDashboard />} />
              <Route path="/staff-availability" element={<StaffAvailability />} />
              <Route path="/staff-calendar" element={<StaffCalendar />} />
              
              {/* Admin Routes - 3-Tiered Structure */}
              <Route path="/admin" element={
                <Suspense fallback={<LoadingSkeleton />}>
                  <AdminDashboard />
                </Suspense>
              } />
              <Route path="/admin/actions" element={<AdminActionCenter />} />
              <Route path="/admin/appointments" element={<AdminAppointments />} />
              <Route path="/admin/edit-booking/:appointmentId" element={<AdminEditBooking />} />
              <Route path="/admin/manual-booking" element={<AdminManualBooking />} />
              <Route path="/admin/booking-success" element={<AdminBookingSuccess />} />
              <Route path="/admin/settings" element={<AdminSettings />} />
              <Route path="/admin/services/:serviceId/edit-pricing" element={<EditServicePricing />} />
              <Route path="/admin/staff/:id/availability" element={<AdminStaffAvailability />} />
              <Route path="/admin/staff-availability" element={<AdminStaffAvailability />} />
              <Route path="/admin/clients" element={<AdminClients />} />
              <Route path="/admin/pets" element={<AdminPets />} />
              <Route path="/admin/logs" element={<AdminLogs />} />
              <Route path="/admin/agenda-hoje" element={<AdminAgendaHoje />} />
              <Route path="/admin/debug/availability/:providerId/:date" element={<AdminDebugAvailability />} />
              
              {/* Legacy Admin Routes (keeping for compatibility) */}
              <Route path="/admin/booking" element={
                <Suspense fallback={<LoadingSkeleton />}>
                  <AdminBookingPage />
                </Suspense>
              } />
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
