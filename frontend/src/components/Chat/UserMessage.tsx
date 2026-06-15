import { useAuthStore } from '@/store/authStore';

export default function UserMessage({ children }: { children: string }) {
  const name = useAuthStore((state) => state.user?.name ?? 'You');

  return (
    <div className="flex justify-end gap-3">
      <div className="max-w-[85%] sm:max-w-[70%]">
        <p className="mb-1 text-right text-[11px] font-medium text-gray-400">{name}</p>
        <div className="rounded-2xl rounded-tr-md bg-brand-900 px-4 py-3 text-sm leading-6 text-white">
          {children}
        </div>
      </div>
    </div>
  );
}
