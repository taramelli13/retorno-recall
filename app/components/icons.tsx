import {
  Archive,
  ArrowLeft,
  Calendar,
  Check,
  ChevronRight,
  CircleAlert,
  Clock,
  Phone,
  Search,
  Sparkles,
  SquarePen,
  Upload,
  UserPlus,
  Users,
} from "lucide-react";

type IconProps = { className?: string };

// Lucide não distribui ícones de marca; o do WhatsApp segue desenhado à mão.
export function IconWhatsApp({ className = "size-4" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.67-1.614-.918-2.209-.241-.579-.486-.501-.67-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.124-.272-.198-.57-.347z" />
      <path d="M12 2C6.477 2 2 6.477 2 12c0 2.155.683 4.152 1.848 5.795L2.5 21.5l3.828-1.298C7.886 21.32 9.866 22 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18c-1.89 0-3.655-.536-5.158-1.465l-.369-.228-2.528.857.87-2.464-.251-.383A7.95 7.95 0 0 1 4 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z" />
    </svg>
  );
}

export function IconCalendar({ className = "size-4" }: IconProps) {
  return <Calendar className={className} aria-hidden="true" />;
}

export function IconClock({ className = "size-4" }: IconProps) {
  return <Clock className={className} aria-hidden="true" />;
}

export function IconPhone({ className = "size-4" }: IconProps) {
  return <Phone className={className} aria-hidden="true" />;
}

export function IconSearch({ className = "size-4" }: IconProps) {
  return <Search className={className} aria-hidden="true" />;
}

export function IconUserPlus({ className = "size-4" }: IconProps) {
  return <UserPlus className={className} aria-hidden="true" />;
}

export function IconUpload({ className = "size-4" }: IconProps) {
  return <Upload className={className} aria-hidden="true" />;
}

export function IconArrowLeft({ className = "size-4" }: IconProps) {
  return <ArrowLeft className={className} aria-hidden="true" />;
}

export function IconCheck({ className = "size-4" }: IconProps) {
  return <Check className={className} aria-hidden="true" />;
}

export function IconAlertCircle({ className = "size-4" }: IconProps) {
  return <CircleAlert className={className} aria-hidden="true" />;
}

export function IconChevronRight({ className = "size-4" }: IconProps) {
  return <ChevronRight className={className} aria-hidden="true" />;
}

export function IconSparkles({ className = "size-4" }: IconProps) {
  return <Sparkles className={className} aria-hidden="true" />;
}

export function IconUsers({ className = "size-4" }: IconProps) {
  return <Users className={className} aria-hidden="true" />;
}

export function IconArchive({ className = "size-4" }: IconProps) {
  return <Archive className={className} aria-hidden="true" />;
}

export function IconEdit({ className = "size-4" }: IconProps) {
  return <SquarePen className={className} aria-hidden="true" />;
}
