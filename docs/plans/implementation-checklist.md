# 구현 상태 체크리스트

## 목적

이 문서는 `docs/plan.md`를 기준으로 현재 리포의 구현 상태를 점검하고, 다음 구현 우선순위를 빠르게 확인하기 위한 체크리스트다.

상태 표기:

- `[x]` 구현됨
- `[~]` 부분 구현됨
- `[ ]` 미구현

## 1. 리포 골격

- `[x]` 단일 TypeScript CDK 리포 구조 유지
- `[x]` `bin/`, `lib/`, `services/`, `types/`, `env/`, `docs/` 디렉터리 구성
- `[x]` `apps/admin-web`, `packages/*` 기반 admin client 구조 추가
- `[x]` `package.json`, `tsconfig.json`, `eslint` 설정 존재
- `[x]` `build`, `lint`, `synth`, `diff`, `deploy` 스크립트 존재
- `[~]` 테스트 스크립트는 smoke + generation contract 수준까지 존재
- `[~]` 자동 테스트 파일(unit/integration) 체계화
- `[x]` script/scene 생성과 후속 산출물 검증용 테스트 환경 구축

## 2. CDK / 인프라 스택

### 2.1 App Entry

- `[x]` `bin/automata-studio.ts`에서 `env/config.json` 로드
- `[x]` `SharedStack`, `WorkflowStack`, `PublishStack` 생성
- `[x]` 공통 env 설정과 prefix 주입

### 2.2 SharedStack

- `[x]` S3 assets bucket 생성
- `[x]` CloudFront preview distribution 생성
- `[x]` 기본 observability dashboard 생성
- `[ ]` 공통 KMS 구성
- `[ ]` Secrets Manager 리소스 참조/출력 표준화
- `[ ]` 공통 알람 세트 구성

### 2.3 WorkflowStack

- `[x]` DynamoDB jobs table 생성
- `[x]` SQS queue 세트 생성
- `[x]` workflow Lambda 리소스 생성
- `[x]` Step Functions state machine 생성
- `[~]` EventBridge rule 기반 workflow 자동 시작 존재 (`Scheduler` 전환은 미구현)
- `[ ]` DLQ/재시도 운영 알람 연결

### 2.4 PublishStack

- `[x]` REST publish API 생성
- `[x]` Cognito auth 리소스 생성
- `[x]` AppSync GraphQL API 생성
- `[x]` admin resolver Lambda 연결
- `[x]` metrics collection schedule 생성
- `[ ]` admin web 배포 리소스 구성

## 3. 상태 저장 / 데이터 모델

### 3.1 DynamoDB

- `[x]` 단일 테이블 `VideoJobsTable` 구조 구현
- `[x]` `PK`, `SK` 기반 job/scene/artifact/upload/review item 저장 지원
- `[x]` `GSI1`, `GSI2`, `GSI3` 생성
- `[x]` status/channel 기준 조회 함수 존재
- `[~]` topic dedupe용 `GSI3`는 테이블에 있으나 실제 사용은 제한적
- `[ ]` 비용/분석용 read model 확장

### 3.2 S3

- `[x]` `topics/`, `scene-json/`, `assets/`, `render-plans/`, `rendered/`, `previews/`, `logs/` 경로 사용
- `[x]` provider raw log 저장 경로 사용
- `[~]` rendered/previews 경로는 실제 파일 대신 placeholder 저장
- `[ ]` 실제 렌더 산출물 다운로드/보관

### 3.3 타입 계약

- `[x]` `types/render/scene-json.ts` 존재
- `[x]` `types/events/base-event.ts` 존재
- `[x]` `types/jobs/video-job.ts` 존재
- `[ ]` `types/events/job-events.ts`
- `[ ]` `types/events/review-events.ts`
- `[ ]` `types/events/upload-events.ts`
- `[ ]` 상태/이벤트 타입을 문서 기준으로 완전 정렬

## 4. 워크플로우 단계 구현

### 4.1 Topic Planning

- `[x]` `services/topic` 런타임 존재
- `[x]` topic plan S3/DynamoDB 저장
- `[~]` topic plan 생성 로직은 공통 LLM 계층 + mock fallback 기반
- `[ ]` 실제 topic source 수집
- `[ ]` topic dedupe 체크
- `[ ]` 채널 전략 기반 topic scoring
- `[x]` topic 단계 LLM provider/model 모듈화
- `[x]` DB 조회 기반 prompt template 적용

