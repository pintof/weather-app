import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function LoginCard({ error, onLogin, onSignup }) {
  return (
    <main className="grid min-h-screen place-items-center bg-gradient-to-br from-sky-50 via-white to-amber-50 p-6">
      <Card className="w-full max-w-md border-white/80 bg-white/90 shadow-xl shadow-slate-200/60">
        <CardHeader className="gap-4">
          <span className="grid size-12 place-items-center rounded-2xl bg-sky-600 text-white">
            <MapPin aria-hidden="true" />
          </span>
          <div className="space-y-2">
            <p className="text-xs font-semibold tracking-[0.18em] text-sky-700 uppercase">
              Your weather space
            </p>
            <CardTitle className="text-3xl tracking-tight">
              Weather, made personal.
            </CardTitle>
            <CardDescription className="leading-relaxed">
              Sign in to choose a city and make this forecast yours.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <div className="flex gap-3">
            <Button
              className="flex-1 rounded-xl bg-sky-700 text-white hover:bg-sky-800"
              onClick={onLogin}
            >
              Log in
            </Button>
            <Button
              className="flex-1 rounded-xl"
              variant="outline"
              onClick={onSignup}
            >
              Sign up
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
