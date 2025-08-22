import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// 1) Fill these in after creating your Supabase project:
const SUPABASE_URL = 'https://xfdezdzkfvmggzhdcvri.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmZGV6ZHprZnZtZ2d6aGRjdnJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4MzI4NDgsImV4cCI6MjA3MTQwODg0OH0.wMpSahRo3xn2jqiKxSJdMrXHyHwWVVsiPK-Td7kN3ws'

// 2) Initialize Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ----- DOM -----
const pokemonGrid = document.getElementById('pokemon-grid')
const resetBtn = document.getElementById('reset')
const progressText = document.getElementById('progress')
const lockBtn = document.getElementById('lock-btn')
const searchInput = document.getElementById('search')
const clearSearchBtn = document.getElementById('clear-search')
const emailInput = document.getElementById('email')
const sendLinkBtn = document.getElementById('email-link')
const signedOut = document.getElementById('auth-signed-out')
const signedIn = document.getElementById('auth-signed-in')
const userEmailSpan = document.getElementById('user-email')
const signoutBtn = document.getElementById('signout')

// ----- Local state (kept for offline support) -----
let collected = JSON.parse(localStorage.getItem('collectedPokemon')) || []
let locked = JSON.parse(localStorage.getItem('trackerLocked')) || false
let session = null

// Gen 1 names (1..151)
const names = [
  'Bulbasaur','Ivysaur','Venusaur','Charmander','Charmeleon','Charizard','Squirtle','Wartortle','Blastoise',
  'Caterpie','Metapod','Butterfree','Weedle','Kakuna','Beedrill','Pidgey','Pidgeotto','Pidgeot','Rattata','Raticate',
  'Spearow','Fearow','Ekans','Arbok','Pikachu','Raichu','Sandshrew','Sandslash','Nidoran♀','Nidorina','Nidoqueen',
  'Nidoran♂','Nidorino','Nidoking','Clefairy','Clefable','Vulpix','Ninetales','Jigglypuff','Wigglytuff','Zubat',
  'Golbat','Oddish','Gloom','Vileplume','Paras','Parasect','Venonat','Venomoth','Diglett','Dugtrio','Meowth','Persian',
  'Psyduck','Golduck','Mankey','Primeape','Growlithe','Arcanine','Poliwag','Poliwhirl','Poliwrath','Abra','Kadabra',
  'Alakazam','Machop','Machoke','Machamp','Bellsprout','Weepinbell','Victreebel','Tentacool','Tentacruel','Geodude',
  'Graveler','Golem','Ponyta','Rapidash','Slowpoke','Slowbro','Magnemite','Magneton','Farfetch\'d','Doduo','Dodrio',
  'Seel','Dewgong','Grimer','Muk','Shellder','Cloyster','Gastly','Haunter','Gengar','Onix','Drowzee','Hypno','Krabby',
  'Kingler','Voltorb','Electrode','Exeggcute','Exeggutor','Cubone','Marowak','Hitmonlee','Hitmonchan','Lickitung',
  'Koffing','Weezing','Rhyhorn','Rhydon','Chansey','Tangela','Kangaskhan','Horsea','Seadra','Goldeen','Seaking','Staryu',
  'Starmie','Mr. Mime','Scyther','Jynx','Electabuzz','Magmar','Pinsir','Tauros','Magikarp','Gyarados','Lapras','Ditto',
  'Eevee','Vaporeon','Jolteon','Flareon','Porygon','Omanyte','Omastar','Kabuto','Kabutops','Aerodactyl','Snorlax',
  'Articuno','Zapdos','Moltres','Dratini','Dragonair','Dragonite','Mewtwo','Mew'
]

function updateProgress(){ progressText.textContent = `Collected: ${collected.length} / 151` }
function updateLockButton(){
  lockBtn.textContent = locked ? '🔒 Locked' : '🔓 Unlock'
  lockBtn.setAttribute('aria-pressed', String(locked))
}
function persistLocal(){
  localStorage.setItem('collectedPokemon', JSON.stringify(collected))
}

function debounce(fn, ms=800){
  let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms) }
}

