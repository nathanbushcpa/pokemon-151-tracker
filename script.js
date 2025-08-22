const pokemonGrid = document.getElementById('pokemon-grid');
const resetBtn = document.getElementById('reset');
const progressText = document.getElementById('progress');
const lockBtn = document.getElementById('lock-btn');
const searchInput = document.getElementById('search');
const clearSearchBtn = document.getElementById('clear-search');

let collected = JSON.parse(localStorage.getItem('collectedPokemon')) || [];
let locked = JSON.parse(localStorage.getItem('trackerLocked')) || false;

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
];

function updateProgress(){ progressText.textContent = `Collected: ${collected.length} / 151`; }
function updateLockButton(){
  lockBtn.textContent = locked ? '🔒 Locked' : '🔓 Unlock';
  lockBtn.setAttribute('aria-pressed', String(locked));
}

function render(filterText=''){
  updateProgress(); updateLockButton();
  const frag = document.createDocumentFragment();
  const q = filterText.trim().toLowerCase();
  let byNumber = null;
  if(/^\d{1,3}$/.test(q)) byNumber = parseInt(q, 10);

  for(let i=1;i<=151;i++){
    const name = names[i-1] || `Pokemon ${i}`;
    const nameLC = name.toLowerCase();
    const matchNumber = byNumber !== null ? i === byNumber : false;
    const matchName = q ? nameLC.includes(q) : true;
    const matches = q ? (matchNumber || matchName) : true;
    if(!matches) continue;

    const card = document.createElement('button');
    card.className = 'pokemon';
    card.type = 'button';
    if(collected.includes(i)) card.classList.add('collected');
    card.setAttribute('aria-pressed', collected.includes(i) ? 'true' : 'false');

    const img = document.createElement('img');
    img.loading = 'lazy';
    img.alt = `${name} sprite`;
    img.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${i}.png`;

    const num = document.createElement('div');
    num.className = 'num';
    num.textContent = `#${i}`;

    const nm = document.createElement('div');
    nm.className = 'name';
    nm.innerHTML = highlight(name, q);

    card.append(img, num, nm);
    card.addEventListener('click', () => { if(!locked) toggleCollected(i, card); });
    frag.appendChild(card);
  }
  pokemonGrid.innerHTML = '';
  pokemonGrid.appendChild(frag);
}

function escapeHtml(str){ return str.replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s])); }
function highlight(text, q){
  if(!q) return escapeHtml(text);
  const idx = text.toLowerCase().indexOf(q);
  if(idx === -1) return escapeHtml(text);
  const before = escapeHtml(text.slice(0, idx));
  const match = escapeHtml(text.slice(idx, idx + q.length));
  const after = escapeHtml(text.slice(idx + q.length));
  return `${before}<mark>${match}</mark>${after}`;
}

function toggleCollected(id, el){
  if(collected.includes(id)){
    collected = collected.filter(x => x !== id);
    el.classList.remove('collected');
    el.setAttribute('aria-pressed','false');
  }else{
    collected.push(id);
    el.classList.add('collected');
    el.setAttribute('aria-pressed','true');
  }
  localStorage.setItem('collectedPokemon', JSON.stringify(collected));
  updateProgress();
}

resetBtn.addEventListener('click', () => {
  if(confirm('Reset your collection?')){
    collected = [];
    localStorage.removeItem('collectedPokemon');
    document.querySelectorAll('.pokemon').forEach(el => { el.classList.remove('collected'); el.setAttribute('aria-pressed','false'); });
    updateProgress();
  }
});

lockBtn.addEventListener('click', () => {
  locked = !locked;
  localStorage.setItem('trackerLocked', JSON.stringify(locked));
  updateLockButton();
});

searchInput.addEventListener('input', () => render(searchInput.value));
clearSearchBtn.addEventListener('click', () => { searchInput.value=''; render(''); });
searchInput.addEventListener('search', () => render(searchInput.value));

render();
