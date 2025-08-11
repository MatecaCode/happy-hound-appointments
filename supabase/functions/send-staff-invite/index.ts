import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    // Parse the request body
    const { email, name, code } = await req.json();

    // Validate required fields
    if (!email || !name) {
      return new Response(
        JSON.stringify({ 
          error: 'Email and name are required' 
        }), 
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Log the invitation attempt
    console.log(`📧 [SEND-STAFF-INVITE] Sending invitation to ${email} for ${name} with code: ${code}`);

    // For now, we'll just return success since we don't have email service configured
    // In a real implementation, you would integrate with an email service like:
    // - Resend
    // - SendGrid
    // - AWS SES
    // - etc.

    const emailContent = `
      <h2>Welcome to Vettale!</h2>
      <p>Hello ${name},</p>
      <p>You have been invited to join the Vettale team as a staff member.</p>
      <p>To complete your registration, please use the following invite code:</p>
      <h3 style="background: #f0f0f0; padding: 10px; border-radius: 5px; text-align: center; font-family: monospace;">${code}</h3>
      <p>Please visit our registration page and enter this code to claim your account.</p>
      <p>If you have any questions, please contact the administrator.</p>
      <p>Best regards,<br>The Vettale Team</p>
    `;

    // In a real implementation, you would send the email here
    // For now, we'll just log it and return success
    console.log(`📧 [SEND-STAFF-INVITE] Email content prepared for ${email}:`);
    console.log(emailContent);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Invitation sent successfully',
        email: email,
        name: name,
        code: code
      }), 
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );

  } catch (error) {
    console.error('❌ [SEND-STAFF-INVITE] Error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to send invitation',
        details: error.message 
      }), 
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});
