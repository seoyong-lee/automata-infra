# 프로젝트 개괄 설계·현황 (채널 중심 발행 / 멀티 플랫폼)

> **목적**: 현재 코드베이스에 구현된 **채널(Content)·제작(Job)·소재(Source)·플랫폼 연결·발행 초안·출고 큐·오케스트레이션** 흐름을 한 문서로 정리한다.  
> **범위**: `lib/modules/publish`, `services/shared/lib/store`, `services/admin/graphql`, `services/publish`, Admin Web(`apps/admin-web`), 공용 GraphQL 클라이언트(`packages/graphql`).  
> **관련 참고**: 세부 제품 방향은 `docs/plans/youtube-channel-metadata-publish-queue-revision.md` 등과 함께 읽는다.

---

## 1. 아키텍처 한눈에

| 층                     | 역할                                                        | 주요 위치                                                                                                                                        |
| ---------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **계약**               | Zod 스키마 = 도메인·API 검증의 단일 기준                    | `lib/modules/publish/contracts/publish-domain.ts`                                                                                                |
| **GraphQL (Admin)**    | AppSync + Cognito, 필드별 Lambda 리졸버                     | `lib/modules/publish/graphql/schema.graphql`, `lib/modules/publish/graphql-api.ts`                                                               |
| **발행 도메인 라우터** | Query/Mutation 다수를 **하나의 Lambda**에서 필드명으로 분기 | `services/admin/graphql/publish-domain-router/`                                                                                                  |
| **저장소**             | 단일 DynamoDB 테이블(작업/채널 PK·SK 패턴)                  | `services/shared/lib/store/*.ts`                                                                                                                 |
| **오케스트레이션**     | YouTube 업로드 완료 처리 + 타깃 상태 갱신                   | `services/admin/graphql/publish-domain-router/usecase/run-publish-orchestration.ts`, `services/publish/upload-worker/usecase/complete-upload.ts` |
| **Admin UI**           | Next.js 앱, React Query + `@packages/graphql`               | `apps/admin-web`                                                                                                                                 |

---

## 2. 개념 모델 (도메인)

### 2.1 용어 정리

- **채널 (Content / `contentId`)**: 운영 라인. GraphQL의 `Content`, Dynamo의 Content 메타와 대응.
- **제작 아이템 (Job / `jobId`)**: 파이프라인 단위 작업. `AdminJob`, `JobDraftDetail`의 중심.
- **채널 콘텐츠 아이템 (`channelContentItemId`)**: 채널 관점의 “한 편”. **현재 마이그레이션 단계에서는 `jobId`와 동일하게 쓰는 경로가 있음** (스키마·주석·스토어 주석 참고).
- **소재 (SourceItem)**: 채널에 연결 가능한 기획 단위(주제·훅 등). Job이 **어떤 소재에 기대는지** `JobMeta.sourceItemId`로 연결.
- **플랫폼 연결 (PlatformConnection)**: 채널이 외부 계정(YouTube/TikTok/Instagram)으로 어떻게 붙는지.
  - **저장소 기반 연결** + **Content 메타에서 파생한 synthetic YouTube**가 합쳐져 노출됨 (`listMergedPlatformConnectionsForChannel`).
- **게시 프로필 (PlatformPublishProfile)**: 연결·채널 단위 기본 정책(가시성, 해시태그, YouTube 카테고리 등).
- **발행 초안 (ContentPublishDraft)**: Job(또는 channelContentItem) 단위로 덮어쓰는 제목·캡션·플랫폼별 메타.
- **발행 타깃 (PublishTarget)**: “이 Job을 이 플랫폼 연결로 어떻게 내보낼지” 상태. 출고 큐 enqueue 시 기본 생성·치환.
- **채널 출고 큐 (Channel publish queue)**: 채널별 대기 행. `publishTargets`를 embed.

### 2.2 책임 분리 (UX 기준, 구현과 정합)

