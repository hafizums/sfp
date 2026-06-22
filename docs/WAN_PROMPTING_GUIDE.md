# Wan 2.2 Prompting Guide

Wan 2.2 prompts should be structured because vague cinematic wording can lead to extra people, location drift, sudden action, identity changes, or motion that does not match the planned shot. Short Film Planner Studio uses a strict Wan prompt framework by default to make generated prompt packages easier to review before external image-to-video testing.

## Prompt Checklist

- Cast/count: state exactly how many characters are visible and use character names from the shot or character bible. If only named characters should appear, say that only those named characters are visible and no extra people enter the frame.
- Setting/time: lock the location, time of day, lighting, and visual continuity. Avoid wording that lets the scene drift somewhere else.
- Camera/framing: specify shot type and camera behavior, such as wide shot, medium shot, close-up, static camera, slow dolly in, or gentle pan. Prefer static camera, no pan, no zoom, no cut when movement is not needed.
- Action timeline: keep the video prompt to a small continuous beginning, middle, and end action.
- Motion boundaries: include positive constraints inside the video prompt, such as stays in frame, remains seated, only small hand movement, expression changes gently, no one enters or exits, no sudden action, no jump cuts, no extra characters, and no identity drift.
- Production Bible: carry forward visual style, color palette, lighting, safety rules, camera language, and continuity rules.
- Negative prompt: keep it concise and focused on artifacts and safety. Do not rely only on the negative prompt for important behavior controls.

## Start And End Frames

Start frame prompts should describe the exact opening frame: character positions, pose, expression, setting, and camera/framing. End frame prompts should keep the same scene and same characters, allowing only one small clear change from the opening frame. Do not add new characters or props unless the shot explicitly requires them.

## LoRA Caution

LoRAs can change motion, behavior, identity, and style even when the text prompt is strict. Test short clips first and compare the result against the Production Bible and character/location continuity notes.

## Recommended Workflow

1. Generate prompts.
2. Review prompts manually.
3. Keep character count strict.
4. Keep motion simple.
5. Create start/end frames.
6. Test short clips first.
7. Create takes.
8. Approve the best take.
