import Link from 'next/link';
import { PlugZap } from 'lucide-react';

export default function ConnectErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm text-center">
        <div className="rounded-xl bg-surface-container-lowest border border-outline-variant/5 p-8 shadow-sm">
          <div className="w-16 h-16 rounded-xl bg-red-50 flex items-center justify-center mx-auto mb-5">
            <PlugZap size={32} className="text-red-400" />
          </div>
          <h1 className="text-xl font-bold font-headline text-on-surface mb-2">
            Connection Unavailable
          </h1>
          <p className="text-sm text-secondary mb-6 leading-relaxed">
            We&apos;re currently working on connecting this device. This feature will be available soon. Thanks for your patience!
          </p>
          <Link
            href="/whoop"
            className="inline-flex items-center justify-center w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white hover:bg-primary-container transition-colors"
          >
            Back to Recovery
          </Link>
        </div>
      </div>
    </div>
  );
}
