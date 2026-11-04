import { LoaderCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cityDetails, forecastDayLabel, weatherCondition } from "@/lib/weather";

export function ForecastPanel({
  city,
  forecast,
  isLoading,
  error,
  onRefresh,
}) {
  return (
    <div className="relative mx-auto w-full max-w-md">
      <div className="absolute -inset-5 rounded-[2rem] bg-gradient-to-br from-sky-100 via-white to-amber-100 blur-2xl" />
      <Card className="relative rounded-[1.75rem] border-white/80 bg-white/90 shadow-2xl shadow-sky-900/10 backdrop-blur">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold tracking-[0.16em] text-sky-700 uppercase">
                Five-day forecast
              </p>
              <CardTitle className="mt-1 text-2xl tracking-tight">
                {city.name}
              </CardTitle>
              <CardDescription className="mt-1">
                {cityDetails(city) || city.countryCode}
              </CardDescription>
            </div>
            <Button
              className="shrink-0 rounded-xl"
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
              aria-label="Refresh five-day forecast"
            >
              <RefreshCw
                className={isLoading ? "animate-spin" : ""}
                size={15}
                aria-hidden="true"
              />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          {error && (
            <p
              className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700"
              role="alert"
            >
              {error}
            </p>
          )}
          {isLoading && !forecast ? (
            <LoadingForecast />
          ) : forecast?.daily?.length ? (
            <ForecastDays days={forecast.daily} />
          ) : (
            !error && (
              <div className="flex min-h-48 items-center justify-center text-sm text-slate-500">
                Forecast data is not available.
              </div>
            )
          )}
          <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-400">
            Temperatures in °C · Powered by Open-Meteo
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function LoadingForecast() {
  return (
    <div
      className="flex min-h-48 items-center justify-center gap-2 text-sm text-slate-500"
      role="status"
    >
      <LoaderCircle
        className="animate-spin text-sky-700"
        size={18}
        aria-hidden="true"
      />
      Loading five-day forecast...
    </div>
  );
}

function ForecastDays({ days }) {
  return (
    <div className="divide-y divide-slate-100">
      {days.map((day, index) => (
        <ForecastDay day={day} index={index} key={day.date} />
      ))}
    </div>
  );
}

function ForecastDay({ day, index }) {
  const condition = weatherCondition(day.weatherCode);
  const WeatherIcon = condition.Icon;

  return (
    <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3 py-3.5">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-800">
          {forecastDayLabel(day.date, index)}
        </p>
        <p className="mt-0.5 truncate text-xs text-slate-500">
          {condition.label}
          {Number.isFinite(day.precipitationProbability) && (
            <span className="ml-2">{day.precipitationProbability}% rain</span>
          )}
        </p>
      </div>
      <WeatherIcon className="text-sky-700" size={22} aria-hidden="true" />
      <p className="min-w-16 text-right text-sm font-semibold text-slate-800">
        {Math.round(day.high)}°
        <span className="ml-1 font-normal text-slate-400">
          {Math.round(day.low)}°
        </span>
      </p>
    </div>
  );
}
