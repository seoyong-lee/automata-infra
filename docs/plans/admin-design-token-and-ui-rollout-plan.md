# Admin 디자인 토큰·UI 선별 적용 플랜

## 목적

이 문서는 `stitch_` 산출물과 관련 `DESIGN.md`를 참고해, 현재 `ai-pipeline-studio`의 Admin Web에 시각 언어를 단계적으로 이식하기 위한 실행 기준 문서다.

이번 작업은 한 번에 화면을 갈아엎는 리디자인이 아니라 아래 두 단계로 나눈다.

1. 공통 패키지(`packages/theme`)에 Admin 전용 디자인 토큰을 흡수한다.
2. 현재 제품 흐름과 정합성이 높은 UI 패턴만 선별해 `apps/admin-web`에 적용한다.

핵심 원칙은 다음과 같다.

- `stitch_`의 HTML 목업을 그대로 옮기지 않는다.
- 먼저 토큰을 고정하고, 이후 UI는 토큰을 소비하는 방식으로만 바꾼다.
- 현재 도메인 모델, 라우트, GraphQL 계약, FSD 구조를 건드리지 않는다.
- 시각 언어는 가져오되, 제품 용어와 동작은 현재 코드베이스를 정본으로 둔다.

---

## 배경

현재 `stitch_`에는 Google UI 제작 서비스 기반의 실험 산출물이 여러 화면 단위로 존재한다.

대표적으로 아래 방향성이 반복된다.

- 다크 사이드바 + 밝은 작업 영역
- `Manrope` 헤드라인 + `Inter` 본문/데이터
- muted slate-indigo 계열 포인트 컬러
- `surface` 계층으로 구분하는 tonal layering
- high-density admin console 성격의 카드, 상태칩, 요약 바, 워크플로 스텝퍼

이 방향은 현재 Admin 제품의 IA와 완전히 어긋나지 않으며, 특히 아래 영역에서 개선 여지가 크다.

- 대시보드
- 설정 화면
- 제작 아이템 상세의 상단 워크플로/상태 표현
- 검수·출고·실행 이력 화면의 정보 밀도와 계층

다만 `stitch_`의 산출물은 목업 성격이 강하다.

- 인라인 `tailwind.config` 반복
- 외부 CDN/폰트/placeholder 이미지 의존
- 일부 화면의 용어 불일치
- radius 규칙 혼재
- 디자인 문서의 “no-line” 원칙과 샘플 HTML의 border/shadow 사용 간 불일치

따라서 이번 플랜은 **직접 복사**가 아니라 **시스템화 후 선별 적용**을 전제로 한다.

---

## 참고 기준

디자인 방향의 주된 참고 기준:

- `stitch_/stitch_/automata_blueprint/DESIGN.md`
- `/Users/drew/Downloads/DESIGN.md`
- `stitch_/stitch_/dashboard/code.html`
- `stitch_/stitch_/global_settings/code.html`
- `stitch_/stitch_/job_detail_overview_updated/code.html`
- `stitch_/stitch_/job_detail_ideation_updated/code.html`
- `stitch_/stitch_/job_detail_assets_updated/code.html`
- `stitch_/stitch_/job_detail_publish_updated/code.html`
- `stitch_/stitch_/job_detail_timeline_updated/code.html`

현재 구현 정본:

- `packages/theme/src/colors.css`
- `packages/theme/src/design-tokens.css`
- `packages/theme/src/web-tokens.css`
- `apps/admin-web/src/app/(dashboard)/dashboard-nav.tsx`
- `apps/admin-web/src/_pages/dashboard/ui/dashboard-page.tsx`
- `apps/admin-web/src/_pages/settings/ui/settings-page.tsx`
- `apps/admin-web/src/widgets/settings/ui/settings-section-tabs-card.tsx`
- `apps/admin-web/src/widgets/content-job-detail/ui/shell/content-job-workflow-bar.tsx`
- `docs/admin-client-ia-and-data.md`
- `docs/job-detail-sections-and-data.md`

---

## 목표 상태

이번 롤아웃이 끝나면 다음 상태를 목표로 한다.

- `packages/theme`에 Admin 톤을 표현하는 alias 토큰이 정리되어 있다.
- `apps/admin-web`는 기존 기능과 도메인 구조를 유지하면서도 시각적 일관성이 더 높아진다.
- 화면별 임의 클래스 조합이 아니라 공통 토큰과 공통 UI 패턴을 통해 스타일이 표현된다.
- 대시보드, 설정, 제작 아이템 상세의 “운영 콘솔” 느낌이 강화된다.
- 이후 추가 화면 작업 시 `stitch_`의 개별 HTML이 아니라 이 문서를 기준으로 확장할 수 있다.

