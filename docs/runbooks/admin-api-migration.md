# Admin API Migration Runbook

## 목적

REST publish API와 신규 GraphQL admin API를 병행 운영하며 무중단 전환한다.

## 단계

1. GraphQL + Cognito를 배포한다.
2. Query(`adminJobs`, `adminJob`, `pendingReviews`, `jobTimeline`)부터 운영 검증한다.
3. Mutation(`submitReviewDecision`, `requestUpload`)을 운영자 일부 계정으로 검증한다.
4. 기존 REST(`/review`, `/upload`)는 fallback 용도로 유지한다.
5. 운영 안정화 후 REST deprecate 일정을 확정한다.

## 확인 체크리스트

- Cognito 로그인 토큰으로 GraphQL Query 호출 성공
- Admin 그룹 없는 계정의 Mutation 호출 차단 확인
- `submitReviewDecision` 호출 시 Step Functions task token 정상 완료
- `requestUpload` 호출 시 DDB 업로드 상태 전이 확인
- CloudWatch에서 resolver 에러율 및 lambda 오류율 이상 없음
