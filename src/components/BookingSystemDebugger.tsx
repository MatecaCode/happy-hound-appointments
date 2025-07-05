
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface DebugData {
  services: any[];
  staffProfiles: any[];
  staffAvailability: any[];
  appointments: any[];
  appointmentStaff: any[];
}

export default function BookingSystemDebugger() {
  const [debugData, setDebugData] = useState<DebugData>({
    services: [],
    staffProfiles: [],
    staffAvailability: [],
    appointments: [],
    appointmentStaff: []
  });
  const [isLoading, setIsLoading] = useState(false);

  const fetchDebugData = async () => {
    setIsLoading(true);
    try {
      console.log('🔍 [DEBUG] Fetching system state for Phase 1 schema');
      
      // Fetch from Phase 1 tables only
      const [
        servicesResult,
        staffProfilesResult, 
        staffAvailabilityResult,
        appointmentsResult,
        appointmentStaffResult
      ] = await Promise.all([
        supabase.from('services').select('*').limit(10),
        supabase.from('staff_profiles').select('*').limit(10), // Updated for Phase 1
        supabase.from('staff_availability').select('*').limit(20), // Updated for Phase 1
        supabase.from('appointments').select('*').limit(10),
        supabase.from('appointment_staff').select('*').limit(10) // Updated for Phase 1
      ]);

      setDebugData({
        services: servicesResult.data || [],
        staffProfiles: staffProfilesResult.data || [],
        staffAvailability: staffAvailabilityResult.data || [],
        appointments: appointmentsResult.data || [],
        appointmentStaff: appointmentStaffResult.data || []
      });

      console.log('📊 [DEBUG] Phase 1 System State:', {
        services: servicesResult.data?.length || 0,
        staff_profiles: staffProfilesResult.data?.length || 0,
        staff_availability: staffAvailabilityResult.data?.length || 0,
        appointments: appointmentsResult.data?.length || 0,
        appointment_staff: appointmentStaffResult.data?.length || 0
      });

    } catch (error) {
      console.error('❌ [DEBUG] Error fetching system state:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDebugData();
  }, []);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-red-600">🚨 Phase 1 System Debugger</CardTitle>
        <CardDescription>
          Debug information for the new Phase 1 normalized schema
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <button 
            onClick={fetchDebugData}
            disabled={isLoading}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {isLoading ? 'Loading...' : 'Refresh Data'}
          </button>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded">
              <h4 className="font-semibold">Services</h4>
              <p className="text-sm text-gray-600">Count: {debugData.services.length}</p>
              <pre className="text-xs mt-2 overflow-auto max-h-32">
                {JSON.stringify(debugData.services.slice(0, 2), null, 2)}
              </pre>
            </div>
            
            <div className="bg-gray-50 p-4 rounded">
              <h4 className="font-semibold">Staff Profiles</h4>
              <p className="text-sm text-gray-600">Count: {debugData.staffProfiles.length}</p>
              <pre className="text-xs mt-2 overflow-auto max-h-32">
                {JSON.stringify(debugData.staffProfiles.slice(0, 2), null, 2)}
              </pre>
            </div>
            
            <div className="bg-gray-50 p-4 rounded">
              <h4 className="font-semibold">Staff Availability</h4>
              <p className="text-sm text-gray-600">Count: {debugData.staffAvailability.length}</p>
              <pre className="text-xs mt-2 overflow-auto max-h-32">
                {JSON.stringify(debugData.staffAvailability.slice(0, 2), null, 2)}
              </pre>
            </div>
            
            <div className="bg-gray-50 p-4 rounded">
              <h4 className="font-semibold">Appointments</h4>
              <p className="text-sm text-gray-600">Count: {debugData.appointments.length}</p>
              <pre className="text-xs mt-2 overflow-auto max-h-32">
                {JSON.stringify(debugData.appointments.slice(0, 2), null, 2)}
              </pre>
            </div>
            
            <div className="bg-gray-50 p-4 rounded">
              <h4 className="font-semibold">Appointment Staff</h4>
              <p className="text-sm text-gray-600">Count: {debugData.appointmentStaff.length}</p>
              <pre className="text-xs mt-2 overflow-auto max-h-32">
                {JSON.stringify(debugData.appointmentStaff.slice(0, 2), null, 2)}
              </pre>
            </div>
          </div>
          
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
            <h4 className="font-semibold text-yellow-800">Phase 1 Schema Status</h4>
            <p className="text-sm text-yellow-700 mt-1">
              This debugger now shows data from the new Phase 1 normalized schema. 
              Legacy tables with '_legacy' suffix are not shown here.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
