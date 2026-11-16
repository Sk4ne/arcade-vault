"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { GameCanvas, type GameHandle } from "@/components/games/game-canvas";
import { useUser } from "@/components/user-provider";
import { fmt, type Game } from "@/lib/data";
import { getPlayableGame } from "@/lib/games/registry";
import type { GameCallbacks, PlayableGame } from "@/lib/games/types";
import { submitScore } from "@/lib/leaderboard/actions";
import { normalizePlayerName } from "@/lib/leaderboard/validation";

// Vidas que muestra la simulación de los juegos sin motor real.
const LIVES = 3;

// ready: overlay "PULSA ESPACIO" (solo juego real) · over: modal de fin de partida
type Phase = "ready" | "playing" | "paused" | "over";

type SaveState = "idle" | "saving" | "error" | "saved";

// Táctil sin ningún puntero fino = sin teclado razonable.
const TOUCH_ONLY_QUERY = "(pointer: coarse) and (not (any-pointer: fine))";

function subscribeTouchOnly(onChange: () => void) {
  const mql = window.matchMedia(TOUCH_ONLY_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

function useTouchOnly() {
  return useSyncExternalStore(
    subscribeTouchOnly,
    () => window.matchMedia(TOUCH_ONLY_QUERY).matches,
    () => false, // prerender: se asume teclado
  );
}

function initialStats(playable: PlayableGame | undefined) {
  return Object.fromEntries(
    (playable?.extraStats ?? []).map((s) => [s.key, s.initial]),
  );
}

function isEditable(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable)
  );
}

