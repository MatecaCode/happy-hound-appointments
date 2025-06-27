
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { auditBookingSystemState } from '@/utils/appointmentUtils';
import { supabase } from '@/integrations/supabase/client';

const BookingSystemDebugger = () => {
  const [debugData, setDebugData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const runFullSystemAudit = async () => {
    setIsLoading(true);
    try {
      console.log('🚀 STARTING FULL SYSTEM AUDIT...');
      
      // Basic system state audit
      await auditBookingSystemState();
      
      // Detailed audit
      const today = new Date().toISOString().split('T')[0];
      
      const [
        servicesResult,
        serviceResourcesResult,
        providersResult,
        showerAvailResult,
        providerAvailResult,
        appointmentsResult,
        appointmentProvidersResult,
        eventsResult,
        notificationsResult
      ] = await Promise.all([
        supabase.from('services').select('*'),
        supabase.from('service_resources').select('*'),
        supabase.from('provider_profiles').select('*'),
        supabase.from('shower_availability').select('*').eq('date', today).order('time_slot'),
        supabase.from('provider_availability').select('*').eq('date', today).order('time_slot'),
        supabase.from('appointments').select('*').eq('date', today),
        supabase.from('appointment_providers').select('*'),
        supabase.from('appointment_events').select('*'),
        supabase.from('notification_queue').select('*')
      ]);

      const auditResult = {
        timestamp: new Date().toISOString(),
        services: servicesResult.data || [],
        serviceResources: serviceResourcesResult.data || [],
        providers: providersResult.data || [],
        showerAvailability: showerAvailResult.data || [],
        providerAvailability: providerAvailResult.data || [],
        todayAppointments: appointmentsResult.data || [],
        appointmentProviders: appointmentProvidersResult.data || [],
        events: eventsResult.data || [],
        notifications: notificationsResult.data || [],
        errors: {
          services: servicesResult.error,
          serviceResources: serviceResourcesResult.error,
          providers: providersResult.error,
          showerAvailability: showerAvailResult.error,
          providerAvailability: providerAvailResult.error,
          appointments: appointmentsResult.error,
          appointmentProviders: appointmentProvidersResult.error,
          events: eventsResult.error,
          notifications: notificationsResult.error
        }
      };

      setDebugData(auditResult);
      console.log('✅ FULL SYSTEM AUDIT COMPLETE:', auditResult);
      
    } catch (error) {
      console.error('💥 AUDIT ERROR:', error);
      setDebugData({ error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const testBookingFlow = async () => {
    setIsLoading(true);
    try {
      console.log('🧪 TESTING BOOKING FLOW...');
      
      // Test with a specific service ID
      const { data: services } = await supabase.from('services').select('*').limit(1);
      if (!services || services.length === 0) {
        throw new Error('No services found for testing');
      }

      const testService = services[0];
      console.log('🎯 TEST SERVICE:', testService);

      // Test RPC call
      const { data: providers, error } = await supabase.rpc('get_available_providers', {
        _service_id: testService.id,
        _date: new Date().toISOString().split('T')[0],
        _time_slot: '10:00:00',
        _duration: 30
      });

      console.log('📞 TEST RPC RESULT:', { providers, error });
      
      setDebugData(prev => ({
        ...prev,
        testResults: {
          testService,
          availableProviders: providers,
          rpcError: error
        }
      }));

    } catch (error) {
      console.error('💥 TEST ERROR:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-red-600">
          🚨 Booking System Debugger
        </CardTitle>
        <div className="flex gap-2">
          <Button 
            onClick={runFullSystemAudit} 
            disabled={isLoading}
            variant="destructive"
          >
            {isLoading ? 'Running Audit...' : 'Run Full System Audit'}
          </Button>
          <Button 
            onClick={testBookingFlow} 
            disabled={isLoading}
            variant="outline"
          >
            Test Booking Flow
          </Button>
        </div>
      </CardHeader>
      
      {debugData && (
        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-4">
              
              {/* Services */}
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  📋 Services <Badge>{debugData.services?.length || 0}</Badge>
                </h3>
                <pre className="text-xs bg-gray-100 p-2 rounded">
                  {JSON.stringify(debugData.services, null, 2)}
                </pre>
              </div>

              {/* Service Resources */}
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  🔧 Service Resources <Badge>{debugData.serviceResources?.length || 0}</Badge>
                </h3>
                <pre className="text-xs bg-gray-100 p-2 rounded">
                  {JSON.stringify(debugData.serviceResources, null, 2)}
                </pre>
              </div>

              {/* Providers */}
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  👥 Providers <Badge>{debugData.providers?.length || 0}</Badge>
                </h3>
                <pre className="text-xs bg-gray-100 p-2 rounded">
                  {JSON.stringify(debugData.providers, null, 2)}
                </pre>
              </div>

              {/* Shower Availability */}
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  🚿 Shower Availability Today <Badge>{debugData.showerAvailability?.length || 0}</Badge>
                </h3>
                <pre className="text-xs bg-gray-100 p-2 rounded">
                  {JSON.stringify(debugData.showerAvailability, null, 2)}
                </pre>
              </div>

              {/* Provider Availability */}
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  👨‍⚕️ Provider Availability Today <Badge>{debugData.providerAvailability?.length || 0}</Badge>
                </h3>
                <pre className="text-xs bg-gray-100 p-2 rounded">
                  {JSON.stringify(debugData.providerAvailability, null, 2)}
                </pre>
              </div>

              {/* Today's Appointments */}
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  📅 Today's Appointments <Badge>{debugData.todayAppointments?.length || 0}</Badge>
                </h3>
                <pre className="text-xs bg-gray-100 p-2 rounded">
                  {JSON.stringify(debugData.todayAppointments, null, 2)}
                </pre>
              </div>

              {/* Test Results */}
              {debugData.testResults && (
                <div>
                  <h3 className="font-semibold flex items-center gap-2">
                    🧪 Test Results
                  </h3>
                  <pre className="text-xs bg-blue-100 p-2 rounded">
                    {JSON.stringify(debugData.testResults, null, 2)}
                  </pre>
                </div>
              )}

              {/* Errors */}
              <div>
                <h3 className="font-semibold text-red-600">❌ Errors</h3>
                <pre className="text-xs bg-red-100 p-2 rounded">
                  {JSON.stringify(debugData.errors, null, 2)}
                </pre>
              </div>

            </div>
          </ScrollArea>
        </CardContent>
      )}
    </Card>
  );
};

export default BookingSystemDebugger;
