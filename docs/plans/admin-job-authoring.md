# Admin Content Operations Plan

## Goal

Admin UI의 중심을 단일 `job authoring` 화면에서 `채널 기반 콘텐츠 운영 콘솔`로 옮긴다.

핵심 원칙은 아래 세 가지다.

- `콘텐츠 관리`는 실제 운영 작업 공간이다.
- `대시보드`는 콘텐츠 바깥의 통합 관제판이다.
- `설정`은 글로벌 정책과 연결 상태를 관리하는 영역이다.

이 개편의 목적은 정보구조의 중심을 "실험" 단독이 아니라 `채널 -> 콘텐츠 라인 -> 잡`으로 재정렬하는 것이다. 유튜브 자동화 운영자는 거의 항상 "어느 채널 작업인지", "그 채널의 어떤 콘텐츠 라인인지", "현재 어디서 막혔는지" 순서로 사고하므로, UI도 이 멘탈 모델을 그대로 따라야 한다.

## Why This Revision

기존 문서는 `job authoring` 자체에는 집중했지만, Admin 전체의 정보구조가 어떤 축으로 돌아가야 하는지까지는 충분히 날카롭게 정의하지 못했다.

이번 개편에서 가장 중요한 변경은 다음과 같다.

- 콘텐츠 운영의 기준축을 `job` 단독이 아니라 `channel-based content ops`로 바꾼다.
- `대시보드`에서는 관찰과 점프만 하고, 실제 수정은 `콘텐츠 관리`에서만 수행한다.
- `콘텐츠 관리` 안에서도 `채널`, `콘텐츠 라인`, `개별 잡`의 계층을 분리한다.
- `설정`은 현재 작업 맥락과 분리된 글로벌 관리 영역으로 유지한다.

## Current State

현재 코드베이스는 이미 일부 방향 전환이 반영되어 있다.

- `apps/admin-web/src/app/(dashboard)/layout.tsx`는 현재 `Dashboard / Content Manager / Settings` 네비게이션을 제공한다.
- `apps/admin-web/src/app/(dashboard)/page.tsx`는 글로벌 운영 현황판 성격의 지표와 채널별 상태 요약을 보여준다.
- `apps/admin-web/src/app/(dashboard)/jobs/page.tsx`는 채널 선택 후 콘텐츠 타입별 잡을 볼 수 있는 초기형 `Content Manager`를 제공한다.
- `apps/admin-web/src/app/(dashboard)/jobs/new/page.tsx`는 선택 채널과 콘텐츠 타입 기준으로 새 잡을 생성한다.
- `apps/admin-web/src/app/(dashboard)/jobs/[jobId]/page.tsx`는 topic seed, scene JSON, asset generation, upload까지 단일 잡 상세에서 다룬다.

하지만 아직 구조적으로 남아 있는 문제도 있다.

- 콘텐츠 관리 메인이 여전히 `잡 리스트 + 실험 카드` 중심이라, `콘텐츠 라인 운영 콘솔`로 보이기에는 계층이 약하다.
- `jobs/[jobId]`가 강력한 편집 화면이긴 하지만, 상위 맥락인 "어느 채널 / 어느 콘텐츠 라인" 안에서 들어왔는지가 충분히 드러나지 않는다.
- 대시보드와 콘텐츠 관리 사이의 경계는 좋아졌지만, "대시보드에서는 직접 수정하지 않는다"는 원칙을 문서 수준에서 더 명확히 고정할 필요가 있다.
- 설정은 분리되어 있으나, 어떤 정보가 설정에 남고 어떤 운영 정보가 콘텐츠 관리로 올라와야 하는지 구분 기준이 더 필요하다.

## Target Information Architecture

### Top-Level Structure

최상위 메뉴는 아래 3축으로 고정한다.

- `대시보드`
- `콘텐츠 관리`
- `설정`

각 축의 역할은 명확히 분리한다.

### Dashboard

전체 채널과 전체 콘텐츠를 가로지르는 통합 관제판이다.

- 병목 감지
- 에러 감지
- 리뷰 대기/업로드 실패 모니터링
- 채널 비교
- 성과 요약
- 콘텐츠 관리 화면으로의 점프

여기서는 개별 잡의 직접 수정, seed 수정, scene JSON 편집 같은 authoring 액션을 넣지 않는다.

### Content Management

실제 운영자가 가장 오래 머무는 작업 공간이다.

- 채널 선택
- 콘텐츠 라인 선택
- 잡 리스트 확인
- 스크립트/이미지/영상/업로드/로그 관리
- 재생성, 검수, 업로드 액션 수행

