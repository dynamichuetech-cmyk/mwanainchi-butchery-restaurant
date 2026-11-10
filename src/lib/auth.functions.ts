import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { resolveRole } from './auth-rules';
import { z } from 'zod';

export const getAuthIdentity = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data: verified, error: verifyError } = await context.supabase.auth.getUser();
  if (verifyError || !verified.user || verified.user.id !== context.userId) throw new Error('Session expired');
  const { error: repairError } = await context.supabase.rpc('ensure_my_identity');
  if (repairError) throw new Error('Profile not found');
  const [profile, roles] = await Promise.all([
    context.supabase.from('profiles').select('*').eq('id', context.userId).single(),
    context.supabase.from('user_roles').select('role').eq('user_id', context.userId),
  ]);
  if (profile.error || roles.error) throw new Error('Profile not found');
  const [rider, access] = await Promise.all([
    context.supabase.from('rider_profiles').select('*').eq('user_id',context.userId).maybeSingle(),
    context.supabase.from('account_access').select('active').eq('user_id',context.userId).maybeSingle(),
  ]);
  if (rider.error || access.error || access.data?.active === false) throw new Error('Access denied');
  return { user: verified.user, profile: profile.data, role: resolveRole(roles.data.map((r) => r.role)), riderStatus: rider.data?.approval_status as import('./auth-rules').RiderStatus | null ?? null };
});

export const requireAdminAccess = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data, error } = await context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'admin' });
  if (error || data !== true) throw new Error('Account not authorised for administration');
  return true;
});

const orderInput = z.object({
  items: z.array(z.object({ product_id: z.string().uuid(), qty: z.number().positive(), prep: z.string(), addons: z.array(z.string()), notes: z.string() })).min(1),
  fulfilment: z.enum(['delivery', 'collection']), scheduled_for: z.string(),
  contact: z.object({ name: z.string().trim().min(1), phone: z.string().min(1), email: z.string() }),
  zone_id: z.string(), address: z.string(), delivery_notes: z.string(),
  payment_method: z.enum(['mpesa', 'card', 'cash']), mpesa_phone: z.string(), discount_code: z.string(),
});
export const submitOrder = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator(orderInput).handler(async ({ data, context }) => {
  const { data: user, error: authError } = await context.supabase.auth.getUser();
  if (authError || !user.user || !user.user.email_confirmed_at) throw new Error('Session expired');
  const { data: roles, error: roleError } = await context.supabase.from('user_roles').select('role').eq('user_id', context.userId);
  if (roleError || resolveRole(roles.map((r) => r.role)) !== 'customer') throw new Error('Customer account required');
  const { data: id, error } = await context.supabase.rpc('place_order', { p: data });
  if (error) {
    // Only return known business validation messages, never database internals.
    const safe = /^(Only |Minimum quantity|Minimum order|Your cart|Name and phone|Our Kitchen|Scheduled time|Invalid preparation|A product|Invalid fulfilment|Invalid payment|Choose|Delivery)/.test(error.message) || / is currently unavailable/.test(error.message);
    throw new Error(safe ? error.message : 'Unable to place your order. Check the items and delivery details.');
  }
  return id;
});
export const applyAsRider = createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).handler(async ({context}) => {
  const {error}=await context.supabase.rpc('apply_as_rider'); if(error) throw new Error('Unable to submit your application'); return true;
});
export const reviewRider = createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(z.object({id:z.string().uuid(),status:z.enum(['approved','rejected','suspended'])})).handler(async ({data,context}) => {
 const {data:allowed}=await context.supabase.rpc('has_role',{_user_id:context.userId,_role:'admin'}); if(!allowed) throw new Error('Access denied');
 const {error}=await context.supabase.rpc('review_rider',{_id:data.id,_status:data.status}); if(error) throw new Error(/Email verification/.test(error.message)?'Email verification required before approval':'Unable to update application'); return true;
});
export const riderApplications = createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).handler(async ({context}) => {
 const {data:allowed}=await context.supabase.rpc('has_role',{_user_id:context.userId,_role:'admin'}); if(!allowed) throw new Error('Access denied');
 const {data,error}=await context.supabase.from('rider_profiles').select('*').order('created_at',{ascending:false}); if(error) throw new Error('Unable to load applications');return data;
});
export const riderAssignments = createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).handler(async ({context}) => {
 const {data:rider,error:re}=await context.supabase.from('rider_profiles').select('approval_status').eq('user_id',context.userId).maybeSingle();
 const {data:role}=await context.supabase.rpc('has_role',{_user_id:context.userId,_role:'rider'});
 if(re || !role || rider?.approval_status!=='approved') throw new Error('Approval required');
 const {data,error}=await context.supabase.from('delivery_assignments').select('*').eq('rider_id',context.userId);if(error) throw new Error('Unable to load deliveries');return data;
});
export const updateDelivery = createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(z.object({id:z.string().uuid(),status:z.enum(['out_for_delivery','delivered']),latitude:z.number().min(-90).max(90).optional(),longitude:z.number().min(-180).max(180).optional()})).handler(async ({context,data}) => {
 const {error}=await context.supabase.rpc('update_my_delivery',{_id:data.id,_status:data.status,...(data.latitude===undefined?{}:{_latitude:data.latitude}),...(data.longitude===undefined?{}:{_longitude:data.longitude})});if(error) throw new Error('Unable to update this delivery');return true;
});
export const assignDelivery = createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(z.object({order:z.string().uuid(),rider:z.string().uuid()})).handler(async ({context,data})=>{
 const {error}=await context.supabase.rpc('assign_delivery',{_order:data.order,_rider:data.rider}); if(error) throw new Error('A ready delivery order and approved rider are required.'); return true;
});
export const deliveryDetails = createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).handler(async ({context})=>{
 const {data,error}=await context.supabase.rpc('my_delivery_details');if(error)throw new Error('Unable to load delivery details');
 return z.array(z.object({id:z.string(),order_number:z.string(),status:z.string(),contact_name:z.string(),contact_phone:z.string(),address:z.string().nullable(),notes:z.string().nullable()})).parse(data);
});
