# Refactoring Start Order

이 문서는 `docs/conventions/Conventions.md`의 원칙을 **실행 순서와 착수 단위**로 바꾼 기록이다.
컨벤션은 경계를 설명하고, 이 문서는 **어디부터 어떤 단위로 실제로 자를지**를 관리한다.

---

## 목표

- 큰 파일 하나를 예쁘게 나누는 것이 아니라 **경계 복구 순서**를 고정한다
- 회귀 위험이 큰 영역부터 `handler -> index -> usecase -> repo/normalize/mapper` 구조를 되돌린다
- 한 번에 전체 리팩토링하지 않고, **기능 계약을 유지한 채 작은 단위**로 진행한다

---

## 우선순위

### 1. 렌더링/합성 런타임

- 대상: `services/composition/fargate-renderer/index.mjs`
- 현재 문제:
  - env 파싱
  - S3 입출력
  - ffmpeg/ffprobe 실행
  - subtitle/renderPlan 보정
  - preview/final artifact 생성
  - 결과 업로드
  - 위 책임이 한 파일에 섞여 있다
- 목표:
  - `index.mjs`: entry + deps 조립 + `run()`
  - `usecase/`: preview/final render 흐름
  - `repo/`: S3, ffmpeg, ffprobe, 외부 provider 호출
  - `normalize/`: render plan, subtitle, canvas, media frame 보정
  - `mapper/`: render result 저장 payload 조립
- 진행 상태:
  - `done`: `repo` / `normalize` / `usecase` / result mapper 1차 추출 완료
  - `done`: `run-render-task.mjs`의 subtitle ASS / final output helper 추가 분리
  - `next`: scene composition 세부 helper 추가 분리 여부 검토

### 2. Job detail 조회/조립 흐름

- 대상:
  - `services/admin/jobs/get-job-draft/repo/get-job-draft.ts`
  - `services/admin/shared/repo/job-draft-store.ts`
  - `services/admin/shared/mapper/map-job-draft-detail.ts`
- 현재 문제:
  - repo가 raw 조회를 넘어서 DTO 조립까지 수행
  - scene json 정렬/보정이 repo 계층에 섞여 있음
  - read model 조합 책임이 usecase 없이 한 곳에 몰려 있음
- 목표:
  - `repo/`: raw 조회만
  - `normalize/`: scene/render artifact/raw field 정규화
  - `mapper/`: GraphQL DTO 변환
  - `usecase/`: fallback, 우선순위, 섹션 조합 정책
- 진행 상태:
  - `in_progress`
  - `done`: `job-draft-store.ts`의 read/write 책임을 분리해 write store / key helper 추가

### 3. GraphQL field별 handler/index/usecase 정렬

- 대상:
  - `services/admin/graphql/**`
  - `services/admin/jobs/**`
- 현재 문제:
  - field entry에서 auth/event parsing, 상태 전이, store 호출이 쉽게 섞인다
- 목표:
  - field별 `index.ts`는 args parse + context 고정 + usecase 호출만 담당
  - 에러 노출 정책은 handler에만 둔다
- 진행 상태:
  - `in_progress`
  - 완료: grouped domain router 공통 dispatch 도입
  - 완료: `generations/jobs/content/settings/final/pipeline`의 `routes` 기반 라우팅 통일
  - 완료: field `index.ts`의 audit/error 변환 패턴을 `run-audited-admin-resolver`로 공통화
  - 완료: field audit metadata(`jobId`/`action`)를 `resolver-audit-fields` helper로 2차 공통화
  - 완료: `run-asset-generation/index.ts`의 scope 조합 책임을 usecase로 이동
  - 완료: generation 도메인의 job draft 반환을 shared facade로 분리
  - 완료: `run-scene-json`의 입력 로드 / 저장 책임을 repo + normalize로 분리
  - 완료: `search-scene-stock-assets`의 scene load / candidate persistence 책임 일부 분리
  - 완료: `run-final-composition`의 subtitle ASS 계산 / render context load 분리
  - 완료: `run-asset-generation`의 scope/context/policy/modality 실행 분리
  - 완료: scene candidate 선택 / voice profile 설정 usecase의 repo/mapper/helper 분리
  - 완료: scene image/video/voice candidate selection 공통 흐름 helper 분리
  - 완료: pipeline stage usecase의 queued/sync execution wrapper 공통화
  - 완료: pipeline stage approve / worker routing 규칙을 helper로 분리
  - 완료: `set-job-background-music` 검증 로직 분리
  - 완료: `search-scene-stock-assets`의 image/video scene search policy 분리
  - 완료: `run-final-composition`의 subtitle persistence / render plan patch 분리
  - 완료: `attach-job-to-content`의 validation/context load/artifact sync 분리
  - 완료: settings upsert 계열의 store payload mapping 분리
  - 완료: `create-draft-job`의 post-create job plan follow-up 분리
  - next: field 단위에서 index/usecase 경계가 약한 구간 점검

