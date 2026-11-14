"use client";

import { useEffect, useImperativeHandle, useRef, type Ref } from "react";

import { createAsteroidsGame } from "@/lib/games/asteroids/engine";
import type {
  AsteroidsCallbacks,
  AsteroidsGame,
} from "@/lib/games/asteroids/types";

/** Control imperativo que expone el canvas al reproductor. */
export type AsteroidsHandle = Pick<
  AsteroidsGame,
  "start" | "pause" | "resume" | "reset"
>;

type Props = {
  callbacks: AsteroidsCallbacks;
  ref?: Ref<AsteroidsHandle>;
};

export function AsteroidsCanvas({ callbacks, ref }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<AsteroidsGame | null>(null);

  // Los callbacks se guardan en una ref para no recrear el motor (y reiniciar
  // la partida) cada vez que el padre renderiza con funciones nuevas.
  const callbacksRef = useRef(callbacks);
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const game = createAsteroidsGame(canvas, {
      onScore: (score) => callbacksRef.current.onScore(score),
      onLives: (lives) => callbacksRef.current.onLives(lives),
      onLevel: (level) => callbacksRef.current.onLevel(level),
      onGameOver: (finalScore) => callbacksRef.current.onGameOver(finalScore),
    });
    gameRef.current = game;
    return () => {
      // destroy() es idempotente: seguro con el doble montaje de Strict Mode.
      game.destroy();
      if (gameRef.current === game) gameRef.current = null;
    };
  }, []);

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
    <canvas
      ref={canvasRef}
      className="game-canvas"
      aria-label="ROCAS: campo de asteroides"
    />
  );
}
