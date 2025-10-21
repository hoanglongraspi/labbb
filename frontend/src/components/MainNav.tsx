'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

export interface NavLink {
  href: string;
  label: string;
}


export const NAV_ACTION_BUTTON_CLASSES = 'inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-slate-700';
interface MainNavProps {
  title: string;
  links: NavLink[];
  rightSlot?: React.ReactNode;
}

const navBaseClasses =
  'bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 border-b border-slate-200 shadow-sm';
const navActiveClasses =
  'inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm';
const navInactiveClasses =
  'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 hover:bg-slate-100';

export function MainNav({ title, links, rightSlot }: MainNavProps) {
  const pathname = usePathname();

  return (
    <nav className={navBaseClasses}>
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-10">
          <span className="text-xl font-semibold text-sky-600">{title}</span>
          <div className="hidden items-center gap-3 md:flex">
            {links.map((link) => {
              const active = pathname === link.href || pathname?.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={clsx(active ? navActiveClasses : navInactiveClasses)}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-3">{rightSlot}</div>
      </div>
    </nav>
  );
}
