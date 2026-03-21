# Admin 파이프라인 설계 개선안 — 구현 추적 (커서·에이전트 전달용)

본 문서는 **「후보 채택형 제작 워크벤치 + Scene Continuation + Human Review」** 설계안이 저장소에 **어느 정도 반영되었는지**를 추적하고, 아직 없는 항목을 **백로그**로 고정한다.

- **원문 설계 스펙**(섹션별 상세·예시 필드·mutation 이름): 팀에서 공유한 **Admin 파이프라인 설계 개선안** 전문을 기준으로 한다. (이 파일에는 전문을 중복 저장하지 않고, 구현 상태만 관리한다.)
- **관련 기존 플랜**: [`admin-improvement-direction-cursor-handoff.md`](./admin-improvement-direction-cursor-handoff.md), [`admin-client-revision-workbench.md`](./admin-client-revision-workbench.md)

---

## 1. 요약 매트릭스 (2025-03 기준 코드베이스)

| 설계 축 | 상태 | 비고 |
|--------|------|------|
| Execution vs Approval 개념 분리 | **부분** | `PipelineExecution` + `approvePipelineExecution`으로 실행 ID 채택은 가능. **`ApprovedSnapshot` 엔티티·payload 고정**은 미도입. |
| `inputSnapshotId` (실행 입력 스냅샷) | **반영** | 실행 행 + GraphQL. 주로 단계별 **입력 S3 키**. |
| 산출물 추적 (`outputArtifactS3Key` 등) | **반영** | 성공 시 산출 S3 키 저장·UI 노출. |
| 단계별 후보 `StageCandidate` | **미반영** | 후보는 **실행 이력으로 대체**한 수준. 별도 후보 테이블·버전 파일 경로 다중화 없음. |
| `ApprovedSnapshot` (채택본 스냅샷) | **미반영** | Job 메타의 `approved*ExecutionId`만 존재. **스냅샷 payload·조회 API** 없음. |
| 자동화 = 채택 스냅샷만 입력 | **미반영** | `runSceneJson` 등은 여전히 **현재 job의 `topicS3Key`/`sceneJsonS3Key`** 중심. 채택 ID를 실행 입력으로 소비하는 경로는 **후속 작업**. |
| Scene continuation (append / 부분 재생성) | **미반영** | `appendScenesFromApprovedTopic` 등 mutation·유스케이스 없음. |
| `SceneVersion` / 변경 유형 | **미반영** | 씬은 단일 JSON + 실행 이력 수준. |
| `AssetCandidate` + 씬 단위 검수 상태 | **미반영** | 에셋은 기존 씬 행·잡 상태; 후보별 `reviewStatus` 도메인 없음. |
| Human review (후보별 DRAFT/APPROVED/…) | **부분** | 잡 단위 검수·리뷰 큐는 있음. **ideation/scene/asset 후보별 검수 상태**는 미도입. |
| 상세 탭 IA (개요·아이데이션·씬·에셋·렌더·실행 이력) | **반영** | 라우트·탭 정렬됨. |
| 워크벤치 3축 UI (후보·채택·실행) | **부분** | **실행 목록 + 채택 버튼**으로 근사. 진짜 다중 후보 파일·비교 카드는 미구현. |
| Scene JSON 기본 = 구조화 뷰 | **부분** | 구조화 테이블 + Raw JSON 고급. **씬 버전 목록·에디터**는 미구현. |
| 실행 이력 탭 (소요·입력·산출) | **반영** | `jobExecutions` 기반 표 보강. 상세 패널·retry는 제한적. |
| 베스트 버전 재사용 | **부분** | UI 편의 일부 가능할 수 있으나, **승인 스냅샷 기반 신규 잡 생성**은 설계 수준. |
| 리뷰 큐 read model 강화 | **부분** | `pendingReviews` 등; 후보별 큐는 미구현. |

---

## 2. 설계안 §11 구현 우선순위 ↔ 저장소 상태

원문 **§11 구현 우선순위**와 대응:

| 우선순위 (원문) | 내용 | 상태 |
|-----------------|------|------|
| 1순위 | `StageCandidate` | **미반영** (실행 행으로 부분 대체) |
| 1순위 | `ApprovedSnapshot` | **미반영** (실행 ID 포인터만) |
| 1순위 | `inputSnapshotId` | **반영** |
| 1순위 | `candidate approve` 액션 | **부분** (`approvePipelineExecution` = 성공 실행 채택) |
| 1순위 | 상세 `실행 이력` 연결 | **반영** |
| 2순위 | 아이데이션 후보 리스트 + 채택 UI | **부분** (실행 기반 워크벤치) |
| 2순위 | scene version 리스트 + 채택 | **미반영** |
| 2순위 | Scene JSON → 구조화 editor 기본 | **부분** |
| 3순위 | append / continuation / regenerate range mutations | **미반영** |
| 4순위 | image/voice/subtitle review + 씬 단위 UI | **미반영** |
| 5순위 | 베스트 재사용·추천 | **미반영** (또는 초기 단계만) |

---

## 3. 백로그 (플랜에 명시적으로 추가할 작업)

아래는 원문 설계를 **완전 충족**하기 위해 남은 작업이다. 구현 시 **스키마·Dynamo·AppSync·Admin Web** 순으로 쪼갠다.

### 3.1 데이터 모델

1. **`StageCandidate`** (또는 실행별 산출이 곧 후보가 되도록 S3 경로 버전 규칙 정의)
2. **`ApprovedSnapshot`** (또는 Job 하위 `APPROVED#<stage>#…` 아이템 + payload pointer)
3. **`SceneVersion`** / continuation 메타 (`changeType`, `basedOnSceneVersionId` 등)
4. **`AssetCandidate`** 또는 씬×에셋 타입별 후보 행
5. 후보별 **`reviewStatus`** enum 일원화

### 3.2 실행·오케스트레이션

6. 뮤테이션·유스케이스: `appendScenesFromApprovedTopic`, `appendScenesFromApprovedSceneVersion`, `regenerateSceneRange` (원문 §6.3)
7. **파이프라인 실행 입력**을 `ApprovedSnapshot` / 채택된 산출 키로만 받도록 리졸버 정합
8. 부분 재실행: 씬 ID 단위 에셋/음성 재생성 API

### 3.3 UI

9. 아이데이션·씬: **진짜 후보 카드** (동일 단계 N개 파일·비교·메모·점수 자리)
10. 에셋 탭: 씬별 row + 후보·검수·재생성 (BGM/자막 포함)
11. 렌더/업로드: preview vs final 분리·승인 흐름
12. 리뷰 큐: 후보 타입별 필터·딥링크

### 3.4 운영·관측

13. `adminJobs` 전역 정렬·페이지네이션 (기존 핸드오프 §9.3과 동일)
14. 실행 상세: retry·동일 스냅샷 재실행 (원문 §8.1)

---

## 4. 이 문서의 쓰임

- **커서/에이전트**: 새 작업 시 §3 백로그와 §1 매트릭스를 먼저 확인해 **중복 설계**를 피한다.
- **제품/리드**: 원문 전체 스펙은 별도 문서에 두고, **이 파일만** 저장소에서 이슈·스프린트와 동기화한다.

---

## 5. 변경 이력

| 날짜 | 내용 |
|------|------|
| 2025-03-21 | 최초 작성 — 설계안 대비 구현 추적·백로그 고정 |
