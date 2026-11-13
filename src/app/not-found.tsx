import type { Metadata } from "next";
import { SpacePage } from "@/components/SpacePage";

export const metadata: Metadata = { title: "Page not found · Clouta", robots: { index: false } };

export default function NotFound() {
  return (
    <SpacePage code="404" title="This page drifted off">
      <p>Page not found. The link may be old, or the shop may have moved.</p>
    </SpacePage>
  );
}
