"use client";

import { useEffect, useImperativeHandle, useRef, type Ref } from "react";

import type { GameCallbacks, GameEngine, GameFactory } from "@/lib/games/types";

/** Control imperativo que expone el canvas al reproductor. */
export type GameHandle = Pick<
  GameEngine,
  "start" | "pause" | "resume" | "reset"
>;

type Props = {
  create: GameFactory;
  callbacks: GameCallbacks;
  ariaLabel: string;
  ref?: Ref<GameHandle>;
};

export function GameCanvas({ create, callbacks, ariaLabel, ref }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameEngine | null>(null);

  // Los callbacks se guardan en una ref para no recrear el motor (y reiniciar
  // la partida) cada vez que el padre renderiza con funciones nuevas.
  const callbacksRef = useRef(callbacks);
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const game = create(canvas, {
      onScore: (score) => callbacksRef.current.onScore(score),
      onLives: (lives) => callbacksRef.current.onLives?.(lives),
      onLevel: (level) => callbacksRef.current.onLevel?.(level),
      onStat: (key, value) => callbacksRef.current.onStat?.(key, value),
      onGameOver: (finalScore) => callbacksRef.current.onGameOver(finalScore),
    });
    gameRef.current = game;
    return () => {
      // destroy() es idempotente: seguro con el doble montaje de Strict Mode.
      game.destroy();
      if (gameRef.current === game) gameRef.current = null;
    };
  }, [create]);

  useImperativeHandle(
    ref,
    () => ({
      start: () => gameRef.current?.start(),
      pause: () => gameRef.current?.pause(),
      resume: () => gameRef.current?.resume(),
      reset: () => gameRef.current?.reset(),
    }),
    [],
  );

  return (
    <canvas ref={canvasRef} className="game-canvas" aria-label={ariaLabel} />
  );
}
