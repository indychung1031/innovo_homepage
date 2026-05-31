import { useTranslation } from 'react-i18next';

import type { WizardStep } from '@/features/quote-wizard/types';

const STEPS: { id: 1 | 2 | 3 | 4; labelKey: string }[] = [
  { id: 1, labelKey: 'stepper.step1' },
  { id: 2, labelKey: 'stepper.step2' },
  { id: 3, labelKey: 'stepper.step3' },
  { id: 4, labelKey: 'stepper.step4' },
];

type WizardStepperProps = {
  current: WizardStep;
};

export function WizardStepper({ current }: WizardStepperProps) {
  const { t } = useTranslation('wizard');
  const active = typeof current === 'number' ? current : 4;

  return (
    <ol className="mb-8 flex flex-wrap gap-2 text-sm" aria-label="Progress">
      {STEPS.map((step) => {
        const done = active > step.id;
        const isCurrent = active === step.id;
        return (
          <li
            key={step.id}
            className={`rounded-full px-3 py-1 ${
              isCurrent
                ? 'bg-navy font-medium text-white'
                : done
                  ? 'bg-slate-200 text-charcoal'
                  : 'border border-gray-light text-gray-mid'
            }`}
            aria-current={isCurrent ? 'step' : undefined}
          >
            <span className="mr-1 font-semibold">{step.id}.</span>
            {t(step.labelKey)}
          </li>
        );
      })}
    </ol>
  );
}
