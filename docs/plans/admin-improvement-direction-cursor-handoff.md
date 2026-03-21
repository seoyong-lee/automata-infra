# Admin 개선 방향 정리 (Cursor 전달용)

**한 줄 요약:** 단순 UI 손질이 아니라 **도메인 단위 재정의 + 상세 화면 구조 개편 + 후보/채택/실행 분리**가 목표다.

관련 문서: 짧은 IA·탭 초안은 [`admin-client-revision-workbench.md`](./admin-client-revision-workbench.md), **후보·채택·continuation·검수 설계안 대비 구현 추적**은 [`admin-pipeline-workbench-continuation-review.md`](./admin-pipeline-workbench-continuation-review.md), 전체 아키텍처 실행 기준은 [`../implementation-overview-external-review.md`](../implementation-overview-external-review.md), 최근 구현 스냅샷은 [`../recent-work-summary.md`](../recent-work-summary.md).

---

## 0. 한 줄 요약

현재 Admin UI/도메인 모델은 **채널 / 제작 아이템 / 실행 이력 / 단계별 후보 / 채택본**이 서로 섞여 있어 사용 흐름이 불명확하다.

목표는 Admin을 단순 CRUD 화면이 아니라, **콘텐츠 라인 운영 콘솔 + 후보 채택형 제작 워크벤치 + 비동기 실행 모니터**로 재구성하는 것이다.

---

## 1. 현재 문제 요약

### 1.1 도메인 단위가 꼬여 있음

현재 UI와 모델에서 아래 개념이 명확히 분리되지 않는다.

- 채널
- 제작 아이템
- 실행 이력
- 단계별 후보 결과물
- 현재 채택본

특히 기존 `잡(Job)` 개념이 아래를 동시에 먹고 있었다.

- 제작 대상
- 제작 상세 화면
- 실행 이력
- 파이프라인 상태

이 때문에 목록/상세/실행 이력의 역할이 흐려지고, UI도 폼 위주의 이상한 구조가 됨.

### 1.2 상세 화면이 “현재값 1개 편집” 구조임

현재 상세는 대체로 이런 느낌이다.

- 토픽/시드 폼 1개
- Scene JSON textarea 1개
- 이미지/영상 결과 몇 개
- 저장 버튼

하지만 실제 의도는 이게 아니다.

원하는 흐름은:

1. 아이데이션 후보 여러 개 생성
2. 좋은 후보를 채택
3. 채택본 기준으로 scene 후보 생성
4. scene 일부 수동 수정
5. 승인된 scene 기준으로 에셋 자동 생성
6. 실패한 일부만 재실행
7. 베스트 버전 기반으로 다음 콘텐츠 재생산

즉 현재 상세 UI는 **후보 비교/채택/재사용**을 전혀 표현하지 못하고 있다.

### 1.3 실행 이력은 분리되기 시작했지만 승인 모델은 아직 없음

최근 작업으로 `PipelineExecution` / `jobExecutions(jobId)` / 비동기 워커 호출 구조는 들어갔다. 이건 좋은 방향이다.

하지만 여전히 빠진 핵심은:

- candidate
- approved snapshot
- input snapshot
- best version reuse

즉 지금은 **무엇이 실행됐는지**는 남지만, **무엇을 채택해서 다음 단계 기준으로 삼았는지**는 아직 없다.

---

## 2. 목표 상태

Admin은 아래 3가지를 동시에 지원해야 한다.

### 2.1 운영 콘솔

- 채널/아이템/리뷰/실패 상태를 한눈에 봄
- 병목 단계와 실패 항목을 빠르게 처리
- 발행 대기/검수 대기/에셋 실패를 관리

### 2.2 후보 채택형 제작 워크벤치

- 각 단계마다 후보를 여러 개 생성
- 후보 중 하나를 채택
- 채택본만 다음 단계 자동화의 기준으로 사용
- 필요 시 일부 필드만 수동 수정

### 2.3 비동기 파이프라인 모니터

- 어떤 단계가 언제 실행됐는지
- 어떤 입력 기준으로 실행됐는지
- 성공/실패/재시도 여부
- 실패 로그와 재실행 액션

---

## 3. 도메인 모델 재정의

### 3.1 최상위 개념

#### Channel

