import "../../index.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchCalendarEvents } from "../../services/calendarioService";

const EMPTY_FILTERS = {
  desde: "",
  hasta: "",
  departamento: "",
  modalidad: "",
  entidad: "",
  q: "",
};

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function parseDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

function toISODate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDate(value, options = { dateStyle: "long" }) {
  const date = parseDate(value);
  return date
    ? new Intl.DateTimeFormat("es-PE", options).format(date)
    : "No especificado";
}

function formatMonth(month) {
  return new Intl.DateTimeFormat("es-PE", { month: "long", year: "numeric" }).format(month);
}

function formatRange(event) {
  const start = formatDate(event.fecha_inicio);
  const end = event.fecha_fin && event.fecha_fin !== event.fecha_inicio
    ? formatDate(event.fecha_fin)
    : event.fecha_fin
      ? ""
      : "No especificado";
  return end ? `${start} – ${end}` : start;
}

function formatHours(event) {
  if (!event.hora_inicio && !event.hora_fin) return "No especificado";
  if (event.hora_inicio && event.hora_fin) {
    return `${event.hora_inicio.slice(0, 5)} – ${event.hora_fin.slice(0, 5)}`;
  }
  return (event.hora_inicio ?? event.hora_fin).slice(0, 5);
}

function eventCoversDate(event, isoDate) {
  const start = parseDate(event.fecha_inicio);
  const end = parseDate(event.fecha_fin) ?? start;
  const current = parseDate(isoDate);
  return Boolean(start && end && current && current >= start && current <= end);
}

function eventSortValue(event) {
  const date = parseDate(event.fecha_inicio);
  return date ? date.getTime() : Number.MAX_SAFE_INTEGER;
}

function eventKey(event, index) {
  return event.id ?? `${event.titulo ?? "evento"}-${event.fecha_inicio ?? "sin-fecha"}-${index}`;
}

