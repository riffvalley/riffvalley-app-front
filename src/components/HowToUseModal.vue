<template>
    <div class="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
        <div
            class="bg-white rounded-3xl shadow-xl max-w-3xl w-[90vw] sm:w-full max-h-[90vh] overflow-y-auto relative p-6">
            <!-- Botón de cierre -->
            <button @click="$emit('close')"
                class="absolute top-2 right-2 text-white hover:text-[#d9e021] bg-gray-700 hover:bg-gray-800 rounded-full w-10 h-10 flex items-center justify-center shadow-md transition-all">
                ✖
            </button>

            <h1
                class="text-xl font-bold mb-3 text-white bg-gray-700 px-4 py-1 rounded-full text-center inline-block mx-auto shadow">
                Cómo usar la app
            </h1>

            <div class="space-y-4 text-sm text-gray-700">
                <div>
                    <h2 class="text-lg font-semibold mb-1">
                        <i class="fa-solid fa-house text-md mr-2"></i>¿Qué se puede hacer en Home?
                    </h2>
                    <p class="text-gray-700">
                        En la sección <strong>Home</strong> podrás ver el <strong>top 20</strong> discos mejor valorados por los usuarios
                        semanal,
                        mensual, anual e históricamente. Es una
                        forma rápida de descubrir los lanzamientos más destacados según los votos de la comunidad, ideal si tienes
                        poco
                        tiempo libre.
                    </p>
                </div>

                <div>
                    <h2 class="text-lg font-semibold mt-4 mb-1">
                        <i class="fa-solid fa-compact-disc text-md mr-2"></i>¿Qué hay en la sección Discos?
                    </h2>
                    <p class="text-gray-700">
                        En la sección <strong>Discos</strong> encontrarás el listado completo de lanzamientos mediante
                        tarjetas. Puedes ver sus portadas, puntuarlos, dejar comentarios<i
                            class="fa-solid fa-comment-dots text-sm text-gray-600 ml-1"></i>,
                        guardarlos como favoritos<i class="fa-solid fa-heart text-sm text-red-500 ml-1"></i>
                        o marcarlos como pendientes<i class="fa-solid fa-bookmark text-sm text-yellow-400 ml-1"></i>.
                        Esta sección es la más importante y la más social.
                    </p>
                    <img src="@/assets/DiscosEjemplo.png" alt="Ejemplo sección Discos"
                        class="rounded-lg shadow-md mx-auto my-4 w-full max-w-md" />
                </div>

                <div>
                    <h2 class="text-lg font-semibold mt-4 mb-1">
                        <i class="fa-solid fa-calendar-days text-md mr-2"></i>¿Para qué sirve el Calendario?
                    </h2>
                    <p class="text-gray-700">
                        En el <strong>Calendario</strong> podrás consultar todos los lanzamientos ordenados por días y
                        meses. Aquí podrás consultar qué se lanzó y qué se lanzará, además de poder hacer click en
                        artista o
                        álbum (pero ojo, no siempre es fiel y encontrarás cosas que no son correctas debido a las
                        fuentes de
                        donde extraemos a la información).
                    </p>
                    <img src="@/assets/CalendarioEjemplo.png" alt="Ejemplo sección Discos"
                        class="rounded-lg shadow-md mx-auto my-4 w-full max-w-md" />
                </div>

                <div>
                    <h2 class="text-lg font-semibold mt-4 mb-1">
                        <i class="fa-solid fa-lightbulb text-md mr-2"></i>¿Cómo puedo sugerir discos nuevos?
                    </h2>
                    <p class="text-gray-700">
                        También puedes <strong>Sugerir discos</strong> siguiendo el formato:
                        <code>Nombre de banda – Título del disco</code>, además de añadir su fecha correspondiente.
                        Nuestro equipo revisará las solicitudes para su posible inclusión.
                    </p>

                    <p class="text-yellow-600 font-semibold mt-3 text-sm text-center">
                        <i class="fa-solid fa-triangle-exclamation mr-1 text-yellow-600"></i>
                        Este sistema es temporal. De momento, al solicitar un disco, te redirige al email con tu fecha y
                        disco sugerido
                        para que simplemente tengas que hacer click en enviar, pero estamos trabajando en un sistema
                        interno
                        de moderación.
                    </p>
                </div>

                <div class="max-w-4xl mx-auto px-4 py-4">
                    <h1
                        class="text-xl font-bold mb-3 text-white bg-gray-700 px-4 py-1 rounded-full text-center inline-block mx-auto shadow">
                        ¿Qué es Riff Valley app?
                    </h1>

                    <div class="space-y-4">

                        <div>
                            <p class="text-gray-700">
                                <strong>Riff Valley app</strong> es un proyecto que hemos creado un grupo de amigos, paralelo
                                al medio
                                digital <a href="https://www.riffvalley.es/" target="_blank"
                                    class="text-blue-600 underline hover:text-blue-800">Riff Valley</a>.
                                Creamos todo esto inicialmente de manera interna para poder hacer un seguimiento de
                                todos los
                                lanzamientos que salen cada semana,
                                y si encima podemos votarlos y crear un sistema social donde poder ver votos de otra
                                gente, mejor
                                que mejor.
                                <strong>Cada semana vamos añadiendo a la app decenas de discos nuevos</strong> y en el
                                calendario
                                podrás consultar futuros lanzamientos.
                            </p>
                                                        <a href="https://www.riffvalley.es/" target="_blank" rel="noopener">
                                <img src="@/assets/RVEjemplo.webp" alt="Ejemplo sección Discos"
                                    class="rounded-lg shadow-md mx-auto my-4 w-full max-w-md" />
                            </a>
                        </div>

                        <div>
                            <h2 class="text-xl font-semibold mt-6">
                                <i class="fa-solid fa-receipt text-md mr-2"></i>¿Te gusta lo que ves?
                            </h2>
                            <p class="text-gray-700">
                                Creamos esta app por <strong>pura pasión por la música</strong>, pero como muchos
                                sabréis,
                                mantenemos nuestros trabajos a tiempo completo. Aun así, mantener activo el
                                <em>hosting</em> de esta
                                plataforma nos supone un gasto mensual.
                                Por ello, podéis sentiros libres para <strong>aportar lo que consideréis al proyecto</strong>
                                para que podamos seguir desarrollando y mejorando este proyecto. 
                                Hemos habilitado un <strong>una cuenta de PayPal</strong> donde puedes realizar tu
                                aportación.
                                Notifícanos a
                                <strong>contacto@riffvalley.es</strong> cualquier duda con respecto a esto sin problema.
                                Aquí tienes
                                el enlace:
                            </p>
                        </div>

                        <div class="mt-4 text-center">
                            <a href="http://paypal.me/RiffValley" target="_blank"
                                class="inline-block bg-rv-pink text-white font-semibold px-6 py-2 hover:bg-rv-pink/80 hover:text-white rounded-full shadow transition duration-200">
                                Ir al PayPal
                            </a>
                        </div>

                        <div>
                            <h2 class="text-xl font-semibold mt-6">
                                <i class="fa-solid fa-hands-clapping text-md mr-2"></i>¡Muchas gracias!
                            </h2>
                            <p class="text-gray-700">
                                Creemos mucho en este proyecto y te necesitamos para seguir creciendo. No dudes en
                                seguir nuestro
                                <a href="https://t.me/riffvalleyapp" target="_blank"
                                    class="text-blue-600 underline hover:text-blue-800 transition">
                                    canal de Telegram
                                </a>
                                para no perderte ninguna novedad.
                            </p>

                        </div>

                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
// sin lógica necesaria, solo emitimos `close`
</script>

<style scoped>
code {
    background-color: #f3f4f6;
    padding: 0.1rem 0.3rem;
    border-radius: 4px;
}
</style>
