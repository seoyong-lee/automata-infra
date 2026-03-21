# 최근 작업 요약 (Admin 파이프라인·UI·목록 API)

본 문서는 **외부 검토용 개요**(`implementation-overview-external-review.md`)와 별도로, **최근에 코드에 반영된 변경**을 한곳에 모은 스냅샷이다. 세부는 GraphQL 스키마·CDK·해당 경로 소스를 우선한다.

---

## 1. 배경

- 외부 피드백 방향: **명령 / 오케스트레이션 / 워커 / 저장** 경계를 분명히 하고, **실행 이력**을 Resolver 한 방에만 두지 않는다.
- Admin IA: 사이드 메뉴 기준 **채널**, **제작 아이템**, **실행 현황** 등으로 용어·탭을 맞춘다.

---

## 2. 백엔드

### 2.1 파이프라인 실행 이력 (Dynamo + GraphQL)

- **저장**: `services/shared/lib/store/job-execution.ts`
  - 잡 PK 하위에 `SK = EXEC#<ISO>#<uuid>` 형태.
  - 상태: `QUEUED` | `RUNNING` | `SUCCEEDED` | `FAILED`.
- **유스케이스**: 토픽 플랜·씬 JSON·에셋 생성·드래프트 생성 시 `triggeredBy`(Cognito 액터)와 함께 실행 레코드를 남김.
- **GraphQL**: `jobExecutions(jobId)` → `[PipelineExecution!]!`
  - 스키마: `lib/modules/publish/graphql/schema.graphql` (`PipelineStageType`, `ExecutionStatus`, `PipelineExecution`).
- **리졸버**: `services/admin/graphql/job-executions/`
- **CDK**: `lib/publish-stack.ts` — `AdminJobExecutionsResolverLambda`, Jobs 테이블 읽기 등.

### 2.2 비동기 파이프라인 워커 (Lambda Invoke)

- **의도**: 긴 뮤테이션이 Resolver에서 끝까지 기다리지 않고, **QUEUED 실행 행 + Event로 워커 호출** 후 즉시 `AdminJob` 스냅샷 반환(폴링·상세 재조회로 완료 반영).
- **구성**:
  - `services/shared/lib/aws/invoke-pipeline-worker.ts` — `@aws-sdk/client-lambda` Event invoke.
  - `services/admin/pipeline-worker/` — `runTopicPlanCore` / `runSceneJsonCore` / `runAssetGenerationCore` 실행 후 `finishJobExecution`.
  - 환경: `PIPELINE_ASYNC_INVOCATION`, `PIPELINE_WORKER_FUNCTION_NAME`이 설정되면 비동기 경로(로컬에서 워커 미설정 시 동기 경로 유지).
- **CDK**: `AdminPipelineWorkerLambda` (긴 타임아웃), 트리거 리졸버에 `grantInvoke`, `pipelineTriggerEnv`로 위 env 주입.

### 2.3 `adminJobs` — 필터 없을 때 “전체 최근 목록”

- **문제**: `contentId`·`status` 모두 없을 때 기본이 특정 상태만 조회하던 동작은, **제작 아이템 허브·실행 현황** 등 “최근 전체” 기대와 어긋날 수 있음.
- **변경**: `services/shared/lib/store/video-jobs.ts`의 `listJobMetasMergedByRecent` — `JobStatus` 전부에 대해 GSI1을 **병렬 조회** 후 `updatedAt` 기준 병합·정렬·`limit` 절단.
- **리졸버**: `services/admin/graphql/list-jobs/repo/list-jobs.ts` — 위 병합 경로 사용.
- **파싱**: `parse-list-jobs-args.ts`에서 `limit` 상한 **200**까지 허용.

**주의**: 필터 없는 `adminJobs` 호출은 Dynamo 쿼리가 **상태별로 최대 `limit`건씩** 읽은 뒤 합치므로, 트래픽·비용을 고려해 호출 빈도·`limit`을 조절하는 것이 좋다.

---

## 3. Admin Web (`apps/admin-web`)

