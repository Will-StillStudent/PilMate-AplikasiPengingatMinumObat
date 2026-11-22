-- Supabase SQL Schema for PilMate PWA
-- Sesuai dengan spesifikasi DESIGN.md Bagian 5.1

create table if not exists medications (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  dosage        text,
  notes         text,
  color         text default '#1f8a70',
  tags          text[] default '{}',
  stock         integer not null default 0,
  low_stock_at  integer not null default 0,
  expires_on    date,
  created_at    timestamptz not null default now()
);

create table if not exists reminders (
  id             uuid primary key default gen_random_uuid(),
  medication_id  uuid not null references medications(id) on delete cascade,
  time           time not null,
  days           integer[] not null default '{0,1,2,3,4,5,6}', -- 0 = Minggu, 1 = Senin, ...
  amount         numeric not null default 1
);

create table if not exists dose_logs (
  id             uuid primary key default gen_random_uuid(),
  medication_id  uuid not null references medications(id) on delete cascade,
  scheduled_at   timestamptz,
  acted_at       timestamptz not null default now(),
  status         text not null check (status in ('taken','skipped','extra')),
  amount         numeric not null default 1,
  note           text
);

create index if not exists idx_reminders_medication_id on reminders(medication_id);
create index if not exists idx_dose_logs_medication_acted on dose_logs(medication_id, acted_at desc);

-- Row Level Security (RLS) - Opsional jika menggunakan service role di backend atau public anon
alter table medications enable row level security;
alter table reminders enable row level security;
alter table dose_logs enable row level security;

-- Policy untuk public / service role
create policy "Public read medications" on medications for select using (true);
create policy "Public insert medications" on medications for insert with check (true);
create policy "Public update medications" on medications for update using (true);
create policy "Public delete medications" on medications for delete using (true);

create policy "Public read reminders" on reminders for select using (true);
create policy "Public insert reminders" on reminders for insert with check (true);
create policy "Public update reminders" on reminders for update using (true);
create policy "Public delete reminders" on reminders for delete using (true);

create policy "Public read dose_logs" on dose_logs for select using (true);
create policy "Public insert dose_logs" on dose_logs for insert with check (true);
create policy "Public update dose_logs" on dose_logs for update using (true);
create policy "Public delete dose_logs" on dose_logs for delete using (true);

