import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import PhoneInputBR from '@/components/inputs/PhoneInputBR';
import { DateInputBR } from '@/components/inputs/DateInputBR';
import { PREFERRED_CONTACT_OPTIONS, MARKETING_SOURCE_OPTIONS } from '@/constants/profile';
import { 
  User, 
  MessageSquare, 
  Shield, 
  Heart, 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  X,
  Phone,
  Mail,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { log } from '@/utils/logger';
import { toast } from 'sonner';

interface ContactChannel {
  id: string;
  code: string;
  name: string;
  description: string;
}

interface StaffProfile {
  id: string;
  name: string;
  email: string;
  can_groom: boolean;
  can_vet: boolean;
  can_bathe: boolean;
}

interface WizardData {
  // Step 1 - Contato
  name?: string;
  phone?: string;
  is_whatsapp?: boolean;
  preferred_channel_code?: string;
  marketing_source_code?: string;
  marketing_source_other?: string;
  birth_date?: string;
  
  // Step 2 - Lembretes & Consents
  consent_reminders?: boolean;
  consent_tos?: boolean;
  consent_privacy?: boolean;
  
  // Step 3 - Emergência
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  
  // Step 4 - Preferências
  preferred_staff_profile_id?: string;
  accessibility_notes?: string;
}

type WizardStepId = 'contact' | 'reminders' | 'emergency' | 'preferences';

interface ClientMicroWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  currentUserName?: string;
  startAt?: WizardStepId; // optional starting step
  initialValues?: Partial<WizardData>; // prefill values
}