핵심은 `채널 -> 콘텐츠 라인 -> 잡` 순서를 항상 유지하는 것이다.

### Settings

글로벌 정책 및 연결 설정 영역이다.

- 채널 연결/OAuth/시크릿
- 글로벌 모델 기본값
- provider API key 상태
- 공통 프롬프트 기본값
- 업로드 정책
- 스케줄/재시도 정책
- 런타임 토글

설정은 현재 작업 맥락에서 자주 조작하는 화면이 아니라, 운영 정책을 바꾸는 시점에 들어가는 별도 영역으로 둔다.

## Content Management Hierarchy

콘텐츠 관리에서 가장 중요한 것은 한 화면에 모든 것을 욱여넣지 않는 것이다. 이 영역은 아래 3단계로 계층을 나눈다.

### Step 1. Channel Selection

먼저 유튜브 채널을 선택한다.

- 예: `saju-shorts-ko`, `tarot-daily-en`
- 채널은 배포 컨테이너다.
- 채널 개수가 늘어날 수 있으므로 상단 탭보다 `좌측 패널` 또는 `드롭다운/세그먼트`가 더 안정적이다.

### Step 2. Content Line Selection

선택한 채널 안에서 콘텐츠 라인을 고른다.

- 예: `오늘의 사주 운세`, `타로`, `역사 숏폼`, `명언 숏폼`, `실험중`
- 콘텐츠 라인은 생산 라인업이다.
- 여기서의 탭은 `개별 영상`이 아니라 `콘텐츠 타입/라인`을 의미해야 한다.

### Step 3. Content Line Operations

선택된 콘텐츠 라인에 대해 비로소 잡과 결과물을 다룬다.

- 스크립트
- 이미지
- 영상
- 업로드
- 로그
- 재생성

즉 `채널`과 `콘텐츠`를 분리하지 않으면, 한 채널 안에 콘텐츠 타입이 많아지는 순간 UI가 다시 무너진다.

## Ideal User Flow

운영자 기준 이상적인 흐름은 아래와 같다.

`대시보드 진입`
-> 오늘 병목 확인
-> 문제 있는 채널 클릭
-> `콘텐츠 관리`로 이동
-> 채널 선택
-> 콘텐츠 탭 선택
-> 잡 리스트에서 대상 job 선택
-> 잡 상세 진입
-> 스크립트/이미지/영상/업로드 상태 확인
-> 실패 단계만 재실행 또는 검수 처리

콘텐츠 관리 기준으로 보면 아래 흐름이 핵심이다.

`콘텐츠 관리 진입`
-> 유튜브 채널 선택
-> 해당 채널의 콘텐츠 탭 노출
-> 콘텐츠 탭 선택
-> 선택한 콘텐츠의 상세 작업 화면 진입
-> 내부에서 스크립트/이미지/영상/업로드/잡 관리

## Screen Design Recommendations

### 1. Content Management Main

이 화면이 가장 중요하다. 현재 `jobs/page.tsx`를 이 역할의 기반으로 삼되, 구조를 더 선명하게 바꾼다.

#### 상단 고정 바

- 현재 선택 채널
- 채널 전환 드롭다운 또는 좌측 스위처
- 빠른 액션
- `새 콘텐츠 잡 생성`
- `실패 잡 보기`
- `검수 대기 보기`

#### 콘텐츠 탭 바

선택한 채널 내부에서 콘텐츠 라인을 탭으로 보여준다.

- `오늘의 사주 운세`
- `타로`
- `역사 숏폼`
- `실험중`

#### 본문 레이아웃

권장 레이아웃은 `2분할` 또는 `3분할`이다.

좌측 또는 상단 요약:

- 콘텐츠 설명
- 기본 포맷
- 기본 길이
- 기본 언어
- 기본 업로드 정책
- 활성 템플릿
- 최근 성과 요약

중앙:

- 최근 job 목록
- 상태
- 생성 단계
- 미리보기
- 마지막 업데이트
- 실패 여부
- variant 수

우측:

- 선택 job 상세 요약
- 현재 단계
- 사용한 모델
- scene 수
- 에셋 생성 상태
- 렌더 상태
- 업로드 상태
- regenerate 액션
- approve/upload 액션

### 2. Content Detail Workspace

실제로 가장 오래 쓰는 화면은 `선택된 채널의 선택된 콘텐츠 상세`다. 현재 `jobs/[jobId]`는 job authoring에 강점이 있으므로, 이를 상위 콘텐츠 컨텍스트 안에 더 분명하게 위치시켜야 한다.

