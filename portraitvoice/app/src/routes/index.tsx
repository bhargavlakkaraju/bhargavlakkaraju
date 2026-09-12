import { createFileRoute } from "@tanstack/react-router";
import { AppDetailTemplate } from "@/layouts/app-detail";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Create a testimonial video · PortraitVoice" },
      {
        name: "description",
        content:
          "Turn one portrait photo and a testimonial into a vertical, lip-synced talking-head video in Hindi, Tamil, Telugu and seven more languages.",
      },
      { property: "og:title", content: "Create a testimonial video · PortraitVoice" },
      {
        property: "og:description",
        content: "One photo and a testimonial become a vertical talking-head video for farmers and farmer ambassadors.",
      },
    ],
    links: [{ rel: "canonical", href: "https://portraitvoice.higgsfield.app/" }],
  }),
  component: Index,
});

function Index() {
  return <AppDetailTemplate />;
}
