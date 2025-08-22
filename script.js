// build v11 – avatar + tracker
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
const SUPABASE_URL = 'https://xfdezdzkfvmggzhdcvri.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmZGV6ZHprZnZtZ2d6aGRjdnJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4MzI4NDgsImV4cCI6MjA3MTQwODg0OH0.wMpSahRo3xn2jqiKxSJdMrXHyHwWVVsiPK-Td7kN3ws'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const pokemonGrid = document.getElementById('pokemon-grid')
const resetBtn = document.getElementById('reset')
const progressText = document.getElementById('progress')
const lockBtn = document.getElementById('lock-btn')
const searchInput = document.getElementById('search')
const clearSearchBtn = document.getElementById('clear-search')
const sortSelect = document.getElementById('sort-select')
const themeToggle = document.getElementById('theme-toggle')
const loginStatus = document.getElementById('login-status')
const avatarLink = document.getElementById('avatar-link')
const userAvatar = document.getElementById('user-avatar')

let collected = JSON.parse(localStorage.getItem('collectedPokemon')) || []
let locked = JSON.parse(localStorage.getItem('trackerLocked')) || false
let session = null
let sortMode = localStorage.getItem('sortMode') || 'num'
let theme = localStorage.getItem('theme') || 'light'
if(theme === 'dark') document.body.classList.add('dark')
let lastSyncISO = localStorage.getItem('lastSyncISO') || null

const names = ['Bulbasaur','Ivysaur','Venusaur','Charmander','Charmeleon','Charizard','Squirtle','Wartortle','Blastoise',
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
'Articuno','Zapdos','Moltres','Dratini','Dragonair','Dragonite','Mewtwo','Mew']

const sources = [
  (i)=>`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${i}.png`,
  (i)=>`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${i}.png`
]
function imgWithFallback(i, alt){
  const img=document.createElement('img'); img.loading='lazy'; img.alt=alt; let idx=0; img.src=sources[idx](i)
  img.onerror=()=>{ idx++; if(idx<sources.length){ img.src=sources[idx](i) } else { img.onerror=null; img.alt = alt + ' (image unavailable)' } }
  return img
}

function getInitialsFromEmail(email){
  if(!email) return '?'
  const base=email.split('@')[0].replace(/[^a-zA-Z0-9]+/g,' ').trim()
  const parts=base.split(' ').filter(Boolean)
  if(parts.length===1) return parts[0].slice(0,2).toUpperCase()
  return (parts[0][0]+parts[parts.length-1][0]).toUpperCase()
}
function colorFromString(str){
  let h=0; for(let i=0;i<str.length;i++){ h=(h*31+str.charCodeAt(i))&0xffffffff }
  h=Math.abs(h)%360; const s=70,l=45; return `hsl(${h} ${s}% ${l}%)`
}
function fmtTime(iso){ try{ const d=new Date(iso); return isNaN(d)?'Never':d.toLocaleString() }catch{ return 'Never' } }

function updateStatusUI(){
  const email = session?.user?.email || null
  loginStatus.textContent = email ? `Signed in: ${email}` : 'Signed out'
  if(avatarLink && userAvatar){
    if(email){
      userAvatar.textContent = getInitialsFromEmail(email)
      avatarLink.classList.remove('hidden')
      avatarLink.style.background = colorFromString(email)
    }else{
      avatarLink.classList.add('hidden')
    }
  }
}

function updateProgress(){ progressText.textContent = `Collected: ${collected.length} / 151` }
function updateLockButton(){ lockBtn.textContent = locked ? '🔒 Locked' : '🔓 Unlocked'; lockBtn.setAttribute('aria-pressed', String(locked)) }
function persistLocal(){ localStorage.setItem('collectedPokemon', JSON.stringify(collected)) }

function getSortedIds(filterText=''){
  const q=(filterText||'').trim().toLowerCase(); let byNumber=null; if(/^\d{1,3}$/.test(q)) byNumber=parseInt(q,10)
  const items=[]; for(let i=1;i<=151;i++){ const name=names[i-1]||`Pokemon ${i}`; const nameLC=name.toLowerCase()
    const matchNumber=byNumber!==null?i===byNumber:false; const matchName=q?nameLC.includes(q):true
    if(q ? (matchNumber||matchName) : true) items.push({id:i,name}) }
  if(sortMode==='name'){ items.sort((a,b)=>a.name.localeCompare(b.name,undefined,{sensitivity:'base'})||a.id-b.id) }
  else if(sortMode==='collected'){ items.sort((a,b)=>{ const ac=collected.includes(a.id)?0:1; const bc=collected.includes(b.id)?0:1; if(ac!==bc) return ac-bc; return a.id-b.id }) }
  else { items.sort((a,b)=>a.id-b.id) }
  return items.map(x=>x.id)
}