운영 라인 단위. 기존 “콘텐츠” 목록 화면이 실제로는 채널 관리에 가까움.

예:

- Daily Tarot Shorts
- Mystic Daily Shorts
- Korean Tale Ambient

필드 예:

- id
- name
- platform
- defaultLanguage
- defaultDuration
- stylePreset
- publishingPreset

#### Content Item

개별 제작물 단위. 기존 `Job` 목록이 사실상 이 역할에 가까움.

예:

- 오늘의 타로 리딩 1편
- 새벽 안개 골목 감성 영상 1편

필드 예:

- id
- channelId nullable
- title
- status
- targetDurationSec
- currentStage
- reviewStatus
- approvedLineId nullable

#### PipelineExecution

실행 이력 단위. 최근 작업으로 이미 일부 도입됨.

필드 예:

- id
- contentItemId
- stageType
- status
- triggeredBy
- startedAt
- finishedAt
- inputSnapshotId nullable
- logs
- metrics / cost

### 3.2 앞으로 추가해야 할 핵심 개념

#### StageCandidate

각 단계에서 생성된 후보 결과물.

예:

- ideation candidate 1/2/3
- brief candidate 1/2
- scene candidate 1/2/3
- image candidate per scene
- render candidate

필드 예:

- id
- contentItemId
- stageType
- versionNo
- payload
- sourceExecutionId
- createdBy
- createdAt
- score nullable
- isApproved

#### ApprovedSnapshot

다음 단계 자동화의 기준이 되는 채택본.

핵심:

- 자동 실행은 무조건 현재 live form 값이 아니라 **approved snapshot** 기준으로 돌아야 함
- 그래야 재현성과 재사용이 생김

필드 예:

- id
- contentItemId
- stageType
- candidateId
- payloadSnapshot
- approvedBy
- approvedAt

---

## 4. 핵심 원칙

### 4.1 Execution과 Approval을 분리한다

- `Execution` = 무엇이 언제 실행되었는가
- `ApprovedSnapshot` = 무엇을 기준으로 다음 단계를 진행할 것인가

이 둘은 절대 같은 개념이 아니다.

### 4.2 단계별로 “후보 / 채택본 / 실행 이력”을 모두 보여준다

각 단계 UI는 최소 아래 3축이 있어야 한다.

- 후보 목록
- 현재 채택본
- 실행 이력

지금처럼 텍스트 한 덩어리 + 저장 버튼 구조로는 안 된다.

### 4.3 자동화는 승인된 snapshot 기준으로만 돈다

예:

- 아이데이션 후보 5개 생성
- 후보 2번 채택
- 채택된 ideation snapshot 기준으로 scene 생성
- scene 후보 3개 생성
- scene v3 채택
- 채택된 scene snapshot 기준으로 이미지/TTS 생성

즉 “현재 폼값”이 아니라 “승인된 기준값”을 자동화 입력으로 사용해야 한다.

### 4.4 실패는 전체 재실행이 아니라 부분 재실행이 기본이다

예:

- scene 5개 중 image 생성 실패 2개만 재실행
- TTS만 다시 생성
- preview render만 다시 생성

이게 가능하려면 에셋도 씬 단위 + 후보 단위로 관리되어야 한다.

---

## 5. IA / 메뉴 구조 수정

### 현재

- 대시보드
- 콘텐츠
- 잡
- 작업 현황
- 설정

### 변경안

- 대시보드
- 채널
- 제작 아이템
- 실행 현황
- 리뷰 큐
- 설정

### 이유

- `콘텐츠` 화면은 실제로 채널 목록 역할을 함 → `채널`로 명확화
- `잡`은 의미가 너무 애매함 → `제작 아이템`으로 변경
- `작업 현황`은 너무 포괄적임 → 실제로는 `리뷰 큐` + `실행 모니터`가 핵심

(코드베이스에서는 이미 상당 부분 라벨·경로가 이 방향으로 맞춰져 있다.)

---

## 6. 목록 화면 개선

### 6.1 채널 목록 (`/content` → `/channels` 또는 표시명만 우선 변경)

역할:

- 운영 채널 카탈로그
- 채널별 제작 아이템 현황/병목 확인

컬럼 예:

- 채널명
- 포맷
- 기본 길이
- 최근 발행일
- 진행 중 아이템 수
- 검수 대기 수
- 실패 수

