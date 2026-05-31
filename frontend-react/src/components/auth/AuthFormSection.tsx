import type { ReactNode } from 'react';
import { Helmet } from 'react-helmet-async';

import { Breadcrumb } from '@/components/ui/Breadcrumb';

type AuthFormSectionProps = {
  title: string;
  breadcrumbLabel: string;
  heading: string;
  children: ReactNode;
};

export function AuthFormSection({ title, breadcrumbLabel, heading, children }: AuthFormSectionProps) {
  return (
    <section className="mx-auto max-w-md px-4 py-16">
      <Helmet>
        <title>{title} | Innovo Solution</title>
      </Helmet>
      <Breadcrumb items={[{ label: breadcrumbLabel }]} />
      <h1 className="mb-6 text-2xl font-bold">{heading}</h1>
      {children}
    </section>
  );
}
