import {
  User,
  Users,
  Database,
  Server,
  Cloud,
  Lock,
  Globe,
  Mail,
  File,
  Folder,
  Settings,
  Bell,
  Shield,
  Zap,
  Box,
  type LucideIcon,
} from 'lucide-react';
import type { IconName } from '@/lib/render/node-style';

const ICON_COMPONENTS: Record<IconName, LucideIcon> = {
  user: User,
  users: Users,
  database: Database,
  server: Server,
  cloud: Cloud,
  lock: Lock,
  globe: Globe,
  mail: Mail,
  file: File,
  folder: Folder,
  settings: Settings,
  bell: Bell,
  shield: Shield,
  zap: Zap,
  box: Box,
};

interface NodeIconProps {
  name: IconName;
  x: number;
  y: number;
  size: number;
  color?: string;
}

// Lucide icons are React components, not raw SVG strings — rendered
// via <foreignObject> so they can be dropped into our SVG canvas at an
// arbitrary x/y like any other element, without reimplementing each
// icon as hand-drawn SVG paths.
export function NodeIcon({ name, x, y, size, color }: NodeIconProps) {
  const Icon = ICON_COMPONENTS[name];
  if (!Icon) return null;

  return (
    <foreignObject x={x} y={y} width={size} height={size}>
      <Icon width={size} height={size} color={color ?? 'currentColor'} strokeWidth={2} />
    </foreignObject>
  );
}