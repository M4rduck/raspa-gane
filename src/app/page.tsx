"use client";

import { motion } from "framer-motion";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <p className="font-display text-xs font-semibold uppercase tracking-[0.35em] text-gold/90">
          Supergiros
        </p>
        <h1 className="mt-3 font-display text-4xl font-bold tracking-tight md:text-5xl">
          Raspe digital mundialista
        </h1>
        <p className="mt-4 text-lg text-white/70">
          Backend listo: preregistro de usuario, presorteo por frecuencia de premios, enlaces únicos y API para
          que tu sistema genere links.
        </p>
      </motion.div>

      <section className="mt-14 space-y-10 rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-md grass-texture">
        <div>
          <h2 className="font-display text-xl font-semibold text-gold">1. Variables de entorno</h2>
          <p className="mt-2 text-sm text-white/65">
            Copia <code className="rounded bg-black/30 px-1.5 py-0.5 text-gold/90">.env.example</code> a{" "}
            <code className="rounded bg-black/30 px-1.5 py-0.5">.env</code>. Define{" "}
            <code className="rounded bg-black/30 px-1.5 py-0.5">DATABASE_URL</code> (PostgreSQL),{" "}
            <code className="rounded bg-black/30 px-1.5 py-0.5">NEXT_PUBLIC_APP_URL</code> (URL pública de esta
            app) y <code className="rounded bg-black/30 px-1.5 py-0.5">MASTER_ADMIN_KEY</code> para crear
            campañas.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl font-semibold text-gold">2. Base de datos y demo</h2>
          <pre className="mt-3 overflow-x-auto rounded-xl bg-black/40 p-4 text-sm text-white/85">
            {`npm install
npm run db:push
npm run db:seed`}
          </pre>
          <p className="mt-2 text-sm text-white/60">
            <code className="text-gold/90">db:push</code> crea o actualiza tablas según{" "}
            <code className="text-white/70">schema.prisma</code> (sin carpeta de migraciones). El seed crea la
            campaña <strong className="text-white/80">mundialista-demo</strong> y muestra en consola una{" "}
            <code className="text-gold/90">apiKey</code> de prueba. Atajo:{" "}
            <code className="rounded bg-black/30 px-1">npm run db:setup</code>.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl font-semibold text-gold">3. Crear campaña (admin)</h2>
          <p className="mt-2 text-sm text-white/65">
            <code className="text-gold/90">winEvery</code>: premio cada N enlaces generados (presorteo
            secuencial). Opcional <code className="text-gold/90">prizes</code>: al crear el enlace ganador se
            elige premio por <strong className="text-white/75">pesos relativos</strong> (ej.{" "}
            <code className="text-gold/90">weight: 1, 10, 50</code>) y{" "}
            <code className="text-gold/90">stockRemaining</code> (o <code className="text-gold/90">null</code>{" "}
            ilimitado), e <code className="text-gold/90">imageUrl</code> opcional (ruta <code className="text-white/70">/…</code>{" "}
            o URL <code className="text-white/70">https://…</code>) por premio. Símbolos del tablero: PS5, CARRO, MOTO,
            TV, BONO.
          </p>
          <pre className="mt-3 overflow-x-auto rounded-xl bg-black/40 p-4 text-sm text-white/85">
            {`curl -X POST http://localhost:3000/api/v1/campaigns \\
  -H "Content-Type: application/json" \\
  -H "X-Master-Key: TU_MASTER_ADMIN_KEY" \\
  -d '{"name":"Promo Copa","slug":"copa-2026","winEvery":1000,
  "prizes":[
    {"symbol":"CARRO","label":"Carro 0 KM","weight":1,"stockRemaining":1,"imageUrl":"/prizes/car.png"},
    {"symbol":"MOTO","label":"Moto","weight":10,"stockRemaining":null,"imageUrl":"https://ejemplo.com/moto.png"},
    {"symbol":"BONO","label":"Bono $50.000","weight":50,"stockRemaining":null}
  ]}'`}
          </pre>
          <p className="mt-4 text-sm text-white/65">
            <strong className="text-white/80">Ajustes en caliente</strong> (sin parar la campaña):{" "}
            <code className="text-gold/90">GET /api/v1/campaigns/{"{slug}"}</code> para ver{" "}
            <code className="text-white/70">winEvery</code>, premios y stock;{" "}
            <code className="text-gold/90">PATCH</code> la campaña (
            <code className="text-white/70">winEvery</code>, <code className="text-white/70">active</code>) o un
            premio por símbolo. <code className="text-white/70">stockRemaining</code> en PATCH es{" "}
            <strong>valor absoluto</strong> restante, no un sumando. Detalle en{" "}
            <code className="text-white/60">docs/aws-despliegue.md</code>.
          </p>
          <pre className="mt-2 overflow-x-auto rounded-xl bg-black/40 p-4 text-sm text-white/85">
            {`# Ver estado
curl http://localhost:3000/api/v1/campaigns/copa-2026 -H "X-Master-Key: TU_MASTER_ADMIN_KEY"

# Cada 500 enlaces un ganador; pausar campaña
curl -X PATCH http://localhost:3000/api/v1/campaigns/copa-2026 \\
  -H "Content-Type: application/json" -H "X-Master-Key: TU_MASTER_ADMIN_KEY" \\
  -d '{"winEvery":500,"active":false}'

# Más peso al bono y 200 unidades restantes
curl -X PATCH http://localhost:3000/api/v1/campaigns/copa-2026/prizes/BONO \\
  -H "Content-Type: application/json" -H "X-Master-Key: TU_MASTER_ADMIN_KEY" \\
  -d '{"weight":80,"stockRemaining":200}'`}
          </pre>
        </div>

        <div>
          <h2 className="font-display text-xl font-semibold text-gold">4. Reportes para el cliente</h2>
          <p className="mt-2 text-sm text-white/65">
            Misma API key que en enlaces. Página rápida:{" "}
            <a href="/cliente" className="text-gold/90 underline-offset-2 hover:underline">
              /cliente
            </a>
            . O por API:{" "}
            <code className="rounded bg-black/30 px-1.5 py-0.5 text-xs text-white/80">
              GET /api/v1/reports/participation?format=csv
            </code>{" "}
            con <code className="text-gold/90">Authorization: Bearer sg_…</code> (también{" "}
            <code className="text-white/70">format=json</code>).
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl font-semibold text-gold">5. Generar enlace (integración cliente)</h2>
          <pre className="mt-3 overflow-x-auto rounded-xl bg-black/40 p-4 text-sm text-white/85">
            {`curl -X POST http://localhost:3000/api/v1/links \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer sg_..." \\
  -d '{"externalRef":"usuario-12345"}'`}
          </pre>
          <p className="mt-2 text-sm text-white/60">
            Respuesta incluye <code className="text-gold/90">url</code> (compartir al usuario),{" "}
            <code className="text-gold/90">publicToken</code> y <code className="text-gold/90">sequence</code>.
            El usuario abre la <code className="text-gold/90">url</code>, completa el preregistro, raspa; el
            resultado queda en base de datos (ganador/perdedor + datos de contacto).
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl font-semibold text-gold">6. Consultar ganadores</h2>
          <p className="mt-2 text-sm text-white/65">
            Usa Prisma Studio o consultas SQL: tablas{" "}
            <code className="rounded bg-black/30 px-1.5">ScratchToken</code> (campo{" "}
            <code className="text-gold/90">isWinner</code>, <code className="text-gold/90">scratchedAt</code>) y{" "}
            <code className="rounded bg-black/30 px-1.5">PreRegistration</code> (nombre, email, teléfono).
          </p>
          <pre className="mt-3 overflow-x-auto rounded-xl bg-black/40 p-4 text-sm text-white/85">
            npx prisma studio
          </pre>
        </div>
      </section>

      <p className="mt-10 text-center text-sm text-white/45">
        Producción: RDS, RDS Proxy, auto scaling en{" "}
        <code className="text-white/70">docs/aws-despliegue.md</code>; cabeceras, rate limit básico y checklist en{" "}
        <code className="text-white/70">docs/seguridad.md</code>. HTTPS, rotación de API keys, WAF y cumplimiento
        legal en tu jurisdicción. Si el equipo crece, valorar{" "}
        <code className="text-white/60">prisma migrate</code> para versionar esquema además de{" "}
        <code className="text-white/60">db push</code>.
      </p>
    </main>
  );
}
