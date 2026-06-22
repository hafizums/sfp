# GPT Image Prompting Guide

GPT image prompts serve a different job than Wan video prompts. Still-image prompts should lock visible design, continuity, composition, and frame-specific details before any external image-to-video test.

## Prompt Field Differences

- `image_prompt`: storyboard/reference still. Use it to judge visual subject, composition, character consistency, location identity, lighting, color palette, camera framing, and Production Bible style. It does not need to be the exact first frame.
- `start_frame_prompt`: exact first frame. Use it to generate the opening image for image-to-video with exact positions, pose, expression, hands, props, camera/framing, lighting, and location.
- `end_frame_prompt`: exact final frame. Use the same characters, setting, camera position, framing, subject scale, background layout, perspective, and lighting direction, with one small deliberate visual change from the start frame.
- `video_prompt`: Wan motion prompt. Use it for the simple continuous action between the start and end images.

## Start/End Interpolation Lock

Start/end image-to-video fails easily when the two stills describe a slightly different background, camera angle, lens feel, subject scale, or room geography. Treat the start and end prompts as one locked camera setup. The start frame is the exact first frame and should be fully stable, unambiguous, and free of unnecessary motion language. The end frame is the exact final frame in the same shot with the same camera and background, plus only one small visible state change.

Use explicit wording such as same camera position, same framing, same background, same composition, same location layout, same perspective, and same scene continuity. If the shot calls for camera movement, keep the end frame a subtle continuation of that move rather than a new composition.

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

## GPT Image Checklist

- Exact visible subject and character count.
- Named characters from the shot or character bible.
- Character face shape, age, hairstyle, outfit, and key props.
- Locked location identity and geography from the location bible.
- Camera framing, angle, composition, and aspect ratio.
- Lighting direction, color palette, and Production Bible style.
- Concrete safe age 4+ mood.
- No text, no logo, no watermark, no subtitles, no UI.
- No extra characters, duplicate characters, identity drift, distorted hands, or distorted faces.

## Character Anchor Tips

Write character anchors as visible facts: face shape, age, hairstyle, outfit, and signature props. Prefer "Mia, one 7-year-old child with short curls, round glasses, yellow raincoat, and red boots" over a vague label like "the hero girl."

When a character anchor is locked in the app, prompt generation treats the anchor filename plus face identity, outfit, palette, prop, and review notes as source-of-truth continuity context. The image file itself is not sent to OpenAI.

## Location Anchor Tips

Lock the location with visible geography, lighting, and palette. Prefer "the same cozy backyard treehouse interior, tiny glowing door on the north wall, warm afternoon light from frame left" over "magical treehouse."

When a location anchor is locked in the app, prompt generation uses the anchor filename plus layout, lighting, palette, geography, and review notes to keep the location stable. The image binary and local file path stay local.

## Storyboard/Reference Still Tips

Use `image_prompt` for a polished 16:9 cinematic still frame that shows the intended shot composition. Choose one frozen visual moment from the action and describe the camera angle, foreground/background, character placement, and style after the core composition.

## Start-Frame Tips

The start frame should be exact and stable. Describe where every named character is, their pose, expression, hand placement, prop placement, camera position, camera height, camera angle, framing, subject scale, lens feel / field of view, background layout, perspective, lighting, and location. Avoid motion verbs unless they describe a frozen pose.

## End-Frame Tips

The end frame should preserve the same scene, same camera, same background, same composition, same location layout, and same named characters. Change only one planned visual element: a lifted map, a warmer smile, a door now slightly open, or a character now holding an existing prop. Avoid new characters, new locations, surprise prop changes, zoomed-in framing after a wide start, different geography, or radical re-composition unless the shot explicitly requires it.

## Continuity Checklist

- Face shape, age, hairstyle, outfit, and key props stay consistent.
- Location geography and lighting direction stay consistent.
- Camera language follows the Production Bible.
- Color palette and style match the locked bible.
- Start and end frames differ by one clear, deliberate visual change.
- Camera movement, when present, remains subtle and interpolation-safe.
- Locked character and location anchors are reviewed before prompt generation.

## Example

Shot: Mia finds a glowing map in the treehouse.

`image_prompt`: 16:9 cinematic still frame, one visible character: Mia, a 7-year-old child with short curls, round glasses, yellow raincoat, and red boots, standing inside the same cozy backyard treehouse. She holds one hand near a small glowing map on a wooden table, soft smile, eyes focused on the map. Medium wide shot from doorway height, map table in foreground, tiny glowing door on the north wall, warm afternoon light from frame left, leaf green and amber palette, soft paper diorama style, age 4+ safe wonder, no text, no logo, no watermark, no subtitles, no UI.

`start_frame_prompt`: Exact first frame, same one character Mia in the same treehouse, standing beside the wooden table with both hands relaxed at her sides, soft curious expression, glowing folded map lying closed on the table, medium wide static camera from doorway height, warm afternoon light from frame left, no new elements, no extra people, no text.

`end_frame_prompt`: Exact final frame, same one character Mia in the same treehouse and same medium wide static camera. Mia now gently holds the unfolded glowing map with both hands at chest height, soft smile, eyes on the map. The table, tiny glowing door, warm frame-left light, and leaf green and amber palette remain unchanged. No extra characters, no new location, no surprise props, no text.
