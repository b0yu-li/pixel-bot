export type KnowledgeBaseEntry = {
  id: string;
  title: string;
  tags: string[];
  question: string;
  answer: string;
};

// Simple local KB for grounded answers (no external retrieval services).
export const KNOWLEDGE_BASE: KnowledgeBaseEntry[] = [
  {
    id: "firmware-garlicos",
    title: "GarlicOS vs Standard Firmware",
    tags: ["firmware", "garlicos", "garlic", "update"],
    question: "What is the difference between GarlicOS and standard firmware?",
    answer:
      "GarlicOS is a custom firmware focused on fast game browsing and a curated UI. Standard firmware is the original OS shipped with the device. If you want smoother navigation and a more consistent retro experience, GarlicOS is usually the better choice. If you prefer the factory setup and maximum compatibility with the stock SD card, standard firmware can be the safer baseline. If you tell me your handheld model and what games you play, I can suggest the best approach.",
  },
  {
    id: "firmware-how-to-update",
    title: "How to Update Firmware",
    tags: ["firmware", "update", "sd-card", "backup"],
    question: "How do I update firmware on a retro handheld?",
    answer:
      "General process: (1) Backup anything you care about on your SD card, (2) download the correct firmware for your specific handheld model, (3) flash/copy files to the SD card following the release instructions, and (4) reboot. If you’re unsure which firmware matches your exact hardware revision, share your device model and I’ll help you pick the right one.",
  },
  {
    id: "controls-ps1",
    title: "PS1 Controls Setup",
    tags: ["ps1", "controls", "mapping", "emulator"],
    question: "My PS1 games have weird controls. How do I fix it?",
    answer:
      "Most retro handheld emulators let you remap controls per game or per core. Start by opening the emulator’s controls/inputs menu, then map the D-pad, face buttons, start/select, and analog sticks (if your model supports them). If a specific game only is broken, it’s usually per-game configuration. Tell me the exact handheld model and which emulator you’re using, and I’ll suggest a matching configuration approach.",
  },
  {
    id: "supported-systems",
    title: "What Systems Are Supported?",
    tags: ["supported", "ps1", "snes", "n64", "games", "compatibility"],
    question: "What game systems can these handhelds run?",
    answer:
      "Support varies by handheld model and firmware/emulator setup. In general, PS1 and SNES are commonly well supported. N64 and PSP can be more configuration-sensitive and may run slower depending on the specific build. If you tell me which systems you care about (like PS1 only, or PS1 + N64), I’ll recommend a setup and handheld tier that matches.",
  },
  {
    id: "choose-device",
    title: "Choosing the Right Handheld",
    tags: ["recommendation", "budget", "form-factor", "setup"],
    question:
      "I want a recommendation. What should I tell you to choose the right handheld?",
    answer:
      "Great question. To recommend the right device, share (1) your budget range and (2) your preferred form factor (for example: pocket/compact vs larger handheld, and whether you want a clamshell style or a straightforward handheld). Then tell me what systems you want to play most. With that, I can suggest a realistic option for your needs.",
  },
  {
    id: "shipping-time",
    title: "Shipping Times",
    tags: ["shipping", "delivery", "timeline"],
    question: "How long does shipping take?",
    answer:
      "Typical processing is 1-2 business days, followed by delivery time that depends on your region. If you share your ZIP code, I can give a more specific estimate. If you need a rush order, ask and we’ll try to accommodate.",
  },
  {
    id: "returns-window",
    title: "Returns Window",
    tags: ["returns", "refund", "return-window"],
    question: "What is your return policy?",
    answer:
      "You can request a return within 14 days of delivery. If the device is defective on arrival, we’ll work with you to resolve it as quickly as possible. For the smoothest process, keep the packaging and provide photos when you contact us.",
  },
  {
    id: "warranty",
    title: "Warranty Details",
    tags: ["warranty", "coverage", "repairs"],
    question: "Do you offer a warranty?",
    answer:
      "Yes. We include a limited warranty for eligible devices. Coverage details can vary by product line, but the goal is to address hardware issues during the warranty period. If something is wrong, send us what you’re seeing and (if possible) a clear photo or short video, and we’ll guide you on next steps.",
  },
  {
    id: "damaged-in-transit",
    title: "Damaged in Transit",
    tags: ["damage", "shipping", "arrived-damaged"],
    question: "My handheld arrived damaged. What should I do?",
    answer:
      "If your device arrived damaged, contact us as soon as you can (ideally within 48 hours of delivery). Include your order info, photos of the damage, and a short description of what’s not working. We’ll move you to the next resolution path, which may include replacement or repair options.",
  },
  {
    id: "sd-card-reliability",
    title: "SD Card Reliability",
    tags: ["sd-card", "storage", "corruption", "backup"],
    question: "Should I replace the SD card or worry about corruption?",
    answer:
      "It depends on the setup. If you see save issues, freezing, or corruption, switching to a higher-quality SD card and reconfiguring your emulator path can help. The safest approach is to back up your saves and follow firmware/emulator instructions for your exact handheld model.",
  },
  {
    id: "accessories-included",
    title: "What’s Included",
    tags: ["accessories", "included", "what-do-i-get"],
    question: "What’s included with my purchase?",
    answer:
      "Typically you’ll receive the handheld, a charger, and the essentials needed to get started. Some bundles can include accessories depending on the listing. If you tell me which model and variant you purchased, I’ll confirm what’s expected in your box.",
  },
  {
    id: "international-shipping",
    title: "Service Regions",
    tags: ["shipping", "regions", "international", "zip"],
    question: "Do you ship internationally?",
    answer:
      "Service regions vary. If you share your country/region (or ZIP code if in the US), we’ll confirm whether we can fulfill your order and what timeline to expect.",
  },
];

