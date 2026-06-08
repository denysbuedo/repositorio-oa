import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Repositorio de Objetos de Aprendizaje",
  description: "Catalogo y administracion de recursos educativos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