이번 단계에서 목표하지 않는 것:

- App Router 구조 변경
- GraphQL 스키마/서버 계약 변경
- 상세 화면의 도메인 모델 재정의
- `stitch_` 화면을 픽셀 단위로 복제하는 작업
- 모든 Admin 화면의 동시 리디자인

---

## 적용 원칙

### 1. 토큰 우선

UI를 먼저 바꾸지 않는다. 색상, 표면 계층, radius, 폰트, emphasis 규칙을 먼저 토큰으로 고정한다.

### 2. 제품 용어 우선

화면 라벨과 흐름은 `docs/admin-client-ia-and-data.md`와 실제 `apps/admin-web` 라우트를 따른다. `stitch_`의 `Items / Queue / Schedule / Connections` 같은 표기는 필요한 경우 패턴만 차용하고, 용어는 그대로 가져오지 않는다.

### 3. 얇은 시각 변경부터

처음부터 새 컴포넌트를 대량 추가하지 않는다. 기존 컴포넌트의 스타일 계층을 정리하고, 반복 패턴이 분명해질 때 공통화한다.

### 4. “No-Line”을 맹신하지 않음

기본 원칙은 tonal layering을 따르되, 접근성/가독성/테이블 구분에 필요한 경우 약한 `ghost border`는 허용한다.

### 5. radius는 작은 쪽으로 통일

`stitch_` 일부 화면의 큰 radius 계열(`0.5rem / 1rem / 1.5rem`)은 채택하지 않는다. 기본은 현재 문서 원칙에 맞는 정밀한 small/medium radius로 유지한다.

### 6. 외부 목업 의존 제거

외부 이미지 URL, Google-hosted placeholder, CDN Tailwind 전제는 제품 코드에 도입하지 않는다.

---

## 1단계: 공통 패키지에 디자인 토큰 적용

### 의도

`packages/theme`에 Admin 전용 시각 언어를 흡수해, 이후 UI 적용 시 화면별 ad-hoc 스타일을 줄인다.

### 대상 범위

- `packages/theme/src/colors.css`
- `packages/theme/src/design-tokens.css`
- `packages/theme/src/web-tokens.css`
- 필요 시 `packages/theme/src/index.ts`와 theme provider 사용 지점

### 반영할 토큰 범주

#### 색상 alias

아래 계층은 현재 토큰 위에 Admin alias로 정리하는 것을 우선 검토한다.

- `admin-primary`
- `admin-primary-container`
- `admin-surface-base`
- `admin-surface-section`
- `admin-surface-card`
- `admin-surface-field`
- `admin-outline-ghost`
- `admin-text-strong`
- `admin-text-muted`
- `admin-status-success`
- `admin-status-warning`
- `admin-status-error`

실제 값은 `stitch_`에서 반복된 slate-indigo 계열과 surface tier를 기반으로 하되, 기존 시스템 토큰과 충돌하지 않게 alias 레이어로 추가한다.

#### 타이포그래피 규칙

- headline/display는 `Manrope`
- body/label/data는 `Inter`
- 숫자와 메트릭은 `Inter` + `tabular-nums` 중심
- section label은 uppercase + tracking 강화

여기서 중요한 것은 폰트 패밀리 추가 자체보다, **어떤 계층에 어느 폰트를 쓰는지**를 공통 규칙으로 정하는 것이다.

#### radius / spacing / depth

- radius는 small~medium 위주로 유지
- 페이지 여백은 넉넉하게, 카드 내부 밀도는 조밀하게
- 표면 분리는 shadow보다 surface tier 차등 우선
- shadow는 floating element에만 약하게 허용

#### interaction emphasis

- primary CTA는 subtle gradient 허용
- secondary/ghost 액션은 surface 대비와 text emphasis로 처리
- input focus는 강한 outline 대신 background shift + 약한 ring 사용

### 산출물

1단계 완료 시 기대 산출물:

- `packages/theme`에 Admin alias 토큰이 추가됨
- Admin Web에서 바로 사용할 토큰 명명 규칙이 문서화됨
- 기존 공통 토큰과 충돌하지 않는 확장 구조가 정리됨

### 구현 메모

