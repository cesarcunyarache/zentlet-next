import { notFound } from "next/navigation";

/** Cualquier ruta desconocida bajo un idioma muestra el 404 propio, traducido. */
export default function UnknownPage() {
  notFound();
}