| 행위                    | 성격          | UI 배치 (현 구현)                                                                                    |
| ----------------------- | ------------- | ---------------------------------------------------------------------------------------------------- |
| 소재 생성·Job–소재 연결 | 제작 워크벤치 | 제작 아이템 허브 `새 소재 만들기`, Job 상세 **개요** `소재 연결`                                     |
| 플랫폼 계정·기본 정책   | 채널 운영     | 채널 상세 `매체 연결` (`/content/[id]/connections`) — 프로필은 GraphQL/API 있음, 전용 탭 UI는 미구현 |
| 영상별 게시 문구        | 출고 준비     | Job 상세 **렌더/출고 준비** 탭 `발행 초안` + 기존 큐·업로드·오케스트레이션                           |

---

## 3. 계약 레이어 (Zod)

**파일**: `lib/modules/publish/contracts/publish-domain.ts`

| 스키마                              | 설명                                                             |
| ----------------------------------- | ---------------------------------------------------------------- |
| `publishPlatformSchema`             | `YOUTUBE` \| `TIKTOK` \| `INSTAGRAM`                             |
| `platformConnectionStatusSchema`    | 연결 수명주기                                                    |
| `publishTargetStatusSchema`         | `QUEUED` → `PUBLISHED` / `FAILED` / `SKIPPED` 등                 |
| `sourceItemSchema`                  | 소재 본문 + `IDEATING` \| `READY_FOR_DISTRIBUTION` \| `ARCHIVED` |
| `platformConnectionSchema`          | 외부 계정 식별자·핸들·OAuth id                                   |
| `publishTargetSchema`               | 타깃별 외부 포스트 ID·URL·에러                                   |
| `platformPublishProfileSchema`      | 채널·연결 단위 기본값 + 플랫폼별 중첩 필드                       |
| `contentPublishDraftSchema`         | `globalDraft` + `platformDrafts[]` (`metadata`는 구조화 객체)    |
| `persistedPlatformConnectionSchema` | Dynamo에 저장되는 연결 행                                        |

**원칙**: 런타임에서 JSON/API 경계를 넘을 때는 이 스키마를 `parse`하여 형태를 고정한다. Admin GraphQL 라우터의 `updatePlatformPublishProfile`, `updateContentPublishDraft` 등이 이를 따른다.

---

## 4. 저장소 (DynamoDB 패턴)

단일 **Jobs 테이블**을 전제로, `PK`/`SK` 규칙으로 엔티티를 구분한다. (구체 키는 각 `*-store.ts` 참고.)

| 모듈              | 파일                                                                                                            | 내용                                                                            |
| ----------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Job 메타          | `video-jobs.ts`                                                                                                 | `jobPk(jobId)`, `JobMetaItem`에 `contentId`, **`sourceItemId`**, 업로드 필드 등 |
| 소재              | `source-items.ts`                                                                                               | `SOURCE#` + `META`, 채널 링크 `SOURCE_LINK#`                                    |
| 플랫폼 연결(영속) | `platform-connection-records.ts`                                                                                | `PLAT_CONN#`, `upsert` 시 UUID 발급 가능                                        |
| 플랫폼 연결(노출) | `platform-connections.ts`                                                                                       | synthetic + persisted **머지**, `buildDefaultPublishTargetsForJob`              |
| 게시 프로필       | `publish-profile-store.ts`                                                                                      | `PUBLISH_PROFILE#`                                                              |
| 발행 초안         | `publish-draft-store.ts`                                                                                        | Job PK + `PUBLISH_DRAFT` SK, `channelContentItemId`로 파싱                      |
| Job별 타깃        | `publish-targets-job.ts`                                                                                        | Job 하위 타깃 목록 치환·갱신                                                    |
| 출고 큐           | `channel-publish-queue.ts`                                                                                      | `PUBLISH_QUEUE#`, enqueue 시 타깃 빌드·`replacePublishTargetsForJob`            |
| 에이전트·발굴     | `idea-candidates.ts`, `trend-signals.ts`, `agent-runs.ts`, `performance-insights.ts`, `channel-agent-config.ts` | 아이디어 후보·트렌드 시그널·에이전트 실행 로그·성과 인사이트·Scout/자동화 설정  |
| 히트 채널(M2.5)   | `channel-watchlist.ts`, `channel-signals.ts`, `channel-score-snapshots.ts`                                      | 외부 채널 워치리스트·수집 시그널·점수 스냅샷 시계열                             |