권장 구조:

#### 상단

- Breadcrumb: `콘텐츠 관리 / {channelId} / {contentLine}`
- 상태 배지
- `새 잡 생성`
- `검수 대기 필터`
- `실패 잡 필터`

#### 요약 영역

- 최근 업로드
- 오늘 생성 수
- 실패 수
- 리뷰 대기
- 활성 템플릿

#### 하단 내부 탭

- `Overview`
- `Jobs`
- `Assets`
- `Uploads`
- `Templates`
- `Logs`

이 화면 안에서 `Jobs` 탭이 다시 `리스트 + 상세 패널` 구조를 갖는 것이 이상적이다.

좌측 리스트:

- `jobId`
- 상태
- 썸네일
- duration
- updatedAt
- warnings

우측 상세:

- scene timeline
- script
- assets
- render
- upload
- actions

### 3. Dashboard

대시보드는 콘텐츠 안쪽 작업 화면이 아니라 "전체 콘텐츠 운영 현황판"이다. 현재 `apps/admin-web/src/app/(dashboard)/page.tsx`의 방향은 맞고, 더 강하게 아래 원칙을 따른다.

- 직접 수정하지 않는다.
- 점프와 탐지에 집중한다.
- 모든 카드/리스트는 `콘텐츠 관리`로 이동시키는 entry point를 가진다.

권장 섹션:

- 글로벌 운영 상태
- 병목 보드
- 채널 상태 비교
- 성과 요약
- 에러 센터

권장 지표:

- 오늘 생성 수
- 리뷰 대기
- 렌더 실패
- 업로드 실패
- SLA 지연 잡
- 채널별 업로드 수
- 채널별 실패율
- 최근 7일 조회수
- 콘텐츠 타입별 반응
- 평균 제작 비용 vs 성과
- provider별 오류 빈도

### 4. Settings

설정은 글로벌 관리 영역으로 유지하되, 내부도 한 페이지에 몰아넣지 않는다.

권장 내부 탭:

- `General`
- `Channels`
- `Models & Prompts`
- `Providers`
- `Publish Policy`
- `Runtime`

구분 원칙:

- 채널 CRUD, OAuth, 시크릿, 기본 publish policy는 `설정`
- 채널별 최근 업로드, 실패, 연결 이상, 콘텐츠 라인 상태 같은 운영 정보는 `콘텐츠 관리`

## UX Guardrails

이번 구조에서 특히 주의해야 할 함정은 아래와 같다.

### 1. 채널을 탭으로 과도하게 노출하는 문제

채널이 2개일 때는 탭이 편하지만, 7개 이상이 되면 빠르게 망가진다.

권장:

- 채널 = 드롭다운 또는 좌측 스위처
- 콘텐츠 = 탭

### 2. 콘텐츠 탭에 개별 아이템을 섞는 문제

콘텐츠 탭은 `개별 영상`이 아니라 `콘텐츠 라인`이어야 한다.

좋은 예:

- `오늘의 운세`
- `타로`
- `역사 숏폼`

나쁜 예:

- `2026-03-20 오늘의 운세 1편`
- `2026-03-20 오늘의 운세 2편`

후자는 잡 리스트로 내려가야 한다.

### 3. 대시보드에서 잡 수정까지 허용하는 문제

대시보드는 관찰과 점프만 담당한다.

- OK: 병목 탐지, 링크 이동, 채널 비교, 에러 집계
- Not OK: scene JSON 편집, seed 수정, 직접 rerun, 직접 approve

### 4. 설정에 운영 정보를 과하게 몰아넣는 문제

설정은 정책과 연결만 다룬다. 운영 맥락은 콘텐츠 관리에 남겨야 한다.

## Backend and Contract Alignment

이번 개편은 화면 이동만의 문제가 아니라, `콘텐츠 라인`이라는 중간 단위를 API와 데이터 모델에서 더 잘 다루게 만드는 작업이기도 하다.

### 1. Contract Principle

Admin GraphQL과 shared API contract는 `zod` 스키마를 source of truth로 둔다.

적용 원칙:

- `CreateDraftJobInput` 같은 입력은 shared contract에 먼저 정의한다.
- `channelId + contentType`를 콘텐츠 라인 식별 축으로 다루는 요약 DTO를 추가한다.
- 프론트의 필터 상태, resolver parser, 저장 payload가 동일 스키마를 공유하게 한다.

