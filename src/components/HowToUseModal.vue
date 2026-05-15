<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
    <div
      ref="modalBody"
      class="bg-gray-100 dark:bg-rv-darkBg rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto relative"
    >
      <!-- Botón de cierre -->
      <button
        @click="$emit('close')"
        class="sticky top-3 left-full mr-3 float-right z-10 text-white bg-rv-navy hover:bg-rv-pink rounded-full w-9 h-9 flex items-center justify-center shadow-md transition-all border-0 outline-none focus:outline-none"
        aria-label="Cerrar"
      >
        <i class="fa-solid fa-times text-sm"></i>
      </button>

      <div class="p-6 pt-5">

        <!-- Cabecera -->
        <div class="text-center mb-6">
          <h1 class="text-2xl font-bold text-rv-navy dark:text-white mb-2">
            <i class="fa-solid fa-circle-question mr-3"></i>Cómo usar la app
          </h1>
          <p class="text-sm text-gray-500 dark:text-gray-400">Todo lo que necesitas saber para sacarle partido a Riff Valley.</p>
        </div>

        <!-- Secciones -->
        <div class="space-y-4">

          <!-- Home -->
          <div class="bg-white dark:bg-rv-darkCard rounded-xl shadow p-5">
            <h2 class="text-base font-bold text-rv-navy dark:text-white mb-2">
              <i class="fa-solid fa-house mr-2 text-rv-pink"></i>Home
            </h2>
            <p class="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              La portada de la app. Aquí encontrarás el <strong class="text-gray-800 dark:text-white">top 20 de discos mejor valorados</strong> filtrable por semana, mes, año o histórico. También puedes filtrar por género y país. En la parte superior hay un panel con las novedades de Riff Valley y un ranking de los usuarios más activos votando.
            </p>
          </div>

          <!-- Discos -->
          <div class="bg-white dark:bg-rv-darkCard rounded-xl shadow p-5">
            <h2 class="text-base font-bold text-rv-navy dark:text-white mb-2">
              <i class="fa-solid fa-compact-disc mr-2 text-rv-pink"></i>Discos
            </h2>
            <p class="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-3">
              El núcleo de la app. Un catálogo completo de lanzamientos de metal, rock, hardcore y derivados desde 2025 en adelante, organizado en tarjetas. Desde cada tarjeta puedes:
            </p>
            <ul class="text-sm text-gray-600 dark:text-gray-300 space-y-1.5 mb-3">
              <li><i class="fa-solid fa-star text-rv-pink mr-2 w-4 text-center"></i>Votar disco y portada con una nota del 1 al 10.</li>
              <li><i class="fa-solid fa-heart text-red-500 mr-2 w-4 text-center"></i>Guardarlo como favorito.</li>
              <li><i class="fa-solid fa-bookmark text-yellow-400 mr-2 w-4 text-center"></i>Marcarlo como pendiente para escuchar después.</li>
              <li><i class="fa-solid fa-comment-dots text-blue-400 mr-2 w-4 text-center"></i>Dejar un comentario y leer los del resto.</li>
              <li><i class="fa-solid fa-chart-bar text-rv-purple mr-2 w-4 text-center"></i>Ver todos los votos del disco con sus puntuaciones.</li>
              <li><i class="fa-brands fa-spotify text-green-500 mr-2 w-4 text-center"></i>Escuchar el disco directamente desde la tarjeta.</li>
              <li><i class="fa-solid fa-share-nodes text-gray-400 mr-2 w-4 text-center"></i>Compartir una imagen del disco con sus puntuaciones.</li>
            </ul>
            <img src="@/assets/DiscosEjemplo.png" alt="Ejemplo sección Discos"
              class="rounded-lg shadow mx-auto w-full max-w-md" />
          </div>

          <!-- Calendario -->
          <div class="bg-white dark:bg-rv-darkCard rounded-xl shadow p-5">
            <h2 class="text-base font-bold text-rv-navy dark:text-white mb-2">
              <i class="fa-solid fa-calendar-days mr-2 text-rv-pink"></i>Calendario
            </h2>
            <p class="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-3">
              Todos los lanzamientos organizados por día y mes, pensado para tener una visión cronológica de lo que ha salido y lo que está por salir. Puedes filtrar por género, país y año.
            </p>
            <p class="text-sm text-gray-500 dark:text-gray-400 leading-relaxed italic">
              Ten en cuenta que algunas fechas pueden no ser exactas, ya que dependemos de fuentes externas para obtener la información.
            </p>
            <img src="@/assets/CalendarioEjemplo.png" alt="Ejemplo sección Calendario"
              class="rounded-lg shadow mx-auto mt-3 w-full max-w-md" />
          </div>

          <!-- Artistas -->
          <div class="bg-white dark:bg-rv-darkCard rounded-xl shadow p-5">
            <h2 class="text-base font-bold text-rv-navy dark:text-white mb-2">
              <i class="fa-solid fa-microphone mr-2 text-rv-pink"></i>Artistas
            </h2>
            <p class="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-3">
              Una base de datos con todas las bandas y artistas que tienen disco en la app. Cada artista tiene su propia ficha con:
            </p>
            <ul class="text-sm text-gray-600 dark:text-gray-300 space-y-1.5">
              <li><i class="fa-solid fa-circle-info text-rv-blue mr-2 w-4 text-center"></i>Biografía y descripción extraída de Last.fm.</li>
              <li><i class="fa-solid fa-globe mr-2 w-4 text-center text-gray-400"></i>País de origen con su bandera.</li>
              <li><i class="fa-solid fa-music text-rv-purple mr-2 w-4 text-center"></i>Todos sus discos en la app con sus puntuaciones.</li>
              <li><i class="fa-solid fa-users text-blue-400 mr-2 w-4 text-center"></i>Artistas similares recomendados.</li>
              <li><i class="fa-brands fa-spotify text-green-500 mr-2 w-4 text-center"></i>Enlace directo a su perfil de Spotify.</li>
            </ul>
          </div>

          <!-- Estadísticas -->
          <div class="bg-white dark:bg-rv-darkCard rounded-xl shadow p-5">
            <h2 class="text-base font-bold text-rv-navy dark:text-white mb-2">
              <i class="fa-solid fa-chart-area mr-2 text-rv-pink"></i>Estadísticas
            </h2>
            <p class="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              Un resumen visual de tu actividad en la app: cuántos discos has votado, cómo se distribuyen tus notas, qué géneros predominan en tus votaciones y tu evolución a lo largo del tiempo. Puedes filtrar por año para ver períodos concretos.
            </p>
          </div>

          <!-- Sugerir discos -->
          <div class="bg-white dark:bg-rv-darkCard rounded-xl shadow p-5">
            <h2 class="text-base font-bold text-rv-navy dark:text-white mb-2">
              <i class="fa-solid fa-lightbulb mr-2 text-rv-pink"></i>Solicitud de discos
            </h2>
            <p class="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-3">
              ¿Echas en falta algún disco o artista? Puedes sugerirlos desde el apartado correspondiente rellenando el formulario con el nombre del artista, el álbum y si lo tienes, un enlace de Spotify o Bandcamp para facilitarnos la búsqueda.
            </p>
            <p class="text-sm text-gray-500 dark:text-gray-400 leading-relaxed italic">
              Todas las sugerencias se revisan manualmente antes de ser añadidas. No todo lo sugerido entra necesariamente en la app — nos centramos en metal, rock, hardcore y géneros relacionados.
            </p>
          </div>

        </div>

        <!-- Divisor -->
        <div class="my-8 border-t border-gray-200 dark:border-white/10"></div>

        <!-- Qué es Riff Valley -->
        <div class="text-center mb-6">
          <h2 class="text-xl font-bold text-rv-navy dark:text-white mb-2">
            <img src="/LOGO-RIFF-VALLEY.svg" alt="Riff Valley" class="inline w-6 h-6 mr-2 brightness-0 dark:brightness-100 translate-y-[-2px]" />
            ¿Qué es Riff Valley?
          </h2>
        </div>

        <div class="bg-white dark:bg-rv-darkCard rounded-xl shadow p-5 space-y-4 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          <p>
            <strong class="text-gray-800 dark:text-white">Riff Valley app</strong> es un proyecto creado por un grupo de amigos, paralelo al medio digital
            <a href="https://www.riffvalley.es/" target="_blank" rel="noopener"
              class="text-rv-pink underline hover:text-rv-pink/80 transition">riffvalley.es</a>.
            Nació como una herramienta interna para hacer seguimiento de todos los lanzamientos semanales de rock y metal, y fue creciendo hasta convertirse en lo que ves hoy: una plataforma social donde votar, descubrir y comentar música.
            <strong class="text-gray-800 dark:text-white">Cada semana añadimos decenas de discos nuevos</strong>, y el calendario recoge también futuros lanzamientos.
          </p>

          <a href="https://www.riffvalley.es/" target="_blank" rel="noopener">
            <img src="@/assets/RVEjemplo.webp" alt="Riff Valley web"
              class="rounded-lg shadow mx-auto my-2 w-full max-w-md" />
          </a>

          <div>
            <h3 class="text-base font-bold text-rv-navy dark:text-white mb-1">
              <i class="fa-solid fa-receipt mr-2"></i>¿Te gusta lo que ves?
            </h3>
            <p>
              Hacemos esto por <strong class="text-gray-800 dark:text-white">pura pasión por la música</strong>, compaginándolo con nuestros trabajos a tiempo completo. Mantener el hosting activo tiene un coste mensual, así que si quieres apoyar el proyecto puedes contribuir libremente a través de PayPal. Cualquier duda escríbenos a <strong class="text-gray-800 dark:text-white">contacto@riffvalley.es</strong>.
            </p>
            <div class="mt-4 text-center">
              <a href="http://paypal.me/RiffValley" target="_blank"
                class="inline-block bg-rv-pink text-white font-semibold px-6 py-2 rounded-full shadow hover:bg-rv-pink/80 transition duration-200">
                Ir al PayPal
              </a>
            </div>
          </div>

          <div>
            <h3 class="text-base font-bold text-rv-navy dark:text-white mb-1">
              <i class="fa-solid fa-hands-clapping mr-2"></i>¡Muchas gracias!
            </h3>
            <p>
              Creemos mucho en este proyecto y tu participación hace que valga la pena. Síguenos en nuestro
              <a href="https://t.me/riffvalleyapp" target="_blank" rel="noopener"
                class="text-rv-pink underline hover:text-rv-pink/80 transition">canal de Telegram</a>
              para no perderte ninguna novedad.
            </p>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
// solo emitimos `close`
</script>

<style scoped>
code {
  background-color: #f3f4f6;
  padding: 0.1rem 0.3rem;
  border-radius: 4px;
}
:global(.dark) code {
  background-color: #1f2937;
  color: #e5e7eb;
}
</style>
