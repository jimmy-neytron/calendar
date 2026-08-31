import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAvailableSections } from './useAvailableSections'

export interface GlobalSearchCommand {
  id: string
  label: string
  description: string
  icon: string
  keywords?: string
  searchOnly: true
  action: () => void
}

export function useGlobalSearchCommands() {
  const router = useRouter()
  const { isSectionAvailable } = useAvailableSections()
  const entityCommands = ref<GlobalSearchCommand[]>([])
  let requestId = 0

  async function searchEntities(rawQuery: string) {
    const query = rawQuery.trim().toLocaleLowerCase('ru-RU')
    const currentRequest = ++requestId
    if (query.length < 2) {
      entityCommands.value = []
      return
    }

    const [notesModule, ideasModule, challengesModule, birthdaysModule] = await Promise.all([
      import('../../stores/note.store.js'),
      import('../../stores/idea.store.js'),
      import('../../stores/challenge.store.js'),
      import('../../stores/birthday.store.js'),
    ])
    const commands: GlobalSearchCommand[] = [
      ...notesModule.noteStore.notes.value.map((note) => command('note', note.id, note.title, `Заметка · ${note.section}`, 'notes', [note.content, ...(note.tags || [])], () => router.push({ name: 'notes', query: { note: note.id } }))),
      ...ideasModule.ideaStore.ideas.value.map((idea) => command('idea', idea.id, idea.title, 'Идея', 'sparkles', [idea.note, idea.type], () => router.push({ name: 'ideas', query: { idea: idea.id } }))),
      ...challengesModule.challengeStore.challenges.value.map((goal) => command('goal', goal.id, goal.title, 'Цель', 'trophy', [goal.description, goal.activity], () => router.push({ name: 'challenges', query: { goal: goal.id } }))),
      ...birthdaysModule.birthdayStore.birthdays.value.map((birthday) => command('birthday', birthday.id, birthday.name, 'День рождения', 'heart', [birthday.note, birthday.birthDate], () => router.push({ name: 'birthdays', query: { birthday: birthday.id } }))),
    ]

    const optionalLoaders: Array<Promise<GlobalSearchCommand[]>> = []
    if (isSectionAvailable('knowledge')) optionalLoaders.push(import('../../modules/knowledge/stores/knowledge.store.js').then(({ knowledgeStore }) => knowledgeStore.notes.value.map((note) => command('knowledge', note.id, note.title, `Знания · ${note.section}`, 'book', [note.content, ...(note.tags || [])], () => router.push({ name: 'knowledge', query: { note: note.id } })))))
    if (isSectionAvailable('movies')) optionalLoaders.push(import('../../stores/movieWatchlist.store').then(({ movieWatchlistStore }) => movieWatchlistStore.watchlist.value.map((movie) => command('movie', `${movie.mediaType}-${movie.id}`, movie.title, 'Хочу посмотреть', 'movie', [movie.originalTitle, movie.overview], () => router.push({ name: 'movies', query: { movie: `${movie.mediaType}:${movie.id}` } })))))
    if (isSectionAvailable('purchases')) optionalLoaders.push(import('../../stores/purchaseWishlist.store').then(({ purchaseWishlistStore }) => purchaseWishlistStore.items.value.map((item) => command('purchase', item.id, item.title, 'Покупка', 'shopping', [item.description, item.source], () => router.push({ name: 'purchases', query: { purchase: item.id } })))))
    if (isSectionAvailable('coupons')) optionalLoaders.push(import('../../stores/coupon.store').then(({ couponStore }) => couponStore.items.value.map((coupon) => command('coupon', coupon.id, coupon.title, `Купон · ${coupon.merchant || 'без магазина'}`, 'ticket', [coupon.description, coupon.codeValue], () => router.push({ name: 'coupons', query: { coupon: coupon.id } })))))

    commands.push(...(await Promise.all(optionalLoaders)).flat())
    if (currentRequest !== requestId) return
    entityCommands.value = commands.filter((item) => `${item.label} ${item.description} ${item.keywords || ''}`.toLocaleLowerCase('ru-RU').includes(query)).slice(0, 30)
  }

  return { entityCommands, searchEntities }
}

function command(prefix: string, id: string | number, label: string, description: string, icon: string, keywords: unknown[], action: () => void): GlobalSearchCommand {
  return { id: `${prefix}-${id}`, label, description, icon, keywords: keywords.filter(Boolean).join(' '), searchOnly: true, action }
}