export function GamePlayer({ game }: { game: Game }) {
  const { user } = useUser();
  // Juegos del registro: motor real. El resto mantiene la simulación de puntos.
  const playable = getPlayableGame(game.id);
  const isReal = playable !== undefined;
  const engineRef = useRef<GameHandle>(null);
  const touchOnly = useTouchOnly();

  const [phase, setPhase] = useState<Phase>(isReal ? "ready" : "playing");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(playable?.lives ?? LIVES);
  const [realLevel, setRealLevel] = useState(1);
  const [stats, setStats] = useState(() => initialStats(playable));
  const [saveState, setSaveState] = useState<SaveState>("idle");
  // null = sin editar: se usa el nombre de la sesión (que se carga tras hidratar) o INVITADO
  const [editedName, setEditedName] = useState<string | null>(null);

  const paused = phase === "paused";
  const over = phase === "over";
  // Siempre normalizado: A–Z, 0–9 y _, máx. 10 (mismas reglas que el CHECK de la base).
  const name = editedName ?? normalizePlayerName(user?.name ?? "INVITADO");
  const level = isReal ? realLevel : 1 + Math.floor(score / 2500);
  const shownLives = isReal ? lives : LIVES;
  // Simulados: HUD de siempre (Vidas y Nivel). Reales: según el registro.
  const showLives = !playable || playable.lives !== null;
  const showLevel = !playable || playable.hasLevel;

  // Simulación: solo para los juegos sin motor real.
  useEffect(() => {
    if (isReal || phase !== "playing") return;
    const t = setInterval(
      () => setScore((s) => s + Math.floor(10 + Math.random() * 90)),
      220,
    );
    return () => clearInterval(t);
  }, [isReal, phase]);

  // Juego real: ESPACIO arranca la partida desde el overlay de inicio.
  useEffect(() => {
    if (!isReal || phase !== "ready") return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat || isEditable(e.target)) return;
      e.preventDefault();
      engineRef.current?.start();
      setPhase("playing");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isReal, phase]);

  const callbacks = useMemo<GameCallbacks>(
    () => ({
      onScore: setScore,
      onLives: setLives,
      onLevel: setRealLevel,
      onStat: (key, value) => setStats((s) => ({ ...s, [key]: value })),
      onGameOver: (finalScore) => {
        setScore(finalScore);
        setPhase("over");
      },
    }),
    [],
  );

  // Quita el foco del botón pulsado: si no, ESPACIO durante la partida lo activaría.
  const releaseFocus = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isReal) e.currentTarget.blur();
  };

  const togglePause = (e: React.MouseEvent<HTMLButtonElement>) => {
    releaseFocus(e);
    if (phase === "playing") {
      engineRef.current?.pause();
      setPhase("paused");
    } else if (phase === "paused") {
      engineRef.current?.resume();
      setPhase("playing");
    }
  };

  const finish = (e: React.MouseEvent<HTMLButtonElement>) => {
    releaseFocus(e);
    engineRef.current?.pause(); // detiene el motor; el modal muestra la puntuación actual
    setPhase("over");
  };

  const restart = () => {
    setScore(0);
    setSaveState("idle");
    if (playable) {
      engineRef.current?.reset();
      setLives(playable.lives ?? LIVES);
      setRealLevel(1);
      setStats(initialStats(playable));
      setPhase("ready");
    } else {
      setPhase("playing");
    }
  };

  const handleSave = async () => {
    if (saveState === "saving") return;
    setSaveState("saving");
    try {
      const result = await submitScore({ game: game.id, score, name });
      setSaveState(result.ok ? "saved" : "error");
    } catch {
      setSaveState("error"); // red caída o acción no disponible
    }
  };

  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: "var(--ink)" }}>
              {name}
            </div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{fmt(score)}</div>
          </div>
          {showLives && (
            <div className="hud-stat lives">
              <div className="l">Vidas</div>
              <div className="v">{"♥ ".repeat(shownLives).trim() || "—"}</div>
            </div>
          )}
          {playable?.extraStats.map((stat) => (
            <div className="hud-stat" key={stat.key}>
              <div className="l">{stat.label}</div>
              <div className="v">{stats[stat.key] ?? stat.initial}</div>
            </div>
          ))}
          {showLevel && (
            <div className="hud-stat level">
              <div className="l">Nivel</div>
              <div className="v">{String(level).padStart(2, "0")}</div>
            </div>
          )}
        </div>
        <div className="hud-actions">
          <button
            type="button"
            className="btn yellow"
            onClick={togglePause}
            disabled={phase === "ready" || over}
          >
            {paused ? "REANUDAR" : "PAUSA"}
          </button>
          <button
            type="button"
            className="btn magenta"
            onClick={finish}
            disabled={over}
          >
            FIN
          </button>
          <Link href={`/juego/${game.id}`} className="btn ghost">
            SALIR
          </Link>
        </div>
      </div>

      <div className="crt">
        <div className="crt-screen">
          {playable ? (
            <GameCanvas
              ref={engineRef}
              create={playable.create}
              callbacks={callbacks}
              ariaLabel={playable.ariaLabel}
            />
          ) : (
            <div className="game-arena">
              <div className="grid-floor"></div>
              <div className="enemy e1"></div>
              <div className="enemy e2"></div>
              <div className="enemy e3"></div>
              <div className="player-ship"></div>
            </div>
          )}
          {playable && phase === "ready" && (
            <div className="crt-content start-overlay">
              {touchOnly ? (
                <>
                  <div
                    className="pixel neon-magenta prompt"
                    style={{ animation: "none" }}
                  >
                    REQUIERE TECLADO
                  </div>
                  <p className="note">
                    {game.title} se juega con las flechas y la barra
                    espaciadora. Conecta un teclado para jugar.
                  </p>
                </>
              ) : (
                <>
                  <div className="pixel neon-cyan prompt">
                    PULSA ESPACIO PARA EMPEZAR
                  </div>
                  <ul className="controls-legend" aria-label="Controles">
                    {playable.controls.map((hint) => (
                      <li key={hint.label}>
                        {hint.keys.map((key) => (
                          <kbd
                            key={key}
                            className={
                              key.length > 1 ? "keycap wide" : "keycap"
                            }
                          >
                            {key}
                          </kbd>
                        ))}
                        {hint.label}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
          {paused && (
            <div
              className="crt-content"
              style={{ background: "rgba(0,0,0,0.6)", zIndex: 5 }}
            >
              <div>
                <div className="pixel neon-yellow" style={{ fontSize: 22 }}>
                  EN PAUSA
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "var(--ink-dim)",
                    marginTop: 10,
                    letterSpacing: "0.16em",
                  }}
                >
                  PULSA REANUDAR PARA CONTINUAR
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>{game.title} · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>

      {over && (
        <div className="modal-bd">
          <div className="modal">
            <h2>FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{fmt(score)}</div>
            {!isReal ? (
              <div className="demo-note">MODO DEMO · NO PUNTÚA</div>
            ) : saveState !== "saved" ? (
              <div className="input-row">
                <input
                  value={name}
                  onChange={(e) =>
                    setEditedName(normalizePlayerName(e.target.value))
                  }
                  maxLength={10}
                  autoCapitalize="characters"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="TUS INICIALES"
                  aria-label="Tus iniciales"
                  disabled={saveState === "saving"}
                />
                <button
                  type="button"
                  className={
                    "btn " + (saveState === "error" ? "magenta" : "yellow")
                  }
                  onClick={handleSave}
                  disabled={saveState === "saving" || name === ""}
                  aria-live="polite"
                >
                  {saveState === "saving"
                    ? "GUARDANDO…"
                    : saveState === "error"
                      ? "NO SE PUDO GUARDAR · REINTENTAR"
                      : "GUARDAR PUNTUACIÓN"}
                </button>
              </div>
            ) : (
              <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
            )}
            <div className="actions">
              <button type="button" className="btn" onClick={restart}>
                JUGAR DE NUEVO
              </button>
              <Link href="/games" className="btn magenta">
                VOLVER AL VAULT
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
