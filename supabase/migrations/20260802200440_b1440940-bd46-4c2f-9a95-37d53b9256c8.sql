
CREATE TABLE public.promise_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  label text NOT NULL,
  accent text NOT NULL DEFAULT 'indigo',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.promise_subcategories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.promise_categories(id) ON DELETE CASCADE,
  slug text NOT NULL,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category_id, slug)
);

CREATE TABLE public.promises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  category_id uuid REFERENCES public.promise_categories(id) ON DELETE SET NULL,
  sub_category text,
  nano_category text,
  owner text NOT NULL,
  receiver text NOT NULL,
  deadline timestamptz NOT NULL,
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'pending',
  linked_module text,
  escalation_level integer NOT NULL DEFAULT 0,
  escalated_at timestamptz,
  escalation_reason text,
  escalation_status text,
  fulfilled_at timestamptz,
  extended_count integer NOT NULL DEFAULT 0,
  delay_days integer NOT NULL DEFAULT 0,
  fine_amount numeric(12,2) NOT NULL DEFAULT 0,
  tip_amount numeric(12,2) NOT NULL DEFAULT 0,
  breach_reason text,
  is_locked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.promise_ai_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promise_id uuid NOT NULL REFERENCES public.promises(id) ON DELETE CASCADE,
  delay_risk integer NOT NULL DEFAULT 0,
  miss_probability integer NOT NULL DEFAULT 0,
  suggested_action text NOT NULL,
  escalation_advice text NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.promise_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  kind text NOT NULL,
  name text NOT NULL,
  rule_type text NOT NULL DEFAULT 'fixed',
  amount numeric(12,2) NOT NULL DEFAULT 0,
  auto_apply boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.promise_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  promise_code text,
  actor text NOT NULL,
  actor_role text NOT NULL,
  details text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.promise_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  auto_reminder boolean NOT NULL DEFAULT true,
  reminder_before_hours integer NOT NULL DEFAULT 24,
  auto_escalation boolean NOT NULL DEFAULT true,
  escalation_delay_hours integer NOT NULL DEFAULT 4,
  working_hours_only boolean NOT NULL DEFAULT true,
  work_start_time text NOT NULL DEFAULT '09:00',
  work_end_time text NOT NULL DEFAULT '18:00',
  promise_expiry_days integer NOT NULL DEFAULT 30,
  require_approval boolean NOT NULL DEFAULT true,
  lock_after_fulfill boolean NOT NULL DEFAULT true,
  fine_system_enabled boolean NOT NULL DEFAULT true,
  tip_system_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.promise_categories TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.promise_subcategories TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.promises TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.promise_ai_insights TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.promise_rules TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.promise_audit_logs TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.promise_settings TO anon, authenticated;
GRANT ALL ON public.promise_categories TO service_role;
GRANT ALL ON public.promise_subcategories TO service_role;
GRANT ALL ON public.promises TO service_role;
GRANT ALL ON public.promise_ai_insights TO service_role;
GRANT ALL ON public.promise_rules TO service_role;
GRANT ALL ON public.promise_audit_logs TO service_role;
GRANT ALL ON public.promise_settings TO service_role;

ALTER TABLE public.promise_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promise_subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promise_ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promise_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promise_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promise_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pt_categories_all" ON public.promise_categories FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "pt_subcategories_all" ON public.promise_subcategories FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "pt_promises_all" ON public.promises FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "pt_insights_all" ON public.promise_ai_insights FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "pt_rules_all" ON public.promise_rules FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "pt_logs_all" ON public.promise_audit_logs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "pt_settings_all" ON public.promise_settings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.pt_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER promises_touch BEFORE UPDATE ON public.promises FOR EACH ROW EXECUTE FUNCTION public.pt_touch_updated_at();
CREATE TRIGGER promise_rules_touch BEFORE UPDATE ON public.promise_rules FOR EACH ROW EXECUTE FUNCTION public.pt_touch_updated_at();
CREATE TRIGGER promise_settings_touch BEFORE UPDATE ON public.promise_settings FOR EACH ROW EXECUTE FUNCTION public.pt_touch_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.promises;
ALTER PUBLICATION supabase_realtime ADD TABLE public.promise_audit_logs;

INSERT INTO public.promise_categories (slug, label, accent, sort_order) VALUES
  ('sales','Sales','sky',1),
  ('support','Support','emerald',2),
  ('delivery','Delivery','violet',3),
  ('payment','Payment','amber',4),
  ('legal','Legal','rose',5),
  ('partnership','Partnership','cyan',6),
  ('sla','SLA','indigo',7);

