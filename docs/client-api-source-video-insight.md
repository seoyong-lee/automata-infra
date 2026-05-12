# Client API — Source video insight → Scene JSON

이 문서는 **Admin GraphQL** 기준으로, 소스 영상에서 프레임을 뽑고 Vision으로 캡션을 붙인 뒤 **Scene JSON**까지 생성하는 흐름을 클라이언트에 연동할 때 쓴다.

스키마 원본: 서버 레포 `lib/modules/publish/graphql/schema.graphql`

---

## 전제 조건

1. **인증**: Admin Cognito User Pool JWT (기존 Admin API와 동일).
2. **잡 플랜**: `runSourceVideoSceneJson`은 내부적으로 **승인된 잡 플랜**이 있어야 한다 (`loadSceneJsonBuildInput` = 기존 `runSceneJson`과 동일). 플랜 없으면 에러.
3. **소스 영상**  
   - `runSourceVideoFrameExtract`에서 `sourceVideoS3Key`를 생략하면 **`masterVideoS3Key`** 사용.  
   - 마스터 영상이 없으면 `setJobMasterVideo`로 `assets/{jobId}/master/…` 키를 먼저 설정하거나, 추출 입력에 `sourceVideoS3Key`를 넣는다.

---

## 권장 UX 플로우

```
setJobMasterVideo (선택) → runJobPlan + 승인 (기존) → runSourceVideoFrameExtract → runSourceVideoSceneJson → (기존) runAssetGeneration / runFinalComposition
```

소스 비디오 인사이트는 **기존 JOB_PLAN → SCENE_JSON 파이프라인과 별도 뮤테이션**이지만, `runSourceVideoSceneJson` 성공 시 잡의 **`sceneJsonS3Key` / `status`**는 일반 씬 JSON 생성과 같이 갱신된다.

---

## 1. `runSourceVideoFrameExtract`

Fargate에서 ffmpeg로 JPEG를 뽑아 S3에 올리고, 메타 JSON을 남긴다.

**Mutation**

```graphql
mutation RunSourceVideoFrameExtract($input: RunSourceVideoFrameExtractInput!) {
  runSourceVideoFrameExtract(input: $input) {
    jobId
    sourceVideoS3Key
    extractionStrategy
    sampleIntervalSec
    maxFrames
    cutTimesSec
    insightResultS3Key
    extractedAt
    provider
    frames {
      offsetSec
      imageS3Key
    }
  }
}
```

**Variables 예시**

```json
{
  "input": {
    "jobId": "job_xxx",
    "extractionStrategy": "SCENE_CUT",
    "maxFrames": 12,
    "sampleIntervalSec": 2,
    "sceneThreshold": 0.35,
    "minSceneGapSec": 0.4
  }
}
```

| 필드 | 설명 |
|------|------|
| `jobId` | 필수 |
| `sourceVideoS3Key` | 생략 시 `masterVideoS3Key` |
| `extractionStrategy` | `UNIFORM` \| `SCENE_CUT` (장면 전환 감지 후 샘플) |
| `sampleIntervalSec` | UNIFORM 간격 / SCENE_CUT 폴백·보강에 사용 |
| `maxFrames` | 상한 (기본 12, 최대 48) |
| `sceneThreshold` | SCENE_CUT 전용 (약 0.12–0.85) |
| `minSceneGapSec` | SCENE_CUT 인접 컷 병합(초) |

**응답**

- `insightResultS3Key`: 보통 `logs/{jobId}/source-video-insight/frame-extract-result.json`
- `frames[]`: `offsetSec`, `imageS3Key` (버킷 내 JPEG)

---

## 2. `runSourceVideoSceneJson`

추출 결과 JSON + 잡 플랜으로 **Vision(선택) → 기존 scene-json LLM**으로 씬 JSON 생성·저장.

**Mutation**

```graphql
mutation RunSourceVideoSceneJson($input: RunSourceVideoSceneJsonInput!) {
  runSourceVideoSceneJson(input: $input) {
    jobId
    status
    sceneJsonS3Key
    videoTitle
    language
    targetDurationSec
  }
}
```

**Variables 예시**

```json
{
  "input": {
    "jobId": "job_xxx",
    "visionProvider": "AUTO",
    "skipVision": false,
    "retainFrameJpegs": false
  }
}
```

| 필드 | 설명 |
|------|------|
| `insightResultS3Key` | 생략 시 `logs/{jobId}/source-video-insight/frame-extract-result.json` |
| `skipVision` | `true`면 메타만 LLM에 넣고 이미지 Vision 호출 안 함 |
| `retainFrameJpegs` | `false`(기본): 성공 후 **샘플 JPEG만 S3에서 삭제**, manifest JSON은 `offset`만 + `frameJpegsPurgedAt` 갱신 |
| `visionProvider` | `AUTO` \| `GEMINI` \| `BEDROCK` |

