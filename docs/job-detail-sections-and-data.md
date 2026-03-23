# 제작 아이템 상세(Job Detail) — 섹션별 정보 구성·조작 데이터

경로: `/jobs/[jobId]/[step]` (`step` ∈ `overview` | `ideation` | `scene` | `assets` | `publish` | `timeline`)

주 데이터 소스는 `getJobDraft` 결과(`JobDraftDetail`, `useContentJobDetailPageData`)이며, 일부 패널은 보조 쿼리(`useJobExecutionsQuery`, `useContentPublishDraftQuery`, `useSourceItemQuery` 등)를 둡니다.

---

## 공통 상단(모든 탭)

로딩 후 카드 영역에 다음이 **탭과 무관하게** 표시됩니다.

| 블록                                                     | 표시 정보                                                                                                                                                   | 조작                                        |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| **작업 헤더 메타** (`ContentJobDetailWorkHeaderMeta`)    | `job.status`, 파이프라인 단계 라벨, 목표 길이(`targetDurationSec`), 채널(`contentId` 링크 또는 미연결), 소재 연결 여부·링크, `updatedAt`, `resolution.note` | 읽기 전용                                   |
| **작업 헤더 액션** (`ContentJobDetailWorkHeaderActions`) | —                                                                                                                                                           | **제작 아이템 삭제** (`deleteJob` 뮤테이션) |
| **워크플로 바** (`ContentJobWorkflowBar`)                | 단계별 진행·완료·차단 상태, 다음 단계 안내                                                                                                                  | 클릭 시 해당 단계 URL로 이동(내비게이션)    |
| **준비 체크리스트** (`ContentJobReadinessChecklist`)     | 채널·소재·검수·카피·큐 등 칩                                                                                                                                | 링크로 관련 화면 이동                       |

`resolveJobWorkAction` / `dispatchJobWorkAction`으로 정의된 **추천 다음 작업**(토픽 플랜 실행, 씬 JSON, 에셋, 렌더, 검수 이동 등)은 `ContentJobDetailOverviewNextActionCard` 컴포넌트에 구현되어 있으나, 현재 `overview` 본문에는 **포함되지 않음**(동일 로직은 코드에 존재). 단계별 실행은 **각 탭의 버튼**으로 수행합니다.

`useContentJobDetailPageData`에는 `upload`(YouTube 업로드 URL 요청), `runPublishOrchestration` 등이 노출되나, **job detail 위젯 트리 안에서는 호출하는 UI가 없음**(검수함·스케줄 등 다른 화면에서 사용).

---

## 1. 개요 (`/overview`)

| 영역                                                 | 표시·파생 정보                                                                                       | 조작 가능 데이터 / API                                                                                                    |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **소재 연결** (`ContentJobDetailSourceLinkCard`)     | 채널 미연결 경고, `sourceItemId`로 조회한 소재 요약(`useSourceItemQuery`)                            | 채널이 있을 때: **소재 연결/변경** 모달 → 채널의 소재 목록에서 선택 후 **`setJobSourceItem`**. 소재 탐색으로 이동(링크만) |
| **최근 결과** (`ContentJobDetailOverviewRecentCard`) | `job.status`, `updatedAt`, 씬 수(sceneJson 또는 assets 길이), `uploadVideoId`, 실행 이력/검수함 링크 | 읽기 전용(내비게이션만)                                                                                                   |

---

## 2. 아이디어 (`/ideation`)

하위 탭 스트립: 아이디어 ↔ 씬 설계(라우트만 전환).

| 영역                                                                               | 표시·파생 정보                                                                               | 조작 가능 데이터 / API                                                                                                                                                                            |
| ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **토픽(시드)** (`ContentJobDetailSeedFormPanel`)                                   | `topicS3Key` 존재 여부 안내                                                                  | **필드**: `contentId`, `targetLanguage`, `titleIdea`, `targetDurationSec`, `stylePreset`, `creativeBrief`(기획 메모). **시드 저장** → `updateTopicSeed`. **토픽 플랜 다시 실행** → `runTopicPlan` |
| **단계 채택** (`ContentJobDetailStageApprovalWorkbench`, `stageType="TOPIC_PLAN"`) | 해당 단계의 `PipelineExecution` 목록, 선택 실행의 `inputSnapshotId`/`outputArtifactS3Key` 등 | 성공한 실행 선택 후 **이 실행을 채택** → `approvePipelineExecution` (잡 메타의 `approvedTopicExecutionId` 갱신)                                                                                   |

