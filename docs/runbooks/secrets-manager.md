# Secrets Manager Setup Guide

## 목적

운영에 필요한 API Key/OAuth 자격 증명을 AWS Secrets Manager에 일원화하고,
Lambda/CDK에서 안전하게 참조하는 기준을 정의한다.

## 현재 코드 기준: 실제 사용 중인 시크릿

아래 4개는 이미 코드에서 참조 중이다.

- `automata-studio/openai`
  - 소비처: `services/shared/lib/providers/media/openai-image.ts`
- `automata-studio/runway`
  - 소비처: `services/shared/lib/providers/media/runway-video.ts`
- `automata-studio/elevenlabs`
  - 소비처: `services/shared/lib/providers/media/elevenlabs-voice.ts`
- `automata-studio/shotstack`
  - 소비처: `services/shared/lib/providers/media/shotstack.ts`

참조 방식:

- `env/config.json`의 `openAiSecretId`, `runwaySecretId`, `elevenLabsSecretId`, `shotstackSecretId`
- 런타임에서 `getSecretJson(secretId)`로 조회 (`services/shared/lib/aws/runtime.ts`)

## Google 로그인 관련 (추가 권장)

현재 Admin 로그인은 Cognito Hosted UI(기본 Cognito user pool) 기반이며, Google IdP 연동은 아직 미구현이다.
Google 소셜 로그인을 붙일 계획이면 아래 시크릿을 추가한다.

- `automata-studio/google-oauth-admin`
  - 용도: Cognito User Pool의 Google Identity Provider 설정
  - 예상 소비처: `lib/modules/publish/auth.ts` (향후 `UserPoolIdentityProviderGoogle` 도입 시)

권장 JSON:

```json
{
  "clientId": "google-oauth-client-id",
  "clientSecret": "google-oauth-client-secret",
  "scopes": "openid email profile"
}
```

## 시크릿 JSON 스키마 권장안

### 1) OpenAI Image

```json
{
  "apiKey": "sk-...",
  "model": "gpt-image-1",
  "size": "1024x1024",
  "endpoint": "https://api.openai.com/v1/images/generations"
}
```

### 2) Runway Video

```json
{
  "apiKey": "rw_...",
  "model": "gen4_turbo",
  "endpoint": "https://api.dev.runwayml.com/v1/video_generations"
}
```

### 3) ElevenLabs Voice

```json
{
  "apiKey": "el_...",
  "voiceId": "voice-id",
  "modelId": "eleven_multilingual_v2",
  "endpoint": "https://api.elevenlabs.io/v1/text-to-speech/{voiceId}"
}
```

### 4) Shotstack

```json
{
  "apiKey": "shotstack-api-key",
  "endpoint": "https://api.shotstack.io/stage/render"
}
```

### 5) Google OAuth (Admin)

```json
{
  "clientId": "google-client-id.apps.googleusercontent.com",
  "clientSecret": "google-client-secret",
  "scopes": "openid email profile"
}
```

## 네이밍 규칙

환경 구분이 필요한 경우 아래 패턴을 권장한다.

- `<projectPrefix>/<provider>/<stage>`
- 예: `automata-studio/openai/prod`, `automata-studio/google-oauth-admin/prod`

단일 환경이면 현재처럼 `<projectPrefix>/<provider>`를 유지해도 된다.

## 생성/수정 절차 (AWS CLI)

### 생성

```bash
aws secretsmanager create-secret \
  --name "automata-studio/openai" \
  --secret-string '{"apiKey":"...","model":"gpt-image-1","size":"1024x1024"}'
```

### 수정

```bash
aws secretsmanager put-secret-value \
  --secret-id "automata-studio/openai" \
  --secret-string '{"apiKey":"...","model":"gpt-image-1","size":"1024x1024"}'
```

### 확인

```bash
aws secretsmanager get-secret-value \
  --secret-id "automata-studio/openai" \
  --query SecretString \
  --output text
```

## IAM 최소 권한 원칙

- Lambda Runtime Role
  - `secretsmanager:GetSecretValue`를 필요한 secret ARN에만 허용
- CDK Deploy Role (Google IdP 연동 시)
  - Google OAuth 시크릿 조회 권한 필요 (`GetSecretValue`)

리소스 범위는 `*` 대신 명시 ARN 사용을 권장한다.

## 주의사항

- `NEXT_PUBLIC_*` 값은 브라우저에 노출되는 공개 값이므로 Secrets Manager 대상이 아니다.
  - 예: `NEXT_PUBLIC_APPSYNC_GRAPHQL_URL`, `NEXT_PUBLIC_COGNITO_USER_POOL_ID`
- 실제 비밀값(API key/client secret)만 Secrets Manager에 저장한다.
- 로그에 시크릿 원문 출력 금지.

## 적용 체크리스트

- [ ] 4개 생성 API 시크릿 존재 확인 (openai/runway/elevenlabs/shotstack)
- [ ] `env/config.json`의 secret id와 실제 Secrets Manager name 일치 확인
- [ ] Lambda role에 최소 `GetSecretValue` 권한 반영 확인
- [ ] (선택) Google OAuth 시크릿 생성
- [ ] (선택) Cognito Google IdP 연동 코드 반영 후 로그인 검증