### 4.2 Scene JSON Build

- `[x]` `services/script` 런타임 존재
- `[x]` scene JSON S3 저장
- `[x]` scene item을 DynamoDB에 저장
- `[~]` scene JSON 생성 로직은 공통 LLM 계층 + mock fallback 기반
- `[~]` LLM 기반 script/scene generation
- `[ ]` scene count, subtitle length, tone/style 정책 반영
- `[x]` scene 단계 LLM provider/model 모듈화
- `[x]` DB 조회 기반 prompt template 적용

### 4.3 Image Generation

- `[x]` `services/image` 런타임 존재
- `[x]` OpenAI image provider wrapper 존재
- `[x]` secret 기반 실호출 + secret 부재 시 mock fallback
- `[x]` 생성 결과 S3/DynamoDB 반영
- `[x]` 장면별 병렬 `Map` 처리
- `[ ]` provider fallback 전략
- `[ ]` 비용 기록

### 4.4 Video Generation

- `[x]` `services/video-generation` 런타임 존재
- `[x]` Runway video provider wrapper 존재
- `[x]` poll 기반 비동기 완료 처리 존재
- `[x]` secret 부재 시 mock fallback
- `[~]` 실제 비디오 파일 대신 JSON manifest 저장 가능성 있음
- `[x]` 장면별 병렬 `Map` 처리
- `[ ]` provider fallback 전략
- `[ ]` 실제 clip 산출물 저장 일관화

### 4.5 Voice Generation

- `[x]` `services/voice` 런타임 존재
- `[x]` ElevenLabs provider wrapper 존재
- `[x]` mp3 저장 지원
- `[x]` secret 부재 시 mock fallback
- `[ ]` voice style/voice preset 분기
- `[ ]` duration mismatch 보정
- `[ ]` 비용 기록

### 4.6 Asset Validation

- `[x]` `services/composition/validate-assets` 존재
- `[x]` S3 object 존재 여부 검사
- `[x]` MIME / content length 검사
- `[x]` total duration 계산
- `[x]` subtitle 길이 warning 처리
- `[~]` validation 결과는 기본 수준
- `[ ]` provider metadata 상세 검증
- `[ ]` scene count 제한 정책
- `[ ]` 음성 길이와 scene duration 정합성 강화

### 4.7 Render Plan Build

- `[x]` `services/composition/render-plan` 존재
- `[x]` render plan S3 저장
- `[x]` render artifact meta 기록
- `[~]` render plan은 기본 이미지/음성/자막 중심
- `[ ]` Shotstack payload 최적화
- `[ ]` BGM / SFX / transition / motion 지원
- `[ ]` visual type (`image`, `video`, `image+motion`) 완전 반영

### 4.8 Final Composition

- `[x]` `services/composition/final-composition` 존재
- `[x]` Shotstack provider wrapper 존재
- `[x]` submit + poll 구조 존재
- `[x]` composition 결과를 job meta에 반영
- `[~]` 실제 렌더 결과 대신 placeholder 파일 저장
- `[ ]` Shotstack output URL 다운로드 후 S3 적재
- `[ ]` 썸네일/preview 실제 파일화
- `[ ]` Fargate + FFmpeg 분기 구현

### 4.9 Review Request / Await Review

- `[x]` `WAIT_FOR_TASK_TOKEN` 패턴 사용
- `[x]` review request Lambda 존재
- `[x]` review record 및 task token 저장
- `[x]` review queue 메시지 발행
- `[x]` GraphQL mutation으로 approve/reject/regenerate 처리 가능
- `[~]` regenerate scope는 일부만 반영
- `[ ]` metadata only / full recompose 재진입 경로 정교화
- `[ ]` title/description/thumbnail 수정 기능
- `[ ]` 부분 재생성 이력 관리 강화

### 4.10 Upload

- `[x]` upload request API/GraphQL mutation 존재
- `[x]` upload worker Lambda 존재
- `[x]` upload record 저장 로직 존재
- `[~]` upload는 현재 mock 수준의 video id 생성
- `[ ]` YouTube Data API 실제 업로드
- `[ ]` upload queue 소비 구조 연결
- `[ ]` `UPLOAD_QUEUED -> UPLOADED` 상태 전이 정리
- `[ ]` 제목/설명/visibility 실제 반영

### 4.11 Metrics

- `[x]` metrics Lambda 스텁 존재
- `[x]` schedule rule 존재
- `[x]` workflow 내 `CollectMetrics` 단계 연결
- `[ ]` 비용/처리시간/실패율 수집
- `[ ]` 운영 대시보드 지표 확장

