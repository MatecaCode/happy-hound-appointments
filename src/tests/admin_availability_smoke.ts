// Basic smoke test stubs (to be run manually or by dev script) - no framework binding here
// Validate routes exist and components render without throwing

export async function smokeTestAdminRoutes() {
  const routes = [
    '/admin',
    '/admin/pricing',
    '/admin/availability',
  ];
  console.log('[SMOKE] Routes to verify:', routes);
}

export function describeAvailabilityExpectations() {
  console.log('[SMOKE] Expect past dates to be disabled (America/Sao_Paulo).');
  console.log('[SMOKE] Expect 30-minute anchors from 09:00 to 16:30.');
  console.log('[SMOKE] Expect green/red colors and whole-day toggles.');
}