채널 상세 탭 예:

- 개요
- 제작 아이템
- 프리셋
- 성과
- 설정

### 6.2 제작 아이템 허브 (`/jobs`)

최근 변경처럼 **전체 최근 목록**이 기본인 건 맞다. 다만 화면 목적을 더 명확히 해야 한다.

컬럼 예:

- 상태
- 제목
- 채널
- 현재 단계
- 검수 상태
- 마지막 실행 시각
- 액션

필터 예:

- 채널
- 상태
- 현재 단계
- 검수 상태
- 미연결 여부
- 미채택 후보 존재 여부

`미연결`은 예외 상태일 뿐, 화면의 정체성이 되어선 안 된다.

### 6.3 실행 현황

별도 화면으로 분리하거나 강화 필요.

역할:

- 실행 이력 모니터링
- 실패/지연/재시도 관리

컬럼 예:

- execution id
- content item
- stage
- status
- triggeredBy
- duration
- startedAt
- inputSnapshotId
- action (retry / open logs)

### 6.4 리뷰 큐

기존 “작업 현황”보다 더 명확한 역할.

하위 섹션:

- 검수 대기
- 실패/조치 필요

예:

- scene 승인 대기
- image 승인 대기
- preview 승인 대기
- upload 승인 대기
- image 실패
- render 실패
- upload 실패

---

## 7. 상세 화면 구조 전면 개편

현재 상세의 탭 구조(토픽·시드 / 스크립트 / 이미지 / 영상 / 업로드)는 부자연스럽다. 아래처럼 바꾸는 걸 권장한다.

### 새 탭 구조

- 개요
- 아이데이션
- 씬 설계
- 에셋
- 렌더/업로드
- 실행 이력

(일부는 이미 라우트·라벨 수준에서 반영됨.)

### 7.1 개요 탭

역할:

- 이 제작 아이템의 현재 상태를 한눈에 보여줌

구성:

- 상태
- 채널
- 목표 길이
- 현재 단계
- 현재 채택 라인
- 마지막 성공 렌더
- 검수 상태

주요 CTA:

- 새 후보 생성
- 현재 채택본 기준 재실행
- 검수 요청
- 최종 발행

하단:

- 단계 진행 바 (아이데이션 → 씬 설계 → 에셋 → 렌더 → 리뷰 → 업로드)

### 7.2 아이데이션 탭

현재 단일 폼 입력이 아니라, **후보 카드 + 채택 모델**로 변경해야 한다.

권장 레이아웃:

- 좌측: 후보 리스트
- 중앙: 선택한 후보 상세
- 우측: 현재 채택본 + 관련 실행 이력

후보 카드 표시 항목:

- 제목
- 훅
- 스타일 태그
- 예상 길이
- source execution
- 점수 / 메모

주요 액션:

- 후보 n개 더 생성
- 후보 편집
- 이 후보 채택
- 이 후보 기준 brief/scene 생성

### 7.3 씬 설계 탭

현재 Scene JSON textarea 기본 노출은 좋지 않다. 기본 UI는 구조화된 scene editor여야 한다.

권장 레이아웃:

- 좌측: scene version 목록
- 중앙: scene 카드 리스트 editor
- 우측: inspector / 검증 / 현재 채택본 정보

scene 카드 필드 예:

- scene id
- duration
- narration
- subtitle
- image prompt
- motion/video prompt
- sfx / bgm cue
- mood / tags

우측 inspector 예:

- 총 길이
- 장면 수
- 톤 일관성 체크
- 금지어 / 리스크 체크
- validation 결과
- 채택 버튼

주요 액션:

- scene 후보 3개 생성
- 현재 scene 복제
- 특정 scene만 재생성
- raw JSON 보기 (고급 보기로 숨김)

### 7.4 에셋 탭

이미지/영상을 따로 떼지 말고 “에셋”으로 묶는다.

서브탭 예:

- 이미지
- 음성
- BGM/SFX
- 영상 클립
- 자막

기본 표시 단위: 씬별 row.

핵심:

- 씬 단위 수정
- 실패 부분만 재실행
- 후보 중 채택 가능

### 7.5 렌더/업로드 탭

렌더와 업로드는 같은 큰 단계이지만 상태는 분리해야 한다.

