import { permanentRedirect } from "next/navigation";

// Guides are not part of Human Signals. The long-form work is the Deep Dives.
export default function GuidesRedirect() {
  permanentRedirect("/deep-dives");
}
