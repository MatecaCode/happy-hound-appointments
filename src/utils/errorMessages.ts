// Error message translation utility
// Maps Supabase and other English error messages to Portuguese

export const translateErrorMessage = (errorMessage: string): string => {
  const message = errorMessage.toLowerCase();
  
  // Email confirmation errors
  if (message.includes('email not confirmed') || message.includes('email_confirmed_at')) {
    return 'Email não confirmado. Verifique sua caixa de entrada e confirme seu email antes de fazer login.';
  }
  
  // Authentication errors
  if (message.includes('invalid login credentials') || message.includes('invalid email or password')) {
    return 'Email ou senha inválidos. Verifique suas credenciais e tente novamente.';
  }
  
  if (message.includes('user not found')) {
    return 'Usuário não encontrado. Verifique se o email está correto.';
  }
  
  if (message.includes('too many requests')) {
    return 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.';
  }
  
  // Registration errors
  if (message.includes('user already registered') || message.includes('already registered')) {
    return 'Este email já está registrado. Tente fazer login ou use outro email.';
  }
  
  if (message.includes('invalid email')) {
    return 'Email inválido. Verifique o formato do email.';
  }
  
  if (message.includes('password should be at least')) {
    return 'A senha deve ter pelo menos 6 caracteres.';
  }
  
  if (message.includes('signup is disabled')) {
    return 'Registros estão temporariamente desabilitados.';
  }
  
  // Network errors
  if (message.includes('network') || message.includes('timeout') || message.includes('fetch')) {
    return 'Erro de conexão. Verifique sua internet e tente novamente.';
  }
  
  // Generic errors
  if (message.includes('internal server error')) {
    return 'Erro interno do servidor. Tente novamente em alguns minutos.';
  }
  
  if (message.includes('service unavailable')) {
    return 'Serviço temporariamente indisponível. Tente novamente em alguns minutos.';
  }
  
  // Default fallback
  return errorMessage || 'Erro desconhecido. Tente novamente.';
};

// Add spam folder note to email-related messages
export const addSpamFolderNote = (message: string): string => {
  const emailKeywords = ['email', 'confirmação', 'verificação', 'enviado', 'enviada'];
  const hasEmailContext = emailKeywords.some(keyword => 
    message.toLowerCase().includes(keyword)
  );
  
  if (hasEmailContext) {
    return `${message} Se não encontrar o email, verifique sua pasta de spam.`;
  }
  
  return message;
};

// Combined function for email-related errors
export const translateEmailError = (errorMessage: string): string => {
  const translated = translateErrorMessage(errorMessage);
  return addSpamFolderNote(translated);
};