## 5. Step Functions 설계 적합도

- `[x]` 기본 단계 순서가 `plan -> scene -> image -> video -> voice -> validate -> render-plan -> compose -> review -> upload`로 연결됨
- `[x]` review 후 approve/reject/regenerate 분기 존재
- `[~]` regenerate 이후 전체 파이프라인 재합류가 불완전함
- `[x]` `GenerateSceneAssets`를 장면별 `Map` state로 구현
- `[ ]` wait/poll + SQS fallback 전략 분리
- `[ ]` 단계별 실패 격리와 부분 재시도 고도화
- `[~]` `CollectMetrics`를 포함한 최종 상태 흐름 완성

## 6. Admin API / Admin Web

### 6.1 Admin GraphQL API

- `[x]` `adminJobs`
- `[x]` `adminJob`
- `[x]` `pendingReviews`
- `[x]` `jobTimeline`
- `[x]` `submitReviewDecision`
- `[x]` `requestUpload`
- `[x]` `llmSettings`
- `[x]` `updateLlmStepSettings`
- `[x]` Admin 그룹 권한 체크 존재
- `[x]` resolver audit logging 존재
- `[ ]` 분석용 query 확장

### 6.2 Admin Web

- `[x]` Next.js app 구조 존재
- `[x]` login/callback/dashboard/reviews/settings 페이지 존재
- `[x]` GraphQL query/mutation hook 존재
- `[x]` pending review 조회와 approve/reject/upload 요청 UI 존재
- `[x]` LLM settings 조회/수정 UI 존재
- `[~]` 운영 UI는 최소 수준
- `[ ]` job 상세 타임라인 확장
- `[ ]` 필터/검색/정렬
- `[ ]` preview 재생/썸네일 수정
- `[ ]` 비용/실패율 대시보드
- `[~]` `admin:build`는 환경변수 미설정 시 실패

## 7. Provider / Secret / 운영 준비

- `[x]` provider secret id가 `env/config.json`에 정의됨
- `[x]` runtime에서 Secrets Manager 조회 지원
- `[x]` OpenAI / Runway / ElevenLabs / Shotstack wrapper 존재
- `[~]` secret 미설정 시 mock fallback 위주 운영
- `[~]` 공통 LLM adapter 계층 (`Gemini`, `OpenAI`, `Bedrock` 등) 구성
- `[x]` 단계별 모델 선택/파라미터 설정 저장소 구성
- `[x]` prompt template의 DB 조회/버전 관리 구조 구성
- `[ ]` 단계별 최적 모델 평가 기준 수립
- `[ ]` 실제 provider credential 기반 end-to-end 검증
- `[ ]` provider rate limit / retry 정책 구체화
- `[ ]` provider 비용 집계

## 8. 품질 상태

- `[x]` `yarn build` 통과
- `[x]` `yarn lint` 통과
- `[x]` `yarn admin:typecheck` 통과
- `[~]` `yarn admin:build`는 client env 미설정 시 실패
- `[~]` 단위 테스트
- `[~]` 통합 테스트
- `[ ]` workflow smoke test
- `[ ]` provider mock/real 분리 테스트
- `[x]` prompt regression test dataset
- `[x]` script -> scene -> asset -> render plan 계약 회귀 테스트

## 9. 다음 구현 우선순위

### P1. 워크플로우 완결

- `[~]` EventBridge rule -> Step Functions 시작점 추가
- `[x]` 장면별 `Map` state 병렬 처리 추가
- `[ ]` regenerate 후 `validate -> render-plan -> compose -> review` 재합류 정리
- `[x]` `CollectMetrics` 단계 추가

### P2. 실제 생성 로직 연결

- `[ ]` topic planning을 실제 source/LLM 기반으로 전환
- `[~]` scene JSON 생성을 LLM 기반으로 전환
- `[x]` 단계별 LLM provider/model 교체 가능 구조 도입
- `[x]` DB 기반 prompt template 조회/적용 연결
- `[ ]` 단계별 최적 모델 후보 (`Gemini`, `OpenAI`, `Bedrock`) 평가
- `[ ]` topic dedupe와 비용 기록 연결

### P3. 렌더/업로드 실체화

- `[ ]` Shotstack 결과 실제 파일 저장
- `[ ]` preview/final/thumbnail 실데이터 저장
- `[ ]` YouTube Data API 실제 업로드 구현
- `[ ]` upload 상태 전이 정리