INSERT INTO public.promise_subcategories (category_id, slug, label, sort_order)
SELECT c.id, s.slug, s.label, s.sort_order FROM public.promise_categories c
JOIN (VALUES
  ('sales','price-lock','Price Lock',1),
  ('sales','discount-commitment','Discount Commitment',2),
  ('sales','demo-timeline','Demo Timeline',3),
  ('support','response-time','Response Time',1),
  ('support','resolution-time','Resolution Time',2),
  ('support','callback','Callback',3),
  ('delivery','go-live','Go-Live',1),
  ('delivery','feature-delivery','Feature Delivery',2),
  ('delivery','update-release','Update Release',3),
  ('payment','refund-promise','Refund Promise',1),
  ('payment','payout-date','Payout Date',2),
  ('payment','invoice-clearance','Invoice Clearance',3),
  ('legal','agreement-delivery','Agreement Delivery',1),
  ('legal','nda','NDA',2),
  ('legal','compliance','Compliance',3),
  ('partnership','revenue-share','Revenue Share',1),
  ('partnership','integration-timeline','Integration Timeline',2),
  ('partnership','support-level','Support Level',3),
  ('sla','uptime-commitment','Uptime Commitment',1),
  ('sla','response-sla','Response SLA',2),
  ('sla','resolution-sla','Resolution SLA',3)
) AS s(cat, slug, label, sort_order) ON s.cat = c.slug;

