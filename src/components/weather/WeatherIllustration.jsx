import { MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";

export function WeatherIllustration() {
  return (
    <div className="relative mx-auto hidden w-full max-w-md lg:block">
      <div className="absolute -inset-8 rounded-[2.5rem] bg-gradient-to-br from-sky-100 via-white to-amber-100 blur-2xl" />
      <Card className="relative overflow-hidden rounded-[1.75rem] border-white/80 bg-white/80 py-0 shadow-2xl shadow-sky-900/10 backdrop-blur">
        <div className="relative min-h-[410px] overflow-hidden bg-gradient-to-br from-sky-100 via-sky-50 to-amber-50 p-8">
          <div className="absolute top-12 right-10 size-28 rounded-full bg-amber-300/80 shadow-[0_0_70px_20px_rgba(251,191,36,0.22)]" />
          <span className="absolute top-24 left-8 text-5xl" aria-hidden="true">
            ☁️
          </span>
          <span className="absolute top-44 right-24 text-4xl" aria-hidden="true">
            ☁️
          </span>
          <div className="absolute right-0 bottom-0 left-0 h-40 rounded-t-[50%] bg-emerald-100/70" />
          <div className="absolute right-[-15%] bottom-[-4rem] left-[-15%] h-44 rounded-[50%] bg-emerald-200/75" />
          <div className="absolute inset-x-7 bottom-7 rounded-2xl border border-white/70 bg-white/75 p-5 shadow-lg shadow-slate-900/5 backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">
                  Your forecast starts with
                </p>
                <p className="mt-1 text-lg font-semibold tracking-tight text-slate-800">
                  the right city
                </p>
              </div>
              <span className="grid size-11 place-items-center rounded-xl bg-sky-100 text-sky-800">
                <MapPin size={20} aria-hidden="true" />
              </span>
            </div>
            <div className="mt-4 flex gap-1.5" aria-hidden="true">
              <span className="h-1.5 flex-1 rounded-full bg-sky-600" />
              <span className="h-1.5 flex-1 rounded-full bg-slate-200" />
              <span className="h-1.5 flex-1 rounded-full bg-slate-200" />
              <span className="h-1.5 flex-1 rounded-full bg-slate-200" />
              <span className="h-1.5 flex-1 rounded-full bg-slate-200" />
            </div>
          </div>
        </div>
      </Card>
      <p className="relative mt-5 text-center text-xs text-slate-500">
        A forecast that feels a little closer to home.
      </p>
    </div>
  );
}
