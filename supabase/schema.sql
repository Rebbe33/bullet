-- Bullet journal : à coller dans Supabase > SQL Editor > Run
-- Une seule table : un arbre (objectif > tâches > sous-tâches, niveaux illimités)
-- + une planification optionnelle (jour / semaine / mois).

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

-- Pas de login pour la v1 (comme tes autres applis) : accès ouvert via la clé anon.
-- Attention : toute personne qui connaît l'URL de l'appli peut lire/modifier les données.
alter table bullet_items enable row level security;

drop policy if exists "bullet_items_open" on bullet_items;
create policy "bullet_items_open" on bullet_items
  for all to anon, authenticated
  using (true) with check (true);
