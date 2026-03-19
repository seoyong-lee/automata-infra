# Admin Web Migration Context

## 목적

이 문서는 `apps/admin-web`를 현재 레포에 추가할 때, 장기 확장 시에도 맥락이 끊기지 않도록 의사결정과 경계를 기록한다.

## 왜 같은 레포에 두는가

- 현재 인프라(CDK), 런타임(Lambda), GraphQL 스키마(AppSync)가 동일 저장소에 존재한다.
- 어드민 웹은 GraphQL 스키마와 Cognito 구성이 강하게 결합되어 있어 동시 변경 검증이 필요하다.
- 초기 단계에서는 배포/디버깅 일관성이 분리 레포 이점보다 크다.

## Monorepo to Polyrepo Adaptation

- 원본 참조: `desktop/storytalk-web/apps/admin` (모노레포).
- 현재 저장소는 폴리레포 운영이므로, 필요한 패키지를 `packages/*`로 선별 이식한다.
- 이식 우선순위:
  1. `@packages/auth` (Cognito 로그인 세션 처리)
  2. `@packages/graphql` (AppSync 호출/쿼리 훅)
  3. `@packages/theme` (ThemeProvider)
  4. `@packages/config` (앱 tsconfig 공통)
  5. `@packages/utils` (공통 유틸 최소셋)

## 경계 규칙

- `apps/admin-web`는 UI/페이지/상태 관리만 담당한다.
- GraphQL 호출과 인증 세션 처리는 `packages/*` 경계 밖으로 분리한다.
- 파이프라인 도메인 로직(승인, 업로드 상태 전이)은 서버 리졸버/Lambda에서 유지한다.

## 단계적 확장 원칙

1. 최소 동작: 로그인/콜백/리뷰 조회/승인
2. 운영 기능: 필터/검색/타임라인/업로드 요청
3. 분석 기능: 비용/실패율/처리시간 대시보드
4. 팀 분리 시점: 필요하면 `apps/admin-web`를 별도 레포로 분리

## 운영 체크포인트

- Cognito 환경변수와 AppSync endpoint 동기화
- Admin 그룹 기반 mutation 권한 확인
- 승인 액션이 StepFunctions task token 응답까지 이어지는지 확인
- REST fallback(`PublishApi`)는 이행 기간 동안 유지
