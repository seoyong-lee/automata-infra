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
  - `pending`

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
  - `pending`

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

---

## 리뷰 체크

작업 시작 전과 PR 리뷰 시 아래를 확인한다.

1. handler 또는 entry가 transport/wiring 이상을 알고 있지 않은가
2. repo가 raw I/O 외 정책/DTO 변환을 하지 않는가
3. normalize가 data defense만 수행하는가
4. mapper가 output shape 변환만 수행하는가
5. usecase가 AWS SDK client, env 문자열, raw event를 모르나
6. 기존 event contract와 response shape가 유지되는가
