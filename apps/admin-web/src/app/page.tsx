import DashboardLayout from "./(dashboard)/layout";
import DashboardPage from "./(dashboard)/page";

export default function RootPage() {
  return (
    <DashboardLayout>
      <DashboardPage />
    </DashboardLayout>
  );
}
