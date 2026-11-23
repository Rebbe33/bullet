-- Trackers, humeur, gratitude, collections, brain dump, stickers
-- À lancer AVANT de déployer cette mise à jour (Supabase > SQL Editor > Run). Ne casse rien : ajoute seulement.

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