const ClientMicroWizard: React.FC<ClientMicroWizardProps> = ({
  isOpen,
  onClose,
  onComplete,
  currentUserName = '',
  startAt,
  initialValues
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [wizardData, setWizardData] = useState<WizardData>({
    name: currentUserName,
    preferred_channel_code: 'telefone' // Default to telefone
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Lookup data
  const [contactChannels, setContactChannels] = useState<ContactChannel[]>([]);
  const [staffProfiles, setStaffProfiles] = useState<StaffProfile[]>([]);
  
  // Seed from initialValues only once on open
  useEffect(() => {
    if (isOpen) {
      if (initialValues) {
        setWizardData(prev => ({ ...prev, ...initialValues }));
      }
      if (startAt) {
        const map: Record<WizardStepId, number> = {
          contact: 1,
          reminders: 2,
          emergency: 3,
          preferences: 4
        };
        setCurrentStep(map[startAt] || 1);
      }
    }
    // do not reset when props change, only on open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Load lookup data
  useEffect(() => {
    if (isOpen) {
      loadLookupData();
    }
  }, [isOpen]);

  const loadLookupData = async () => {
    try {
      setLoading(true);
      
      // Load active staff profiles only (contact channels now use constants)
      const { data: staff, error: staffError } = await supabase
        .from('staff_profiles')
        .select('id, name, email, can_groom, can_vet, can_bathe')
        .eq('active', true)
        .order('name');
      
      if (staffError) {
        log.error('Error loading staff profiles:', staffError);
      } else {
        setStaffProfiles(staff || []);
      }
      
    } catch (error) {
      log.error('Error loading staff profiles:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateWizardData = (updates: Partial<WizardData>) => {
    setWizardData(prev => ({ ...prev, ...updates }));
  };

  const savePartialProgress = async () => {
    try {
      setSaving(true);
      
      // Prepare profile update data
      const profileUpdates: Record<string, unknown> = {};
      
      if (wizardData.phone) profileUpdates.p_phone = wizardData.phone;
      if (wizardData.is_whatsapp !== undefined) profileUpdates.p_is_whatsapp = wizardData.is_whatsapp;
      // Always include preferred_channel_code (default to 'telefone')
      profileUpdates.p_preferred_channel_code = wizardData.preferred_channel_code || 'telefone';
      if (wizardData.marketing_source_code) profileUpdates.p_marketing_source_code = wizardData.marketing_source_code;
      if (wizardData.marketing_source_other) profileUpdates.p_marketing_source_other = wizardData.marketing_source_other;
      // Critical: always include p_birth_date to disambiguate RPC overloads
      profileUpdates.p_birth_date = wizardData.birth_date || null;
      if (wizardData.emergency_contact_name) profileUpdates.p_emergency_contact_name = wizardData.emergency_contact_name;
      if (wizardData.emergency_contact_phone) profileUpdates.p_emergency_contact_phone = wizardData.emergency_contact_phone;
      if (wizardData.preferred_staff_profile_id) profileUpdates.p_preferred_staff_profile_id = wizardData.preferred_staff_profile_id;
      if (wizardData.accessibility_notes) profileUpdates.p_accessibility_notes = wizardData.accessibility_notes;
      
      // Update profile if we have data
      if (Object.keys(profileUpdates).length > 0) {
        const { error: profileError } = await supabase.rpc('client_update_profile', profileUpdates);
        
        if (profileError) {
          throw profileError;
        }
      }
      
      // Log consents if any
      const consents = [];
      if (wizardData.consent_tos !== undefined) {
        consents.push({ type: 'tos', granted: wizardData.consent_tos });
      }
      if (wizardData.consent_privacy !== undefined) {
        consents.push({ type: 'privacy', granted: wizardData.consent_privacy });
      }
      if (wizardData.consent_reminders !== undefined) {
        consents.push({ 
          type: 'reminders', 
          granted: wizardData.consent_reminders,
          channel_code: wizardData.preferred_channel_code || 'email'
        });
      }
      
      // Log each consent
      for (const consent of consents) {
        try {
          const { error: consentError } = await supabase.rpc('client_log_consent', {
            p_granted: consent.granted,
            p_type: consent.type,
            p_version: 'v1',
            p_channel_code: consent.channel_code || null
          });
          
          if (consentError) {
            log.error('Error logging consent:', consentError);
            toast.error('Falha ao registrar consentimento (continuando assim mesmo)');
          }
        } catch (consentError) {
          log.error('Error logging consent:', consentError);
          toast.error('Falha ao registrar consentimento (continuando assim mesmo)');
        }
      }
      
    } catch (error) {
      console.error('Error saving partial progress:', error);
      toast.error('Erro ao salvar progresso');
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    try {
      // Save current step progress
      await savePartialProgress();
      
      if (currentStep < 4) {
        setCurrentStep(currentStep + 1);
      } else {
        // Final step - complete wizard
        await completeWizard();
      }
    } catch (error) {
      // Error already handled in savePartialProgress
    }
  };

  const handleSkip = async () => {
    // Step 2 is mandatory: cannot skip without accepting all consents
    if (currentStep === 2) {
      toast.error('Para continuar, aceite os termos de uso, a política de privacidade e os lembretes.');
      return;
    }
    try {
      // Save any filled data before skipping
      if (hasStepData()) {
        await savePartialProgress();
      }
      
      if (currentStep < 4) {
        setCurrentStep(currentStep + 1);
      } else {
        // Skip final step - still complete wizard
        await completeWizard();
      }
    } catch (error) {
      // Continue even if save fails on skip
      if (currentStep < 4) {
        setCurrentStep(currentStep + 1);
      } else {
        completeWizard();
      }
    }
  };

  const completeWizard = async () => {
    try {
      // Mark first visit setup as completed
      const { error } = await supabase.rpc('client_mark_first_visit_setup');
      
      if (error) {
        console.error('Error completing first visit setup:', error);
        toast.error('Erro ao finalizar configuração');
        return;
      }
      
      // Refresh progress from server
      const { data: progressData } = await supabase.rpc('client_get_profile_progress');
      if (progressData && progressData.length > 0 && progressData[0].percent_complete >= 80) {
        // Hide nudge banner if profile is well complete
        // This will be handled by the parent component
      }
      
      toast.success('Configuração inicial concluída!');
      onComplete();
    } catch (error) {
      console.error('Error completing wizard:', error);
      toast.error('Erro ao finalizar configuração');
    }
  };

     const hasStepData = (): boolean => {
     switch (currentStep) {
       case 1:
         return !!(wizardData.phone || wizardData.is_whatsapp !== undefined || wizardData.preferred_channel_code || wizardData.marketing_source_code || wizardData.birth_date);
       case 2:
         return !!(wizardData.consent_reminders !== undefined || wizardData.consent_tos !== undefined || wizardData.consent_privacy !== undefined);
       case 3:
         return !!(wizardData.emergency_contact_name || wizardData.emergency_contact_phone);
       case 4:
         return !!(wizardData.preferred_staff_profile_id || wizardData.accessibility_notes);
       default:
         return false;
     }
   };

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 1:
        // Marketing source is required
        return !!(wizardData.marketing_source_code && 
                 (wizardData.marketing_source_code !== 'outro' || wizardData.marketing_source_other));
      case 2:
        // All consents are required
        return !!(wizardData.consent_tos && wizardData.consent_privacy && wizardData.consent_reminders);
      case 3:
        // Emergency contact optional
        return true;
      case 4:
        // All optional
        return true;
      default:
        return true;
    }
  };

  const getStepIcon = (step: number) => {
    switch (step) {
      case 1: return <User className="w-5 h-5" />;
      case 2: return <MessageSquare className="w-5 h-5" />;
      case 3: return <Shield className="w-5 h-5" />;
      case 4: return <Heart className="w-5 h-5" />;
      default: return <User className="w-5 h-5" />;
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return renderContactStep();
      case 2:
        return renderRemindersStep();
      case 3:
        return renderEmergencyStep();
      case 4:
        return renderPreferencesStep();
      default:
        return null;
    }
  };

  const renderContactStep = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
          <User className="w-6 h-6 text-white" />
        </div>
        <h3 className="text-lg font-semibold text-gray-800">Suas Informações de Contato</h3>
        <p className="text-sm text-gray-600 mt-1">Como podemos entrar em contato com você?</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="wizard-phone">Telefone</Label>
          <PhoneInputBR
            value={wizardData.phone || ''}
            onChange={(value) => updateWizardData({ phone: value })}
            placeholder="(11) 99999-9999"
            className="mt-1"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="wizard-whatsapp"
            checked={wizardData.is_whatsapp || false}
            onCheckedChange={(checked) => updateWizardData({ is_whatsapp: checked as boolean })}
          />
          <Label htmlFor="wizard-whatsapp" className="text-sm">
            Este número é WhatsApp
          </Label>
        </div>

                 <div>
           <Label htmlFor="wizard-channel">Canal de contato preferido</Label>
           <Select 
             value={wizardData.preferred_channel_code || 'telefone'} 
             onValueChange={(value) => updateWizardData({ preferred_channel_code: value })}
           >
             <SelectTrigger className="mt-1">
               <SelectValue placeholder="Selecione como prefere ser contatado" />
             </SelectTrigger>
             <SelectContent>
               {PREFERRED_CONTACT_OPTIONS.map((option) => (
                 <SelectItem key={option.code} value={option.code}>
                   <div className="flex items-center space-x-2">
                     <span>{option.label}</span>
                     {option.code === 'telefone' && <Phone className="w-4 h-4 text-green-500" />}
                     {option.code === 'email' && <Mail className="w-4 h-4 text-blue-500" />}
                     {option.code === 'none' && <X className="w-4 h-4 text-gray-500" />}
                   </div>
                 </SelectItem>
               ))}
             </SelectContent>
           </Select>
         </div>

         <div>
           <Label htmlFor="wizard-marketing">Como nos conheceu? *</Label>
           <Select 
             value={wizardData.marketing_source_code || ''} 
             onValueChange={(value) => updateWizardData({ marketing_source_code: value })}
           >
             <SelectTrigger className="mt-1">
               <SelectValue placeholder="Selecione como descobriu nossos serviços" />
             </SelectTrigger>
             <SelectContent>
               {MARKETING_SOURCE_OPTIONS.map((source) => (
                 <SelectItem key={source.code} value={source.code}>
                   {source.label}
                 </SelectItem>
               ))}
             </SelectContent>
           </Select>
         </div>

                   {wizardData.marketing_source_code === 'outro' && (
            <div>
              <Label htmlFor="wizard-marketing-other">Qual? *</Label>
              <Input
                id="wizard-marketing-other"
                value={wizardData.marketing_source_other || ''}
                onChange={(e) => updateWizardData({ marketing_source_other: e.target.value })}
                placeholder="Como você nos conheceu?"
                className="mt-1"
              />
            </div>
          )}

                     {/* Birth Date */}
           <div>
             <Label htmlFor="wizard-birth-date">Data de Aniversário (opcional)</Label>
             <DateInputBR
               id="wizard-birth-date"
               value={wizardData.birth_date}
               onChange={(value) => updateWizardData({ birth_date: value })}
               className="mt-1"
             />
           </div>
      </div>
    </div>
  );

  const renderRemindersStep = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
          <MessageSquare className="w-6 h-6 text-white" />
        </div>
        <h3 className="text-lg font-semibold text-gray-800">Lembretes e Termos</h3>
        <p className="text-sm text-gray-600 mt-1">Configure suas preferências de comunicação</p>
      </div>

      <div className="space-y-4">
        <Card className="border-l-4 border-l-blue-500 bg-blue-50/50">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="wizard-reminders"
                checked={wizardData.consent_reminders || false}
                onCheckedChange={(checked) => updateWizardData({ consent_reminders: checked as boolean })}
              />
              <div>
                                 <Label htmlFor="wizard-reminders" className="font-medium text-sm">
                   Concordo em receber lembretes e comunicações operacionais
                 </Label>
                 <p className="text-xs text-gray-600 mt-1">
                   Receberá lembretes e avisos sobre seus agendamentos via {
                     PREFERRED_CONTACT_OPTIONS.find(c => c.code === wizardData.preferred_channel_code)?.label || 'e-mail'
                   } (obrigatório para agendamentos)
                 </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="wizard-tos"
              checked={wizardData.consent_tos || false}
              onCheckedChange={(checked) => updateWizardData({ consent_tos: checked as boolean })}
            />
            <Label htmlFor="wizard-tos" className="text-sm">
              Aceito os <span className="text-blue-600 underline cursor-pointer">Termos de Uso</span>
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="wizard-privacy"
              checked={wizardData.consent_privacy || false}
              onCheckedChange={(checked) => updateWizardData({ consent_privacy: checked as boolean })}
            />
            <Label htmlFor="wizard-privacy" className="text-sm">
              Aceito a <span className="text-blue-600 underline cursor-pointer">Política de Privacidade</span>
            </Label>
          </div>
        </div>

        {(!wizardData.consent_tos || !wizardData.consent_privacy) && (
          <div className="flex items-center space-x-2 text-amber-600 text-sm bg-amber-50 p-3 rounded-lg">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>Os termos de uso e política de privacidade são necessários para continuar</span>
          </div>
        )}
      </div>
    </div>
  );

  const renderEmergencyStep = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-rose-600 rounded-full flex items-center justify-center mx-auto mb-3">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <h3 className="text-lg font-semibold text-gray-800">Contato de Emergência</h3>
        <p className="text-sm text-gray-600 mt-1">Quem devemos contatar em caso de emergência?</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="wizard-emergency-name">Nome do contato de emergência</Label>
          <Input
            id="wizard-emergency-name"
            value={wizardData.emergency_contact_name || ''}
            onChange={(e) => updateWizardData({ emergency_contact_name: e.target.value })}
            placeholder="Nome completo"
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="wizard-emergency-phone">Telefone de emergência</Label>
          <PhoneInputBR
            value={wizardData.emergency_contact_phone || ''}
            onChange={(value) => updateWizardData({ emergency_contact_phone: value })}
            placeholder="(11) 99999-9999"
            className="mt-1"
          />
        </div>

        <div className="bg-gray-50 p-3 rounded-lg">
          <p className="text-xs text-gray-600">
            <AlertCircle className="w-4 h-4 inline mr-1" />
            Essas informações são opcionais, mas recomendadas para sua segurança
          </p>
        </div>
      </div>
    </div>
  );

  const renderPreferencesStep = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-3">
          <Heart className="w-6 h-6 text-white" />
        </div>
        <h3 className="text-lg font-semibold text-gray-800">Suas Preferências</h3>
        <p className="text-sm text-gray-600 mt-1">Personalize sua experiência conosco</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="wizard-staff">Profissional preferido (opcional)</Label>
          <Select 
            value={wizardData.preferred_staff_profile_id || ''} 
            onValueChange={(value) => updateWizardData({ preferred_staff_profile_id: value })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Selecione um profissional (preferência, não garantia)" />
            </SelectTrigger>
            <SelectContent>
              {staffProfiles.map((staff) => (
                <SelectItem key={staff.id} value={staff.id}>
                  <div>
                    <div className="font-medium">{staff.name}</div>
                    <div className="text-xs text-gray-500">
                      {[
                        staff.can_groom && 'Tosador',
                        staff.can_vet && 'Veterinário', 
                        staff.can_bathe && 'Banho'
                      ].filter(Boolean).join(' • ')}
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500 mt-1">
            Indicamos sua preferência, mas não é uma garantia de disponibilidade
          </p>
        </div>

        <div>
          <Label htmlFor="wizard-accessibility">Necessidades especiais ou observações</Label>
          <Textarea
            id="wizard-accessibility"
            value={wizardData.accessibility_notes || ''}
            onChange={(e) => updateWizardData({ accessibility_notes: e.target.value })}
            placeholder="Descreva qualquer necessidade especial, alergia, ou observação importante sobre você ou seu pet"
            className="mt-1"
            rows={3}
          />
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Carregando...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      console.log('Dialog onOpenChange:', open);
      if (!open) {
        onClose();
      }
    }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center">
          <DialogTitle className="text-xl font-bold text-gray-800">
            Configuração Inicial
          </DialogTitle>
          <p className="text-sm text-gray-600 mt-1">
            Leva 1 minuto. Você pode pular e completar depois.
          </p>
        </DialogHeader>

        {/* Progress bar */}
        <div className="px-6 py-2">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-600">
              Passo {currentStep} de 4
            </span>
            <span className="text-sm text-gray-500">{Math.round((currentStep / 4) * 100)}%</span>
          </div>
          <Progress value={(currentStep / 4) * 100} className="h-2" />
        </div>

        {/* Step indicators */}
        <div className="flex justify-center space-x-4 px-6">
          {[1, 2, 3, 4].map((step) => (
            <div
              key={step}
              className={`flex items-center justify-center w-8 h-8 rounded-full transition-colors ${
                step === currentStep
                  ? 'bg-blue-600 text-white'
                  : step < currentStep
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 text-gray-400'
              }`}
            >
              {step < currentStep ? (
                <Check className="w-4 h-4" />
              ) : (
                getStepIcon(step)
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="px-6 py-4">
          {renderStep()}
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center px-6 py-4 border-t border-gray-100">
          <div className="flex space-x-2">
            {currentStep > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentStep(currentStep - 1)}
                disabled={saving}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Voltar
              </Button>
            )}
          </div>

          <div className="flex space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              disabled={saving || currentStep === 2}
              title={currentStep === 2 ? 'Obrigatório aceitar para continuar' : undefined}
            >
              <X className="w-4 h-4 mr-1" />
              Pular
            </Button>

                         <Button
               onClick={handleNext}
               disabled={saving || !canProceed()}
               size="sm"
             >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
              ) : currentStep === 4 ? (
                <Check className="w-4 h-4 mr-1" />
              ) : (
                <ChevronRight className="w-4 h-4 mr-1" />
              )}
              {saving ? 'Salvando...' : currentStep === 4 ? 'Finalizar' : 'Continuar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ClientMicroWizard;
