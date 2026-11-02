import "../../index.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchAlertDetails,
  fetchAlerts,
  updateAlertStatus,
} from "../../services/alertasService";

const severityStyles = {
  critical: {
    label: "Crítica",
    badge: "border-red-200 bg-red-50 text-red-800",
    marker: "bg-red-600",
  },
  moderate: {
    label: "Moderada",
    badge: "border-amber-200 bg-amber-50 text-amber-900",
    marker: "bg-amber-500",
  },
  informative: {
    label: "Informativa",
    badge: "border-sky-200 bg-sky-50 text-sky-900",
    marker: "bg-sky-600",
  },
  critica: {
    label: "Crítica",
    badge: "border-red-200 bg-red-50 text-red-800",
    marker: "bg-red-600",
  },
  moderada: {
    label: "Moderada",
    badge: "border-amber-200 bg-amber-50 text-amber-900",
    marker: "bg-amber-500",
  },
  informativa: {
    label: "Informativa",
    badge: "border-sky-200 bg-sky-50 text-sky-900",
    marker: "bg-sky-600",
  },
};

function formatDate(value) {
  if (!value) return "Fecha no disponible";
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? String(value)
    : new Intl.DateTimeFormat("es-PE", { dateStyle: "medium" }).format(date);
}

function formatDateTime(value) {
  if (!value) return "Fecha no disponible";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function formatMetric(value, unit = "") {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return "Sin dato";
  return `${new Intl.NumberFormat("es-PE", { maximumFractionDigits: 2 }).format(Number(value))}${unit ? ` ${unit}` : ""}`;
}

function getSeverity(alert) {
  const severity = severityStyles[String(alert.severity ?? "").toLowerCase()];
  return severity ?? {
    label: alert.severity ?? "Sin clasificar",
    badge: "border-slate-200 bg-slate-50 text-slate-700",
    marker: "bg-slate-400",
  };
}

function getStatusLabel(status) {
  return {
    pending: "Pendiente",
    read: "Leída",
    attended: "Atendida",
  }[status] ?? status;
}

function AlertDetails({ alert, onClose }) {
  const evidence = alert.evidence ?? {};
  const history = Array.isArray(evidence.history) ? evidence.history : [];
  const statusHistory = Array.isArray(alert.status_history) ? alert.status_history : [];
  const metricUnit = evidence.unit ?? "";

  return (
    <section
      aria-label={`Detalle de alerta ${alert.id}`}
      className="rounded-3xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            Evidencia de la alerta
          </p>
          <h2 className="mt-1 text-2xl font-bold text-forest-green">
            {alert.product ?? alert.location ?? "Riesgo agrícola"}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-outline-variant px-4 py-2 text-sm font-semibold text-on-surface hover:bg-surface-container"
        >
          Cerrar detalle
        </button>
      </div>

      <p className="mt-4 text-sm leading-6 text-on-surface-variant">{alert.explanation}</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="Periodo observado"
          value={`${formatDate(evidence.currentPeriod?.start)} – ${formatDate(evidence.currentPeriod?.end)} · promedio ${formatMetric(evidence.currentPeriod?.average, metricUnit)} · ${evidence.currentPeriod?.observations ?? 0} registros`}
        />
        <Metric
          label="Periodo comparativo"
          value={`${formatDate(evidence.comparisonPeriod?.start)} – ${formatDate(evidence.comparisonPeriod?.end)} · promedio ${formatMetric(evidence.comparisonPeriod?.average, metricUnit)} · ${evidence.comparisonPeriod?.observations ?? 0} registros`}
        />
        <Metric label="Variación observada" value={formatMetric(evidence.variationPercent, "%")} />
        <Metric label="Indicador" value={evidence.metricLabel ?? "No disponible"} />
        <Metric
          label="Umbrales informativo / moderado / crítico"
          value={evidence.thresholds
            ? `${formatMetric(evidence.thresholds.informative, "%")} / ${formatMetric(evidence.thresholds.moderate, "%")} / ${formatMetric(evidence.thresholds.critical, "%")}`
            : "No disponibles"}
        />
      </div>

      {evidence.crossSourceNote && (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          {evidence.crossSourceNote}
        </p>
      )}

      {statusHistory.length > 0 && (
        <div className="mt-5 rounded-xl border border-outline-variant p-4">
          <h3 className="font-bold text-on-surface">Trazabilidad de atención</h3>
          <ol className="mt-3 space-y-2">
            {statusHistory.map((event) => (
              <li key={event.id} className="text-sm text-on-surface-variant">
                {getStatusLabel(event.status)} · sesión {event.actor_session_id} · {formatDateTime(event.changed_at)}
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-xl border border-outline-variant">
        <div className="bg-surface-container-low px-4 py-3 text-sm font-bold text-on-surface">
          Registros que respaldan el cálculo
        </div>
        {history.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[460px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-on-surface-variant">
                <tr>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Periodo</th>
                  <th className="px-4 py-3">Valor</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row, index) => (
                  <tr key={`${row.date}-${index}`} className="border-t border-outline-variant">
                    <td className="px-4 py-3">{formatDate(row.date)}</td>
                    <td className="px-4 py-3">{row.period === "current" ? "Observado" : "Comparativo"}</td>
                    <td className="px-4 py-3 font-semibold">{formatMetric(row.value, metricUnit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-4 py-5 text-sm text-on-surface-variant">
            No hay una serie histórica suficiente para mostrar registros.
          </p>
        )}
      </div>
    </section>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-xl bg-surface-container-low p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">{label}</p>
      <p className="mt-1 text-sm font-bold text-on-surface">{value}</p>
    </div>
  );
}

export default function AlertasRiesgo() {
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState("open");
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [busyAlert, setBusyAlert] = useState(null);

  const loadAlerts = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      setData(await fetchAlerts());
    } catch (loadError) {
      setError(loadError.message || "No fue posible consultar las alertas.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const visibleAlerts = useMemo(() => {
    const alerts = data?.alerts ?? [];
    if (filter === "open") return alerts.filter((alert) => alert.status !== "attended");
    return alerts.filter((alert) => alert.status === "attended");
  }, [data, filter]);

  const openDetails = async (alert) => {
    setDetailError("");
    setSelectedAlert(null);
    try {
      setSelectedAlert(await fetchAlertDetails(alert.id));
    } catch (detailLoadError) {
      setDetailError(detailLoadError.message || "No fue posible consultar la evidencia.");
    }
  };

  const changeStatus = async (alert, status) => {
    setBusyAlert(alert.id);
    setError("");
    try {
      const updated = await updateAlertStatus(alert.id, status);
      setData((current) => ({
        ...current,
        alerts: current.alerts.map((item) => item.id === updated.id ? updated : item),
      }));
      if (selectedAlert?.id === updated.id) setSelectedAlert(updated);
    } catch (updateError) {
      setError(updateError.message || "No se pudo guardar el estado de la alerta.");
    } finally {
      setBusyAlert(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-on-surface-variant">
            Abastecimiento y clima
          </p>
          <h1 className="font-headline-lg text-3xl font-bold tracking-tight text-forest-green sm:text-4xl">
            Alertas de riesgo agrícola
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-on-surface-variant">
            Desviaciones de volumen y señales de déficit de precipitación calculadas con registros disponibles.
            Una señal de riesgo no confirma desabastecimiento.
          </p>
        </div>
        <button
          type="button"
          onClick={() => loadAlerts(true)}
          disabled={loading || refreshing}
          className="inline-flex items-center justify-center gap-2 self-start rounded-full border border-outline-variant bg-surface-container-lowest px-4 py-2.5 text-sm font-semibold text-forest-green shadow-sm hover:bg-surface-container disabled:opacity-60 md:self-auto"
        >
          <span className={`material-symbols-outlined text-lg ${refreshing ? "animate-spin" : ""}`}>sync</span>
          {refreshing ? "Actualizando…" : "Actualizar"}
        </button>
      </header>

      {error && (
        <div role="alert" className="rounded-2xl border border-error/30 bg-error-container/40 p-4 text-sm text-on-error-container">
          {error}
        </div>
      )}
      {detailError && (
        <div role="alert" className="rounded-2xl border border-error/30 bg-error-container/40 p-4 text-sm text-on-error-container">
          {detailError}
        </div>
      )}

      {selectedAlert && <AlertDetails alert={selectedAlert} onClose={() => setSelectedAlert(null)} />}

      <section className="overflow-hidden rounded-3xl border border-outline-variant/70 bg-surface-container-lowest shadow-sm">
        <div className="flex flex-col gap-4 border-b border-outline-variant/70 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="text-xl font-bold text-on-surface">Centro de alertas</h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              {data ? `${data.alerts.length} registros · ${data.configuredRules ?? 0} reglas configuradas` : "Consultando datos…"}
            </p>
          </div>
          <div className="flex gap-2" role="group" aria-label="Filtrar alertas">
            <FilterButton active={filter === "open"} onClick={() => setFilter("open")}>
              Pendientes y leídas
            </FilterButton>
            <FilterButton active={filter === "history"} onClick={() => setFilter("history")}>
              Historial atendido
            </FilterButton>
          </div>
        </div>

        {data && (data.staleRules > 0 || data.insufficientRules > 0) && (
          <div className="grid gap-3 border-b border-outline-variant/70 bg-amber-50 px-5 py-4 text-sm text-amber-950 sm:grid-cols-2 sm:px-6">
            {data.staleRules > 0 && <p>{data.staleRules} regla(s) omitida(s): indicadores desactualizados.</p>}
            {data.insufficientRules > 0 && <p>{data.insufficientRules} regla(s) omitida(s): registros insuficientes para comparar.</p>}
          </div>
        )}

        {loading ? (
          <div className="space-y-3 p-6" aria-label="Cargando alertas">
            <div className="h-20 animate-pulse rounded-2xl bg-surface-container" />
            <div className="h-20 animate-pulse rounded-2xl bg-surface-container" />
          </div>
        ) : !data ? (
          <div className="px-6 py-14 text-center">
            <h3 className="text-lg font-bold text-on-surface">No se pudo cargar el centro de alertas</h3>
            <p className="mt-2 text-sm text-on-surface-variant">
              Revisa la conexión y la configuración del webhook antes de volver a intentarlo.
            </p>
            <button
              type="button"
              onClick={() => loadAlerts(true)}
              className="mt-4 rounded-full bg-forest-green px-4 py-2 text-sm font-semibold text-white"
            >
              Reintentar consulta
            </button>
          </div>
        ) : visibleAlerts.length ? (
          <div className="divide-y divide-outline-variant/70">
            {visibleAlerts.map((alert) => {
              const severity = getSeverity(alert);
              const busy = busyAlert === alert.id;
              return (
                <article key={alert.id} className="grid gap-4 px-5 py-5 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-center">
                  <div className="flex gap-3">
                    <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${severity.marker}`} aria-hidden="true" />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-on-surface">{alert.product ?? alert.location ?? "Riesgo agrícola"}</h3>
                        <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${severity.badge}`}>{severity.label}</span>
                        <span className="rounded-full bg-surface-container px-2.5 py-1 text-xs font-semibold text-on-surface-variant">
                          {getStatusLabel(alert.status)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-on-surface-variant">
                        {[alert.market, alert.location].filter(Boolean).join(" · ") || "Alcance según los registros de la regla"}
                        {" · "}{formatDate(alert.observed_end_date)}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-on-surface">{alert.explanation}</p>
                      {alert.acted_at && (
                        <p className="mt-2 text-xs text-on-surface-variant">
                          {getStatusLabel(alert.status)} por sesión {alert.actor_session_id} · {formatDateTime(alert.acted_at)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 pl-6 lg:justify-end lg:pl-0">
                    <button
                      type="button"
                      onClick={() => openDetails(alert)}
                      className="rounded-full border border-outline-variant px-4 py-2 text-sm font-semibold text-on-surface hover:bg-surface-container"
                    >
                      Ver evidencia
                    </button>
                    {alert.status === "pending" && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => changeStatus(alert, "read")}
                        className="rounded-full border border-forest-green px-4 py-2 text-sm font-semibold text-forest-green hover:bg-primary-fixed disabled:opacity-60"
                      >
                        Marcar como leída
                      </button>
                    )}
                    {alert.status !== "attended" && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => changeStatus(alert, "attended")}
                        className="rounded-full bg-forest-green px-4 py-2 text-sm font-semibold text-white hover:bg-forest-green/90 disabled:opacity-60"
                      >
                        {busy ? "Guardando…" : "Marcar atendida"}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="px-6 py-14 text-center">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant">notifications_none</span>
            <h3 className="mt-3 text-lg font-bold text-on-surface">
              {data?.configuredRules === 0
                ? "No hay reglas de riesgo activas"
                : filter === "history" ? "Aún no hay alertas atendidas" : "No hay alertas para mostrar"}
            </h3>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-on-surface-variant">
              {data?.configuredRules === 0
                ? "No se generan alertas hasta que se activen reglas con umbrales y períodos verificables. No se cargan umbrales de ejemplo."
                : data?.alerts.length === 0
                  ? "Las reglas se evaluaron con los datos disponibles. Las desviaciones aisladas o con evidencia insuficiente no se presentan como desabastecimiento."
                  : "Las alertas atendidas permanecen en el historial y pueden consultarse desde este filtro."}
            </p>
          </div>
        )}
      </section>

      <p className="text-xs leading-5 text-on-surface-variant">
        Las alertas se basan en períodos y umbrales configurados; una reducción registrada es una señal de riesgo,
        no prueba por sí sola de desabastecimiento. Los registros climáticos y de volumen se relacionan solo cuando
        existe una clave geográfica compartida.
      </p>
    </div>
  );
}

function FilterButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
        active
          ? "bg-primary-fixed text-on-primary-fixed"
          : "border border-outline-variant text-on-surface-variant hover:bg-surface-container"
      }`}
    >
      {children}
    </button>
  );
}