### P4. 운영 기능 보강

- `[ ]` admin web 필터/상세/타임라인 강화
- `[ ]` title/description/thumbnail 수정 기능
- `[ ]` partial regeneration 관리 강화
- `[~]` 테스트 및 runbook 확장
- `[~]` 생성 테스트 환경과 프롬프트 회귀 검증 체계 확장

## 10. 에이전트 ↔ 발행 파이프라인 확장 (계획 문서: `cursor-handoff-agent-publish-integration.md`)

> 코드 기준 스냅샷. 세부는 해당 핸드오프 문서 §5–§10 참고.

### 10.1 계약·저장소

- `[x]` `lib/modules/agents/contracts/agent-domain.ts` — `TrendSignal`, `IdeaCandidate`, `AgentRun`, `PerformanceInsight`, `ScoutPolicy`, 채널 자동화 플래그, `ChannelSignal` / `ChannelScoreSnapshot` / `ChannelWatchlist`, `AgentKind`에 `CHANNEL_EVALUATOR`
- `[x]` Dynamo store: `idea-candidates`, `trend-signals`, `agent-runs`, `performance-insights`, `channel-agent-config`, `channel-watchlist`, `channel-signals`, `channel-score-snapshots`
- `[~]` 목록 조회는 링크 + **`BatchGetItem`** 조합(리졸버 타임아웃 완화); GSI 추가는 선택 과제
- `[ ]` Gate A/B/C를 코드·상태머신으로 끝까지 고정

### 10.2 GraphQL·클라이언트·Admin UI

- `[x]` 스키마 + `publish-domain-router` + `graphql-api.ts` — 아이디어 후보·트렌드·에이전트 런·성과 인사이트·채널 에이전트 설정, 워치리스트·채널 스냅샷 조회/갱신, `promote`/`reject` 등
- `[x]` `packages/graphql/src/admin.ts` 대응 훅
- `[x]` `/discovery` — 탭·운영 라인 렌즈(`channel`); 후보·워치리스트 패널 (사이드바 전역; IA 원칙은 `cursor-handoff` §7.1)
- `[ ]` `/jobs/[jobId]/overview` · `/publish` 에이전트 카드·초안 diff 등 (문서 §7)

### 10.3 인프라·에이전트 런타임

- `[~]` **SQS**: `trend-scout-jobs`, `channel-evaluation-jobs` + 공유 DLQ (`PublishStack`). 문서에 나온 나머지 큐(idea-planning, draft-generation, publish-scheduling, optimization)는 **미생성**
- `[~]` **Lambda**: `services/agents/trend-scout` (플레이스홀더 `AgentRun`만), `services/agents/channel-evaluator` (가짜 `ChannelSignal` + 규칙 기반 스냅샷 + `AgentRun`)
- `[ ]` EventBridge로 위 큐들에 주기 적재
- `[x]` `AdminPublishDomainResolverLambda` — 번들 대비 메모리 상향, Dynamo `batchGetItems` 경로

### 10.4 비즈니스 (마일스톤 대비)

- `[~]` **Scout(M2)**: 트렌드 수집·LLM·`IdeaCandidate`·`createSourceItem` 자동 연결 — **미완**(스케줄·수집·승격 로직 없음)
- `[~]` **Hit channel(M2.5)**: 스키마·스토어·GraphQL·UI·SQS·평가 Lambda·규칙 점수 — **부분**; YouTube API·Scout/Planner 입력 연동·STALE/TTL·Optimizer 보정 — **미완**
- `[ ]` **Planner(M3)** · **Shipping(M4)** · **Optimizer(M5)** 전용 워커·usecase 연결

---

## 11. 현재 단계 요약

- 현재 상태는 대체로 `Phase 2 완료 + Phase 3/4 일부 구현`에 더해, **에이전트 계층은 M1 수준 + M2/M2.5 스켈레톤**이 코드에 반영된 상태다.
- 골격, 스택, 주요 Lambda 경로, admin GraphQL/API와 LLM settings 관리 경로는 갖춰져 있다.
- 다음 핵심 작업은 "실제 생성/렌더/업로드를 운영 가능한 수준으로 완성"하고, 다중 LLM provider 실연결과 regenerate 재합류를 마무리하는 것이다. **에이전트 쪽**은 Scout 본 로직·스케줄·게이트·Planner/Shipping/Optimizer 워커가 남아 있다.