function render(filterText=''){
  updateProgress(); updateLockButton(); updateStatusUI()
  const frag=document.createDocumentFragment()
  for(const i of getSortedIds(filterText)){
    const name=names[i-1]||`Pokemon ${i}`
    const card=document.createElement('button'); card.className='pokemon'; card.type='button'
    if(collected.includes(i)) card.classList.add('collected')
    card.setAttribute('aria-pressed', collected.includes(i)?'true':'false')
    const img=imgWithFallback(i, `${name} sprite`)
    const num=document.createElement('div'); num.className='num'; num.textContent = `#${i}`
    const nm=document.createElement('div'); nm.className='name'; nm.textContent = name
    card.append(img,num,nm)
    card.addEventListener('click', ()=>{ if(!locked) toggleCollected(i, card) })
    frag.appendChild(card)
  }
  pokemonGrid.innerHTML=''; pokemonGrid.appendChild(frag)
}

async function pullRemote(){ if(!session) return null; const {data,error}=await supabase.from('user_collection').select('ids').eq('user_id',session.user.id).single(); if(error&&error.code!=='PGRST116'){ console.error('Pull error',error); return null } return data?data.ids||[]:[] }
async function pushRemote(ids){ if(!session) return; const row={user_id:session.user.id,ids}; const {error}=await supabase.from('user_collection').upsert(row,{onConflict:'user_id'}); if(error) console.error('Push error',error); else { lastSyncISO=new Date().toISOString(); localStorage.setItem('lastSyncISO', lastSyncISO); } }
function debounce(fn,ms=800){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a),ms) } }
const pushRemoteDebounced = debounce(pushRemote, 800)
async function mergeWithRemote(){ const remote=await pullRemote()||[]; const merged=Array.from(new Set([...remote,...collected])).sort((a,b)=>a-b); collected=merged; persistLocal(); render(searchInput.value||''); await pushRemote(collected) }

async function initAuth(){
  const { data:{ session:s } } = await supabase.auth.getSession(); session=s; updateStatusUI(); if(session) await mergeWithRemote()
  supabase.auth.onAuthStateChange(async (_e,newSession)=>{ session=newSession; updateStatusUI(); if(session) await mergeWithRemote() })
}

function toggleCollected(id, el){
  if(collected.includes(id)){ collected=collected.filter(x=>x!==id); el.classList.remove('collected'); el.setAttribute('aria-pressed','false') }
  else { collected.push(id); el.classList.add('collected'); el.setAttribute('aria-pressed','true') }
  persistLocal(); updateProgress(); if(session) pushRemoteDebounced(collected)
}

resetBtn.addEventListener('click', ()=>{ if(confirm('Reset your collection? (If signed in, remote will be cleared too.)')){ collected=[]; localStorage.removeItem('collectedPokemon'); document.querySelectorAll('.pokemon').forEach(el=>{ el.classList.remove('collected'); el.setAttribute('aria-pressed','false') }); updateProgress(); if(session) pushRemote(collected) } })
lockBtn.addEventListener('click', ()=>{ locked=!locked; localStorage.setItem('trackerLocked', JSON.stringify(locked)); updateLockButton() })
searchInput.addEventListener('input', ()=> render(searchInput.value))
clearSearchBtn.addEventListener('click', ()=>{ searchInput.value=''; render('') })
searchInput.addEventListener('search', ()=> render(searchInput.value))
if(sortSelect){ sortSelect.value=sortMode; sortSelect.addEventListener('change', ()=>{ sortMode=sortSelect.value; localStorage.setItem('sortMode', sortMode); render(searchInput.value) }) }
if(themeToggle){ themeToggle.addEventListener('click', ()=>{ document.body.classList.toggle('dark'); theme=document.body.classList.contains('dark')?'dark':'light'; localStorage.setItem('theme', theme) }) }

render(); initAuth()
