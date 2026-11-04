import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

export function UserHeader({ displayName, user, onLogout }) {
  return (
    <header className="flex items-center justify-between border-b border-slate-200/80 pb-5">
      <a
        className="inline-flex items-center gap-2.5 font-semibold tracking-tight text-slate-800"
        href="/"
        aria-label="Weather home"
      >
        <span className="grid size-9 place-items-center rounded-xl bg-sky-700 text-white shadow-sm shadow-sky-900/15">
          <MapPin size={18} aria-hidden="true" />
        </span>
        <span className="text-lg">Weather</span>
      </a>
      <div className="flex items-center gap-3">
        {user?.name && (
          <span className="hidden text-sm text-slate-600 sm:inline">
            {user.name}
          </span>
        )}
        {user?.picture ? (
          <img
            className="size-9 rounded-full border border-white object-cover shadow-sm"
            src={user.picture}
            alt=""
          />
        ) : (
          <span className="grid size-9 place-items-center rounded-full bg-sky-100 text-sm font-semibold text-sky-800">
            {displayName.charAt(0).toUpperCase()}
          </span>
        )}
        <Button
          className="rounded-xl text-slate-600"
          variant="ghost"
          size="sm"
          onClick={onLogout}
        >
          Log out
        </Button>
      </div>
    </header>
  );
}