---

## 5. Admin GraphQL API

### 5.1 스키마

- **파일**: `lib/modules/publish/graphql/schema.graphql`
- **인증**: User Pool (CDK `createPublishGraphqlApi`).

### 5.2 리졸버 배치

- **파일**: `lib/modules/publish/graphql-api.ts`
- 대부분의 필드는 **필드당 Lambda**이나, **발행 도메인**은 아래 한 Lambda에 집중된다.

### 5.3 Publish Domain Router (단일 Lambda)

- **엔트리**: `services/admin/graphql/publish-domain-router/handler.ts` → `index.ts` `run`
- **라우팅**: `services/admin/graphql/publish-domain-router/route-publish-domain.ts`
  - `fieldName`으로 핸들러 맵 디스패치 (ESLint 한도에 맞게 분리됨)
- **필드 (요약)**:

| 구분     | 필드명                                                                                                                                                                                                   |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Query    | 위 필드 + `ideaCandidatesForChannel`, `trendSignalsForChannel`, `agentRunsForChannel`, `performanceInsightsForJob`, `channelAgentConfig`, `channelWatchlist`, `latestChannelScoreSnapshotsForChannel` 등 |
| Mutation | 위 mutation + `promoteIdeaCandidateToSource`, `rejectIdeaCandidate`, `updateChannelAgentConfig`, `createChannelWatchlistEntry`, `updateChannelWatchlistEntry` 등                                         |

- **`updateContentPublishDraft`**: 입력 `draft`는 GraphQL `AWSJSON`으로 올 수 있어, 서버에서 **문자열이면 JSON.parse** 후 Zod 검증 (`parseContentPublishDraftInput`).

### 5.4 기타 발행 관련 (별도 Lambda)

- `channelPublishQueue`, `enqueueToChannelPublishQueue`
- `platformConnections` (목록은 merge 로직 사용)

---

## 6. CDK / 런타임 권한 (`PublishStack`)

- **파일**: `lib/publish-stack.ts`
- `publishDomainResolver` (`AdminPublishDomainResolverLambda`):
  - **엔트리**: `services/admin/graphql/publish-domain-router/handler.ts`
  - Jobs 테이블 **읽기/쓰기**, **Assets 버킷 읽기**, **Secrets Manager** (업로드 완료 경로 등) — `completeUpload`와 정합.
  - 번들이 커서 **메모리 상향(예: 1536MB)**; 채널별 아이디어/트렌드/에이전트 런 목록은 Dynamo **`BatchGetItem`** 경로로 조회(타임아웃 완화).
- **에이전트(스케줄은 별도)**: `trend-scout-jobs` / `channel-evaluation-jobs` SQS + 각 `services/agents/*` Lambda + 공유 DLQ. 나머지 에이전트 큐는 문서 [`cursor-handoff-agent-publish-integration.md`](./cursor-handoff-agent-publish-integration.md) 기준 **미구성**.

---

## 7. 오케스트레이션 (`runPublishOrchestration`)

**파일**: `services/admin/graphql/publish-domain-router/usecase/run-publish-orchestration.ts`

1. Job·`contentId` 존재 검증.
2. Job별 `PublishTarget` 목록 조회; 없으면 `buildDefaultPublishTargetsForJob`로 생성 후 저장.
3. **YouTube + `QUEUED`**: `PUBLISHING` → `completeUpload(jobId)` → 성공 시 `PUBLISHED` + `watch` URL, 실패 시 `FAILED` + 메시지.
4. **그 외 플랫폼 + `QUEUED`**: 어댑터 미구현으로 **`SKIPPED`** + 고정 메시지.

