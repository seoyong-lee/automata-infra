# Admin Web: 데이터 구성과 정보 구조(IA)

이 문서는 `apps/admin-web` 기준으로 **런타임 데이터 계층**(인증·API·상태)과 **화면·메뉴 IA**(라우트·내비게이션)를 정리합니다. 코드 기준 시점의 구현을 설명하며, 배포 환경별 차이는 환경 변수에 따릅니다.

---

## 1. 앱 개요

| 항목 | 내용 |
|------|------|
| 프레임워크 | Next.js(App Router) |
| 언어 | TypeScript |
| UI·테마 | `@packages/ui`, `@packages/theme` |
| 아키텍처 | FSD 스타일: `app` → `_pages` → `widgets` → `features` → `entities` → `shared` |

루트 경로 `/`는 `DashboardLayout`으로 감싼 **대시보드**와 동일 화면을 쓰고, `(dashboard)` 그룹 아래 화면들도 같은 사이드바 레이아웃을 공유합니다.

---

## 2. 데이터·런타임 계층

### 2.1 인증

- **Amazon Cognito** 기반 웹 인증(`@packages/auth`).
- 앱 초기화 시 `initClientApp`에서 `initAuth`, `initCognito` 후 GraphQL 클라이언트에 토큰 공급자를 연결합니다.
- `useAuthRedirect`: 세션이 없으면 `/login`으로 보냅니다. 예외 경로는 `/login`, `/auth/callback`, `/pending`입니다.

### 2.2 API: AppSync GraphQL

- **엔드포인트**: `NEXT_PUBLIC_APPSYNC_GRAPHQL_URL` (`shared/config/env.client.ts`의 `clientEnv`).
- **호출 방식**: `@packages/graphql`이 TanStack Query(`useQuery` / `useMutation`)와 커스텀 `gqlFetch`로 AppSync에 요청합니다. 런타임 설정은 `configureGraphqlClient({ url, getToken, onUnauthorized })`로 주입됩니다.
- **타입·훅의 단일 출처**: 도메인 타입(`AdminJob`, `AdminContent`, `PipelineExecution` 등)과 쿼리/뮤테이션 훅은 `packages/graphql/src/admin.ts`에 정의·생성된 형태로 노출됩니다. 앱의 `entities` 레이어는 이 패키지를 **얇게 재수출**해 화면에서 일관된 import 경로를 씁니다.

### 2.3 클라이언트 상태: TanStack Query

- 루트 `Providers`에서 `QueryClientProvider`로 전역 QueryClient를 제공합니다.
- 기본값: `staleTime` 10초, `retry` 1회; 캐시 에러는 콘솔에 로깅합니다.
- 화면은 주로 `useAdminJobsQuery`, `useJobDraftQuery`, `usePendingReviewsQuery` 등 패키지 훅의 `queryKey`를 기준으로 `invalidateQueries`로 동기화합니다.

### 2.4 Entity 레이어(데이터 접근의 façade)

`apps/admin-web/src/entities`는 비즈니스 경계별로 `@packages/graphql` 훅·타입을 묶습니다.

| 슬라이스 | 역할 |
|----------|------|
| `admin-content` | 채널(콘텐츠) 목록·생성·수정·삭제 (`AdminContent`) |
| `admin-job` | 전역 제작 아이템 목록, 검수 대기, 초안 생성, 업로드 요청, 검수 결정, 채널 연결 등 |
| `content-job` | **단일 제작 아이템** 상세: `getJobDraft` 중심의 드래프트, 씬/에셋/토픽/출고 관련 뮤테이션·조회 |
| `llm-step` | LLM 단계 설정 조회·업데이트 |
| `voice-profile` | 보이스 프로필 CRUD 및 잡/씬 단위 보이스 설정 뮤테이션 |

엔티티가 “소유”하는 것은 **서버와의 계약(훅·타입)**이며, 복합 화면 로직은 `widgets`(예: `content-job-detail`의 `useContentJobDetailPageData`)에 둡니다.

### 2.5 핵심 도메인 타입(요약)

서버 스키마와 맞춘 클라이언트 타입으로, UI 전반에서 참조됩니다.

- **`AdminJob`**: `jobId`, `contentId`, `status`(DRAFT ~ METRICS_COLLECTED 등), `videoTitle`, 토픽·에셋·렌더 관련 S3 키, `reviewAction`, 타임스탬프 등.
- **`AdminContent`**: 채널(콘텐츠) 메타—라벨, 유튜브 연동, 자동 공개·플레이리스트 등 설정 화면과 연결.
- **`PendingReview`**: 검수함·대시보드의 검수 대기 행.
- **`PipelineExecution`**: 파이프라인 단계별 실행 이력(제작 상세·실행 현황·타임라인).
- **`ChannelPublishQueueItem` / `PublishTarget`**: 채널 출고 큐·플랫폼별 게시 대상.

