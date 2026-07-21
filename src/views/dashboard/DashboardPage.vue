<template>
  <div class="max-w-[100rem] mx-auto mt-10 px-4 pb-16">

    <!-- Welcome banner -->
    <div class="relative overflow-hidden rounded-2xl border border-rv-pink/20 dark:border-white/10 p-6 md:p-8 mb-8 bg-gradient-to-br from-rv-pink/10 via-rv-purple/5 to-transparent dark:from-rv-pink/10 dark:via-rv-purple/5 dark:to-transparent">
      <div class="pointer-events-none absolute -top-10 -right-10 w-48 h-48 rounded-full bg-rv-pink/10 blur-2xl"></div>
      <div class="pointer-events-none absolute -bottom-8 right-20 w-64 h-64 rounded-full bg-rv-purple/10 blur-2xl"></div>
      <div class="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div>
          <p class="text-sm text-gray-400 dark:text-gray-500 mb-1 capitalize">{{ todayFormatted }}</p>
          <h1 class="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white leading-tight">
            Hola, <span class="text-rv-pink">{{ username }}</span>
          </h1>
          <p class="text-gray-500 dark:text-gray-400 mt-1.5">Bienvenid@ a Riff Valley App</p>
        </div>
        <div class="flex gap-3 shrink-0 flex-wrap justify-center sm:justify-end">
          <div class="text-center bg-white/70 dark:bg-white/5 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/60 dark:border-white/10 shadow-sm min-w-[80px]">
            <p class="text-2xl font-bold text-rv-pink tabular-nums">{{ loading ? '…' : userDiscVotes }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">discos votados</p>
          </div>
          <div class="text-center bg-white/70 dark:bg-white/5 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/60 dark:border-white/10 shadow-sm min-w-[80px]">
            <p class="text-2xl font-bold text-rv-purple tabular-nums">{{ loading ? '…' : userCoverVotes }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">portadas votadas</p>
          </div>
          <div class="text-center bg-white/70 dark:bg-white/5 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/60 dark:border-white/10 shadow-sm min-w-[80px]">
            <p class="text-2xl font-bold text-blue-500 dark:text-blue-400 tabular-nums">{{ loading ? '…' : stats.totalDiscs }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">discos en la app</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Novedades + Comunidad + Top usuarios -->
    <div class="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 mb-6 items-start">
      <!-- Novedades Riff Valley -->
      <div class="bg-white dark:bg-rv-darkCard shadow-sm rounded-2xl p-4 sm:p-6 border border-gray-200 dark:border-white/10">
        <h3 class="text-xl font-bold text-rv-navy dark:text-white mb-4 text-center shrink-0">Novedades Riff Valley</h3>
        <NewsFeed />
      </div>

      <!-- Columna derecha -->
      <div class="flex flex-col gap-6">
        <!-- Comunidad -->
        <div class="bg-white dark:bg-rv-darkCard shadow-sm rounded-2xl p-4 sm:p-5 border border-gray-200 dark:border-white/10">
          <h3 class="text-lg font-bold text-rv-navy dark:text-white mb-4 flex items-center justify-center gap-2">
            <img src="/LOGO-RIFF-VALLEY.svg" alt="Riff Valley" class="w-5 h-5 brightness-0 dark:brightness-100" />
            Comunidad
          </h3>
          <div class="flex flex-col gap-2.5">
            <div class="community-row">
              <span class="community-label">App</span>
              <a href="https://t.me/RiffValleyAppUpdates" target="_blank" rel="noopener noreferrer" class="community-pill bg-[#229ED9] hover:bg-[#1a8bc2]"><i class="fa-brands fa-telegram"></i> Canal</a>
              <a href="https://t.me/RiffValleyApp" target="_blank" rel="noopener noreferrer" class="community-pill bg-rv-pink hover:bg-rv-pink/80"><i class="fa-solid fa-comments"></i> Grupo</a>
            </div>
            <div class="community-row">
              <span class="community-label">Web</span>
              <a href="https://riffvalley.es" target="_blank" rel="noopener noreferrer" class="community-pill bg-rv-navy hover:bg-rv-navy/70"><i class="fa-solid fa-globe"></i> Web</a>
              <a href="https://www.riffvalley.es/agenda-conciertos" target="_blank" rel="noopener noreferrer" class="community-pill bg-rv-purple hover:bg-rv-purple/80"><i class="fa-solid fa-calendar-days"></i> Conciertos</a>
            </div>
            <div class="community-row">
              <span class="community-label">Conciertos</span>
              <a href="https://t.me/conciertosrockmetal" target="_blank" rel="noopener noreferrer" class="community-pill bg-[#229ED9] hover:bg-[#1a8bc2]"><i class="fa-brands fa-telegram"></i> Canal</a>
              <a href="https://t.me/riffvalley" target="_blank" rel="noopener noreferrer" class="community-pill bg-rv-pink hover:bg-rv-pink/80"><i class="fa-solid fa-comments"></i> Grupo</a>
            </div>
          </div>
        </div>

        <!-- Top Usuarios -->
        <div class="bg-white dark:bg-rv-darkCard shadow-sm rounded-2xl p-4 sm:p-5 border border-gray-200 dark:border-white/10">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-base font-bold text-rv-navy dark:text-white flex items-center gap-2">
              <i class="fa-solid fa-user-group"></i>Top usuarios
            </h3>
            <div class="relative inline-flex">
              <select v-model="selectedStatsYear" @change="fetchStats"
                class="pl-3 pr-7 py-1 rounded-full text-xs font-semibold bg-rv-navy text-white appearance-none cursor-pointer focus:outline-none border-none ring-0">
                <option v-for="option in availableStatsYears" :key="option.value" :value="option.value">{{ option.label }}</option>
              </select>
              <svg class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          <!-- Tabs Discos / Portadas -->
          <div class="flex gap-1 mb-3 p-1 bg-gray-100 dark:bg-rv-darkSurface rounded-lg">
            <button @click="topUsersTab = 'rates'"
              :class="topUsersTab === 'rates' ? 'bg-rv-purple text-white shadow' : 'bg-gray-200 dark:bg-transparent text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-white/10'"
              class="flex-1 py-1 px-2 rounded-md text-xs font-semibold transition-all duration-150 outline-none focus:outline-none">
              <i class="fa-solid fa-compact-disc mr-1 text-[10px]"></i>Discos
            </button>
            <button @click="topUsersTab = 'cover'"
              :class="topUsersTab === 'cover' ? 'bg-rv-purple text-white shadow' : 'bg-gray-200 dark:bg-transparent text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-white/10'"
              class="flex-1 py-1 px-2 rounded-md text-xs font-semibold transition-all duration-150 outline-none focus:outline-none">
              <i class="fa-solid fa-image mr-1 text-[10px]"></i>Portadas
            </button>
          </div>

          <!-- Lista ranking -->
          <ul class="space-y-0.5">
            <template v-if="topUsersTab === 'rates'">
              <li v-if="topUsersByRates.length === 0" class="text-gray-400 italic text-xs text-center py-3">No hay datos</li>
              <li v-for="(user, index) in topUsersByRates" :key="user.user.id"
                class="flex items-center gap-2.5 py-1.5 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                <span class="text-xs w-5 text-center shrink-0" v-html="getTrophyIcon(index)"></span>
                <span class="text-sm font-medium text-gray-800 dark:text-gray-200 truncate min-w-0 flex-1">{{ user.user.username }}</span>
                <span class="text-xs font-bold tabular-nums shrink-0 bg-gray-100 dark:bg-rv-darkSurface text-rv-navy dark:text-white px-2 py-0.5 rounded-full">{{ user.rateCount }}</span>
              </li>
            </template>
            <template v-else>
              <li v-if="topUsersByCover.length === 0" class="text-gray-400 italic text-xs text-center py-3">No hay datos</li>
              <li v-for="(user, index) in topUsersByCover" :key="user.user.id"
                class="flex items-center gap-2.5 py-1.5 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                <span class="text-xs w-5 text-center shrink-0" v-html="getTrophyIcon(index)"></span>
                <span class="text-sm font-medium text-gray-800 dark:text-gray-200 truncate min-w-0 flex-1">{{ user.user.username }}</span>
                <span class="text-xs font-bold tabular-nums shrink-0 bg-gray-100 dark:bg-rv-darkSurface text-rv-navy dark:text-white px-2 py-0.5 rounded-full">{{ user.totalCover }}</span>
              </li>
            </template>
          </ul>

          <div class="mt-3 pt-3 border-t border-gray-100 dark:border-white/10 text-center">
            <button @click="showDetailedStats = true"
              class="group inline-flex items-center px-3 py-1.5 rounded-full shadow text-xs font-semibold text-rv-navy dark:text-white bg-gray-100 dark:bg-rv-navy transition-all duration-200 hover:bg-rv-navy hover:text-white hover:-translate-y-0.5 hover:shadow-lg dark:hover:bg-rv-pink active:scale-[0.97] border border-gray-200 dark:border-white/10 outline-none focus:outline-none ring-0">
              <i class="fa-solid fa-chart-bar mr-1.5"></i>Estadísticas detalladas
            </button>
            <StatsModal v-if="showDetailedStats" :stats="stats" :rating-distribution="ratingDistribution" @close="showDetailedStats = false" />
          </div>
        </div>
      </div>
    </div>

    <!-- Top 3 Semana -->
    <div class="bg-white dark:bg-rv-darkSurface rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm overflow-hidden mb-6">
      <div class="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-rv-pink/8 to-rv-purple/8 dark:from-rv-pink/10 dark:to-rv-purple/10 border-b border-gray-100 dark:border-white/10">
        <div class="flex items-center gap-2">
          <i class="fa-solid fa-fire text-rv-pink"></i>
          <h3 class="font-bold text-gray-900 dark:text-white">Top 3 · Semana actual</h3>
        </div>
        <span class="text-xs text-gray-400 dark:text-gray-500">{{ weekLabel }}</span>
      </div>
      <div class="p-4 sm:p-6">
        <!-- Loading skeletons -->
        <div v-if="loadingTopDiscs" class="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div v-for="i in 3" :key="i" class="flex flex-col gap-2">
            <div class="h-5 w-10 rounded-full bg-gray-100 dark:bg-white/5 mx-auto animate-pulse"></div>
            <div class="aspect-square rounded-xl bg-gray-100 dark:bg-white/5 animate-pulse"></div>
          </div>
        </div>
        <!-- Cards -->
        <div v-else-if="topWeekDiscs.length > 0" class="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div v-for="(disc, i) in topWeekDiscs" :key="disc.id" class="flex flex-col items-center gap-2">
            <div class="medal-chip" :class="medalClass(i)">
              <i class="fa-solid fa-trophy text-[10px]"></i> {{ i + 1 }}º
            </div>
            <DiscCard :id="disc.id" :ep="disc.ep" :image="disc.image" :name="disc.name"
              :releaseDate="disc.releaseDate" :artistName="disc.artist?.name" :genreName="disc.genre?.name"
              :genreColor="disc.genre?.color" :link="disc.link" :averageRate="disc.averageRate"
              :averageCover="disc.averageCover" :rate="disc.userRate?.rate" :cover="disc.userRate?.cover"
              :isNew="!disc.userRate" :userDiscRate="disc.userRate?.id" :favoriteId="disc.userFavoriteId"
              :pendingId="disc.pendingId" :comment-count="disc.commentCount" :rateCount="disc.voteCount"
              :artistCountry="disc.artist?.country" :debut="disc.debut" />
          </div>
        </div>
        <p v-else class="text-center text-gray-400 dark:text-gray-500 text-sm py-6">No hay discos valorados esta semana</p>
      </div>
    </div>

    <!-- Top 3 Mes -->
    <div class="bg-white dark:bg-rv-darkSurface rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm overflow-hidden mb-6">
      <div class="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-rv-purple/8 to-rv-pink/8 dark:from-rv-purple/10 dark:to-rv-pink/10 border-b border-gray-100 dark:border-white/10">
        <div class="flex items-center gap-2">
          <i class="fa-solid fa-calendar-star text-rv-purple"></i>
          <h3 class="font-bold text-gray-900 dark:text-white">Top 3 · Mes actual</h3>
        </div>
        <span class="text-xs text-gray-400 dark:text-gray-500 capitalize">{{ monthLabel }}</span>
      </div>
      <div class="p-4 sm:p-6">
        <div v-if="loadingTopDiscs" class="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div v-for="i in 3" :key="i" class="flex flex-col gap-2">
            <div class="h-5 w-10 rounded-full bg-gray-100 dark:bg-white/5 mx-auto animate-pulse"></div>
            <div class="aspect-square rounded-xl bg-gray-100 dark:bg-white/5 animate-pulse"></div>
          </div>
        </div>
        <div v-else-if="topMonthDiscs.length > 0" class="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div v-for="(disc, i) in topMonthDiscs" :key="disc.id" class="flex flex-col items-center gap-2">
            <div class="medal-chip" :class="medalClass(i)">
              <i class="fa-solid fa-trophy text-[10px]"></i> {{ i + 1 }}º
            </div>
            <DiscCard :id="disc.id" :ep="disc.ep" :image="disc.image" :name="disc.name"
              :releaseDate="disc.releaseDate" :artistName="disc.artist?.name" :genreName="disc.genre?.name"
              :genreColor="disc.genre?.color" :link="disc.link" :averageRate="disc.averageRate"
              :averageCover="disc.averageCover" :rate="disc.userRate?.rate" :cover="disc.userRate?.cover"
              :isNew="!disc.userRate" :userDiscRate="disc.userRate?.id" :favoriteId="disc.userFavoriteId"
              :pendingId="disc.pendingId" :comment-count="disc.commentCount" :rateCount="disc.voteCount"
              :artistCountry="disc.artist?.country" :debut="disc.debut" />
          </div>
        </div>
        <p v-else class="text-center text-gray-400 dark:text-gray-500 text-sm py-6">No hay discos valorados este mes</p>
      </div>
    </div>

    <!-- Fila inferior: Disco aleatorio + hueco para futura sección -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

      <!-- Disco Aleatorio -->
      <div class="bg-white dark:bg-rv-darkSurface rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm overflow-hidden flex flex-col">
        <div class="flex items-center gap-2 px-6 py-4 bg-gradient-to-r from-amber-400/10 to-rv-pink/8 dark:from-amber-400/10 dark:to-rv-pink/10 border-b border-gray-100 dark:border-white/10">
          <i class="fa-solid fa-shuffle text-amber-500"></i>
          <h3 class="font-bold text-gray-900 dark:text-white">Disco aleatorio</h3>
        </div>

        <!-- Estado inicial / lanzando -->
        <div v-if="!diceRolled" class="flex flex-col items-center justify-center gap-5 flex-1 px-6 py-8">
          <i class="fa-solid text-7xl transition-all duration-100"
            :class="[diceRolling ? currentDiceFace + ' text-rv-pink scale-110' : 'fa-dice-five text-gray-300 dark:text-gray-600']"></i>
          <p class="text-gray-500 dark:text-gray-400 text-sm text-center">Descubre un disco al azar de toda la colección</p>
          <button @click="rollDice" :disabled="diceRolling"
            class="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold shadow-md
                   bg-rv-navy dark:bg-rv-purple text-white
                   hover:opacity-85 hover:-translate-y-0.5 hover:shadow-lg
                   active:scale-[0.97] active:translate-y-0
                   disabled:opacity-50 disabled:pointer-events-none
                   transition-all duration-200 border-0 outline-none focus:outline-none ring-0">
            <i class="fa-solid transition-all duration-100" :class="diceRolling ? currentDiceFace : 'fa-dice'"></i>
            {{ diceRolling ? 'Lanzando…' : 'Tirar el dado' }}
          </button>
        </div>

        <!-- Resultado -->
        <div v-else class="p-4 sm:p-6">
          <div class="flex justify-between items-center mb-5">
            <span class="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <i class="fa-solid fa-dice text-amber-400"></i>
              {{ dicePhrase }}
            </span>
            <button @click="rollDice" :disabled="diceRolling"
              class="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold shadow
                     bg-gray-100 dark:bg-rv-navy text-rv-navy dark:text-white
                     hover:bg-rv-navy hover:text-white dark:hover:bg-rv-pink hover:-translate-y-0.5 hover:shadow-md
                     active:scale-[0.97] active:translate-y-0
                     disabled:opacity-50 disabled:pointer-events-none
                     transition-all duration-200 border border-gray-200 dark:border-white/10 outline-none focus:outline-none ring-0">
              <i class="fa-solid transition-all duration-100" :class="diceRolling ? currentDiceFace : 'fa-dice'"></i>
              {{ diceRolling ? 'Lanzando…' : 'Volver a tirar' }}
            </button>
          </div>
          <div class="flex justify-center max-w-xs mx-auto">
            <DiscCard v-if="randomDisc" :key="randomDisc.id" :id="randomDisc.id" :ep="randomDisc.ep" :image="randomDisc.image"
              :name="randomDisc.name" :releaseDate="randomDisc.releaseDate" :artistName="randomDisc.artist?.name"
              :genreName="randomDisc.genre?.name" :genreColor="randomDisc.genre?.color" :link="randomDisc.link"
              :averageRate="randomDisc.averageRate" :averageCover="randomDisc.averageCover"
              :rate="randomDisc.userRate?.rate" :cover="randomDisc.userRate?.cover"
              :isNew="!randomDisc.userRate" :userDiscRate="randomDisc.userRate?.id"
              :favoriteId="randomDisc.userFavoriteId" :pendingId="randomDisc.pendingId"
              :comment-count="randomDisc.commentCount" :rateCount="randomDisc.voteCount"
              :artistCountry="randomDisc.artist?.country" :debut="randomDisc.debut" />
          </div>
        </div>
      </div>

      <!-- Portada del día -->
      <div class="bg-white dark:bg-rv-darkSurface rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm overflow-hidden flex flex-col">
        <div class="flex items-center gap-2 px-6 py-4 bg-gradient-to-r from-rv-purple/8 to-rv-pink/8 dark:from-rv-purple/10 dark:to-rv-pink/10 border-b border-gray-100 dark:border-white/10 shrink-0">
          <i class="fa-solid fa-image text-rv-purple"></i>
          <h3 class="font-bold text-gray-900 dark:text-white">Portada del día</h3>
        </div>

        <!-- Loading -->
        <div v-if="coverOfDayLoading" class="flex flex-col items-center justify-center gap-3 py-16 flex-1">
          <i class="fa-solid fa-spinner animate-spin text-2xl text-rv-purple"></i>
          <span class="text-sm text-gray-400 dark:text-gray-500">Buscando portada…</span>
        </div>

        <!-- Contenido -->
        <div v-else-if="coverOfDay" class="flex flex-col flex-1">
          <!-- Portada grande -->
          <div class="relative overflow-hidden flex-1 min-h-0 group/cover cursor-zoom-in"
               @click="coverOfDay.image && window.open(coverOfDay.image, '_blank')">
            <img :src="coverOfDay.image ?? '/news/default.jpg'" :alt="coverOfDay.name"
              class="w-full h-full object-cover transition-transform duration-300 group-hover/cover:scale-105"
              style="min-height: 280px; max-height: 460px;" />
            <!-- Icono lupa en hover -->
            <div class="absolute inset-0 flex items-center justify-center
                        opacity-0 group-hover/cover:opacity-100 transition-opacity duration-200 pointer-events-none">
              <div class="w-14 h-14 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center shadow-lg">
                <i class="fa-solid fa-magnifying-glass-plus text-white text-2xl"></i>
              </div>
            </div>
            <!-- Gradiente inferior -->
            <div class="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent pointer-events-none"></div>
            <!-- Nombre disco + artista sobre la imagen -->
            <div class="absolute bottom-0 left-0 right-0 p-4">
              <p class="text-white font-bold text-base leading-snug drop-shadow-md">{{ coverOfDay.name }}</p>
              <p class="text-white/70 text-sm mt-0.5">{{ coverOfDay.artist?.name }}</p>
            </div>
          </div>

          <!-- Sección de voto -->
          <div class="p-4 shrink-0 border-t border-gray-100 dark:border-white/10">
            <div v-if="!coverVoted" class="flex items-center gap-3">
              <span class="text-sm text-gray-500 dark:text-gray-400 shrink-0">Tu nota:</span>
              <input type="number" v-model.number="coverVoteValue" min="1" max="10" step="0.5" placeholder=""
                class="w-16 px-2 py-1.5 text-center text-sm font-bold border border-gray-200 dark:border-white/10 rounded-lg
                       bg-white dark:bg-rv-darkCard text-rv-navy dark:text-white
                       focus:outline-none focus:border-rv-purple transition-colors" />
              <button @click="submitCoverVote" :disabled="coverVoteSubmitting || !coverVoteValue"
                class="flex-1 py-1.5 rounded-full text-xs font-semibold shadow
                       bg-rv-purple text-white hover:opacity-85 hover:-translate-y-0.5
                       disabled:opacity-40 disabled:pointer-events-none
                       transition-all duration-200 border-0 outline-none focus:outline-none">
                <i class="fa-solid fa-image mr-1"></i>
                {{ coverVoteSubmitting ? 'Enviando…' : 'Votar portada' }}
              </button>
            </div>
            <div v-else class="flex items-center justify-between gap-2 text-sm text-gray-500 dark:text-gray-400">
              <div class="flex items-center gap-2">
                <i class="fa-solid fa-circle-check text-green-500"></i>
                Portada votada con <span class="font-bold text-rv-purple ml-1">{{ coverVoteValue }}</span>
              </div>
              <button @click="coverVoted = false"
                class="text-xs text-gray-400 dark:text-gray-500 hover:text-rv-purple dark:hover:text-rv-purple
                       border-0 outline-none focus:outline-none transition-colors">
                <i class="fa-solid fa-pen text-[10px] mr-1"></i>Editar
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>

  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from "vue";
import { useAuthStore } from "@stores/auth/auth";
import { getTopRatedOrFeaturedAndStats, getDiscs } from "@services/discs/discs";
import StatsModal from "@components/StatsModal.vue";
import DiscCard from "@components/DiscCardComponent.vue";
import NewsFeed from "@views/homePage/components/NewsFeed.vue";
import { getAvailableYears } from "@helpers/dateConstants";
import { postRateService, updateRateService } from "@services/rates/rates";
import SwalService from "@services/swal/SwalService";

const DICE_FACES = ['fa-dice-one','fa-dice-two','fa-dice-three','fa-dice-four','fa-dice-five','fa-dice-six'];
const DICE_PHRASES = [
  '¡El dado ha hablado!',
  '¿Tu próximo favorito?',
  '¡Dale una escucha!',
  'El destino lo eligió.',
  '¡El universo decidió!',
  'La ruleta ha girado.',
  '¿Te atreves con él?',
  'El azar tiene gusto.',
  '¡Sorpresa musical!',
  '¿Lo conocías ya?',
];

const formatDate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const getWeekRange = (): [string, string] => {
  const today = new Date();
  const offset = (today.getDay() - 5 + 7) % 7;
  const start = new Date(today);
  start.setDate(today.getDate() - offset);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return [formatDate(start), formatDate(end)];
};

const getMonthRange = (): [string, string] => {
  const today = new Date();
  return [
    formatDate(new Date(today.getFullYear(), today.getMonth(), 1)),
    formatDate(new Date(today.getFullYear(), today.getMonth() + 1, 0)),
  ];
};

const transformDisc = (disc: any) => ({
  ...disc,
  artist: { ...disc.artist, country: disc.artist?.country ?? null },
  userRate: disc.userRate
    ? {
        ...disc.userRate,
        rate:  disc.userRate.rate  != null ? parseFloat(disc.userRate.rate)  : null,
        cover: disc.userRate.cover != null ? parseFloat(disc.userRate.cover) : null,
      }
    : null,
});

export default defineComponent({
  name: "DashboardPage",
  components: { StatsModal, DiscCard, NewsFeed },
  setup() {
    const authStore = useAuthStore();

    // ── Stats / top usuarios ──────────────────────────────
    const loading = ref(true);
    const stats = ref({ totalDiscs: 0, totalVotes: 0 });
    const userDiscVotes  = ref(0);
    const userCoverVotes = ref(0);
    const topUsersByRates = ref<any[]>([]);
    const topUsersByCover = ref<any[]>([]);
    const ratingDistribution = ref<Array<{ rate: number; count: number }>>([]);
    const showDetailedStats = ref(false);
    const selectedStatsYear = ref<number | string>(new Date().getFullYear());

    // ── Top usuarios tabs ─────────────────────────────────
    const topUsersTab = ref<'rates' | 'cover'>('rates');

    // ── Top 3 discos ──────────────────────────────────────
    const loadingTopDiscs = ref(true);
    const topWeekDiscs  = ref<any[]>([]);
    const topMonthDiscs = ref<any[]>([]);

    // ── Disco aleatorio ───────────────────────────────────
    const diceRolled    = ref(false);
    const diceRolling   = ref(false);
    const randomDisc    = ref<any>(null);
    const currentDiceFace = ref('fa-dice-five');
    const dicePhrase    = ref(DICE_PHRASES[0]);
    const unvotedDiscCount = ref(0);
    let diceInterval: ReturnType<typeof setInterval> | null = null;

    // ── Portada del día ───────────────────────────────────
    const coverOfDay          = ref<any>(null);
    const coverOfDayLoading   = ref(true);
    const coverVoteValue      = ref<number | null>(null);
    const coverVoteSubmitting = ref(false);
    const coverVoted          = ref(false);

    // ── Computed ──────────────────────────────────────────
    const username = computed(() => authStore.username ?? "");

    const todayFormatted = computed(() =>
      new Date().toLocaleDateString("es-ES", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
    );

    const availableYears = computed(() => [...getAvailableYears()].reverse());

    const availableStatsYears = computed(() => {
      const opts: { value: number | string; label: string }[] = availableYears.value.map(y => ({ value: y, label: `${y}` }));
      opts.unshift({ value: "all", label: "Todos" });
      return opts;
    });

    const [wr0, wr1] = getWeekRange();
    const fmtShort = (s: string) => new Date(s + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    const weekLabel  = `${fmtShort(wr0)} – ${fmtShort(wr1)}`;
    const monthLabel = new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

    // ── Medal helpers ─────────────────────────────────────
    const medalClass = (i: number) => {
      if (i === 0) return 'medal-gold';
      if (i === 1) return 'medal-silver';
      return 'medal-bronze';
    };

    const getTrophyIcon = (index: number) => {
      if (index === 0) return `<i class="fas fa-trophy text-yellow-500"></i>`;
      if (index === 1) return `<i class="fas fa-trophy text-gray-400"></i>`;
      if (index === 2) return `<i class="fas fa-trophy text-yellow-700"></i>`;
      return `<span class="text-gray-400 text-xs">${index + 1}</span>`;
    };

    // ── API calls ─────────────────────────────────────────
    const fetchUserStats = async () => {
      try {
        const allTimeResponse = await getTopRatedOrFeaturedAndStats(undefined, undefined, undefined, undefined, undefined);
        stats.value.totalDiscs = allTimeResponse.totalDiscs;
        const myUsername = authStore.username;
        const myRates = allTimeResponse.topUsersByRates.find((u: any) => u.user.username === myUsername);
        const myCover = allTimeResponse.topUsersByCover.find((u: any) => u.user.username === myUsername);
        userDiscVotes.value  = myRates?.rateCount ?? 0;
        userCoverVotes.value = myCover?.totalCover ?? 0;
      } catch { /* silently */ } finally {
        loading.value = false;
      }
    };

    const fetchStats = async () => {
      try {
        let statsRange: [string, string] | undefined;
        if (selectedStatsYear.value !== "all") {
          statsRange = [`${selectedStatsYear.value}-01-01`, `${selectedStatsYear.value}-12-31`];
        }
        const response = await getTopRatedOrFeaturedAndStats(undefined, undefined, undefined, statsRange, statsRange);
        stats.value.totalVotes   = response.totalVotes;
        topUsersByRates.value    = response.topUsersByRates;
        topUsersByCover.value    = response.topUsersByCover;
        ratingDistribution.value = response.ratingDistribution;
      } catch { /* silently */ }
    };

    const fetchTopDiscs = async () => {
      loadingTopDiscs.value = true;
      try {
        const [weekRes, monthRes] = await Promise.all([
          getTopRatedOrFeaturedAndStats(getWeekRange(),  undefined, undefined, undefined, undefined),
          getTopRatedOrFeaturedAndStats(getMonthRange(), undefined, undefined, undefined, undefined),
        ]);
        topWeekDiscs.value  = weekRes.discs.filter((d: any) => d.averageRate != null).map(transformDisc).slice(0, 3);
        topMonthDiscs.value = monthRes.discs.filter((d: any) => d.averageRate != null).map(transformDisc).slice(0, 3);
      } catch { /* silently */ } finally {
        loadingTopDiscs.value = false;
      }
    };

    const rollDice = async () => {
      if (diceRolling.value) return;
      diceRolling.value = true;
      dicePhrase.value = DICE_PHRASES[Math.floor(Math.random() * DICE_PHRASES.length)];

      diceInterval = setInterval(() => {
        currentDiceFace.value = DICE_FACES[Math.floor(Math.random() * DICE_FACES.length)];
      }, 80);

      try {
        if (!unvotedDiscCount.value) {
          const countRes = await getDiscs(1, 0, undefined, undefined, undefined, undefined, undefined, false);
          unvotedDiscCount.value = countRes.totalItems || stats.value.totalDiscs || 100;
        }
        const offset = Math.floor(Math.random() * unvotedDiscCount.value);
        const response = await getDiscs(1, offset, undefined, undefined, undefined, undefined, undefined, false);
        const data = response.data as any[];
        let disc: any = null;
        if (Array.isArray(data) && data.length > 0) {
          disc = 'discs' in data[0] ? data[0].discs?.[0] : data[0];
        }
        if (disc) {
          randomDisc.value = transformDisc(disc);
          diceRolled.value = true;
        }
      } catch { /* silently */ } finally {
        if (diceInterval) clearInterval(diceInterval);
        currentDiceFace.value = DICE_FACES[Math.floor(Math.random() * DICE_FACES.length)];
        diceRolling.value = false;
      }
    };

    const fetchCoverOfDay = async () => {
      coverOfDayLoading.value = true;
      try {
        const dayMs = Math.floor(Date.now() / 86400000);
        const total = stats.value.totalDiscs || 1000;
        const offset = dayMs % total;
        const response = await getDiscs(1, offset);
        const data = response.data as any[];
        if (Array.isArray(data) && data.length > 0) {
          const disc = transformDisc(data[0]);
          coverOfDay.value = disc;
          if (disc.userRate?.cover) {
            coverVoteValue.value = disc.userRate.cover;
            coverVoted.value = true;
          }
        }
      } catch { /* silently */ } finally {
        coverOfDayLoading.value = false;
      }
    };

    const submitCoverVote = async () => {
      if (!coverOfDay.value || !coverVoteValue.value) return;
      coverVoteSubmitting.value = true;
      try {
        const payload = {
          discId: coverOfDay.value.id,
          rate: coverOfDay.value.userRate?.rate ?? null,
          cover: Number(coverVoteValue.value),
        };
        if (coverOfDay.value.userRate?.id) {
          await updateRateService(coverOfDay.value.userRate.id, payload);
        } else {
          await postRateService(payload);
        }
        coverVoted.value = true;
        SwalService.success('¡Portada votada con éxito!');
      } catch { /* silently */ } finally {
        coverVoteSubmitting.value = false;
      }
    };

    onMounted(async () => {
      await fetchUserStats();
      fetchStats();
      fetchTopDiscs();
      fetchCoverOfDay();
    });

    return {
      username, todayFormatted, stats, loading, userDiscVotes, userCoverVotes,
      topUsersByRates, topUsersByCover, ratingDistribution,
      showDetailedStats, selectedStatsYear, availableStatsYears,
      weekLabel, monthLabel,
      loadingTopDiscs, topWeekDiscs, topMonthDiscs,
      diceRolled, diceRolling, randomDisc, currentDiceFace, dicePhrase,
      coverOfDay, coverOfDayLoading, coverVoteValue, coverVoteSubmitting, coverVoted, submitCoverVote,
      window,
      getTrophyIcon, medalClass, fetchStats, rollDice, topUsersTab,
    };
  },
});
</script>

<style scoped>
/* Community */
.community-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  white-space: nowrap;
}
.community-label {
  font-size: 0.7rem;
  font-weight: 600;
  color: #9ca3af;
  width: 5.5rem;
  flex-shrink: 0;
  text-align: right;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.community-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.3rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  color: #fff;
  white-space: nowrap;
  transition: all 0.2s;
  box-shadow: 0 1px 3px rgba(0,0,0,.1);
}
.community-pill:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0,0,0,.15);
}

/* Medals */
.medal-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.2rem 0.65rem;
  border-radius: 9999px;
  font-size: 0.7rem;
  font-weight: 700;
  color: #fff;
  box-shadow: 0 2px 6px rgba(0,0,0,.15);
}
.medal-gold   { background: linear-gradient(135deg, #FFD700, #FF8C00); }
.medal-silver { background: linear-gradient(135deg, #C0C0C0, #888); }
.medal-bronze { background: linear-gradient(135deg, #CD7F32, #8B4513); }
</style>
