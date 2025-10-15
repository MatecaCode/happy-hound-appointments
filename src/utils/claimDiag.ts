/**
 * Client Claim Diagnostic Utility
 * Enable with ?claim_debug=1 in URL or localStorage.claim_debug='1'
 */

export const claimDiag = (() => {
  const on = new URLSearchParams(location.search).has('claim_debug') || localStorage.getItem('claim_debug') === '1';
  
  const log = (...args: any[]) => {
    if (on) {
      console.info('[CLAIM]', Date.now(), ...args);
    }
  };

  // Global event tracker
  if (typeof window !== 'undefined') {
    (window as any).CLAIM_DIAG = {
      events: [],
      push: (e: any) => {
        (window as any).CLAIM_DIAG.events.push(e);
        log('EVT', e);
      }
    };
  }

  return { on, log };
})();

/**
 * Generate runtime summary from collected events
 */
export const generateClaimSummary = () => {
  if (!claimDiag.on) return;
  
  const events = (window as any).CLAIM_DIAG?.events || [];
  
  const hasTokens = events.find((e: any) => e.step === 'mount')?.hasTokens || false;
  const setSession = events.find((e: any) => e.step === 'session_set');
  const updateUser = events.find((e: any) => e.step === 'update_user_done');
  const authEvt = events.find((e: any) => e.step === 'auth_event');
  const navigateCalled = events.filter((e: any) => e.step === 'navigate_called').length;
  
  const summary = `[CLAIM] seq -> tokens?=${hasTokens} setSession=${setSession ? (setSession.ok ? 'ok' : 'err') : 'n/a'} updateUser=${updateUser ? (updateUser.ok ? 'ok' : 'err') : 'n/a'} authEvt=${authEvt?.event || 'n/a'} navigate_called=${navigateCalled}`;
  
  console.info(summary);
  console.info('[CLAIM] Full event trace:', events);
};

