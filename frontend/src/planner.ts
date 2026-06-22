import type { Shot } from "./types";

export function plannedRuntime(shots: Pick<Shot, "duration_seconds">[]): number {
  return shots.reduce((total, shot) => total + Number(shot.duration_seconds || 0), 0);
}

export function remainingRuntime(targetRuntime: number, shots: Pick<Shot, "duration_seconds">[]): number {
  return targetRuntime - plannedRuntime(shots);
}

export function progressFromShots(shots: Pick<Shot, "status">[]): number {
  if (!shots.length) {
    return 0;
  }
  const complete = shots.filter((shot) => ["Approved", "Added to final edit"].includes(shot.status)).length;
  return Math.round((complete / shots.length) * 100);
}

export function buildWanPackage(shot: Pick<Shot, "shot_number" | "purpose" | "start_frame_prompt" | "end_frame_prompt" | "video_prompt" | "negative_prompt">): string {
  return `SHOT ${shot.shot_number} - ${shot.purpose}

START FRAME:
${shot.start_frame_prompt}

END FRAME:
${shot.end_frame_prompt}

VIDEO PROMPT:
${shot.video_prompt}

NEGATIVE PROMPT:
${shot.negative_prompt}`;
}