→ **현재 실제 업로드 연동은 YouTube 경로 중심**이며, 타 플랫폼은 자리만 잡힌 상태다.

---

## 8. Admin Web — 화면·라우트·API 매핑

### 8.1 공용 클라이언트

- **파일**: `packages/graphql/src/admin.ts`
- React Query 훅: `jobDraft`, `channelPublishQueue`, `platformConnections`, `contentPublishDraft`, `publishTargetsForJob`, 발행 도메인 뮤테이션/쿼리(`createSourceItem`, `setJobSourceItem`, `updateContentPublishDraft`, `upsertPlatformConnection`, `sourceItemsForChannel`, …) 및 **에이전트 관련** `useIdeaCandidatesForChannelQuery`, `useChannelWatchlistQuery`, `useLatestChannelScoreSnapshotsForChannelQuery` 등.

### 8.2 주요 라우트

| 경로                                               | 내용                                                                                                                                       |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `/jobs`                                            | 제작 아이템 허브 — **새 소재 만들기** (`createSourceItem`)                                                                                 |
| `/jobs/[jobId]/overview`                           | **소재 연결** 카드 (`sourceItemsForChannel`, `setJobSourceItem`, `createSourceItem`)                                                       |
| `/jobs/[jobId]/publish`                            | **발행 초안** + 렌더/검수 + 출고 준비(큐·업로드·오케스트레이션)                                                                            |
| `/content/[contentId]/connections`                 | **매체 연결** (`platformConnections`, `upsertPlatformConnection`)                                                                          |
| `/discovery`                                       | **전역** 발굴·벤치마크 (`_pages/discovery`); `channel`은 운영 라인 필터. 외부 벤치마크는 채널 종속 1차 개념이 아님 (`cursor-handoff` §7.1) |
| `/content/[contentId]/jobs`, `/queue`, `/schedule` | 채널 하위; 서브내비에 **발굴·벤치마크 →** 링크로 `/discovery?channel=` 진입                                                                |

### 8.3 UI 컴포넌트 (발행 도메인 관련)

| 컴포넌트                                                                | 역할                                   |
| ----------------------------------------------------------------------- | -------------------------------------- |
| `widgets/create-source-item/create-source-item-dialog.tsx`              | 허브에서 소재 생성                     |
| `widgets/content-job-detail/ui/content-job-detail-source-link-card.tsx` | 개요 탭 소재 연결·모달                 |
| `widgets/content-job-detail/ui/content-publish-draft-section.tsx`       | 출고 탭 초안 편집·채널/프로필 미리보기 |
| `widgets/content-job-detail/ui/content-job-detail-shipping-prep-*.tsx`  | 큐·업로드·오케스트레이션               |
| `_pages/content/ui/channel-connections-page.tsx`                        | 채널 매체 연결                         |
| `_pages/discovery/ui/discovery-page.tsx`                                | 발굴·벤치마크(전역, `?channel=` )      |
| `widgets/idea-candidates/`, `widgets/hit-channels/`                     | 채널별 패널                            |
| `shared/ui/simple-modal.tsx`                                            | 경량 모달                              |

---

## 9. 데이터 흐름 (대표 시나리오)

### 9.1 소재 생성 → Job에 연결

1. 허브 또는 Job 모달에서 `createSourceItem` → Dynamo 소재 + 채널 링크.
2. Job 개요에서 `setJobSourceItem` → `JobMeta.sourceItemId` 갱신.
3. `jobDraft` 쿼리 무효화로 UI 동기화.

### 9.2 출고 준비

1. `contentPublishDraft` 조회/없으면 저장 시 생성 (`updateContentPublishDraft`).
2. `enqueueToChannelPublishQueue` → 큐 행 + `buildDefaultPublishTargetsForJob`로 타깃 반영.
3. 업로드 요청·워커 후 `runPublishOrchestration`으로 YouTube 타깃 확정(그 외 플랫폼은 SKIPPED).

