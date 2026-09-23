import { Link } from "@/i18n/navigation";

const cards = [
  { href: "/student/profile", title: "My profile", body: "Review and update your contact information." },
  { href: "/student/courses", title: "Course registration", body: "View registration periods and your courses." },
  { href: "/student/results", title: "Results", body: "View published semester results and academic progress." },
  { href: "/student/fees", title: "Fees and invoices", body: "Review invoices, payments, and receipts." },
];

export default function StudentPortalPage() {
  return <main className="mx-auto max-w-6xl p-8"><h1 className="font-display text-3xl font-semibold text-gray-900">Student portal</h1><p className="mt-2 text-gray-600">Your academic information and student services in one place.</p><ul className="mt-8 grid gap-5 sm:grid-cols-2">{cards.map((card) => <li key={card.href}><Link href={card.href} className="block rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-primary-light hover:shadow-md"><h2 className="font-display text-xl font-semibold text-gray-900">{card.title}</h2><p className="mt-2 text-gray-600">{card.body}</p></Link></li>)}</ul></main>;
}