- 기존 `--primary`, `--background` 등을 전면 교체하기보다, 먼저 Admin alias를 두고 적용 화면에서 선택적으로 소비한다.
- 필요 시 `data-theme="admin"` 또는 admin 전용 scope 전략을 검토할 수 있지만, 첫 적용은 과한 테마 분기를 만들지 않는 방향이 낫다.
- `packages/theme`는 다른 소비자도 있을 수 있으므로 “기본 의미”를 깨지 않는 변경을 우선한다.

### 완료 기준

- 색상/표면/텍스트 계층을 표현할 토큰 이름이 확정됨
- 대시보드/설정/상세에 공통으로 쓸 수 있는 최소 토큰 셋이 생김
- 화면 코드에서 raw hex 의존을 늘리지 않고 토큰 사용으로 이동할 수 있음

---

## 2단계: 괜찮은 UI 부분만 선별 적용

### 의도

토큰이 준비된 뒤, 현재 제품 흐름과 정합성이 높은 패턴만 골라 얇게 적용한다. 한 번에 전체 리디자인을 하지 않고, 운영 가치가 큰 화면부터 체감 개선을 만든다.

### 이번 라운드에서 고정한 화면 매핑

아래는 이번 대화에서 확정한 기준이다. 후속 구현에서는 이 매핑을 우선 기준으로 삼는다.

- 대시보드: `stitch_/stitch_/dashboard/code.html`의 전반 구성과 사이드 메뉴 스타일을 적극 반영한다.
- 채널 카탈로그: `stitch_/stitch_/channel_catalog/code.html`을 유튜브 채널 페이지 계열에 반영하되, 헤더 아래 3개 카드 섹션은 제외한다.
- 글로벌 설정: `stitch_/stitch_/global_settings/code.html` 구조를 거의 그대로 반영한다.
- 제작 아이템 목록: `stitch_/stitch_/production_items_hub/code.html`을 기준 레퍼런스로 삼는다.
- 제작 아이템 상세 공통: `stitch_/stitch_/job_detail_overview/code.html`을 기본 골격 레퍼런스로 삼는다.
- 제작 아이템 상세 에셋 영역: 공통 골격은 overview를 유지하되, 에셋 관련 작업대와 summary는 `stitch_/stitch_/job_detail_assets/code.html`을 참고한다.

### 공통 shell 우선 반영

특히 아래 공통 패턴은 개별 페이지보다 먼저 재사용 관점에서 정리하는 편이 좋다.

- 다크 사이드바
- 밝은 작업 영역
- 상단 검색/유틸 바
- 페이지 헤더의 라벨 + 대형 타이틀 구조
- surface tier 기반의 카드/섹션 계층

이 공통 shell은 대시보드에서 먼저 톤을 잡고, 이후 채널/설정/제작 아이템 화면으로 확장한다.

### 우선순위

#### 2-1. 대시보드 shell과 대시보드 화면

우선 적용 후보:

- `stitch_/stitch_/dashboard/code.html`

현재 기준 파일:

- `apps/admin-web/src/_pages/dashboard/ui/dashboard-page.tsx`
- `apps/admin-web/src/app/(dashboard)/dashboard-nav.tsx`

적용 목표:

- 대시보드의 전반 구성과 정보 계층을 `dashboard` 시안에 가깝게 조정
- 현재 Admin 전체에 재사용할 사이드 메뉴 스타일의 기준을 여기서 먼저 정리
- KPI/우선순위/병목/채널 요약의 화면 밀도와 강조 순서를 더 분명하게 만듦

유지할 것:

- 현재 `buildDashboardSnapshot` 기반 데이터 모델
- 현재 섹션 분할 구조와 라우트 체계

#### 2-2. 채널 카탈로그

우선 적용 후보:

- `stitch_/stitch_/channel_catalog/code.html`

현재 기준 파일:

- `apps/admin-web/src/_pages/content/ui/content-catalog-page.tsx`
- 관련 채널 상세/운영 페이지들

적용 목표:

- 유튜브 채널 페이지 계열에 카탈로그형 목록 구조와 카드/행 스타일 반영
- 채널 목록을 보다 운영 콘솔다운 catalog view로 정리
- 채널 상태, 플랫폼 연결, 활성 작업 수를 빠르게 읽히게 만듦

제외할 것:

- 헤더 바로 아래의 3개 quick action 카드 섹션은 적용하지 않음

유지할 것:

- 현재 채널 도메인 명칭과 라우트 구조
- 채널 상세 하위 내비게이션 모델

#### 2-3. 설정 화면

우선 적용 후보:

