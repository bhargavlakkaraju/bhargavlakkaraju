import { parseLandingContent } from "@higgsfield/app-landing";

export const landingContent = parseLandingContent({
  hero: {
    eyebrow: "PortraitVoice",
    title: "Turn one photo and a testimonial into a talking-head video",
    description:
      "Farmers and farmer ambassadors get a vertical, lip-synced testimonial video from a single portrait, in their own language.",
    primaryCta: { label: "Create a testimonial video", href: "#app" },
  },
  preview: {
    kind: "inline",
    title: "PortraitVoice generator",
  },
  steps: {
    title: "Three steps to a finished video",
    description: "Upload, add the testimonial, and let the pipeline render the rest.",
    items: [
      {
        title: "Upload a portrait",
        description: "One clear, front-facing photo. It is re-framed into a 9:16 village scene.",
        preview: {
          kind: "instruction",
          icon: "image",
          title: "Upload a portrait",
          description: "JPG or PNG, face visible",
        },
      },
      {
        title: "Add the testimonial",
        description: "Type it, photograph a handwritten note, or upload a voice recording. Pick the language and voice.",
        preview: {
          kind: "action",
          label: "Generate video",
        },
      },
      {
        title: "Download the video",
        description: "A vertical talking-head clip with natural speech and lip-sync, ready for WhatsApp and reels.",
        preview: {
          kind: "result",
          media: {
            kind: "image",
            src: "/assets/landing/step-result.jpg",
            alt: "Finished vertical testimonial frame",
          },
        },
      },
    ],
  },
  features: {
    title: "Built for rural testimonials",
    description: "Every stage is tuned for authentic, phone-shot farm footage.",
    items: [
      {
        icon: "frame",
        title: "Identity kept, scene re-framed",
        description: "The portrait is re-composed mid-torso in a village setting without warping the face or body.",
      },
      {
        icon: "sliders",
        title: "Ten Indian languages",
        description: "Hindi, Bengali, Tamil, Telugu, Kannada, Marathi, Gujarati, Punjabi, Malayalam and English, with a female or male voice.",
      },
      {
        icon: "video",
        title: "Audio-driven lip-sync",
        description: "Upload a real recording and the mouth follows it, or let the video model speak the typed testimonial.",
      },
    ],
  },
  showcase: {
    title: "What a finished frame looks like",
    description: "Vertical 9:16, natural daylight, mid-torso framing.",
    items: [
      {
        label: "Village testimonial",
        media: {
          kind: "image",
          src: "/assets/landing/showcase-village.jpg",
          alt: "Farmer testimonial frame in a village setting",
        },
      },
      {
        label: "Field testimonial",
        media: {
          kind: "image",
          src: "/assets/landing/showcase-field.jpg",
          alt: "Farmer testimonial frame in a green field",
        },
      },
    ],
  },
  finalCta: {
    title: "Ready to record a testimonial?",
    description: "One portrait, one message, one vertical video.",
    action: { label: "Create a testimonial video", href: "#app" },
  },
});
