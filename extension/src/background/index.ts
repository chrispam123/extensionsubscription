// extension/src/background/index.ts

console.log("🔥 EL SERVICE WORKER HA DESPERTADO");

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Capturamos la URL tanto de changeInfo como del objeto tab
  const url = changeInfo.url || tab.url;

  if (url) {
    console.log("👀 Monitoreando:", url);

    if (url.includes('youtube.com') && url.includes('auth_success=true')) {
      console.log("🎯 RITUAL DETECTADO EN YOUTUBE");

      try {
        const urlObj = new URL(url);
        const hashParams = new URLSearchParams(urlObj.hash.substring(1));
        const token = hashParams.get('token');

        if (token) {
          chrome.storage.local.set({ sessionToken: token }, () => {
            console.log("✅ Token guardado.");
            
            // Limpiamos la pestaña
            chrome.tabs.update(tabId, { url: 'https://www.youtube.com/' });

            // Avisamos a la UI
            setTimeout(() => {
              chrome.runtime.sendMessage({ type: 'AUTH_COMPLETE' });
              console.log("📣 Mensaje enviado a la UI.");
            }, 500);
          });
        }
      } catch (error) {
        console.error("❌ Error procesando token:", error);
      }
    }
  }
});
