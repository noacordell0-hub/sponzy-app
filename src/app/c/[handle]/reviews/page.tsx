import type { Metadata } from "next";
import { ReviewsPage } from "@/components/ReviewsPage";

export const metadata: Metadata = { title: "Reviews · Clouta" };

export default async function Page({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  return <ReviewsPage handle={handle} role="creator" />;
}
