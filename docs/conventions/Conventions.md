# Conventions (AI) — 빠른 룰셋

이 문서는 **AI/리뷰 시 빠르게 참고할 규칙만** 담는다. (단일 룰 소스)  
경계/시각화는 `docs/conventions/Conventions-Human.md`를 본다.

목표는 “빠른 개발”이 아니라 **사고를 막기 위한 경계 고정**이다.  
특히 `usecase ↔ repo ↔ normalize ↔ mapper` 경계는 한 번 흐려지면,
스토리지 전환(Aurora 등)/스키마 변화/권한 정책 추가 시 파급이 폭발한다.

---

## 1) 기본 구조(고정)

- **`services/<domain>/handler.ts`**: transport 파사드. *라우팅 + deps 조립 + 에러 변환*만 한다.
- **`services/<domain>/<field>/index.ts`**: 입력 파싱/검증 + usecase 호출만 한다.
- **`services/<domain>/<field>/usecase/`**: 정책/흐름(비즈니스). repo를 호출하고 normalize+mapper로 DTO를 만든다.
- **`services/<domain>/common/repo/`**: I/O 경계. DB/AWS SDK를 숨긴다. (DB뿐 아니라 S3/Bedrock 등도 repo로 감싼다)
- **`services/<domain>/common/normalize/`**: “unknown/raw → 도메인 타입”을 **한 번만** 고정한다.
- **`services/<domain>/<field>/mapper/`** (또는 `common/mapper/`): 도메인 타입 → API DTO 변환. **순수 함수**.
- **`services/<domain>/common/model/`**: 도메인 공용 인터페이스(타입) 모음. (`generated/graphql` import 금지)

### 생성 코드가 컨벤션을 따르는지 빠르게 확인

1. `usecase`에 `event`가 보이는가? → ❌
2. `repo`가 `generated/graphql`를 import 하는가? → ❌
3. `mapper`에서 `asRecord`/`toBool`/`unknown`이 보이는가? → ❌
4. `normalize`가 두 번 호출되는가? → ❌
5. fallback/권한/분기 정책이 normalize에 있는가? → ❌ (usecase로 이동)
6. DomainDeps에 AWS SDK client / env var 문자열이 보이는가? → ❌ (repo로 감싸고 wiring에서만 다룬다)

---

## 2) transport(핸들러) 규칙

handler는 “transport 어댑터”다. 도메인 로직이 event/http shape에 물들지 않게
**최소 역할만 가진다**.

### 라우팅

- **AppSync(GraphQL)**: `event.info.fieldName` 기반으로 **모듈 스코프 `routes`**에서 찾는다.
- **HTTP API(APIGW v2)**: `routeKey = "<METHOD> <path>"` 기반으로 **모듈 스코프 `routes`**에서 찾는다.
- unknown route/field는 명확한 에러(`UnknownFieldError` 또는 404)로 처리한다.
- 에러 변환(`toGraphqlError`/`toHttpError`)은 **handler에서만** 한다. (노출 정책 통일)

### AppSync 이벤트 파싱(공통 유틸 사용)

`services/shared/lib/auth/appsyncEvent.ts`만 사용한다.

- `getFieldNameFromAppSyncEvent(event)`
- `getArgumentsFromAppSyncEvent(event)`
- 문자열 파싱은 **정책을 이름으로 고정**
  - `getNonEmptyStringArg(args, name)` (빈 문자열 → null)
  - `getOptionalStringArg(args, name)` (빈 문자열 허용)

### 인증

- handler는 raw event/http를 **route context**로 변환하고, `<field>/index.ts`는 그 context만 받는다.
- “requesterSub가 필수인 field”는 `<field>/index.ts`에서 `mustRequesterSub(...)`로 한 번 더 고정할 수 있다.
- usecase는 `requesterSub: string`을 신뢰한다.

### HTTP API: CORS / OPTIONS

- 브라우저 클라이언트가 있는 경우, `OPTIONS` 프리플라이트는 **route에서 명시 처리**한다.
- CORS 헤더(`access-control-allow-origin`)는 성공/에러 응답 모두에 일관되게 붙인다.
- `handler.ts`는 body/query를 로그에 남기지 않는다. (토큰/PII 유출 방지)

---

## 3) deps/DI 규칙

- **핸들러(요청 처리 함수) 내부에서 클라이언트 생성 금지** (ddb/bedrock/s3/pg 등)
- 모듈 스코프에서 `infra`(AWS SDK + tableName/bucketName + env 값 등) 조립
- repo 구현체를 만들어 `DomainDeps`로 주입

