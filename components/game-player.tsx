"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  AsteroidsCanvas,
  type AsteroidsHandle,
} from "@/components/games/asteroids-canvas";
import { useUser } from "@/components/user-provider";
import { fmt, type Game } from "@/lib/data";
import type { AsteroidsCallbacks } from "@/lib/games/asteroids/types";

const LIVES = 3;

// ready: overlay "PULSA ESPACIO" (solo juego real) · over: modal de fin de partida
type Phase = "ready" | "playing" | "paused" | "over";

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

function isEditable(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable)
  );
}

export function GamePlayer({ game }: { game: Game }) {
  const { user, saveScore } = useUser();
  // Solo ROCAS tiene motor real; el resto mantiene la simulación de puntos.
  const isReal = game.id === "rocas";
  const engineRef = useRef<AsteroidsHandle>(null);
  const touchOnly = useTouchOnly();

  const [phase, setPhase] = useState<Phase>(isReal ? "ready" : "playing");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(LIVES);
  const [realLevel, setRealLevel] = useState(1);
  const [saved, setSaved] = useState(false);
  // null = sin editar: se usa el nombre de la sesión (que se carga tras hidratar) o INVITADO
  const [editedName, setEditedName] = useState<string | null>(null);

  const paused = phase === "paused";
  const over = phase === "over";
  const name = editedName ?? user?.name ?? "INVITADO";
  const level = isReal ? realLevel : 1 + Math.floor(score / 2500);
  const shownLives = isReal ? lives : LIVES;

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

  const callbacks = useMemo<AsteroidsCallbacks>(
    () => ({
      onScore: setScore,
      onLives: setLives,
      onLevel: setRealLevel,
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
    setSaved(false);
    if (isReal) {
      engineRef.current?.reset();
      setLives(LIVES);
      setRealLevel(1);
      setPhase("ready");
    } else {
      setPhase("playing");
    }
  };

  const handleSave = () => {
    saveScore({ game: game.id, score, name });
    setSaved(true);
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
          <div className="hud-stat lives">
            <div className="l">Vidas</div>
            <div className="v">{"♥ ".repeat(shownLives).trim() || "—"}</div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(level).padStart(2, "0")}</div>
          </div>
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
          {isReal ? (
            <AsteroidsCanvas ref={engineRef} callbacks={callbacks} />
          ) : (
            <div className="game-arena">
              <div className="grid-floor"></div>
              <div className="enemy e1"></div>
              <div className="enemy e2"></div>
              <div className="enemy e3"></div>
              <div className="player-ship"></div>
            </div>
          )}
          {isReal && phase === "ready" && (
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
                    <li>
                      <kbd className="keycap">←</kbd>
                      <kbd className="keycap">→</kbd>
                      rotar
                    </li>
                    <li>
                      <kbd className="keycap">↑</kbd>
                      propulsar
                    </li>
                    <li>
                      <kbd className="keycap wide">ESPACIO</kbd>
                      disparar
                    </li>
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
            {!saved ? (
              <div className="input-row">
                <input
                  value={name}
                  onChange={(e) =>
                    setEditedName(e.target.value.toUpperCase().slice(0, 10))
                  }
                  placeholder="TUS INICIALES"
                  aria-label="Tus iniciales"
                />
                <button
                  type="button"
                  className="btn yellow"
                  onClick={handleSave}
                >
                  GUARDAR PUNTUACIÓN
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
