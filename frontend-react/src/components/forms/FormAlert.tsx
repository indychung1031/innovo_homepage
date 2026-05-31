type FormAlertProps = {
  variant: 'success' | 'error';
  message: string;
};

export function FormAlert({ variant, message }: FormAlertProps) {
  const className =
    variant === 'success'
      ? 'mt-4 rounded bg-green-50 p-3 text-sm text-green-800'
      : 'mt-4 rounded bg-red-50 p-3 text-sm text-red-800';

  return (
    <div role="alert" className={className}>
      {message}
    </div>
  );
}