- `stitch_/stitch_/global_settings/code.html`

현재 기준 파일:

- `apps/admin-web/src/_pages/settings/ui/settings-page.tsx`
- `apps/admin-web/src/widgets/settings/ui/settings-section-tabs-card.tsx`
- `apps/admin-web/src/widgets/settings/ui/models-section.tsx`

적용 목표:

- 상단 헤더 아래 “섹션 선택”을 button wrap 나열에서 왼쪽 rail 성격으로 개선
- 오른쪽 편집 패널의 정보 계층 정리
- 설정 화면을 단순 카드 나열이 아닌 운영 설정 콘솔처럼 보이게 만듦

유지할 것:

- `SettingsSection` 기반의 현재 상태 전환 구조
- 데이터 쿼리와 섹션 콘텐츠 컴포지션

#### 2-4. 제작 아이템 목록

우선 적용 후보:

- `stitch_/stitch_/production_items_hub/code.html`

현재 기준 파일:

- `apps/admin-web/src/_pages/jobs-hub/ui/jobs-hub-page.tsx`

적용 목표:

- 제작 아이템 허브를 `Production Items Hub` 기준의 목록 화면으로 정리
- 필터 바, 표 헤더, 상태/진행도/액션 열의 운영 콘솔 느낌을 강화
- 현재 데이터 테이블을 더 읽기 쉬운 high-density hub 화면으로 개선

유지할 것:

- 현재 조회/필터 도메인과 액션 구조
- 현재 제작 아이템 용어와 라우트 모델

#### 2-5. 제작 아이템 상세 공통 골격

우선 적용 후보:

- `stitch_/stitch_/job_detail_overview/code.html`

현재 기준 파일:

- `apps/admin-web/src/_pages/content-job-detail/ui/content-job-detail-page.tsx`
- `apps/admin-web/src/widgets/content-job-detail/ui/shell/content-job-workflow-bar.tsx`
- `apps/admin-web/src/widgets/content-job-detail/ui/shell/content-job-detail-view-content.tsx`
- 관련 shell/header/checklist 계열 컴포넌트들

적용 목표:

- `overview` 페이지의 헤더, 메타, 워크플로, 체크리스트, 상단 요약 구조를 상세 공통 shell의 기준으로 삼음
- 상세 페이지 전반이 “한 화면에서 현재 상태를 조망하는 운영 워크벤치”처럼 보이게 만듦
- 다른 탭에서도 가능한 한 같은 상단 골격을 공유하게 정리

유지할 것:

- `docs/job-detail-sections-and-data.md` 기준의 탭별 데이터 책임
- 현재 상세 라우트 구조와 도메인 액션 흐름

#### 2-6. 제작 아이템 상세 에셋 영역

우선 적용 후보:

- `stitch_/stitch_/job_detail_assets/code.html`

현재 기준 파일:

- `apps/admin-web/src/widgets/content-job-detail/ui/assets/content-job-detail-assets-hub-view.tsx`
- 관련 assets summary / scene asset / render preview 계열 컴포넌트

적용 목표:

- 상세 전체 골격은 overview 기준을 유지하되, assets 탭의 summary bar와 작업대는 `Job Detail - Assets`를 참고
- readiness, provider selector, stage 전환, scene/by-kind 모드 같은 조작부를 더 분명하게 구성
- 에셋 탭을 단순 결과 목록이 아니라 생성/선택/재실행 작업대처럼 보이게 만듦

유지할 것:

- 현재 asset stage, view mode, candidate/selection 액션 모델
- 현재 scene별 에셋/렌더 관련 데이터 흐름

#### 2-7. 나머지 상세 탭 내부 패턴

후순위 적용 후보:

- assets summary bar
- publish review workbench
- timeline table styling

이 단계는 상단 구조와 settings/dashboard가 정리된 뒤 진행한다.

이유:

- 내부 탭 UI는 데이터 상태 수가 많아, 시각 개선 전에 컴포넌트 경계와 역할을 더 조심해서 봐야 한다.

---

## 적용하지 않을 패턴

아래는 의도적으로 제외한다.

- 목업의 외부 placeholder 이미지
- 실제 제품 용어와 맞지 않는 상단 탭 구조
- Scene Designer처럼 현재 제품과 다른 역할 네이밍
- 큰 radius 기반 카드 스타일
- glow/shadow 중심의 decorative 처리
- border-heavy 목업 구현

---

## 구현 순서 제안

### Step A. 토큰 정리

