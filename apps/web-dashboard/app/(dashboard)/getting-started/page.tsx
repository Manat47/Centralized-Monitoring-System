import { GettingStartedGuide } from "@/app/features/getting-started/components/getting-started-guide";
import { SmoothScroll } from "@/app/features/getting-started/components/smooth-scroll";

export default function GettingStartedPage() {
  return (
    <SmoothScroll>
      <section className="-m-6 min-h-[calc(100vh-4rem)] bg-slate-50">
        <GettingStartedGuide />
      </section>
    </SmoothScroll>
  );
}
