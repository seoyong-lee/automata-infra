import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@packages/ui';

const roadmap = [
  {
    title: 'Information Architecture',
    description: '콘텐츠, 잡, 리뷰, 설정을 새 기준으로 재정의합니다.',
  },
  {
    title: 'Reusable Shell',
    description: '탑바, 사이드바, 페이지 헤더를 공용 레이아웃으로 굳힙니다.',
  },
  {
    title: 'Workflow Screens',
    description: '실제 운영 플로우를 작업 단위 화면으로 다시 쪼갭니다.',
  },
];

const placeholders = ['Dashboard', 'Content', 'Jobs', 'Reviews', 'Settings'];

function HeroSection() {
  return (
    <section className="admin-page-shell overflow-hidden">
      <div className="border-b border-admin-outline-ghost px-6 py-5">
        <Badge className="bg-admin-primary-container text-admin-text-strong hover:bg-admin-primary-container">
          Temporary Page
        </Badge>
        <h1 className="font-admin-display mt-4 text-3xl font-semibold tracking-tight text-admin-text-strong">
          Admin V2 rebuild workspace
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-admin-text-muted">
          기존 운영 어드민을 새 구조로 다시 세우기 위한 시작 페이지입니다. 지금은 화면 구조와
          톤앤매너만 고정하고, 실제 기능은 순차적으로 이 안에 다시 조립하면 됩니다.
        </p>
      </div>

      <div className="grid gap-4 px-6 py-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
        <Card className="border-admin-outline-ghost bg-admin-surface-section shadow-none">
          <CardHeader>
            <CardTitle>Current focus</CardTitle>
            <CardDescription>
              새 어드민의 첫 화면에서 보여줄 기준 상태를 임시로 정리해둔 영역입니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-dashed border-admin-outline-ghost bg-admin-surface-base p-4">
              <p className="text-sm font-medium text-admin-text-strong">Single source of truth</p>
              <p className="mt-1 text-sm text-admin-text-muted">
                실제 데이터가 연결되기 전까지는 이 페이지를 디자인, IA, 네비게이션 검증용 기준
                화면으로 사용합니다.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {placeholders.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-admin-outline-ghost bg-admin-surface-base px-3 py-1 text-xs font-medium text-admin-text-muted"
                >
                  {item}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-admin-outline-ghost bg-admin-surface-section shadow-none">
          <CardHeader>
            <CardTitle>Next slices</CardTitle>
            <CardDescription>우선순위가 높은 뼈대 작업만 작게 나눠둡니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {roadmap.map((item, index) => (
              <div
                key={item.title}
                className="rounded-xl border border-admin-outline-ghost bg-admin-surface-base p-4"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-admin-text-muted">
                  Step {index + 1}
                </p>
                <p className="mt-2 text-sm font-medium text-admin-text-strong">{item.title}</p>
                <p className="mt-1 text-sm leading-6 text-admin-text-muted">{item.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function DirectionSection() {
  return (
    <section className="grid gap-4 xl:grid-cols-3">
      <Card className="border-admin-outline-ghost bg-admin-surface-section shadow-none xl:col-span-2">
        <CardHeader>
          <CardTitle>Layout direction</CardTitle>
          <CardDescription>
            기존 페이지를 그대로 옮기지 않고, 운영자가 자주 쓰는 흐름 기준으로 재조합합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl bg-admin-surface-base p-4">
            <p className="text-sm font-medium text-admin-text-strong">Overview</p>
            <p className="mt-1 text-sm text-admin-text-muted">상태를 한 눈에 보는 시작 지점</p>
          </div>
          <div className="rounded-xl bg-admin-surface-base p-4">
            <p className="text-sm font-medium text-admin-text-strong">Queue</p>
            <p className="mt-1 text-sm text-admin-text-muted">실행 대기와 병목 확인</p>
          </div>
          <div className="rounded-xl bg-admin-surface-base p-4">
            <p className="text-sm font-medium text-admin-text-strong">Detail</p>
            <p className="mt-1 text-sm text-admin-text-muted">개별 작업의 정밀 제어 화면</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-admin-outline-ghost bg-admin-surface-section shadow-none">
        <CardHeader>
          <CardTitle>Action</CardTitle>
          <CardDescription>지금은 기능 연결 대신 작업 출발점만 남겨둡니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button className="w-full justify-center">Start building modules</Button>
          <Button variant="outline" className="w-full justify-center">
            Review information architecture
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}

export function DashboardPage() {
  return (
    <div className="space-y-6">
      <HeroSection />
      <DirectionSection />
    </div>
  );
}
