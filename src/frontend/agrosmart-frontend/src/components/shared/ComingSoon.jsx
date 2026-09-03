export default function ComingSoon({ title }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] text-center px-margin-desktop">
      <span className="material-symbols-outlined text-6xl text-outline mb-4">
        construction
      </span>
      <h1 className="font-headline-md text-headline-md text-forest-green mb-2">
        {title}
      </h1>
      <p className="font-body-md text-body-md text-on-surface-variant">
        Esta vista todavía está en construcción.
      </p>
    </div>
  );
}