섹션:

**Render**

- preview render 목록
- final render 목록
- 채택 렌더
- 렌더 로그
- preview 승인 / final 생성

**Upload**

- 제목
- 설명
- 태그
- 썸네일
- 예약 시간
- 업로드 상태
- 재업로드

### 7.6 실행 이력 탭

최근 도입한 `jobExecutions`를 여기에 본격 연결.

표 컬럼 예:

- execution id
- stage
- status
- input snapshot
- triggeredBy
- startedAt
- finishedAt
- duration
- retry

상세 패널:

- input snapshot summary
- output summary
- logs
- error reason
- retry action

---

## 8. 베스트 버전 재사용 모델

현재 “같은 라인으로 새 콘텐츠 만들기” 버튼은 좋은 방향이다. 하지만 단순 편의 기능이 아니라 **도메인 1급 기능**으로 승격해야 한다.

필요 개념:

- create content from approved snapshot
- clone approved line
- reuse best-performing approved structure

예시 흐름:

1. 이전 제작 아이템에서 성과 좋은 approved ideation/scene 선택
2. 그 snapshot을 기반으로 새 제작 아이템 생성
3. 제목/시드만 교체
4. scene 일부만 재생성
5. 에셋 자동 생성
6. 검수 후 발행

이게 시스템의 핵심 생산성 포인트다.

---

## 9. 백엔드 후속 작업 우선순위

### 9.1 Candidate / ApprovedSnapshot 모델 추가

현재 Execution만으로는 부족하다. 다음 작업은 단계별 후보와 채택본 모델 추가가 우선.

최소 필요:

- stage candidates table/model
- approved snapshot model
- candidate approve mutation
- approved snapshot 조회 쿼리

### 9.2 Execution에 input snapshot 연결

`inputSnapshotId`를 본격적으로 붙여야 한다.

그래야:

- 어떤 채택본 기준으로 실행됐는지
- 왜 이 결과가 나왔는지
- 동일 입력 기준 재실행이 가능한지

를 추적 가능하다.

### 9.3 `adminJobs` 전역 최근 목록은 장기적으로 보강 필요

현재 상태별 GSI 병합은 임시안으로는 괜찮다. 하지만 장기적으로는:

- 정확한 전역 정렬
- 일관된 페이지네이션
- 비용 제어

를 고려한 별도 read model 또는 조회 전략이 필요하다.

---

## 10. 프론트 구현 우선순위

### 1순위

- 메뉴 라벨/페이지 제목/설명 전면 정리
- 상세 탭 구조 교체
- `실행 이력` 탭 연결
- Scene JSON raw textarea를 기본뷰에서 내리기

### 2순위

- 아이데이션 후보 리스트 + 채택 UI
- 씬 버전 리스트 + 채택 UI
- 승인된 기준 버전 표시

### 3순위

- 씬별 에셋 후보/상태 UI
- 실패 부분 재실행 UI
- preview/final render 분리 UI

### 4순위

- 베스트 버전 재사용 플로우
- 승인 스냅샷 기반 새 제작 아이템 생성

---

## 11. 구현 시 주의사항

- 단순히 라벨만 바꾸고 기존 구조를 유지하면 안 됨
- 상세 화면은 폼 편집기가 아니라 **선택/채택 중심 워크벤치**여야 함
- “현재값”과 “승인된 기준값”은 분리해서 다뤄야 함
- execution 탭은 부가 기능이 아니라 핵심 추적 기능임
- raw JSON은 숨기고 구조화된 editor를 기본으로 제공해야 함
- 미연결 상태는 지원하되, 전체 IA의 중심이 되면 안 됨

---

## 12. 최종 결론

다음 리팩터링의 핵심은 UI 미관 개선이 아니다.

본질은 아래 분리다.

- 채널
- 제작 아이템
- 단계별 후보
- 채택본(approved snapshot)
- 실행 이력

이 5개를 분리하고, 상세 화면을 **후보 생성 → 채택 → 채택본 기준 자동 실행 → 일부 실패 재실행** 흐름으로 재구성해야 한다.

즉 목표는:

**Admin CRUD 화면**이 아니라 **콘텐츠 라인 운영 콘솔 + 후보 채택형 제작 워크벤치 + 비동기 실행 모니터**다.