INSERT INTO public.promises (code,title,description,category_id,sub_category,nano_category,owner,receiver,deadline,priority,status,linked_module,escalation_level,escalated_at,escalation_reason,escalation_status,fulfilled_at,extended_count,delay_days,fine_amount,tip_amount,is_locked)
SELECT p.code,p.title,p.description,c.id,p.sub_category,p.nano_category,p.owner,p.receiver,p.deadline,p.priority,p.status,p.linked_module,p.escalation_level,p.escalated_at,p.escalation_reason,p.escalation_status,p.fulfilled_at,p.extended_count,p.delay_days,p.fine_amount,p.tip_amount,p.is_locked
FROM (VALUES
 ('PRM-001','Feature Delivery - CRM Module','Deliver the customer pipeline module with imports and role permissions.','delivery','Feature Delivery','Exact Date','Dev Team A','Client ABC', now() + interval '3 days','high','active','CRM',0,NULL::timestamptz,NULL,NULL,NULL::timestamptz,0,0,0,0,false),
 ('PRM-002','Price Lock - Enterprise Client','Hold the quoted enterprise licence pricing until the contract is signed.','sales','Price Lock','Exact Date','Sales Team','Enterprise Corp', now() - interval '2 days','critical','delayed','Sales',3, now() - interval '1 day','Repeated delays','pending',NULL,1,2,500,0,false),
 ('PRM-003','Response Time - Ticket #4521','First response within the premium support window.','support','Response Time','Auto Reminder','Support Lead','Customer XYZ', now() - interval '4 days','medium','fulfilled','Support',0,NULL,NULL,NULL, now() - interval '4 days' - interval '3 hours',0,0,0,0,true),
 ('PRM-004','Refund Promise - Order #8812','Process the full refund for the duplicated subscription charge.','payment','Refund Promise','Exact Time','Finance Team','Customer DEF', now() + interval '1 day','high','active','Billing',0,NULL,NULL,NULL,NULL,0,0,0,0,false),
 ('PRM-005','NDA Delivery - Partner XYZ','Send the countersigned mutual NDA to the partner legal desk.','legal','NDA','Exact Date','Legal Team','Partner XYZ', now() + interval '4 days','medium','pending','Legal',0,NULL,NULL,NULL,NULL,0,0,0,0,false),
 ('PRM-006','SLA Commitment - Premium Plan','Maintain 99.9% uptime for premium tenants for the quarter.','sla','Uptime Commitment','Dependency Linked','Operations','Premium Client', now() + interval '9 days','high','active','Infrastructure',0,NULL,NULL,NULL,NULL,0,0,0,0,false),
 ('PRM-007','Demo Timeline - Prospect ABC','Run the tailored product demo for the procurement committee.','sales','Demo Timeline','Exact Time','Sales Rep','Prospect ABC', now() - interval '6 days','critical','broken','Sales',4, now() - interval '5 days','SLA breach','in_review',NULL,2,6,5000,0,false),
 ('PRM-008','Update Release - v2.5','Ship the v2.5 maintenance release to all production tenants.','delivery','Update Release','Exact Date','Dev Team B','All Clients', now() + interval '7 days','medium','active','Release',0,NULL,NULL,NULL,NULL,0,0,0,0,false),
 ('PRM-009','Callback - Escalated Complaint','Return the escalated customer call with a resolution plan.','support','Callback','Auto Reminder','Support Lead','Customer GHI', now() - interval '1 day','high','delayed','Support',2, now() - interval '12 hours','Client complaint','pending',NULL,0,1,500,0,false),
 ('PRM-010','Payout Date - Franchise Q1','Release the Q1 franchise revenue payout batch.','payment','Payout Date','Exact Date','Finance Team','Franchise Network', now() + interval '11 days','high','pending','Finance',0,NULL,NULL,NULL,NULL,0,0,0,0,false),
 ('PRM-011','Go-Live - Retail Rollout','Complete the store rollout go-live for 14 retail outlets.','delivery','Go-Live','Dependency Linked','Delivery Manager','Retail Group', now() + interval '15 days','critical','active','Delivery',0,NULL,NULL,NULL,NULL,0,0,0,0,false),
 ('PRM-012','Integration Timeline - Payment Partner','Finish the payment partner integration sandbox certification.','partnership','Integration Timeline','Conditional Trigger','Integrations Team','PayPartner', now() + interval '6 days','medium','active','Integrations',0,NULL,NULL,NULL,NULL,0,0,0,0,false),
 ('PRM-013','Resolution Time - Ticket #4602','Close the reported data-sync defect within the resolution SLA.','support','Resolution Time','Auto Reminder','Support Engineer','Customer JKL', now() - interval '7 days','medium','fulfilled','Support',0,NULL,NULL,NULL, now() - interval '8 days',0,0,0,5000,true),
 ('PRM-014','Invoice Clearance - Vendor Batch','Clear the pending vendor invoice batch for March.','payment','Invoice Clearance','Exact Date','Accounts Payable','Vendor Network', now() - interval '10 days','low','fulfilled','Finance',0,NULL,NULL,NULL, now() - interval '11 days',0,0,0,1000,true),
 ('PRM-015','Agreement Delivery - Reseller','Deliver the executed reseller agreement pack.','legal','Agreement Delivery','Exact Date','Legal Team','Reseller North', now() + interval '5 days','medium','pending','Legal',0,NULL,NULL,NULL,NULL,0,0,0,0,false),
 ('PRM-016','Critical Bug Fix - Production','Patch the production checkout failure affecting live orders.','delivery','Feature Delivery','Conditional Trigger','Dev Team','Production Tenants', now() - interval '3 days','critical','delayed','Engineering',4, now() - interval '2 days','SLA breach','in_review',NULL,1,3,2000,0,false),
 ('PRM-017','Payment Dispute - Client ABC','Resolve the disputed annual invoice and issue a credit note.','payment','Invoice Clearance','Exact Date','Finance','Client ABC', now() - interval '1 day','high','delayed','Finance',2, now() - interval '8 hours','Client complaint','pending',NULL,0,1,500,0,false),
 ('PRM-018','Compliance Deadline - GDPR','Submit the annual GDPR data-processing compliance record.','legal','Compliance','Exact Date','Legal Team','Regulator', now() - interval '4 days','critical','broken','Compliance',4, now() - interval '4 days','Regulatory requirement','resolved',NULL,0,4,5000,0,false),
 ('PRM-019','Revenue Share - Q1 Statement','Publish the Q1 revenue-share statement to partners.','partnership','Revenue Share','Exact Date','Finance Team','Partner Network', now() + interval '13 days','medium','pending','Partnerships',0,NULL,NULL,NULL,NULL,0,0,0,0,false),
 ('PRM-020','Response SLA - Enterprise Queue','Keep enterprise queue first response under 30 minutes.','sla','Response SLA','Auto Reminder','Support Operations','Enterprise Tenants', now() + interval '2 days','high','active','Support',0,NULL,NULL,NULL,NULL,0,0,0,0,false),
 ('PRM-021','Discount Commitment - Renewal','Honour the agreed 12% renewal discount on the new order.','sales','Discount Commitment','Exact Date','Account Manager','Client MNO', now() + interval '8 days','medium','active','Sales',0,NULL,NULL,NULL,NULL,0,0,0,0,false),
 ('PRM-022','Support Level - Platinum Partner','Provide dedicated platinum support coverage for the launch week.','partnership','Support Level','Dependency Linked','Support Operations','Platinum Partner', now() + interval '10 days','high','pending','Partnerships',0,NULL,NULL,NULL,NULL,0,0,0,0,false),
 ('PRM-023','Resolution SLA - Severity 1','Restore severity-1 incidents within four hours.','sla','Resolution SLA','Conditional Trigger','Incident Team','All Clients', now() - interval '9 days','critical','fulfilled','Incidents',1, now() - interval '9 days','Reminder','resolved', now() - interval '9 days',0,0,0,2500,true),
 ('PRM-024','Feature Delivery - Reporting Pack','Deliver the scheduled reporting and export pack.','delivery','Feature Delivery','Exact Date','Dev Team A','Client PQR', now() - interval '15 days','high','fulfilled','Reporting',0,NULL,NULL,NULL, now() - interval '16 days',0,0,0,1000,true)
) AS p(code,title,description,cat,sub_category,nano_category,owner,receiver,deadline,priority,status,linked_module,escalation_level,escalated_at,escalation_reason,escalation_status,fulfilled_at,extended_count,delay_days,fine_amount,tip_amount,is_locked)
JOIN public.promise_categories c ON c.slug = p.cat;

