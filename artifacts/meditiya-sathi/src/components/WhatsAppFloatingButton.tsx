import React from "react";
import {
  WHATSAPP_CONTACT_NUMBER,
  WHATSAPP_DEFAULT_MESSAGE,
  getWhatsAppClickToChatUrl,
} from "@/config/whatsapp";
import { cn } from "@/lib/utils";

export interface WhatsAppFloatingButtonProps {
  /** Optional custom phone number (digits only, country code included) */
  phoneNumber?: string;
  /** Optional custom pre-filled message */
  message?: string;
  /** Optional additional CSS classes */
  className?: string;
  /** Optional custom accessible label */
  ariaLabel?: string;
}

/**
 * Authentic WhatsApp vector icon SVG.
 */
function WhatsAppIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
      focusable="false"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.888 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

/**
 * Professional floating WhatsApp contact button for Meditiya Sathi website.
 *
 * - Compact and circular on mobile with safe-area spacing.
 * - Circular on desktop, expanding smoothly into a "Chat with us" pill on hover/focus.
 * - Direct wa.me click-to-chat navigation with pre-filled message.
 * - Fully accessible and integrated with dark luxury/glassmorphism design.
 */
export default function WhatsAppFloatingButton({
  phoneNumber = WHATSAPP_CONTACT_NUMBER,
  message = WHATSAPP_DEFAULT_MESSAGE,
  className,
  ariaLabel = "Contact us on WhatsApp",
}: WhatsAppFloatingButtonProps) {
  const chatUrl = getWhatsAppClickToChatUrl(phoneNumber, message);

  return (
    <aside aria-label="WhatsApp quick contact">
      <a
        href={chatUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={ariaLabel}
        title="Chat with us on WhatsApp"
        className={cn(
          "group fixed z-40 flex items-center justify-center",
          "rounded-full bg-[#25D366] text-white",
          "border border-white/25",
          "shadow-[0_4px_20px_rgba(37,211,102,0.38),0_0_0_1px_rgba(255,255,255,0.08)_inset]",
          "transition-all duration-300 ease-out",
          "hover:bg-[#20ba5a] hover:shadow-[0_6px_28px_rgba(37,211,102,0.55),0_0_0_1px_rgba(255,255,255,0.18)_inset]",
          "hover:scale-[1.03] active:scale-95",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
          // Perfect circular dimensions at rest on all viewports
          "h-12 w-12 p-0",
          // Smooth pill expansion only on desktop hover / keyboard focus
          "md:hover:w-auto md:hover:px-3.5 md:focus-visible:w-auto md:focus-visible:px-3.5",
          className
        )}
        style={{
          bottom: "calc(20px + env(safe-area-inset-bottom, 0px))",
          right: "calc(20px + env(safe-area-inset-right, 0px))",
        }}
      >
        <WhatsAppIcon className="h-6 w-6 shrink-0 transition-transform duration-300 group-hover:scale-105" />

        {/* Expandable text label on desktop hover/focus */}
        <span
          className={cn(
            "hidden md:inline-block",
            "max-w-0 overflow-hidden whitespace-nowrap text-xs font-semibold tracking-wide text-white",
            "opacity-0 transition-all duration-300 ease-out",
            "group-hover:max-w-xs group-hover:opacity-100 group-hover:ml-2 group-hover:mr-1",
            "group-focus-visible:max-w-xs group-focus-visible:opacity-100 group-focus-visible:ml-2 group-focus-visible:mr-1",
            "select-none"
          )}
        >
          Chat with us
        </span>
      </a>
    </aside>
  );
}

export { WhatsAppFloatingButton };