### 3.1 용어 통일 (메뉴와 표시명)

- **콘텐츠** → **채널** (카탈로그·목록·상세·설정 문구 등, 문맥상 “채널”이 맞는 화면).
- **잡** → **제작 아이템** (사이드 메뉴 라벨과 동일하게; 일부 라벨은 짧게 **아이템 ID** 등).

### 3.2 제작 아이템 허브 (`/jobs`)

- **이전**: `contentId = __unassigned__`만 조회 → 미연결 목록만 표시.
- **이후**: 필터 없이 `adminJobs(limit: 200)`으로 **미연결 + 채널 연결** 전체(최근 수정 순 병합 결과).
- 테이블에 **채널 ID** 열 추가(미연결은 `미연결` 표시). **채널에 연결** 버튼은 미연결 행에만 표시.
- 상단·하단 설명 문구를 “전체 목록”에 맞게 수정.

### 3.3 제작 아이템 상세 브레드크럼

- **이전**: 채널 미연결 시 중간에 `미연결 제작 아이템` 단계가 들어가고 링크가 상위 `제작 아이템`과 동일( `/jobs`)해 **URL 계층과 불일치**.
- **이후**: 채널이 있을 때만 중간에 `contentId` → `/content/{id}/jobs` 링크; 미연결일 때는 그 단계 **생략**.

---

## 4. 클라이언트 패키지 (`packages/graphql`)

- `PipelineExecution` 타입에 `QUEUED` 포함, `jobExecutions` 쿼리·훅·캐시 무효화 등은 제작 아이템 상세 **실행 이력** 탭과 연동.

---

## 5. `services/admin/graphql` 구조에 대한 메모

- 해당 트리는 **AppSync Resolver 진입점**(폴더 = 오퍼레이션 단위)에 가깝고, **도메인 로직 전부**가 여기에만 있는 것은 아니다.
- 토픽·씬·이미지 등은 `services/topic/`, `services/script/`, `services/image/` 등 **도메인 모듈**에 두고, `admin/graphql/*/usecase`는 그쪽을 호출하는 **Admin API 어댑터** 역할에 맞추는 편이 현재 규칙과도 잘 맞는다.

---

## 6. 배포 시 유의

- GraphQL 스키마 필드 추가·새 Lambda·IAM 변경은 **CDK 배포** 후 AppSync·Lambda에 반영된다.
- 비동기 워커를 쓰는 환경에서는 `PIPELINE_WORKER_FUNCTION_NAME` 등 env가 배포 스택에 포함되는지 확인한다.

---

## 7. 남은 과제 (참고)

- Step Functions·SQS 기반의 **완전한 비동기 오케스트레이션** (문서 §10·§14 방향).
- `inputSnapshotId` / 후보·채택 스냅샷 등 **승인 모델** 확장.
- `adminJobs` 병합 목록의 **정밀한 전역 정렬·페이지네이션**(현재는 상태별 상한 병합 근사).

---

## 8. 주요 경로 빠른 참조


| 영역           | 경로                                                                                 |
| ------------ | ---------------------------------------------------------------------------------- |
| 실행 저장        | `services/shared/lib/store/job-execution.ts`                                       |
| 워커 invoke    | `services/shared/lib/aws/invoke-pipeline-worker.ts`                                |
| 파이프라인 워커     | `services/admin/pipeline-worker/`                                                  |
| 잡 목록 병합      | `services/shared/lib/store/video-jobs.ts` (`listJobMetasMergedByRecent`)           |
| Admin 잡 쿼리   | `services/admin/graphql/list-jobs/`                                                |
| 스키마          | `lib/modules/publish/graphql/schema.graphql`                                       |
| CDK          | `lib/publish-stack.ts`, `lib/modules/publish/graphql-api.ts`                       |
| 제작 아이템 허브 UI | `apps/admin-web/src/_pages/jobs-hub/ui/jobs-hub-page.tsx`                          |
| 브레드크럼        | `apps/admin-web/src/widgets/content-job-detail/lib/build-job-detail-breadcrumb.ts` |


