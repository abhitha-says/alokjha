import { permanentRedirect } from "next/navigation";

// The Founding Five reports are now the free complete Deep Dive editions.
export default function ReportsRedirect() {
  permanentRedirect("/deep-dives");
}
