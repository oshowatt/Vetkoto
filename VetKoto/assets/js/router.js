(function(){
const { $, $$, hydrateEntitySection } = window.VetKotoUI;


async function loadSection(id){
const res = await fetch(`sections/${id}.html`, { cache:'no-cache' });
const html = await res.text();
$('#app').innerHTML = html;
// hydrate entity table if known in schema
if(window.VetKotoSchema[id]) hydrateEntitySection(id);
}


function setActive(btn){ $$('#sidebar [data-section]').forEach(b=>b.classList.toggle('active', b===btn)); }


function setupNav(){
$$('#sidebar [data-section]').forEach(btn=>{
btn.addEventListener('click', ()=>{ setActive(btn); loadSection(btn.dataset.section); });
});
}


// Toggle sidebar on small screens
document.getElementById('toggleSidebarBtn').addEventListener('click', ()=>{
const aside = document.getElementById('sidebar');
aside.style.display = aside.style.display === 'none' ? 'block' : (aside.style.display === 'block' ? 'none' : 'block');
});


window.VetKotoRouter = { loadSection, setupNav };
})();