상세 필드는 `packages/graphql` 타입 정의를 기준으로 합니다.

---

## 3. 정보 구조(IA): 글로벌 내비게이션

### 3.1 데스크톱 사이드바 (`DashboardSidebar`)

브랜딩: **Automata Studio / Admin Console**. 섹션은 라벨로 구분됩니다.

| 섹션 | 항목 | 경로 | 비고 |
|------|------|------|------|
| **제작** | 소재 탐색 | `/discovery` | 하위 URL·쿼리는 §3.4 |
| | 아이템 | `/jobs` | 전역 제작 아이템 허브 |
| | 채널 | `/content` | 채널 카탈로그 |
| **운영** | 검수함 | `/reviews` | |
| | 실행 현황 | `/executions` | |
| **설정** | 설정 | `/settings` | 내부 탭은 §3.6 |

활성 표시는 `usePathname()`과 경로 prefix 규칙으로 처리합니다(예: `/content`, `/content/...` → 채널 강조).

### 3.2 모바일 상단 바 (`DashboardMobileBar`)

`lg` 미만에서 사이드바 대신 노출됩니다. 링크: 아이템 → 소재 → 채널 → 검수함 → 실행 현황 → **대시보드** → 설정. 데스크톱 사이드바에는 “대시보드” 전용 항목이 없고, 모바일에서만 `/`로 이동하는 링크가 있습니다.

### 3.3 라우트 맵(주요 화면)

`(dashboard)` 레이아웃이 적용되는 경로들입니다.

| 경로 | 화면 요약 |
|------|-----------|
| `/` | 대시보드(우선순위·병목·채널 요약) |
| `/discovery` | 소재 찾기(탭·쿼리 기반) |
| `/jobs` | 전체 제작 아이템 테이블 |
| `/jobs/new` | 새 제작 아이템 생성 플로우 |
| `/jobs/[jobId]` | `/jobs/[jobId]/overview`로 리다이렉트 |
| `/jobs/[jobId]/[step]` | 제작 아이템 상세(탭 = `step`) |
| `/content` | 채널 목록 |
| `/content/new` | 채널 생성 |
| `/content/[contentId]/jobs` | 해당 채널의 제작 아이템 |
| `/content/[contentId]/jobs/new` | 채널 컨텍스트에서 새 제작 아이템 |
| `/content/[contentId]/queue` | 출고 큐 |
| `/content/[contentId]/schedule` | 예약·발행 |
| `/content/[contentId]/connections` | 매체(플랫폼) 연결 |
| `/content/[contentId]/discovery` | **레거시 URL** → `/discovery?channel=...&tab=shortlist`로 리다이렉트 |
| `/reviews` | 검수함 |
| `/executions` | 실행 현황(최근 잡들의 실행 피드) |
| `/settings` | 글로벌 설정 |
| `/templates` | 템플릿 목록(정적 목업 성격의 UI) |
| `/topics` | `/jobs`로 리다이렉트(북마크 호환) |

인증 예외: `/login`, `/auth/callback`, `/pending`(Admin 그룹 미할당 안내).

---

## 4. 하위 IA: 채널 컨텍스트

채널 상세 하위에서는 `ContentChannelSubnav`가 보조 내비게이션을 제공합니다.

| 라벨 | 경로 |
|------|------|
| 제작 아이템 | `/content/[contentId]/jobs` |
| 출고 큐 | `/content/[contentId]/queue` |
| 예약·발행 | `/content/[contentId]/schedule` |
| 매체 연결 | `/content/[contentId]/connections` |

우측에 **소재 찾기 →** 링크는 `/discovery?channel=[contentId]&tab=shortlist`로 연결되어, 소재 탐색을 채널에 맞춰 엽니다.

---

## 5. 제작 아이템 상세: URL 모델과 워크플로

### 5.1 탭 = 경로 세그먼트

`/jobs/:jobId/:step`에서 `step`은 아래 탭과 1:1입니다.

| `step` | 라벨(개요) |
|--------|------------|
| `overview` | 개요 |
| `ideation` | 아이데이션(토픽·시드·플랜) |
| `scene` | 씬 설계 |
| `assets` | 에셋(이미지·음성·영상) |
| `publish` | 검수·출고 준비 |
| `timeline` | 실행 이력 |

`assets` 탭은 `?stage=image|voice|video`로 세부 모드를 구분합니다. 검색 파라미터 `view` 등으로 에셋 뷰 모드(씬별/종류별)를 둘 수 있습니다.

### 5.2 레거시 URL

예전 `script`, `image`, `voice` 등 단계명은 `getJobDetailLegacyRedirect`로 새 경로로 치환됩니다. `status` 단계는 `reviews`로 보냅니다.