관련 파일:

- `services/admin/graphql/shared/types.ts`
- `services/shared/lib/publish/channel-config.ts`
- `lib/modules/publish/graphql/schema.graphql`
- `packages/graphql/src/admin.ts`

### 2. Recommended Query Model

기존 `job detail` 조회 외에 콘텐츠 관리 화면을 위한 중간 레벨 조회가 필요하다.

추가/정리 권장:

- `adminChannels`: 운영 가능한 채널 목록과 기본 상태
- `contentLineSummaries(channelId)`: 채널 내부 콘텐츠 라인 요약
- `contentLineDetail(channelId, contentType)`: Overview/Jobs/Assets/Uploads용 상세 조회
- `jobDraft(jobId)`: 기존 step-by-step authoring 상세 조회 유지
- `jobTimeline(jobId)`: low-level 로그/감사용 조회

콘텐츠 라인은 MVP에서 `channelId + contentType` 조합으로 모델링할 수 있다. 이후 별도 콘텐츠 정의 엔터티가 필요해지면 `contentLineId`를 도입한다.

### 3. Mutation Model

기존 단계별 authoring mutation은 유지하되, 상위 UX 안에 배치한다.

- `createDraftJob`
- `updateTopicSeed`
- `runTopicPlan`
- `runSceneJson`
- `updateSceneJson`
- `runAssetGeneration`
- `requestUpload`

원칙:

- 콘텐츠 관리에서 잡을 생성하고
- 콘텐츠 상세에서 잡을 선택한 뒤
- job detail 또는 우측 상세 패널에서 mutation을 수행한다

### 4. Service Structure

Admin resolver는 기존 서비스 구조 원칙을 그대로 따른다.

- `handler.ts`는 얇게 유지
- orchestration은 `index.ts`
- 비즈니스 흐름은 `usecase/`
- 외부 I/O는 `repo/`

예상 경로:

- `services/admin/graphql/create-draft-job/`
- `services/admin/graphql/update-topic-seed/`
- `services/admin/graphql/run-topic-plan/`
- `services/admin/graphql/run-scene-json/`
- `services/admin/graphql/update-scene-json/`
- `services/admin/graphql/run-asset-generation/`

## Data Model Notes

**콘텐츠 · 잡 · 토픽(시드/플랜)의 관계, 용어 사전, 향후 “아이디어 선행 → 콘텐츠 부착” 옵션**은 별도 문서에서 관리한다: [`content-job-topic-domain.md`](./content-job-topic-domain.md).

콘텐츠 관리형 UI에서는 `job`만으로는 부족하고, `channel`, `content line`, `job` 세 레벨 모두의 요약이 필요하다.

권장 원칙:

- job의 최종 산출물과 편집 중 snapshot을 구분 저장한다.
- `scene-json`은 raw JSON snapshot으로 저장해 재편집 가능하게 한다.
- 모든 단계 변경은 timeline에 남기되, UI는 요약 DTO를 우선 사용한다.
- `content-brief`에는 최소 `contentType`, `variant`, `autoPublish`, `publishAt`를 유지한다.
- `channelConfigs[channelId]`와 `youtubeSecrets[channelId]`는 채널 publish 설정의 소스다.
- 채널 수준 설정은 `설정`에서 관리하지만, 채널 상태 요약은 `콘텐츠 관리`와 `대시보드`에 재노출한다.
- scene package/scene JSON은 renderer-neutral contract로 유지하고, renderer는 adapter에서만 분기한다.
- asset generation은 `Asset First, Composition Second` 원칙을 유지한다.

## Frontend Plan

### 1. Navigation

현 구조를 유지하되 의미를 명확히 고정한다.

- `/` = `대시보드`
- `/jobs` = `콘텐츠 관리`
- `/settings` = `설정`

`Reviews`는 독립 1차 메뉴로 두기보다, 장기적으로는 `콘텐츠 관리` 또는 `대시보드`에서 진입하는 운영 서브플로우로 흡수하는 방향을 검토한다.

### 2. Content Manager Route

`apps/admin-web/src/app/(dashboard)/jobs/page.tsx`를 아래 역할로 강화한다.

- 채널 선택 entry
- 콘텐츠 라인 탭
- 콘텐츠 라인 요약
- 최근 잡 리스트
- 실패/검수 대기/업로드 필요 quick filter
- 선택 잡 상세 요약 패널

즉 현재 페이지를 단순 잡 목록이 아니라 `채널 내부 콘텐츠 운영 콘솔`로 승격한다.