### 무엇을 DomainDeps에 넣나

- ✅ Repo 인터페이스(구현체는 `common/repo/*`)
- ✅ Clock/UUID 같은 순수 인프라 추상화
- ❌ AWS SDK Client (S3Client, DynamoDBClient 등)
- ❌ AppSync event / HTTP event
- ❌ 환경변수 문자열(테이블명/버킷명 등). 이는 repo 구현체의 wiring에서만 사용

> 예외를 만들고 싶어지면: “repo를 하나 더 만든다”가 기본 답이다.

---

## 4) repo(Repository) 규칙

### 한 문장 정의

**Repository = “유스케이스가 DB를 몰라도 데이터를 다룰 수 있게 해주는 계약(인터페이스)”**

### repo가 해야 할 일

- DB/AWS SDK 호출
- **Raw item을 반환**한다. (예: `UserItem | null`)
- normalize는 **usecase가 호출**한다. (정책 고정 지점)

### repo가 하면 안 되는 일

- GraphQL DTO 반환 (mapper가 한다)
- fallback/권한/정책 결정 (usecase가 한다)

### 네이밍

- `find*` = 없으면 `null`
- `get*` = 없으면 예외 (필요 시에만)

---

## 5) normalize 규칙

- raw(DDB item/unknown)를 **한 번만** normalize해서 도메인 타입으로 고정한다.
- `profileJson` 같은 “클라이언트가 깨지기 쉬운 값”은 normalize에서 방어한다.
- normalize는 **정책이 아니라 데이터 방어**다. (fallback/권한/분기 = usecase)

### 책임 고정 (선택: A안)

- **repo**: raw item 반환 (`UserItem | null`)
- **usecase**: `normalizeUserItem(item)` 호출
- **mapper**: normalize 결과만 변환

---

## 6) mapper 규칙

- 입력: 도메인 타입 (`NormalizedUser`)
- 출력: GraphQL DTO (`Me`, `User`)
- 순수 함수(네트워크/DB/시간 의존 금지)

---

## 7) 에러 처리 규칙

- `AppError + ErrorCode` 사용
- 외부 서비스 에러는 `Error.cause`로 보존
- handler에서 `toGraphqlError`/`toHttpError`로 변환 (노출 정책 통일)

---

## 8) DynamoDB

- **Pagination**: `encodePaginationToken` / `decodePaginationToken` 사용, nextToken은 `null` 반환
- **ExpressionAttributeNames**: 예약어/키는 반드시 매핑해서 사용
- **BatchWrite**: `UnprocessedItems`는 최소 warning 로그

---

## 9) 테스트 기준

- repo mock으로 usecase 테스트 (AWS SDK 모킹 지양)
- normalize/mapper는 순수 함수 단위 테스트 가능하게 유지

---

## 10) 금지 목록 (생성/리팩터링 시 흔들림 방지)

- **`usecase/`**: AppSync event 접근 금지
- **`mapper/`**: normalize 금지 (변환만)
- **`repo/`**: `generated/graphql` import 금지
- **`common/model/`**: `generated/graphql` import 금지
- **`DomainDeps`**: AWS SDK client / env var 문자열 금지 (repo로 감싸기)

---

## 11) transport 유틸 경로 고정

- AppSync transport 유틸의 **단일 위치**는 `services/shared/lib/auth/appsyncEvent.ts`
- 이 파일 외에 “비슷한 파서/헬퍼”를 새로 만들지 않는다. (중복 생성 금지)

---

## 12) 템플릿 (생성 시 흔들림 방지)

### 12.1 새 field 추가 체크리스트

- `/<field>/index.ts`: args parse + input 구성
- `/<field>/usecase/*`: 정책/흐름
- `/<field>/mapper/*`: DTO 변환
- `handler.ts`: `routes`에 등록

### 12.2 정책을 어디에 두나

- **fallback/권한/분기 정책**: usecase
- **default/정합성/방어(예: JSON 깨짐 방지)**: normalize
- **출력 형태/nullable 규칙**: mapper

---

## 13) usecase 모범사례 (createMe 기준)

**usecase는 정책 흐름만** 담고, 절차(조회/업데이트/재조회/예외 삼키기)는 policies로 분해한다.

### 디렉터리 구조

```
<field>/
  usecase/
    <field>Usecase.ts     ← 얇게 (시나리오만)
    policies/             ← 정책 단위 모듈
  model/
    auth-context.ts       ← Context 타입 (필요 시)
```

### usecase 본문 원칙