- `stitch_`와 `DESIGN.md`에서 채택할 색상/표면/radius/typography 규칙 확정
- `packages/theme`에 admin alias 토큰 초안 추가
- 기존 컴포넌트와 충돌 여부 확인

### Step B. 토큰 소비 지점 최소 적용

- `apps/admin-web`의 공통 shell 또는 상위 페이지에서 새 토큰 사용 시작
- raw 조합을 공통 토큰 의미로 치환

### Step C. 설정 화면 선반영

- settings section selector와 editor card 계층 정리
- “토큰이 실제로 잘 읽히는지” 첫 검증 포인트로 사용

### Step D. 상세 상단 구조 반영

- workflow bar
- readiness chips
- section header/summary bar

### Step E. 대시보드 시각 개선

- metric 영역
- bottleneck/action queue 계층
- channel summary의 시각 밀도 조정

### Step F. 상세 내부 탭 확장

- publish / timeline / assets 쪽의 요약 바와 작업대 패턴 선별 적용

---

## 작업 단위 제안

실제 구현은 아래처럼 작은 PR/커밋 단위로 나누는 것이 안전하다.

1. `packages/theme` 토큰 추가
2. settings 화면 스타일 개선
3. job detail 상단 shell 개선
4. dashboard 카드/섹션 계층 개선
5. publish/timeline/asset summary 등 후속 패턴 반영

이 순서를 추천하는 이유:

- 토큰 문제가 있으면 초기에 수정 가능
- settings는 상태 모델이 비교적 단순해 시각 실험에 적합
- job detail은 사용자 체감이 크지만 도메인 복잡도가 높아 토큰 정착 후 들어가는 편이 안전

---

## 검증 기준

### 기능 정합성

- 라우트, 탭 전환, 쿼리 상태, 버튼 동작이 기존과 동일해야 함
- GraphQL 계약과 폼 저장 흐름에 영향이 없어야 함

### 시각 정합성

- 같은 중요도의 CTA가 같은 강조 규칙을 사용함
- 카드/섹션/입력 필드의 표면 계층이 일관됨
- headline/body/data의 타이포 역할이 일관됨

### 확장성

- 새 화면에서 재사용 가능한 토큰 이름이어야 함
- 화면별 임시 hex/class 복붙이 늘어나지 않아야 함

### 접근성/가독성

- border를 줄이더라도 구분성이 유지되어야 함
- muted 톤을 쓰더라도 텍스트 대비가 충분해야 함

---

## 리스크와 대응

### 1. 토큰 추가가 기존 theme semantics를 흐릴 수 있음

대응:

- 기존 semantic token을 강제로 바꾸지 말고 alias 토큰으로 시작
- 적용 화면을 좁혀 검증 후 확장

### 2. `stitch_`의 예쁜 패턴이 실제 제품 정보량과 맞지 않을 수 있음

대응:

- 구조보다 “계층 표현 방식”만 우선 차용
- 기존 데이터 밀도와 상태 개수는 제품 기준 유지

### 3. 상세 화면은 도메인 복잡도가 높아 표면만 바꾸다 꼬일 수 있음

대응:

- shell/header/workflow처럼 비교적 독립적인 부분부터 적용
- 본문 편집 영역은 후순위로 둠

### 4. radius/spacing/typography가 화면별로 다시 흔들릴 수 있음

대응:

- 문서에 채택 규칙과 제외 규칙을 함께 명시
- 첫 단계에서 토큰 명칭과 사용 원칙을 고정

---

## 첫 구현 시 체크리스트

- `stitch_`에서 채택할 값과 버릴 값을 먼저 명시했는가
- `packages/theme`에 alias 토큰이 추가되었는가
- settings 화면부터 토큰 소비가 시작되었는가
- job detail 상단은 도메인 로직 변경 없이 시각 계층만 개선했는가
- dashboard는 현재 snapshot 모델을 유지했는가
- raw hex / ad-hoc gradient / 임시 shadow 사용이 늘어나지 않았는가

---

## 후속 문서 연결

관련 구현 진행 시 함께 볼 문서:

- `docs/admin-client-ia-and-data.md`
- `docs/job-detail-sections-and-data.md`
- `docs/recent-work-summary.md`
- `docs/plans/admin-improvement-direction-cursor-handoff.md`

이 플랜의 역할은 “디자인 언어 적용 순서와 경계”를 고정하는 것이다. 도메인 모델 재정의나 상세 워크벤치의 장기 방향은 위 문서들을 정본으로 함께 본다.
