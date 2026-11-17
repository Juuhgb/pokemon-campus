/** Título de grupo: "Bandeirantes ———". */
export function CampusHeader({ label }: { label: string }) {
  return (
    <h2 className="m-0 mt-2 flex items-center gap-2.5 font-display text-lg font-bold first:mt-0">
      {label}
      <span aria-hidden="true" className="h-[2.5px] flex-1 rounded-full bg-tinta/25" />
    </h2>
  );
}
