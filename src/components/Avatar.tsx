import { AVATAR_PATTERNS, initials } from "@/lib/look";
import { PLATFORMS, type PlatformKey } from "@/lib/platforms";

type Props = {
  name: string | null;
  source: "auto" | "pattern" | "upload";
  pattern: number;
  url: string | null;
  mainPlatform?: PlatformKey | null;
  size?: number;
  rounded?: number;
};

/** Profile picture: an uploaded photo, or initials on a pattern (with the main platform's badge for "auto"). */
export function Avatar({ name, source, pattern, url, mainPlatform, size = 40, rounded }: Props) {
  const radius = rounded ?? Math.round(size * 0.3);
  const showPhoto = source === "upload" && url;
  const bg = AVATAR_PATTERNS[source === "auto" ? 0 : pattern] ?? AVATAR_PATTERNS[0];
  return (
    <span className="relative inline-block flex-none" style={{ width: size, height: size }}>
      {showPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url!} alt="" className="size-full object-cover" style={{ borderRadius: radius }} />
      ) : (
        <span
          aria-hidden="true"
          className="grid size-full place-items-center font-extrabold text-white"
          style={{ background: bg, borderRadius: radius, fontSize: Math.round(size * 0.34) }}
        >
          {initials(name)}
        </span>
      )}
      {source === "auto" && mainPlatform && size >= 64 && (
        <span
          className="absolute -bottom-1.5 -right-1.5 rounded-full border-[3px] border-white px-2 py-0.5 text-[11px] font-extrabold text-white"
          style={{ background: PLATFORMS[mainPlatform].color }}
        >
          {PLATFORMS[mainPlatform].short}
        </span>
      )}
    </span>
  );
}
