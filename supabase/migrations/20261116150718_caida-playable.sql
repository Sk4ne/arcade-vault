-- SPEC 07: CAÍDA pasa a tener motor real y puntúa en el Salón.
-- Los ids con playable = true deben coincidir con PLAYABLE_GAMES (lib/games/registry.ts).
update public.games set playable = true where id = 'caida';
