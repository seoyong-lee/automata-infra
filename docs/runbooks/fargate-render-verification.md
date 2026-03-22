# Fargate Render Verification

## Automated checks

- Run `yarn build` to verify the TypeScript/CDK code compiles.
- Run `yarn test:fargate-render` to verify the render plan contract exposes FFmpeg defaults, subtitle style metadata, and voice-driven scene extension.

## Staging smoke test

1. Deploy with `enableFargateComposition` enabled in `env/config.json`.
2. Trigger final composition for a short draft job that already has scene videos, voices, and optional background music.
3. Confirm the ECS task reaches `STOPPED` with exit code `0`.
4. Confirm these artifacts exist in S3:
   - `rendered/<jobId>/final.mp4`
   - `previews/<jobId>/preview.mp4`
   - `rendered/<jobId>/thumbnail.jpg`
   - `logs/<jobId>/composition/fargate-result.json`

## Output comparison checklist

- Subtitle burn-in is visible for Korean text and stays centered with the configured black fill and white stroke.
- Scene audio is not truncated even when narration exceeds the original planned duration.
- `0.5s` scene gaps are preserved between scene segments.
- Background music is mixed beneath narration and fades out near the end.
- Preview and thumbnail are generated from the rendered output.

## Rollout guidance

- Keep `enableFargateComposition` disabled in production until at least one staging job has been compared against the Shotstack path.
- When validating parity, use the same job once with Shotstack and once with Fargate, then compare subtitle placement, total runtime, narration continuity, and BGM mix level.
