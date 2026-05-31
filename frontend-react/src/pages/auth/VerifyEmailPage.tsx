import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

import { verifyEmail } from '@/api/auth';
import { AuthFormSection } from '@/components/auth/AuthFormSection';
import { FormAlert } from '@/components/forms/FormAlert';
import { mapAuthError } from '@/features/auth/mapAuthError';

export function VerifyEmailPage() {
  const { t } = useTranslation('auth');
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [message, setMessage] = useState(t('verify.processing'));
  const [variant, setVariant] = useState<'success' | 'error' | null>(null);

  useEffect(() => {
    if (!token) {
      setMessage(t('verify.missing_token'));
      setVariant('error');
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const msg = await verifyEmail(token);
        if (!cancelled) {
          setMessage(msg);
          setVariant('success');
        }
      } catch (err) {
        if (!cancelled) {
          const detail = err instanceof Error ? err.message : '';
          setMessage(mapAuthError(detail, t));
          setVariant('error');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, t]);

  return (
    <AuthFormSection
      title={t('verify.title')}
      breadcrumbLabel={t('verify.breadcrumb')}
      heading={t('verify.heading')}
    >
      {variant ? (
        <FormAlert variant={variant} message={message} />
      ) : (
        <p className="text-center text-gray-mid">{message}</p>
      )}
    </AuthFormSection>
  );
}