INSERT INTO public.promise_ai_insights (promise_id, delay_risk, miss_probability, suggested_action, escalation_advice)
SELECT pr.id, v.delay_risk, v.miss_probability, v.suggested_action, v.escalation_advice
FROM (VALUES
  ('PRM-004',72,45,'Escalate to Finance Manager immediately','Level 2 escalation recommended within 24 hours'),
  ('PRM-006',38,18,'Add a second on-call engineer for the launch window','Keep at Level 0, review in 48 hours'),
  ('PRM-002',88,74,'Lock the quote and get written client sign-off today','Level 3 escalation already active — notify the Admin desk'),
  ('PRM-016',94,81,'Assign a dedicated hotfix squad and freeze other releases','Level 4 legal/penalty review recommended'),
  ('PRM-011',55,30,'Confirm hardware readiness for the last four outlets','Pre-emptive Level 1 reminder suggested'),
  ('PRM-020',26,12,'Maintain current staffing, no action required','No escalation needed')
) AS v(code, delay_risk, miss_probability, suggested_action, escalation_advice)
JOIN public.promises pr ON pr.code = v.code;

INSERT INTO public.promise_rules (code,kind,name,rule_type,amount,auto_apply,is_active) VALUES
 ('FR-001','fine','Delayed Promise Fine','fixed',500,true,true),
 ('FR-002','fine','Broken Promise Penalty','percentage',5,true,true),
 ('FR-003','fine','SLA Breach Fine','fixed',2000,false,true),
 ('FR-004','fine','Critical Deadline Miss','fixed',5000,true,false),
 ('TR-001','tip','Early Delivery Bonus','fixed',1000,false,true),
 ('TR-002','tip','Client Satisfaction Tip','percentage',2,false,true),
 ('TR-003','tip','Streak Bonus (5 on-time)','fixed',2500,true,true);

INSERT INTO public.promise_audit_logs (action, promise_code, actor, actor_role, details, created_at) VALUES
 ('Promise Created','PRM-019','admin@softwarevala.com','Admin','New promise created for Partner Network', now() - interval '2 hours'),
 ('Status Changed','PRM-003','support@softwarevala.com','Support Lead','Status changed from Active to Fulfilled', now() - interval '5 hours'),
 ('Fine Applied','PRM-007','finance@softwarevala.com','Finance','Fine of 5,000 applied for broken promise', now() - interval '9 hours'),
 ('Tip Released','PRM-013','manager@softwarevala.com','Manager','Tip of 5,000 released for early delivery', now() - interval '1 day'),
 ('Escalated','PRM-002','system','System','Auto-escalated to Level 3 due to repeated delays', now() - interval '1 day'),
 ('Deadline Extended','PRM-016','delivery@softwarevala.com','Delivery Manager','Deadline extended by 24 hours with approval', now() - interval '2 days'),
 ('Escalated','PRM-018','system','System','Auto-escalated to Level 4 for regulatory breach', now() - interval '4 days'),
 ('Rule Updated','NULL','admin@softwarevala.com','Admin','Auto-apply enabled on Streak Bonus rule', now() - interval '6 days');

INSERT INTO public.promise_settings (singleton) VALUES (true);