---

## 3. 씬 설계 (`/scene`)

| 영역                                                 | 표시·파생 정보                                                                                                   | 조작 가능 데이터 / API                                                                                                                                                                                                                        |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **실패 배너**                                        | 최근 `SCENE_JSON` 실행 중 `FAILED` 메시지(성공 이후면 접힘)                                                      | 읽기 전용                                                                                                                                                                                                                                     |
| **씬 설계 카드** (`ContentJobDetailSceneBuildPanel`) | 구조화 요약: `videoTitle`, `language`, 씬 수, 씬별 `durationSec`, 나레이션 on/off, 나레이션·이미지 프롬프트 요약 | **Scene JSON 생성** → `runSceneJson`. **저장(현재 JSON)** → `updateSceneJson` (문자열 전체). 테이블에서 **나레이션 없음** 체크 → 씬별 `disableNarration`. **자막 편집** → 씬별 `subtitle` 텍스트. 프리뷰: 씬별 에셋 URL(이미지/영상) 오버레이 |
| **고급 · Raw JSON**                                  | 동일 Scene JSON 텍스트                                                                                           | 자유 편집 후 위 **저장**으로 반영                                                                                                                                                                                                             |
| **단계 채택** (`stageType="SCENE_JSON"`)             | 토픽과 동일 패턴                                                                                                 | **채택** → `approvePipelineExecution` → `approvedSceneExecutionId`                                                                                                                                                                            |

---

## 4. 에셋 (`/assets`)

쿼리: `?view=scenes|byKind`, `?stage=image|voice|video`(byKind일 때). `stage`는 이미지/음성/영상 모달리티 구분.

| 영역                                                                   | 표시·파생 정보                                                                                                                                                              | 조작 가능 데이터 / API                                                                                                                                                                                                                   |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **뷰 모드**                                                            | 씬별 보기 / 종류별 보기(고급)                                                                                                                                               | URL만 변경                                                                                                                                                                                                                               |
| **단계 채택** (`stageType="ASSET_GENERATION"`)                         | 에셋 단계 실행 목록·상세                                                                                                                                                    | **채택** → `approvePipelineExecution` → `approvedAssetExecutionId`                                                                                                                                                                       |
| **실패 배너**                                                          | 최근 `ASSET_GENERATION` 실패 메시지                                                                                                                                         | 읽기 전용                                                                                                                                                                                                                                |
| **씬별 보기**                                                          |                                                                                                                                                                             |                                                                                                                                                                                                                                          |
| └ **에셋 준비** (`ContentJobDetailAssetsSummaryBar`)                   | 씬별 이미지·음성·영상 준비 개수, 마지막 에셋 실행 시각, 채택 executionId                                                                                                    | **이미지 모델**(provider) 선택·**이미지 일괄 생성**(`runAssetGeneration` modality `IMAGE`). **잡 기본 보이스** 선택·**음성 전체 생성**(`VOICE`). **영상 전체 생성**(`VIDEO`)                                                             |
| └ **씬별 카드** (`ContentJobDetailSceneAssetsList` / `SceneAssetCard`) | 씬별 이미지·음성·영상 상태, 후보 목록                                                                                                                                       | 씬 단위 **재생성**(`runAssetGeneration` + `targetSceneId` + modality + imageProvider). **이미지 후보 채택** `selectSceneImageCandidate`, **음성 후보 채택** `selectSceneVoiceCandidate`. 씬별 **보이스 프로필** `setSceneVoiceProfile`   |
| **종류별 보기**                                                        | 이미지/음성/영상 탭( BGM·SFX·자막은 비활성 플레이스홀더)                                                                                                                    | `ContentJobDetailAssetsView`: 스테이지별 일괄 생성 버튼, 잡 보이스·이미지 provider                                                                                                                                                       |
| **렌더·미리보기** (`ContentJobDetailRenderPreviewView`)                | 잡 상태, 씬 준비 비율, 이미지/음성/클립 준비 요약, 최근 `FINAL_COMPOSITION` 실행, `previewS3Key`/`finalVideoS3Key`/`thumbnailS3Key` 미리보기, BGM 목록·선택, 자막 번인 옵션 | **배경음악**: 파일 업로드(`requestAssetUpload` category `BACKGROUND_MUSIC` → S3 업로드) 후 `setJobBackgroundMusic`. 드롭다운으로 기존 BGM 선택. **한글 자막 번인** 체크 후 **최종 렌더 실행** `runFinalComposition({ burnInSubtitles })` |

