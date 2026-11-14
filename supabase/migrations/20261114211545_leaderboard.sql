-- SPEC 06 — Leaderboard y tabla de juegos

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

create table public.games (
  id        text primary key,            -- mismo slug que lib/data.ts
  title     text not null,
  playable  boolean not null default false
);

create table public.scores (
  id          bigint generated always as identity primary key,
  game_id     text not null references public.games(id),
  player_name text not null check (player_name ~ '^[A-Z0-9_]{1,10}$'),
  score       integer not null check (score between 0 and 9999999),
  created_at  timestamptz not null default now()
);

create index scores_game_score_idx on public.scores (game_id, score desc, created_at);

-- ---------------------------------------------------------------------------
-- Vista: mejor marca por jugador y juego, con rango único por juego
-- ---------------------------------------------------------------------------

create view public.leaderboard with (security_invoker = true) as
select game_id, player_name, score, created_at,
       row_number() over (partition by game_id order by score desc, created_at asc) as rank
from (
  select distinct on (game_id, player_name) game_id, player_name, score, created_at
  from public.scores
  order by game_id, player_name, score desc, created_at asc
) best;

-- ---------------------------------------------------------------------------
-- Privilegios: solo lectura, e insert en scores. Nunca update/delete.
-- ---------------------------------------------------------------------------

revoke all on public.games       from anon, authenticated;
revoke all on public.scores      from anon, authenticated;
revoke all on public.leaderboard from anon, authenticated;

grant select on public.games       to anon, authenticated;
grant select, insert on public.scores to anon, authenticated;
grant select on public.leaderboard to anon, authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.games  enable row level security;
alter table public.scores enable row level security;

create policy "games: lectura pública"
  on public.games for select
  to anon, authenticated
  using (true);

create policy "scores: lectura pública"
  on public.scores for select
  to anon, authenticated
  using (true);

create policy "scores: insert solo en juegos jugables"
  on public.scores for insert
  to anon, authenticated
  with check (
    exists (
      select 1 from public.games g
      where g.id = scores.game_id and g.playable
    )
  );

-- ---------------------------------------------------------------------------
-- Seed de games (catálogo de lib/data.ts; solo rocas puntúa)
-- ---------------------------------------------------------------------------

insert into public.games (id, title, playable) values
  ('bloque-buster', 'BLOQUE BUSTER', false),
  ('caida',         'CAÍDA',         false),
  ('serpentina',    'SERPENTINA',    false),
  ('gloton',        'GLOTÓN',        false),
  ('invasores',     'INVASORES',     false),
  ('rocas',         'ROCAS',         true),
  ('ranaria',       'RANARIA',       false),
  ('duelo-pixel',   'DUELO PIXEL',   false);
