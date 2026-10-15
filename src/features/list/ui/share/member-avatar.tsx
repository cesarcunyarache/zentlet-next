import { cn } from "@heroui/react";

interface MemberAvatarProps {
  name: string;
  image: string | null;
  className?: string;
}

export function MemberAvatar({ name, image, className }: MemberAvatarProps) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <span
      aria-hidden
      className={cn(
        "bg-app-fill-strong text-app-fg grid shrink-0 place-items-center overflow-hidden rounded-full font-semibold",
        className,
      )}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className="size-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        initial
      )}
    </span>
  );
}
