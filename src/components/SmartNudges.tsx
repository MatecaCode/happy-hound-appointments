import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import PhoneInputBR from '@/components/inputs/PhoneInputBR';
import { 
  X, 
  AlertCircle, 
  TrendingUp, 
  User, 
  Phone, 
  Shield, 
  CheckCircle,
  Clock,
  Sparkles
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { hasRunOnboarding, setOnboardingDone } from '@/utils/onboarding';

interface ProfileProgress {
  percent_complete: number;
  missing_fields: string[];
}

interface SmartNudgesBannerProps {
  profileProgress: ProfileProgress;
  lastDismissedAt?: string | null;
  onRefreshProgress?: () => void;
  className?: string;
}

const SmartNudgesBanner: React.FC<SmartNudgesBannerProps> = ({
  profileProgress,
  lastDismissedAt,
  onRefreshProgress,
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);

  useEffect(() => {
    // Show nudge if completion < 80% and not recently dismissed
    const shouldShow = profileProgress.percent_complete < 80;
    const recentlyDismissed = lastDismissedAt && 
      (Date.now() - new Date(lastDismissedAt).getTime()) < (24 * 60 * 60 * 1000); // 24 hours
    
    setIsVisible(shouldShow && !recentlyDismissed);
  }, [profileProgress.percent_complete, lastDismissedAt]);

  const handleDismiss = async () => {
    try {
      setIsDismissing(true);
      
      const { error } = await supabase.rpc('client_dismiss_nudge');
      
      if (error) {
        console.error('Error dismissing nudge:', error);
        toast.error('Erro ao dispensar lembrete');
        return;
      }
      
      setIsVisible(false);
      toast.success('Lembrete dispensado por 24h');
      
      // Refresh progress to update dismiss timestamp
      if (onRefreshProgress) {
        onRefreshProgress();
      }
      
    } catch (error) {
      console.error('Error in handleDismiss:', error);
      toast.error('Erro ao dispensar lembrete');
    } finally {
      setIsDismissing(false);
    }
  };

  const getMissingFieldsMessage = () => {
    const fieldTranslations: Record<string, string> = {
      name: 'nome completo',
      phone: 'telefone',
      is_whatsapp: 'informação do WhatsApp',
      preferred_channel: 'canal preferido',
      emergency_contact_name: 'contato de emergência',
      emergency_contact_phone: 'telefone de emergência',
      marketing_source: 'como nos conheceu',
      accessibility_notes: 'necessidades especiais',
      general_notes: 'observações gerais',
      basic_consents: 'termos de uso e privacidade'
    };

    const translatedFields = profileProgress.missing_fields
      .map(field => fieldTranslations[field] || field)
      .slice(0, 3); // Show max 3 fields

    if (translatedFields.length === 0) return '';
    if (translatedFields.length === 1) return translatedFields[0];
    if (translatedFields.length === 2) return translatedFields.join(' e ');
    
    return `${translatedFields.slice(0, -1).join(', ')} e ${translatedFields[translatedFields.length - 1]}`;
  };

  const getNudgeIcon = () => {
    if (profileProgress.percent_complete >= 60) return TrendingUp;
    if (profileProgress.percent_complete >= 40) return AlertCircle;
    return User;
  };

  const getNudgeColor = () => {
    if (profileProgress.percent_complete >= 60) return 'border-l-yellow-500 bg-yellow-50/50';
    if (profileProgress.percent_complete >= 40) return 'border-l-orange-500 bg-orange-50/50';
    return 'border-l-red-500 bg-red-50/50';
  };

  const getNudgeTitle = () => {
    if (profileProgress.percent_complete >= 60) return 'Quase lá! Complete seu perfil';
    if (profileProgress.percent_complete >= 40) return 'Que tal completar seu perfil?';
    return 'Vamos finalizar seu cadastro?';
  };

  if (!isVisible) return null;

  const pending = profileProgress.missing_fields || [];
  const onlyEmergencyMissing = pending.length > 0 && pending.every(f => ['emergency_contact_name','emergency_contact_phone'].includes(f));

  const Icon = getNudgeIcon();
  const missingFieldsText = getMissingFieldsMessage();

  return (
    <Alert className={`border-l-4 ${getNudgeColor()} ${className}`}>
      <AlertDescription>
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1 min-w-0">
            <Icon className="w-5 h-5 mt-0.5 text-gray-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-800 mb-1">
                {onlyEmergencyMissing ? 'Só falta o contato de emergência' : getNudgeTitle()}
              </h4>
              <p className="text-sm text-gray-600 mb-3">
                {onlyEmergencyMissing
                  ? 'Adicione apenas o contato de emergência para completar seu perfil (opcional).'
                  : (<>
                      Seu perfil está {profileProgress.percent_complete}% completo. {missingFieldsText && ` Complete: ${missingFieldsText}.`}
                    </>)}
              </p>
              
              <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                <Button
                  size="sm"
                  variant="default"
                  className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                  onClick={() => {
                    // Prefer opening the completion modal if available in the page
                    const openModalBtn = document.querySelector('[data-action="open-complete-profile-modal"]') as HTMLButtonElement;
                    if (openModalBtn) {
                      openModalBtn.click();
                      return;
                    }
                    // Fallback: trigger inline edit
                    const editButton = document.querySelector('[data-action="edit-profile"]') as HTMLButtonElement;
                    editButton?.click();
                  }}
                >
                  <User className="w-4 h-4 mr-1" />
                  {onlyEmergencyMissing ? 'Adicionar agora' : 'Completar Agora'}
                </Button>
                
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDismiss}
                  disabled={isDismissing}
                  className="w-full sm:w-auto text-sm text-gray-500 hover:text-gray-700"
                >
                  {isDismissing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-1" />
                      Dispensando...
                    </>
                  ) : (
                    <>
                      <Clock className="w-4 h-4 mr-1" />
                      Lembrar depois
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            disabled={isDismissing}
            className="text-gray-400 hover:text-gray-600 p-1 h-6 w-6 flex-shrink-0 ml-2"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};

// Booking flow nudge component for missing critical info
interface BookingNudgeProps {
  missingPhone?: boolean;
  missingConsent?: boolean;
  onQuickFix?: (field: 'phone' | 'consent', value: any) => void;
  onClose?: () => void;
}

const BookingFlowNudge: React.FC<BookingNudgeProps> = ({
  missingPhone,
  missingConsent,
  onQuickFix,
  onClose
}) => {
  const [phone, setPhone] = useState('');
  const [isWhatsApp, setIsWhatsApp] = useState(false);
  const [consentReminders, setConsentReminders] = useState(false);

  if (!missingPhone && !missingConsent) return null;

  return (
    <Card className="border-l-4 border-l-blue-500 bg-blue-50/50">
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-semibold text-gray-800 mb-2">
              Informações importantes para seu agendamento
            </h4>
            
            {missingPhone && (
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefone para contato
                </label>
                <div className="flex items-center space-x-2">
                  <PhoneInputBR
                    value={phone}
                    onChange={(value) => setPhone(value)}
                    placeholder="(11) 99999-9999"
                    className="flex-1"
                  />
                  <label className="flex items-center space-x-1 text-sm">
                    <input
                      type="checkbox"
                      checked={isWhatsApp}
                      onChange={(e) => setIsWhatsApp(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>WhatsApp</span>
                  </label>
                </div>
              </div>
            )}
            
            {missingConsent && (
              <div className="mb-3">
                <label className="flex items-start space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={consentReminders}
                    onChange={(e) => setConsentReminders(e.target.checked)}
                    className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>
                    Concordo em receber lembretes sobre meus agendamentos
                  </span>
                </label>
              </div>
            )}
            
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                onClick={() => {
                  if (missingPhone && phone && onQuickFix) {
                    onQuickFix('phone', { phone, is_whatsapp: isWhatsApp });
                  }
                  if (missingConsent && consentReminders && onQuickFix) {
                    onQuickFix('consent', { reminders: consentReminders });
                  }
                }}
                disabled={
                  (missingPhone && !phone) || 
                  (missingConsent && !consentReminders)
                }
                className="bg-blue-600 hover:bg-blue-700"
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Salvar e Continuar
              </Button>
              
              {onClose && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onClose}
                  className="text-gray-500 hover:text-gray-700"
                >
                  Pular por enquanto
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Utility hook for using smart nudges
export const useSmartNudges = () => {
  const [profileProgress, setProfileProgress] = useState<ProfileProgress>({
    percent_complete: 0,
    missing_fields: []
  });
  const [lastDismissedAt, setLastDismissedAt] = useState<string | null>(null);

  const loadProgress = async () => {
    try {
      // Load profile progress
      const { data: progressData, error: progressError } = await supabase.rpc('client_get_profile_progress');
      
      if (progressError) {
        console.error('Error loading profile progress:', progressError);
        return;
      }
      
      if (progressData && progressData.length > 0) {
        setProfileProgress({
          percent_complete: progressData[0].percent_complete || 0,
          missing_fields: progressData[0].missing_fields || []
        });
      }
      
      // Load dismiss timestamp
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('last_nudge_dismissed_at')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();
        
      if (clientError) {
        console.error('Error loading dismiss timestamp:', clientError);
        return;
      }
      
      setLastDismissedAt(clientData?.last_nudge_dismissed_at || null);
      
    } catch (error) {
      console.error('Error in loadProgress:', error);
    }
  };

  useEffect(() => {
    loadProgress();
  }, []);

  return {
    profileProgress,
    lastDismissedAt,
    refreshProgress: loadProgress
  };
};

export { SmartNudgesBanner, BookingFlowNudge };
export default SmartNudgesBanner;
