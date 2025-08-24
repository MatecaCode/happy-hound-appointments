-- Purpose: Fix the existing unified registration trigger to properly set claimed_at 
-- and admin_created for self-registered clients
-- This ensures clients table is fully populated when users click "Registrar"

create or replace function public.handle_unified_registration()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_code_record record;
  staff_code_record record;
  admin_registration_code text;
  staff_registration_code text;
  debug_info text;
  trigger_start_time timestamp;
  user_name text;
begin
  -- Start timing and logging
  trigger_start_time := clock_timestamp();
  debug_info := format('User ID: %s, Email: %s', new.id, new.email);
  
  raise log '🚀 === TRIGGER START === %', debug_info;
  raise log '🕐 Trigger started at: %', trigger_start_time;
  raise log '📧 User email: %', new.email;
  raise log '🆔 User ID: %', new.id;
  
  -- Extract user name from metadata
  user_name := coalesce(new.raw_user_meta_data->>'name', 'Unknown User');
  raise log '👤 User name: %', user_name;
  
  -- Log metadata (without problematic jsonb_object_keys)
  if new.raw_user_meta_data is not null then
    raise log '📋 Full metadata: %', new.raw_user_meta_data;
  else
    raise log '❌ No metadata found';
  end if;
  
  -- Check for admin registration FIRST (immediate processing - BEFORE email confirmation)
  admin_registration_code := new.raw_user_meta_data->>'admin_registration_code';
  raise log '🔍 Admin registration code extracted: "%"', admin_registration_code;
  
  if admin_registration_code is not null then
    raise log '🔄 Processing admin registration IMMEDIATELY with code: %', admin_registration_code;
    
    -- Check if this is a valid admin registration code (exists and unused)
    -- Use LIMIT 1 to ensure single row
    select * into admin_code_record
    from admin_registration_codes arc
    where arc.code = admin_registration_code
    and arc.is_used = false
    limit 1;
    
    if found then
      raise log '✅ Found valid admin code: %', admin_code_record.code;
      
      -- Atomic admin registration: assign role, create profile, mark code as used
      begin
        raise log '🔄 Step 1: Assigning admin role IMMEDIATELY...';
        -- Step 1: Assign admin role with name
        insert into user_roles (user_id, role, name)
        values (new.id, 'admin', user_name)
        on conflict (user_id) do update set 
          role = 'admin',
          name = user_name;
        raise log '✅ Admin role assigned successfully with name: %', user_name;
        
        raise log '🔄 Step 2: Creating admin profile IMMEDIATELY...';
        -- Step 2: Create admin profile
        insert into admin_profiles (
          user_id,
          name,
          email
        ) values (
          new.id,
          user_name,
          new.email
        )
        on conflict (user_id) do update set 
          name = user_name,
          email = new.email;
        raise log '✅ Admin profile created successfully';
        
        raise log '🔄 Step 3: Marking code as used IMMEDIATELY...';
        -- Step 3: Mark the code as used
        update admin_registration_codes arc
        set is_used = true, used_by = new.id, used_at = now()
        where arc.code = admin_registration_code;
        raise log '✅ Admin code marked as used successfully';
        
        raise log '🎉 === ADMIN REGISTRATION COMPLETE (IMMEDIATE) ===';
        raise log '⏱️ Total trigger execution time: %', clock_timestamp() - trigger_start_time;
        return new;
        
      exception when others then
        raise log '❌ ERROR during admin registration: %', sqlerrm;
        raise log '❌ ERROR DETAILS: %', sqlstate;
        raise log '⏱️ Trigger failed after: %', clock_timestamp() - trigger_start_time;
        -- Re-raise the error to prevent user creation if admin registration fails
        raise;
      end;
    else
      raise log '❌ Invalid admin code: % (not found or already used)', admin_registration_code;
      -- Don't create user if admin code is invalid
      raise exception 'Invalid admin registration code: %', admin_registration_code;
    end if;
  else
    raise log 'ℹ️ No admin registration code found in metadata';
  end if;
  
  -- Check for staff registration (only if not admin)
  staff_registration_code := new.raw_user_meta_data->>'registration_code';
  raise log '🔍 Staff registration code extracted: "%"', staff_registration_code;
  
  if staff_registration_code is not null then
    raise log '🔄 Processing staff registration with code: %', staff_registration_code;
    
    -- Use LIMIT 1 to ensure single row
    select * into staff_code_record
    from staff_registration_codes
    where code = staff_registration_code
    and account_type = 'staff'
    and is_used = false
    limit 1;
    
    if found then
      raise log '✅ Found valid staff code: %', staff_code_record.code;
      
      -- Atomic staff registration
      begin
        raise log '🔄 Step 1: Assigning staff role...';
        -- Step 1: Assign staff role with name
        insert into user_roles (user_id, role, name)
        values (new.id, 'staff', user_name)
        on conflict (user_id) do update set 
          role = 'staff',
          name = user_name;
        raise log '✅ Staff role assigned successfully with name: %', user_name;
        
        raise log '🔄 Step 2: Creating staff profile...';
        -- Step 2: Create staff profile
        insert into staff_profiles (
          user_id,
          name,
          phone,
          email,
          can_bathe,
          can_groom,
          can_vet,
          active
        ) values (
          new.id,
          user_name,
          new.raw_user_meta_data->>'phone',
          new.email,
          coalesce((new.raw_user_meta_data->>'can_bathe')::boolean, false),
          coalesce((new.raw_user_meta_data->>'can_groom')::boolean, false),
          coalesce((new.raw_user_meta_data->>'can_vet')::boolean, false),
          true
        )
        on conflict (user_id) do update set
          name = user_name,
          phone = new.raw_user_meta_data->>'phone',
          email = new.email,
          can_bathe = coalesce((new.raw_user_meta_data->>'can_bathe')::boolean, false),
          can_groom = coalesce((new.raw_user_meta_data->>'can_groom')::boolean, false),
          can_vet = coalesce((new.raw_user_meta_data->>'can_vet')::boolean, false);
        raise log '✅ Staff profile created successfully';
        
        raise log '🔄 Step 3: Marking staff code as used...';
        -- Step 3: Mark the code as used
        update staff_registration_codes 
        set is_used = true, used_by = new.id, used_at = now()
        where code = staff_registration_code;
        raise log '✅ Staff code marked as used successfully';
        
        raise log '🎉 === STAFF REGISTRATION COMPLETE ===';
        raise log '⏱️ Total trigger execution time: %', clock_timestamp() - trigger_start_time;
        return new;
        
      exception when others then
        raise log '❌ ERROR during staff registration: %', sqlerrm;
        raise log '❌ ERROR DETAILS: %', sqlstate;
        raise log '⏱️ Trigger failed after: %', clock_timestamp() - trigger_start_time;
        raise;
      end;
    else
      raise log '❌ Invalid staff code: % (not found or already used)', staff_registration_code;
      raise exception 'Invalid staff registration code: %', staff_registration_code;
    end if;
  else
    raise log 'ℹ️ No staff registration code found in metadata';
  end if;
  
  -- Default to client (only if no admin or staff codes found)
  raise log '🔄 No valid registration codes found, defaulting to client';
  
  begin
    raise log '🔄 Step 1: Assigning client role...';
    -- Step 1: Assign client role with name
    insert into user_roles (user_id, role, name)
    values (new.id, 'client', user_name)
    on conflict (user_id) do update set 
      role = 'client',
      name = user_name;
    raise log '✅ Client role assigned successfully with name: %', user_name;
    
    raise log '🔄 Step 2: Creating client profile...';
    -- Step 2: Create client profile with COMPLETE data
    -- *** FIX: Add admin_created and claimed_at for self-registered clients ***
    insert into clients (
      user_id, 
      name, 
      email, 
      admin_created, 
      claimed_at
    )
    values (
      new.id, 
      user_name, 
      new.email, 
      false,  -- self-registered, not admin-created
      (now() at time zone 'America/Sao_Paulo')  -- immediately claimed since they registered themselves
    )
    on conflict (user_id) do update set
      name = user_name,
      email = new.email,
      admin_created = false,
      claimed_at = coalesce(clients.claimed_at, (now() at time zone 'America/Sao_Paulo'));
    raise log '✅ Client profile created successfully with claimed_at set';
    
    raise log '🎉 === CLIENT REGISTRATION COMPLETE ===';
    raise log '⏱️ Total trigger execution time: %', clock_timestamp() - trigger_start_time;
    return new;
    
  exception when others then
    raise log '❌ ERROR during client registration: %', sqlerrm;
    raise log '❌ ERROR DETAILS: %', sqlstate;
    raise log '⏱️ Trigger failed after: %', clock_timestamp() - trigger_start_time;
    raise;
  end;
  
exception
  when others then
    raise log '❌ === TRIGGER ERROR === User: %, Error: %', new.id, sqlerrm;
    raise log '❌ === ERROR DETAILS === %', sqlstate;
    raise log '⏱️ Trigger failed after: %', clock_timestamp() - trigger_start_time;
    return new;
end;
$$;
