import { Container } from "@/components/shared/container";

/** Standard page banner used by every inner page. */
export function PageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="border-b border-gray-200 bg-primary-subtle">
      <Container className="py-12 sm:py-16">
        <h1 className="font-display text-3xl font-bold text-gray-900 sm:text-4xl">
          {title}
        </h1>
        {subtitle && <p className="mt-3 max-w-2xl text-gray-600">{subtitle}</p>}
      </Container>
    </div>
  );
}
