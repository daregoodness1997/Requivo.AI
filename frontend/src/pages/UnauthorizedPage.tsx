import { ShieldX } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Card from '@/components/ui/Card';

export default function UnauthorizedPage() {
  const location = useLocation();
  const attemptedPath =
    typeof location.state === 'object' &&
    location.state !== null &&
    'from' in location.state &&
    typeof location.state.from === 'string'
      ? location.state.from
      : null;

  return (
    <Card className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center p-8 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-warning-50 text-warning-700">
        <ShieldX className="size-7" />
      </span>
      <h2 className="mt-5 text-xl font-bold text-gray-950">Access restricted</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-gray-500">
        Your current role does not have permission to open
        {attemptedPath ? ` ${attemptedPath}` : ' this workspace area'}.
      </p>
      <Button asChild className="mt-5">
        <Link to="/chat">Return to chat</Link>
      </Button>
    </Card>
  );
}
