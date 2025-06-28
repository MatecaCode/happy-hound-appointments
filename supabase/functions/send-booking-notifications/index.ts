
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BookingNotificationRequest {
  appointmentId: string;
  userEmail: string;
  userName: string;
  petName: string;
  serviceName: string;
  date: string;
  time: string;
  providerName?: string;
  providerEmail?: string;
  notes?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const {
      appointmentId,
      userEmail,
      userName,
      petName,
      serviceName,
      date,
      time,
      providerName,
      providerEmail,
      notes
    }: BookingNotificationRequest = await req.json();

    console.log('📧 Sending booking notifications for appointment:', appointmentId);

    // Format date for display
    const formattedDate = new Date(date).toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // 1. Send email to client
    await resend.emails.send({
      from: "VetTale <no-reply@vettale.com>",
      to: [userEmail],
      subject: "Agendamento Enviado - Aguardando Aprovação",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">Agendamento Enviado com Sucesso!</h1>
          
          <p>Olá <strong>${userName}</strong>,</p>
          
          <p>Seu agendamento foi recebido e está aguardando aprovação da nossa equipe.</p>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1f2937;">Detalhes do Agendamento:</h3>
            <p><strong>Pet:</strong> ${petName}</p>
            <p><strong>Serviço:</strong> ${serviceName}</p>
            <p><strong>Data:</strong> ${formattedDate}</p>
            <p><strong>Horário:</strong> ${time}</p>
            ${providerName ? `<p><strong>Profissional:</strong> ${providerName}</p>` : ''}
            ${notes ? `<p><strong>Observações:</strong> ${notes}</p>` : ''}
          </div>
          
          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Status:</strong> Aguardando Aprovação</p>
            <p style="margin: 10px 0 0 0; font-size: 14px;">Nossa equipe analisará sua solicitação e entrará em contato em breve para confirmar o agendamento.</p>
          </div>
          
          <p>Você receberá uma nova notificação assim que o agendamento for aprovado.</p>
          
          <p>Atenciosamente,<br>Equipe VetTale</p>
        </div>
      `,
    });

    // 2. Send email to provider (if assigned)
    if (providerEmail && providerName) {
      await resend.emails.send({
        from: "VetTale <no-reply@vettale.com>",
        to: [providerEmail],
        subject: "Nova Solicitação de Agendamento",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb;">Nova Solicitação de Agendamento</h1>
            
            <p>Olá <strong>${providerName}</strong>,</p>
            
            <p>Você foi selecionado para um novo agendamento que está aguardando aprovação administrativa.</p>
            
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #1f2937;">Detalhes do Agendamento:</h3>
              <p><strong>Cliente:</strong> ${userName}</p>
              <p><strong>Pet:</strong> ${petName}</p>
              <p><strong>Serviço:</strong> ${serviceName}</p>
              <p><strong>Data:</strong> ${formattedDate}</p>
              <p><strong>Horário:</strong> ${time}</p>
              ${notes ? `<p><strong>Observações:</strong> ${notes}</p>` : ''}
            </div>
            
            <div style="background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Ação Necessária:</strong></p>
              <p style="margin: 10px 0 0 0; font-size: 14px;">Este horário ficará reservado provisoriamente até a aprovação administrativa. Você será notificado quando o agendamento for confirmado.</p>
            </div>
            
            <p>Acesse seu painel para acompanhar este e outros agendamentos.</p>
            
            <p>Atenciosamente,<br>Equipe VetTale</p>
          </div>
        `,
      });
    }

    // 3. Get admin emails and send notification
    const { data: adminUsers } = await supabase
      .from('user_roles')
      .select(`
        user_id,
        users:user_id (
          email,
          raw_user_meta_data
        )
      `)
      .eq('role', 'admin');

    if (adminUsers && adminUsers.length > 0) {
      for (const adminUser of adminUsers) {
        if (adminUser.users?.email) {
          await resend.emails.send({
            from: "VetTale <no-reply@vettale.com>",
            to: [adminUser.users.email],
            subject: "Nova Solicitação de Agendamento - Aprovação Necessária",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #dc2626;">Nova Solicitação de Agendamento</h1>
                
                <p>Uma nova solicitação de agendamento foi recebida e precisa de sua aprovação.</p>
                
                <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin-top: 0; color: #1f2937;">Detalhes da Solicitação:</h3>
                  <p><strong>Cliente:</strong> ${userName} (${userEmail})</p>
                  <p><strong>Pet:</strong> ${petName}</p>
                  <p><strong>Serviço:</strong> ${serviceName}</p>
                  <p><strong>Data:</strong> ${formattedDate}</p>
                  <p><strong>Horário:</strong> ${time}</p>
                  ${providerName ? `<p><strong>Profissional:</strong> ${providerName}</p>` : ''}
                  ${notes ? `<p><strong>Observações:</strong> ${notes}</p>` : ''}
                </div>
                
                <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
                  <p style="margin: 0;"><strong>Ação Necessária:</strong></p>
                  <p style="margin: 10px 0 0 0; font-size: 14px;">Acesse o painel administrativo para aprovar ou rejeitar esta solicitação de agendamento.</p>
                </div>
                
                <p>Acesse o painel administrativo para tomar uma decisão sobre esta solicitação.</p>
                
                <p>Atenciosamente,<br>Sistema VetTale</p>
              </div>
            `,
          });
        }
      }
    }

    console.log('✅ All booking notifications sent successfully');

    return new Response(
      JSON.stringify({ success: true, message: 'Notifications sent successfully' }), 
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('❌ Error sending booking notifications:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
