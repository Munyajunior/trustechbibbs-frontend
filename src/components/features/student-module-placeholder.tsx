import { Link } from "@/i18n/navigation";

export function StudentModulePlaceholder({ title, body }: { title: string; body: string }) {
  return <main className="mx-auto max-w-3xl p-8"><Link href="/student" className="text-sm font-semibold text-primary underline underline-offset-2">Back to student portal</Link><section className="mt-6 rounded-xl border border-gray-200 bg-white p-8 shadow-sm"><h1 className="font-display text-3xl font-semibold text-gray-900">{title}</h1><p className="mt-3 leading-7 text-gray-600">{body}</p><p className="mt-6 rounded-md bg-primary-subtle p-4 text-sm text-primary">This page is ready for its connected workflow and will show your personal records when that module is published.</p></section></main>;
}
