/*
  Lightweight E2E script:
  - Creates a fake appointment (assumes existing client/pet/service and a staff assignment already exist for an appointment id provided)
  - Calls the RPC to transition not_started -> in_progress -> completed
  - Asserts timestamps and event inserts
*/

import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!
const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY!
const supabase = createClient(url, key)

async function main() {
  const appointmentId = process.env.TEST_APPOINTMENT_ID
  if (!appointmentId) {
    console.error('TEST_APPOINTMENT_ID env var required (existing appointment with assigned staff)')
    process.exit(1)
  }

  // 1) to in_progress
  let { error: e1 } = await supabase.rpc('appointment_set_service_status', {
    p_appointment_id: appointmentId,
    p_new_status: 'in_progress',
    p_note: 'e2e start'
  })
  if (e1) throw e1

  // check timestamps and event
  let { data: a1, error: ae1 } = await supabase
    .from('appointments')
    .select('service_status, service_started_at, service_completed_at')
    .eq('id', appointmentId)
    .single()
  if (ae1) throw ae1
  if (a1?.service_status !== 'in_progress' || !a1?.service_started_at) {
    throw new Error('in_progress assertion failed')
  }
  let { data: ev1, error: ev1e } = await supabase
    .from('appointment_events')
    .select('id')
    .eq('appointment_id', appointmentId)
    .eq('event_type', 'service_status_changed')
    .limit(1)
  if (ev1e) throw ev1e
  if (!ev1 || ev1.length === 0) throw new Error('missing service_status_changed event for in_progress')

  // 2) to completed
  let { error: e2 } = await supabase.rpc('appointment_set_service_status', {
    p_appointment_id: appointmentId,
    p_new_status: 'completed',
    p_note: 'e2e done'
  })
  if (e2) throw e2

  // check completion
  let { data: a2, error: ae2 } = await supabase
    .from('appointments')
    .select('service_status, service_started_at, service_completed_at')
    .eq('id', appointmentId)
    .single()
  if (ae2) throw ae2
  if (a2?.service_status !== 'completed' || !a2?.service_completed_at) {
    throw new Error('completed assertion failed')
  }

  let { data: ev2, error: ev2e } = await supabase
    .from('appointment_events')
    .select('id')
    .eq('appointment_id', appointmentId)
    .eq('event_type', 'service_status_changed')
    .order('id', { ascending: false })
    .limit(1)
  if (ev2e) throw ev2e
  if (!ev2 || ev2.length === 0) throw new Error('missing service_status_changed event for completed')

  // notification queued
  let { data: nq, error: nqe } = await supabase
    .from('notification_queue')
    .select('id')
    .eq('appointment_id', appointmentId)
    .eq('message_type', 'booking_completed')
    .limit(1)
  if (nqe) throw nqe
  if (!nq || nq.length === 0) throw new Error('missing booking_completed notification')

  console.log('E2E OK')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})


