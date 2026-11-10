import { notFound } from "next/navigation";

// Fees module is not public yet; hidden from navigation and unreachable.
export default function StudentFeesPage() {
  notFound();
}
