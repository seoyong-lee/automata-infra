export default function PendingPage() {
  return (
    <main className="container">
      <div className="card" style={{ maxWidth: 560, margin: "64px auto" }}>
        <h2>권한 대기</h2>
        <p>
          현재 계정은 Admin 그룹 권한이 없습니다. 관리자에게 그룹 할당을
          요청하세요.
        </p>
      </div>
    </main>
  );
}
