import { redirect } from 'next/navigation';

type JobDetailIndexPageProps = {
  params: Promise<{ jobId: string }>;
};

export default async function JobDetailIndexPage({ params }: JobDetailIndexPageProps) {
  const { jobId } = await params;
  redirect(`/jobs/${jobId}/ideation`);
}
