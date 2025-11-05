/* =========================
assets/js/main.js — boot the app
========================= */
(function(){
const { loadSection, setupNav } = window.VetKotoRouter;
setupNav();
loadSection('dashboard');
})();