### 3. New Job Route

`apps/admin-web/src/app/(dashboard)/jobs/new/page.tsx`는 유지하되, 항상 상위 컨텍스트를 분명히 보여준다.

- 현재 채널
- 현재 콘텐츠 라인
- 생성 후 돌아갈 콘텐츠 상세 컨텍스트

가능하면 생성 완료 후 단순히 `jobs/[jobId]`로만 보내기보다, `콘텐츠 상세 -> 해당 job 선택 상태`로 돌아가는 흐름도 고려한다.

### 4. Job Detail Route

`apps/admin-web/src/app/(dashboard)/jobs/[jobId]/page.tsx`는 계속 필요하지만, 역할을 아래처럼 명확히 한다.

- 개별 job 심화 편집 화면
- 콘텐츠 상세 안에서 drill-in하는 deep workspace
- scene JSON 편집, asset rerun, upload 같은 고밀도 작업 담당

즉 기본 진입점은 `콘텐츠 관리 > 콘텐츠 상세`이고, `job detail`은 2차 심화 화면이 된다.

## Workflow Strategy

MVP에서는 기존 Step Functions 전체 경로를 그대로 admin 진입점으로 사용하지 않는다.

이유:

- 현재 state machine은 처음부터 끝까지 직선형 흐름이다.
- step-by-step authoring과 selective rerun 요구사항에 덜 맞는다.
- 콘텐츠 관리형 UI는 "부분 실행"과 "문제 단계만 다시 돌리기"가 중요하다.

따라서 MVP는 다음을 따른다.

- Admin mutation에서 단계별 usecase 직접 호출
- 후속 render/review/upload 체인은 기존 경로를 재사용
- `autoPublish === true`인 경우 승인 정책에 맞게 upload 경로를 이어간다

향후 확장:

- authoring 완료 후 state machine에 넘기는 하이브리드 구조
- 또는 state machine 자체를 resumable 구조로 재설계

## Implementation Order

1. 현재 문서 기준으로 IA와 용어를 코드/디자인 전반의 기준어로 확정한다.
2. `콘텐츠 관리 / 대시보드 / 설정` 역할 경계를 프론트 문구와 네비게이션에서 정리한다.
3. `channel -> content line -> job` 드릴다운용 조회 DTO를 설계한다.
4. shared `zod` contract 기준으로 콘텐츠 라인/채널 요약 스키마를 정의한다.
5. `jobs/page.tsx`를 콘텐츠 운영 콘솔 구조로 강화한다.
6. `jobs/[jobId]/page.tsx`에 상위 breadcrumb와 콘텐츠 컨텍스트를 명확히 노출한다.
7. 실패/검수 대기/업로드 필요 quick filter를 콘텐츠 관리에 추가한다.
8. 대시보드의 모든 액션을 "관찰 + 점프" 원칙에 맞게 재검토한다.
9. 설정 화면을 글로벌 섹션 기준으로 재정리한다.
10. 단계별 mutation과 snapshot 저장 구조가 새 UX 흐름을 충분히 지원하는지 검증한다.

## Risks

- `contentType`만으로 콘텐츠 라인을 표현하면 장기적으로 메타데이터가 부족할 수 있다.
- 채널 수와 콘텐츠 라인 수가 늘어날 때 현재 `jobs/page.tsx` 레이아웃이 다시 복잡해질 수 있다.
- `jobTimeline`은 raw event 중심이라 `Logs` 탭에 바로 쓰기 어렵다.
- `Templates`, `Uploads`, `Logs` 탭은 초기에 요약판으로 시작하고 점진적으로 확장해야 할 수 있다.
- 대시보드가 다시 조작 화면으로 비대해지면 역할 분리가 무너진다.

## Success Criteria

- 운영자는 `대시보드 / 콘텐츠 관리 / 설정`의 차이를 즉시 이해할 수 있다.
- 콘텐츠 관리는 항상 `채널 -> 콘텐츠 라인 -> 잡` 순서로 진입한다.
- 채널이 늘어나도 채널 선택과 콘텐츠 선택이 안정적으로 확장된다.
- 대시보드에서는 문제를 발견하고 적절한 콘텐츠 관리 화면으로 즉시 이동할 수 있다.
- 콘텐츠 상세 화면에서 잡 상태, 에셋 상태, 업로드 상태, 재실행 액션을 한 맥락에서 다룰 수 있다.
- 설정은 글로벌 정책과 연결 관리에 집중하고, 운영 정보는 콘텐츠 관리에 남는다.
