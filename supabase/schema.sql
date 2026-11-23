-- Bullet journal : à coller dans Supabase > SQL Editor > Run
-- Une seule table : un arbre (objectif > tâches > sous-tâches, niveaux illimités)
-- + une planification optionnelle (jour / semaine / mois).
-- État FINAL (avec connexion). Pour une base existante, utilise plutôt les fichiers migration-*.sql.







create table if not exists bullet_items (
  id          uuid primary key default gen_random_uuid(),
  parent_id   uuid references bullet_items(id) on delete cascade,
  title       text not null,
  notes       text,
  done        boolean not null default false,
  done_at     timestamptz,
  position    double precision not null default 0,
  -- planification : 'day' = ce jour, 'week' = le lundi de la semaine, 'month' = le 1er du mois
  sched_type  text check (sched_type in ('day', 'week', 'month')),
  sched_date  date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint bullet_sched_consistent check ((sched_type is null) = (sched_date is null))
);

-- Rendez-vous (ajouté après coup) : sans risque si tu relances ce fichier
alter table bullet_items add column if not exists is_appointment boolean not null default false;
alter table bullet_items add column if not exists start_time time;

-- Priorité de la semaine / du mois (éléments planifiés sur une semaine ou un mois)
alter table bullet_items add column if not exists sched_priority boolean not null default false;

-- Priorité (0 = normal, 1 = prioritaire)
alter table bullet_items add column if not exists priority smallint not null default 0;

-- Heure de fin et lieu des rendez-vous
alter table bullet_items add column if not exists end_time time;
alter table bullet_items add column if not exists location text;

-- Couleur de l'objectif principal (ses sous-tâches en héritent)
alter table bullet_items add column if not exists color text;

-- Répétition (tâches et rendez-vous récurrents)
alter table bullet_items add column if not exists repeat_unit text check (repeat_unit in ('day', 'week', 'month'));
alter table bullet_items add column if not exists repeat_every smallint not null default 1 check (repeat_every between 1 and 365);

-- Propriétaire des lignes (rempli automatiquement par la connexion)
alter table bullet_items add column if not exists user_id uuid default auth.uid() references auth.users(id) on delete cascade;

-- Anniversaires : jour + mois (+ année de naissance facultative), répétés chaque année dans l'agenda
create table if not exists bullet_birthdays (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  month       smallint not null check (month between 1 and 12),
  day         smallint not null check (day between 1 and 31),
  birth_year  smallint check (birth_year between 1900 and 2100),
  created_at  timestamptz not null default now(),
  user_id     uuid default auth.uid() references auth.users(id) on delete cascade
);

create index if not exists bullet_items_parent_idx on bullet_items (parent_id);
create index if not exists bullet_items_sched_idx  on bullet_items (sched_type, sched_date);

create or replace function bullet_touch_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists bullet_items_touch on bullet_items;
create trigger bullet_items_touch
  before update on bullet_items
  for each row execute function bullet_touch_updated_at();

-- Appareils qui reçoivent les rappels
create table if not exists bullet_push_subs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);

-- Rappels déjà envoyés (évite les doublons) : accessible uniquement par le serveur
create table if not exists bullet_reminders_sent (
  key     text primary key,
  sent_at timestamptz not null default now()
);

-- Sécurité : chaque ligne n'est visible que par son propriétaire connecté
alter table bullet_items          enable row level security;
alter table bullet_birthdays      enable row level security;
alter table bullet_push_subs      enable row level security;
alter table bullet_reminders_sent enable row level security;

drop policy if exists "bullet_items_open" on bullet_items;
drop policy if exists "bullet_birthdays_open" on bullet_birthdays;
drop policy if exists "bullet_items_own" on bullet_items;
drop policy if exists "bullet_birthdays_own" on bullet_birthdays;
drop policy if exists "bullet_push_subs_own" on bullet_push_subs;

create policy "bullet_items_own" on bullet_items
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "bullet_birthdays_own" on bullet_birthdays
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "bullet_push_subs_own" on bullet_push_subs
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ===== Bullet journal : trackers, humeur, collections, stickers =====
alter table bullet_items add column if not exists sticker text;

-- Habitudes à suivre (yoga, eau, sommeil…)
create table if not exists bullet_habits (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name          text not null,
  emoji         text,
  color         text not null default '#a8d5ba',
  kind          text not null default 'check' check (kind in ('check', 'number')),
  unit          text,
  goal_per_week smallint check (goal_per_week between 1 and 7),
  position      double precision not null default 0,
  archived      boolean not null default false,
  created_at    timestamptz not null default now()
);

-- Une ligne par habitude et par jour fait (value = 1 pour une case cochée, ou la valeur saisie)
create table if not exists bullet_habit_logs (
  habit_id uuid not null references bullet_habits(id) on delete cascade,
  day      date not null,
  user_id  uuid not null default auth.uid() references auth.users(id) on delete cascade,
  value    numeric not null default 1,
  primary key (habit_id, day)
);

-- Humeur (1 = très bien … 5 = mauvais) et « bonne chose du jour »
create table if not exists bullet_days (
  user_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  day       date not null,
  mood      smallint check (mood between 1 and 5),
  gratitude text,
  primary key (user_id, day)
);

-- Collections (livres, films, idées…) + « Vrac » (kind = 'dump')
create table if not exists bullet_collections (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title      text not null,
  emoji      text,
  color      text not null default '#cdb4db',
  kind       text not null default 'list' check (kind in ('list', 'dump')),
  position   double precision not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists bullet_collection_items (
  id            uuid primary key default gen_random_uuid(),
  collection_id uuid not null references bullet_collections(id) on delete cascade,
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  text          text not null,
  note          text,
  done          boolean not null default false,
  position      double precision not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists bullet_habit_logs_day_idx on bullet_habit_logs (day);
create index if not exists bullet_coll_items_idx on bullet_collection_items (collection_id);

do $$
declare t text;
begin
  foreach t in array array['bullet_habits','bullet_habit_logs','bullet_days','bullet_collections','bullet_collection_items'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists %I on %I', t || '_own', t);
    execute format(
      'create policy %I on %I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t || '_own', t);
  end loop;
end $$;