// ----- Render grid with filter -----
function render(filterText=''){
  updateProgress(); updateLockButton()
  const frag = document.createDocumentFragment()
  const q = filterText.trim().toLowerCase()
  let byNumber = null
  if(/^\d{1,3}$/.test(q)) byNumber = parseInt(q, 10)

  for(let i=1;i<=151;i++){
    const name = names[i-1] || `Pokemon ${i}`
    const nameLC = name.toLowerCase()
    const matchNumber = byNumber !== null ? i === byNumber : false
    const matchName = q ? nameLC.includes(q) : true
    const matches = q ? (matchNumber || matchName) : true
    if(!matches) continue

    const card = document.createElement('button')
    card.className = 'pokemon'
    card.type = 'button'
    if(collected.includes(i)) card.classList.add('collected')
    card.setAttribute('aria-pressed', collected.includes(i) ? 'true' : 'false')

    const img = document.createElement('img')
    img.loading = 'lazy'
    img.alt = `${name} sprite`
    img.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${i}.png`

    const num = document.createElement('div')
    num.className = 'num'
    num.textContent = `#${i}`

    const nm = document.createElement('div')
    nm.className = 'name'
    nm.textContent = name

    card.append(img, num, nm)
    card.addEventListener('click', () => { if(!locked) toggleCollected(i, card) })
    frag.appendChild(card)
  }
  pokemonGrid.innerHTML = ''
  pokemonGrid.appendChild(frag)
}

// ----- Remote sync (Supabase) -----
// Table: user_collection(user_id uuid primary key, ids int[] not null default '{}')
async function pullRemote(){
  if(!session) return null
  const { data, error } = await supabase.from('user_collection').select('ids').eq('user_id', session.user.id).single()
  if(error && error.code !== 'PGRST116') { // not found is fine
    console.error('Pull error', error); return null
  }
  return data ? data.ids || [] : []
}
async function pushRemote(ids){
  if(!session) return
  const row = { user_id: session.user.id, ids: ids }
  const { error } = await supabase.from('user_collection').upsert(row, { onConflict: 'user_id' })
  if(error) console.error('Push error', error)
}
const pushRemoteDebounced = debounce(pushRemote, 800)

async function mergeWithRemote(){
  const remote = await pullRemote() || []
  const mergedSet = new Set([ ...remote, ...collected ])
  collected = Array.from(mergedSet).sort((a,b)=>a-b)
  persistLocal(); render(searchInput.value || '')
  await pushRemote(collected)
}

// ----- Auth -----
async function initAuth(){
  const { data: { session: s } } = await supabase.auth.getSession()
  session = s
  updateAuthUI()

  // Listen for changes (including magic-link callback)
  supabase.auth.onAuthStateChange(async (_event, newSession) => {
    session = newSession
    updateAuthUI()
    if(session){ await mergeWithRemote() }
  })
}

function updateAuthUI(){
  if(session){
    signedOut.hidden = true
    signedIn.hidden = false
    userEmailSpan.textContent = session.user.email || '(signed in)'
  }else{
    signedOut.hidden = false
    signedIn.hidden = true
    userEmailSpan.textContent = ''
  }
}

sendLinkBtn.addEventListener('click', async () => {
  const email = (emailInput.value || '').trim()
  if(!email) return alert('Enter an email.')
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.href // after clicking the link, return here
    }
  })
  if(error){ console.error(error); alert('Could not send link. Check console.') }
  else alert('Magic sign-in link sent! Check your email.')
})

signoutBtn.addEventListener('click', async () => {
  await supabase.auth.signOut()
})

// ----- Interactions -----
function toggleCollected(id, el){
  if(collected.includes(id)){
    collected = collected.filter(x => x !== id)
    el.classList.remove('collected')
    el.setAttribute('aria-pressed','false')
  }else{
    collected.push(id)
    el.classList.add('collected')
    el.setAttribute('aria-pressed','true')
  }
  persistLocal(); updateProgress()
  if(session) pushRemoteDebounced(collected)
}

resetBtn.addEventListener('click', () => {
  if(confirm('Reset your collection? (If signed in, remote will be cleared too.)')){
    collected = []
    localStorage.removeItem('collectedPokemon')
    document.querySelectorAll('.pokemon').forEach(el => { el.classList.remove('collected'); el.setAttribute('aria-pressed','false') })
    updateProgress()
    if(session) pushRemote(collected)
  }
})

lockBtn.addEventListener('click', () => {
  locked = !locked
  localStorage.setItem('trackerLocked', JSON.stringify(locked))
  updateLockButton()
})

searchInput.addEventListener('input', () => render(searchInput.value))
clearSearchBtn.addEventListener('click', () => { searchInput.value=''; render('') })
searchInput.addEventListener('search', () => render(searchInput.value))

// ----- Boot -----
render()
initAuth()
