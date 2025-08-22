// build v11 – profile page
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
const SUPABASE_URL = 'https://xfdezdzkfvmggzhdcvri.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmZGV6ZHprZnZtZ2d6aGRjdnJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4MzI4NDgsImV4cCI6MjA3MTQwODg0OH0.wMpSahRo3xn2jqiKxSJdMrXHyHwWVVsiPK-Td7kN3ws'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const loginStatus = document.getElementById('login-status')
const profileStatus = document.getElementById('profile-status')
const profileEmail = document.getElementById('profile-email')
const profileCount = document.getElementById('profile-count')
const profileSync = document.getElementById('profile-sync')

const tabSignin = document.getElementById('tab-signin')
const tabSignup = document.getElementById('tab-signup')
const formSignin = document.getElementById('form-signin')
const formSignup = document.getElementById('form-signup')
const siEmail = document.getElementById('si-email')
const siPassword = document.getElementById('si-password')
const siError = document.getElementById('si-error')
const suEmail = document.getElementById('su-email')
const suPassword = document.getElementById('su-password')
const suPassword2 = document.getElementById('su-password2')
const suError = document.getElementById('su-error')
const btnOpenSignin = document.getElementById('btn-open-signin')
const btnOpenSignup = document.getElementById('btn-open-signup')
const btnReset = document.getElementById('btn-reset')
const btnSignout = document.getElementById('btn-signout')
const themeToggle = document.getElementById('theme-toggle')

let session = null
let theme = localStorage.getItem('theme') || 'light'
if(theme === 'dark') document.body.classList.add('dark')
const collected = JSON.parse(localStorage.getItem('collectedPokemon')) || []
let lastSyncISO = localStorage.getItem('lastSyncISO') || null

function fmtTime(iso){ try{ const d=new Date(iso); return isNaN(d)?'Never':d.toLocaleString() }catch{ return 'Never' } }
function updateUI(){ const email=session?.user?.email||null; loginStatus.textContent=email?`Signed in: ${email}`:'Signed out'; profileStatus.textContent=email?'Signed in':'Signed out'; profileEmail.textContent=email||'—'; profileCount.textContent=`${collected.length} / 151`; profileSync.textContent=lastSyncISO?fmtTime(lastSyncISO):'Never' }
function setActiveTab(which){ if(which==='signin'){ tabSignin.classList.add('active'); tabSignup.classList.remove('active'); formSignin.classList.remove('hidden'); formSignup.classList.add('hidden') } else { tabSignup.classList.add('active'); tabSignin.classList.remove('active'); formSignup.classList.remove('hidden'); formSignin.classList.add('hidden') } }
tabSignin.addEventListener('click', ()=> setActiveTab('signin')); tabSignup.addEventListener('click', ()=> setActiveTab('signup'))
btnOpenSignin.addEventListener('click', ()=>{ setActiveTab('signin'); siEmail.focus() }); btnOpenSignup.addEventListener('click', ()=>{ setActiveTab('signup'); suEmail.focus() })
themeToggle.addEventListener('click', ()=>{ document.body.classList.toggle('dark'); theme=document.body.classList.contains('dark')?'dark':'light'; localStorage.setItem('theme', theme) })

formSignin.addEventListener('submit', async (e)=>{ e.preventDefault(); siError.textContent=''; siError.classList.remove('show'); const email=siEmail.value.trim(); const password=siPassword.value; if(!email||!password){ siError.textContent='Email and password required.'; siError.classList.add('show'); return } const { error } = await supabase.auth.signInWithPassword({ email, password }); if(error){ console.error(error); siError.textContent=error.message; siError.classList.add('show') } })
formSignup.addEventListener('submit', async (e)=>{ e.preventDefault(); suError.textContent=''; suError.classList.remove('show'); const email=suEmail.value.trim(); const p1=suPassword.value; const p2=suPassword2.value; if(!email||!p1||!p2){ suError.textContent='All fields required.'; suError.classList.add('show'); return } if(p1.length<6){ suError.textContent='Password must be at least 6 characters.'; suError.classList.add('show'); return } if(p1!==p2){ suError.textContent='Passwords do not match.'; suError.classList.add('show'); return } const { error } = await supabase.auth.signUp({ email, password: p1 }); if(error){ console.error(error); suError.textContent=error.message; suError.classList.add('show'); return } suError.textContent='Account created! Confirm email if required, then sign in.'; suError.classList.add('show'); suError.style.background='#2e7d32' })
btnReset.addEventListener('click', async ()=>{ siError.textContent=''; siError.classList.remove('show'); const email=(siEmail.value||suEmail.value||'').trim(); if(!email){ siError.textContent='Enter your email in the Sign In form, then click reset.'; siError.classList.add('show'); return } const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + window.location.pathname.replace('profile.html','index.html') }); if(error){ console.error(error); siError.textContent=error.message; siError.classList.add('show'); return } siError.textContent='Password reset email sent.'; siError.classList.add('show'); siError.style.background='#1976d2' })
btnSignout.addEventListener('click', async ()=>{ await supabase.auth.signOut() })

async function initAuth(){ const { data:{session:s} } = await supabase.auth.getSession(); session=s; updateUI(); supabase.auth.onAuthStateChange(async (_e,newSession)=>{ session=newSession; updateUI() }) }
updateUI(); initAuth()
