// build v7 – sort + dark mode + fallback sprites + email/password auth
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// TODO: Fill these with your Supabase project details:
const SUPABASE_URL = 'https://xfdezdzkfvmggzhdcvri.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmZGV6ZHprZnZtZ2d6aGRjdnJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4MzI4NDgsImV4cCI6MjA3MTQwODg0OH0.wMpSahRo3xn2jqiKxSJdMrXHyHwWVVsiPK-Td7kN3ws'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// DOM
const pokemonGrid = document.getElementById('pokemon-grid')
const resetBtn = document.getElementById('reset')
const progressText = document.getElementById('progress')
const lockBtn = document.getElementById('lock-btn')
const searchInput = document.getElementById('search')
const clearSearchBtn = document.getElementById('clear-search')
const sortSelect = document.getElementById('sort-select')
const themeToggle = document.getElementById('theme-toggle')

// Auth DOM
const signedOut = document.getElementById('auth-signed-out')
const signedIn = document.getElementById('auth-signed-in')
const userEmailSpan = document.getElementById('user-email')
const tabSignin = document.getElementById('tab-signin')
const tabSignup = document.getElementById('tab-signup')
const formSignin = document.getElementById('form-signin')
const formSignup = document.getElementById('form-signup')
const siEmail = document.getElementById('si-email')
const siPassword = document.getElementById('si-password')
const btnReset = document.getElementById('btn-reset')
const siError = document.getElementById('si-error')
const suEmail = document.getElementById('su-email')
const suPassword = document.getElementById('su-password')
const suPassword2 = document.getElementById('su-password2')
const suError = document.getElementById('su-error')

const signoutBtn = document.getElementById('signout')

// Local state
let collected = JSON.parse(localStorage.getItem('collectedPokemon')) || []
let locked = JSON.parse(localStorage.getItem('trackerLocked')) || false
let session = null
let sortMode = localStorage.getItem('sortMode') || 'num'
let theme = localStorage.getItem('theme') || 'light'
if(theme === 'dark') document.body.classList.add('dark')

// Names (1..151)
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

// Primary + fallback sprite sources
const sources = [
  (i)=>`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${i}.png`,
  (i)=>`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${i}.png`
]
function imgWithFallback(i, alt){
  const img = document.createElement('img'); img.loading='lazy'; img.alt=alt;
  let idx = 0; img.src = sources[idx](i);
  img.onerror = () => { idx++; if(idx < sources.length){ img.src = sources[idx](i) } else { img.onerror=null; img.alt = alt + ' (image unavailable)' } };
  return img;
}

function updateProgress(){ progressText.textContent = `Collected: ${collected.length} / 151` }
function updateLockButton(){ lockBtn.textContent = locked ? '🔒 Locked' : '🔓 Unlocked'; lockBtn.setAttribute('aria-pressed', String(locked)) }
function persistLocal(){ localStorage.setItem('collectedPokemon', JSON.stringify(collected)) }

function getSortedIds(filterText=''){
  const q = (filterText || '').trim().toLowerCase()
  let byNumber = null; if(/^\d{1,3}$/.test(q)) byNumber = parseInt(q,10)
  const items = []
  for(let i=1;i<=151;i++){
    const name = names[i-1] || `Pokemon ${i}`
    const nameLC = name.toLowerCase()
    const matchNumber = byNumber !== null ? i === byNumber : false
    const matchName = q ? nameLC.includes(q) : true
    const matches = q ? (matchNumber || matchName) : true
    if(!matches) continue
    items.push({ id:i, name })
  }
  if(sortMode === 'name'){
    items.sort((a,b)=> a.name.localeCompare(b.name, undefined, {sensitivity:'base'}) || a.id-b.id)
  }else if(sortMode === 'collected'){
    items.sort((a,b)=> {
      const ac = collected.includes(a.id) ? 0 : 1
      const bc = collected.includes(b.id) ? 0 : 1
      if(ac !== bc) return ac - bc
      return a.id - b.id
    })
  }else{
    items.sort((a,b)=> a.id - b.id)
  }
  return items.map(x=>x.id)
}

function render(filterText=''){
  updateProgress(); updateLockButton()
  const frag = document.createDocumentFragment()
  const ids = getSortedIds(filterText)
  for (const i of ids){
    const name = names[i-1] || `Pokemon ${i}`
    const card = document.createElement('button')
    card.className='pokemon'; card.type='button'
    if(collected.includes(i)) card.classList.add('collected')
    card.setAttribute('aria-pressed', collected.includes(i) ? 'true' : 'false')
    const img = imgWithFallback(i, `${name} sprite`)
    const num = document.createElement('div'); num.className='num'; num.textContent = `#${i}`
    const nm = document.createElement('div'); nm.className='name'; nm.textContent = name
    card.append(img, num, nm)
    card.addEventListener('click', ()=>{ if(!locked) toggleCollected(i, card) })
    frag.appendChild(card)
  }
  pokemonGrid.innerHTML=''; pokemonGrid.appendChild(frag)
}