---

## 5. 검수·출고 준비 (`/publish`)

앵커: `#cj-publish-review`, `#cj-publish-draft`, `#cj-publish-queue`.

| 영역                                          | 표시·파생 정보                                                                                                                   | 조작 가능 데이터 / API                                                                                                                                 |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **검수** (`ContentJobDetailRenderReviewView`) | 총 씬 수, `readyAssetCount`, `previewS3Key`/`finalVideoS3Key` 존재 여부에 따른 안내                                              | **작업 현황에서 검수하기** → `window.location` `/reviews`(읽기 전용 카피 + 내비)                                                                       |
| **발행 문구** (`ContentPublishDraftSection`)  | `useContentPublishDraftQuery`, 채널 연결 시 `usePlatformConnectionsQuery`, 첫 연결의 `usePlatformPublishProfileQuery`로 미리보기 | **글로벌 초안 필드**: `title`, `caption`, `description`, `hashtags`(공백·# 파싱), `thumbnailAssetId`. **발행 초안 저장** → `updateContentPublishDraft` |
| **출고 준비** (`ShippingPrepEnqueueCard`)     | 자동 공개 모드 라벨(`contentBrief.autoPublish` or `job.autoPublish`), `uploadStatus`, `uploadVideoId`                            | **채널 출고 큐에 추가** → `enqueueToChannelPublishQueue`(`contentId`, `jobId`). 큐/예약·발행 링크, 검수함 이동은 내비                                  |

---

## 6. 실행 이력 (`/timeline`)

| 영역                                               | 표시·파생 정보                                                                     | 조작 가능 데이터 / API   |
| -------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------ |
| **파이프라인 실행 이력** (`useJobExecutionsQuery`) | 단계(`stageType`), 상태, 입력 스냅샷 ID, 산출 S3 키, 소요 시간, 시각, 실행자, 오류 | 읽기 전용                |
| **원시 타임라인** (`useJobTimelineQuery`)          | Dynamo 행 `pk`/`sk`/`data` JSON                                                    | 읽기 전용(펼치기 토글만) |

---

## 부록: 탭별 주요 GraphQL/뮤테이션 매핑

| 사용자 의도           | 뮤테이션·동작(대표)                                      |
| --------------------- | -------------------------------------------------------- |
| 토픽 시드 수정        | `updateTopicSeed`                                        |
| 토픽 플랜 실행        | `runTopicPlan`                                           |
| Scene JSON 생성       | `runSceneJson`                                           |
| Scene JSON 편집 저장  | `updateSceneJson`                                        |
| 단계 실행 채택        | `approvePipelineExecution`                               |
| 에셋 생성             | `runAssetGeneration`                                     |
| 이미지/음성 후보 선택 | `selectSceneImageCandidate`, `selectSceneVoiceCandidate` |
| 보이스 프로필         | `setJobDefaultVoiceProfile`, `setSceneVoiceProfile`      |
| BGM 업로드·선택       | `requestAssetUpload` + `setJobBackgroundMusic`           |
| 최종 렌더             | `runFinalComposition`                                    |
| 발행 초안             | `updateContentPublishDraft`                              |
| 출고 큐               | `enqueueToChannelPublishQueue`                           |
| 소재 연결             | `setJobSourceItem`                                       |
| 잡 삭제               | `deleteJob`                                              |

---

_구현은 `apps/admin-web/src/widgets/content-job-detail`, `apps/admin-web/src/features/content-job-detail` 기준. 스키마 필드는 `packages/graphql`의 `JobDraft`·관련 타입을 따른다._