- **입력 → Context**: `makeAuthContext(deps, input)`로 nowIso/provider/nickname/email 1회 계산
- **정책만 노출**: "linkedUserId 있으면 그걸로", "있으면 touch, 없으면 ensure" 같은 시나리오만
- **절차는 policies로**: update 후 재조회, catch {} 같은 I/O 세부는 policy 함수에 숨김

### policies 규칙

- 각 파일은 **한 정책**만 담당 (40~80줄 내외)
- Context 타입은 **하나로 통합** (`AuthContext`). 필요 시 `AuthContextWithEmail`처럼 좁혀 쓴다
- "무시 가능한 실패"는 `ignore()` 유틸로 고정 (catch {} 확산 방지)
- repo raw 응답 정리(id 추출 등)는 `common/lib` 유틸로 분리 (`extractUserId`)

### 금지

- usecase 본문에 `try/catch` + 빈 catch
- Context 타입이 파일마다 중복 정의
- 정책 파일을 `lib`에 두기 (lib = 순수 유틸, policies = 정책)

---

## 14) “누가 무엇을 알아야 하는가” 경계표(요약)

| 레이어              | AppSync/HTTP event |    AWS SDK | DB 스키마 |        정책 | generated/graphql |
| ------------------- | -----------------: | ---------: | --------: | ----------: | ----------------: |
| `handler.ts`        |                 ✅ | 🔶(wiring) |        ❌ |          ❌ |                ❌ |
| `<field>/index.ts`  | 🔶(ctx/event 최소) |         ❌ |        ❌ |          ❌ |                ❌ |
| `usecase/`          |                 ❌ |         ❌ |        ❌ |          ✅ |                ❌ |
| `common/repo/`      |                 ❌ |         ✅ |        ✅ |          ❌ |                ❌ |
| `common/normalize/` |                 ❌ |         ❌ |        ❌ | 🔶(default) |                ❌ |
| `usecase/policies/` |                 ❌ |         ❌ |        ❌ |          ✅ |                ❌ |
| `mapper/`           |                 ❌ |         ❌ |        ❌ |          ❌ |                ✅ |

🔶 = “직접 의존하지 말고, 필요한 최소 값만 받는다 / wiring에서만 안다”

---

## 15) 현재 코드베이스에 바로 적용할 리팩토링 우선순위

이 문서는 원칙 설명으로 끝나면 안 된다. 아래 순서는 **현재 코드베이스에서 회귀 위험을 낮추면서**
컨벤션을 다시 고정하기 위한 **실행 순서**다.

### Phase 1. 큰 파일부터 “경계 복구”

우선순위는 “자주 바뀌는 곳”이 아니라 **I/O + 정책 + DTO 변환이 한 파일에 섞인 곳**이다.

- **1순위: 렌더링/합성 런타임**
  - 대상 예: `services/composition/fargate-renderer/index.mjs`
  - 현재 위험: env 파싱, S3 입출력, ffmpeg 실행, subtitle/renderPlan 기본값 보정, 결과 업로드가 한 파일에 섞여 있음
  - 목표 구조:
    - `index.ts|mjs`: `run()` 오케스트레이션만
    - `usecase/`: preview/final render 시나리오, 분기, 상태 전이
    - `repo/`: S3 다운로드/업로드, 외부 렌더 provider, ffmpeg 실행 래퍼
    - `normalize/`: renderPlan, subtitle style, media frame 등 raw 설정 보정
    - `mapper/`: 실행 결과를 저장/응답 DTO로 변환

- **2순위: Job detail 조회/조립 흐름**
  - 대상 예:
    - `services/admin/jobs/get-job-draft/repo/get-job-draft.ts`
    - `services/admin/shared/repo/job-draft-store.ts`
    - `services/admin/shared/mapper/map-job-draft-detail.ts`
  - 현재 위험: repo가 raw 조회를 넘어서 Scene JSON 정렬/보정, asset candidate DTO 조립까지 수행함
  - 목표 구조:
    - `repo/`: DDB/S3/raw item 조회만
    - `normalize/`: scene json, render artifact, asset candidate raw 값 방어
    - `mapper/`: admin GraphQL DTO 변환
    - `usecase/`: 어떤 source를 우선 조합할지, fallback 규칙, 섹션별 합성 정책

- **3순위: GraphQL field별 handler/index/usecase 분리 미완료 구간**
  - 대상: `services/admin/graphql/**`, `services/admin/jobs/**`
  - 현재 위험: field entry에서 auth/event parsing, 상태 전이, store 호출이 섞일 가능성
  - 목표: field 단위 `index.ts`는 args parse + context 고정 + usecase 호출만 남긴다