### 9.3 채널 매체 연결

1. `platformConnections`: synthetic YouTube + 저장 연결 merge.
2. `upsertPlatformConnection`: Dynamo `PLAT_CONN#`에 영속(동일 플랫폼은 새 연결이 synthetic을 덮어쓸 수 있음 — `listMergedPlatformConnectionsForChannel` 주석 참고).

---

## 10. 구현 상태 요약

| 영역                       | 상태                                                                                                                                                                                      |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Zod 계약                   | ✅ 핵심 타입 정의됨                                                                                                                                                                       |
| SourceItem CRUD·Job 연결   | ✅ API + 주요 UI                                                                                                                                                                          |
| PlatformConnection·Profile | ✅ API + 연결 UI; **게시 프로필 전용 화면**은 미구현                                                                                                                                      |
| ContentPublishDraft        | ✅ API + 글로벌 필드 편집; **플랫폼별 탭·검증 UI**는 제한적                                                                                                                               |
| PublishTarget·Queue        | ✅ 저장·enqueue·목록                                                                                                                                                                      |
| Orchestration              | ✅ YouTube 중심; 타 플랫폼 어댑터 없음                                                                                                                                                    |
| 에이전트 계층 (발굴·평가)  | ✅ 계약·스토어·GraphQL·UI 일부; **Scout/채널 평가 본 로직·스케줄·게이트**는 [`cursor-handoff-agent-publish-integration.md`](./cursor-handoff-agent-publish-integration.md) 기준 부분 구현 |
| OAuth / 실연동 UX          | ❌ 수동 식별자 입력 수준(문서상 후속)                                                                                                                                                     |

---

## 11. 알려진 제약·후속 과제

1. **`channelContentItemId` vs `jobId`**: 스키마상 분리되어 있으나 저장소·주석상 동일 취급 구간이 있다. 완전 분리 시 마이그레이션·리졸버·UI 일괄 점검 필요.
2. **타 플랫폼 발행**: 오케스트레이션에서 `SKIPPED` 처리 — 실제 API 연동·시크릿·웹훅은 미구현.
3. **게시 프로필 UI**: `updatePlatformPublishProfile`·조회는 있으나 채널 내 전용 편집 탭은 없음.
4. **발행 초안**: UI는 글로벌 중심; 계약상 `platformDrafts[].metadata`는 서버에서 유지하며 편집기는 확장 여지.
5. **소재 허브**: 전역 메뉴 `소재`는 미추가; 허브 버튼 + Job 모달로 시작하는 구조.

---

## 12. 파일 인덱스 (빠른 탐색)

| 구분                     | 경로                                                                                                                              |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| GraphQL 스키마           | `lib/modules/publish/graphql/schema.graphql`                                                                                      |
| AppSync 리졸버 등록      | `lib/modules/publish/graphql-api.ts`                                                                                              |
| 발행 도메인 라우터       | `services/admin/graphql/publish-domain-router/`                                                                                   |
| 오케스트레이션           | `services/admin/graphql/publish-domain-router/usecase/run-publish-orchestration.ts`                                               |
| 계약                     | `lib/modules/publish/contracts/publish-domain.ts`                                                                                 |
| 스토어                   | `services/shared/lib/store/`                                                                                                      |
| CDK                      | `lib/publish-stack.ts`                                                                                                            |
| Admin GraphQL 클라이언트 | `packages/graphql/src/admin.ts`                                                                                                   |
| Admin UI (발행)          | `apps/admin-web/src/widgets/content-job-detail/`, `widgets/create-source-item/`, `_pages/content/ui/channel-connections-page.tsx` |

---

_문서 버전: 구현 기준 스냅샷. 스키마·CDK·UI·에이전트 계층이 바뀌면 이 문서의 §4–§8·§10을 우선 갱신하는 것을 권장한다._
