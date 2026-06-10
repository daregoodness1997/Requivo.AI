interface EmptyStateProps {
  description: string;
  title: string;
}

export default function EmptyState({ description, title }: EmptyStateProps) {
  return (
    <div className="flex flex-1 items-center justify-center p-8 text-center">
      <div className="max-w-sm">
        <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      </div>
    </div>
  );
}