### Phase 2. DTO와 도메인 타입 분리

구조를 나눈 뒤 바로 해야 하는 작업은 **raw / domain / API DTO 분리**다.

- `repo` 반환값은 raw item 또는 storage model로 유지
- `normalize`에서 raw를 도메인 타입으로 1회 고정
- `mapper`에서만 GraphQL DTO를 생성
- `common/model/`에는 도메인 공용 타입만 둔다
- `generated/graphql` 타입은 mapper 바깥으로 새지 않게 막는다

### Phase 3. 계약 고정

shape가 자주 바뀌는 입력/출력은 코드보다 먼저 계약을 고정한다.

- client / resolver / persistence가 함께 쓰는 입력은 shared `zod` schema부터 만든다
- 타입은 `z.infer` 우선, 중복 handwritten DTO는 줄인다
- GraphQL 인자 파싱, form validation, 저장 payload가 같은 계약을 보게 맞춘다

---

## 16) 현재 코드에서 보이면 바로 리팩토링해야 하는 냄새

### 렌더링/미디어 파이프라인

- 한 파일에서 `process.env` 읽기 + provider 호출 + 파일 시스템 작업 + 상태 계산을 같이 한다
- ffmpeg/ffprobe 명령 조립이 usecase 본문에 있다
- subtitle/burn-in/default style 보정이 실행 코드 중간중간 흩어져 있다
- preview/final render 분기와 artifact 업로드 규칙이 같은 함수에 붙어 있다

### Admin job detail/read model

- repo가 `SceneJson -> DTO` 매핑까지 한다
- repo가 candidate 선택 상태 계산까지 한다
- usecase 없이 “조회 함수 하나”가 모든 조합 책임을 갖는다
- mapper 전에 `unknown`, 문자열/null 방어, subtitle/narration 정렬이 여러 번 일어난다

### GraphQL resolver/handler

- field resolver가 store/repo를 직접 여러 개 호출한다
- auth/event shape를 usecase까지 전달한다
- 에러 노출 정책이 handler 밖으로 퍼진다

---

## 17) 영역별 적용 가이드

### 17.1 렌더링 축

렌더링은 “무거운 파일 하나를 잘 정리”하는 문제가 아니라, **실행 흐름과 외부 경계를 분리**하는 문제다.

- **`index.ts|mjs`**
  - 입력 읽기
  - deps 조립
  - `run(deps, input)` 호출

- **`usecase/`**
  - preview / final render 시나리오 분리
  - burn-in 여부, asset 준비 여부, fallback media 선택 같은 정책 보유
  - 결과 artifact를 어떤 이름/단계로 저장할지 결정

- **`repo/`**
  - S3 get/put/download/upload
  - ffmpeg/ffprobe wrapper
  - 외부 renderer API wrapper

- **`normalize/`**
  - renderPlan 출력 크기/fps 기본값
  - subtitle style/font/opacity/maxWidth 기본값
  - 색상/좌표/비율 보정

- **`mapper/`**
  - render result -> 저장 payload / 응답 모델

### 17.2 Job detail 조회 축

`getJobDraft`류 코드는 “읽기 전용이니 괜찮다”가 아니다. 읽기 모델도 경계가 흐려지면
UI 탭 추가 때마다 repo가 비대해진다.

- **`repo/`**
  - job meta, content brief, job brief, job plan, scene json, assets, render artifacts raw 조회

- **`normalize/`**
  - scene json의 narration/subtitle 정렬
  - nullable/string/raw field 방어
  - render artifact/provider field 정규화

- **`mapper/`**
  - `JobDraftDetailDto`
  - `SceneAssetDto`
  - candidate DTO

- **`usecase/`**
  - 어떤 brief를 우선 노출할지
  - `assetMenuModel` fallback 우선순위
  - overview/scene/assets/publish/timeline에서 재사용할 조합 정책

### 17.3 field 생성/수정 축

새 field를 만들거나 기존 field를 고칠 때는 아래 순서로 고정한다.

1. shared contract (`zod`) 정의
2. `<field>/index.ts`에서 args parse
3. `<field>/usecase/`에 정책 배치
4. `common/repo/`에 외부 I/O 구현
5. `normalize/mapper/` 추가
6. `handler.ts` routes 등록

---

## 18) 리팩토링 단위 규칙

한 번에 “도메인 전체 리팩토링”을 하지 않는다. 아래 단위로 자른다.

- **단위 1: handler thin-out**
  - handler에서 로직 제거
  - 입출력 계약 유지

