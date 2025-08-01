import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AdminRegistrationStatus {
  isProcessing: boolean;
  step: string;
  error: string | null;
  retryCount: number;
  userId?: string;
  code?: string;
}

export interface AdminRegistrationError {
  code: string;
  message: string;
  details?: string;
  retryable: boolean;
}

export class AdminRegistrationMonitor {
  private static instance: AdminRegistrationMonitor;
  private status: AdminRegistrationStatus = {
    isProcessing: false,
    step: '',
    error: null,
    retryCount: 0,
  };

  private constructor() {}

  static getInstance(): AdminRegistrationMonitor {
    if (!AdminRegistrationMonitor.instance) {
      AdminRegistrationMonitor.instance = new AdminRegistrationMonitor();
    }
    return AdminRegistrationMonitor.instance;
  }

  getStatus(): AdminRegistrationStatus {
    return { ...this.status };
  }

  updateStatus(updates: Partial<AdminRegistrationStatus>): void {
    this.status = { ...this.status, ...updates };
    console.log('🔄 Admin Registration Status:', this.status);
  }

  async monitorAdminRegistration(userId: string, code: string): Promise<boolean> {
    this.updateStatus({
      isProcessing: true,
      step: 'Iniciando monitoramento de registro de administrador...',
      error: null,
      retryCount: 0,
      userId,
      code,
    });

    try {
      // Step 1: Check if user exists
      this.updateStatus({ step: 'Verificando usuário...' });
      const { data: user, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user.user) {
        throw new Error('Usuário não encontrado após autenticação');
      }

      // Step 2: Check if admin code is valid
      this.updateStatus({ step: 'Verificando código de administrador...' });
      const { data: codeValid, error: codeError } = await supabase.rpc('validate_admin_registration_code', {
        code_value: code
      });

      if (codeError || !codeValid) {
        throw new Error('Código de administrador inválido ou já utilizado');
      }

      // Step 3: Apply admin registration
      this.updateStatus({ step: 'Aplicando registro de administrador...' });
      const { data: result, error: applyError } = await supabase.rpc('apply_admin_registration', {
        p_user_id: userId,
        p_code: code
      });

      if (applyError) {
        throw new Error(`Erro ao aplicar registro: ${applyError.message}`);
      }

      if (!result?.success) {
        throw new Error(result?.error || 'Falha no registro de administrador');
      }

      // Step 4: Verify registration was successful
      this.updateStatus({ step: 'Verificando registro...' });
      const verificationResult = await this.verifyAdminRegistration(userId, code);
      
      if (!verificationResult.success) {
        throw new Error(verificationResult.error);
      }

      this.updateStatus({
        isProcessing: false,
        step: 'Registro de administrador concluído com sucesso!',
        error: null,
      });

      toast.success('Registro de administrador processado com sucesso!');
      return true;

    } catch (error: any) {
      console.error('❌ Admin registration monitoring error:', error);
      
      const errorInfo = this.parseError(error);
      
      this.updateStatus({
        isProcessing: false,
        step: 'Erro no registro',
        error: errorInfo.message,
        retryCount: this.status.retryCount + 1,
      });

      toast.error(errorInfo.message);
      return false;
    }
  }

  private async verifyAdminRegistration(userId: string, code: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Check user_roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin');

      if (rolesError || !roles || roles.length === 0) {
        return { success: false, error: 'Role de administrador não foi atribuída' };
      }

      // Check admin_profiles
      const { data: profile, error: profileError } = await supabase
        .from('admin_profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (profileError || !profile) {
        return { success: false, error: 'Perfil de administrador não foi criado' };
      }

      // Check admin_registration_codes
      const { data: codeRecord, error: codeError } = await supabase
        .from('admin_registration_codes')
        .select('is_used, used_by')
        .eq('code', code)
        .single();

      if (codeError || !codeRecord || !codeRecord.is_used || codeRecord.used_by !== userId) {
        return { success: false, error: 'Código não foi marcado como usado' };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: `Erro na verificação: ${error.message}` };
    }
  }

  private parseError(error: any): AdminRegistrationError {
    const message = error.message || 'Erro desconhecido';
    
    // Network errors
    if (message.includes('network') || message.includes('timeout')) {
      return {
        code: 'NETWORK_ERROR',
        message: 'Erro de conexão. Verifique sua internet e tente novamente.',
        details: message,
        retryable: true,
      };
    }

    // Database errors
    if (message.includes('foreign key') || message.includes('constraint')) {
      return {
        code: 'CONSTRAINT_ERROR',
        message: 'Erro de integridade do banco de dados. Tente novamente.',
        details: message,
        retryable: false,
      };
    }

    // Permission errors
    if (message.includes('permission') || message.includes('403')) {
      return {
        code: 'PERMISSION_ERROR',
        message: 'Erro de permissão. Verifique se você tem acesso para esta operação.',
        details: message,
        retryable: false,
      };
    }

    // Validation errors
    if (message.includes('invalid') || message.includes('already used')) {
      return {
        code: 'VALIDATION_ERROR',
        message: 'Código de administrador inválido ou já utilizado.',
        details: message,
        retryable: false,
      };
    }

    // Default error
    return {
      code: 'UNKNOWN_ERROR',
      message: 'Erro inesperado. Tente novamente.',
      details: message,
      retryable: true,
    };
  }

  async retryAdminRegistration(): Promise<boolean> {
    if (!this.status.userId || !this.status.code) {
      console.error('❌ Cannot retry: missing userId or code');
      return false;
    }

    if (this.status.retryCount >= 3) {
      console.error('❌ Maximum retry attempts reached');
      return false;
    }

    console.log(`🔄 Retrying admin registration (attempt ${this.status.retryCount + 1})`);
    
    // Wait before retry
    await new Promise(resolve => setTimeout(resolve, 1000 * (this.status.retryCount + 1)));
    
    return this.monitorAdminRegistration(this.status.userId, this.status.code);
  }

  reset(): void {
    this.status = {
      isProcessing: false,
      step: '',
      error: null,
      retryCount: 0,
    };
  }
}

export const adminRegistrationMonitor = AdminRegistrationMonitor.getInstance(); 