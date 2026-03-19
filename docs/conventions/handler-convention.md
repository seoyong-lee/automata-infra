# Handler Convention

`services` 런타임 코드는 아래 구조를 기본값으로 유지한다.

## 목적

- Lambda 엔트리포인트를 단순화한다.
- 도메인 흐름과 I/O 경계를 분리해 확장성을 높인다.
- 변경 범위를 줄여 회귀 위험을 낮춘다.

## 기본 구조

```txt
services/<domain>/
├── handler.ts        # AWS Lambda entry only
├── index.ts          # orchestrator(run)
├── usecase/          # business flow
├── repo/             # DB/S3/API I/O
├── normalize/        # input normalization (pure)
└── mapper/           # provider/output mapping (pure)
```

## 파일별 역할

- `handler.ts`: `export const handler = run` 형태를 유지한다.
- `index.ts`: 입력을 받아 단계 호출만 수행한다.
- `usecase/`: 상태 전이 포함 도메인 흐름을 관리한다.
- `repo/`: 외부 시스템 접근만 담당한다.
- `normalize/`, `mapper/`: 부수효과 없는 순수 함수로 유지한다.

## 적용 규칙

- `services/**/*.ts`는 named export만 사용한다.
- 핸들러에서 provider, store를 직접 호출하지 않는다.
- 공통 로직은 `services/shared/lib/**`로 이동한다.
- 리팩터링 시 이벤트 계약(입출력 shape)은 유지한다.

## 점진적 확장 방식

1. 새 서비스는 처음부터 위 구조로 생성한다.
2. 기존 서비스는 `handler.ts -> index.ts` 분리부터 적용한다.
3. 로직이 커지면 `index.ts`에서 `usecase/`, `repo/`로 단계 분리한다.