### Vision 백엔드 (비용)

- **AUTO** (기본): Lambda에 `GEMINI_VISION_SECRET_ID`가 있으면 **Gemini 2.5 Flash-Lite**, 없으면 **Bedrock**(씬 JSON에 쓰는 Bedrock 멀티모달).
- **GEMINI**: 강제 Gemini (시크릿 없으면 사용자 입력 에러).
- **BEDROCK**: 강제 Bedrock.

서버 기본 시크릿 이름: **`automata-studio/gemini-vision`** (Secrets Manager JSON: `{ "apiKey": "…", "model": "gemini-2.5-flash-lite" }` — `model` 생략 가능).

---

## 3. 관련 기존 API

| 목적 | Mutation / Query |
|------|------------------|
| 마스터 영상 키 설정 | `setJobMasterVideo(input: { jobId, s3Key })` → `JobDraftDetail` |
| 플랜 생성·승인 | 기존 `runJobPlan`, `approvePipelineExecution` 등 |
| 씬 JSON 수동 편집 | `updateSceneJson` |
| 잡 상태 조회 | `adminJob(jobId)`, `jobDraft(jobId)` |

---

## 4. 클라이언트 구현 체크리스트

- [ ] 추출 전 `masterVideoS3Key` 또는 `sourceVideoS3Key` 확보.
- [ ] `runSourceVideoFrameExtract` 완료까지 **동기 대기** 또는 폴링 (Fargate라 수초~수분).
- [ ] `runSourceVideoSceneJson` 전 **잡 플랜 승인** 여부 확인.
- [ ] 성공 후 `sceneJsonS3Key`로 기존 에디터/미리보기 연동.
- [ ] `retainFrameJpegs: false`면 `frames[].imageS3Key`는 이후 무효일 수 있음 → 재 Vision 시 **`runSourceVideoFrameExtract` 재실행**.

---

## 5. 에러 / 엣지 케이스 (UX 메시지용)

| 상황 | 대응 |
|------|------|
| 플랜 없음 | `runJobPlan` + 승인 후 재시도 |
| 마스터/소스 영상 없음 | `setJobMasterVideo` 또는 `sourceVideoS3Key` 지정 |
| 이미 JPEG 퍼진 뒤 `skipVision: false` | `badUserInput` 유사 — `skipVision: true` 또는 프레임 재추출 |
| Gemini 강제인데 시크릿 없음 | `visionProvider: BEDROCK` 또는 시크릿 구성 |

---

## 6. TypeScript 클라이언트 스케치 (Apollo 등)

```ts
// 필드명은 서버 schema.graphql 과 1:1 맞출 것

export type SourceVideoFrameExtractionStrategy = "UNIFORM" | "SCENE_CUT";
export type SourceVideoVisionProvider = "AUTO" | "GEMINI" | "BEDROCK";

export interface RunSourceVideoFrameExtractInput {
  jobId: string;
  sourceVideoS3Key?: string | null;
  sampleIntervalSec?: number | null;
  maxFrames?: number | null;
  extractionStrategy?: SourceVideoFrameExtractionStrategy | null;
  sceneThreshold?: number | null;
  minSceneGapSec?: number | null;
}

export interface RunSourceVideoSceneJsonInput {
  jobId: string;
  insightResultS3Key?: string | null;
  skipVision?: boolean | null;
  retainFrameJpegs?: boolean | null;
  visionProvider?: SourceVideoVisionProvider | null;
}
```

Codegen 사용 시 위 타입은 **`schema.graphql` 기준 codegen 출력**으로 대체하는 것을 권장한다.

---

## 7. 서버 측 S3 경로 요약 (디버깅)

| 경로 | 내용 |
|------|------|
| `jobs/{jobId}/source-video-insight/frames/*.jpg` | 추출 JPEG (`runSourceVideoSceneJson` 기본 정리 시 삭제) |
| `logs/{jobId}/source-video-insight/frame-extract-result.json` | 추출 메타 (퍼지 후 offset-only + `frameJpegsPurgedAt`) |
| `logs/{jobId}/source-video-insight/vision-captions-for-scene-json.json` | Vision 캡션 요약 로그 |
| `logs/{jobId}/provider/gemini-vision-*.json` | Gemini 호출 요약 |
| `logs/{jobId}/provider/bedrock-vision-*.json` | Bedrock Vision 호출 요약 |

---

*이 파일은 클라이언트 레포 Cursor에 그대로 붙여 넣거나, `docs`만 복사해 두고 codegen/Apollo 링크를 프로젝트에 맞게 수정하면 된다.*
