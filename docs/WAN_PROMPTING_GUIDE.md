# Wan 2.2 Prompting Guide

Wan 2.2 prompts should be structured because vague cinematic wording can lead to extra people, location drift, sudden action, identity changes, or motion that does not match the planned shot. Short Film Planner Studio uses a strict Wan prompt framework by default to make generated prompt packages easier to review before external image-to-video testing.

Use the GPT image prompts first: `image_prompt` for the storyboard/reference still, `start_frame_prompt` for the exact first frame, and `end_frame_prompt` for the exact final frame. Then use `video_prompt` to control the Wan motion between those images. See `GPT_IMAGE_PROMPTING_GUIDE.md` for the still-image framework.

Start/end interpolation fails when the opening and closing stills quietly drift into different shots: different camera position, different framing, different subject scale, different background geometry, different lens feel, or different lighting direction. Generated start/end prompts should use the same camera position, same framing, same background/location layout, same perspective, and same scene continuity. The end frame should show only one small deliberate state change. Camera movement is acceptable when the shot explicitly asks for it, but the start and end frames should still feel like a subtle continuous move, not a new composition.

If character or location anchors are locked, prompt generation uses their filenames and continuity notes as visual source-of-truth context. Anchor images are not sent to OpenAI; they remain local reference assets.

## Prompt Checklist

- Cast/count: state exactly how many characters are visible and use character names from the shot or character bible. If only named characters should appear, say that only those named characters are visible and no extra people enter the frame.
- Setting/time: lock the location, time of day, lighting, and visual continuity. Avoid wording that lets the scene drift somewhere else.
- Camera/framing: specify shot type and camera behavior, such as wide shot, medium shot, close-up, static camera, slow dolly in, or gentle pan. Prefer static camera, no pan, no zoom, no cut when movement is not needed.
- Action timeline: keep the video prompt to a small continuous beginning, middle, and end action.
- Motion boundaries: include positive constraints inside the video prompt, such as stays in frame, remains seated, only small hand movement, expression changes gently, no one enters or exits, no sudden action, no jump cuts, no extra characters, and no identity drift.
- Production Bible: carry forward visual style, color palette, lighting, safety rules, camera language, and continuity rules.
- Negative prompt: keep it concise and focused on artifacts and safety. Do not rely only on the negative prompt for important behavior controls.

## Start And End Frames

Start frame prompts should describe the exact opening frame: character positions, pose, expression, setting, camera position, camera height, camera angle, framing, subject scale, lens feel / field of view, perspective, background layout, and lighting direction. End frame prompts should keep the same scene, same characters, same camera/background, same composition, and same location layout, allowing only one small clear change from the opening frame. Do not add new characters or props unless the shot explicitly requires them. Avoid radical recomposition, zoom jumps, new room geography, or a different side of the location.

Start/end interpolation checklist:

```text
- Same camera position?
- Same framing?
- Same subject scale?
- Same background geometry?
- Same lighting direction?
- Same characters only?
- Same props?
- Only a small end-state change?
```

## LoRA Caution

LoRAs can change motion, behavior, identity, and style even when the text prompt is strict. Test short clips first and compare the result against the Production Bible and character/location continuity notes.

## Recommended Workflow

1. Generate prompts.
2. Review start and end prompts side by side before generating images.
3. Confirm the same camera/framing/background and only one small end-state change.
4. Keep character count strict.
5. Keep motion simple.
6. Create the storyboard/reference still and exact start/end frames.
7. Test short clips first with the strict Wan motion prompt.
8. Create takes.
9. Approve the best take.