function EventDetails({ event, onClose }) {
  const fields = [
    ["Fechas", formatRange(event)],
    ["Horario", formatHours(event)],
    ["Departamento", event.departamento],
    ["Alcance", event.alcance],
    ["Modalidad", event.modalidad],
    ["Lugar o plataforma", event.lugar_o_plataforma],
    ["Entidad organizadora", event.entidad_organizadora],
    ["Contacto", event.contacto],
    ["Observaciones", event.observaciones],
    ["Documento fuente MIDAGRI", event.fuente],
  ];

  return (
    <div className="calendar-modal-backdrop" onMouseDown={onClose}>
      <section
        className="calendar-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="calendar-event-title"
        onMouseDown={(eventMouse) => eventMouse.stopPropagation()}
      >
        <header className="calendar-modal-header">
          <button type="button" className="calendar-modal-close" onClick={onClose} aria-label="Cerrar detalle">
            ×
          </button>
          <p className="calendar-modal-kicker">Detalle del evento</p>
          <h2 id="calendar-event-title">{event.titulo || "No especificado"}</h2>
        </header>
        <dl className="calendar-modal-body">
          {fields.map(([label, value]) => (
            <div
              className={`calendar-detail-field${label === "Observaciones" || label === "Documento fuente MIDAGRI" ? " calendar-detail-field-wide" : ""}`}
              key={label}
            >
              <dt>{label}</dt>
              <dd className={label === "Documento fuente MIDAGRI" && value ? "calendar-source" : ""}>
                {value ? String(value) : "No especificado"}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}

function MonthGrid({ month, events, onSelect }) {
  const days = useMemo(() => {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const firstOfMonth = new Date(year, monthIndex, 1);
    const mondayOffset = (firstOfMonth.getDay() + 6) % 7;
    const firstVisible = new Date(year, monthIndex, 1 - mondayOffset);
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(firstVisible.getFullYear(), firstVisible.getMonth(), firstVisible.getDate() + index);
      return {
        date,
        iso: toISODate(date),
        inMonth: date.getMonth() === monthIndex,
      };
    });
  }, [month]);

  const today = toISODate(new Date());
  const sortedEvents = useMemo(
    () => events.map((event, index) => ({ event, index })).sort((a, b) => eventSortValue(a.event) - eventSortValue(b.event)),
    [events],
  );

  return (
    <>
      <div className="calendar-weekdays" aria-hidden="true">
        {WEEKDAYS.map((day) => <div key={day}>{day}</div>)}
      </div>
      <div className="calendar-grid" role="grid" aria-label={`Calendario de ${formatMonth(month)}`}>
        {days.map(({ date, iso, inMonth }) => {
          const eventsOnDate = sortedEvents.filter(({ event }) => eventCoversDate(event, iso));
          const classes = [
            "calendar-day",
            !inMonth && "calendar-day-outside",
            iso === today && "calendar-day-today",
          ].filter(Boolean).join(" ");

          return (
            <div className={classes} role="gridcell" key={iso} aria-label={formatDate(iso)}>
              <div className="calendar-day-number">{date.getDate()}</div>
              <div className="calendar-day-events">
                {eventsOnDate.map(({ event, index }) => (
                  <button
                    type="button"
                    key={eventKey(event, index)}
                    className={`calendar-event-chip${event.fecha_fin && event.fecha_fin !== event.fecha_inicio ? " calendar-event-chip-multiday" : ""}`}
                    title={`${event.titulo || "No especificado"} · ${formatHours(event)}`}
                    onClick={() => onSelect(event)}
                  >
                    {event.titulo || "No especificado"}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function EventList({ events, onSelect }) {
  const sortedEvents = useMemo(
    () => events.map((event, index) => ({ event, index })).sort((a, b) => {
      const dateDifference = eventSortValue(a.event) - eventSortValue(b.event);
      return dateDifference || String(a.event.hora_inicio ?? "").localeCompare(String(b.event.hora_inicio ?? ""));
    }),
    [events],
  );

  return (
    <div className="calendar-list">
      {sortedEvents.map(({ event, index }) => (
        <article className="calendar-list-event" key={eventKey(event, index)}>
          <div className="calendar-list-date">
            {formatDate(event.fecha_inicio, { day: "2-digit", month: "short" })}
            {event.fecha_fin && event.fecha_fin !== event.fecha_inicio && (
              <> – {formatDate(event.fecha_fin, { day: "2-digit", month: "short" })}</>
            )}
          </div>
          <div>
            <button type="button" className="calendar-list-title" onClick={() => onSelect(event)}>
              {event.titulo || "No especificado"}
            </button>
            <div className="calendar-list-meta">
              <span>{formatHours(event)}</span>
              <span>{event.departamento || "No especificado"}</span>
              <span>{event.entidad_organizadora || "No especificado"}</span>
            </div>
          </div>
          <span className="calendar-modality">{event.modalidad || "No especificado"}</span>
        </article>
      ))}
    </div>
  );
}

function ActiveFilters({ filters, onRemove }) {
  const labels = [
    ["q", "Búsqueda"],
    ["desde", "Desde"],
    ["hasta", "Hasta"],
    ["departamento", "Departamento"],
    ["modalidad", "Modalidad"],
    ["entidad", "Entidad"],
  ];
  const active = labels.filter(([key]) => filters[key]);
  if (!active.length) return null;

  return (
    <div className="calendar-active-filters" aria-label="Filtros activos">
      <span className="calendar-active-label">Filtros activos:</span>
      {active.map(([key, label]) => (
        <span className="calendar-filter-chip" key={key}>
          {label}: {filters[key]}
          <button type="button" aria-label={`Quitar filtro ${label}`} onClick={() => onRemove(key)}>×</button>
        </span>
      ))}
    </div>
  );
}

export default function CalendarioAgricola() {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [draftFilters, setDraftFilters] = useState(EMPTY_FILTERS);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [view, setView] = useState("month");
  const [result, setResult] = useState({ total: 0, eventos: [] });
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterError, setFilterError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");

    fetchCalendarEvents({ month, filters, signal: controller.signal })
      .then(setResult)
      .catch((loadError) => {
        if (loadError.name !== "AbortError") {
          setError(loadError.message || "No fue posible consultar los eventos publicados.");
          setResult({ total: 0, eventos: [] });
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [month, filters, retry]);

  const monthLabel = formatMonth(month);
  const events = result.eventos;

  const changeMonth = useCallback((offset) => {
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }, []);

  const updateDraft = (key, value) => {
    setDraftFilters((current) => ({ ...current, [key]: value }));
  };

  const applyFilters = (event) => {
    event.preventDefault();
    const desde = draftFilters.desde.trim();
    const hasta = draftFilters.hasta.trim();
    if (desde && hasta && desde > hasta) {
      setFilterError("La fecha inicial debe ser anterior o igual a la fecha final.");
      return;
    }

    setFilterError("");
    setFilters(Object.fromEntries(
      Object.entries(draftFilters).map(([key, value]) => [key, value.trim()]),
    ));
  };

  const removeFilter = (key) => {
    const next = { ...filters, [key]: "" };
    setFilters(next);
    setDraftFilters(next);
    setFilterError("");
  };

  const clearFilters = () => {
    setDraftFilters(EMPTY_FILTERS);
    setFilters(EMPTY_FILTERS);
    setFilterError("");
  };

  const goToToday = () => {
    const now = new Date();
    setMonth(new Date(now.getFullYear(), now.getMonth(), 1));
  };

  return (
    <main className="calendar-shell">
      <div className="calendar-container">
        <header className="calendar-hero">
          <div className="calendar-hero-copy">
            <p className="calendar-eyebrow">Agenda oficial · MIDAGRI y entidades</p>
            <h1>Calendario Agrícola</h1>
            <p>
              Encuentra actividades que acompañan tu trabajo en el campo y el mercado.
              Consulta eventos publicados y planifica tu participación.
            </p>
          </div>
          <div className="calendar-hero-count" aria-live="polite">
            <strong>{loading ? "…" : result.total}</strong>
            <span>{result.total === 1 ? "evento en el período" : "eventos en el período"}</span>
          </div>
        </header>

        <section className="calendar-panel">
          <form className="calendar-filters" onSubmit={applyFilters}>
            <div className="calendar-section-heading">
              <div>
                <h2>Encuentra una actividad</h2>
                <p>Filtra los eventos publicados por fecha y tema de interés.</p>
              </div>
            </div>
            <div className="calendar-filter-grid">
              <div className="calendar-field calendar-field-wide">
                <label htmlFor="calendar-search">Buscar por nombre</label>
                <input
                  id="calendar-search"
                  type="search"
                  value={draftFilters.q}
                  onChange={(event) => updateDraft("q", event.target.value)}
                  placeholder="Ej.: palto"
                />
              </div>
              <div className="calendar-field">
                <label htmlFor="calendar-department">Departamento</label>
                <input
                  id="calendar-department"
                  value={draftFilters.departamento}
                  onChange={(event) => updateDraft("departamento", event.target.value)}
                  placeholder="Escribe un departamento"
                />
              </div>
              <div className="calendar-field">
                <label htmlFor="calendar-modality">Modalidad</label>
                <input
                  id="calendar-modality"
                  value={draftFilters.modalidad}
                  onChange={(event) => updateDraft("modalidad", event.target.value)}
                  placeholder="Escribe una modalidad"
                />
              </div>
              <div className="calendar-field calendar-field-wide">
                <label htmlFor="calendar-entity">Entidad organizadora</label>
                <input
                  id="calendar-entity"
                  value={draftFilters.entidad}
                  onChange={(event) => updateDraft("entidad", event.target.value)}
                  placeholder="Escribe el nombre de la entidad"
                />
              </div>
              <div className="calendar-field">
                <label htmlFor="calendar-from">Desde</label>
                <input
                  id="calendar-from"
                  type="date"
                  value={draftFilters.desde}
                  onChange={(event) => updateDraft("desde", event.target.value)}
                />
              </div>
              <div className="calendar-field">
                <label htmlFor="calendar-to">Hasta</label>
                <input
                  id="calendar-to"
                  type="date"
                  value={draftFilters.hasta}
                  onChange={(event) => updateDraft("hasta", event.target.value)}
                />
              </div>
              <div className="calendar-filter-actions">
                <button className="calendar-button calendar-button-primary" type="submit" disabled={loading}>
                  Aplicar filtros
                </button>
                <button className="calendar-button calendar-button-quiet" type="button" onClick={clearFilters}>
                  Limpiar
                </button>
              </div>
            </div>
            {filterError && <p className="calendar-footer-note" role="alert">{filterError}</p>}
            <ActiveFilters filters={filters} onRemove={removeFilter} />
          </form>

          <div className="calendar-toolbar">
            <div className="calendar-month-controls">
              <button
                type="button"
                className="calendar-icon-button"
                onClick={() => changeMonth(-1)}
                aria-label="Mes anterior"
              >
                ‹
              </button>
              <h2>{monthLabel}</h2>
              <button
                type="button"
                className="calendar-icon-button"
                onClick={() => changeMonth(1)}
                aria-label="Mes siguiente"
              >
                ›
              </button>
              <button type="button" className="calendar-today-button" onClick={goToToday}>
                Hoy
              </button>
            </div>
            <div className="calendar-view-controls" role="group" aria-label="Vista de eventos">
              <button
                type="button"
                className="calendar-view-button"
                aria-pressed={view === "month"}
                onClick={() => setView("month")}
              >
                Mes
              </button>
              <button
                type="button"
                className="calendar-view-button"
                aria-pressed={view === "list"}
                onClick={() => setView("list")}
              >
                Lista
              </button>
            </div>
          </div>

          <div className="calendar-content">
            {loading ? (
              <div className="calendar-loading" role="status" aria-label="Cargando eventos">
                <div className="calendar-spinner" />
              </div>
            ) : error ? (
              <div className="calendar-error" role="alert">
                <div>
                  <div className="calendar-empty-icon" aria-hidden="true">!</div>
                  <h3>No se pudo cargar el calendario</h3>
                  <p>{error}</p>
                  <button
                    type="button"
                    className="calendar-button calendar-button-primary"
                    onClick={() => setRetry((current) => current + 1)}
                  >
                    Reintentar
                  </button>
                </div>
              </div>
            ) : events.length === 0 ? (
              <div className="calendar-empty">
                <div>
                  <div className="calendar-empty-icon" aria-hidden="true">▦</div>
                  <h3>No hay eventos para este período</h3>
                  <p>
                    No encontramos actividades publicadas para {monthLabel} con los filtros actuales.
                    Prueba otro mes o limpia algunos filtros.
                  </p>
                  {Object.values(filters).some(Boolean) && (
                    <button type="button" className="calendar-button calendar-button-quiet" onClick={clearFilters}>
                      Limpiar filtros
                    </button>
                  )}
                </div>
              </div>
            ) : view === "month" ? (
              <MonthGrid month={month} events={events} onSelect={setSelectedEvent} />
            ) : (
              <EventList events={events} onSelect={setSelectedEvent} />
            )}
            <p className="calendar-footer-note">
              Eventos consultados desde el calendario MIDAGRI. Los campos no informados por la fuente se indican
              como “No especificado”.
            </p>
          </div>
        </section>
      </div>

      {selectedEvent && (
        <EventDetails event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
    </main>
  );
}