---

## 착수 단위

각 우선순위는 아래 단위로 잘라서 진행한다.

1. `handler/index` thin-out
2. `repo` 추출
3. `normalize` 추출
4. `mapper` 추출
5. `usecase/policies` 분해

한 PR에서 여러 단위를 섞더라도, **계약 유지와 diff 크기 제어**가 우선이다.

---

## 현재 착수 계획

### Track A. Fargate Renderer 1차 절개

- 범위:
  - S3 입출력 함수 분리
  - ffmpeg/ffprobe wrapper 분리
  - renderPlan/canvas/mediaFrame/subtitle 보정 함수 분리
- 현재 상태:
  - 완료: `repo/s3-composition-repo.mjs`
  - 완료: `repo/media-tools-repo.mjs`
  - 완료: `normalize/render-plan.mjs`
  - 완료: `usecase/run-render-task.mjs`
  - 완료: `usecase/post-process-voice.mjs`
  - 완료: `mapper/render-result.mjs`
- 이번 단계에서 하지 않는 것:
  - preview/final render 전체 usecase 재구성
  - artifact 저장 contract 변경
  - TASK_MODE 분기 재설계
- 완료 조건:
  - 기존 env contract 유지
  - 기존 산출물 key/result json shape 유지
  - `index.mjs`에서 I/O와 보정 책임이 줄어든다

### Track B. Job Draft Read Model 1차 절개

- 범위:
  - `job-draft-store.ts`의 DTO 매핑/정렬 책임 제거
  - normalize/mapper로 이동
- 현재 상태:
  - 완료: scene json raw 조회를 repo로 축소
  - 완료: asset record 조합을 raw record + mapper로 분리
  - 완료: render artifact 정규화/매핑 분리
  - 완료: `get-job-draft/usecase`가 조합 책임 보유
- 선행 조건:
  - Track A 1차 절개 완료

### Track C. Remaining Large Multifunction Files 정리

- 범위:
  - `services/shared/lib/aws/runtime.ts`
  - `services/shared/lib/store/video-jobs.ts`
  - `services/shared/lib/providers/media/byteplus-video.ts`
  - `services/plan/usecase/create-job-plan.ts`
- 현재 상태:
  - 완료: `runtime.ts`를 env/secrets/ddb/s3/sqs/sfn re-export barrel로 분리
  - 완료: `video-jobs.ts`를 shared/meta/content/scene/artifact 단위 store 모듈로 분리
  - 완료: `byteplus-video.ts`를 config/response/task/persist helper로 분리하고 entry orchestration만 유지
  - 완료: `create-job-plan.ts`를 types/context/seed/result 조립 구조로 분리
- 유지 규칙:
  - 외부 import 경로와 기존 response contract는 유지
  - barrel 파일은 재-export만 담당하고 세부 로직은 하위 모듈에 둔다
  - provider/usecase entry는 orchestration만 남기고 세부 계산/저장/검증은 helper로 이동한다

---

## 리뷰 체크

작업 시작 전과 PR 리뷰 시 아래를 확인한다.

1. handler 또는 entry가 transport/wiring 이상을 알고 있지 않은가
2. repo가 raw I/O 외 정책/DTO 변환을 하지 않는가
3. normalize가 data defense만 수행하는가
4. mapper가 output shape 변환만 수행하는가
5. usecase가 AWS SDK client, env 문자열, raw event를 모르나
6. 기존 event contract와 response shape가 유지되는가
