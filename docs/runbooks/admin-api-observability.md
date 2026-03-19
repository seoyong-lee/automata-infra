# Admin API Observability Notes

## 기본 출력값

- `PublishApiUrl` (legacy REST)
- `AdminGraphqlUrl`
- `AdminUserPoolId`
- `AdminUserPoolClientId`

## 핵심 모니터링 포인트

- AppSync 4xx/5xx 에러율
- GraphQL resolver Lambda 오류율
- `submitReviewDecision` 처리 지연
- `requestUpload` 상태 전이 실패

## 운영 권장

- AppSync 로그는 ERROR 레벨 유지
- Mutation 관련 Lambda 에 구조화 로그(`jobId`, `actor`, `action`) 포함
- 배포 후 `scripts/admin-guards-smoke.ts`, `scripts/admin-graphql-smoke.ts` 실행