### 5.3 워크플로 UI

- **워크플로 바 / 스테이지 패널**: `WorkflowNavKey`(overview, idea, script, assets, render, review, publishDraft, queue, schedule, result)로 단계·완료·차단 상태를 표현합니다. 이는 내부 내비게이션 모델이며 URL 탭(`JobDetailRouteTabKey`)과 매핑되어 있습니다.
- **준비 체크리스트**: 채널·소스·검수·카피·큐 등 `ReadinessKey` 단위 칩입니다.

상세 데이터는 `useJobDraftQuery` + `useJobExecutionsQuery` 등을 조합한 `useContentJobDetailPageData`에서 뷰 모델로 변환됩니다.

---

## 6. 소재 찾기(`/discovery`)

- **쿼리 `channel`**: 선택된 채널(콘텐츠) ID. 없으면 빈 값으로 동작.
- **쿼리 `tab`**: `explore` | `shortlist` | `saved`(기본 `explore`). 과거 이름(`watchlist`, `trends` 등)은 `normalizeDiscoveryTab`으로 신규 id로 치환합니다.
- **쿼리 `create=1`**: 소스 생성 UI를 열기 위한 플래그; 닫을 때 `create` 제거.

탭 라벨: 탐색 / 후보 / 저장한 아이디어.

---

## 7. 설정 화면(`/settings`)

글로벌 설정은 **사이드바 단일 진입**이며, 페이지 내부는 **섹션 버튼**으로 전환합니다.

| 섹션 키 | 영문 라벨 | 설명 요지 |
|---------|-----------|-----------|
| `general` | General | 운영 원칙·설정 요약 |
| `channels` | Channels | 채널별 연결·시크릿·업로드 기본값 |
| `models` | Models & Prompts | 단계별 모델·프롬프트 |
| `voices` | Voices | TTS 보이스 라이브러리 |
| `providers` | Providers | 외부 provider |
| `publish-policy` | Publish Policy | 자동 공개·visibility 등 |
| `runtime` | Runtime | 재시도·fallback 등 |

데이터: `useLlmSettings`, `useVoiceProfiles`, `useAdminContents` 등을 묶어 섹션별 카드에 전달합니다.

---

## 8. 대시보드 데이터 집계

대시보드는 **클라이언트 측 집계**입니다.

- `useAdminJobs` (한도 200), `useAdminContents` (100), `usePendingReviews` (100)를 불러옵니다.
- `buildDashboardSnapshot`이 검수 필요 건수, 실패·병목, 업로드 대기, 장기 체류(씬 JSON·에셋 생성) 등을 계산합니다.
- 채널 요약 행은 카탈로그와 잡 목록에 나온 `contentId`를 합쳐 구성합니다.

표본 한도 밖의 작업은 수치에 포함되지 않을 수 있음을 헤더 설명에 두고 있습니다.

---

## 9. 실행 현황(`/executions`)

전역 “모든 실행” 단일 API가 없을 때의 패턴으로, **최근 제작 아이템 최대 N개**에 대해 `jobExecutions`를 병렬 조회하고 목록을 합칩니다. `staleTime` 등으로 폴링 부담을 줄입니다.

---

## 10. 사이드바에 없는 경로

| 경로 | 설명 |
|------|------|
| `/` | 대시보드(모바일 바에서만 “대시보드”로 명시) |
| `/templates` | 템플릿 실험 UI(내비에 없음) |
| `/topics` | 예전 북마크용 리다이렉트 |

---

## 11. 참고 파일

| 영역 | 경로 |
|------|------|
| 사이드바·모바일 바 | `apps/admin-web/src/app/(dashboard)/dashboard-nav.tsx` |
| 대시보드 레이아웃 | `apps/admin-web/src/app/(dashboard)/layout.tsx` |
| GraphQL 런타임 | `packages/graphql/src/runtime.ts`, `packages/graphql/src/admin.ts` |
| 클라이언트 초기화 | `apps/admin-web/src/app/providers/initClientApp.ts` |
| 채널 하위 내비 | `apps/admin-web/src/widgets/content-channel/ui/content-channel-subnav.tsx` |
| 제작 상세 탭 | `apps/admin-web/src/widgets/content-job-detail/lib/detail-workspace-tabs.ts` |
| 설정 섹션 | `apps/admin-web/src/widgets/settings/model/index.ts` |
| 소재 탭 | `apps/admin-web/src/_pages/discovery/lib/discovery-tabs.ts` |

---

*이 문서는 리포지토리 구조와 코드에 기반합니다. API 스키마 변경 시 `packages/graphql`의 타입·훅과 AppSync 스키마를 함께 확인하세요.*