// Cloud sync helpers (Supabase)
async function pullRemote(){
  if(!session) return null
  const { data, error } = await supabase.from('user_collection').select('ids').eq('user_id', session.user.id).single()
  if(error && error.code !== 'PGRST116'){ console.error('Pull error', error); return null }
  return data ? data.ids || [] : []
}
async function pushRemote(ids){
  if(!session) return
  const row = { user_id: session.user.id, ids }
  const { error } = await supabase.from('user_collection').upsert(row, { onConflict: 'user_id' })
  if(error) console.error('Push error', error)
}
function debounce(fn, ms=800){ let t; return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args), ms) } }
const pushRemoteDebounced = debounce(pushRemote, 800)

async function mergeWithRemote(){
  const remote = await pullRemote() || []
  const merged = Array.from(new Set([...remote, ...collected])).sort((a,b)=>a-b)
  collected = merged; persistLocal(); render(searchInput.value||''); await pushRemote(collected)
}

// Auth tabs
function setActiveTab(which){
  if(which === 'signin'){
    tabSignin.classList.add('active'); tabSignup.classList.remove('active')
    formSignin.classList.remove('hidden'); formSignup.classList.add('hidden')
  }else{
    tabSignup.classList.add('active'); tabSignin.classList.remove('active')
    formSignup.classList.remove('hidden'); formSignin.classList.add('hidden')
  }
}
tabSignin?.addEventListener('click', ()=> setActiveTab('signin'))
tabSignup?.addEventListener('click', ()=> setActiveTab('signup'))

// Auth flows
formSignin?.addEventListener('submit', async (e) => {
  e.preventDefault(); siError.textContent = ''; siError.classList.remove('show')
  const email = siEmail.value.trim(); const password = siPassword.value
  if(!email || !password){ siError.textContent='Email and password required.'; siError.classList.add('show'); return }
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if(error){ console.error(error); siError.textContent = error.message; siError.classList.add('show') }
})
formSignup?.addEventListener('submit', async (e) => {
  e.preventDefault(); suError.textContent=''; suError.classList.remove('show')
  const email = suEmail.value.trim(); const p1 = suPassword.value; const p2 = suPassword2.value
  if(!email || !p1 || !p2){ suError.textContent='All fields required.'; suError.classList.add('show'); return }
  if(p1.length < 6){ suError.textContent='Password must be at least 6 characters.'; suError.classList.add('show'); return }
  if(p1 !== p2){ suError.textContent='Passwords do not match.'; suError.classList.add('show'); return }
  const { error } = await supabase.auth.signUp({ email, password: p1 })
  if(error){ console.error(error); suError.textContent=error.message; suError.classList.add('show'); return }
  suError.textContent='Account created! Confirm email if required, then sign in.'; suError.classList.add('show'); suError.style.background='#2e7d32'
})
btnReset?.addEventListener('click', async ()=>{
  siError.textContent=''; siError.classList.remove('show')
  const email = siEmail.value.trim()
  if(!email){ siError.textContent='Enter your email first, then click reset.'; siError.classList.add('show'); return }
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.href })
  if(error){ console.error(error); siError.textContent=error.message; siError.classList.add('show'); return }
  siError.textContent='Password reset email sent.'; siError.classList.add('show'); siError.style.background='#1976d2'
})
signoutBtn?.addEventListener('click', async ()=>{ await supabase.auth.signOut() })

// Track auth state
async function initAuth(){
  const { data: { session: s } } = await supabase.auth.getSession()
  session = s; updateAuthUI(); if(session){ await mergeWithRemote() }
  supabase.auth.onAuthStateChange(async (_event, newSession)=>{
    session = newSession; updateAuthUI(); if(session){ await mergeWithRemote() }
  })
}
function updateAuthUI(){
  if(session){
    signedOut.hidden = true; signedIn.hidden = false; userEmailSpan.textContent = session.user.email || '(signed in)'
  }else{
    signedOut.hidden = false; signedIn.hidden = true; userEmailSpan.textContent = ''
  }
}

// Interactions
function toggleCollected(id, el){
  if(collected.includes(id)){
    collected = collected.filter(x=>x!==id); el.classList.remove('collected'); el.setAttribute('aria-pressed','false')
  }else{
    collected.push(id); el.classList.add('collected'); el.setAttribute('aria-pressed','true')
  }
  persistLocal(); updateProgress(); if(session) pushRemoteDebounced(collected)
}
resetBtn.addEventListener('click', ()=>{
  if(confirm('Reset your collection? (If signed in, remote will be cleared too.)')){
    collected=[]; localStorage.removeItem('collectedPokemon')
    document.querySelectorAll('.pokemon').forEach(el=>{ el.classList.remove('collected'); el.setAttribute('aria-pressed','false') })
    updateProgress(); if(session) pushRemote(collected)
  }
})
lockBtn.addEventListener('click', ()=>{ locked=!locked; localStorage.setItem('trackerLocked', JSON.stringify(locked)); updateLockButton() })
searchInput.addEventListener('input', ()=> render(searchInput.value))
clearSearchBtn.addEventListener('click', ()=>{ searchInput.value=''; render('') })
searchInput.addEventListener('search', ()=> render(searchInput.value))
if(sortSelect){ sortSelect.value = sortMode; sortSelect.addEventListener('change', ()=>{ sortMode = sortSelect.value; localStorage.setItem('sortMode', sortMode); render(searchInput.value) }) }
if(themeToggle){ themeToggle.addEventListener('click', ()=>{ document.body.classList.toggle('dark'); theme = document.body.classList.contains('dark') ? 'dark' : 'light'; localStorage.setItem('theme', theme) }) }

// Boot
render()
initAuth()
