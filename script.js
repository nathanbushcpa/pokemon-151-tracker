import { createClient } from https://esm.sh/@supabase/supabase-js@2
const SUPABASE_URL = "https://xfdezdzkfvmggzhdcvri.supabase.co" 
const SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmZGV6ZHprZnZtZ2d6aGRjdnJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4MzI4NDgsImV4cCI6MjA3MTQwODg0OH0.wMpSahRo3xn2jqiKxSJdMrXHyHwWVVsiPK-Td7kN3ws
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const pokemonGrid = document.getElementById('pokemon-grid')
const resetBtn = document.getElementById('reset')
const progressText = document.getElementById('progress')
const lockBtn = document.getElementById('lock-btn')
const searchInput = document.getElementById('search')
const clearSearchBtn = document.getElementById('clear-search')

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

let collected = JSON.parse(localStorage.getItem('collectedPokemon')) || []
let locked = JSON.parse(localStorage.getItem('trackerLocked')) || false
let session = null

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
function updateLockButton(){ lockBtn.textContent = locked ? '🔒 Locked' : '🔓 Unlock'; lockBtn.setAttribute('aria-pressed', String(locked)) }
function persistLocal(){ localStorage.setItem('collectedPokemon', JSON.stringify(collected)) }
function showError(el, msg){ el.textContent = msg; el.classList.add('show') }
function clearError(el){ el.textContent = ''; el.classList.remove('show') }

function render(filterText=''){
  updateProgress(); updateLockButton()
  const frag = document.createDocumentFragment()
  const q = (filterText || '').trim().toLowerCase()
  let byNumber = null; if(/^\d{1,3}$/.test(q)) byNumber = parseInt(q, 10)
  for(let i=1;i<=151;i++){
    const name = names[i-1] || `Pokemon ${i}`
    const nameLC = name.toLowerCase()
    const matchNumber = byNumber !== null ? i === byNumber : false
    const matchName = q ? nameLC.includes(q) : true
    const matches = q ? (matchNumber || matchName) : true
    if(!matches) continue
    const card = document.createElement('button'); card.className='pokemon'; card.type='button'
    if(collected.includes(i)) card.classList.add('collected'); card.setAttribute('aria-pressed', collected.includes(i)?'true':'false')
    const img = document.createElement('img'); img.loading='lazy'; img.alt=`${name} sprite`; img.src=`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${i}.png`
    const num = document.createElement('div'); num.className='num'; num.textContent = `#${i}`
    const nm = document.createElement('div'); nm.className='name'; nm.textContent = name
    card.append(img, num, nm); card.addEventListener('click', ()=>{ if(!locked) toggleCollected(i, card) }); frag.appendChild(card)
  }
  pokemonGrid.innerHTML=''; pokemonGrid.appendChild(frag)
}

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

function setActiveTab(which){
  if(which === 'signin'){ tabSignin.classList.add('active'); tabSignup.classList.remove('active'); formSignin.classList.remove('hidden'); formSignup.classList.add('hidden') }
  else { tabSignup.classList.add('active'); tabSignin.classList.remove('active'); formSignup.classList.remove('hidden'); formSignin.classList.add('hidden') }
}
tabSignin.addEventListener('click', ()=> setActiveTab('signin'))
tabSignup.addEventListener('click', ()=> setActiveTab('signup'))

formSignin.addEventListener('submit', async (e)=>{
  e.preventDefault(); clearError(siError)
  const email = siEmail.value.trim(); const password = siPassword.value
  if(!email || !password) return showError(siError, 'Email and password required.')
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if(error){ console.error(error); return showError(siError, error.message) }
})
formSignup.addEventListener('submit', async (e)=>{
  e.preventDefault(); clearError(suError)
  const email = suEmail.value.trim(); const p1 = suPassword.value; const p2 = suPassword2.value
  if(!email || !p1 || !p2) return showError(suError, 'All fields required.')
  if(p1.length < 6) return showError(suError, 'Password must be at least 6 characters.')
  if(p1 !== p2) return showError(suError, 'Passwords do not match.')
  const { error } = await supabase.auth.signUp({ email, password: p1 })
  if(error){ console.error(error); return showError(suError, error.message) }
  showError(suError, 'Account created! Confirm email if required, then sign in.'); suError.style.background='#2e7d32'
})
btnReset.addEventListener('click', async ()=>{
  clearError(siError)
  const email = siEmail.value.trim(); if(!email) return showError(siError, 'Enter your email first, then click reset.')
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.href })
  if(error){ console.error(error); return showError(siError, error.message) }
  showError(siError, 'Password reset email sent.'); siError.style.background='#1976d2'
})
signoutBtn.addEventListener('click', async ()=>{ await supabase.auth.signOut() })

async function initAuth(){
  const { data: { session: s } } = await supabase.auth.getSession()
  session = s; updateAuthUI(); if(session){ await mergeWithRemote() }
  supabase.auth.onAuthStateChange(async (_event, newSession)=>{ session = newSession; updateAuthUI(); if(session){ await mergeWithRemote() } })
}
function updateAuthUI(){
  if(session){ signedOut.hidden=true; signedIn.hidden=false; userEmailSpan.textContent = session.user.email || '(signed in)' }
  else { signedOut.hidden=false; signedIn.hidden=true; userEmailSpan.textContent='' }
}

function toggleCollected(id, el){
  if(collected.includes(id)){ collected = collected.filter(x=>x!==id); el.classList.remove('collected'); el.setAttribute('aria-pressed','false') }
  else { collected.push(id); el.classList.add('collected'); el.setAttribute('aria-pressed','true') }
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

render(); initAuth()