- **단위 2: repo 추출**
  - AWS SDK / S3 / DDB / provider 호출 이동
  - `DomainDeps`에는 repo interface만 남김

- **단위 3: normalize 추출**
  - raw/null/string 방어 로직 이동
  - 중복 normalize 호출 제거

- **단위 4: mapper 추출**
  - GraphQL DTO / 응답 shape 변환 이동

- **단위 5: usecase/policies 분해**
  - fallback/권한/상태 전이 분리
  - 절차 세부는 policy 함수에 숨김

---

## 19) PR/리뷰 체크 질문

리팩토링 PR에서는 기능 추가 설명보다 아래 질문이 먼저 통과되어야 한다.

1. handler가 transport 역할만 하는가
2. repo가 raw item만 다루고 정책을 모르나
3. normalize가 data defense만 하고 policy를 모르나
4. mapper가 DTO 변환만 하나
5. usecase가 event/AWS SDK/env 문자열을 모르나
6. 기존 event contract와 response shape가 유지되나
7. 테스트가 repo mock 기준으로 작성되었나

---

## 20) 실행 순서 문서

현재 저장소 기준 추천 착수 순서와 진행 상태는 `docs/refactoring-start-order.md`에서 관리한다.
`Conventions.md`는 원칙과 경계 고정에 집중하고, 실행 백로그는 별도 문서로 분리한다.

---

## 21) 회귀 방지 강제 규칙

현재 상태를 유지하려면 “좋은 예시가 있다” 수준으로는 부족하다. 아래는 **새 코드/수정 코드에서 바로 차단해야 하는 규칙**이다.

### 21.1 admin field entry 강제 규칙

- `services/admin/<domain>/<field>/index.ts`는 기본적으로 `runAuditedAdminResolver(...)`를 사용한다.
- field entry에서 `logResolverAudit`, `toGraphqlResolverError`, `assertAdminGroup`, `getActor`를 직접 호출하지 않는다.
- audit metadata는 `resolver-audit-fields.ts` helper로만 구성한다.
- `index.ts`에서 store/repo/provider를 직접 호출하지 않는다.
- raw failure cause 로깅이 필요하면 `onError` + 별도 helper를 만들고, entry 파일 본문은 계속 얇게 유지한다.

### 21.2 helper 승격 기준

- 같은 흐름이 **2번 보이면 3번째 전에** shared helper로 승격한다.
- image/video/voice처럼 sibling field가 같은 골격을 가지면 처음부터 shared helper를 검토한다.
- `stageType`, `modality`, `candidate kind`처럼 3개 이상 분기하는 규칙은 inline `if/else`로 늘리지 않고 shared rule module 또는 `policies/`로 이동한다.
- update/persist payload에서 5개 이상 필드를 복사하면 usecase 밖 `mapper/` 또는 `repo/` helper로 이동한다.
- raw load가 두 개 이상 묶이면 `load*Context`, guard가 두 개 이상이면 `assert*`로 이름을 고정한다.

### 21.3 리뷰 차단 질문

아래 중 하나라도 “예”면 추가 구현보다 먼저 구조를 다시 자른다.

1. `index.ts`에 auth/audit/error 변환 코드가 다시 생겼는가
2. `usecase`가 `process.env`, AWS SDK client, raw event를 다시 알게 되었는가
3. sibling field 사이에 거의 같은 코드가 두 벌 이상 생겼는가
4. `stageType`/`modality`/`candidate` 분기가 새 usecase 안에서 다시 커졌는가
5. mapper로 뺄 수 있는 payload 조립이 usecase 본문에 남았는가

---

## 22) Cursor Rule 적용 맵

AI가 같은 경계를 계속 따르도록 아래 rule을 유지한다.

- 항상 적용:
  - `services-handler-convention.mdc`
  - `api-zod-contracts.mdc`
- 파일 범위 적용:
  - `admin-resolver-entry-convention.mdc` → `services/admin/*/*/index.ts`
  - `service-usecase-orchestration.mdc` → `services/**/usecase/**/*`
  - `admin-shared-pattern-promotion.mdc` → `services/admin/**/*`
- 자동 점검:
  - `yarn check:service-boundaries`
  - 현재는 `services/admin/<domain>/<field>/index.ts`가 wrapper/audit 규칙을 어기는지 먼저 차단한다.

규칙이 충돌하면 **더 좁은 범위의 rule이 우선**이고, 그래도 애매하면 `Conventions.md`의 경계 원칙을 기준으로 판단한다.
